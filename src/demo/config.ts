/**
 * Demo mode runs the whole app in the browser against sample data, with
 * no Supabase project and no server keys. Turn it on with
 * VITE_DEMO_MODE=true at build time. Never on by default.
 */
export const DEMO_MODE = import.meta.env.VITE_DEMO_MODE === "true";

/** Hash URLs (/#/student/dashboard) for hosts that cannot route every path to index.html. */
export const HASH_ROUTER = import.meta.env.VITE_HASH_ROUTER === "true";

export { DEMO_ACCOUNTS, DEMO_PASSWORD } from "./seed";
