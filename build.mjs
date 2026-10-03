// Genera dist/: solo los archivos públicos del sitio, optimizados para producción.
//   node build.mjs            → producción
//   node build.mjs --preview  → igual, pero pide a los buscadores no indexar nada
//
// Qué hace:
// - Copia solo lo público (no sube .claude, .agents, .gemini, .impeccable ni documentos internos).
// - Une fonts.css + íconos + styles.css en UN css minificado, y config + translations + main en UN js.
// - Les pone una huella en el nombre (site.3f9a1c.css) para poder cachearlos 1 año:
//   si cambias el archivo, cambia el nombre y el navegador descarga la versión nueva.
// No necesita instalar nada: solo Node.
import { cpSync, rmSync, mkdirSync, existsSync, readdirSync, statSync, readFileSync, writeFileSync, appendFileSync } from "node:fs";
import { join } from "node:path";
import { createHash } from "node:crypto";

const OUT = "dist";
const PREVIEW = process.argv.includes("--preview");
// --base=/repo/ cuando el sitio vive en una subcarpeta (GitHub Pages sin dominio propio).
// Solo afecta a 404.html, que usa rutas absolutas porque se muestra en cualquier dirección.
const BASE = (process.argv.find((a) => a.startsWith("--base=")) || "--base=/").slice(7).replace(/\/?$/, "/");
// --site=https://usuario.github.io/repo  → dirección pública real del sitio.
// Reemplaza https://locker10.gt en las etiquetas para Google y redes, sitemap.xml y robots.txt.
// Sin --site se usa https://locker10.gt (el dominio propio, cuando lo conectes).
const SITE = (process.argv.find((a) => a.startsWith("--site=")) || "--site=https://locker10.gt").slice(7).replace(/\/$/, "");
const withSite = (text) => (SITE === "https://locker10.gt" ? text : text.split("https://locker10.gt").join(SITE));
const HTML = ["index.html", "privacidad.html", "terminos.html", "404.html"];
const STATIC = [
  "favicon.svg", "favicon-32.png", "apple-touch-icon.png", "site.webmanifest",
  "robots.txt", "sitemap.xml", "_headers", "img", "fonts",
  "vendor/phosphor/regular/Phosphor.woff2", "vendor/phosphor/light/Phosphor-Light.woff2", "vendor/phosphor/fill/Phosphor-Fill.woff2",
];
const CSS_PARTS = [
  ["css/fonts.css", null],
  ["vendor/phosphor/regular/style.css", "../vendor/phosphor/regular/"],
  ["vendor/phosphor/light/style.css", "../vendor/phosphor/light/"],
  ["vendor/phosphor/fill/style.css", "../vendor/phosphor/fill/"],
  ["css/styles.css", null],
];
const JS_PARTS = ["js/config.js", "js/translations.js", "js/main.js"];

const missing = [...HTML, ...STATIC, ...CSS_PARTS.map((p) => p[0]), ...JS_PARTS, "js/boot.js"].filter((f) => !existsSync(f));
if (missing.length) { console.error("Faltan archivos: " + missing.join(", ")); process.exit(1); }

rmSync(OUT, { recursive: true, force: true });
mkdirSync(join(OUT, "assets"), { recursive: true });
// Los .json junto a las imágenes registran su origen (licencia); no se publican.
for (const item of STATIC) cpSync(item, join(OUT, item), { recursive: true, filter: (src) => !src.endsWith(".json") || src.endsWith(".webmanifest") });

const hash = (s) => createHash("sha256").update(s).digest("hex").slice(0, 8);

// Minificador de CSS conservador: quita comentarios y espacios que no cambian el significado.
function minifyCss(css) {
  return css
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\s+/g, " ")
    .replace(/\s*([{};,>])\s*/g, "$1")
    .replace(/;}/g, "}")
    .trim();
}

// CSS: los íconos usan rutas relativas (./Phosphor.woff2) que se ajustan a la nueva ubicación.
const rawCss = CSS_PARTS.map(([file, base]) => {
  let text = readFileSync(file, "utf8");
  if (base) text = text.replace(/url\("\.\/([^"]+)"\)/g, `url("${base}$1")`);
  return text;
}).join("\n");
const rawJs = JS_PARTS.map((f) => `/* ${f} */\n` + readFileSync(f, "utf8")).join("\n;\n");
const rawBoot = readFileSync("js/boot.js", "utf8");

// Minificación con esbuild (npm install). Si no está instalado, se usa el minificador simple de CSS
// y el JS va sin minificar: el sitio funciona igual, solo pesa un poco más.
let css = minifyCss(rawCss), js = rawJs, boot = rawBoot;
try {
  const { transform } = await import("esbuild");
  css = (await transform(rawCss, { loader: "css", minify: true })).code;
  js = (await transform(rawJs, { loader: "js", minify: true, target: "es2018" })).code;
  boot = (await transform(rawBoot, { loader: "js", minify: true, target: "es2018" })).code;
} catch (e) {
  console.warn("Aviso: esbuild no está instalado (ejecuta npm install). JS sin minificar.");
}

const cssName = `assets/site.${hash(css)}.css`;
const jsName = `assets/site.${hash(js)}.js`;
const bootName = `assets/boot.${hash(boot)}.js`;
writeFileSync(join(OUT, cssName), css);
writeFileSync(join(OUT, jsName), js);
writeFileSync(join(OUT, bootName), boot);

// HTML: cambia los <link>/<script> sueltos por los archivos unidos (rutas relativas o absolutas, según la página)
for (const page of HTML) {
  let html = readFileSync(page, "utf8");
  const pre = page === "404.html" ? "/" : "";
  html = html.replace(/(?:\s*<link rel="stylesheet" href="\/?(?:css|vendor)\/[^"]+">)+/, `\n  <link rel="stylesheet" href="${pre}${cssName}">`);
  html = html.replace(/<script src="\/?js\/boot\.js"><\/script>/, `<script src="${pre}${bootName}"></script>`);
  html = html.replace(/(?:\s*<script src="\/?js\/(?:config|translations|main)\.js"><\/script>)+/, `\n  <script src="${pre}${jsName}"></script>`);
  if (/(?:href|src)="\/?(?:css|js)\//.test(html)) { console.error(`${page}: quedó una referencia a css/ o js/ sin unir`); process.exit(1); }
  if (page === "404.html" && BASE !== "/") html = html.replace(/(href|src)="\/(?!\/)/g, `$1="${BASE}`);
  writeFileSync(join(OUT, page), withSite(html));
}

for (const f of ["sitemap.xml", "robots.txt"]) writeFileSync(join(OUT, f), withSite(readFileSync(join(OUT, f), "utf8")));

// GitHub Pages: que no procese el sitio con Jekyll (respeta carpetas y archivos tal cual)
writeFileSync(join(OUT, ".nojekyll"), "");

if (PREVIEW) {
  writeFileSync(join(OUT, "robots.txt"), "# Vista previa: no indexar\nUser-agent: *\nDisallow: /\n");
  appendFileSync(join(OUT, "_headers"), "\n# Vista previa: que ningún buscador la indexe\n/*\n  X-Robots-Tag: noindex, nofollow\n");
}

function size(path) {
  const s = statSync(path);
  return s.isDirectory() ? readdirSync(path).reduce((t, n) => t + size(join(path, n)), 0) : s.size;
}
console.log(`dist/ listo${PREVIEW ? " (VISTA PREVIA, sin indexar)" : ""}: ${(size(OUT) / 1024).toFixed(0)} KB`);
console.log(`  ${cssName} ${(css.length / 1024).toFixed(1)} KB · ${jsName} ${(js.length / 1024).toFixed(1)} KB`);
