import { usePageMeta } from "@/lib/pageMeta";
import { Link, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowLeft, ArrowRight, Check, CheckCircle2, Circle, Info, PlayCircle, Target } from "lucide-react";
import { EmptyState, ErrorState, ProgressBar, SkeletonBlock, StatusPill } from "@/components/shell/page";
import { Button } from "@/components/ui/button";
import { useAppAuth } from "@/contexts/AuthContext";
import { CourseThumb } from "@/features/learning/CourseThumb";
import { formatAmount } from "@/features/site/landing-data";
import { DiscoveryLayout } from "@/features/site/DiscoveryLayout";
import { progressFor, useMyEnrolments, useTracks } from "@/features/tracks/api";
import { TrackKindPill } from "@/features/tracks/TrackBits";
import { useLevelLabel } from "@/features/tracks/labels";
import { cn } from "@/lib/utils";

export default function TrackDetail() {
  const { slug } = useParams();
  const { t, i18n } = useTranslation();
  const { profile } = useAppAuth();
  const tracks = useTracks();
  const enrolments = useMyEnrolments();
  const levelLabel = useLevelLabel();
  const track = tracks.data?.tracks.find((item) => item.slug === slug);
  usePageMeta({ title: track?.title || t("meta.tracks.title", "Skill and career tracks"), description: track?.summary || undefined, path: `/tracks/${slug}` });

  if (tracks.isLoading) return <DiscoveryLayout><SkeletonBlock className="h-40" /><SkeletonBlock className="mt-6 h-96" /></DiscoveryLayout>;
  if (tracks.isError) return <DiscoveryLayout><ErrorState title={t("tracks.error", "Tracks could not be loaded")} onRetry={() => void tracks.refetch()} /></DiscoveryLayout>;
  if (!track) {
    return (
      <DiscoveryLayout>
        <EmptyState icon={Target} title={t("tracks.notFound", "This track is not available")} description={t("tracks.notFoundBody", "It may have been renamed or unpublished.")}
          action={<Button asChild variant="outline"><Link to="/tracks">{t("tracks.all", "All tracks")}</Link></Button>} />
      </DiscoveryLayout>
    );
  }

  const progress = progressFor(track, enrolments.data);
  const isLearner = profile?.role === "student";
  const titleOf = (courseId: string | null) => track.items.find((item) => item.courseId === courseId)?.course?.title || "";
  const next = track.items.find((item) => item.courseId === progress.nextCourseId);
  const nextEnrolled = enrolments.data?.some((row) => row.courseId === progress.nextCourseId);
  const details = [
    [t("tracks.detail.type", "Type"), track.kind === "career" ? t("tracks.kind.career", "Career track") : t("tracks.kind.skill", "Skill track")],
    track.target_role ? [t("tracks.detail.role", "Target role"), track.target_role] : null,
    [t("tracks.detail.courses", "Courses"), t("tracks.detail.coursesValue", "{{total}} ({{required}} required)", { total: track.items.length, required: progress.requiredTotal })],
    track.estimated_hours ? [t("tracks.detail.effort", "Estimated effort"), t("tracks.hours", "about {{count}} hours", { count: track.estimated_hours })] : null,
    track.level ? [t("tracks.detail.level", "Level"), levelLabel(track.level)] : null,
    track.language ? [t("tracks.detail.language", "Language"), track.language === "fr" ? "Français" : track.language === "en" ? "English" : track.language] : null,
  ].filter(Boolean) as [string, string][];

  return (
    <DiscoveryLayout>
      <nav aria-label={t("common.breadcrumb", "Breadcrumb")} className="mb-4 flex items-center gap-1.5 text-sm text-muted-foreground">
        <Link to={`/tracks${track.kind === "career" ? "?kind=career" : ""}`} className="inline-flex items-center gap-1 hover:text-forest"><ArrowLeft className="h-3.5 w-3.5" />{t("tracks.title", "Skill and career tracks")}</Link>
        <span aria-hidden>/</span>
        <span className="truncate text-forest">{track.title}</span>
      </nav>

      <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="max-w-3xl">
          <TrackKindPill kind={track.kind} />
          <h1 className="text-page-title mt-3">{track.title}</h1>
          {track.summary && <p className="mt-2 text-[0.9375rem] leading-7 text-muted-foreground">{track.summary}</p>}
        </div>
        {next?.course && (
          <Button asChild size="lg" className="shrink-0">
            <Link to={isLearner && nextEnrolled ? `/learn/${next.courseId}` : `/course/${next.courseId}`}>
              {progress.started ? t("tracks.nextCourse", "Next: {{title}}", { title: next.course.title }) : t("tracks.start", "Start with {{title}}", { title: next.course.title })}
              <ArrowRight />
            </Link>
          </Button>
        )}
      </header>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <section aria-labelledby="sequence-heading">
          <h2 id="sequence-heading" className="text-section-title mb-3">{t("tracks.sequence", "Course sequence")}</h2>
          <ol className="surface divide-y">
            {progress.items.map((item, index) => {
              const entry = track.items.find((row) => row.courseId === item.courseId)!;
              const course = entry.course!;
              return (
                <li key={item.courseId} className="flex gap-4 p-4 sm:p-5">
                  <span className={cn(
                    "mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
                    item.state === "completed" ? "bg-forest text-forest-foreground" : item.state === "in_progress" ? "bg-card text-primary ring-2 ring-primary" : "bg-card text-muted-foreground ring-1 ring-border",
                  )}>
                    {item.state === "completed" ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : index + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link to={`/course/${course.id}`} className="text-[0.9375rem] font-semibold text-forest hover:text-primary">{course.title}</Link>
                      {!item.required && <StatusPill>{t("tracks.optional", "Optional")}</StatusPill>}
                      {item.state === "completed" && <StatusPill tone="green" icon={CheckCircle2}>{t("tracks.completed", "Completed")}</StatusPill>}
                      {item.state === "in_progress" && <StatusPill tone="brand" icon={PlayCircle}>{item.progress > 0 ? t("tracks.inProgress", "In progress · {{percent}}%", { percent: item.progress }) : t("tracks.started", "In progress")}</StatusPill>}
                    </div>
                    {course.summary && <p className="mt-1 line-clamp-2 text-sm leading-6 text-muted-foreground">{course.summary}</p>}
                    {entry.milestone && <p className="mt-2 flex items-start gap-1.5 text-sm text-forest"><Target className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />{entry.milestone}</p>}
                    <p className="mt-2 text-meta">
                      {[levelLabel(course.level), course.duration, course.isFree ? t("landing.free", "Free") : formatAmount(course.price, course.currency, i18n.language)].filter(Boolean).join(" · ")}
                    </p>
                    {item.recommendedAfter && (
                      <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Info className="h-3.5 w-3.5" />{t("tracks.recommendedAfter", "Recommended after {{title}}", { title: titleOf(item.recommendedAfter) })}
                      </p>
                    )}
                  </div>
                  <CourseThumb src={course.thumbnailUrl} title={course.title} className="hidden h-16 w-24 shrink-0 sm:block" />
                </li>
              );
            })}
          </ol>
          {track.description && (
            <div className="mt-8">
              <h2 className="text-section-title mb-2">{t("tracks.about", "About this track")}</h2>
              <p className="whitespace-pre-line text-[0.9375rem] leading-7 text-muted-foreground">{track.description}</p>
            </div>
          )}
        </section>

        <aside className="space-y-4">
          {isLearner && (
            <section className="surface p-5" aria-labelledby="track-progress">
              <h2 id="track-progress" className="text-card-title">{t("tracks.yourProgress", "Your progress")}</h2>
              <div className="mb-1.5 mt-3 flex justify-between text-sm">
                <span className="text-muted-foreground">{t("tracks.progress", "{{done}} of {{total}} required courses", { done: progress.requiredCompleted, total: progress.requiredTotal })}</span>
                <span className="tabular font-semibold text-forest">{progress.percent}%</span>
              </div>
              <ProgressBar value={progress.percent} label={t("tracks.yourProgress", "Your progress")} />
              <p className="mt-3 text-meta">{t("tracks.progressNote", "Counted from the courses you complete. Courses you finished before joining the track count too.")}</p>
            </section>
          )}
          <section className="surface p-5" aria-labelledby="track-details">
            <h2 id="track-details" className="text-card-title">{t("tracks.details", "Details")}</h2>
            <dl className="mt-3 divide-y text-sm">
              {details.map(([label, value]) => (
                <div key={label} className="flex justify-between gap-4 py-2.5">
                  <dt className="text-muted-foreground">{label}</dt>
                  <dd className="text-right font-medium text-forest">{value}</dd>
                </div>
              ))}
            </dl>
          </section>
          {track.outcomes.length > 0 && (
            <section className="surface p-5" aria-labelledby="track-outcomes">
              <h2 id="track-outcomes" className="text-card-title">{t("tracks.outcomes", "You will be able to")}</h2>
              <ul className="mt-3 space-y-2 text-sm leading-6">
                {track.outcomes.map((line) => <li key={line} className="flex gap-2"><Check className="mt-1 h-3.5 w-3.5 shrink-0 text-primary" />{line}</li>)}
              </ul>
            </section>
          )}
          {track.kind === "career" && track.competencies.length > 0 && (
            <section className="surface p-5" aria-labelledby="track-competencies">
              <h2 id="track-competencies" className="text-card-title">{t("tracks.competencies", "Competencies for this role")}</h2>
              <ul className="mt-3 flex flex-wrap gap-1.5">
                {track.competencies.map((item) => <li key={item}><StatusPill icon={Circle}>{item}</StatusPill></li>)}
              </ul>
              <p className="mt-3 text-meta">{t("tracks.noPlacement", "Career tracks build job-ready skills. DATA+ Academy does not promise employment or job placement.")}</p>
            </section>
          )}
        </aside>
      </div>
    </DiscoveryLayout>
  );
}
