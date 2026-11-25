import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { usePageMeta } from "@/lib/pageMeta";
import { useTracks } from "@/features/tracks/api";
import { SiteHeader } from "@/features/site/SiteHeader";
import { SiteFooter } from "@/features/site/SiteFooter";
import { BrandIntro } from "@/features/site/BrandIntro";
import {
  fetchLandingBundle, fetchLandingCourses, fetchNextCohort, fetchUpcomingStarts, fetchVerifiedProjects,
} from "@/features/site/landing-data";
import { HomeHero } from "@/features/site/home/HomeHero";
import { FeaturedCourses, SubjectTiles } from "@/features/site/home/HomeCatalogue";
import { PlatformTour } from "@/features/site/home/PlatformTour";
import {
  CapstoneSection, FaqAndClosing, OrganisationsSection, PendingPeopleSections, PricingSection, ProofStrip,
} from "@/features/site/home/HomeSections";
import { priceRange, subjectSummary } from "@/features/site/home/catalogueSummary";

/**
 * Home page, in the order of the 2026-11-24 brief (section 10). Every claim comes from live data
 * or from copy that is true for every listed course (DECISION_LOG D-23); sections without real
 * content stay hidden in production and show a <ContentTodo> while developing.
 */
const Index = () => {
  const { t } = useTranslation();
  const { hash } = useLocation();
  const stale = 5 * 60_000;

  const courses = useQuery({ queryKey: ["landing-courses"], queryFn: fetchLandingCourses, staleTime: stale });
  const starts = useQuery({ queryKey: ["landing-starts"], queryFn: fetchUpcomingStarts, staleTime: stale });
  const cohort = useQuery({ queryKey: ["landing-cohort"], queryFn: fetchNextCohort, staleTime: stale });
  const bundle = useQuery({ queryKey: ["landing-bundle"], queryFn: fetchLandingBundle, staleTime: stale });
  const projects = useQuery({ queryKey: ["landing-projects"], queryFn: fetchVerifiedProjects, staleTime: stale });
  const tracks = useTracks();

  const all = courses.data || [];
  const hasTracks = (tracks.data?.tracks || []).length > 0;

  usePageMeta({
    path: "/",
    description: t("meta.home", "Courses in data analysis, monitoring and evaluation, research and AI from DATA+ Rwanda, with live cohorts online and in Kigali. Pay by Mobile Money."),
  });

  // Links to /#organisations land on the form once the page has laid out.
  useEffect(() => {
    if (!hash) return;
    const timer = window.setTimeout(() => document.getElementById(hash.slice(1))?.scrollIntoView({ block: "start" }), 50);
    return () => window.clearTimeout(timer);
  }, [hash]);

  return (
    <div className="min-h-screen bg-background">
      <BrandIntro />
      <SiteHeader />

      <main id="main">
        <HomeHero cohort={cohort.data} />
        <ProofStrip />
        <SubjectTiles subjects={subjectSummary(all)} loading={courses.isLoading} />
        <FeaturedCourses courses={all.slice(0, 3)} starts={starts.data || {}} loading={courses.isLoading} />
        <PlatformTour />
        <CapstoneSection projects={projects.data || []} />
        <PendingPeopleSections />
        <PricingSection
          range={priceRange(all)}
          anyFree={all.some((course) => course.isFree)}
          anyEarlyBird={all.some((course) => course.earlyBird !== null)}
          anyScholarship={all.some((course) => course.scholarshipOpen)}
          bundle={bundle.data}
          hasTracks={hasTracks}
        />
        <OrganisationsSection />
        <FaqAndClosing anyScholarship={all.some((course) => course.scholarshipOpen)} />
      </main>

      <SiteFooter />
    </div>
  );
};

export default Index;
