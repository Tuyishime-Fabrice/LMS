import { useTranslation } from "react-i18next";
import { ExternalLink, MessagesSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { CommunityLink } from "./api";

/**
 * Where cohort conversation happens. Explains that the learner is leaving
 * DATA+ Academy for Discord, and what stays here (announcements, grades).
 */
export function CommunityCard({ link, compact = false, className }: { link: CommunityLink; compact?: boolean; className?: string }) {
  const { t } = useTranslation();
  const where = link.scope === "cohort" && link.cohortName
    ? t("community.cohortChannel", "{{cohort}} channel", { cohort: link.cohortName })
    : t("community.courseServer", "Course community");

  return (
    <section className={cn("surface p-4", className)} aria-label={t("community.title", "Cohort community")}>
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-leaf text-leaf-foreground">
          <MessagesSquare className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          {!compact && <p className="truncate text-sm font-semibold text-forest">{link.courseTitle}</p>}
          <p className={cn("text-meta", compact && "font-medium text-forest")}>{link.url ? where : t("community.notSet", "No community link yet")}</p>
        </div>
      </div>
      {link.url ? (
        <>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            {t("community.explain", "Questions, peer help and cohort chat happen on Discord. It opens in a new tab and Discord's own terms apply. Announcements, grades and feedback stay here.")}
          </p>
          <Button asChild variant="outline" className="mt-3 w-full sm:w-auto">
            <a href={link.url} target="_blank" rel="noopener noreferrer">
              {t("community.open", "Open Discord")}
              <ExternalLink />
              <span className="sr-only">{t("community.newTab", "(opens in a new tab)")}</span>
            </a>
          </Button>
        </>
      ) : (
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          {t("community.notSetBody", "Your instructor has not added a Discord link for this course yet. Course announcements still appear on your Home page.")}
        </p>
      )}
    </section>
  );
}
