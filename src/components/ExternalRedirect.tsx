import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { ExternalLink } from "lucide-react";
import { Brand } from "@/components/shell/Brand";

/**
 * Old LMS routes for company pages (/about, /contact) now live on the
 * corporate site. Send visitors there, with a visible link in case the
 * redirect is blocked.
 */
export default function ExternalRedirect({ to }: { to: string }) {
  const { t } = useTranslation();
  useEffect(() => {
    window.location.replace(to);
  }, [to]);
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-6 text-center">
      <Brand />
      <p className="text-sm text-muted-foreground">{t("redirect.corporate", "This page is on the DATA+ company website.")}</p>
      <a href={to} className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline">
        {t("redirect.continue", "Continue to the DATA+ website")} <ExternalLink className="h-4 w-4" />
      </a>
    </main>
  );
}
