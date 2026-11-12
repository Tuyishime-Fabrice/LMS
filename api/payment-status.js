/**
 * Vercel Serverless Function: Payment Status
 * GET /api/payment-status?ref=REFERENCE_ID
 *
 * Public (for card return page) — returns status only, no PII.
 * Enrollment updates only when gateway confirms payment.
 */

import {
    getSupabaseAdmin,
    findPaymentByReference,
    updatePaymentStatus,
    sanitizeReferenceId,
} from '../server/lib/supabase-payments.js';
import {
    getXentriCollectionStatus,
    mapXentriCollectionStatus,
} from '../server/lib/xentripay.js';
import { fetchLmbTechPaymentStatus } from '../server/lib/lmbtech.js';

export default async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ success: false, error: 'Method not allowed' });
    }

    const referenceId = sanitizeReferenceId(req.query.ref);
    if (!referenceId) {
        return res.status(400).json({
            success: false,
            error: 'Invalid or missing reference ID',
        });
    }

    try {
        const supabase = getSupabaseAdmin();
        let payment = null;
        let gateway = req.query.gateway?.toLowerCase();

        if (supabase) {
            payment = await findPaymentByReference(supabase, referenceId);
            if (payment?.payment_provider && !gateway) {
                gateway = payment.payment_provider;
            }
        }

        if (!gateway) {
            gateway = referenceId.startsWith('COURSE-') ? 'lmbtech' : 'xentripay';
        }

        if (gateway === 'xentripay') {
            return handleXentriPayStatus(res, referenceId, payment, supabase);
        }

        return handleLmbTechStatus(res, referenceId);
    } catch (error) {
        console.error('[payment-status] Error:', error);
        return res.status(500).json({
            success: false,
            status: 'pending',
            referenceId,
        });
    }
}

async function handleLmbTechStatus(res, referenceId) {
    try {
        const normalizedStatus = await fetchLmbTechPaymentStatus(referenceId);
        return res.status(200).json({
            success: normalizedStatus === 'success',
            gateway: 'lmbtech',
            status: normalizedStatus,
            referenceId,
        });
    } catch {
        return res.status(500).json({ success: false, error: 'Status check unavailable' });
    }
}

async function handleXentriPayStatus(res, referenceId, payment, supabase) {
    const providerRefId = payment?.provider_ref_id || referenceId;

    const statusRes = await getXentriCollectionStatus(providerRefId);
    const normalizedStatus = mapXentriCollectionStatus(statusRes.status);

    if (
        supabase &&
        payment &&
        payment.status === 'pending' &&
        (normalizedStatus === 'success' || normalizedStatus === 'failed')
    ) {
        const dbStatus = normalizedStatus === 'success' ? 'success' : 'failed';
        await updatePaymentStatus(supabase, payment.reference_id, dbStatus, statusRes.refid, statusRes);
    }

    return res.status(200).json({
        success: normalizedStatus === 'success',
        gateway: 'xentripay',
        status: normalizedStatus,
        referenceId: payment?.reference_id || referenceId,
    });
}
