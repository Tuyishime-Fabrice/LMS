import { type ReactNode } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { NotificationBell } from "@/components/NotificationBell";
import { LanguageSelector } from "@/components/LanguageSelector";
import { AccountMenu } from "@/components/AccountMenu";
import { useAppAuth } from "@/contexts/AuthContext";
import { useActivityTracker } from "@/hooks/useActivityTracker";
import { RoleSidebar } from "./RoleSidebar";
import { TeacherCourseList } from "./TeacherCourseList";
import { studentTabBar, type AppRole } from "./navigation";
import { cn } from "@/lib/utils";

/** The bar every signed-in page shares: menu, page context, language, notifications, account. */
export function AppTopBar({ children, className }: { children?: ReactNode; className?: string }) {
  const { profile } = useAppAuth();
  const { t } = useTranslation();
  const initials = (profile?.full_name || profile?.email || "U").trim().charAt(0).toUpperCase();
  return (
    <header className={cn("sticky top-0 z-20 flex h-16 items-center gap-2 border-b bg-background/90 px-3 backdrop-blur sm:px-6", className)}>
      <SidebarTrigger className="h-9 w-9 text-muted-foreground hover:text-forest" aria-label={t("shell.toggleMenu", "Toggle menu")} />
      <div className="min-w-0 flex-1">{children}</div>
      <div className="flex items-center gap-0.5 sm:gap-1">
        <LanguageSelector />
        <NotificationBell />
        <AccountMenu profile={profile} fallback={initials} className="ml-1.5 h-9 w-9 ring-1 ring-border" />
      </div>
    </header>
  );
}

function StudentTabBar() {
  const { t } = useTranslation();
  const { pathname } = useLocation();
  return (
    <nav
      aria-label={t("shell.primaryNav", "Primary")}
      className="pb-safe fixed inset-x-0 bottom-0 z-30 border-t bg-card/95 backdrop-blur md:hidden"
    >
      <ul className="mx-auto flex max-w-md">
        {studentTabBar.map((item) => {
          const active = pathname === item.to || pathname.startsWith(`${item.to}/`)
            || (item.match || []).some((prefix) => pathname.startsWith(prefix));
          return (
            <li key={item.to} className="flex-1">
              <NavLink
                to={item.to}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex h-14 flex-col items-center justify-center gap-1 text-[0.6875rem] font-medium transition-colors",
                  active ? "text-primary" : "text-muted-foreground",
                )}
              >
                <item.icon className="h-5 w-5" strokeWidth={active ? 2.3 : 1.9} />
                {t(item.key, item.label)}
              </NavLink>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/**
 * Layout for every signed-in page: role sidebar, top bar, content column and,
 * for learners on phones, a bottom tab bar.
 */
export function AppShell({
  role,
  topBar,
  children,
  width = "default",
  sidebarExtra,
  badges,
}: {
  role: AppRole;
  /** Small context shown in the top bar (breadcrumb, course name). */
  topBar?: ReactNode;
  children: ReactNode;
  width?: "default" | "wide" | "full";
  /** Extra sidebar section. Instructors get their course list by default. */
  sidebarExtra?: ReactNode;
  badges?: React.ComponentProps<typeof RoleSidebar>["badges"];
}) {
  const { pathname } = useLocation();
  useActivityTracker();
  return (
    <SidebarProvider>
      <RoleSidebar role={role} badges={badges}>
        {sidebarExtra ?? (role === "teacher" ? <TeacherCourseList /> : null)}
      </RoleSidebar>
      <SidebarInset className="min-w-0 bg-background">
        <AppTopBar>{topBar}</AppTopBar>
        <main
          key={pathname}
          className={cn(
            "animate-page-in mx-auto w-full flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8",
            role === "student" && "pb-24 md:pb-8",
            width === "default" && "max-w-6xl",
            width === "wide" && "max-w-[88rem]",
          )}
        >
          {children}
        </main>
      </SidebarInset>
      {role === "student" && <StudentTabBar />}
    </SidebarProvider>
  );
}
