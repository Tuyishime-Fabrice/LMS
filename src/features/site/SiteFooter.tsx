import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Brand } from "@/components/shell/Brand";
import { useQuery } from "@tanstack/react-query";
import { corporateUrl } from "@/lib/siteConfig";
import { siteFacts } from "@/content/site-facts";
import { fetchLandingBundle } from "./landing-data";
import { useSiteLinks } from "./siteLinks";

/** Navy footer shared by the public pages. */
export function SiteFooter({ onPartner }: { onPartner?: () => void }) {
  const { t, i18n } = useTranslation();
  const learnLinks = useSiteLinks();
  const bundle = useQuery({ queryKey: ["landing-bundle"], queryFn: fetchLandingBundle, staleTime: 5 * 60_000 });
  const { contact, social, brand } = siteFacts;
  const columns: { title: string; links: ({ to: string; label: string } | { href: string; label: string })[] }[] = [
    {
      title: t("site.footer.learn", "Learn"),
      links: learnLinks.map((link) => ({ to: link.to, label: t(link.key, link.label) })),
    },
    {
      title: t("site.footer.academy", "Academy"),
      links: [
        ...(bundle.data ? [{ to: "/bundles", label: t("site.footer.bundles", "Course bundles") }] : []),
        { to: "/signup?role=teacher", label: t("site.footer.teach", "Teach with us") },
        { href: corporateUrl("/"), label: t("site.footer.parent", "DATA+ Rwanda") },
      ],
    },
  ];
  return (
    <footer className="bg-forest text-white">
      <div className="mx-auto grid max-w-site gap-10 px-4 py-14 sm:px-6 md:grid-cols-[1.4fr_1fr_1fr_1fr] lg:px-8">
        <div className="max-w-sm">
          <Brand tone="light" />
          <p className="mt-4 text-sm leading-6 text-white/65">
            {t("site.footer.mission2", "The learning platform of DATA+ Rwanda: courses in data analysis, monitoring and evaluation, research and AI, online and in Kigali.")}
          </p>
          {onPartner && (
            <button type="button" onClick={onPartner} className="mt-4 text-sm font-semibold text-flame hover:underline">
              {t("site.footer.partner", "Train your team with us")}
            </button>
          )}
        </div>
        {columns.map((column) => (
          <nav key={column.title} aria-label={column.title}>
            <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-white/75">{column.title}</h2>
            <ul className="mt-4 space-y-2.5 text-sm">
              {column.links.map((link) => (
                <li key={link.label}>
                  {"href" in link
                    ? <a href={link.href} target="_blank" rel="noopener noreferrer" className="text-white/80 hover:text-white">{link.label}</a>
                    : <Link to={link.to} className="text-white/80 hover:text-white">{link.label}</Link>}
                </li>
              ))}
            </ul>
          </nav>
        ))}
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-white/75">{t("site.footer.contact", "Contact")}</h2>
          <ul className="mt-4 space-y-2.5 text-sm text-white/80">
            <li>{contact.address}</li>
            <li><a href={`tel:${contact.phone.replace(/\s/g, "")}`} className="hover:text-white">{contact.phone}</a></li>
            <li><a href={`mailto:${contact.email}`} className="hover:text-white">{contact.email}</a></li>
            {contact.whatsapp && (
              <li><a href={`https://wa.me/${contact.whatsapp.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer" className="hover:text-white">{t("site.footer.whatsapp", "WhatsApp")}</a></li>
            )}
            {contact.hours && <li>{i18n.language?.startsWith("fr") ? contact.hours.fr : contact.hours.en}</li>}
          </ul>
          {social.length > 0 && (
            <ul className="mt-4 flex gap-4 text-sm">
              {social.map((item) => (
                <li key={item.url}><a href={item.url} target="_blank" rel="noopener noreferrer" className="text-white/70 hover:text-white">{item.network}</a></li>
              ))}
            </ul>
          )}
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-site flex-col gap-2 px-4 py-5 text-xs text-white/75 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <p>© {new Date().getFullYear()} {brand.legalName}. {t("site.footer.rights", "All rights reserved.")}</p>
          <p className="flex gap-4">
            <Link to="/privacy-policy" className="hover:text-white">{t("site.footer.privacy", "Privacy policy")}</Link>
            <Link to="/terms-of-service" className="hover:text-white">{t("site.footer.terms", "Terms of service")}</Link>
          </p>
        </div>
      </div>
    </footer>
  );
}
