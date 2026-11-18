import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { DEMO_MODE } from "./demo/config";
import { installDemoApi } from "./demo/api";

if (DEMO_MODE) installDemoApi();

createRoot(document.getElementById("root")!).render(<App />);

// Installable app with an offline copy of the interface. Not in the demo
// build or local development.
if (import.meta.env.PROD && !DEMO_MODE && "serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => undefined);
  });
}
