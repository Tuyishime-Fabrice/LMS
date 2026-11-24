import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { format } from "date-fns";
import {
  ArrowRight, Award, BadgeCheck, BookOpenCheck, CalendarClock, Check, Languages, LineChart, MessageCircleQuestion,
  Presentation, Smartphone, Sparkles, UsersRound, Route, BriefcaseBusiness, Trophy, Gauge, ExternalLink,
} from "lucide-react";
import { corporateUrl } from "@/lib/siteConfig";
import { Button } from "@/components/ui/button";
import { CourseThumb } from "@/features/learning/CourseThumb";
import { useDateLocale } from "@/features/learning/hooks";
import { SiteHeader } from "@/features/site/SiteHeader";
import { SiteFooter } from "@/features/site/SiteFooter";
import { PartnerDialog } from "@/features/site/PartnerDialog";
import {
  fetchLandingBundle, fetchLandingCourses, fetchLandingInstructors, fetchNextCohort, formatAmount,
  type LandingCourse,
} from "@/features/site/landing-data";
import { cn } from "@/lib/utils";

const initials = (name: string) => name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase();

/** Section wrapper: one width and gutter for the whole page. */
function Section({ id, tone = "white", className, children, labelledBy }: {
  id?: string; tone?: "white" | "paper" | "navy"; className?: string; children: React.ReactNode; labelledBy?: string;
}) {
  return (
    <section
      id={id}
      aria-labelledby={labelledBy}
      className={cn(
        "relative overflow-hidden",
        tone === "white" && "bg-card",
        tone === "paper" && "bg-background",
        tone === "navy" && "bg-forest text-white",
        className,
      )}
    >
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">{children}</div>
    </section>
  );
}

function SectionTitle({ id, eyebrow, title, body, light, action }: {
  id: string; eyebrow?: string; title: string; body?: string; light?: boolean; action?: React.ReactNode;
}) {
  return (
    <div className="mb-10 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="max-w-2xl">
        {eyebrow && <p className={cn("mb-2 text-xs font-semibold uppercase tracking-[0.16em]", light ? "text-flame" : "text-primary")}>{eyebrow}</p>}
        <h2 id={id} className={cn("text-[1.75rem] font-bold leading-tight tracking-tight sm:text-[2.125rem]", light ? "text-white" : "text-forest")}>{title}</h2>
        {body && <p className={cn("mt-3 text-base leading-7", light ? "text-white/70" : "text-muted-foreground")}>{body}</p>}
      </div>
      {action}
    </div>
  );
}

function PriceLine({ course }: { course: LandingCourse }) {
  const { t, i18n } = useTranslation();
  if (course.isFree) return <span className="font-semibold text-success">{t("landing.free", "Free")}</span>;
  if (course.earlyBird) {
    return (
      <span className="flex items-baseline gap-2">
        <span className="font-semibold text-forest">{formatAmount(course.earlyBird, course.currency, i18n.language)}</span>
        <span className="text-xs text-muted-foreground line-through">{formatAmount(course.price, course.currency, i18n.language)}</span>
      </span>
    );
  }
  return <span className="font-semibold text-forest">{formatAmount(course.price, course.currency, i18n.language)}</span>;
}

function CourseCard({ course }: { course: LandingCourse }) {
  const { t } = useTranslation();
  const levels: Record<string, string> = {
    beginner: t("landing.level.beginner", "Beginner"),
    intermediate: t("landing.level.intermediate", "Intermediate"),
    advanced: t("landing.level.advanced", "Advanced"),
  };
  const level = course.level ? levels[course.level.toLowerCase()] || course.level : null;
  const facts = [level, course.duration, course.language === "fr" ? "Français" : course.language === "en" ? "English" : null]
    .filter(Boolean) as string[];
  return (
    <li className="group flex flex-col overflow-hidden rounded-xl border bg-card transition-[border-color,box-shadow] hover:border-forest/30 hover:shadow-[0_12px_30px_-18px_hsl(var(--forest)/0.45)]">
      <Link to={`/course/${course.id}`} className="block" tabIndex={-1} aria-hidden>
        <CourseThumb src={course.thumbnailUrl} title={course.title} className="aspect-[16/10] rounded-none" />
      </Link>
      <div className="flex flex-1 flex-col p-5">
        <div className="mb-2 flex flex-wrap items-center gap-2 text-xs">
          {course.category && <span className="rounded-full bg-leaf px-2.5 py-0.5 font-medium text-leaf-foreground">{course.category}</span>}
          {course.earlyBird && <span className="rounded-full bg-warning-surface px-2.5 py-0.5 font-medium text-warning">{t("landing.earlyBird", "Early bird")}</span>}
        </div>
        <h3 className="text-[1.0625rem] font-semibold leading-snug text-forest">
          <Link to={`/course/${course.id}`} className="hover:text-primary">{course.title}</Link>
        </h3>
        {course.teacherName && <p className="mt-1 text-sm text-muted-foreground">{t("landing.with", "with {{name}}", { name: course.teacherName })}</p>}
        {facts.length > 0 && <p className="mt-3 text-[0.8125rem] text-muted-foreground">{facts.join(" · ")}</p>}
        <div className="min-h-5 flex-1" />
        <div className="flex items-center justify-between gap-3 border-t pt-4">
          <PriceLine course={course} />
          <Link to={`/course/${course.id}`} className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline">
            {t("landing.viewCourse", "View course")} <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </li>
  );
}

const Index = () => {
  const { t, i18n } = useTranslation();
  const locale = useDateLocale();
  const [partnerOpen, setPartnerOpen] = useState(false);

  const courses = useQuery({ queryKey: ["landing-courses"], queryFn: fetchLandingCourses, staleTime: 5 * 60_000 });
  const instructors = useQuery({
    queryKey: ["landing-instructors", courses.data?.map((course) => course.id).join(",")],
    queryFn: () => fetchLandingInstructors(courses.data || []),
    enabled: Boolean(courses.data?.length),
    staleTime: 5 * 60_000,
  });
  const bundle = useQuery({ queryKey: ["landing-bundle"], queryFn: fetchLandingBundle, staleTime: 5 * 60_000 });
  const cohort = useQuery({ queryKey: ["landing-cohort"], queryFn: fetchNextCohort, staleTime: 5 * 60_000 });

  const paid = (courses.data || []).filter((course) => !course.isFree);
  const lowest = paid.length ? paid.reduce((min, course) => Math.min(min, course.earlyBird ?? course.price), Infinity) : null;
  const currency = paid[0]?.currency || "RWF";
  const featured = (courses.data || []).slice(0, 3);

  const benefits = [
    { icon: Presentation, title: t("landing.benefits.live", "Live cohorts and workshops"), body: t("landing.benefits.liveBody", "Evening classes online and hands-on Saturday workshops in Kigali, with an instructor who knows your name.") },
    { icon: BookOpenCheck, title: t("landing.benefits.practical", "Practical from day one"), body: t("landing.benefits.practicalBody", "Most of your time is spent in Excel, Power BI, SQL, Python and R on real datasets from shops, clinics and cooperatives.") },
    { icon: Award, title: t("landing.benefits.capstone", "A capstone you can show"), body: t("landing.benefits.capstoneBody", "Finish with a solved problem and a portfolio piece, not only a certificate.") },
    { icon: LineChart, title: t("landing.benefits.progress", "Progress you can see"), body: t("landing.benefits.progressBody", "Resume where you stopped, track every lesson and grade, and get your certificate automatically when you pass.") },
    { icon: MessageCircleQuestion, title: t("landing.benefits.tutor", "Help in every lesson"), body: t("landing.benefits.tutorBody", "Ask the AI tutor at any hour, and talk with your cohort and facilitators in your course's Discord community.") },
    { icon: Languages, title: t("landing.benefits.language", "English or French"), body: t("landing.benefits.languageBody", "The whole platform works in both languages, so you learn in the one you think in.") },
  ];

  const ways = [
    { to: "/courses", icon: BookOpenCheck, title: t("landing.ways.courses", "Courses"), body: t("landing.ways.coursesBody", "A structured curriculum with lessons, quizzes, assignments and a certificate."), cta: t("landing.ways.coursesCta", "Browse courses") },
    { to: "/tracks?kind=skill", icon: Route, title: t("landing.ways.skill", "Skill tracks"), body: t("landing.ways.skillBody", "A short sequence of courses and projects that builds one skill, such as SQL for analysis."), cta: t("landing.ways.skillCta", "See skill tracks") },
    { to: "/tracks?kind=career", icon: BriefcaseBusiness, title: t("landing.ways.career", "Career tracks"), body: t("landing.ways.careerBody", "A longer pathway toward a role, with the competencies, courses and applied projects it needs."), cta: t("landing.ways.careerCta", "See career tracks") },
    { to: "/competitions", icon: Trophy, title: t("landing.ways.competitions", "Competitions"), body: t("landing.ways.competitionsBody", "Time-boxed data challenges with their own rules, timeline and results."), cta: t("landing.ways.competitionsCta", "See competitions") },
  ];

  const modes = [
    { icon: Gauge, title: t("landing.modes.self", "Self-paced"), body: t("landing.modes.selfBody", "Start when you are ready and move through the course at your own speed. Same lessons, same assessments, same certificate.") },
    { icon: UsersRound, title: t("landing.modes.cohort", "Instructor-led cohort"), body: t("landing.modes.cohortBody", "Join a group with a schedule, live sessions, deadlines, instructor feedback and a cohort community on Discord.") },
  ];

  const steps = [
    { title: t("landing.steps.enrol", "Enrol"), body: t("landing.steps.enrolBody", "Pick a course and pay with Mobile Money, in full or in two instalments.") },
    { title: t("landing.steps.learn", "Learn with your cohort"), body: t("landing.steps.learnBody", "Watch lessons, join live sessions and practise with quizzes and assignments.") },
    { title: t("landing.steps.build", "Build your capstone"), body: t("landing.steps.buildBody", "Apply the five-step framework to a real problem, with feedback from your instructor.") },
    { title: t("landing.steps.certify", "Get certified"), body: t("landing.steps.certifyBody", "Score 65% or more on the capstone and receive a certificate anyone can verify online.") },
  ];

  return (
    <div className="min-h-screen bg-background">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-card focus:px-4 focus:py-2">
        {t("site.skip", "Skip to content")}
      </a>
      <SiteHeader />

      <main id="main">
        {/* Hero ------------------------------------------------------------ */}
        <section className="relative overflow-hidden bg-forest text-white" aria-labelledby="hero-title">
          <div aria-hidden className="absolute -right-24 top-10 hidden h-72 w-72 bg-royal lg:block" />
          <div aria-hidden className="absolute right-40 top-0 hidden h-40 w-40 bg-forest-2 lg:block" />
          <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-4 pb-20 pt-14 sm:px-6 lg:grid-cols-[1.1fr_0.9fr] lg:px-8 lg:pb-24 lg:pt-20">
            <div>
              <p className="inline-flex items-center gap-2 rounded-full border border-white/15 px-3 py-1 text-xs font-medium text-white/80">
                <CalendarClock className="h-3.5 w-3.5 text-flame" />
                {cohort.data
                  ? t("landing.hero.nextCohort", "{{name}} starts {{date}}", { name: cohort.data.name, date: format(new Date(cohort.data.startDate), "d MMMM", { locale }) })
                  : t("landing.hero.enrolling", "Now enrolling: data, AI and M&E courses")}
              </p>
              <h1 id="hero-title" className="text-poster mt-6 text-[3.25rem] sm:text-7xl lg:text-[5.5rem]">
                {t("landing.hero.title1", "Build data skills.")}
                <br />
                {t("landing.hero.title2", "Unlock your future.")}
              </h1>
              <p className="mt-6 max-w-xl text-lg leading-8 text-white/75">
                {t("landing.hero.body", "Expert-led courses in data analysis, AI, monitoring and evaluation and project management, built for Africa's workforce and taught in English and French.")}
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-4">
                <Button asChild size="lg" className="h-12 px-6 text-base">
                  <Link to="/courses">{t("landing.hero.cta", "Explore courses")}</Link>
                </Button>
                <Link to="/bundles" className="text-sm font-semibold text-white underline decoration-flame decoration-2 underline-offset-[6px] hover:text-flame">
                  {t("landing.hero.paths", "View learning paths")}
                </Link>
              </div>
              <ul className="mt-10 grid max-w-xl gap-3 text-sm text-white/75 sm:grid-cols-3">
                {[
                  { icon: Smartphone, text: t("landing.hero.momo", "Pay with MoMo") },
                  { icon: UsersRound, text: t("landing.hero.cohorts", "Live cohorts") },
                  { icon: BadgeCheck, text: t("landing.hero.verified", "Verifiable certificates") },
                ].map((item) => (
                  <li key={item.text} className="flex items-center gap-2"><item.icon className="h-4 w-4 text-flame" />{item.text}</li>
                ))}
              </ul>
            </div>

            <div className="relative mx-auto w-full max-w-md lg:max-w-none">
              <div className="relative overflow-hidden rounded-xl border border-white/10 bg-forest-2">
                <img src="/image3.jpg" alt={t("landing.hero.photo", "An instructor teaching at a DATA+ workshop in Kigali")} className="aspect-[4/5] w-full object-cover sm:aspect-[5/5]" />
              </div>
              <div className="absolute -bottom-6 left-4 right-4 flex items-center gap-3 rounded-xl bg-card p-4 text-foreground shadow-[0_18px_40px_-20px_rgba(0,0,0,0.6)] sm:left-auto sm:right-[-1.5rem] sm:w-72">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-leaf text-leaf-foreground"><Sparkles className="h-5 w-5" /></span>
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-forest">{t("landing.hero.cardTitle", "Capstone graded 65%+")}</span>
                  <span className="block text-xs text-muted-foreground">{t("landing.hero.cardBody", "Certificate issued automatically, with a QR code")}</span>
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* Ways to learn ------------------------------------------------ */}
        <Section labelledBy="ways-title" tone="white" className="border-b">
          <SectionTitle
            id="ways-title"
            eyebrow={t("landing.ways.eyebrow", "Ways to learn")}
            title={t("landing.ways.title", "One academy, four ways to grow")}
            body={t("landing.ways.body", "Take a single course, follow a track that builds one skill or prepares you for a role, or test yourself in a competition.")}
          />
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {ways.map((way) => (
              <li key={way.to}>
                <Link to={way.to} className="surface-interactive group flex h-full flex-col p-5">
                  <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-leaf text-leaf-foreground"><way.icon className="h-5 w-5" /></span>
                  <h3 className="mt-4 text-base font-semibold text-forest">{way.title}</h3>
                  <p className="mt-1.5 flex-1 text-sm leading-6 text-muted-foreground">{way.body}</p>
                  <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-primary">{way.cta} <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" /></span>
                </Link>
              </li>
            ))}
          </ul>
          <div className="mt-10 grid gap-4 md:grid-cols-2">
            {modes.map((mode) => (
              <div key={mode.title} className="flex gap-4 rounded-xl border bg-background p-5">
                <mode.icon className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                <div>
                  <h3 className="text-sm font-semibold text-forest">{mode.title}</h3>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">{mode.body}</p>
                </div>
              </div>
            ))}
          </div>
        </Section>

        {/* Featured courses ----------------------------------------------- */}
        <Section labelledBy="courses-title" tone="paper">
          <SectionTitle
            id="courses-title"
            eyebrow={t("landing.courses.eyebrow", "Courses")}
            title={t("landing.courses.title", "Featured courses")}
            body={t("landing.courses.body", "Start with the skills employers ask for most. Every course ends with a project you can show.")}
            action={<Link to="/courses" className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline">{t("landing.courses.all", "See all courses")} <ArrowRight className="h-4 w-4" /></Link>}
          />
          {courses.isLoading ? (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{[0, 1, 2].map((key) => <div key={key} className="h-80 animate-pulse rounded-xl bg-muted" />)}</div>
          ) : featured.length ? (
            <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{featured.map((course) => <CourseCard key={course.id} course={course} />)}</ul>
          ) : (
            <p className="rounded-xl border bg-card px-6 py-10 text-center text-muted-foreground">{t("landing.courses.none", "New courses are being prepared. Check back soon.")}</p>
          )}
        </Section>

        {/* Benefits ------------------------------------------------------- */}
        <Section labelledBy="benefits-title" tone="navy">
          <SectionTitle
            id="benefits-title"
            light
            eyebrow={t("landing.benefits.eyebrow", "Why DATA+ Academy")}
            title={t("landing.benefits.title", "Learning that fits a working life")}
            body={t("landing.benefits.body", "Built for professionals, students and NGO teams across Rwanda and Francophone Africa.")}
          />
          <ul className="grid gap-x-10 gap-y-9 sm:grid-cols-2 lg:grid-cols-3">
            {benefits.map((item) => (
              <li key={item.title} className="flex gap-4">
                <item.icon className="mt-0.5 h-6 w-6 shrink-0 text-flame" strokeWidth={1.8} />
                <div>
                  <h3 className="text-base font-semibold text-white">{item.title}</h3>
                  <p className="mt-1.5 text-sm leading-6 text-white/65">{item.body}</p>
                </div>
              </li>
            ))}
          </ul>
        </Section>

        {/* How it works --------------------------------------------------- */}
        <Section labelledBy="steps-title" tone="white">
          <div className="grid items-center gap-12 lg:grid-cols-[0.9fr_1.1fr]">
            <div className="relative order-2 lg:order-1">
              <div aria-hidden className="absolute -left-4 -top-4 h-24 w-24 bg-royal" />
              <img src="/image1.jpg" alt={t("landing.steps.photo", "Learners working on laptops during a session")} className="relative aspect-[4/5] w-full rounded-xl object-cover" loading="lazy" />
            </div>
            <div className="order-1 lg:order-2">
              <SectionTitle id="steps-title" eyebrow={t("landing.steps.eyebrow", "How it works")} title={t("landing.steps.title", "From your first lesson to a certificate")} />
              <ol className="space-y-6">
                {steps.map((step, index) => (
                  <li key={step.title} className="flex gap-5">
                    <span className="text-poster flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-forest text-2xl text-white">{index + 1}</span>
                    <div>
                      <h3 className="text-base font-semibold text-forest">{step.title}</h3>
                      <p className="mt-1 text-sm leading-6 text-muted-foreground">{step.body}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </Section>

        {/* Instructors ---------------------------------------------------- */}
        {Boolean(instructors.data?.length) && (
          <Section labelledBy="instructors-title" tone="paper">
            <SectionTitle
              id="instructors-title"
              eyebrow={t("landing.instructors.eyebrow", "Instructors")}
              title={t("landing.instructors.title", "Learn from people who do the work")}
              body={t("landing.instructors.body", "Our instructors lead data teams, research projects and M&E systems.")}
            />
            <ul className={cn("grid gap-5 sm:grid-cols-2", instructors.data!.length > 2 ? "lg:grid-cols-4" : "max-w-3xl")}>
              {instructors.data!.map((person) => (
                <li key={person.id} className="overflow-hidden rounded-xl border bg-card">
                  <div className="flex aspect-[4/3] items-center justify-center bg-leaf">
                    {person.avatarUrl
                      ? <img src={person.avatarUrl} alt="" className="h-full w-full object-cover" loading="lazy" />
                      : <span className="text-poster text-6xl text-leaf-foreground">{initials(person.name)}</span>}
                  </div>
                  <div className="p-4">
                    <h3 className="font-semibold text-forest">{person.name}</h3>
                    <p className="text-sm text-muted-foreground">{person.role || t("landing.instructors.role", "Instructor")}</p>
                    <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">{person.courses.join(" · ")}</p>
                  </div>
                </li>
              ))}
            </ul>
          </Section>
        )}

        {/* Pricing -------------------------------------------------------- */}
        <Section labelledBy="pricing-title" tone="white">
          <SectionTitle
            id="pricing-title"
            eyebrow={t("landing.pricing.eyebrow", "Pricing")}
            title={t("landing.pricing.title", "Pay for what you learn")}
            body={t("landing.pricing.body", "No subscription. Pay per course or save with a learning path, by Mobile Money.")}
          />
          <div className="grid gap-5 md:grid-cols-2">
            <div className="flex flex-col rounded-xl border bg-card p-7">
              <h3 className="text-xl font-bold text-forest">{t("landing.pricing.single", "Single course")}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{t("landing.pricing.singleBody", "One course with its cohort, sessions, capstone and certificate.")}</p>
              <p className="mt-6 text-sm text-muted-foreground">
                {lowest !== null
                  ? <>{t("landing.pricing.from", "From")} <span className="text-poster text-4xl text-forest">{formatAmount(lowest, currency, i18n.language)}</span></>
                  : <span className="text-poster text-4xl text-forest">{t("landing.pricing.perCourse", "Per course")}</span>}
              </p>
              <ul className="mt-6 flex-1 space-y-3 text-sm">
                {[
                  t("landing.pricing.momo", "MTN Mobile Money or Airtel Money"),
                  t("landing.pricing.instalments", "Two instalments on cohort courses"),
                  t("landing.pricing.earlyBird", "Early-bird prices before a cohort starts"),
                  t("landing.pricing.freeCourses", "Some introductory courses are free"),
                ].map((line) => <li key={line} className="flex gap-2.5"><Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />{line}</li>)}
              </ul>
              <Button asChild className="mt-8 h-11"><Link to="/courses">{t("landing.pricing.browse", "Browse courses")}</Link></Button>
            </div>

            <div className="relative flex flex-col rounded-xl border-2 border-royal/40 bg-leaf p-7">
              <span className="absolute -top-3 left-7 rounded-full bg-royal px-3 py-1 text-xs font-semibold text-white">{t("landing.pricing.save", "Best value")}</span>
              <h3 className="text-xl font-bold text-forest">{bundle.data?.title || t("landing.pricing.path", "Learning path")}</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {bundle.data?.description || t("landing.pricing.pathBody", "Several courses that build on each other, at a lower price than buying them one by one.")}
              </p>
              <p className="mt-6 flex flex-wrap items-baseline gap-x-3 text-sm text-muted-foreground">
                {bundle.data ? (
                  <>
                    <span className="text-poster text-4xl text-forest">{formatAmount(bundle.data.price, bundle.data.currency, i18n.language)}</span>
                    {bundle.data.original > bundle.data.price && (
                      <span>{t("landing.pricing.instead", "instead of {{price}}", { price: formatAmount(bundle.data.original, bundle.data.currency, i18n.language) })}</span>
                    )}
                  </>
                ) : <span className="text-poster text-4xl text-forest">{t("landing.pricing.bundle", "Bundle price")}</span>}
              </p>
              <ul className="mt-6 flex-1 space-y-3 text-sm">
                {[
                  bundle.data?.courses
                    ? t("landing.pricing.courses", "{{count}} courses in one payment", { count: bundle.data.courses })
                    : t("landing.pricing.coursesGeneric", "Several courses in one payment"),
                  t("landing.pricing.certs", "A certificate for each course you complete"),
                  t("landing.pricing.scholarship", "Scholarships of up to 50% for students and NGO staff"),
                ].map((line) => <li key={line} className="flex gap-2.5"><Check className="mt-0.5 h-4 w-4 shrink-0 text-royal" />{line}</li>)}
              </ul>
              <Button asChild className="mt-8 h-11"><Link to="/bundles">{t("landing.pricing.viewPaths", "View learning paths")}</Link></Button>
            </div>
          </div>
        </Section>

        {/* Organisations -------------------------------------------------- */}
        <Section tone="paper" labelledBy="teams-title" className="border-y">
          <div className="grid items-center gap-8 lg:grid-cols-[1.2fr_0.8fr]">
            <div>
              <h2 id="teams-title" className="text-2xl font-bold tracking-tight text-forest sm:text-[1.75rem]">{t("landing.teams.title", "Sponsoring learners from your organisation?")}</h2>
              <p className="mt-3 max-w-2xl text-base leading-7 text-muted-foreground">
                {t("landing.teams.body", "Organisations can sponsor places, enrol a group into a dedicated cohort and agree a tailored course sequence. The learning content stays the same; schedule, support and pricing are arranged with you.")}
              </p>
            </div>
            <div className="flex flex-wrap gap-3 lg:justify-end">
              <Button variant="outline" className="h-11 border-forest/25 text-forest" onClick={() => setPartnerOpen(true)}>{t("landing.teams.cta", "Request organisation access")}</Button>
              <Button asChild variant="ghost" className="h-11 text-forest"><a href={corporateUrl("/contact")} target="_blank" rel="noopener noreferrer">{t("landing.teams.contact", "Contact DATA+")} <ExternalLink /></a></Button>
            </div>
          </div>
        </Section>

        {/* Closing call to action ------------------------------------------ */}
        <section className="relative overflow-hidden bg-forest text-white" aria-labelledby="cta-title">
          <div aria-hidden className="absolute -left-10 bottom-0 h-28 w-28 bg-forest-2" />
          <div aria-hidden className="absolute left-14 bottom-14 h-10 w-10 bg-royal" />
          <div className="relative mx-auto max-w-7xl px-4 py-20 text-center sm:px-6 lg:px-8">
            <h2 id="cta-title" className="text-poster text-5xl sm:text-6xl lg:text-7xl">{t("landing.cta.title", "Your next chapter starts here.")}</h2>
            <p className="mx-auto mt-4 max-w-xl text-white/70">{t("landing.cta.body", "Join the next cohort and build skills you can use at work on Monday.")}</p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Button asChild size="lg" className="h-12 px-6 text-base"><Link to="/courses">{t("landing.hero.cta", "Explore courses")}</Link></Button>
              <Button asChild size="lg" variant="outline" className="h-12 border-white/25 bg-transparent px-6 text-base text-white hover:bg-white/10 hover:text-white">
                <Link to="/signup">{t("landing.cta.signup", "Create a free account")}</Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter onPartner={() => setPartnerOpen(true)} />
      <PartnerDialog open={partnerOpen} onOpenChange={setPartnerOpen} />
    </div>
  );
};

export default Index;
