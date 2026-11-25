import i18n, { type BackendModule, type ReadCallback } from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

/**
 * Translations load per language, on demand: a visitor downloads only the language they read
 * (each file is about 190 KB raw), instead of both inside the main script.
 * `i18nReady` resolves once the first language is in; main.tsx waits for it before rendering,
 * so no key ever flashes on screen. Switching language loads the other file first, then re-renders.
 */
const lazyLocales: BackendModule = {
  type: 'backend',
  init: () => undefined,
  read(language: string, _namespace: string, callback: ReadCallback) {
    const lng = language.startsWith('fr') ? 'fr' : 'en';
    const load = lng === 'fr' ? import('./locales/fr.json') : import('./locales/en.json');
    load.then((module) => callback(null, module.default)).catch((error) => callback(error, false));
  },
};

export const i18nReady = i18n
  .use(lazyLocales)
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    supportedLngs: ['en', 'fr'],
    nonExplicitSupportedLngs: true,
    load: 'languageOnly',
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
    },
    react: { useSuspense: false },
  });

export default i18n;

// Screen readers and search engines read the page language from <html lang>.
i18n.on('languageChanged', (lng) => {
  if (typeof document !== 'undefined') document.documentElement.lang = lng.startsWith('fr') ? 'fr' : 'en';
});
