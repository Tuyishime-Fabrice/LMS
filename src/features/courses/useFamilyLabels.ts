import { useTranslation } from "react-i18next";
import type { CoverFamily } from "./coverFamily";

/** Display names of the subject families, in the current language. */
export function useFamilyLabels(): Record<CoverFamily, string> {
  const { t } = useTranslation();
  return {
    data: t("cover.family.data", "Data analysis"),
    me: t("cover.family.me", "Monitoring and evaluation"),
    ai: t("cover.family.ai", "AI for professionals"),
    research: t("cover.family.research", "Research and proposals"),
    geo: t("cover.family.geo", "Geospatial"),
  };
}
