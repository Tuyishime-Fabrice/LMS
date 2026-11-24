import { usePageMeta } from "@/lib/pageMeta";
import { useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useEffect } from "react";

const NotFound = () => {
  const { t } = useTranslation();
  usePageMeta({ title: t("meta.notFound.title", "Page not found"), noindex: true });
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted">
      <div className="text-center">
        <h1 className="mb-4 text-4xl font-bold">404</h1>
        <p className="mb-4 text-xl text-muted-foreground">{t("notFound.oopsPageNotFound", "Oops! Page not found")}</p>
        <a href="/" className="text-info underline hover:text-info">
          {t("notFound.returnToHome", "Return to Home")}
        </a>
      </div>
    </div>
  );
};

export default NotFound;
