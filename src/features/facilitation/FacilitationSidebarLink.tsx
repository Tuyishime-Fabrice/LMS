import { NavLink, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { HeartHandshake } from "lucide-react";
import { useSidebar } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import { useMyAssignments } from "./api";

/** Shown in learner and instructor sidebars only when the account is assigned to facilitate. */
export function FacilitationSidebarLink() {
  const { t } = useTranslation();
  const { pathname } = useLocation();
  const { isMobile, setOpenMobile } = useSidebar();
  const assignments = useMyAssignments();
  if (!assignments.data?.length) return null;
  const active = pathname.startsWith("/facilitate");
  return (
    <div className="px-2 pb-1 pt-3">
      <p className="text-eyebrow px-3 pb-1.5">{t("shell.group.facilitation", "Facilitation")}</p>
      <NavLink
        to="/facilitate"
        onClick={() => isMobile && setOpenMobile(false)}
        className={cn("flex h-9 items-center gap-2 rounded-lg px-3 text-sm font-medium text-sidebar-foreground hover:bg-forest/[0.06]", active && "bg-card font-semibold text-forest")}
      >
        <HeartHandshake className="h-[1.125rem] w-[1.125rem] text-primary" />
        {t("facilitation.workspace", "Facilitation workspace")}
        <span className="tabular ml-auto text-xs text-muted-foreground">{assignments.data.length}</span>
      </NavLink>
    </div>
  );
}
