import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowRight, Check, ExternalLink } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { ContentTodo } from "@/components/ContentTodo";
import { PlusMotif } from "@/components/brand/PlusMotif";
import { siteFacts, hasConfirmedFigures } from "@/content/site-facts";
import { cn } from "@/lib/utils";
import { PartnerForm } from "../PartnerForm";
import { formatAmount, type LandingBundle, type VerifiedProject } from "../landing-data";
import { Photo } from "./Photo";
import { Section, SectionTitle } from "./Section";
import { useReveal } from "./useReveal";

/* 3. Proof strip: only agreed figures and organisations; hidden until DATA+ confirms them in site-facts. */
export function ProofStrip() {
  const { t, i18n } = useTranslation();
  const { figures, organisations } = siteFacts;
  if (!hasConfirmedFigures() && !organisations.length) {
    return <div className="mx-auto max-w-site px-4 sm:px-6 lg:px-8"><ContentTodo label="proof strip: agreed figures and the organisations DATA+ has trained or worked with (site-facts)" /></div>;
  }
  const number = (value: number) => new Intl.NumberFormat(i18n.language.startsWith("fr") ? "fr-FR" : "en-US").format(value);
  const stats = [
    figures.peopleTrained !== null ? { value: number(figures.peopleTrained), label: t("landing.proof.trained", "people trained") } : null,
    figures.countries !== null ? { value: number(figures.countries), label: t("landing.proof.countries", "countries") } : null,
    figures.trainedLastYear ? { value: number(figures.trainedLastYear.count), label: t("landing.proof.lastYear", "trained in {{year}}", { year: figures.trainedLastYear.year }) } : null,
  ].filter((item): item is { value: string; label: string } => Boolean(item));
  return (
    <section aria-label={t("landing.proof.label", "DATA+ in figures")} className="border-y bg-card">
      <div className="mx-auto flex max-w-site flex-col gap-8 px-4 py-10 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
        {stats.length > 0 && (
          <dl className="flex flex-wrap gap-x-12 gap-y-4">
            {stats.map((stat) => (
              <div key={stat.label}>
                <dt className="sr-only">{stat.label}</dt>
                <dd><span className="tabular block font-display text-3xl font-bold text-forest">{stat.value}</span><span className="text-sm text-muted-foreground">{stat.label}</span></dd>
              </div>
            ))}
          </dl>
        )}
        {organisations.length > 0 && (
          <div>
            <p className="text-sm font-medium text-forest">{t("landing.proof.organisations", "Organisations we have trained or worked with")}</p>
            <ul className="mt-3 flex flex-wrap items-center gap-x-8 gap-y-3">
              {organisations.map((org) => (
                <li key={org.name}>
                  {org.logo
                    ? <img src={org.logo} alt={org.name} className="h-8 w-auto opacity-70 grayscale" loading="lazy" />
                    : <span className="text-sm font-semibold text-muted-foreground">{org.name}</span>}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </section>
  );
}

/* 7. The capstone: the five-step framework, the 65% pass mark, and up to two verified projects. */
export function CapstoneSection({ projects }: { projects: VerifiedProject[] }) {
  const { t } = useTranslation();
  const maskRef = useReveal<HTMLDivElement>();
  const listRef = useReveal<HTMLOListElement>();
  const steps = [
    { title: t("landing.capstone.step1", "Problem definition"), body: t("landing.capstone.step1Body", "Name the decision someone has to make and the question the data must answer.") },
    { title: t("landing.capstone.step2", "Data and evidence"), body: t("landing.capstone.step2Body", "Find and clean the data that bears on that question.") },
    { title: t("landing.capstone.step3", "Tools and methods"), body: t("landing.capstone.step3Body", "Choose the tools and methods the course taught that fit the problem.") },
    { title: t("landing.capstone.step4", "Analysis"), body: t("landing.capstone.step4Body", "Work through the data and show what it says.") },
    { title: t("landing.capstone.step5", "Recommendations"), body: t("landing.capstone.step5Body", "Turn the findings into actions the decision maker can take.") },
  ];
  const lit = (index: number) => Math.min(3, Math.ceil(((index + 1) * 3) / steps.length)) as 1 | 2 | 3;

  return (
    <Section labelledBy="capstone-title" tone="cream">
      <div className="grid gap-12 lg:grid-cols-[1.05fr_1fr] lg:gap-16">
        <div>
          <SectionTitle
            id="capstone-title"
            marker
            title={t("landing.capstone.title", "The capstone")}
            body={t("landing.capstone.body", "Courses with a capstone end with a real problem worked through the five-step framework and marked by your instructor. A mark of 65% or more earns the certificate.")}
            className="mb-8"
          />
          <ol ref={listRef} className="reveal space-y-5">
            {steps.map((step, index) => (
              <li key={step.title} className="flex gap-4">
                <PlusMotif variant="stepped" size={28} layersLit={lit(index)} className="mt-0.5" />
                <div>
                  <h3 className="text-base font-semibold text-forest">
                    <span className="tabular mr-2 text-muted-foreground">{index + 1}.</span>{step.title}
                  </h3>
                  <p className="mt-1 text-[0.9375rem] leading-6 text-muted-foreground">{step.body}</p>
                </div>
              </li>
            ))}
            <li className="flex items-center gap-4 rounded-lg bg-mint px-4 py-3">
              <PlusMotif variant="centred" size={28} />
              <p className="text-[0.9375rem] font-semibold text-forest">{t("landing.capstone.pass", "65% on the capstone: certificate earned")}</p>
            </li>
          </ol>
        </div>

        <div className="space-y-6">
          {/* Two classroom photos: side by side on wide screens, a swipeable row with a peek on phones. */}
          <div className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 sm:pb-0 lg:grid-cols-1">
            <div ref={maskRef} className="w-[82%] shrink-0 snap-start sm:w-auto">
            <div className="plus-mask overflow-hidden rounded-lg">
              <Photo
                name="learners-together"
                width={1600}
                height={1200}
                sizes="(min-width: 1024px) 560px, (min-width: 640px) 45vw, 80vw"
                alt={t("landing.capstone.photo1", "Four learners gather around one laptop to work through a problem together")}
                className="block aspect-[4/3]"
              />
            </div>
            </div>
            <PhotoReveal
              name="group-discussion"
              alt={t("landing.capstone.photo2", "Learners discuss their work at shared desks with their laptops open")}
              className="w-[82%] shrink-0 snap-start sm:w-auto lg:hidden"
            />
          </div>

          {projects.length > 0 ? (
            <div>
              <h3 className="text-sm font-semibold text-forest">{t("landing.capstone.projects", "Verified projects")}</h3>
              <ul className="mt-3 divide-y rounded-lg border bg-card">
                {projects.map((project) => (
                  <li key={project.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                    <div>
                      <p className="font-semibold text-forest">{project.title}</p>
                      <p className="text-sm text-muted-foreground">{project.learner} · {project.course}</p>
                    </div>
                    <Link to="/exhibition" className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline">
                      {t("landing.capstone.seeWork", "See the work")} <ArrowRight className="h-4 w-4" aria-hidden />
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <ContentTodo label="up to two capstone projects with verified outcomes (Admin › Exhibition › Outcomes verified)" />
          )}
        </div>
      </div>
    </Section>
  );
}

function PhotoReveal({ name, alt, className }: { name: string; alt: string; className?: string }) {
  const ref = useReveal<HTMLDivElement>();
  return (
    <div ref={ref} className={cn("reveal overflow-hidden rounded-lg", className)}>
      <Photo name={name} width={1600} height={1200} sizes="(min-width: 640px) 45vw, 80vw" alt={alt} className="block aspect-[4/3]" imgClassName="reveal-img" />
    </div>
  );
}

/* 8 and 9. Who teaches and learner stories: hidden until real bios and consented stories exist. */
export function PendingPeopleSections() {
  return (
    <div className="mx-auto max-w-site space-y-3 px-4 sm:px-6 lg:px-8">
      <ContentTodo label="who teaches: 3 or 4 instructor bios with photo, current role, sectors and organisations (no bio field yet)" />
      <ContentTodo label="learner stories: 2 or 3 consented stories with name, photo, course, cohort and outcome" />
    </div>
  );
}

/* 10. Pricing and payment, from live data. */
export function PricingSection({ range, anyFree, anyEarlyBird, anyScholarship, bundle, hasTracks }: {
  range: { min: number; max: number; currency: string } | null;
  anyFree: boolean; anyEarlyBird: boolean; anyScholarship: boolean;
  bundle: LandingBundle | null | undefined; hasTracks: boolean;
}) {
  const { t, i18n } = useTranslation();
  const ref = useReveal<HTMLDivElement>();
  const amount = (value: number, currency: string) => formatAmount(value, currency, i18n.language);
  const lines = [
    t("landing.pricing.momo", "MTN Mobile Money or Airtel Money"),
    t("landing.pricing.instalments", "Two instalments on cohort courses"),
    anyEarlyBird ? t("landing.pricing.earlyBird", "Early-bird prices before a cohort starts") : null,
    anyFree ? t("landing.pricing.freeCourses", "Some introductory courses are free") : null,
    anyScholarship ? t("landing.pricing.scholarship2", "Scholarships on courses that offer them, shown on the course page") : null,
  ].filter((line): line is string => Boolean(line));

  return (
    <Section labelledBy="pricing-title" tone="white">
      <SectionTitle
        id="pricing-title"
        title={t("landing.pricing.title", "Pay for what you learn")}
        body={t("landing.pricing.body2", "No subscription. Pay per course, by Mobile Money.")}
      />
      <div ref={ref} className={cn("reveal grid gap-5", (bundle || hasTracks) && "lg:grid-cols-[1.2fr_1fr]")}>
        <div className="rounded-lg border bg-background p-6 sm:p-8">
          <h3 className="text-xl font-semibold text-forest">{t("landing.pricing.single", "Single course")}</h3>
          <p className="mt-1 text-sm text-muted-foreground">{t("landing.pricing.singleBody2", "One course with its lessons, assessments and certificate.")}</p>
          <p className="tabular mt-6 font-display text-3xl font-bold text-forest sm:text-4xl">
            {range
              ? range.min === range.max
                ? amount(range.min, range.currency)
                : t("landing.pricing.range", "{{min}} to {{max}}", { min: amount(range.min, range.currency), max: amount(range.max, range.currency) })
              : t("landing.pricing.perCourse", "Per course")}
          </p>
          {range && <p className="mt-1 text-sm text-muted-foreground">{t("landing.pricing.perCourseNote", "per course, depending on the course")}</p>}
          <ul className="mt-6 space-y-3 text-[0.9375rem]">
            {lines.map((line) => <li key={line} className="flex gap-2.5"><Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />{line}</li>)}
          </ul>
          <Button asChild className="mt-8 h-11"><Link to="/courses">{t("landing.pricing.browse", "Browse courses")}</Link></Button>
        </div>

        {(bundle || hasTracks) && (
          <div className="flex flex-col gap-5">
            {bundle && (
              <div className="flex flex-1 flex-col rounded-lg border bg-mint p-6 sm:p-8">
                <h3 className="text-xl font-semibold text-forest">{bundle.title}</h3>
                {bundle.description && <p className="mt-1 text-sm text-muted-foreground">{bundle.description}</p>}
                <p className="tabular mt-5 flex flex-wrap items-baseline gap-x-3 text-sm text-muted-foreground">
                  <span className="font-display text-3xl font-bold text-forest">{amount(bundle.price, bundle.currency)}</span>
                  {bundle.original > bundle.price && <span>{t("landing.pricing.instead", "instead of {{price}}", { price: amount(bundle.original, bundle.currency) })}</span>}
                </p>
                <p className="mt-3 text-sm text-forest">{t("landing.pricing.courses", "{{count}} courses in one payment", { count: bundle.courses })}</p>
                <Button asChild variant="outline" className="mt-6 h-11 self-start"><Link to="/bundles">{t("landing.pricing.viewBundles", "View course bundles")}</Link></Button>
              </div>
            )}
            {hasTracks && (
              <Link to="/tracks" className="hover-lift group rounded-lg border bg-background p-6">
                <h3 className="text-lg font-semibold text-forest">{t("landing.pricing.paths", "Learning paths")}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{t("landing.pricing.pathsBody", "Skill and career tracks put several courses in order toward one skill or role.")}</p>
                <span className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-primary">{t("landing.pricing.pathsCta", "See tracks")} <ArrowRight className="h-4 w-4" aria-hidden /></span>
              </Link>
            )}
          </div>
        )}
      </div>
    </Section>
  );
}

/* 11. For organisations, with the enquiry form inline. */
export function OrganisationsSection() {
  const { t } = useTranslation();
  const ref = useReveal<HTMLDivElement>();
  return (
    <Section id="organisations" labelledBy="teams-title" tone="cream">
      <div className="grid gap-12 lg:grid-cols-[1fr_1.1fr] lg:gap-16">
        <div>
          <SectionTitle
            id="teams-title"
            title={t("landing.teams.title2", "Training for your organisation")}
            body={t("landing.teams.body", "Organisations can sponsor places, enrol a group into a dedicated cohort and agree a tailored course sequence. The learning content stays the same; schedule, support and pricing are arranged with you.")}
            className="mb-6"
          />
          <p className="text-[0.9375rem] leading-7 text-olive-ink/85">
            {t("landing.teams.programmes", "For NGOs, government teams and companies, DATA+ also runs tailored training and helps with M&E systems, research and dashboards.")}
          </p>
          <div ref={ref} className="reveal mt-8 overflow-hidden rounded-lg">
            <Photo
              name="cohort-group"
              width={1600}
              height={1067}
              sizes="(min-width: 1024px) 560px, 92vw"
              alt={t("landing.teams.photo", "A group of trainees and trainers standing together outside, beside a DATA+ banner")}
              className="block aspect-[3/2]"
              imgClassName="reveal-img"
            />
          </div>
          <a href={siteFacts.brand.parentUrl} target="_blank" rel="noopener noreferrer" className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline">
            {t("landing.teams.parent", "More about DATA+ Rwanda")} <ExternalLink className="h-4 w-4" aria-hidden />
          </a>
        </div>
        <PartnerForm />
      </div>
    </Section>
  );
}

/* 12. FAQ from facts already published, then the closing call to action. */
export function FaqAndClosing({ anyScholarship }: { anyScholarship: boolean }) {
  const { t } = useTranslation();
  const faq = [
    { id: "schedule", q: t("landing.faq.scheduleQ", "When do classes take place?"), a: t("landing.faq.scheduleA", "Cohort courses run evening classes online and hands-on Saturday workshops in Kigali. Where a course has an upcoming cohort, its start date is shown on the course card.") },
    { id: "language", q: t("landing.faq.languageQ", "Which language are courses taught in?"), a: t("landing.faq.languageA", "The platform works in English and French. Each course page states the language the course is taught in.") },
    { id: "payment", q: t("landing.faq.paymentQ", "How do I pay?"), a: t("landing.faq.paymentA", "By MTN Mobile Money or Airtel Money. Cohort courses can be paid in two instalments.") },
    { id: "certificate", q: t("landing.faq.certificateQ", "How do I earn a certificate, and can an employer check it?"), a: t("landing.faq.certificateA", "Meet the course's pass requirements, which include 65% on the capstone where there is one. Each certificate carries a code that anyone can check on the verification page.") },
    anyScholarship ? { id: "scholarship", q: t("landing.faq.scholarshipQ", "Are there scholarships?"), a: t("landing.faq.scholarshipA", "Some courses offer scholarships. The course page shows whether you can apply.") } : null,
    { id: "refunds", q: t("landing.faq.refundsQ", "Can I get a refund?"), a: t("landing.faq.refundsA", "Refund requests must be made within 7 days of purchase and are considered case by case, as set out in the terms of service.") },
    { id: "teams", q: t("landing.faq.teamsQ", "Can my organisation pay for its staff?"), a: t("landing.faq.teamsA", "Yes. Organisations can sponsor places or enrol a group into a dedicated cohort. Use the form above to tell us what you need.") },
  ].filter((item): item is { id: string; q: string; a: string } => Boolean(item));
  const links: Record<string, { to: string; label: string }> = {
    certificate: { to: "/verify", label: t("landing.faq.verifyLink", "Check a certificate") },
    refunds: { to: "/terms-of-service", label: t("landing.faq.termsLink", "Read the terms of service") },
  };

  return (
    <>
      <Section labelledBy="faq-title" tone="white">
        <div className="grid gap-10 lg:grid-cols-[1fr_1.6fr] lg:gap-16">
          <SectionTitle id="faq-title" title={t("landing.faq.title", "Questions")} body={t("landing.faq.body", "Answers from our terms and course pages.")} className="mb-0 self-start sm:items-start" />
          <div>
            <Accordion type="single" collapsible className="border-t">
              {faq.map((item) => (
                <AccordionItem key={item.id} value={item.id}>
                  <AccordionTrigger className="text-left text-base font-semibold text-forest hover:no-underline">{item.q}</AccordionTrigger>
                  <AccordionContent className="text-[0.9375rem] leading-7 text-olive-ink/85">
                    {item.a}
                    {links[item.id] && <> <Link to={links[item.id].to} className="font-semibold text-primary hover:underline">{links[item.id].label}</Link></>}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
            <ContentTodo className="mt-4" label="FAQ: internet and laptop requirements (needs a confirmed answer)" />
          </div>
        </div>
      </Section>

      <section className="relative overflow-hidden bg-forest text-cream" aria-labelledby="cta-title">
        <PlusMotif variant="centred" tone="dark" size="min(120vw, 760px)" className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 opacity-10" />
        <div className="relative mx-auto max-w-site px-4 py-24 text-center sm:px-6 sm:py-28 lg:px-8">
          <h2 id="cta-title" className="text-poster mx-auto max-w-3xl text-4xl sm:text-5xl lg:text-6xl">{t("landing.cta.title2", "Find the course that fits your work.")}</h2>
          <div className="mt-10 flex flex-wrap justify-center gap-3">
            <Button asChild size="lg" className="h-12 px-6 text-base"><Link to="/courses">{t("landing.hero.cta", "Explore courses")}</Link></Button>
            <Button asChild size="lg" variant="outline" className="h-12 border-cream/40 bg-transparent px-6 text-base text-cream hover:bg-cream/10 hover:text-cream">
              <Link to="/signup">{t("landing.cta.signup", "Create a free account")}</Link>
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}
