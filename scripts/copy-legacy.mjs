import { cpSync, existsSync, mkdirSync, statSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve, basename, dirname, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));
const outputDir = resolve(projectRoot, "dist");
mkdirSync(outputDir, { recursive: true });

// Preserve the existing front-end routes and the folders their HTML pages depend on.
const legacyPaths = [
  "app",
  "pages",
  "assets",
  "lifehub",
  "css",
  "js",
  "components",
  "data",
  "embed.js",
  "lifehub-calendar.html",
  "tubal-dark.html",
  "messenger-apk-design.html",
  "license.html",
  "tubal-hub-logo.png",
  "tubalhub-hero-bg.jpg",
  "manifest.json",
  "version.json",
  "robots.txt",
  "sitemap.xml",
  "404.html",
  "service-worker.js",
  "sw.js",
  "firebase-messaging-sw.js",
];

for (const relativePath of legacyPaths) {
  const source = resolve(projectRoot, relativePath);
  if (!existsSync(source)) continue;
  const destination = resolve(outputDir, relativePath);
  if (statSync(source).isDirectory()) {
    cpSync(source, destination, { recursive: true, force: true });
  } else {
    cpSync(source, destination, { force: true });
  }
}

// Apply one shared design layer to every legacy HTML page copied into the deployment.
// The new root React homepage is intentionally excluded because it has its own stylesheet.
const unifiedThemePath = resolve(outputDir, "assets/css/tubal-hub-unified-theme.css");
const rootHomepage = resolve(outputDir, "index.html");
const themeVersion = "20261018-unified1";

function collectHtmlFiles(directory) {
  const entries = readdirSync(directory, { withFileTypes: true });
  return entries.flatMap((entry) => {
    const fullPath = resolve(directory, entry.name);
    if (entry.isDirectory()) return collectHtmlFiles(fullPath);
    return entry.isFile() && /\.html?$/i.test(entry.name) ? [fullPath] : [];
  });
}

function unifiedThemeHref(filePath, html) {
  const baseTag = html.match(/<base\b[^>]*href\s*=\s*["']([^"']+)["']/i);
  let effectiveBase = dirname(filePath);

  if (baseTag) {
    const rawBase = baseTag[1].split(/[?#]/, 1)[0];
    if (/^https?:\/\//i.test(rawBase)) {
      try {
        return new URL("assets/css/tubal-hub-unified-theme.css?v=" + themeVersion, rawBase).href;
      } catch {
        // Fall through to a relative link if the base URL is malformed.
      }
    } else if (rawBase.startsWith("/")) {
      // GitHub Pages is hosted beneath a project path; the document's root
      // directory is the correct reference point for project-relative assets.
      effectiveBase = outputDir;
    } else if (rawBase) {
      effectiveBase = resolve(dirname(filePath), rawBase);
    }
  }

  let href = relative(effectiveBase, unifiedThemePath).split(sep).join("/");
  if (!href) href = basename(unifiedThemePath);
  return href + "?v=" + themeVersion;
}

let themedPages = 0;
for (const htmlPath of collectHtmlFiles(outputDir)) {
  if (htmlPath === rootHomepage) continue;
  const html = readFileSync(htmlPath, "utf8");
  if (!/<\/head\s*>/i.test(html)) continue;
  if (html.includes("tubal-hub-unified-theme.css")) continue;

  const href = unifiedThemeHref(htmlPath, html);
  const linkTag = '\n<link rel="stylesheet" href="' + href + '" data-tubal-unified-theme>\n';
  const updatedHtml = html.replace(/<\/head\s*>/i, linkTag + "</head>");
  writeFileSync(htmlPath, updatedHtml, "utf8");
  themedPages += 1;
}

console.log("Preserved existing TUBAL HUB routes and applied the unified theme to " + themedPages + " legacy HTML pages.");
