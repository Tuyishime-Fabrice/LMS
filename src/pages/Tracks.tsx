import { Link, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowRight, BriefcaseBusiness, Clock, Layers, Route } from "lucide-react";
import { EmptyState, ErrorState, PageHeader, ProgressBar, SkeletonBlock } from "@/components/shell/page";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DiscoveryLayout } from "@/features/site/DiscoveryLayout";
import { progressFor, useMyEnrolments, useTracks, type Track } from "@/features/tracks/api";
import { TrackKindPill } from "@/features/tracks/TrackBits";
import { useLevelLabel } from "@/features/tracks/labels";

function TrackCard({ track }: { track: Track }) {
  const { t } = useTranslation();
  const enrolments = useMyEnrolments();
  const level = useLevelLabel()(track.level);
  const progress = progressFor(track, enrolments.data);
  const meta = [
    t("tracks.courses", "{{count}} courses", { count: track.items.length }),
    track.estimated_hours ? t("tracks.hours", "about {{count}} hours", { count: track.estimated_hours }) : null,
    level,
  ].filter(Boolean).join(" · ");

  return (
    <li>
      <Link to={`/tracks/${track.slug}`} className="surface-interactive group flex h-full flex-col p-5">
        <div className="flex items-center justify-between gap-2">
          <TrackKindPill kind={track.kind} />
          {progress.completed && <span className="text-xs font-semibold text-success">{t("tracks.completed", "Completed")}</span>}
        </div>
        <h2 className="mt-3 text-[1.0625rem] font-semibold leading-snug text-forest group-hover:text-primary">{track.title}</h2>
        {track.kind === "career" && track.target_role && (
          <p className="mt-1 text-sm font-medium text-muted-foreground">{t("tracks.towards", "Towards: {{role}}", { role: track.target_role })}</p>
        )}
        {track.summary && <p className="mt-2 line-clamp-3 text-sm leading-6 text-muted-foreground">{track.summary}</p>}
        <div className="min-h-4 flex-1" />
        {progress.started ? (
          <div className="mt-4">
            <div className="mb-1.5 flex justify-between text-xs text-muted-foreground">
              <span>{t("tracks.progress", "{{done}} of {{total}} required courses", { done: progress.requiredCompleted, total: progress.requiredTotal })}</span>
              <span className="tabular font-semibold text-forest">{progress.percent}%</span>
            </div>
            <ProgressBar value={progress.percent} size="sm" label={track.title} />
          </div>
        ) : (
          <p className="mt-4 flex items-center gap-1.5 text-meta"><Layers className="h-3.5 w-3.5" />{meta}</p>
        )}
        <span className="mt-4 inline-flex items-center gap-1 border-t pt-3 text-sm font-semibold text-primary">
          {progress.started ? t("tracks.continue", "Continue track") : t("tracks.view", "View track")}
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
        </span>
      </Link>
    </li>
  );
}

export default function Tracks() {
  const { t } = useTranslation();
  const [params, setParams] = useSearchParams();
  const kind = params.get("kind") === "career" ? "career" : "skill";
  const tracks = useTracks();
  const list = (tracks.data?.tracks || []).filter((track) => track.kind === kind);

  return (
    <DiscoveryLayout>
      <PageHeader
        title={t("tracks.title", "Skill and career tracks")}
        description={t("tracks.description", "Tracks are ordered sequences of DATA+ courses and projects. A skill track builds one capability; a career track prepares you for a role.")}
      />

      <Tabs value={kind} onValueChange={(value) => setParams(value === "skill" ? {} : { kind: value }, { replace: true })} className="mb-6">
        <TabsList>
          <TabsTrigger value="skill" className="gap-1.5"><Route className="h-4 w-4" />{t("tracks.tab.skill", "Skill tracks")}</TabsTrigger>
          <TabsTrigger value="career" className="gap-1.5"><BriefcaseBusiness className="h-4 w-4" />{t("tracks.tab.career", "Career tracks")}</TabsTrigger>
        </TabsList>
      </Tabs>

      <p className="mb-5 flex items-start gap-2 text-sm leading-6 text-muted-foreground">
        <Clock className="mt-1 h-4 w-4 shrink-0" />
        {kind === "skill"
          ? t("tracks.skillExplain", "Short and focused: a few courses that together build one skill, such as SQL for analysis. Usually a few weeks.")
          : t("tracks.careerExplain", "Longer pathways toward a role, with the competencies it needs, recommended courses and applied projects. They prepare you for a role; they are not a job offer or placement.")}
      </p>

      {tracks.isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{[0, 1, 2].map((key) => <SkeletonBlock key={key} className="h-64" />)}</div>
      ) : tracks.isError ? (
        <ErrorState title={t("tracks.error", "Tracks could not be loaded")} onRetry={() => void tracks.refetch()} retryLabel={t("common.tryAgain", "Try again")} />
      ) : list.length === 0 ? (
        <EmptyState
          icon={kind === "career" ? BriefcaseBusiness : Route}
          title={kind === "career" ? t("tracks.emptyCareer", "No career tracks published yet") : t("tracks.emptySkill", "No skill tracks published yet")}
          description={t("tracks.emptyBody", "The Academy is putting tracks together from existing courses. Individual courses are available now.")}
          action={<Link to="/courses" className="text-sm font-semibold text-primary hover:underline">{t("tracks.browseCourses", "Browse courses")}</Link>}
        />
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{list.map((track) => <TrackCard key={track.id} track={track} />)}</ul>
      )}
    </DiscoveryLayout>
  );
}
