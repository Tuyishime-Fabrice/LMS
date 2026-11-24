import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { ArrowRight, BookOpen, ClipboardCheck, Info, Users } from "lucide-react";
import { PageHeader, StatusPill } from "@/components/shell/page";
import { Button } from "@/components/ui/button";
import { homePath, type AppRole } from "@/components/shell/navigation";
import { useAppAuth } from "@/contexts/AuthContext";
import { CommunityLinkEditor } from "@/features/community/CommunityLinkEditor";
import { AnnounceDialog } from "@/features/facilitation/AnnounceDialog";
import { FacilitationGate } from "@/features/facilitation/Gate";
import { fetchQueue, useRoster, type Assignment } from "@/features/facilitation/api";

function Overview({ assignments }: { assignments: Assignment[] }) {
  const { t } = useTranslation();
  const { user, profile } = useAppAuth();
  const roster = useRoster();
  const queue = useQuery({
    queryKey: ["facilitation-queue", user?.id, roster.data?.length],
    queryFn: () => fetchQueue(user!.id, roster.data || []),
    enabled: Boolean(user?.id && roster.data),
  });
  const learnersIn = (item: Assignment) => (roster.data || []).filter((row) => row.courseId === item.courseId && (!item.cohortName || row.cohortName === item.cohortName));
  const toReview = (item: Assignment) => {
    const ids = new Set(learnersIn(item).map((row) => row.studentId));
    return (queue.data || []).filter((row) => row.courseId === item.courseId && ids.has(row.studentId) && row.grade === null && !row.myReview).length;
  };

  return (
    <>
      <PageHeader
        title={t("facilitation.title", "Facilitation")}
        description={t("facilitation.description", "Support the learners you are assigned to: follow their progress, review their work, keep their cohort community running.")}
        actions={<Button asChild variant="ghost"><Link to={homePath[(profile?.role as AppRole) || "student"]}>{t("facilitation.backHome", "Back to my home")}</Link></Button>}
      />
      <div className="mb-6 flex items-start gap-3 rounded-xl border bg-card p-4 text-sm leading-6 text-muted-foreground">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
        <p>{t("facilitation.rules", "You can review work and suggest a mark with notes. The instructor stays responsible for the final mark and the written feedback learners receive, and learners never see your suggestions.")}</p>
      </div>
      <ul className="grid gap-4 lg:grid-cols-2">
        {assignments.map((item) => {
          const count = learnersIn(item).length;
          const pending = toReview(item);
          return (
            <li key={item.id} className="surface flex flex-col p-5">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <h2 className="text-card-title">{item.courseTitle}</h2>
                  <p className="text-meta">{item.cohortName || t("facilitation.allCohorts", "All cohorts")}</p>
                </div>
                {pending > 0 && <StatusPill tone="amber" icon={ClipboardCheck}>{t("facilitation.toReview", "{{count}} to review", { count: pending })}</StatusPill>}
              </div>
              <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-lg bg-background p-3"><dt className="text-eyebrow">{t("facilitation.learners", "Learners")}</dt><dd className="tabular mt-1 text-xl font-semibold text-forest">{roster.isLoading ? "…" : count}</dd></div>
                <div className="rounded-lg bg-background p-3"><dt className="text-eyebrow">{t("facilitation.awaiting", "Awaiting review")}</dt><dd className="tabular mt-1 text-xl font-semibold text-forest">{queue.isLoading ? "…" : pending}</dd></div>
              </dl>
              <div className="mt-4 flex flex-wrap gap-2 border-t pt-4">
                <Button asChild size="sm"><Link to={`/facilitate/review?course=${item.courseId}`}><ClipboardCheck />{t("facilitation.reviewWork", "Review work")}</Link></Button>
                <Button asChild size="sm" variant="outline"><Link to={`/facilitate/learners?course=${item.courseId}`}><Users />{t("facilitation.seeLearners", "Learners")}</Link></Button>
                <Button asChild size="sm" variant="outline"><Link to={`/learn/${item.courseId}`}><BookOpen />{t("facilitation.openCourse", "Open course")}</Link></Button>
                {item.cohortId && <CommunityLinkEditor target="cohorts" viaFunction id={item.cohortId} name={item.cohortName || item.courseTitle} current={item.cohortDiscordUrl} />}
                {!item.cohortId && <AnnounceDialog courseId={item.courseId} courseTitle={item.courseTitle} />}
              </div>
            </li>
          );
        })}
      </ul>
      <p className="mt-6 flex items-center gap-1.5 text-meta">
        <ArrowRight className="h-3.5 w-3.5" />
        {t("facilitation.announceNote", "Course announcements are posted by the instructor or by facilitators assigned to the whole course.")}
      </p>
    </>
  );
}

export default function FacilitationOverview() {
  return <FacilitationGate>{(assignments) => <Overview assignments={assignments} />}</FacilitationGate>;
}
