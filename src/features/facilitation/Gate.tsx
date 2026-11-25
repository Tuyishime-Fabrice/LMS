import { type ReactNode } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { HeartHandshake } from "lucide-react";
import { AppShell } from "@/components/shell/AppShell";
import { EmptyState, ErrorState, SkeletonBlock } from "@/components/shell/page";
import { Button } from "@/components/ui/button";
import { homePath, type AppRole } from "@/components/shell/navigation";
import { useAppAuth } from "@/contexts/AuthContext";
import { useMyAssignments, type Assignment } from "./api";

/**
 * Facilitation pages share one shell and one check: the account must have at
 * least one assignment. The database enforces the same scope on every read.
 */
export function FacilitationGate({ children }: { children: (assignments: Assignment[]) => ReactNode }) {
  const { t } = useTranslation();
  const { profile } = useAppAuth();
  const assignments = useMyAssignments();
  const home = homePath[(profile?.role as AppRole) || "student"];
  return (
    <AppShell role="facilitator">
      {assignments.isLoading ? <SkeletonBlock className="h-64" /> : assignments.isError ? (
        <ErrorState title={t("facilitation.error", "Your facilitation work could not be loaded")} onRetry={() => void assignments.refetch()} />
      ) : !assignments.data?.length ? (
        <EmptyState
          icon={HeartHandshake}
          title={t("facilitation.none", "You are not facilitating a course")}
          description={t("facilitation.noneBody", "An instructor or administrator assigns facilitators to a course or a cohort. Ask them if you expected to see work here.")}
          action={<Button asChild variant="outline"><Link to={home}>{t("facilitation.backHome", "Back to my home")}</Link></Button>}
        />
      ) : children(assignments.data)}
    </AppShell>
  );
}
