import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAppAuth } from "@/contexts/AuthContext";
import type { Database } from "@/integrations/supabase/types";
import { isMissingSchema } from "@/features/community/api";

export type Competition = Database["public"]["Tables"]["competitions"]["Row"];
export type Registration = Database["public"]["Tables"]["competition_registrations"]["Row"];
export type Submission = Database["public"]["Tables"]["competition_submissions"]["Row"];

export async function fetchCompetitions(): Promise<{ available: boolean; competitions: Competition[] }> {
  const { data, error } = await supabase.from("competitions").select("*").order("submission_deadline", { ascending: true, nullsFirst: false });
  if (error) {
    if (isMissingSchema(error)) return { available: false, competitions: [] };
    throw error;
  }
  return { available: true, competitions: data || [] };
}

export function useCompetitions() {
  return useQuery({ queryKey: ["competitions"], queryFn: fetchCompetitions, staleTime: 60_000 });
}

/** The signed-in user's registration and submissions for one competition. */
export function useMyCompetition(competitionId: string | undefined) {
  const { user } = useAppAuth();
  return useQuery({
    queryKey: ["my-competition", competitionId, user?.id],
    enabled: Boolean(competitionId && user?.id),
    queryFn: async () => {
      const [registration, submissions] = await Promise.all([
        supabase.from("competition_registrations").select("*").eq("competition_id", competitionId!).eq("user_id", user!.id).maybeSingle(),
        supabase.from("competition_submissions").select("*").eq("competition_id", competitionId!).eq("user_id", user!.id).order("submitted_at", { ascending: false }),
      ]);
      if (registration.error) throw registration.error;
      if (submissions.error) throw submissions.error;
      return { registration: registration.data, submissions: submissions.data || [] };
    },
  });
}

/** Ids of competitions the user has joined, for the hub's "My competitions" filter. */
export function useMyRegistrations() {
  const { user } = useAppAuth();
  return useQuery({
    queryKey: ["my-competition-registrations", user?.id],
    enabled: Boolean(user?.id),
    queryFn: async () => {
      const { data, error } = await supabase.from("competition_registrations").select("competition_id, status").eq("user_id", user!.id);
      if (error && !isMissingSchema(error)) throw error;
      return new Set((data || []).filter((row) => row.status === "registered").map((row) => row.competition_id));
    },
  });
}

export function useLeaderboard(competitionId: string | undefined, enabled: boolean) {
  return useQuery({
    queryKey: ["competition-leaderboard", competitionId],
    enabled: Boolean(competitionId && enabled),
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_competition_leaderboard", { p_competition_id: competitionId! });
      if (error) throw error;
      return data || [];
    },
  });
}
