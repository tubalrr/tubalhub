import { cpSync, existsSync, mkdirSync, statSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));
const outputDir = resolve(projectRoot, "dist");
mkdirSync(outputDir, { recursive: true });

// Source files stay in Git, while public legacy URLs now render the new React experience.
const legacyPaths = [
  "admin", "app", "pages", "assets", "lifehub", "css", "js", "components",
  "data", "v2", "v4.1", "embed.js", "lifehub-calendar.html", "tubal-dark.html",
  "messenger-apk-design.html", "license.html", "manifest.json", "version.json",
  "robots.txt", "sitemap.xml", "404.html", "service-worker.js", "sw.js",
  "firebase-messaging-sw.js"
];

for (const relativePath of legacyPaths) {
  const source = resolve(projectRoot, relativePath);
  if (!existsSync(source)) continue;
  const destination = resolve(outputDir, relativePath);
  if (statSync(source).isDirectory()) cpSync(source, destination, { recursive: true, force: true });
  else cpSync(source, destination, { force: true });
}

const rootHomepage = resolve(outputDir, "index.html");
const baseHref = "/tubalhub/";
let shell = readFileSync(rootHomepage, "utf8");
if (!/<base\b/i.test(shell)) {
  shell = shell.replace(/<head\b[^>]*>/i, (headTag) => headTag + '\n    <base href="' + baseHref + '">');
}
writeFileSync(rootHomepage, shell, "utf8");

function collectHtmlFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = resolve(directory, entry.name);
    if (entry.isDirectory()) return collectHtmlFiles(fullPath);
    return entry.isFile() && /\.html?$/i.test(entry.name) ? [fullPath] : [];
  });
}

function titleFromPath(relativePath) {
  const filename = relativePath.split("/").pop() || "index.html";
  return filename.replace(/\.html?$/i, "").replace(/[-_]+/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

function makeRouteShell(relativePath) {
  const routeTitle = titleFromPath(relativePath).replace(/[<&>"]/g, "");
  const canonical = "https://tubalrr.github.io/tubalhub/" + relativePath;
  let page = shell;
  page = page.replace(/<title>[\s\S]*?<\/title>/i, "<title>TUBAL HUB — " + routeTitle + "</title>");
  page = page.replace(/<link\b[^>]*rel=["']canonical["'][^>]*>/i, '<link rel="canonical" href="' + canonical + '">');
  page = page.replace(/<meta\b[^>]*property=["']og:url["'][^>]*>/i, '<meta property="og:url" content="' + canonical + '">');
  page = page.replace(/<meta\b[^>]*name=["']description["'][^>]*>/i, '<meta name="description" content="Explore ' + routeTitle + ' in the redesigned TUBAL HUB ecosystem.">');
  return page;
}

const htmlPages = collectHtmlFiles(outputDir);
let convertedPages = 0;
for (const htmlPath of htmlPages) {
  if (htmlPath === rootHomepage) continue;
  const relativePath = relative(outputDir, htmlPath).split(sep).join("/");
  // Global Chat is a working Firebase-backed application, not a generic React landing shell.
  // Preserve its source HTML and module scripts so its real-time listeners, rules, and callables run.
  if (relativePath === "pages/chat.html") continue;
  writeFileSync(htmlPath, makeRouteShell(relativePath), "utf8");
  convertedPages += 1;
}

console.log("Replaced the old page markup at " + convertedPages + " public legacy URLs with the new React page shell.");
