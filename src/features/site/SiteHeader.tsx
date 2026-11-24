import { useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Menu, X } from "lucide-react";
import { Brand } from "@/components/shell/Brand";
import { homePath, type AppRole } from "@/components/shell/navigation";
import { LanguageSelector } from "@/components/LanguageSelector";
import { Button } from "@/components/ui/button";
import { useAppAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { useSiteLinks } from "./siteLinks";

/** Navy header shared by the public pages. */
export function SiteHeader({ className }: { className?: string }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, profile } = useAppAuth();
  const [open, setOpen] = useState(false);
  const links = useSiteLinks();
  const home = profile ? homePath[profile.role as AppRole] || "/student/dashboard" : null;

  return (
    <header className={cn("sticky top-0 z-40 bg-forest text-white", className)}>
      <div className="mx-auto flex h-16 max-w-site items-center gap-6 px-4 sm:px-6 lg:px-8">
        <Link to="/" className="rounded-lg focus-visible:outline-white" aria-label={t("site.home", "DATA+ Academy home")}>
          <Brand tone="light" />
        </Link>

        <nav aria-label={t("site.mainNav", "Main")} className="hidden flex-1 items-center gap-1 lg:flex">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) => cn(
                "rounded-md px-3 py-2 text-sm font-medium transition-colors hover:text-white",
                isActive ? "text-white" : "text-white/70",
              )}
            >
              {t(link.key, link.label)}
            </NavLink>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-1.5">
          <div className="[&_button]:text-white/80 [&_button:hover]:bg-white/10 [&_button:hover]:text-white">
            <LanguageSelector />
          </div>
          {user && home ? (
            <Button size="sm" onClick={() => navigate(home)} className="hidden sm:inline-flex">
              {t("site.myAccount", "My learning")}
            </Button>
          ) : (
            <>
              <Button asChild variant="ghost" size="sm" className="hidden text-white/80 hover:bg-white/10 hover:text-white sm:inline-flex">
                <Link to="/auth">{t("site.signIn", "Sign in")}</Link>
              </Button>
              <Button asChild size="sm" className="hidden sm:inline-flex">
                <Link to="/signup">{t("site.start", "Start learning")}</Link>
              </Button>
            </>
          )}
          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            className="flex h-10 w-10 items-center justify-center rounded-md text-white hover:bg-white/10 lg:hidden"
            aria-expanded={open}
            aria-controls="site-menu"
            aria-label={open ? t("site.closeMenu", "Close menu") : t("site.openMenu", "Open menu")}
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {open && (
        <div id="site-menu" className="border-t border-white/10 bg-forest lg:hidden">
          <nav className="mx-auto flex max-w-site flex-col px-4 py-3 sm:px-6" aria-label={t("site.mainNav", "Main")}>
            {links.map((link) => (
              <NavLink key={link.to} to={link.to} onClick={() => setOpen(false)} className="rounded-md px-2 py-3 text-base font-medium text-white/85 hover:bg-white/5">
                {t(link.key, link.label)}
              </NavLink>
            ))}
            <div className="mt-3 grid grid-cols-2 gap-2 border-t border-white/10 pt-4">
              {user && home ? (
                <Button className="col-span-2" onClick={() => { setOpen(false); navigate(home); }}>{t("site.myAccount", "My learning")}</Button>
              ) : (
                <>
                  <Button asChild variant="outline" className="border-white/25 bg-transparent text-white hover:bg-white/10 hover:text-white">
                    <Link to="/auth" onClick={() => setOpen(false)}>{t("site.signIn", "Sign in")}</Link>
                  </Button>
                  <Button asChild><Link to="/signup" onClick={() => setOpen(false)}>{t("site.start", "Start learning")}</Link></Button>
                </>
              )}
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
