import { NavLink, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarHeader, SidebarMenu, SidebarMenuBadge, SidebarMenuButton, SidebarMenuItem, SidebarRail, useSidebar,
} from "@/components/ui/sidebar";
import { Brand } from "./Brand";
import { homePath, navigation, type AppRole, type NavItem } from "./navigation";
import { cn } from "@/lib/utils";

type Badges = Partial<Record<NonNullable<NavItem["badge"]>, number>>;

function isItemActive(pathname: string, item: NavItem) {
  if (pathname === item.to || pathname.startsWith(`${item.to}/`)) return true;
  return (item.match || []).some((prefix) => pathname.startsWith(prefix));
}

/**
 * One sidebar for every role. Groups and items come from `navigation.ts`,
 * so the three roles look and behave the same.
 */
export function RoleSidebar({
  role,
  badges = {},
  children,
}: {
  role: AppRole;
  badges?: Badges;
  /** Optional extra section (for example a teacher's course list). */
  children?: React.ReactNode;
}) {
  const { t } = useTranslation();
  const { pathname } = useLocation();
  const { state, isMobile, setOpenMobile } = useSidebar();
  const collapsed = state === "collapsed" && !isMobile;

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border">
      <SidebarHeader className={cn("h-16 justify-center", collapsed ? "px-2" : "px-4")}>
        <NavLink to={homePath[role]} aria-label="DataPlus Academy home" className="rounded-lg">
          <Brand compact={collapsed} />
        </NavLink>
      </SidebarHeader>

      <SidebarContent className="scrollbar-hide gap-1 px-1 pb-2">
        {navigation[role].map((group) => (
          <SidebarGroup key={group.key} className="py-1.5">
            {group.label && (
              <SidebarGroupLabel className="h-7 px-3 text-xs font-medium text-muted-foreground">
                {t(`shell.group.${group.key}`, group.label)}
              </SidebarGroupLabel>
            )}
            <SidebarGroupContent>
              <SidebarMenu className="gap-0.5">
                {group.items.map((item) => {
                  const active = isItemActive(pathname, item);
                  const label = t(item.key, item.label);
                  const count = item.badge ? badges[item.badge] || 0 : 0;
                  return (
                    <SidebarMenuItem key={item.to}>
                      <SidebarMenuButton
                        asChild
                        isActive={active}
                        tooltip={label}
                        className={cn(
                          "relative h-10 rounded-lg px-3 text-[0.9375rem] font-medium text-sidebar-foreground transition-colors duration-150",
                          "hover:bg-forest/[0.06] hover:text-forest",
                          "data-[active=true]:bg-card data-[active=true]:font-semibold data-[active=true]:text-forest data-[active=true]:shadow-[0_1px_2px_hsl(var(--forest)/0.08),0_0_0_1px_hsl(var(--border))]",
                        )}
                      >
                        <NavLink to={item.to} onClick={() => isMobile && setOpenMobile(false)} aria-current={active ? "page" : undefined}>
                          <item.icon className={cn("!size-[1.125rem]", active ? "text-primary" : "text-muted-foreground")} strokeWidth={active ? 2.25 : 1.9} />
                          <span>{label}</span>
                        </NavLink>
                      </SidebarMenuButton>
                      {count > 0 && (
                        <SidebarMenuBadge className="right-2 rounded-full bg-primary px-1.5 text-[0.6875rem] font-semibold text-primary-foreground peer-hover/menu-button:text-primary-foreground peer-data-[active=true]/menu-button:text-primary-foreground">
                          {count}
                        </SidebarMenuBadge>
                      )}
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
        {!collapsed && children}
      </SidebarContent>

      <SidebarRail />
    </Sidebar>
  );
}
