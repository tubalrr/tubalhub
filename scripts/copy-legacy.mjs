import { cpSync, existsSync, mkdirSync, statSync } from "node:fs";
import { resolve, basename } from "node:path";
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

console.log("Preserved available legacy hub routes in dist.");
