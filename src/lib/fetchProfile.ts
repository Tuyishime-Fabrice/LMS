/**
 * Lightweight helpers for profile / suspension fetching.
 * Profile fetching after sign-in is now owned by AuthContext (via setTimeout 0
 * to escape Supabase's internal auth lock). These helpers remain available for
 * one-off fetches (e.g. suspension checks).
 */
import { supabase } from "@/integrations/supabase/client";

export async function fetchSuspensionStatus(userId: string) {
  const { data, error } = await supabase
    .from("profiles")
    .select("is_suspended, suspension_reason")
    .eq("id", userId)
    .maybeSingle();

  return { data, error };
}
