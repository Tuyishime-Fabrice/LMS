/**
 * Builds the demo (sample data, no Supabase, no server keys) into dist-demo/:
 *   npm run build:demo
 * The output uses hash URLs and relative paths, so it works from any static
 * host or sub-folder. dist-demo/page.html is the page body for hosts that add
 * their own <html>/<head> (claude.ai artifacts); index.html is a normal page.
 */
import { build } from 'vite';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = path.join(root, 'dist-demo');

process.env.VITE_DEMO_MODE = 'true';
process.env.VITE_HASH_ROUTER = 'true';
await build({ root, base: './', mode: 'production', logLevel: 'warn', build: { outDir, emptyOutDir: true } });

// Images referenced as "/images/..." in the source would break under a sub-folder.
for (const file of fs.readdirSync(path.join(outDir, 'assets'))) {
  if (!file.endsWith('.js')) continue;
  const full = path.join(outDir, 'assets', file);
  const source = fs.readFileSync(full, 'utf8');
  const fixed = source
    .replace(/(["'`])\/(images|videos|demo)\//g, '$1$2/')
    .replace(/(["'`])\/(image[0-9]+\.jpg|placeholder\.svg|favicon\.(?:png|ico))/g, '$1$2');
  if (fixed !== source) fs.writeFileSync(full, fixed);
}

// Server files that make no sense in a static demo.
for (const name of ['_headers', '_redirects', 'robots.txt', 'sitemap.xml']) fs.rmSync(path.join(outDir, name), { force: true });
for (const name of fs.readdirSync(outDir)) if (/^google.*\.html$/.test(name)) fs.rmSync(path.join(outDir, name));

const html = fs.readFileSync(path.join(outDir, 'index.html'), 'utf8');
const css = html.match(/href="\.\/(assets\/index-[^"]+\.css)"/)[1];
const js = html.match(/src="\.\/(assets\/index-[^"]+\.js)"/)[1];
fs.writeFileSync(path.join(outDir, 'page.html'), `<title>DATA+ Academy LMS</title>
<meta name="description" content="Clickable demo of the DataPlus Academy learning platform, with sample data.">
<link rel="icon" href="favicon.png" type="image/png">
<link rel="stylesheet" href="${css}">
<div id="root"></div>
<script type="module" crossorigin src="${js}"></script>
`);
console.log(`Demo built in ${path.relative(root, outDir)}/`);
