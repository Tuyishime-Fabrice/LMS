import { renderToString } from "react-dom/server";
import { StaticRouter } from "react-router-dom/server";
import { createInstance } from "i18next";
import { I18nextProvider, initReactI18next } from "react-i18next";
import { AuthProvider } from "@/contexts/AuthContext";
import { SiteHeader } from "@/features/site/SiteHeader";
import { HomeHero } from "@/features/site/home/HomeHero";
import en from "@/i18n/locales/en.json";
import fr from "@/i18n/locales/fr.json";

/**
 * Build-time render of the home page's first screen (header and hero), used by
 * scripts/prerender-home.mjs to put real markup in index.html. It paints before any JavaScript
 * runs; React then replaces it with the same markup. The trail motif is left out so it draws once, with React. Data-driven parts (the next cohort date)
 * are left out here and arrive with React into a slot whose size is already reserved.
 */
export async function renderHome(language: "en" | "fr"): Promise<string> {
  const i18n = createInstance();
  await i18n.use(initReactI18next).init({
    lng: language,
    fallbackLng: "en",
    resources: { en: { translation: en }, fr: { translation: fr } },
    interpolation: { escapeValue: false },
    react: { useSuspense: false },
  });
  return renderToString(
    <I18nextProvider i18n={i18n}>
      <StaticRouter location="/">
        <AuthProvider>
          <SiteHeader />
          <main id="main">
            <HomeHero cohort={null} prerender />
          </main>
        </AuthProvider>
      </StaticRouter>
    </I18nextProvider>,
  );
}
