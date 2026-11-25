import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { format } from "date-fns";
import { ArrowRight } from "lucide-react";
import { PlusLevel } from "@/components/brand/PlusMotif";
import { isCourseLevel } from "@/components/brand/courseLevel";
import { CourseThumb } from "@/features/learning/CourseThumb";
import { useDateLocale } from "@/features/learning/hooks";
import { formatAmount, type LandingCourse } from "@/features/site/landing-data";
import { languageCode } from "./catalogueFilters";

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

/**
 * Course card on the generated cover: level (plus), duration, live cohort and next start,
 * language, instructor and price. Used on the home page and in the catalogue; `actions`
 * replaces the "View course" link with the same buttons for free and paid courses.
 */
export function CourseListingCard({ course, start, actions }: { course: LandingCourse; start: string | undefined; actions?: ReactNode }) {
  const { t } = useTranslation();
  const locale = useDateLocale();
  const level = course.level?.toLowerCase();
  const levelLabel = level ? t(`landing.level.${level}`, course.level as string) : null;
  const code = languageCode(course.language);
  const language = code === "fr" ? "Français" : code === "en" ? "English" : null;
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
          {!actions && (
            <Link to={`/course/${course.id}`} className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline">
              {t("landing.viewCourse", "View course")} <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          )}
        </div>
        {actions && <div className="mt-4 grid grid-cols-2 gap-2">{actions}</div>}
      </div>
    </li>
  );
}

