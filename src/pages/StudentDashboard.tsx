import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { addDays, format, isToday, isTomorrow, startOfDay, type Locale } from "date-fns";
import { ArrowRight, BookOpen, CalendarDays, CheckCircle2, Megaphone, PlayCircle, UsersRound } from "lucide-react";
import { AppShell } from "@/components/shell/AppShell";
import { EmptyState, ErrorState, PageHeader, ProgressBar, SectionHeader, SkeletonBlock, StatusPill } from "@/components/shell/page";
import { Button } from "@/components/ui/button";
import { JoinCohortDialog } from "@/components/JoinCohortDialog";
import { StudentInstalments } from "@/components/StudentInstalments";
import { useAppAuth } from "@/contexts/AuthContext";
import { CourseThumb } from "@/features/learning/CourseThumb";
import { useCalendarEvents, useCourseAnnouncements, useDateLocale, useEnrolledCourses } from "@/features/learning/hooks";
import type { EnrolledCourse } from "@/features/learning/api";
import { eventTimeLabel, kindMeta, ModalityIcon } from "@/features/calendar/EventBits";
import type { CalendarEvent } from "@/features/calendar/events";

function resumeHref(course: EnrolledCourse) {
  return course.resumeLesson ? `/learn/${course.courseId}/${course.resumeLesson.id}` : `/learn/${course.courseId}`;
}

/** The one thing to do next. Opens the exact lesson the learner stopped at. */
function ContinueLearning({ course }: { course: EnrolledCourse }) {
  const { t } = useTranslation();
  const started = course.completedLessons > 0 || Boolean(course.lastActivityAt);
  return (
    <section aria-labelledby="continue-heading" className="relative overflow-hidden rounded-2xl bg-forest text-forest-foreground">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.07]"
        style={{ backgroundImage: "radial-gradient(currentColor 1px, transparent 1px)", backgroundSize: "18px 18px" }}
      />
      <div className="relative grid gap-6 p-6 sm:p-8 md:grid-cols-[1fr_auto] md:items-center">
        <div className="min-w-0">
          <p id="continue-heading" className="text-sm font-medium text-[hsl(140_45%_75%)]">
            {started ? t("home.continue.label", "Continue learning") : t("home.continue.startLabel", "Start learning")}
          </p>
          <h2 className="mt-2 font-display text-2xl font-semibold leading-tight tracking-tight text-white sm:text-[1.75rem]">
            {course.title}
          </h2>
          {course.resumeLesson && (
            <p className="mt-2 flex items-center gap-2 text-[0.9375rem] text-white/80">
              <PlayCircle className="h-4 w-4 shrink-0" />
              <span className="truncate">
                {course.resumeLesson.chapterTitle}: {course.resumeLesson.title}
              </span>
            </p>
          )}
          <div className="mt-6 max-w-md">
            <div className="mb-2 flex items-baseline justify-between text-sm">
              <span className="text-white/75">
                {t("home.continue.lessons", "{{done}} of {{total}} lessons", { done: course.completedLessons, total: course.totalLessons })}
              </span>
              <span className="tabular font-display text-base font-semibold text-white">{course.progress}%</span>
            </div>
            <ProgressBar value={course.progress} tone="onForest" label={t("home.continue.progressLabel", "Course progress")} />
          </div>
          <Button asChild size="lg" className="mt-6 bg-white text-forest hover:bg-white/90">
            <Link to={resumeHref(course)}>
              {started ? t("home.continue.cta", "Continue learning") : t("home.continue.startCta", "Start course")}
              <ArrowRight />
            </Link>
          </Button>
        </div>
        <CourseThumb src={course.thumbnailUrl} title={course.title} className="hidden aspect-[4/3] w-64 rounded-xl ring-1 ring-white/10 md:block lg:w-72" />
      </div>
    </section>
  );
}

function CourseRow({ course }: { course: EnrolledCourse }) {
  const { t } = useTranslation();
  return (
    <li>
      <Link to={resumeHref(course)} className="surface-interactive flex items-center gap-4 p-3 pr-4">
        <CourseThumb src={course.thumbnailUrl} title={course.title} className="h-16 w-24 shrink-0" />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-card-title">{course.title}</span>
          <span className="mt-0.5 block truncate text-meta">
            {course.completed
              ? t("home.courses.completed", "Completed")
              : course.resumeLesson
                ? t("home.courses.next", "Next: {{lesson}}", { lesson: course.resumeLesson.title })
                : course.teacherName}
          </span>
          <span className="mt-2 flex items-center gap-3">
            <ProgressBar value={course.progress} size="sm" label={course.title} />
            <span className="tabular w-9 shrink-0 text-right text-xs font-semibold text-forest">{course.progress}%</span>
          </span>
        </span>
        {course.completed
          ? <CheckCircle2 className="h-5 w-5 shrink-0 text-primary" aria-hidden />
          : <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />}
      </Link>
    </li>
  );
}

function dayLabel(date: Date, locale: Locale, t: (key: string, fallback: string) => string) {
  if (isToday(date)) return t("home.week.today", "Today");
  if (isTomorrow(date)) return t("home.week.tomorrow", "Tomorrow");
  return format(date, "EEEE d MMM", { locale });
}

function UpcomingItem({ event }: { event: CalendarEvent }) {
  const { t } = useTranslation();
  const locale = useDateLocale();
  const meta = kindMeta[event.kind];
  const isSession = event.kind === "session";
  return (
    <li className="flex gap-3 py-3 first:pt-0 last:pb-0">
      <span className="flex w-11 shrink-0 flex-col items-center self-start rounded-lg bg-muted py-1.5 leading-none">
        <span className="text-[0.6875rem] font-medium text-muted-foreground">{format(event.start, "MMM", { locale })}</span>
        <span className="tabular mt-1 font-display text-lg font-semibold text-forest">{format(event.start, "d")}</span>
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold text-forest">{event.title}</span>
        <span className="mt-0.5 block truncate text-meta">
          {dayLabel(event.start, locale, t as never)}, {eventTimeLabel(event, locale)}
        </span>
        <span className="mt-1.5 flex flex-wrap items-center gap-1.5">
          <StatusPill tone={isSession ? "green" : "amber"} icon={meta.icon}>{t(meta.labelKey, meta.label)}</StatusPill>
          {isSession && event.modality && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <ModalityIcon event={event} className="h-3 w-3" />
              {event.modality === "in_person"
                ? event.location || t("calendar2.inPerson", "In person")
                : t("calendar2.online", "Online")}
            </span>
          )}
        </span>
        {isSession && event.link && !event.cancelled && (
          <a href={event.link} target="_blank" rel="noreferrer" className="mt-2 inline-flex text-sm font-semibold text-primary hover:underline">
            {t("calendar2.join", "Join session")}
          </a>
        )}
        {!isSession && event.href && (
          <Link to={event.href} className="mt-2 inline-flex text-sm font-semibold text-primary hover:underline">
            {t("calendar2.open", "Open")}
          </Link>
        )}
      </span>
    </li>
  );
}

const StudentDashboard = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { profile } = useAppAuth();
  const locale = useDateLocale();
  const [showJoinCohort, setShowJoinCohort] = useState(false);

  const range = useMemo(() => ({ from: startOfDay(new Date()), to: addDays(startOfDay(new Date()), 14) }), []);
  const courses = useEnrolledCourses();
  const events = useCalendarEvents(range.from, range.to, "student");
  const announcements = useCourseAnnouncements(3);

  const list = courses.data || [];
  const active = list.filter((course) => !course.completed);
  const focus = [...active].sort((a, b) => (b.lastActivityAt || "").localeCompare(a.lastActivityAt || ""))[0];
  const upcoming = (events.data || []).filter((event) => !event.cancelled && event.kind !== "cohort_end" && event.start >= new Date(Date.now() - 60 * 60_000)).slice(0, 4);

  const hour = new Date().getHours();
  const greeting = hour < 12
    ? t("home.greeting.morning", "Good morning")
    : hour < 18 ? t("home.greeting.afternoon", "Good afternoon") : t("home.greeting.evening", "Good evening");
  const firstName = profile?.full_name?.trim().split(/\s+/)[0];

  return (
    <AppShell role="student">
      <PageHeader
        title={firstName ? `${greeting}, ${firstName}` : greeting}
        description={format(new Date(), "EEEE d MMMM", { locale })}
        actions={
          <Button variant="outline" onClick={() => setShowJoinCohort(true)}>
            <UsersRound />
            {t("home.joinCohort", "Join a cohort")}
          </Button>
        }
      />

      {courses.isLoading ? (
        <SkeletonBlock className="h-64 rounded-2xl" />
      ) : courses.isError ? (
        <ErrorState
          title={t("home.error.title", "Your courses could not be loaded")}
          description={t("home.error.body", "Check your connection and try again.")}
          onRetry={() => void courses.refetch()}
          retryLabel={t("common.tryAgain", "Try again")}
        />
      ) : focus ? (
        <ContinueLearning course={focus} />
      ) : list.length > 0 ? (
        <EmptyState
          icon={CheckCircle2}
          title={t("home.allDone.title", "You have completed all your courses")}
          description={t("home.allDone.body", "Your certificates are ready, and there is more to learn when you want it.")}
          action={<Button asChild><Link to="/courses">{t("home.explore", "Explore courses")}</Link></Button>}
        />
      ) : (
        <EmptyState
          icon={BookOpen}
          title={t("home.empty.title", "Choose your first course")}
          description={t("home.empty.body", "Once you enrol, your next lesson will always be waiting here.")}
          action={<Button onClick={() => navigate("/courses")}>{t("home.explore", "Explore courses")}</Button>}
        />
      )}

      <div className="mt-6 empty:hidden"><StudentInstalments /></div>

      <div className="mt-8 grid grid-cols-[minmax(0,1fr)] gap-8 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <section>
          <SectionHeader
            title={t("home.courses.title", "My courses")}
            action={list.length > 0 && (
              <Link to="/student/my-courses" className="text-sm font-semibold text-primary hover:underline">
                {t("home.courses.viewAll", "View all")}
              </Link>
            )}
          />
          {courses.isLoading ? (
            <div className="space-y-3">{[0, 1, 2].map((i) => <SkeletonBlock key={i} className="h-[5.5rem]" />)}</div>
          ) : list.length === 0 ? (
            <p className="surface px-5 py-6 text-sm text-muted-foreground">
              {t("home.courses.empty", "Courses you enrol in appear here with your progress.")}
            </p>
          ) : (
            <ul className="space-y-3">
              {list.slice(0, 4).map((course) => <CourseRow key={course.enrollmentId} course={course} />)}
            </ul>
          )}
        </section>

        <div className="space-y-8">
          <section>
            <SectionHeader
              title={t("home.week.title", "Coming up")}
              action={
                <Link to="/student/schedule" className="text-sm font-semibold text-primary hover:underline">
                  {t("home.week.calendar", "Calendar")}
                </Link>
              }
            />
            <div className="surface p-4">
              {events.isLoading ? (
                <div className="space-y-3"><SkeletonBlock className="h-14" /><SkeletonBlock className="h-14" /></div>
              ) : upcoming.length === 0 ? (
                <div className="flex items-start gap-3 py-2">
                  <CalendarDays className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
                  <p className="text-sm leading-6 text-muted-foreground">
                    {t("home.week.empty", "No sessions or deadlines in the next two weeks.")}
                  </p>
                </div>
              ) : (
                <ul className="divide-y">{upcoming.map((event) => <UpcomingItem key={event.id} event={event} />)}</ul>
              )}
            </div>
          </section>

          {(announcements.data?.length || 0) > 0 && (
            <section>
              <SectionHeader title={t("home.announcements.title", "Announcements")} />
              <ul className="surface divide-y">
                {announcements.data!.map((item) => (
                  <li key={item.id} className="flex gap-3 p-4">
                    <Megaphone className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-forest">{item.title}</p>
                      <p className="mt-0.5 line-clamp-2 text-sm leading-6 text-muted-foreground">{item.message}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {item.courseTitle ? `${item.courseTitle}, ` : ""}{format(new Date(item.createdAt), "d MMM", { locale })}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      </div>

      <JoinCohortDialog open={showJoinCohort} onOpenChange={setShowJoinCohort} />
    </AppShell>
  );
};

export default StudentDashboard;
