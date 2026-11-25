import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { DEMO_MODE } from "./demo/config";
import { installDemoApi } from "./demo/api";
import { i18nReady } from "./i18n/config";
import { detectPrerender } from "./features/site/home/prerenderState";

if (DEMO_MODE) installDemoApi();

// Render once the reader's language has loaded (it downloads alongside the first page's code).
const container = document.getElementById("root")!;
detectPrerender(container);
const root = createRoot(container);
i18nReady.finally(() => root.render(<App />));

// Installable app with an offline copy of the interface. Not in the demo
// build or local development.
if (import.meta.env.PROD && !DEMO_MODE && "serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => undefined);
  });
}
