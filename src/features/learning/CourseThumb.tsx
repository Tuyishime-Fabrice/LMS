import { useTranslation } from "react-i18next";
import { PlusMotif } from "@/components/brand/PlusMotif";
import { coverFamily, type CoverFamily } from "@/features/courses/coverFamily";
import { cn } from "@/lib/utils";

const STYLE: Record<CoverFamily, { bg: string; dark: boolean }> = {
  data: { bg: "bg-cover-data", dark: true },
  me: { bg: "bg-cover-me", dark: false },
  ai: { bg: "bg-cover-ai", dark: true },
  research: { bg: "bg-cover-research", dark: true },
  geo: { bg: "bg-cover-geo", dark: false },
};

/**
 * Generated course cover: the subject family's tint, the course title in League Spartan and a
 * stepped plus cut by the right edge. Built from course data, so every course gets one and no
 * event poster, date or uploaded thumbnail is ever shown in a listing.
 * `compact` (small tiles beside a title) drops the text and keeps tint and motif.
 */
export function CourseThumb({ title, category, compact = false, className }: { title: string; category?: string | null; compact?: boolean; className?: string }) {
  const { t } = useTranslation();
  const family = coverFamily({ title, category });
  const { bg, dark } = STYLE[family];
  const familyLabel: Record<CoverFamily, string> = {
    data: t("cover.family.data", "Data analysis"),
    me: t("cover.family.me", "Monitoring and evaluation"),
    ai: t("cover.family.ai", "AI for professionals"),
    research: t("cover.family.research", "Research and proposals"),
    geo: t("cover.family.geo", "Geospatial"),
  };
  return (
    <div aria-hidden className={cn("relative overflow-hidden rounded-lg", bg, dark ? "text-cream" : "text-brand-900", className)} data-cover={family}>
      <PlusMotif
        variant="stepped"
        tone={dark ? "dark" : "light"}
        size={compact ? "70%" : "38%"}
        className={cn("absolute", compact ? "-right-[22%] top-1/2 -translate-y-1/2" : "-right-[6%] -top-[8%] opacity-90")}
      />
      {!compact && (
        <div className="relative flex h-full flex-col justify-between p-4 sm:p-5">
          <p className={cn("text-[0.6875rem] font-semibold", dark ? "text-cream/75" : "text-brand-900/80")}>{familyLabel[family]}</p>
          <p className="line-clamp-3 max-w-[78%] font-display text-xl font-bold leading-[1.1] sm:text-[1.375rem]">{title}</p>
        </div>
      )}
    </div>
  );
}
