import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { format } from "date-fns";
import { BarChart3, CheckCircle2, CircleSlash, Clock } from "lucide-react";
import { AppShell } from "@/components/shell/AppShell";
import { EmptyState, ErrorState, PageHeader, ProgressBar, SectionHeader, SkeletonBlock, StatusPill } from "@/components/shell/page";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAppAuth } from "@/contexts/AuthContext";
import { useDateLocale, useEnrolledCourses } from "@/features/learning/hooks";
import { fetchQuizResults, fetchWorkItems, statusOf } from "@/features/assignments/api";

const average = (values: number[]) => (values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null);

function Tile({ label, value, hint }: { label: string; value: number | null; hint: string }) {
  return (
    <div className="surface p-5">
      <p className="text-meta">{label}</p>
      <p className="tabular mt-1 font-display text-3xl font-semibold text-forest">
        {value === null ? "–" : `${Math.round(value)}%`}
      </p>
      {value !== null && <ProgressBar value={value} size="sm" label={label} className="mt-3" />}
      <p className="mt-2 text-meta">{hint}</p>
    </div>
  );
}

const StudentScores = () => {
  const { t } = useTranslation();
  const { user } = useAppAuth();
  const locale = useDateLocale();
  const courses = useEnrolledCourses();
  const [chosen, setChosen] = useState<string>("");

  const work = useQuery({
    queryKey: ["work-items", user?.id],
    queryFn: () => fetchWorkItems(user!.id),
    enabled: Boolean(user?.id),
    staleTime: 30_000,
  });
  const quizzes = useQuery({
    queryKey: ["quiz-results", user?.id],
    queryFn: () => fetchQuizResults(user!.id),
    enabled: Boolean(user?.id),
    staleTime: 30_000,
  });

  const courseId = chosen || courses.data?.[0]?.courseId || "";
  const loading = courses.isLoading || work.isLoading || quizzes.isLoading;
  const failed = courses.isError || work.isError || quizzes.isError;

  const view = useMemo(() => {
    const quizRows = (quizzes.data || []).filter((row) => row.courseId === courseId);
    const workRows = (work.data || []).filter((row) => row.courseId === courseId && row.submission);
    const graded = workRows.filter((row) => statusOf(row) === "graded");
    const quizAverage = average(quizRows.map((row) => row.best));
    const workAverage = average(graded.map((row) => row.submission!.grade!));
    const overall = quizAverage !== null && workAverage !== null
      ? (quizAverage + workAverage) / 2
      : quizAverage ?? workAverage;
    return { quizRows, workRows, graded, quizAverage, workAverage, overall };
  }, [quizzes.data, work.data, courseId]);

  const day = (iso: string) => format(new Date(iso), "d MMM yyyy", { locale });

  return (
    <AppShell role="student">
      <PageHeader
        title={t("gradesPage.title", "Grades")}
        description={t("gradesPage.description", "Your quiz results and graded work, course by course.")}
        actions={(courses.data?.length || 0) > 1 && (
          <Select value={courseId} onValueChange={setChosen}>
            <SelectTrigger className="w-full sm:w-72" aria-label={t("gradesPage.course", "Course")}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {courses.data!.map((course) => (
                <SelectItem key={course.courseId} value={course.courseId}>{course.title}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      />

      {loading ? (
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">{[0, 1, 2].map((key) => <SkeletonBlock key={key} className="h-36" />)}</div>
          <SkeletonBlock className="h-56" />
        </div>
      ) : failed ? (
        <ErrorState
          title={t("gradesPage.loadError", "Your grades could not be loaded")}
          description={t("work.loadErrorBody", "Check your connection and try again.")}
          onRetry={() => { void courses.refetch(); void work.refetch(); void quizzes.refetch(); }}
          retryLabel={t("common.tryAgain", "Try again")}
        />
      ) : !courseId ? (
        <EmptyState
          icon={BarChart3}
          title={t("gradesPage.noCoursesTitle", "No grades yet")}
          description={t("gradesPage.noCoursesBody", "Enrol in a course and your quiz results and graded work will appear here.")}
          action={<Button asChild><Link to="/courses">{t("gradesPage.explore", "Explore courses")}</Link></Button>}
        />
      ) : (
        <div className="space-y-8">
          {(courses.data?.length || 0) === 1 && <p className="-mt-3 text-sm font-medium text-forest">{courses.data![0].title}</p>}

          <div className="grid gap-4 sm:grid-cols-3">
            <Tile
              label={t("gradesPage.overall", "Overall")}
              value={view.overall}
              hint={t("gradesPage.overallHint", "Quizzes and graded work, weighted equally")}
            />
            <Tile
              label={t("gradesPage.quizAverage", "Quiz average")}
              value={view.quizAverage}
              hint={t("gradesPage.quizCount", "{{count}} quizzes taken", { count: view.quizRows.length })}
            />
            <Tile
              label={t("gradesPage.workAverage", "Assignments and capstone")}
              value={view.workAverage}
              hint={t("gradesPage.workCount", "{{count}} graded", { count: view.graded.length })}
            />
          </div>

          <section>
            <SectionHeader title={t("gradesPage.quizzes", "Quizzes")} />
            {view.quizRows.length === 0 ? (
              <p className="surface px-5 py-6 text-sm text-muted-foreground">
                {t("gradesPage.noQuizzes", "You have not taken a quiz in this course yet.")}
              </p>
            ) : (
              <ul className="surface divide-y">
                {view.quizRows.map((row) => (
                  <li key={row.lessonId} className="flex items-center gap-4 px-5 py-3.5">
                    <div className="min-w-0 flex-1">
                      <Link to={`/learn/${row.courseId}/${row.lessonId}`} className="block truncate text-[0.9375rem] font-medium text-forest hover:text-primary">
                        {row.lessonTitle}
                      </Link>
                      <p className="text-meta">
                        {t("gradesPage.attempts", "{{count}} attempts", { count: row.attempts })} · {day(row.lastAttemptAt)}
                      </p>
                    </div>
                    {row.passed
                      ? <StatusPill tone="green" icon={CheckCircle2}>{t("gradesPage.passed", "Passed")}</StatusPill>
                      : <StatusPill tone="amber" icon={CircleSlash}>{t("gradesPage.notPassed", "Not passed yet")}</StatusPill>}
                    <span className="tabular w-14 text-right font-display text-lg font-semibold text-forest">{row.best}%</span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section>
            <SectionHeader
              title={t("gradesPage.work", "Assignments and capstone")}
              action={<Link to="/student/assignments" className="text-sm font-medium text-primary hover:underline">{t("gradesPage.allWork", "All assignments")}</Link>}
            />
            {view.workRows.length === 0 ? (
              <p className="surface px-5 py-6 text-sm text-muted-foreground">
                {t("gradesPage.noWork", "You have not submitted any work in this course yet.")}
              </p>
            ) : (
              <ul className="surface divide-y">
                {view.workRows.map((row) => (
                  <li key={`${row.kind}-${row.id}`} className="px-5 py-3.5">
                    <div className="flex items-center gap-4">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[0.9375rem] font-medium text-forest">{row.title}</p>
                        <p className="text-meta">
                          {row.kind === "capstone" ? t("work.kind.capstone", "Capstone") : t("work.kind.assignment", "Assignment")}
                          {row.submission?.submittedAt ? ` · ${t("work.submittedOn", "Submitted {{date}}", { date: day(row.submission.submittedAt) })}` : ""}
                        </p>
                      </div>
                      {row.submission!.grade === null ? (
                        <StatusPill tone="blue" icon={Clock}>{t("work.status.submitted", "Awaiting grade")}</StatusPill>
                      ) : (
                        <span className="tabular font-display text-lg font-semibold text-forest">
                          {row.submission!.grade}<span className="text-xs font-medium text-muted-foreground">/100</span>
                        </span>
                      )}
                    </div>
                    {row.submission?.feedback && (
                      <p className="mt-2 whitespace-pre-line rounded-lg bg-leaf/60 px-3.5 py-2.5 text-sm leading-6">{row.submission.feedback}</p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}
    </AppShell>
  );
};

export default StudentScores;
