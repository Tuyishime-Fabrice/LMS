import { createClient } from '@supabase/supabase-js';

/**
 * Verify Supabase JWT from Authorization: Bearer <token>.
 * Returns authenticated user id or null.
 */
export async function verifyAuthUser(req) {
    const authHeader = req.headers.authorization || req.headers.Authorization;
    if (!authHeader?.startsWith('Bearer ')) {
        return null;
    }

    const token = authHeader.slice(7).trim();
    if (!token) return null;

    const supabaseUrl = process.env.SUPABASE_URL;
    const anonKey =
        process.env.SUPABASE_ANON_KEY ||
        process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

    if (!supabaseUrl || !anonKey) {
        console.error('[auth] SUPABASE_URL or SUPABASE_ANON_KEY not configured');
        return null;
    }

    const supabase = createClient(supabaseUrl, anonKey, {
        auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data?.user?.id) {
        return null;
    }

    return data.user.id;
}
