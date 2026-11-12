/**
 * Server-side coupon validation and pricing adjustments.
 */

export async function validateCouponForPurchase(supabase, {
    code,
    studentId,
    courseId,
    bundleId,
    pricing,
}) {
    const trimmed = String(code || '').trim();
    if (!trimmed) {
        return { pricing, coupon: null };
    }

    const { data, error } = await supabase.rpc('validate_coupon', {
        p_code: trimmed,
        p_student_id: studentId,
        p_course_id: courseId || null,
        p_bundle_id: bundleId || null,
        p_original_amount: pricing.amount,
        p_currency: pricing.currency || 'RWF',
    });

    if (error) {
        console.error('[coupons] validate_coupon RPC error:', error);
        throw new Error('Could not validate coupon');
    }

    if (!data?.valid) {
        throw new Error(data?.error || 'Invalid coupon code');
    }

    const finalAmount = Number(data.final_amount);
    if (!Number.isFinite(finalAmount) || finalAmount < 0) {
        throw new Error('Invalid coupon discount');
    }

    return {
        pricing: {
            ...pricing,
            amount: finalAmount,
            originalAmount: Number(data.original_amount),
            discountAmount: Number(data.discount_amount),
        },
        coupon: {
            id: data.coupon_id,
            code: data.code,
            discountType: data.discount_type,
            discountValue: Number(data.discount_value),
            discountAmount: Number(data.discount_amount),
            finalAmount,
        },
    };
}

export function buildPaymentRecordCouponParams(pricing, coupon) {
    if (!coupon?.id) {
        return {
            p_coupon_id: null,
            p_original_amount: null,
            p_discount_amount: 0,
        };
    }

    return {
        p_coupon_id: coupon.id,
        p_original_amount: pricing.originalAmount ?? pricing.amount,
        p_discount_amount: pricing.discountAmount ?? coupon.discountAmount ?? 0,
    };
}
