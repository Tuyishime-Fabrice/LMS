import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { format } from "date-fns";
import { CalendarClock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PlusMotif } from "@/components/brand/PlusMotif";
import { useDateLocale } from "@/features/learning/hooks";
import { useIntroEnded } from "../introState";
import { Photo } from "./Photo";
import { useReveal } from "./useReveal";

/**
 * Hero: what DATA+ Academy is and for whom, the format in one sentence, two actions.
 * The classroom photo opens through the plus-shaped mask and the trail motif draws in behind it,
 * both after the intro (if any) has left. The next cohort date shows only when one exists.
 */
export function HomeHero({ cohort }: { cohort: { name: string; startDate: string } | null | undefined }) {
  const { t } = useTranslation();
  const locale = useDateLocale();
  const introEnded = useIntroEnded();
  const photoRef = useReveal<HTMLDivElement>(introEnded);

  return (
    <section className="relative overflow-hidden bg-background" aria-labelledby="hero-title">
      <div className="relative mx-auto grid max-w-site items-center gap-12 px-4 pb-16 pt-10 sm:px-6 sm:pb-24 sm:pt-14 lg:grid-cols-[1fr_1.05fr] lg:gap-16 lg:px-8 lg:pb-28 lg:pt-16">
        <div className="relative z-10">
          <h1 id="hero-title" className="text-poster text-[2.5rem] text-forest sm:text-5xl lg:text-[3.5rem]">
            {t("landing.hero.heading", "Data, M&E and AI training from the people who do this work across Rwanda and the region.")}
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-8 text-olive-ink/85">
            {t("landing.hero.body2", "Live cohorts online and in Kigali. The platform is in English and French, and each course shows the language it is taught in.")}
          </p>
          <div className="mt-9 flex flex-wrap gap-3">
            <Button asChild size="lg" className="h-12 px-6 text-base">
              <Link to="/courses">{t("landing.hero.cta", "Explore courses")}</Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="h-12 border-forest/25 px-6 text-base text-forest">
              <a href="#organisations">{t("landing.hero.team", "Train your team")}</a>
            </Button>
          </div>
          {/* A fixed slot, so the next cohort date can arrive with the data without moving anything. */}
          <div className="mt-6 min-h-9">
            {cohort && (
              <p className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-sm font-medium text-forest">
                <CalendarClock className="h-4 w-4 text-primary" aria-hidden />
                {t("landing.hero.nextCohort", "{{name}} starts {{date}}", { name: cohort.name, date: format(new Date(cohort.startDate), "d MMMM", { locale }) })}
              </p>
            )}
          </div>
        </div>

        <div className="relative mx-auto w-full max-w-xl pb-14 lg:max-w-none lg:pb-16">
          {introEnded && (
            <PlusMotif
              variant="trail"
              size="min(88vw, 620px)"
              animate="once"
              className="pointer-events-none absolute -right-[18%] top-1/2 -translate-y-1/2 opacity-[0.22] sm:-right-[12%]"
            />
          )}
          <div ref={photoRef}>
          <div className="plus-mask relative overflow-hidden rounded-lg">
            <Photo
              name="classroom"
              width={1600}
              height={1200}
              priority
              sizes="(min-width: 1024px) 600px, (min-width: 640px) 576px, 92vw"
              alt={t("landing.hero.photoAlt", "A trainer presents at the front of a classroom while learners follow on their laptops")}
              className="block aspect-[4/3]"
            />
          </div>
          </div>
          <figure className="absolute -bottom-2 left-3 w-[62%] overflow-hidden rounded-lg border bg-card shadow-[var(--shadow-float)] sm:-left-8 lg:-left-12 lg:w-[58%]">
            <Photo
              name="platform-player"
              width={1600}
              height={1000}
              sizes="(min-width: 1024px) 360px, 60vw"
              widths={[480, 960]}
              alt={t("landing.hero.screenAlt", "The DATA+ Academy lesson player: the module list on the left and a reading lesson on cleaning data")}
              className="block aspect-[16/10]"
            />
            <figcaption className="sr-only">{t("landing.platform.sample", "Shown with sample data.")}</figcaption>
          </figure>
        </div>
      </div>
    </section>
  );
}
