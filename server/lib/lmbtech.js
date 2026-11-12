/**
 * LMBTech payment gateway helpers
 */

export function getLmbTechCredentials() {
    const appKey = process.env.LMBTECH_APP_KEY?.trim();
    const secretKey = process.env.LMBTECH_SECRET_KEY?.trim();
    if (!appKey || !secretKey) return null;
    return Buffer.from(`${appKey}:${secretKey}`).toString('base64');
}

export async function fetchLmbTechPaymentStatus(referenceId) {
    const credentials = getLmbTechCredentials();
    if (!credentials) {
        throw new Error('LMBTech not configured');
    }

    const url = `https://pay.lmbtech.rw/pay/config/api.php?reference_id=${encodeURIComponent(referenceId)}`;
    const response = await fetch(url, {
        method: 'GET',
        headers: {
            Authorization: `Basic ${credentials}`,
            'Content-Type': 'application/json',
        },
    });

    const data = await response.json();
    const paymentStatus = data.data?.status || data.status || 'pending';
    return normalizeLmbStatus(paymentStatus);
}

export function normalizeLmbStatus(status) {
    if (typeof status === 'string') {
        const s = status.toLowerCase().trim();
        if (['success', 'completed', 'paid'].includes(s)) return 'success';
        if (['failed', 'fail', 'cancelled', 'declined'].includes(s)) return 'failed';
    }
    return 'pending';
}
