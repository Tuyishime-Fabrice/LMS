/**
 * Vercel Serverless Function: Payment Initiate
 * POST /api/payment-initiate
 *
 * Requires: Authorization: Bearer <supabase_jwt>
 * Supports gateways: lmbtech (default) | xentripay
 */

import { verifyAuthUser } from '../server/lib/auth.js';
import {
    getSupabaseAdmin,
    createPaymentRecord,
    generateReferenceId,
    formatLmbPhone,
    resolvePurchasePrice,
    resolvePurchaseTarget,
    updatePaymentProviderRef,
    updatePaymentStatus,
} from '../server/lib/supabase-payments.js';
import {
    getXentriPayConfig,
    initiateXentriCollection,
    normalizeRwandaMomoPhones,
    normalizeInternationalPhone,
    resolveXentriPayCollectionAmount,
    buildXentriCardReturnUrl,
    getSiteUrl,
} from '../server/lib/xentripay.js';
import { getLmbTechCredentials } from '../server/lib/lmbtech.js';
import { validateCouponForPurchase, buildPaymentRecordCouponParams } from '../server/lib/coupons.js';
import { resolveInstalmentSchedulePayment } from '../server/lib/instalments.js';

export default async function handler(req, res) {
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ success: false, error: 'Method not allowed' });
    }

    try {
        const userId = await verifyAuthUser(req);
        if (!userId) {
            return res.status(401).json({ success: false, error: 'Unauthorized' });
        }

        const {
            gateway = 'xentripay',
            paymentMethod,
            email,
            name,
            phone,
            servicePaid,
            courseId: rawCourseId,
            bundleId: rawBundleId,
            couponCode,
            checkoutStartedAt,
            paymentTrack = 'full',
            cohortId,
            instalmentScheduleId,
        } = req.body;

        if (!email || !name) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields',
            });
        }

        const supabase = getSupabaseAdmin();
        if (!supabase) {
            return res.status(500).json({ success: false, error: 'Payment system unavailable' });
        }

        let courseId;
        let bundleId;
        let pricing;
        let resolvedCohortId = cohortId || null;

        if (instalmentScheduleId) {
            if (rawBundleId) {
                return res.status(400).json({ success: false, error: 'Instalment payments apply to courses only' });
            }
            try {
                pricing = await resolveInstalmentSchedulePayment(supabase, {
                    scheduleId: instalmentScheduleId,
                    studentId: userId,
                });
                courseId = pricing.courseId;
                resolvedCohortId = pricing.cohortId || resolvedCohortId;
            } catch (e) {
                return res.status(400).json({ success: false, error: e.message });
            }
        } else {
            try {
                ({ courseId, bundleId } = resolvePurchaseTarget({
                    courseId: rawCourseId,
                    bundleId: rawBundleId,
                }));
            } catch (e) {
                return res.status(400).json({ success: false, error: e.message });
            }

            try {
                pricing = await resolvePurchasePrice(supabase, {
                    courseId,
                    bundleId,
                    studentId: userId,
                    checkoutStartedAt,
                    paymentTrack: bundleId ? 'full' : paymentTrack,
                    cohortId: resolvedCohortId,
                });
            } catch (e) {
                return res.status(400).json({ success: false, error: e.message });
            }
        }

        let instalmentEnrollmentId = pricing.instalmentEnrollmentId || null;
        if (
            !instalmentScheduleId &&
            paymentTrack === 'instalment' &&
            courseId &&
            pricing.fullAmount != null
        ) {
            const { data: enrolResult, error: enrolError } = await supabase.rpc(
                'create_instalment_enrollment',
                {
                    p_student_id: userId,
                    p_course_id: courseId,
                    p_total_amount: pricing.fullAmount,
                    p_currency: pricing.currency,
                    p_cohort_id: resolvedCohortId || pricing.cohortId || null,
                },
            );

            if (enrolError || !enrolResult?.success) {
                return res.status(400).json({
                    success: false,
                    error: enrolResult?.error || enrolError?.message || 'Could not start instalment plan',
                });
            }

            instalmentEnrollmentId = enrolResult.enrollment_id;
            pricing = {
                ...pricing,
                amount: Number(enrolResult.deposit_amount),
                instalmentEnrollmentId,
            };
        }

        resolvedCohortId = pricing.cohortId || resolvedCohortId;

        let couponMeta = null;
        if (couponCode?.trim()) {
            try {
                const applied = await validateCouponForPurchase(supabase, {
                    code: couponCode,
                    studentId: userId,
                    courseId,
                    bundleId,
                    pricing,
                });
                pricing = applied.pricing;
                couponMeta = applied.coupon;
            } catch (e) {
                return res.status(400).json({ success: false, error: e.message });
            }
        }

        const siteUrl = getSiteUrl();
        const referenceId = generateReferenceId();

        // Free checkout (100% scholarship / full discount coupon)
        if (pricing.amount <= 0) {
            if (!couponMeta) {
                return res.status(400).json({
                    success: false,
                    error: 'A valid coupon is required for free enrolment',
                });
            }
            return handleFreeCheckout(res, {
                email,
                name,
                phone,
                studentId: userId,
                courseId,
                bundleId,
                pricing,
                couponMeta,
                referenceId,
                supabase,
                cohortId: resolvedCohortId,
            });
        }

        const normalizedGateway = String(gateway).toLowerCase();

        if (!paymentMethod) {
            return res.status(400).json({ success: false, error: 'Payment method is required' });
        }

        if (normalizedGateway === 'lmbtech' && process.env.LMBTECH_ENABLED !== 'true') {
            return res.status(400).json({
                success: false,
                error: 'LMBTech payments are currently unavailable. Please use XentriPay.',
            });
        }

        if (!['lmbtech', 'xentripay'].includes(normalizedGateway)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid payment gateway',
            });
        }

        if (!['momo', 'card'].includes(paymentMethod)) {
            return res.status(400).json({ success: false, error: 'Invalid payment method' });
        }

        if (paymentMethod === 'momo' && !phone) {
            return res.status(400).json({
                success: false,
                error: 'Phone number is required for MoMo payments',
            });
        }

        if (normalizedGateway === 'xentripay' && paymentMethod === 'card' && !phone) {
            return res.status(400).json({
                success: false,
                error: 'Phone number is required for card payments',
            });
        }

        if (normalizedGateway === 'xentripay') {
            return handleXentriPayInitiate(res, {
                paymentMethod,
                email,
                name,
                phone,
                studentId: userId,
                courseId,
                bundleId,
                pricing,
                couponMeta,
                referenceId,
                siteUrl,
                supabase,
                cohortId: resolvedCohortId,
            });
        }

        return handleLmbTechInitiate(res, {
            paymentMethod,
            email,
            name,
            phone,
            servicePaid,
            studentId: userId,
            courseId,
            bundleId,
            pricing,
            couponMeta,
            referenceId,
            siteUrl,
            supabase,
            cohortId: resolvedCohortId,
        });
    } catch (error) {
        console.error('[payment-initiate] Unhandled error:', {
            message: error.message,
            stack: error.stack,
        });
        return res.status(500).json({
            success: false,
            error: error.message || 'Payment initiation failed',
        });
    }
}

async function handleFreeCheckout(res, ctx) {
    try {
        await createPaymentRecord(ctx.supabase, {
            p_student_id: ctx.studentId,
            p_course_id: ctx.courseId || null,
            p_bundle_id: ctx.bundleId || null,
            p_amount: 0,
            p_currency: ctx.pricing.currency,
            p_reference_id: ctx.referenceId,
            p_payment_method: 'free',
            p_payer_phone: ctx.phone || null,
            p_payer_email: ctx.email,
            p_payment_provider: 'free',
            p_provider_ref_id: null,
            p_payment_track: ctx.pricing.paymentTrack || 'scholarship',
            p_cohort_id: ctx.cohortId || null,
            p_instalment_enrollment_id: ctx.pricing.instalmentEnrollmentId || null,
            ...buildPaymentRecordCouponParams(ctx.pricing, ctx.couponMeta),
        });
    } catch (e) {
        console.error('[payment-initiate] free checkout record failed:', e);
        return res.status(500).json({ success: false, error: 'Could not complete free enrolment' });
    }

    const result = await updatePaymentStatus(
        ctx.supabase,
        ctx.referenceId,
        'success',
        null,
        {
            type: 'free_checkout',
            coupon_code: ctx.couponMeta?.code || null,
            early_bird: ctx.pricing.earlyBirdApplied ? 'true' : 'false',
        },
    );

    if (!result?.success) {
        return res.status(500).json({ success: false, error: 'Enrolment failed' });
    }

    return res.status(200).json({
        success: true,
        status: 'success',
        freeCheckout: true,
        gateway: 'free',
        referenceId: ctx.referenceId,
        message: 'You have been enrolled successfully.',
        confirmationMessage: 'Your scholarship or discount covered the full cost. You are now enrolled.',
    });
}

function buildPaymentExtras(pricing, cohortId) {
    return {
        p_payment_track: pricing.paymentTrack || 'full',
        p_cohort_id: cohortId || null,
        p_instalment_enrollment_id: pricing.instalmentEnrollmentId || null,
        p_instalment_schedule_id: pricing.instalmentScheduleId || null,
    };
}

async function handleLmbTechInitiate(res, ctx) {
    const credentials = getLmbTechCredentials();
    if (!credentials) {
        return res.status(500).json({ success: false, error: 'LMBTech payment system not configured' });
    }

    const callbackUrl = `${ctx.siteUrl}/api/payment-callback`;

    try {
        await createPaymentRecord(ctx.supabase, {
            p_student_id: ctx.studentId,
            p_course_id: ctx.courseId || null,
            p_bundle_id: ctx.bundleId || null,
            p_amount: ctx.pricing.amount,
            p_currency: ctx.pricing.currency,
            p_reference_id: ctx.referenceId,
            p_payment_method: ctx.paymentMethod === 'momo' ? 'MTN_MOMO_RWA' : 'card',
            p_payer_phone: ctx.phone || null,
            p_payer_email: ctx.email,
            p_payment_provider: 'lmbtech',
            p_provider_ref_id: null,
            ...buildPaymentRecordCouponParams(ctx.pricing, ctx.couponMeta),
            ...buildPaymentExtras(ctx.pricing, ctx.cohortId),
        });
    } catch {
        return res.status(500).json({ success: false, error: 'Failed to create payment record' });
    }

    const lmbBody = {
        action: 'pay',
        email: ctx.email,
        name: ctx.name,
        amount: ctx.pricing.amount,
        service_paid: ctx.servicePaid || `course_${ctx.courseId || ctx.bundleId}`,
        reference_id: ctx.referenceId,
        callback_url: callbackUrl,
    };

    if (ctx.paymentMethod === 'momo') {
        lmbBody.payment_method = 'MTN_MOMO_RWA';
        lmbBody.payer_phone = formatLmbPhone(ctx.phone);
    } else {
        lmbBody.payment_method = 'card';
        lmbBody.card_redirect_url = 'https://pay.lmbtech.rw/pay/pesapal/iframe.php';
    }

    const response = await fetch('https://pay.lmbtech.rw/pay/config/api.php', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Basic ${credentials}`,
        },
        body: JSON.stringify(lmbBody),
    });

    const data = await response.json();

    const isSuccess = data.status === 'success' || data.status === 'pending';
    const redirectUrl = data.data?.redirect_url || data.redirect_url || null;

    return res.status(200).json({
        success: isSuccess,
        status: isSuccess ? 'awaiting_confirmation' : 'failed',
        gateway: 'lmbtech',
        referenceId: ctx.referenceId,
        redirectUrl,
        message: isSuccess ? 'Payment initiated' : 'Payment failed',
        confirmationMessage:
            ctx.paymentMethod === 'momo'
                ? 'A payment request was sent to your phone. Open MTN MoMo and approve the prompt to confirm your payment.'
                : 'Complete your card payment on the secure Pesapal checkout page.',
    });
}

async function handleXentriPayInitiate(res, ctx) {
    try {
        getXentriPayConfig();
    } catch {
        return res.status(500).json({ success: false, error: 'XentriPay not configured' });
    }

    const pmethod = ctx.paymentMethod === 'card' ? 'cc' : 'momo';

    let phones;
    try {
        // MoMo requires a valid Rwanda number; card accepts any international number.
        phones = pmethod === 'momo'
            ? normalizeRwandaMomoPhones(ctx.phone)
            : normalizeInternationalPhone(ctx.phone);
    } catch (e) {
        return res.status(400).json({ success: false, error: e.message });
    }

    let xentriAmount;
    try {
        xentriAmount = resolveXentriPayCollectionAmount(ctx.pricing);
    } catch (e) {
        return res.status(400).json({ success: false, error: e.message });
    }

    // Create pending payment record before calling gateway
    try {
        await createPaymentRecord(ctx.supabase, {
            p_student_id: ctx.studentId,
            p_course_id: ctx.courseId || null,
            p_bundle_id: ctx.bundleId || null,
            p_amount: ctx.pricing.amount,
            p_currency: ctx.pricing.currency,
            p_reference_id: ctx.referenceId,
            p_payment_method: pmethod === 'momo' ? 'MTN_MOMO_RWA' : 'card_cc',
            p_payer_phone: ctx.phone || null,
            p_payer_email: ctx.email,
            p_payment_provider: 'xentripay',
            p_provider_ref_id: null,
            ...buildPaymentRecordCouponParams(ctx.pricing, ctx.couponMeta),
            ...buildPaymentExtras(ctx.pricing, ctx.cohortId),
        });
    } catch (e) {
        console.error('[payment-initiate] create record failed:', e);
        return res.status(500).json({ success: false, error: 'Could not start payment' });
    }

    const cfg = getXentriPayConfig();
    const returnUrl = pmethod === 'cc' ? buildXentriCardReturnUrl(ctx.referenceId) : undefined;

    const collectionBody = {
        email: ctx.email,
        cname: ctx.name,
        amount: xentriAmount,
        cnumber: phones.cnumber,
        msisdn: phones.msisdn,
        currency: 'RWF',
        pmethod,
        chargesIncluded: cfg.chargesIncluded,
        ...(returnUrl && { returl: returnUrl, redirecturl: returnUrl }),
    };

    let response;
    try {
        response = await initiateXentriCollection(collectionBody);
    } catch (e) {
        console.error('[payment-initiate] XentriPay rejected:', {
            referenceId: ctx.referenceId,
            pmethod,
            amount: xentriAmount,
            error: e.message,
            xentriResponse: e.xentriResponse || null,
        });
        return res.status(400).json({
            success: false,
            error: e.message,
            referenceId: ctx.referenceId,
        });
    }

    const providerRefId = response.refid;
    if (!providerRefId) {
        console.error('[payment-initiate] No refid in XentriPay response:', {
            referenceId: ctx.referenceId,
            response,
        });
        return res.status(500).json({
            success: false,
            error: 'Payment gateway did not return a reference. Please try again.',
            referenceId: ctx.referenceId,
        });
    }

    const redirectUrl = response.url?.trim() || null;
    if (pmethod === 'cc' && !redirectUrl) {
        console.error('[payment-initiate] Card checkout URL missing:', {
            referenceId: ctx.referenceId,
            response,
        });
        return res.status(400).json({
            success: false,
            error: 'Card checkout URL was not returned by the gateway. Please try again.',
            referenceId: ctx.referenceId,
        });
    }

    await updatePaymentProviderRef(ctx.supabase, ctx.referenceId, {
        providerRefId,
        paymentProvider: 'xentripay',
    });

    const confirmationMessage =
        pmethod === 'cc'
            ? 'You will be redirected to complete your card payment. Enter your card details on the secure checkout page.'
            : 'A payment request was sent to your phone. Open MTN MoMo and approve the prompt to confirm your payment.';

    return res.status(200).json({
        success: true,
        status: 'awaiting_confirmation',
        gateway: 'xentripay',
        referenceId: ctx.referenceId,
        redirectUrl,
        message: response.reply || confirmationMessage,
        confirmationMessage,
    });
}
