import { useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Photo } from "./Photo";
import { Section, SectionTitle } from "./Section";
import { useReveal } from "./useReveal";

/**
 * Inside the platform: real screenshots of the product, one per tab, crossfading in 250 ms.
 * Captured from the demo build with sample data and a neutral learner name (see LANDING_REDESIGN.md).
 * An AI tutor tab is left out until that feature is confirmed live.
 */
export function PlatformTour() {
  const { t } = useTranslation();
  const [tab, setTab] = useState("player");
  const ref = useReveal<HTMLDivElement>();
  const tabs = [
    {
      id: "player", label: t("landing.platform.player", "Lessons"),
      caption: t("landing.platform.playerCaption", "Lessons in order, with the module list beside them and your place saved."),
      alt: t("landing.platform.playerAlt", "The lesson player showing a reading lesson on cleaning data, with the course modules listed on the left"),
      width: 1600, height: 1000,
    },
    {
      id: "progress", label: t("landing.platform.progress", "Progress"),
      caption: t("landing.platform.progressCaption", "Your quiz results and marked work for each course, with the written feedback that came with them."),
      alt: t("landing.platform.progressAlt", "The grades page with overall, quiz and assignment scores and a comment from the instructor"),
      width: 1600, height: 1143,
    },
    {
      id: "assignments", label: t("landing.platform.assignments", "Assignments"),
      caption: t("landing.platform.assignmentsCaption", "Deadlines in one list, and the marking rubric visible before you submit."),
      alt: t("landing.platform.assignmentsAlt", "The assignments page listing two assignments with due dates and an open marking rubric"),
      width: 1600, height: 1143,
    },
    {
      id: "certificate", label: t("landing.platform.certificate", "Certificates"),
      caption: t("landing.platform.certificateCaption", "Each certificate carries a code and a QR code that anyone can check."),
      alt: t("landing.platform.certificateAlt", "A certificate of completion with a QR code, and buttons to download it or copy its verification link"),
      width: 1600, height: 1143,
    },
  ];

  return (
    <Section labelledBy="platform-title" tone="white">
      <SectionTitle
        id="platform-title"
        marker
        title={t("landing.platform.title", "Inside the platform")}
        body={t("landing.platform.body", "What you see once you are enrolled.")}
      />
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="h-auto flex-wrap justify-start gap-1 bg-muted p-1">
          {tabs.map((item) => (
            <TabsTrigger key={item.id} value={item.id} className="px-4 py-2 text-sm data-[state=active]:text-forest">{item.label}</TabsTrigger>
          ))}
        </TabsList>
        <div ref={ref} className="reveal mt-6 grid gap-6 lg:grid-cols-[1fr_17rem] lg:items-start">
          <div className="relative aspect-[16/10] overflow-hidden rounded-lg border bg-muted">
            {tabs.map((item) => (
              <TabsContent
                key={item.id}
                value={item.id}
                forceMount
                className="absolute inset-0 mt-0 transition-opacity duration-[250ms] ease-out data-[state=inactive]:pointer-events-none data-[state=inactive]:opacity-0"
              >
                <Photo
                  name={`platform-${item.id}`}
                  width={item.width}
                  height={item.height}
                  sizes="(min-width: 1024px) 880px, 92vw"
                  alt={item.alt}
                  className="block h-full"
                  imgClassName="object-cover object-left-top"
                />
              </TabsContent>
            ))}
          </div>
          <div aria-live="polite">
            <p className="text-lg leading-7 text-forest">{tabs.find((item) => item.id === tab)?.caption}</p>
            {tab === "certificate" && (
              <Link to="/verify" className="mt-3 inline-block text-sm font-semibold text-primary hover:underline">{t("landing.platform.verify", "Check a certificate")}</Link>
            )}
            <p className="mt-6 text-xs text-muted-foreground">{t("landing.platform.sample", "Shown with sample data.")}</p>
          </div>
        </div>
      </Tabs>
    </Section>
  );
}
