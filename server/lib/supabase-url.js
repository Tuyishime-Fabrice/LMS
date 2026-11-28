/**
 * The project URL from SUPABASE_URL, accepted in the form Supabase's API page shows it
 * ("https://<ref>.supabase.co/rest/v1/") as well as the bare one: supabase-js adds
 * /rest/v1 itself, so a URL that already ends in it would break every request.
 */
export function supabaseProjectUrl(value = process.env.SUPABASE_URL) {
    if (!value) return undefined;
    return value.trim().replace(/\/rest\/v1\/?$/, '').replace(/\/+$/, '') || undefined;
}
