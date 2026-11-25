import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { format } from "date-fns";
import { Award, ClipboardCheck, Gauge, UsersRound } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAppAuth } from "@/contexts/AuthContext";
import { useDateLocale } from "@/features/learning/hooks";
import { JourneyCard } from "./JourneyCard";
import { useJourneys } from "./hooks";

type Counts = { quizzes: number; assignments: number };

async function fetchGlance(courseId: string) {
  const today = new Date().toISOString().slice(0, 10);
  const [cohorts, rule] = await Promise.all([
    supabase.from("cohorts").select("id, name, start_date").eq("course_id", courseId).eq("is_active", true)
      .or(`start_date.is.null,start_date.gte.${today}`).order("start_date", { ascending: true }).limit(3),
    supabase.from("course_certificate_rules").select("min_capstone_grade, auto_issue").eq("course_id", courseId).maybeSingle(),
  ]);
  return {
    cohorts: cohorts.data || [],
    // The database default when a course has no rule row (issue_certificate_if_eligible).
    minGrade: rule.data?.min_capstone_grade ?? 65,
    autoIssue: rule.data ? rule.data.auto_issue !== false : true,
  };
}

/**
 * What a learner needs to decide: how the course can be taken, how it is
 * assessed, how the certificate is earned, and, if they have started,
 * where their own enrolment stands.
 */
export function CourseAtAGlance({ courseId, counts, hasCapstone }: { courseId: string; counts: Counts; hasCapstone: boolean }) {
  const { t } = useTranslation();
  const locale = useDateLocale();
  const { profile } = useAppAuth();
  const glance = useQuery({ queryKey: ["course-glance", courseId], queryFn: () => fetchGlance(courseId), staleTime: 5 * 60_000 });
  const journeys = useJourneys();
  const mine = profile?.role === "student" ? journeys.data?.find((item) => item.course.id === courseId) : undefined;

  const assessments = [
    counts.quizzes ? t("glance.quizzes", "{{count}} quizzes", { count: counts.quizzes }) : null,
    counts.assignments ? t("glance.assignments", "{{count}} assignments", { count: counts.assignments }) : null,
    hasCapstone ? t("glance.capstone", "a capstone project") : null,
  ].filter(Boolean) as string[];

  const cohort = glance.data?.cohorts[0];
  const facts = [
    {
      icon: Gauge,
      label: t("glance.selfPaced", "Self-paced"),
      body: t("glance.selfPacedBody", "Start once you have access and study at your own speed."),
    },
    {
      icon: UsersRound,
      label: t("glance.cohort", "Instructor-led cohort"),
      body: cohort
        ? cohort.start_date
          ? t("glance.cohortNext", "{{name}} starts {{date}}. Apply with “Join a cohort”.", { name: cohort.name, date: format(new Date(cohort.start_date), "d MMM yyyy", { locale }) })
          : t("glance.cohortOpen", "{{name}} is open. Apply with “Join a cohort”.", { name: cohort.name })
        : t("glance.noCohort", "No cohort is scheduled at the moment."),
    },
    {
      icon: ClipboardCheck,
      label: t("glance.assessed", "How you are assessed"),
      body: assessments.length
        ? t("glance.assessedBody", "{{list}}, all inside DATA+ Academy. Marked work comes with written feedback.", { list: assessments.join(", ") })
        : t("glance.noAssessment", "This course has no graded work."),
    },
    {
      icon: Award,
      label: t("glance.certificate", "Certificate"),
      body: !glance.data
        ? "…"
        : hasCapstone && glance.data.autoIssue
          ? t("glance.certAuto", "Issued automatically when your capstone is marked {{grade}}% or higher. Anyone can verify it online.", { grade: glance.data.minGrade })
          : t("glance.certManual", "Issued by the Academy after your work has been reviewed. Anyone can verify it online."),
    },
  ];

  return (
    <section className="border-b bg-background" aria-labelledby="glance-heading">
      <div className="mx-auto max-w-site space-y-5 px-4 py-8 sm:px-6 lg:px-8">
        {mine && <JourneyCard item={mine} />}
        <div>
          <h2 id="glance-heading" className="text-eyebrow mb-3">{t("glance.title", "At a glance")}</h2>
          <dl className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {facts.map((fact) => (
              <div key={fact.label} className="surface p-4">
                <dt className="flex items-center gap-2 text-sm font-semibold text-forest"><fact.icon className="h-4 w-4 shrink-0 text-primary" aria-hidden />{fact.label}</dt>
                <dd className="mt-1 pl-6 text-sm leading-6 text-muted-foreground">{fact.body}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </section>
  );
}
