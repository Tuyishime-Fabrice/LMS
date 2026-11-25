import { useTracks } from "@/features/tracks/api";
import { useCompetitions } from "@/features/competitions/api";

export const siteLinks = [
  { to: "/courses", key: "site.nav.courses", label: "Courses" },
  { to: "/tracks", key: "site.nav.tracks", label: "Skill & career tracks", needs: "tracks" },
  { to: "/competitions", key: "site.nav.competitions", label: "Competitions", needs: "competitions" },
  { to: "/exhibition", key: "site.nav.exhibition", label: "Student projects" },
  { to: "/verify", key: "site.nav.verify", label: "Verify a certificate" },
] as const;

/** Public links, without tracks or competitions until at least one real one is published. */
export function useSiteLinks() {
  const tracks = useTracks();
  const competitions = useCompetitions();
  const has = { tracks: Boolean(tracks.data?.tracks.length), competitions: Boolean(competitions.data?.competitions.length) };
  return siteLinks.filter((link) => !("needs" in link) || has[link.needs]);
}
