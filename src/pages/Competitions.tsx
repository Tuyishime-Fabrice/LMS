import { usePageMeta } from "@/lib/pageMeta";
import { useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { format } from "date-fns";
import { ArrowRight, CalendarClock, Trophy, UserCheck } from "lucide-react";
import { EmptyState, ErrorState, PageHeader, SkeletonBlock } from "@/components/shell/page";
import { FilterTabs } from "@/components/shell/FilterTabs";
import { useAppAuth } from "@/contexts/AuthContext";
import { useCompetitions, useMyRegistrations } from "@/features/competitions/api";
import { PhasePill } from "@/features/competitions/PhasePill";
import { phase } from "@/features/competitions/rules";
import { useDateLocale } from "@/features/learning/hooks";
import { DiscoveryLayout } from "@/features/site/DiscoveryLayout";

type Filter = "current" | "mine" | "past";

export default function Competitions() {
  const { t } = useTranslation();
  usePageMeta({ title: t("meta.competitions.title", "Competitions"), description: t("meta.competitions.description", "Data challenges run by DATA+ Academy, with their rules, timeline and results."), path: "/competitions" });
  const locale = useDateLocale();
  const { user } = useAppAuth();
  const competitions = useCompetitions();
  const mine = useMyRegistrations();
  const [filter, setFilter] = useState<Filter>("current");

  const list = (competitions.data?.competitions || []).filter((item) => {
    const p = phase(item);
    if (filter === "mine") return mine.data?.has(item.id);
    if (filter === "past") return p === "results" || p === "closed";
    return p === "upcoming" || p === "open" || p === "judging";
  });

  return (
    <DiscoveryLayout>
      <PageHeader
        title={t("competitions.title", "Competitions")}
        description={t("competitions.description", "Time-boxed data challenges with their own rules, timeline and results. Open to DATA+ learners and, where stated, to the public.")}
      />
      <FilterTabs<Filter>
        className="mb-6"
        label={t("competitions.filterLabel", "Show competitions")}
        value={filter}
        onChange={setFilter}
        options={[
          { value: "current" as Filter, label: t("competitions.tab.current", "Current and upcoming") },
          ...(user ? [{ value: "mine" as Filter, label: t("competitions.tab.mine", "My competitions") }] : []),
          { value: "past" as Filter, label: t("competitions.tab.past", "Past") },
        ]}
      />

      {competitions.isLoading ? (
        <div className="grid gap-4 md:grid-cols-2">{[0, 1].map((key) => <SkeletonBlock key={key} className="h-52" />)}</div>
      ) : competitions.isError ? (
        <ErrorState title={t("competitions.error", "Competitions could not be loaded")} onRetry={() => void competitions.refetch()} retryLabel={t("common.tryAgain", "Try again")} />
      ) : list.length === 0 ? (
        <EmptyState
          icon={Trophy}
          title={filter === "mine" ? t("competitions.emptyMine", "You have not joined a competition") : filter === "past" ? t("competitions.emptyPast", "No past competitions yet") : t("competitions.empty", "No competitions announced right now")}
          description={t("competitions.emptyBody", "New challenges are announced here and to your cohort on Discord.")}
        />
      ) : (
        <ul className="grid gap-4 md:grid-cols-2">
          {list.map((item) => (
            <li key={item.id}>
              <Link to={`/competitions/${item.slug}`} className="surface-interactive group flex h-full flex-col p-5">
                <div className="flex flex-wrap items-center gap-2">
                  <PhasePill competition={item} />
                  {mine.data?.has(item.id) && <span className="inline-flex items-center gap-1 text-xs font-semibold text-success"><UserCheck className="h-3.5 w-3.5" />{t("competitions.joined", "Joined")}</span>}
                </div>
                <h2 className="mt-3 text-[1.0625rem] font-semibold text-forest group-hover:text-primary">{item.title}</h2>
                {item.summary && <p className="mt-1.5 line-clamp-2 text-sm leading-6 text-muted-foreground">{item.summary}</p>}
                <div className="min-h-4 flex-1" />
                <p className="mt-4 flex items-center gap-1.5 text-meta">
                  <CalendarClock className="h-3.5 w-3.5" />
                  {item.submission_deadline
                    ? t("competitions.deadline", "Submissions close {{date}}", { date: format(new Date(item.submission_deadline), "d MMM yyyy, HH:mm", { locale }) })
                    : t("competitions.noDeadline", "Dates to be announced")}
                </p>
                <span className="mt-4 inline-flex items-center gap-1 border-t pt-3 text-sm font-semibold text-primary">
                  {mine.data?.has(item.id) ? t("competitions.openWorkspace", "Open workspace") : t("competitions.details", "See details")}
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </DiscoveryLayout>
  );
}
