#!/usr/bin/env node
/**
 * TUBAL HUB static-site health check.
 *
 * No external dependencies are required. Blocking checks cover required files,
 * JSON validity, JavaScript syntax, and service-worker precache entries.
 * Static HTML references and duplicate IDs are reported as warnings first so
 * legacy pages can be cleaned up without making the initial baseline unusable.
 */
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const ROOT = process.cwd();
const REQUIRED_FILES = [
  "index.html",
  "manifest.json",
  "service-worker.js",
  "version.json",
];
const IGNORED_DIRS = new Set([
  ".git",
  "node_modules",
  ".firebase",
  "coverage",
  "dist",
  "build",
  "android-app",
]);
const IGNORED_JS_PARTS = new Set(["vendor", "vendors", "third_party", "third-party"]);
const errors = [];
const warnings = [];
const allFiles = [];

function walk(dir) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch (error) {
    errors.push("Cannot read directory " + path.relative(ROOT, dir) + ": " + error.message);
    return;
  }

  for (const entry of entries) {
    if (entry.name.startsWith(".") && entry.name !== ".github") {
      continue;
    }
    if (entry.isDirectory() && IGNORED_DIRS.has(entry.name)) {
      continue;
    }
    const absolute = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(absolute);
    } else if (entry.isFile()) {
      allFiles.push(path.relative(ROOT, absolute).split(path.sep).join("/"));
    }
  }
}

function existsRepoPath(relativePath) {
  const target = path.resolve(ROOT, relativePath);
  return target === ROOT || target.startsWith(ROOT + path.sep)
    ? fs.existsSync(target)
    : false;
}

function decodePath(value) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function resolveLocalReference(sourceFile, rawValue) {
  let value = rawValue.trim();
  if (
    !value ||
    value.startsWith("#") ||
    value.startsWith("//") ||
    /^(?:[a-z][a-z0-9+.-]*:)/i.test(value) ||
    value.includes("$" + "{") ||
    value.includes("{{") ||
    value.includes("<%")
  ) {
    return null;
  }

  value = value.split(/[?#]/, 1)[0];
  if (!value) return null;
  value = decodePath(value);

  // GitHub Pages project sites may use either repo-prefixed or site-root paths.
  value = value.replace(/^\/tubalhub(?=\/|$)/i, "");
  const base = value.startsWith("/")
    ? path.resolve(ROOT, "." + value)
    : path.resolve(ROOT, path.dirname(sourceFile), value);

  if (!(base === ROOT || base.startsWith(ROOT + path.sep))) return null;

  if (fs.existsSync(base)) {
    if (!fs.statSync(base).isDirectory()) return null;
    const indexPath = path.join(base, "index.html");
    return fs.existsSync(indexPath)
      ? null
      : path.relative(ROOT, indexPath).split(path.sep).join("/");
  }

  if (value.endsWith("/")) {
    const indexPath = path.join(base, "index.html");
    return path.relative(ROOT, indexPath).split(path.sep).join("/");
  }
  return path.relative(ROOT, base).split(path.sep).join("/");
}

for (const required of REQUIRED_FILES) {
  if (!existsRepoPath(required)) errors.push("Required file is missing: " + required);
}

walk(ROOT);

// Validate every repository JSON file outside generated/build folders.
const jsonFiles = allFiles.filter((file) => file.toLowerCase().endsWith(".json"));
for (const file of jsonFiles) {
  try {
    JSON.parse(fs.readFileSync(path.join(ROOT, file), "utf8"));
  } catch (error) {
    errors.push("Invalid JSON: " + file + " — " + error.message);
  }
}

// Syntax-check project JavaScript without executing it or installing dependencies.
const jsFiles = allFiles.filter((file) => {
  const parts = file.toLowerCase().split("/");
  return (
    file.toLowerCase().endsWith(".js") &&
    !file.toLowerCase().endsWith(".min.js") &&
    !parts.some((part) => IGNORED_JS_PARTS.has(part))
  );
});

for (const file of jsFiles) {
  const result = spawnSync(process.execPath, ["--check", path.join(ROOT, file)], {
    encoding: "utf8",
  });
  if (result.error || result.status !== 0) {
    const detail = (result.stderr || result.stdout || result.error?.message || "Unknown syntax error")
      .trim()
      .split("\n")
      .slice(0, 10)
      .join("\n");
    errors.push("JavaScript syntax error: " + file + (detail ? "\n  " + detail.replace(/\n/g, "\n  ") : ""));
  }
}

// Validate service-worker precache entries because a missing entry can make
// the entire service-worker installation fail.
const swPath = path.join(ROOT, "service-worker.js");
if (fs.existsSync(swPath)) {
  const sw = fs.readFileSync(swPath, "utf8");
  const shellMatch = sw.match(/\bAPP_SHELL\s*=\s*\[([\s\S]*?)\]/);
  if (shellMatch) {
    const entries = [...shellMatch[1].matchAll(/["']([^"']+)["']/g)].map((match) => match[1]);
    for (const entry of entries) {
      const missing = resolveLocalReference("service-worker.js", entry);
      if (missing) errors.push("Missing service-worker precache file: " + entry + " (resolved as " + missing + ")");
    }
  } else {
    warnings.push("Could not locate the APP_SHELL array in service-worker.js; precache entries were not checked.");
  }
}

// Warn about missing local static references in HTML. These are non-blocking on
// the first pass to expose legacy issues without creating a noisy red baseline.
const htmlFiles = allFiles.filter((file) => file.toLowerCase().endsWith(".html"));
const staticExtensions = /\.(?:html?|css|m?js|json|webmanifest|png|jpe?g|gif|webp|avif|svg|ico|woff2?|ttf|otf|eot|mp4|webm|mp3|wav|pdf|xml)(?:$)/i;
for (const file of htmlFiles) {
  let html;
  try {
    html = fs.readFileSync(path.join(ROOT, file), "utf8");
  } catch {
    continue;
  }

  const tagPattern = /<(script|img|source|video|audio|iframe|link|object|embed|a)\b([^>]*)>/gi;
  let tagMatch;
  while ((tagMatch = tagPattern.exec(html)) !== null) {
    const tag = tagMatch[1].toLowerCase();
    const attributes = tagMatch[2];
    const attrPattern = /\b(src|href|poster|data)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/gi;
    let attrMatch;
    while ((attrMatch = attrPattern.exec(attributes)) !== null) {
      const attr = attrMatch[1].toLowerCase();
      const rawValue = attrMatch[2] ?? attrMatch[3] ?? attrMatch[4] ?? "";
      const valuePath = rawValue.trim().split(/[?#]/, 1)[0];
      const isLinkResource = tag === "link" && attr === "href";
      const isStaticAnchor = tag === "a" && attr === "href" && staticExtensions.test(valuePath);
      const isAssetSource = attr === "src" || attr === "poster" || (tag === "object" && attr === "data");
      if (!(isLinkResource || isStaticAnchor || isAssetSource)) continue;
      if (tag === "iframe" && !staticExtensions.test(valuePath)) continue;
      if (tag === "source" && !staticExtensions.test(valuePath)) continue;
      if (isLinkResource && !staticExtensions.test(valuePath)) continue;
      const missing = resolveLocalReference(file, rawValue);
      if (missing) warnings.push("Missing local reference in " + file + ": " + rawValue + " (resolved as " + missing + ")");
    }
  }

  // Duplicate IDs are advisory during the initial baseline.
  const ids = new Map();
  const idPattern = /\bid\s*=\s*(?:"([^"]*)"|'([^']*)')/gi;
  let idMatch;
  while ((idMatch = idPattern.exec(html)) !== null) {
    const id = idMatch[1] ?? idMatch[2] ?? "";
    if (!id) continue;
    ids.set(id, (ids.get(id) || 0) + 1);
  }
  for (const [id, count] of ids) {
    if (count > 1) warnings.push("Duplicate HTML id in " + file + ': "' + id + '" (' + count + " occurrences)");
  }
}

console.log("TUBAL HUB Website Health Check");
console.log("Scanned " + htmlFiles.length + " HTML, " + jsFiles.length + " JavaScript, and " + jsonFiles.length + " JSON files.");
console.log("Blocking errors: " + errors.length + " | Advisory warnings: " + warnings.length);

for (const warning of warnings.slice(0, 25)) console.warn("WARN  " + warning);
if (warnings.length > 25) console.warn("WARN  ... and " + (warnings.length - 25) + " more warnings. See full workflow log if needed.");

if (errors.length) {
  for (const error of errors) console.error("ERROR " + error);
  console.error("Health check failed. Fix blocking errors before merging.");
  process.exitCode = 1;
} else {
  console.log("PASS  Required files, JSON, JavaScript syntax, and service-worker precache checks passed.");
}
