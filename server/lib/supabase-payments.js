import { createClient } from '@supabase/supabase-js';
import { resolveEarlyBirdPricing } from './early-bird.js';

const REFERENCE_ID_PATTERN = /^[A-Za-z0-9_-]{4,128}$/;

export function sanitizeReferenceId(referenceId) {
    const ref = String(referenceId || '').trim();
    if (!REFERENCE_ID_PATTERN.test(ref)) {
        return null;
    }
    return ref;
}

export function getSupabaseAdmin() {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !supabaseServiceKey) return null;
    return createClient(supabaseUrl, supabaseServiceKey);
}

export async function findPaymentByReference(supabase, referenceId) {
    const ref = sanitizeReferenceId(referenceId);
    if (!ref) return null;

    const { data: byReference, error: refError } = await supabase
        .from('payments')
        .select('id, reference_id, provider_ref_id, payment_provider, status, student_id')
        .eq('reference_id', ref)
        .maybeSingle();

    if (refError) {
        console.error('[payments] lookup error:', refError);
        return null;
    }
    if (byReference) return byReference;

    const { data: byProvider, error: provError } = await supabase
        .from('payments')
        .select('id, reference_id, provider_ref_id, payment_provider, status, student_id')
        .eq('provider_ref_id', ref)
        .maybeSingle();

    if (provError) {
        console.error('[payments] provider lookup error:', provError);
        return null;
    }
    return byProvider;
}

export async function resolvePurchasePrice(
    supabase,
    { courseId, bundleId, studentId, checkoutStartedAt, paymentTrack, cohortId },
) {
    if (courseId) {
        let cohortPricing = null;
        if (cohortId) {
            const { data: cohort } = await supabase
                .from('cohorts')
                .select(
                    'id, course_id, price, currency, requires_payment, instalment_enabled, instalment_deposit_percent',
                )
                .eq('id', cohortId)
                .maybeSingle();

            if (
                cohort?.requires_payment &&
                cohort.price != null &&
                cohort.course_id === courseId
            ) {
                cohortPricing = cohort;
            }
        }

        const { data, error } = await supabase
            .from('courses')
            .select(
                'price, currency, is_free, title, early_bird_price, early_bird_start, early_bird_end, early_bird_max_seats, early_bird_seats_used',
            )
            .eq('id', courseId)
            .maybeSingle();

        if (error || !data) {
            throw new Error('Course not found');
        }
        if (data.is_free) {
            throw new Error('This course is free — no payment required');
        }

        let amount = Number(data.price);
        let currency = data.currency || 'RWF';
        let earlyBirdApplied = false;
        let paymentTrackResolved = paymentTrack || 'full';
        let cohortApplied = false;

        if (cohortPricing) {
            amount = Number(cohortPricing.price);
            currency = cohortPricing.currency || currency;
            cohortApplied = true;
            paymentTrackResolved = paymentTrack || 'full';
        }

        if (!cohortApplied) {
            const earlyBird = resolveEarlyBirdPricing(data, { checkoutStartedAt });
            if (earlyBird) {
                amount = earlyBird.price;
                earlyBirdApplied = true;
                paymentTrackResolved = 'early_bird';
            }

            if (studentId) {
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('pricing_tier')
                    .eq('id', studentId)
                    .maybeSingle();

                const tierCode = profile?.pricing_tier || 'standard';

                if (tierCode !== 'standard' && !earlyBirdApplied) {
                    const { data: tierPrice } = await supabase
                        .from('course_price_tiers')
                        .select('price, currency')
                        .eq('course_id', courseId)
                        .eq('tier_code', tierCode)
                        .eq('is_active', true)
                        .maybeSingle();

                    if (tierPrice) {
                        amount = Number(tierPrice.price);
                        currency = tierPrice.currency || currency;
                    }
                }
            }
        }

        if (!Number.isFinite(amount) || amount < 0) {
            throw new Error('Course has no valid price');
        }

        let instalmentDeposit = null;
        let depositPercent = null;
        if (paymentTrack === 'instalment') {
            if (cohortPricing?.instalment_enabled && cohortPricing.instalment_deposit_percent != null) {
                depositPercent = Number(cohortPricing.instalment_deposit_percent);
            } else {
                const { data: plan } = await supabase
                    .from('course_instalment_plans')
                    .select('deposit_percent, is_active')
                    .eq('course_id', courseId)
                    .eq('is_active', true)
                    .maybeSingle();

                if (!plan) {
                    throw new Error('Instalment plan not available for this course');
                }
                depositPercent = Number(plan.deposit_percent);
            }

            instalmentDeposit = Math.round(amount * depositPercent / 100);
            paymentTrackResolved = 'instalment';
        }

        return {
            amount: paymentTrack === 'instalment' && instalmentDeposit != null ? instalmentDeposit : amount,
            fullAmount: amount,
            instalmentDeposit,
            depositPercent,
            currency,
            title: data.title,
            tierApplied: !cohortApplied,
            cohortApplied,
            cohortId: cohortPricing?.id || cohortId || null,
            earlyBirdApplied,
            paymentTrack: paymentTrackResolved,
        };
    }

    if (bundleId) {
        const { data, error } = await supabase
            .from('course_bundles')
            .select('bundle_price, currency, is_active, title')
            .eq('id', bundleId)
            .maybeSingle();

        if (error || !data) {
            throw new Error('Bundle not found');
        }
        if (!data.is_active) {
            throw new Error('Bundle is not available');
        }

        const amount = Number(data.bundle_price);
        if (!Number.isFinite(amount) || amount <= 0) {
            throw new Error('Bundle has no valid price');
        }

        return { amount, currency: data.currency || 'RWF', title: data.title };
    }

    throw new Error('Missing courseId or bundleId');
}

/**
 * Resolve course vs bundle target from API body. Rejects ambiguous requests.
 */
export function resolvePurchaseTarget({ courseId, bundleId }) {
    const hasCourse = Boolean(courseId);
    const hasBundle = Boolean(bundleId);

    if (hasCourse && hasBundle) {
        throw new Error('Provide either courseId or bundleId, not both');
    }
    if (!hasCourse && !hasBundle) {
        throw new Error('Missing course or bundle');
    }

    return {
        courseId: hasCourse ? courseId : null,
        bundleId: hasBundle ? bundleId : null,
    };
}

export async function createPaymentRecord(supabase, params) {
    const { data, error } = await supabase.rpc('create_payment_record', params);
    if (!error) return data;

    console.warn('[payments] RPC create_payment_record failed, trying direct insert:', error.message);

    const row = {
        student_id: params.p_student_id,
        course_id: params.p_course_id,
        bundle_id: params.p_bundle_id,
        amount: params.p_amount,
        currency: params.p_currency,
        reference_id: params.p_reference_id,
        payment_method: params.p_payment_method,
        payer_phone: params.p_payer_phone,
        payer_email: params.p_payer_email,
        status: 'pending',
    };

    if (params.p_payment_provider) row.payment_provider = params.p_payment_provider;
    if (params.p_provider_ref_id) row.provider_ref_id = params.p_provider_ref_id;
    if (params.p_coupon_id) row.coupon_id = params.p_coupon_id;
    if (params.p_original_amount != null) row.original_amount = params.p_original_amount;
    if (params.p_discount_amount != null) row.discount_amount = params.p_discount_amount;
    if (params.p_payment_track) row.payment_track = params.p_payment_track;
    if (params.p_cohort_id) row.cohort_id = params.p_cohort_id;
    if (params.p_instalment_enrollment_id) row.instalment_enrollment_id = params.p_instalment_enrollment_id;
    if (params.p_instalment_schedule_id) row.instalment_schedule_id = params.p_instalment_schedule_id;

    let { data: inserted, error: insertError } = await supabase
        .from('payments')
        .insert(row)
        .select('id')
        .single();

    if (insertError && (row.payment_provider || row.provider_ref_id)) {
        delete row.payment_provider;
        delete row.provider_ref_id;
        ({ data: inserted, error: insertError } = await supabase
            .from('payments')
            .insert(row)
            .select('id')
            .single());
    }

    if (insertError) {
        console.error('[payments] direct insert failed:', insertError);
        throw new Error('Failed to create payment record');
    }

    return inserted.id;
}

export async function updatePaymentProviderRef(supabase, referenceId, { providerRefId, paymentProvider }) {
    const ref = sanitizeReferenceId(referenceId);
    if (!ref || !providerRefId) return;

    const payload = { provider_ref_id: providerRefId };
    if (paymentProvider) payload.payment_provider = paymentProvider;

    const { error } = await supabase.from('payments').update(payload).eq('reference_id', ref);
    if (error) {
        console.warn('[payments] provider ref update failed:', error.message);
    }
}

export async function updatePaymentStatus(supabase, referenceId, status, transactionId, callbackData) {
    const ref = sanitizeReferenceId(referenceId);
    if (!ref) return null;

    const { data, error } = await supabase.rpc('update_payment_status', {
        p_reference_id: ref,
        p_status: status,
        p_transaction_id: transactionId || null,
        p_callback_data: callbackData || null,
    });
    if (error) {
        console.error('[payments] update_payment_status error:', error);
        return null;
    }
    return data;
}

export function generateReferenceId() {
    const date = new Date();
    const dateStr =
        date.getFullYear() +
        String(date.getMonth() + 1).padStart(2, '0') +
        String(date.getDate()).padStart(2, '0');
    const random = String(Math.floor(Math.random() * 10000)).padStart(4, '0');
    return `COURSE-${dateStr}-${random}`;
}

export function formatLmbPhone(phone) {
    if (!phone) return phone;
    const clean = phone.replace(/[^\d+]/g, '');
    if (clean.startsWith('+250') && clean.length === 13) return clean;
    if (clean.startsWith('250') && clean.length === 12) return `+${clean}`;
    if (clean.startsWith('0') && clean.length === 10) return `+250${clean.slice(1)}`;
    if (/^\d{9}$/.test(clean) && clean.startsWith('7')) return `+250${clean}`;
    return clean;
}
