import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { usePageMeta } from "@/lib/pageMeta";
import { Button } from "@/components/ui/button";
import { PlusMotif } from "@/components/brand/PlusMotif";
import { SiteHeader } from "@/features/site/SiteHeader";
import { SiteFooter } from "@/features/site/SiteFooter";

const NotFound = () => {
  const { t } = useTranslation();
  usePageMeta({ title: t("meta.notFound.title", "Page not found"), noindex: true });
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />
      <main id="main" className="mx-auto flex w-full max-w-site flex-1 flex-col items-start justify-center gap-8 px-4 py-16 sm:px-6 md:flex-row md:items-center md:justify-between lg:px-8">
        <div className="max-w-xl">
          <h1 className="text-poster text-4xl text-forest sm:text-5xl">{t("notFound.title", "This page does not exist.")}</h1>
          <p className="mt-4 text-lg leading-8 text-olive-ink/85">{t("notFound.body", "The link may be old or mistyped. The course catalogue lists everything that is published.")}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild size="lg"><Link to="/courses">{t("notFound.catalogue", "Browse courses")}</Link></Button>
            <Button asChild size="lg" variant="outline" className="text-forest"><Link to="/">{t("notFound.home", "Go to the home page")}</Link></Button>
          </div>
        </div>
        <PlusMotif variant="trail" size="min(70vw, 320px)" animate="once" />
      </main>
      <SiteFooter />
    </div>
  );
};

export default NotFound;
