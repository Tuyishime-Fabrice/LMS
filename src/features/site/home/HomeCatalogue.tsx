import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { format } from "date-fns";
import { ArrowRight } from "lucide-react";
import { PlusLevel, PlusMotif } from "@/components/brand/PlusMotif";
import { isCourseLevel } from "@/components/brand/courseLevel";
import type { CoverFamily } from "@/features/courses/coverFamily";
import { CourseThumb } from "@/features/learning/CourseThumb";
import { useDateLocale } from "@/features/learning/hooks";
import { cn } from "@/lib/utils";
import { formatAmount, type LandingCourse } from "../landing-data";
import type { SubjectSummary } from "./catalogueSummary";
import { Section, SectionTitle } from "./Section";
import { CourseListingCard } from "@/features/courses/CourseListingCard";
import { useFamilyLabels } from "@/features/courses/useFamilyLabels";
import { useReveal } from "./useReveal";

const TILE: Record<CoverFamily, { bg: string; dark: boolean }> = {
  data: { bg: "bg-cover-data", dark: true },
  me: { bg: "bg-cover-me", dark: false },
  ai: { bg: "bg-cover-ai", dark: true },
  research: { bg: "bg-cover-research", dark: true },
  geo: { bg: "bg-cover-geo", dark: false },
};

/** Find your course: one tile per subject that has listed courses, with live counts and starting prices. */
export function SubjectTiles({ subjects, loading }: { subjects: SubjectSummary[]; loading: boolean }) {
  const { t, i18n } = useTranslation();
  const labels = useFamilyLabels();
  const ref = useReveal<HTMLUListElement>();
  return (
    <Section labelledBy="subjects-title" tone="white">
      <SectionTitle
        id="subjects-title"
        marker
        title={t("landing.subjects.title", "Find your course")}
        body={t("landing.subjects.body", "Pick a subject to see its courses, levels and prices.")}
      />
      {loading ? (
        <div aria-hidden className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{[0, 1, 2].map((key) => <div key={key} className="h-44 animate-pulse rounded-lg bg-muted" />)}</div>
      ) : !subjects.length ? (
        <Link to="/courses" className="group flex min-h-44 items-end justify-between gap-4 rounded-lg border bg-background p-6 text-forest hover:border-primary">
          <span className="font-display text-xl font-semibold">{t("landing.subjects.catalogue", "See the course catalogue")}</span>
          <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-0.5" aria-hidden />
        </Link>
      ) : (
      <ul ref={ref} className={cn("reveal grid gap-3 sm:grid-cols-2", subjects.length >= 4 ? "lg:grid-cols-5" : "lg:grid-cols-3")}>
        {subjects.map((subject) => {
          const tile = TILE[subject.family];
          return (
            <li key={subject.family}>
              <Link
                to={`/courses?subject=${subject.family}`}
                className={cn("group relative flex h-full min-h-44 flex-col justify-between overflow-hidden rounded-lg p-5 transition-transform duration-200 hover:-translate-y-0.5", tile.bg, tile.dark ? "text-cream" : "text-brand-900")}
              >
                <PlusMotif variant="stepped" size={64} tone={tile.dark ? "dark" : "light"} className="absolute -right-3 -top-2 opacity-80" />
                <h3 className="relative max-w-[80%] font-display text-xl font-semibold leading-tight">{labels[subject.family]}</h3>
                <div className="relative mt-8 text-sm">
                  <p className="font-medium">{t("landing.subjects.count", { count: subject.count, defaultValue_one: "{{count}} course", defaultValue_other: "{{count}} courses" })}</p>
                  <p className={cn("tabular mt-0.5", tile.dark ? "text-cream/80" : "text-brand-900/75")}>
                    {subject.from !== null
                      ? t("landing.subjects.from", "From {{price}}", { price: formatAmount(subject.from, subject.currency, i18n.language) })
                      : t("landing.free", "Free")}
                  </p>
                  <span className="mt-4 inline-flex items-center gap-1 font-semibold">
                    {t("landing.subjects.see", "See courses")}
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
                  </span>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
      )}
    </Section>
  );
}

/** Three courses on the cover system, with level, duration, format, language, next start and price. */
export function FeaturedCourses({ courses, starts, loading }: { courses: LandingCourse[]; starts: Record<string, string>; loading: boolean }) {
  const { t } = useTranslation();
  const ref = useReveal<HTMLDivElement>(!loading);
  return (
    <Section labelledBy="courses-title" tone="cream">
      <SectionTitle
        id="courses-title"
        title={t("landing.courses.title", "Featured courses")}
        body={t("landing.courses.body2", "Each course page lists its lessons, how you are assessed and how the certificate is earned.")}
        action={<Link to="/courses" className="inline-flex shrink-0 items-center gap-1 text-sm font-semibold text-primary hover:underline">{t("landing.courses.all", "See all courses")} <ArrowRight className="h-4 w-4" aria-hidden /></Link>}
      />
      {loading ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{[0, 1, 2].map((key) => <div key={key} className="h-96 animate-pulse rounded-lg bg-muted" />)}</div>
      ) : courses.length ? (
        <div ref={ref} className="reveal">
          <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{courses.map((course) => <CourseListingCard key={course.id} course={course} start={starts[course.id]} />)}</ul>
        </div>
      ) : (
        <p className="rounded-lg border bg-card px-6 py-10 text-center text-muted-foreground">{t("landing.courses.none", "New courses are being prepared. Check back soon.")}</p>
      )}
    </Section>
  );
}
