import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { format } from "date-fns";
import { ArrowRight, BookOpen, CalendarRange, CheckCircle2, UserRound, UsersRound } from "lucide-react";
import { AppShell } from "@/components/shell/AppShell";
import { EmptyState, ErrorState, PageHeader, ProgressBar, SkeletonBlock, StatusPill } from "@/components/shell/page";
import { Button } from "@/components/ui/button";
import { CourseThumb } from "@/features/learning/CourseThumb";
import { useDateLocale, useEnrolledCourses } from "@/features/learning/hooks";
import type { EnrolledCourse } from "@/features/learning/api";
import { StudentInstalments } from "@/components/StudentInstalments";
import { cn } from "@/lib/utils";

type Filter = "learning" | "upcoming" | "completed";

function bucketOf(course: EnrolledCourse): Filter {
  if (course.completed) return "completed";
  if (course.startsAt && new Date(course.startsAt) > new Date() && course.completedLessons === 0) return "upcoming";
  return "learning";
}

function CourseCard({ course }: { course: EnrolledCourse }) {
  const { t } = useTranslation();
  const locale = useDateLocale();
  const bucket = bucketOf(course);
  const href = course.resumeLesson ? `/learn/${course.courseId}/${course.resumeLesson.id}` : `/learn/${course.courseId}`;
  const format_ = course.mode?.trim();
  return (
    <li className="surface-interactive flex flex-col overflow-hidden">
      <Link to={href} className="block" tabIndex={-1} aria-hidden>
        <CourseThumb src={course.thumbnailUrl} title={course.title} className="aspect-[16/9] rounded-none" />
      </Link>
      <div className="flex flex-1 flex-col p-5">
        <div className="mb-2 flex flex-wrap gap-1.5">
          {format_ && <StatusPill>{format_}</StatusPill>}
          {course.cohortName && <StatusPill tone="green" icon={UsersRound}>{course.cohortName}</StatusPill>}
          {bucket === "completed" && <StatusPill tone="green" icon={CheckCircle2}>{t("myCourses.completed", "Completed")}</StatusPill>}
        </div>
        <h2 className="text-card-title leading-snug">
          <Link to={href} className="hover:text-primary">{course.title}</Link>
        </h2>
        <dl className="mt-2 space-y-1 text-meta">
          {course.teacherName && (
            <div className="flex items-center gap-1.5">
              <UserRound className="h-3.5 w-3.5 shrink-0" />
              <dt className="sr-only">{t("myCourses.instructor", "Instructor")}</dt>
              <dd className="truncate">{course.teacherName}</dd>
            </div>
          )}
          {(course.startsAt || course.endsAt) && (
            <div className="flex items-center gap-1.5">
              <CalendarRange className="h-3.5 w-3.5 shrink-0" />
              <dt className="sr-only">{t("myCourses.schedule", "Schedule")}</dt>
              <dd>
                {course.startsAt ? format(new Date(course.startsAt), "d MMM yyyy", { locale }) : ""}
                {course.endsAt ? ` – ${format(new Date(course.endsAt), "d MMM yyyy", { locale })}` : ""}
              </dd>
            </div>
          )}
        </dl>

        <div className="mt-auto pt-5">
          <div className="mb-1.5 flex items-baseline justify-between text-xs">
            <span className="text-muted-foreground">
              {t("home.continue.lessons", "{{done}} of {{total}} lessons", { done: course.completedLessons, total: course.totalLessons })}
            </span>
            <span className="tabular font-semibold text-forest">{course.progress}%</span>
          </div>
          <ProgressBar value={course.progress} size="sm" label={course.title} />
          {bucket !== "completed" && course.resumeLesson && (
            <p className="mt-3 truncate text-meta">
              {t("home.courses.next", "Next: {{lesson}}", { lesson: course.resumeLesson.title })}
            </p>
          )}
          <Button asChild variant={bucket === "completed" ? "outline" : "default"} className="mt-4 w-full">
            <Link to={href}>
              {bucket === "completed"
                ? t("myCourses.review", "Review course")
                : course.completedLessons > 0 || course.lastActivityAt
                  ? t("home.continue.cta", "Continue learning")
                  : t("home.continue.startCta", "Start course")}
              <ArrowRight />
            </Link>
          </Button>
        </div>
      </div>
    </li>
  );
}

const MyCourses = () => {
  const { t } = useTranslation();
  const courses = useEnrolledCourses();
  const [filter, setFilter] = useState<Filter>("learning");

  const buckets = useMemo(() => {
    const grouped: Record<Filter, EnrolledCourse[]> = { learning: [], upcoming: [], completed: [] };
    (courses.data || []).forEach((course) => grouped[bucketOf(course)].push(course));
    return grouped;
  }, [courses.data]);

  const tabs: Array<{ id: Filter; label: string }> = [
    { id: "learning", label: t("myCourses.tabs.learning", "Currently learning") },
    { id: "upcoming", label: t("myCourses.tabs.upcoming", "Upcoming") },
    { id: "completed", label: t("myCourses.tabs.completed", "Completed") },
  ];
  const shown = buckets[filter];
  const total = courses.data?.length || 0;

  return (
    <AppShell role="student">
      <PageHeader
        title={t("myCourses.title", "My courses")}
        description={t("myCourses.description", "Everything you are enrolled in, with your progress and what comes next.")}
        actions={<Button asChild variant="outline"><Link to="/courses">{t("home.explore", "Explore courses")}</Link></Button>}
      />

      <StudentInstalments />

      <div role="tablist" aria-label={t("myCourses.title", "My courses")} className="mb-6 flex gap-1 overflow-x-auto border-b scrollbar-hide">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            role="tab"
            type="button"
            aria-selected={filter === tab.id}
            onClick={() => setFilter(tab.id)}
            className={cn(
              "-mb-px flex shrink-0 items-center gap-2 border-b-2 px-3 py-2.5 text-sm font-medium transition-colors",
              filter === tab.id ? "border-primary text-forest" : "border-transparent text-muted-foreground hover:text-forest",
            )}
          >
            {tab.label}
            <span className={cn("tabular rounded-full px-1.5 text-xs", filter === tab.id ? "bg-leaf text-leaf-foreground" : "bg-muted")}>
              {buckets[tab.id].length}
            </span>
          </button>
        ))}
      </div>

      {courses.isLoading ? (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {[0, 1, 2].map((i) => <SkeletonBlock key={i} className="h-80 rounded-xl" />)}
        </div>
      ) : courses.isError ? (
        <ErrorState
          title={t("home.error.title", "Your courses could not be loaded")}
          description={t("home.error.body", "Check your connection and try again.")}
          onRetry={() => void courses.refetch()}
          retryLabel={t("common.tryAgain", "Try again")}
        />
      ) : shown.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title={
            total === 0
              ? t("home.empty.title", "Choose your first course")
              : filter === "completed"
                ? t("myCourses.empty.completed", "No completed courses yet")
                : filter === "upcoming"
                  ? t("myCourses.empty.upcoming", "No upcoming courses")
                  : t("myCourses.empty.learning", "Nothing in progress")
          }
          description={
            total === 0
              ? t("home.empty.body", "Once you enrol, your next lesson will always be waiting here.")
              : filter === "completed"
                ? t("myCourses.empty.completedBody", "Courses move here when you finish them.")
                : t("myCourses.empty.otherBody", "Courses you enrol in will appear here.")
          }
          action={total === 0 ? <Button asChild><Link to="/courses">{t("home.explore", "Explore courses")}</Link></Button> : undefined}
        />
      ) : (
        <ul className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {shown.map((course) => <CourseCard key={course.enrollmentId} course={course} />)}
        </ul>
      )}
    </AppShell>
  );
};

export default MyCourses;
