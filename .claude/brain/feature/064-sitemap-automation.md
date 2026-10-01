# Sitemap Automation

- **Category:** Platform
- **Entry point:** `scripts/routes.mjs` (`discoverPages()`), `scripts/generate-sitemap.mjs`, `package.json`'s `prebuild` script
- `public/sitemap.xml` is generated at build time from the same route-discovery logic `vite.config.ts` uses for build entries, with `lastmod` per URL from git's last commit date — never hand-edited, never drifts from what's actually built.
