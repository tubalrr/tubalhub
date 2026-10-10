# TUBAL HUB — Code Audit
**Date:** 2026-10-10  
**Branch reviewed:** `main`  
**Scope:** repository structure, homepage asset loading, service-worker caching, selected JavaScript, Firestore rules, and Node/Firebase package configuration.

## Summary

The repository is a sizeable multi-page static web app with Firebase/Firestore, Cloud Functions, a separate AI backend, and a PWA service worker. This was a source-level audit, not a full browser/device test or a deployed Firebase rules test.

## Confirmed issue fixed

### P1 — Dynamic content cache TTL was not enforced
**File:** `service-worker.js`  
**Evidence:** `cachedContent()` returned the cached response in both the fresh and expired branches, so the declared five-minute `CONTENT_TTL` had no effect. A stale cached Feeds/Events page could be returned after a network failure indefinitely.

**Change made:** expired content now returns `null`, allowing the existing fallback chain to decide whether to use a stale response only as an offline fallback. The shell cache version was incremented to trigger installation of the corrected service worker.

## Findings to address next

### P1 — Review admin authorization model and migrate to custom claims
**Files:** `firestore.rules`, `functions/index.js`  
The admin helper grants admin access based on a verified hard-coded email as well as the `admin` custom claim. This is explicit in the rules and server code, and the rules themselves note a planned migration. Prefer a server-managed custom claim, audit every admin callable/function, and test authorization with emulator tests before changing production rules. Do not remove the existing path until the replacement is verified.

### P1 — Verify email validation regex in homepage subscription flow
**File:** `assets/js/home.js`  
The source contains `/^[^\\\\s@]+@gmail\\\\.com$/i` in the `isRealGmail()` function. The doubled escapes in a regex literal appear to match literal backslash sequences rather than the intended whitespace and dot rules. Confirm with targeted positive/negative unit tests, then correct the regex if those tests reproduce the issue. This was not changed in this pass to avoid altering a large homepage module without its related tests.

### P2 — Homepage loads many overlapping stylesheets
**File:** `index.html`  
The homepage loads numerous global/home CSS layers together, including `home.css`, `home-premium.css`, `home-corporate.css`, `home-obsidian-polish.css`, `home-tailwind-alignment.css`, `home-overrides.css`, and `hero-reference.css`. This layering increases CSS download/parse work and makes cascade conflicts harder to diagnose. Measure rendered styles first, then consolidate only verified duplicate rules and remove a stylesheet only after visual regression checks.

### P2 — Large single-file modules increase regression and debugging risk
**Files:** `assets/js/home.js` (~2,614 lines), `assets/js/feeds.js` (~948 lines), `functions/index.js` (~1,973 lines), `assets/js/home.js` and `assets/js/feeds.js`  
The homepage and backend files combine many responsibilities. Split by feature/service after adding tests around subscription, presence, feed pagination, and admin operations. Avoid a broad refactor in the same change as bug fixes.

### P2 — Add automated validation before future commits
**Files:** root, `functions/package.json`, `ai-backend/package.json`  
The Functions package has a `node --check index.js` lint script, but the AI backend only defines `start`; no repository-wide test/lint workflow was visible in the reviewed tree. Add CI checks for JavaScript syntax, dependency install/build where applicable, and focused tests for cache TTL, email validation, feed pagination, and authorization rules.

### P3 — Cache policy and cache-version maintenance need a documented convention
**Files:** `service-worker.js`, `index.html`  
Asset URLs use a mixture of fixed version strings and dated/manual cache-busting values, while the service-worker shell cache has its own version. Document a single release/cache-busting convention and verify that every changed static asset referenced by HTML receives a new URL or an appropriate cache invalidation.

## Duplicate-code / maintainability observations

- Homepage CSS is split into many layers with overlapping responsibilities. Treat this as a high-probability cascade/duplication area, not proof that every file contains duplicate declarations.
- The project has multiple JavaScript entry points and feature modules under `assets/js/`, `js/`, `lifehub/`, `v2/`, and `v4.1/`. Confirm which are active routes before removing legacy files; do not delete based on naming alone.
- The same broad application concerns (authentication, notifications, chat, feed content) span frontend modules and Cloud Functions. Define clear ownership boundaries and shared contracts rather than copying validation logic across client/server.

## Validation status

- [x] Read the current `main` tree and selected source files from GitHub.
- [x] Fixed the stale dynamic-content TTL logic in `service-worker.js`.
- [ ] Browser smoke test on desktop and mobile.
- [ ] Offline/online test for Feeds and Events.
- [ ] Unit tests for `isRealGmail()`.
- [ ] Firebase Emulator tests for Firestore rules and admin authorization.
- [ ] Measure page load and CSS coverage before any stylesheet consolidation.

## Recommended order

1. Test the service-worker fix in a deployed preview and verify offline fallback.
2. Add tests and confirm/fix the homepage Gmail validation regex.
3. Add emulator tests for Firestore rules and admin callables.
4. Measure homepage CSS and remove only demonstrably unused/duplicated rules.
5. Split the large modules in small, independently testable changes.
