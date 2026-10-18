# TUBAL HUB — Three Brands. One Hub.

The premium landing page is built with React, TypeScript, Vite, Tailwind CSS v4, and Lucide React.

## Local development

Requires Node.js 22.12+ (Node 24 is used by the deployment workflow).

```bash
npm install
npm run dev
```

## Production build

```bash
npm run typecheck
npm run build
npm run preview
```

The build outputs to `dist/`. The post-build script copies existing `app/`, `pages/`, and `assets/` routes where present, so the existing hub pages can remain reachable alongside the landing page.

## GitHub Pages deployment

The workflow at `.github/workflows/deploy-pages.yml` builds and deploys the landing page from `main`. After merging this change, open **Settings → Pages** and set the build/deployment source to **GitHub Actions** if the repository is still configured to publish from a branch.

## Contact form

There is intentionally no authentication, database, or form backend. Submitting the form validates the fields and opens the visitor's default email application with a prefilled message to `tubalrr@gmail.com`. The page does not store or send the message itself.

## Before public launch

- Verify the requested `12k+` members and `9 cities` figures; they are displayed as supplied and are not independently verified by the landing page.
- Replace general social/search URLs with confirmed official brand profiles.
- Confirm the Pexels image choices and replace them if any asset no longer fits the brand.
- Run a production build and review the GitHub Actions deployment log before announcing the site.
