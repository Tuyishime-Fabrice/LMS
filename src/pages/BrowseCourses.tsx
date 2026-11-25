import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Search, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { usePageMeta } from "@/lib/pageMeta";
import { beginPaymentSignUp } from "@/lib/coursePaymentReturn";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PurchaseDialog } from "@/components/PurchaseDialog";
import { PlusMotif } from "@/components/brand/PlusMotif";
import { PageBand } from "@/features/site/PageBand";
import { SiteHeader } from "@/features/site/SiteHeader";
import { SiteFooter } from "@/features/site/SiteFooter";
import { fetchLandingCourses, fetchUpcomingStarts, type LandingCourse } from "@/features/site/landing-data";
import { CourseListingCard } from "@/features/courses/CourseListingCard";
import { useFamilyLabels } from "@/features/courses/useFamilyLabels";
import { COVER_FAMILIES } from "@/features/courses/coverFamily";
import { LANGUAGES, LEVELS, activeFilterCount, applyFilters, parseFilters, type Filters } from "@/features/courses/catalogueFilters";

/**
 * Public catalogue: search and five filters kept in the URL, generated covers, and the same two
 * buttons on every card (view, then enrol free or buy), whatever the price.
 */
const BrowseCourses = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const families = useFamilyLabels();
  usePageMeta({ title: t("meta.courses.title", "Courses"), description: t("meta.courses.description", "Browse DATA+ Academy courses in data analysis, monitoring and evaluation, research and AI. See the level, format, language and price of each course."), path: "/courses" });

  const [searchParams, setSearchParams] = useSearchParams();
  const filters = parseFilters(searchParams);
  const [query, setQuery] = useState(filters.q);
  const courses = useQuery({ queryKey: ["landing-courses"], queryFn: fetchLandingCourses, staleTime: 5 * 60_000 });
  const starts = useQuery({ queryKey: ["landing-starts"], queryFn: fetchUpcomingStarts, staleTime: 5 * 60_000 });
  const live = useMemo(() => new Set(Object.keys(starts.data || {})), [starts.data]);
  const filterKey = searchParams.toString();
  // eslint-disable-next-line react-hooks/exhaustive-deps -- filters are derived from filterKey
  const shown = useMemo(() => applyFilters(courses.data || [], filters, live), [courses.data, filterKey, live]);

  const [userId, setUserId] = useState<string | null>(null);
  const [enrolled, setEnrolled] = useState<Set<string>>(new Set());
  const [enrolling, setEnrolling] = useState<string | null>(null);
  const [purchase, setPurchase] = useState<LandingCourse | null>(null);

  useEffect(() => {
    void (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);
      const { data } = await supabase.from("course_enrollments").select("course_id").eq("student_id", user.id);
      setEnrolled(new Set((data || []).map((row) => row.course_id)));
    })();
  }, []);

  const setFilter = (key: keyof Filters, value: string | null) => {
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      if (value) next.set(key, value); else next.delete(key);
      return next;
    }, { replace: key === "q" });
  };

  // Search updates the URL after a short pause, so typing does not flood the history.
  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (query.trim() !== filters.q) setFilter("q", query.trim() || null);
    }, 250);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only react to typing
  }, [query]);

  const clearAll = () => { setQuery(""); setSearchParams(new URLSearchParams()); };

  const enrolFree = async (course: LandingCourse) => {
    if (!userId) { navigate(beginPaymentSignUp(`/course/${course.id}`)); return; }
    setEnrolling(course.id);
    const { error } = await supabase.from("course_enrollments").insert({ course_id: course.id, student_id: userId });
    setEnrolling(null);
    if (error) { toast.error(error.message || t("browseCourses.failedToEnroll", "Could not enrol. Please try again.")); return; }
    setEnrolled((prev) => new Set(prev).add(course.id));
    toast.success(t("browseCourses.enrolledSuccess", "You are enrolled."));
    navigate(`/course/${course.id}`);
  };
  const buy = (course: LandingCourse) => {
    if (!userId) { navigate(beginPaymentSignUp(`/course/${course.id}`)); return; }
    setPurchase(course);
  };

  const select = (id: string, label: string, key: keyof Filters, options: { value: string; label: string }[]) => (
    <div className="space-y-1.5">
      <label htmlFor={id} className="text-sm font-medium text-forest">{label}</label>
      <select
        id={id}
        value={(filters[key] as string | null) || ""}
        onChange={(event) => setFilter(key, event.target.value || null)}
        className="h-11 w-full rounded-lg border border-input bg-card px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <option value="">{t("catalogue.any", "Any")}</option>
        {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
    </div>
  );
  const count = activeFilterCount(filters);

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <PageBand title={t("catalogue.title2", "Courses")} body={t("catalogue.body2", "Data analysis, monitoring and evaluation, research and AI. Each course states its level, language and price.")} />

      <main id="main" className="mx-auto max-w-site px-4 py-10 sm:px-6 lg:px-8">
        <form role="search" onSubmit={(event) => event.preventDefault()} className="rounded-lg border bg-card p-4 sm:p-5">
          <div className="relative">
            <label htmlFor="catalogue-search" className="sr-only">{t("catalogue.search", "Search courses")}</label>
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <Input id="catalogue-search" type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t("catalogue.searchPlaceholder", "Search by course, topic or instructor")} className="h-11 pl-9" />
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-5">
            {select("filter-subject", t("catalogue.subject", "Subject"), "subject", COVER_FAMILIES.map((family) => ({ value: family, label: families[family] })))}
            {select("filter-level", t("catalogue.level", "Level"), "level", LEVELS.map((level) => ({ value: level, label: t(`landing.level.${level}`, level) })))}
            {select("filter-format", t("catalogue.format", "Format"), "format", [{ value: "live", label: t("catalogue.formatLive", "Live cohort scheduled") }])}
            {select("filter-lang", t("catalogue.language", "Teaching language"), "lang", LANGUAGES.map((lang) => ({ value: lang, label: lang === "fr" ? "Français" : "English" })))}
            {select("filter-price", t("catalogue.price", "Price"), "price", [{ value: "free", label: t("catalogue.free", "Free") }, { value: "paid", label: t("catalogue.paid", "Paid") }])}
          </div>
        </form>

        <h2 className="sr-only">{t("catalogue.results", "Results")}</h2>
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3" aria-live="polite">
          <p className="text-sm text-muted-foreground">
            {courses.isLoading ? t("common.loading", "Loading...") : t("catalogue.count", { count: shown.length, defaultValue_one: "{{count}} course", defaultValue_other: "{{count}} courses" })}
          </p>
          {count > 0 && (
            <Button variant="ghost" size="sm" onClick={clearAll} className="text-forest"><X className="mr-1 h-4 w-4" aria-hidden />{t("catalogue.clear", "Clear filters")}</Button>
          )}
        </div>

        {courses.isLoading ? (
          <div className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{[0, 1, 2].map((key) => <div key={key} className="h-[26rem] animate-pulse rounded-lg bg-muted" />)}</div>
        ) : shown.length ? (
          <ul className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {shown.map((course) => {
              const isEnrolled = enrolled.has(course.id);
              return (
                <CourseListingCard
                  key={course.id}
                  course={course}
                  start={starts.data?.[course.id]}
                  actions={
                    <>
                      <Button variant="outline" className="h-10 text-forest" onClick={() => navigate(`/course/${course.id}`)}>{t("catalogue.view", "View course")}</Button>
                      {isEnrolled ? (
                        <Button className="h-10" onClick={() => navigate(`/course/${course.id}`)}>{t("catalogue.open", "Open")}</Button>
                      ) : course.isFree ? (
                        <Button className="h-10" disabled={enrolling === course.id} onClick={() => void enrolFree(course)}>{t("catalogue.enrolFree", "Enrol free")}</Button>
                      ) : (
                        <Button className="h-10" onClick={() => buy(course)}>{t("catalogue.buy", "Buy")}</Button>
                      )}
                    </>
                  }
                />
              );
            })}
          </ul>
        ) : (
          <div className="mt-6 flex flex-col items-center rounded-lg border bg-card px-6 py-14 text-center">
            <PlusMotif variant="trail" size={140} />
            <h2 className="mt-6 text-xl font-semibold text-forest">
              {count > 0 ? t("catalogue.noMatch", "No course matches these filters") : t("catalogue.none", "No courses are published yet")}
            </h2>
            {count > 0 && <Button variant="outline" className="mt-5" onClick={clearAll}>{t("catalogue.clear", "Clear filters")}</Button>}
          </div>
        )}
      </main>
      <SiteFooter />

      {purchase && (
        <PurchaseDialog
          open={Boolean(purchase)}
          onOpenChange={(open) => { if (!open) setPurchase(null); }}
          type="course"
          item={{ id: purchase.id, title: purchase.title, price: purchase.price, currency: purchase.currency }}
        />
      )}
    </div>
  );
};

export default BrowseCourses;
