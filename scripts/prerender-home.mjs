// Puts a build-time render of the home page's header and hero into dist/index.html, in English
// and French, hidden. A small inline script shows the matching language on "/" for signed-out
// visitors before the first paint; on every other route it is removed. React replaces it with
// identical markup when it starts. If anything here fails, the build keeps the plain index.html.
import { readFile, writeFile } from "node:fs/promises";

// The Vite server compiles JSX for React's development runtime; a production build step
// leaves NODE_ENV=production behind, so set it back before React loads.
process.env.NODE_ENV = "development";
const { createServer } = await import("vite");

const out = process.argv[2] || "dist";
const file = `${out}/index.html`;

const pick = `(function(){var r=document.getElementById("root");var keep=null;try{if(location.pathname==="/"&&!Object.keys(localStorage).some(function(k){return /^sb-.+-auth-token$/.test(k)})){var l=(localStorage.getItem("i18nextLng")||navigator.language||"en").slice(0,2).toLowerCase();keep=l==="fr"?"fr":"en";}}catch(e){}var n=r.querySelectorAll("[data-prerender]");for(var i=0;i<n.length;i++){if(n[i].getAttribute("data-prerender")===keep){n[i].hidden=false;}else{n[i].parentNode.removeChild(n[i]);}}if(keep)document.documentElement.lang=keep;})();`;

try {
  const vite = await createServer({ server: { middlewareMode: true }, appType: "custom", logLevel: "error" });
  try {
    const { renderHome } = await vite.ssrLoadModule("/src/prerender/renderHome.tsx");
    const [en, fr] = await Promise.all([renderHome("en"), renderHome("fr")]);
    const html = await readFile(file, "utf8");
    if (!html.includes('<div id="root"></div>')) throw new Error("no empty #root in index.html");
    const root = `<div id="root"><div data-prerender="en" hidden>${en}</div><div data-prerender="fr" hidden>${fr}</div></div><script>${pick}</script>`;
    await writeFile(file, html.replace('<div id="root"></div>', root));
    console.log(`prerender-home: header and hero written into ${file}`);
  } finally {
    await vite.close();
  }
} catch (error) {
  console.warn(`prerender-home: skipped (${error instanceof Error ? error.message : error}); the plain index.html is used`);
}
