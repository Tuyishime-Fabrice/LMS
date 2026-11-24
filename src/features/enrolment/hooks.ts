import { useQuery } from "@tanstack/react-query";
import { useAppAuth } from "@/contexts/AuthContext";
import { fetchJourneys } from "./api";

export function useJourneys() {
  const { user, profile } = useAppAuth();
  return useQuery({
    queryKey: ["access-journeys", user?.id],
    queryFn: () => fetchJourneys(user!.id),
    enabled: Boolean(user?.id && profile?.role === "student"),
    staleTime: 30_000,
    // A payment awaiting confirmation changes when the provider calls back; look again shortly.
    refetchInterval: (query) => (query.state.data || []).some((item) => item.journey.steps.some((step) => step.status === "awaiting_confirmation")) ? 15_000 : false,
  });
}
