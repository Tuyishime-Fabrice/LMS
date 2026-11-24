import { useEffect, useState } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Menu, X } from "lucide-react";
import { Brand } from "@/components/shell/Brand";
import { homePath, type AppRole } from "@/components/shell/navigation";
import { LanguageSelector } from "@/components/LanguageSelector";
import { Button } from "@/components/ui/button";
import { useAppAuth } from "@/contexts/AuthContext";
import { siteFacts } from "@/content/site-facts";
import { cn } from "@/lib/utils";
import { useIntroEnded } from "./introState";

/**
 * Header shared by the public pages: the lock-up "by DATA+ Rwanda", four links, language,
 * sign in and one primary action. Cream and sticky; a hairline appears once the page scrolls.
 * On phones a labelled menu button opens a full-screen menu.
 */
export function SiteHeader({ className }: { className?: string }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { user, profile } = useAppAuth();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const introEnded = useIntroEnded();
  const home = profile ? homePath[profile.role as AppRole] || "/student/dashboard" : null;

  const links = [
    { to: "/courses", label: t("site.nav.courses", "Courses") },
    { to: "/#organisations", label: t("site.nav.organisations", "For organisations") },
    { to: "/exhibition", label: t("site.nav.projects", "Student projects") },
    { to: "/about", label: t("site.nav.about", "About") },
  ];

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // The full-screen menu closes on navigation and locks the page behind it.
  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  const linkClass = (active: boolean) => cn(
    "rounded-md px-3 py-2 text-[0.9375rem] font-medium transition-colors hover:text-forest",
    active ? "text-forest" : "text-olive-ink/80",
  );
  const isActive = (to: string) => !to.includes("#") && pathname.startsWith(to);

  return (
    <header className={cn("sticky top-0 z-40 border-b bg-background transition-[border-color]", scrolled || open ? "border-border" : "border-transparent", className)}>
      <div className="mx-auto flex h-16 max-w-site items-center gap-6 px-4 sm:h-[4.5rem] sm:px-6 lg:px-8">
        <Link
          to="/"
          className={cn("flex items-center gap-3 rounded-lg transition-opacity duration-500", introEnded ? "opacity-100" : "opacity-0")}
          aria-label={t("site.home", "DATA+ Academy home")}
        >
          <Brand />
          <span className="hidden border-l border-border pl-3 text-xs leading-4 text-muted-foreground sm:block">
            {t("site.byParent", "by {{parent}}", { parent: siteFacts.brand.parent })}
          </span>
        </Link>

        <nav aria-label={t("site.mainNav", "Main")} className="hidden flex-1 items-center justify-center gap-1 lg:flex">
          {links.map((link) => link.to.includes("#")
            ? <Link key={link.to} to={link.to} className={linkClass(false)}>{link.label}</Link>
            : <NavLink key={link.to} to={link.to} className={() => linkClass(isActive(link.to))}>{link.label}</NavLink>)}
        </nav>

        <div className="ml-auto flex items-center gap-1.5 lg:ml-0">
          <LanguageSelector />
          {user && home ? (
            <Button size="sm" onClick={() => navigate(home)} className="hidden h-10 sm:inline-flex">{t("site.myAccount", "My learning")}</Button>
          ) : (
            <>
              <Button asChild variant="ghost" size="sm" className="hidden h-10 text-forest sm:inline-flex">
                <Link to="/auth">{t("site.signIn", "Sign in")}</Link>
              </Button>
              <Button asChild size="sm" className="hidden h-10 px-4 sm:inline-flex">
                <Link to="/courses">{t("landing.hero.cta", "Explore courses")}</Link>
              </Button>
            </>
          )}
          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            className="flex h-10 items-center gap-2 rounded-lg px-3 text-sm font-semibold text-forest hover:bg-mint lg:hidden"
            aria-expanded={open}
            aria-controls="site-menu"
          >
            {open ? <X className="h-5 w-5" aria-hidden /> : <Menu className="h-5 w-5" aria-hidden />}
            {open ? t("site.closeMenu", "Close menu") : t("site.menu", "Menu")}
          </button>
        </div>
      </div>

      {open && (
        <div id="site-menu" className="fixed inset-x-0 bottom-0 top-16 z-40 overflow-y-auto bg-background sm:top-[4.5rem] lg:hidden">
          <nav className="mx-auto flex max-w-site flex-col px-4 py-6 sm:px-6" aria-label={t("site.mainNav", "Main")}>
            {links.map((link) => (
              <Link key={link.to} to={link.to} onClick={() => setOpen(false)} className="border-b border-border py-4 font-display text-2xl font-semibold text-forest">
                {link.label}
              </Link>
            ))}
            <div className="mt-8 grid gap-3">
              {user && home ? (
                <Button size="lg" onClick={() => { setOpen(false); navigate(home); }}>{t("site.myAccount", "My learning")}</Button>
              ) : (
                <>
                  <Button asChild size="lg"><Link to="/courses" onClick={() => setOpen(false)}>{t("landing.hero.cta", "Explore courses")}</Link></Button>
                  <Button asChild size="lg" variant="outline"><Link to="/auth" onClick={() => setOpen(false)}>{t("site.signIn", "Sign in")}</Link></Button>
                </>
              )}
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
