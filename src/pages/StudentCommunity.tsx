import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Megaphone, MessagesSquare } from "lucide-react";
import { AppShell } from "@/components/shell/AppShell";
import { EmptyState, ErrorState, PageHeader, SkeletonBlock } from "@/components/shell/page";
import { Button } from "@/components/ui/button";
import { CommunityCard } from "@/features/community/CommunityCard";
import { useCommunityLinks } from "@/features/community/hooks";

/**
 * Cohort community: one Discord link per course or cohort. Replaces the
 * old in-platform chat; structured announcements stay inside the LMS.
 */
export default function StudentCommunity() {
  const { t } = useTranslation();
  const links = useCommunityLinks();

  return (
    <AppShell role="student">
      <PageHeader
        title={t("community.pageTitle", "Cohort community")}
        description={t("community.pageBody", "Discussion with your cohort, facilitators and instructors takes place on Discord. Official announcements, deadlines, grades and feedback always stay in DATA+ Academy.")}
      />

      <div className="mb-6 flex items-start gap-3 rounded-xl border bg-card p-4 text-sm leading-6 text-muted-foreground">
        <Megaphone className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
        <p>
          {t("community.announcementsNote", "Looking for something your instructor posted? Course announcements are on your Home page and in each course.")}{" "}
          <Link to="/student/dashboard" className="font-semibold text-primary hover:underline">{t("community.goHome", "Go to Home")}</Link>
        </p>
      </div>

      {links.isLoading ? (
        <div className="grid gap-4 md:grid-cols-2">{[0, 1].map((key) => <SkeletonBlock key={key} className="h-44" />)}</div>
      ) : links.isError ? (
        <ErrorState
          title={t("community.error", "Your community links could not be loaded")}
          onRetry={() => void links.refetch()}
          retryLabel={t("common.tryAgain", "Try again")}
        />
      ) : !links.data?.length ? (
        <EmptyState
          icon={MessagesSquare}
          title={t("community.empty", "No courses yet")}
          description={t("community.emptyBody", "When you enrol in a course, its Discord community appears here.")}
          action={<Button asChild><Link to="/courses">{t("home.explore", "Explore courses")}</Link></Button>}
        />
      ) : (
        <ul className="grid gap-4 md:grid-cols-2">
          {links.data.map((link) => <li key={link.courseId}><CommunityCard link={link} className="h-full" /></li>)}
        </ul>
      )}
    </AppShell>
  );
}
