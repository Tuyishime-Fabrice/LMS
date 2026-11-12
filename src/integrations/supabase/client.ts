import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';
import { authStorage } from '@/lib/browserStorage';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "https://huknlixecscpyfficeom.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh1a25saXhlY3NjcHlmZmljZW9tIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkyMjYxODEsImV4cCI6MjA3NDgwMjE4MX0.YZ8WYoW6Xsjmz06QDQBqnd0n-bXEVNYs4cgC7hfjJKI";

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: authStorage,
    persistSession: true,
    autoRefreshToken: true,
  }
});
