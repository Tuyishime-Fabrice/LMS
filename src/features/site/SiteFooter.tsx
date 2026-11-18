import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Brand } from "@/components/shell/Brand";

const social = [
  { href: "https://www.linkedin.com/company/data-consultant-ltd/", label: "LinkedIn" },
  { href: "https://x.com/dataplusco", label: "X" },
  { href: "https://www.instagram.com/dataplus_rwanda/", label: "Instagram" },
];

/** Navy footer shared by the public pages. */
export function SiteFooter({ onPartner }: { onPartner?: () => void }) {
  const { t } = useTranslation();
  const columns = [
    {
      title: t("site.footer.learn", "Learn"),
      links: [
        { to: "/courses", label: t("site.nav.courses", "Courses") },
        { to: "/bundles", label: t("site.nav.paths", "Learning paths") },
        { to: "/exhibition", label: t("site.nav.exhibition", "Student projects") },
        { to: "/verify", label: t("site.footer.verify", "Verify a certificate") },
      ],
    },
    {
      title: t("site.footer.academy", "Academy"),
      links: [
        { to: "/about", label: t("site.nav.about", "About") },
        { to: "/contact", label: t("site.nav.contact", "Contact") },
        { to: "/signup?role=teacher", label: t("site.footer.teach", "Teach with us") },
      ],
    },
  ];
  return (
    <footer className="bg-forest text-white">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-[1.4fr_1fr_1fr_1fr] lg:px-8">
        <div className="max-w-sm">
          <Brand tone="light" />
          <p className="mt-4 text-sm leading-6 text-white/65">
            {t("site.footer.mission", "Practical data, AI and project management skills for Africa's workforce, taught in English and French from Kigali.")}
          </p>
          {onPartner && (
            <button type="button" onClick={onPartner} className="mt-4 text-sm font-semibold text-flame hover:underline">
              {t("site.footer.partner", "Train your team with us")}
            </button>
          )}
        </div>
        {columns.map((column) => (
          <nav key={column.title} aria-label={column.title}>
            <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-white/50">{column.title}</h2>
            <ul className="mt-4 space-y-2.5 text-sm">
              {column.links.map((link) => (
                <li key={link.to}><Link to={link.to} className="text-white/80 hover:text-white">{link.label}</Link></li>
              ))}
            </ul>
          </nav>
        ))}
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-white/50">{t("site.footer.contact", "Contact")}</h2>
          <ul className="mt-4 space-y-2.5 text-sm text-white/80">
            <li>KG 5 Kimihurura, Kigali</li>
            <li><a href="tel:+250784857317" className="hover:text-white">+250 784 857 317</a></li>
            <li><a href="mailto:info@dataplusrwanda.com" className="hover:text-white">info@dataplusrwanda.com</a></li>
          </ul>
          <ul className="mt-4 flex gap-4 text-sm">
            {social.map((item) => (
              <li key={item.href}><a href={item.href} target="_blank" rel="noreferrer" className="text-white/70 hover:text-white">{item.label}</a></li>
            ))}
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-5 text-xs text-white/50 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <p>© {new Date().getFullYear()} DataPlus Labs. {t("site.footer.rights", "All rights reserved.")}</p>
          <p className="flex gap-4">
            <Link to="/privacy-policy" className="hover:text-white">{t("site.footer.privacy", "Privacy policy")}</Link>
            <Link to="/terms-of-service" className="hover:text-white">{t("site.footer.terms", "Terms of service")}</Link>
          </p>
        </div>
      </div>
    </footer>
  );
}
