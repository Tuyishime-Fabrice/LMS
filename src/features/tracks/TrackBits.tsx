import { useTranslation } from "react-i18next";
import { BriefcaseBusiness, Route } from "lucide-react";
import { StatusPill } from "@/components/shell/page";
import type { TrackRow } from "./api";

export function TrackKindPill({ kind }: { kind: TrackRow["kind"] }) {
  const { t } = useTranslation();
  return kind === "career"
    ? <StatusPill tone="forest" icon={BriefcaseBusiness}>{t("tracks.kind.career", "Career track")}</StatusPill>
    : <StatusPill tone="brand" icon={Route}>{t("tracks.kind.skill", "Skill track")}</StatusPill>;
}
