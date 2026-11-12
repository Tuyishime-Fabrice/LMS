/**
 * Vercel Serverless Function: Payment Callback (LMBTech)
 *
 * MoMo: POST with JSON body (server-to-server)
 * Card: GET with query params (browser redirect from Pesapal)
 *
 * Security: verifies payment status with LMBTech API before enrolling.
 */

import { createClient } from '@supabase/supabase-js';
import { fetchLmbTechPaymentStatus } from '../server/lib/lmbtech.js';
import { sanitizeReferenceId } from '../server/lib/supabase-payments.js';

export default async function handler(req, res) {
    const payload = req.method === 'GET' ? req.query : req.body;
    const isBrowserRedirect = req.method === 'GET';

    try {
        let referenceId, transactionId;

        if (payload.pesapal_merchant_reference) {
            referenceId = payload.pesapal_merchant_reference;
            transactionId = payload.pesapal_transaction_tracking_id || '';
        } else if (payload.reference_id) {
            referenceId = payload.reference_id;
            transactionId = payload.transaction_id || '';
        } else {
            if (isBrowserRedirect) {
                return res.redirect(302, '/payment/success?error=invalid_callback');
            }
            return res.status(400).json({ success: false, error: 'Invalid callback' });
        }

        const safeRef = sanitizeReferenceId(referenceId);
        if (!safeRef) {
            if (isBrowserRedirect) {
                return res.redirect(302, '/payment/success?error=invalid_callback');
            }
            return res.status(400).json({ success: false, error: 'Invalid reference' });
        }

        // Verify with LMBTech — never trust callback payload alone for enrollment
        let verifiedStatus;
        try {
            verifiedStatus = await fetchLmbTechPaymentStatus(safeRef);
        } catch (e) {
            console.error('[payment-callback] LMBTech verification failed:', e.message);
            if (isBrowserRedirect) {
                return res.redirect(302, `/payment/success?ref=${encodeURIComponent(safeRef)}`);
            }
            return res.status(502).json({ success: false, error: 'Verification failed' });
        }

        const supabaseUrl = process.env.SUPABASE_URL;
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

        if (supabaseUrl && supabaseServiceKey && verifiedStatus !== 'pending') {
            const supabase = createClient(supabaseUrl, supabaseServiceKey);

            const { error: rpcError } = await supabase.rpc('update_payment_status', {
                p_reference_id: safeRef,
                p_status: verifiedStatus,
                p_transaction_id: transactionId || null,
                p_callback_data: payload,
            });

            if (rpcError) {
                console.error('[payment-callback] Supabase RPC error:', rpcError);
            }
        }

        if (isBrowserRedirect) {
            return res.redirect(302, `/payment/success?ref=${encodeURIComponent(safeRef)}`);
        }

        return res.status(200).json({
            success: true,
            message: 'Callback processed',
        });
    } catch (error) {
        console.error('[payment-callback] Error:', error);
        if (req.method === 'GET') {
            return res.redirect(302, '/payment/success?error=processing_error');
        }
        return res.status(500).json({ success: false, error: 'Processing error' });
    }
}
