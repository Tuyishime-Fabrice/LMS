import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { DEMO_MODE } from "./demo/config";
import { installDemoApi } from "./demo/api";

if (DEMO_MODE) installDemoApi();

createRoot(document.getElementById("root")!).render(<App />);
