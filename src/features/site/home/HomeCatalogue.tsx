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
  if (!loading && !subjects.length) return null;
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

function PriceLine({ course }: { course: LandingCourse }) {
  const { t, i18n } = useTranslation();
  if (course.isFree) return <span className="font-semibold text-success">{t("landing.free", "Free")}</span>;
  if (course.earlyBird) {
    return (
      <span className="tabular flex flex-wrap items-baseline gap-x-2">
        <span className="font-semibold text-forest">{formatAmount(course.earlyBird, course.currency, i18n.language)}</span>
        <span className="text-xs text-muted-foreground line-through">{formatAmount(course.price, course.currency, i18n.language)}</span>
      </span>
    );
  }
  return <span className="tabular font-semibold text-forest">{formatAmount(course.price, course.currency, i18n.language)}</span>;
}

function FeaturedCard({ course, start }: { course: LandingCourse; start: string | undefined }) {
  const { t } = useTranslation();
  const locale = useDateLocale();
  const level = course.level?.toLowerCase();
  const levelLabel = level ? t(`landing.level.${level}`, course.level as string) : null;
  const language = course.language === "fr" ? "Français" : course.language === "en" ? "English" : null;
  const facts = [course.duration, start ? t("landing.featured.live", "Live cohort") : null, language].filter(Boolean) as string[];
  const initials = (course.teacherName || "").split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase();

  return (
    <li className="hover-lift group flex flex-col overflow-hidden rounded-lg border bg-card">
      <Link to={`/course/${course.id}`} className="block overflow-hidden" tabIndex={-1} aria-hidden>
        <CourseThumb title={course.title} category={course.category} className="hover-img aspect-[16/10] rounded-none" />
      </Link>
      <div className="flex flex-1 flex-col p-5">
        <h3 className="text-lg font-semibold leading-snug text-forest">
          <Link to={`/course/${course.id}`} className="hover:text-primary">{course.title}</Link>
        </h3>
        {course.teacherName && (
          <p className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
            {course.teacherAvatar
              ? <img src={course.teacherAvatar} alt="" width={28} height={28} loading="lazy" className="h-7 w-7 rounded-full object-cover" />
              : <span aria-hidden className="flex h-7 w-7 items-center justify-center rounded-full bg-mint text-[0.6875rem] font-semibold text-forest">{initials}</span>}
            {t("landing.with", "with {{name}}", { name: course.teacherName })}
          </p>
        )}
        <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[0.8125rem] text-muted-foreground">
          {level && isCourseLevel(level) && levelLabel && (
            <span className="inline-flex items-center gap-1.5 font-medium text-forest"><PlusLevel level={level} label="" size={18} />{levelLabel}</span>
          )}
          {facts.map((fact) => <span key={fact}>{fact}</span>)}
          {course.earlyBird && <span className="rounded-full bg-warning-surface px-2.5 py-0.5 text-xs font-medium text-warning">{t("landing.earlyBird", "Early bird")}</span>}
        </div>
        {start && (
          <p className="mt-2 text-[0.8125rem] font-medium text-forest">
            {t("landing.featured.starts", "Next start {{date}}", { date: format(new Date(start), "d MMMM yyyy", { locale }) })}
          </p>
        )}
        <div className="min-h-5 flex-1" />
        <div className="flex items-center justify-between gap-3 border-t pt-4">
          <PriceLine course={course} />
          <Link to={`/course/${course.id}`} className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline">
            {t("landing.viewCourse", "View course")} <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </div>
      </div>
    </li>
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
          <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{courses.map((course) => <FeaturedCard key={course.id} course={course} start={starts[course.id]} />)}</ul>
        </div>
      ) : (
        <p className="rounded-lg border bg-card px-6 py-10 text-center text-muted-foreground">{t("landing.courses.none", "New courses are being prepared. Check back soon.")}</p>
      )}
    </Section>
  );
}
