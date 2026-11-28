import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';
import { authStorage } from '@/lib/browserStorage';
import { DEMO_MODE } from '@/demo/config';
import { demoFetch, demoFileUrl, DEMO_SUPABASE_URL } from '@/demo/backend';

/*
 * The project comes only from the build's environment (VITE_SUPABASE_URL and
 * VITE_SUPABASE_PUBLISHABLE_KEY, set in Vercel; see docs/supabase-setup.md). There is
 * deliberately no fallback project: a build without them must not quietly read or write
 * another database. It points at an address that cannot resolve and says why in the console.
 */
const SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim()
  // Accept the URL as copied from Supabase's API page too ("…supabase.co/rest/v1/"): the client adds /rest/v1 itself.
  .replace(/\/rest\/v1\/?$/, "").replace(/\/+$/, "");
const SUPABASE_PUBLISHABLE_KEY = (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined)?.trim();
export const supabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_PUBLISHABLE_KEY);

if (!DEMO_MODE && !supabaseConfigured && typeof window !== "undefined") {
  console.error(
    "Supabase is not configured: set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY for this build (Vercel → Settings → Environment Variables), then redeploy.",
  );
}

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";

export const supabase = DEMO_MODE
  ? createClient<Database>(DEMO_SUPABASE_URL, "demo-anon-key", {
      auth: { storage: authStorage, persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
      global: { fetch: demoFetch },
    })
  : createClient<Database>(SUPABASE_URL || "https://supabase-not-configured.invalid", SUPABASE_PUBLISHABLE_KEY || "not-configured", {
      auth: {
        storage: authStorage,
        persistSession: true,
        autoRefreshToken: true,
      }
    });

if (DEMO_MODE) {
  // No realtime server in the demo: channels are accepted and stay quiet.
  const quietChannel = {
    on() { return quietChannel; },
    subscribe(callback?: (status: string) => void) { callback?.("SUBSCRIBED"); return quietChannel; },
    unsubscribe: async () => "ok",
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (supabase as any).channel = () => quietChannel;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (supabase as any).removeChannel = async () => "ok";

  // Files: uploads stay in this browser; existing files open a sample PDF.
  const storageFrom = supabase.storage.from.bind(supabase.storage);
  supabase.storage.from = (bucket: string) => {
    const api = storageFrom(bucket);
    api.createSignedUrl = async (path: string) => ({ data: { signedUrl: demoFileUrl(path) }, error: null });
    api.getPublicUrl = ((path: string) => ({ data: { publicUrl: demoFileUrl(path) } })) as typeof api.getPublicUrl;
    return api;
  };

  // Google sign-in needs a real Supabase project.
  supabase.auth.signInWithOAuth = (async () => ({
    data: { provider: "google", url: null },
    error: new Error("Google sign-in is not available in the demo. Use one of the demo accounts."),
  })) as unknown as typeof supabase.auth.signInWithOAuth;
}
