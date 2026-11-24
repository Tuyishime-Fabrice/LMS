import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAppAuth } from "@/contexts/AuthContext";
import type { Database } from "@/integrations/supabase/types";
import { isMissingSchema } from "@/features/community/api";

export type LearnerPreferences = Database["public"]["Tables"]["learner_preferences"]["Row"];
export type PreferencesUpdate = Omit<Database["public"]["Tables"]["learner_preferences"]["Insert"], "user_id">;

/** The learner's own onboarding answers. `available` is false until the migration is applied. */
export async function fetchPreferences(userId: string): Promise<{ available: boolean; row: LearnerPreferences | null }> {
  const { data, error } = await supabase.from("learner_preferences").select("*").eq("user_id", userId).maybeSingle();
  if (error) {
    if (isMissingSchema(error)) return { available: false, row: null };
    throw error;
  }
  return { available: true, row: data };
}

export async function savePreferences(userId: string, values: PreferencesUpdate) {
  const { error } = await supabase.from("learner_preferences").upsert({ ...values, user_id: userId }, { onConflict: "user_id" });
  if (error && !isMissingSchema(error)) throw error;
  return { saved: !error };
}

/** Deletes the learner's onboarding answers (their right to erasure); the account itself stays. */
export async function deletePreferences(userId: string) {
  const { error } = await supabase.from("learner_preferences").delete().eq("user_id", userId);
  if (error && !isMissingSchema(error)) throw error;
}

export function usePreferences() {
  const { user } = useAppAuth();
  return useQuery({
    queryKey: ["learner-preferences", user?.id],
    queryFn: () => fetchPreferences(user!.id),
    enabled: Boolean(user?.id),
    staleTime: 5 * 60_000,
  });
}
