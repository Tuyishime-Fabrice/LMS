import { useQuery } from "@tanstack/react-query";
import { useAppAuth } from "@/contexts/AuthContext";
import { fetchCommunityLinks } from "./api";

export function useCommunityLinks() {
  const { user } = useAppAuth();
  return useQuery({
    queryKey: ["community-links", user?.id],
    queryFn: () => fetchCommunityLinks(user!.id),
    enabled: Boolean(user?.id),
    staleTime: 5 * 60_000,
  });
}
