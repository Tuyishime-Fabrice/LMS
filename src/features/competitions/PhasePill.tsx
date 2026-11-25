import { useTranslation } from "react-i18next";
import { StatusPill } from "@/components/shell/page";
import { phase, type CompetitionTimes } from "./rules";

export function PhasePill({ competition }: { competition: CompetitionTimes }) {
  const { t } = useTranslation();
  const value = phase(competition);
  const map = {
    upcoming: { tone: "blue", label: t("competitions.phase.upcoming", "Upcoming") },
    open: { tone: "green", label: t("competitions.phase.open", "Open for submissions") },
    judging: { tone: "amber", label: t("competitions.phase.judging", "Judging") },
    results: { tone: "forest", label: t("competitions.phase.results", "Results published") },
    closed: { tone: "neutral", label: t("competitions.phase.closed", "Closed") },
  } as const;
  return <StatusPill tone={map[value].tone}>{map[value].label}</StatusPill>;
}
