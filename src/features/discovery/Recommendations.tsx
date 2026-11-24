import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { ArrowRight, Sparkles } from "lucide-react";
import { SectionHeader } from "@/components/shell/page";
import { useAppAuth } from "@/contexts/AuthContext";
import { CourseThumb } from "@/features/learning/CourseThumb";
import { fetchLandingCourses } from "@/features/site/landing-data";
import { usePreferences } from "@/features/preferences/api";
import { INTERESTS, normaliseInterests, recommendCourses } from "./interests";

/**
 * "Suggested for you": courses that match interests the learner declared.
 * Never random. Each card says which interest it matches; with no declared
 * interests the learner is invited to add some instead.
 */
export function Recommendations({ enrolledCourseIds, className }: { enrolledCourseIds: string[]; className?: string }) {
  const { t } = useTranslation();
  const { profile } = useAppAuth();
  const preferences = usePreferences();
  const courses = useQuery({ queryKey: ["landing-courses"], queryFn: fetchLandingCourses, staleTime: 5 * 60_000 });

  if (preferences.isLoading || courses.isLoading) return null;
  const interests = normaliseInterests([...(preferences.data?.row?.interests || []), ...((profile as { interests?: string[] | null } | null)?.interests || [])]);
  const label = (id: string) => t(`interests.${id}`, INTERESTS.find((item) => item.id === id)?.label || id);

  if (!interests.length) {
    return (
      <section className={className}>
        <div className="surface flex flex-col gap-3 p-5 sm:flex-row sm:items-center">
          <Sparkles className="h-5 w-5 shrink-0 text-primary" aria-hidden />
          <p className="flex-1 text-sm leading-6 text-muted-foreground">
            {t("recommend.noInterests", "Tell us what you want to learn and we will suggest courses that match.")}
          </p>
          <Link to="/student/settings#learning" className="text-sm font-semibold text-primary hover:underline">{t("recommend.addInterests", "Add interests")}</Link>
        </div>
      </section>
    );
  }

  const picks = recommendCourses(interests, courses.data || [], enrolledCourseIds, 3);
  if (!picks.length) return null;

  return (
    <section className={className} aria-labelledby="recommend-heading">
      <SectionHeader
        title={<span id="recommend-heading">{t("recommend.title", "Suggested for you")}</span>}
        action={<Link to="/courses" className="text-sm font-semibold text-primary hover:underline">{t("recommend.all", "All courses")}</Link>}
      />
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {picks.map(({ course, interest }) => (
          <li key={course.id}>
            <Link to={`/course/${course.id}`} className="surface-interactive group flex h-full gap-3 p-3">
              <CourseThumb compact title={course.title} className="h-16 w-20 shrink-0" />
              <span className="min-w-0 flex-1">
                <span className="line-clamp-2 text-sm font-semibold text-forest group-hover:text-primary">{course.title}</span>
                <span className="mt-1 block text-xs text-muted-foreground">{t("recommend.because", "Matches your interest in {{interest}}", { interest: label(interest).toLowerCase() })}</span>
              </span>
              <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
