/**
 * POST /api/coupon-validate
 * Preview coupon discount before checkout (no redemption).
 */

import { verifyAuthUser } from '../server/lib/auth.js';
import { getSupabaseAdmin, resolvePurchasePrice, resolvePurchaseTarget } from '../server/lib/supabase-payments.js';
import { validateCouponForPurchase } from '../server/lib/coupons.js';

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

        const { code, courseId: rawCourseId, bundleId: rawBundleId, checkoutStartedAt, paymentTrack, cohortId } = req.body;

        if (!code?.trim()) {
            return res.status(400).json({ success: false, error: 'Coupon code is required' });
        }

        let courseId;
        let bundleId;
        try {
            ({ courseId, bundleId } = resolvePurchaseTarget({
                courseId: rawCourseId,
                bundleId: rawBundleId,
            }));
        } catch (e) {
            return res.status(400).json({ success: false, error: e.message });
        }

        const supabase = getSupabaseAdmin();
        if (!supabase) {
            return res.status(500).json({ success: false, error: 'Service unavailable' });
        }

        let pricing;
        try {
            pricing = await resolvePurchasePrice(supabase, {
                courseId,
                bundleId,
                studentId: userId,
                checkoutStartedAt,
                paymentTrack: bundleId ? 'full' : paymentTrack || 'full',
                cohortId: cohortId || null,
            });
        } catch (e) {
            return res.status(400).json({ success: false, error: e.message });
        }

        let result;
        try {
            result = await validateCouponForPurchase(supabase, {
                code,
                studentId: userId,
                courseId,
                bundleId,
                pricing,
            });
        } catch (e) {
            return res.status(400).json({ success: false, error: e.message });
        }

        return res.status(200).json({
            success: true,
            valid: true,
            code: result.coupon.code,
            discountType: result.coupon.discountType,
            discountValue: result.coupon.discountValue,
            originalAmount: result.pricing.originalAmount,
            discountAmount: result.pricing.discountAmount,
            finalAmount: result.pricing.amount,
            currency: result.pricing.currency,
        });
    } catch (error) {
        console.error('[coupon-validate] Error:', error);
        return res.status(500).json({ success: false, error: 'Validation failed' });
    }
}
