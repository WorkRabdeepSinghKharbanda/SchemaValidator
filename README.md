# Schema Validator

Client-only React app that validates JSON / YAML / TOML / XML / CSV data against a JSON Schema. No backend — everything runs in the browser.

**Live:** https://schema-validator-livid.vercel.app

For agent-facing architecture notes and control flow, see [CLAUDE.md](CLAUDE.md).

## Features

### Core validation
- JSON Schema validation (draft-07, 2019-09, 2020-12 — switchable) via [ajv](https://ajv.js.org/), with multi-file `$ref` resolution against uploaded reference schemas.
- **Auto-detect draft** — pasting a schema with a recognized `$schema` URI switches the draft dropdown to match.
- Syntax-only checking (no schema needed) for JSON, YAML, TOML, XML, CSV. JSON/schema text tolerates comments and trailing commas (JSONC-style).
- **Import from OpenAPI/Swagger** — upload a spec (JSON or YAML), pick one of its `components.schemas`/`definitions` entries to load into the schema pane; its sibling schemas are auto-added as reference schemas so `$ref`s between them resolve.
- **Batch validation mode** — validate an array of records, per-row pass/fail table with a progress bar; generate N sample records at once for batch testing; export failing rows only or as CSV.
- Real-time (debounced) validation toggle.

### Editor experience
- Monaco editor panes, resizable split, inline red-squiggle error markers at the exact line.
- **Live autocomplete + hover docs** in the data editor — the current schema is wired into Monaco's JSON language service, so typing data gets real IntelliSense.
- **Editor status bar** — line/column, a clickable JSON path breadcrumb (copies to clipboard), and character count.
- Adjustable **font size**, **word wrap**, and **minimap** toggle.
- **Focus mode** — hide the header/toolbar/ad slot for a distraction-free view.
- File upload and drag-and-drop for schema and data.

### Errors and fixes
- Click an error to jump the cursor to it, or use "Jump to first error." The error list is keyboard-navigable (arrow keys + Enter). Repeated errors (e.g. across array items) collapse into one expandable group instead of flooding the list.
- **Error search** — once there are more than a handful of errors, a filter box narrows the list by path or message.
- **Plain-English error explanations** — common ajv errors (missing required field, wrong type, pattern mismatch, etc.) get a one-line explanation, not just the raw ajv message.
- **Quick-fixes**: "Make optional" (loosens the schema for a missing-required-field error), "Convert to {type}" (fixes a wrong-type data value in place), and a live regex tester for `pattern` mismatches — plus a one-click **auto-fix** for common JSON slips (trailing commas, single quotes, unquoted keys) via `jsonrepair`.
- **Undo** — a one-click "Undo" on the success toast after any of the above, sample generation, preset insertion, or OpenAPI import.

### Schema tools
- **Visual schema builder** — a Code/Visual toggle above the schema editor lets you add/edit top-level fields (name, type, required, format) with no JSON typing; nested shapes are preserved when editing unrelated fields.
- **Schema inference** — generate a draft schema from pasted data.
- **Plain-English schema summary** — a one-line description of what the schema expects, shown above the editors.
- **Schema lint hints** — a collapsible list of best-practice suggestions (unset `additionalProperties`, a `required` field that's never declared, a single-value `enum`), separate from validation errors.
- **Schema diff** — compare the current schema against any saved workspace, line diff shown inline.
- **Custom preset snippets** — save your own field snippets (beyond the built-in Email/UUID/Date), insertable from the schema pane's "⋯" menu.
- **Sample data generator** — generate example data from a schema (json-schema-faker).
- **Format converter** — convert data between JSON/YAML/TOML/XML/CSV in place.

### Export and sharing
- **Export report** (JSON or a branded PDF) for both single and batch validation results, and **export field docs** (Markdown or PDF table generated from the schema, for sharing with non-engineers). PDFs share the app's dark theme and brand mark rather than a plain report.
- **Export as TypeScript interface** — a best-effort `.d.ts` generated from the schema.
- **Copy as code snippet** — one click copies a ready-to-run Node.js (ajv) or Python (jsonschema) script that re-runs the same check outside the browser.
- **Copy error list as a GitHub issue** — one click copies a markdown checklist of the current errors, ready to paste into a bug tracker.
- **Shareable links** — encode schema+data+format into the URL, no backend needed.
- **Session file export/import** — download/upload the full session as a JSON file, for schemas too large for a URL share link.

### Saving and history
- **Saved workspaces** — name and pin a schema/data pair for reuse, separate from the last-20 auto-saved recent history. Both live in one "Saved" drawer.
- **Pinned default workspace** — mark one saved workspace to auto-load on app start (unless a share link takes precedence).
- **Workspace backup** — export all saved workspaces as one JSON file, import (merges, doesn't overwrite) on another machine or as a manual backup.
- **Diff from last valid** — after an invalid edit, compare the current data against the last version that passed.

### Productivity
- **Command palette** — press `⌘/Ctrl+K` (or the toolbar button) to search and run any action without hunting through menus.
- **Keyboard shortcuts** — `⌘/Ctrl+Enter` to validate, `⌘/Ctrl+S` to save to history, `⌘/Ctrl+K` for the command palette, `?` for a shortcuts cheat-sheet.
- **Auto theme** — cycles dark → light → auto (follows your OS setting live), persisted.
- Premium dark-glass UI, full-height layout. Pane-specific actions live in each editor's own "⋯" menu rather than one crowded toolbar — the top bar only holds cross-cutting controls (draft, settings, saved, share, theme).
- **Mobile-usable** — below ~760px wide, the schema/data editors stack vertically instead of side-by-side, drawers go full-width, and the page scrolls normally instead of clipping.

## Local dev
```
npm install
npm run dev
```

## Tests
```
npm test
```
Runs `node --experimental-strip-types --test src/lib/*.test.ts` — Node's built-in test runner, no framework dependency. See [CLAUDE.md](CLAUDE.md)'s "Tests" section for conventions (explicit `.ts`/`.js` import extensions, a `localStorage` shim for files that touch it).

## Deploy
```
vercel --prod
```

## Supported formats
- **Schema**: JSON Schema (always authored as JSON), with `$ref` resolution against uploaded reference schemas (schema pane's "⋯" menu → Manage references).
- **Data**: JSON, YAML, TOML, XML, CSV (selectable via tabs). Precise error line numbers are only available for JSON; other formats report a message (YAML/TOML get an approximate line, XML/CSV are message-only).

## A note on Monaco and the CDN
The code editor (Monaco) is loaded from `cdn.jsdelivr.net` at runtime by `@monaco-editor/react`'s default loader — this is the library's documented behavior, not an oversight. A local self-hosted build was tried and reverted: this project's Rolldown-based Vite setup pulled in every Monaco language contribution (2.6MB+) and couldn't resolve Monaco's worker `?worker` imports cleanly. The CDN default keeps the app's own bundle small at the cost of needing network access to jsdelivr on first load. Revisit this if `vite-plugin-monaco-editor` (or similar) gets Rolldown support.

## Intentionally not built
These need a backend, a separate packaging step, or run arbitrary user code — all break the client-only constraint or the security model, see [CLAUDE.md](CLAUDE.md):
- CLI companion (`npx schema-validator ...`)
- Browser extension
- Public API endpoint for CI pipelines
- Inline AI-assisted fix suggestions (needs an LLM API key)
- Short/permalink URLs (needs a key-value backend — current share links are self-contained in the URL hash instead)
- Custom ajv keyword sandbox (would mean `eval`-ing user-supplied validation code in the page)
- Multi-tab sessions (multiple independent schema/data pairs open at once) — skipped for now to keep the single-session state model simple; worth adding if the "Saved workspaces" workflow proves too slow for people who juggle several schemas at once

## SEO
`index.html` carries a title/meta description/keywords, canonical URL, `robots`/`googlebot` directives, a full Open Graph + Twitter Card block (including a real 1200×630 `og:image`/`twitter:image` — see below), a `WebApplication` JSON-LD block, favicons at multiple sizes (SVG + 16/32px PNG + a 180px apple-touch-icon), and `preconnect`/`dns-prefetch` hints for the Monaco CDN. `public/robots.txt` points at the live URL; `public/site.webmanifest` covers PWA/installability (32px/512px PNG icons, the 512px one doubling as a maskable variant, alongside the SVG). Most of it is hardcoded to `https://schema-validator-livid.vercel.app/` — **update that URL in `index.html` and `public/robots.txt` together if the app ever moves to a real domain** (e.g. schema.validator.com); `public/sitemap.xml` is generated (see below), so it just needs a rebuild.

**`public/sitemap.xml` is generated at build time**, not hand-maintained: `npm run build`'s `prebuild` step runs `scripts/generate-sitemap.mjs`, which reads the same `scripts/routes.mjs`'s `discoverPages()` that `vite.config.ts` uses for build entries — one source of truth for "what pages exist," so the sitemap can never list a page that isn't built or omit one that is. `lastmod` per URL comes from `git log`'s last commit date for that file (falls back to today for an uncommitted new page). **Never hand-edit `public/sitemap.xml`** — it's overwritten on the next build.

**Google Search Console** is verified two ways at once: `index.html`'s `google-site-verification` meta tag (HTML tag method, URL-prefix property — this host doesn't give us DNS control for the Domain-property method) and `public/googlef5c77d483d2cbbec.html` (HTML-file method) at the site root. No `vercel.json` rewrites exist, so the static file is served as-is rather than swallowed by any SPA catch-all. `public/sitemap.xml` is submitted under Sitemaps in the verified property.

`public/og-image.png` is a real branded image (dark background, the app's actual gradient mark and tagline), not a placeholder — rendered once from a small standalone HTML file at exact 1200×630 via a headless browser screenshot, the same way the `public/icon-512.png`/`apple-touch-icon.png`/`favicon-*.png` set was generated from the existing `favicon.svg` design. If the brand visuals ever change, regenerate these the same way rather than hand-editing the PNGs.

### Landing pages
16 static, keyword-targeted landing pages — format validators (`json-validator/`, `yaml-validator/`, `openapi-validator/`, `csv-validator/`, `toml-validator/`, `xml-validator/`) and feature pages (`json-schema-generator/`, `sample-json-generator/`, `json-to-typescript/`, `json-yaml-converter/`, `json-schema-linter/`, `regex-tester/`, `batch-json-validator/`, `json-schema-diff/`, `json-repair/`, `json-schema-docs-generator/`) — each real prose, FAQ, `FAQPage` + `BreadcrumbList` JSON-LD, canonical/OG tags, plain HTML with no React so they're fully indexable without executing JS, unlike the main `#root` app. Each cross-links to a handful of related pages plus `/blog/`. FAQ content (including a few disambiguation entries, like `xml-validator` clarifying it isn't an XSD validator) is grounded in real search-query data in `.claude/brain/seo/keywords.md`, not guessed.

`vite.config.ts`/`scripts/generate-sitemap.mjs` **both import `scripts/routes.mjs`'s `discoverPages()`**: any top-level directory with an `index.html` becomes a landing-page entry, every `blog/<slug>/` directory becomes a blog-post entry, every `tools/<slug>/` directory becomes a hub-page entry — no edit needed in either file for a new page. **Adding one still needs**: the new dir + `index.html`, a line in `public/llms.txt`'s page list, a cross-link from a couple of related existing pages, and (if it's a tool, not a post/hub) an entry + breadcrumb hub assignment per the Tool hubs section below.

### Tool hubs and breadcrumbs
`tools/index.html` lists two category hubs — `tools/format-validators/` and `tools/schema-tools/` — each with an `ItemList` JSON-LD block grouping the 16 landing pages. Every landing page, blog post, and hub page carries a visible breadcrumb nav plus matching `BreadcrumbList` JSON-LD (landing pages: `Home > Tools > {Hub} > {Page}`; posts: `Home > Blog > {Post}`), which is the actual hub-and-spoke navigation backbone — not the (deliberately short) app/page footers. A landing page not added to its hub's list and breadcrumb is an orphan reachable only by direct link.

### Blog
`blog/index.html` lists posts; each post lives at `blog/{slug}/index.html` — same static-HTML-no-React pattern as the landing pages, sharing `public/landing.css`, with `BlogPosting` + `BreadcrumbList` JSON-LD. 16 posts as of writing (1200-1600 words each, with a "How to use it"/"Where other approaches fall short"/"Everyday use cases"/FAQ structure), each tied to a real app feature (schema inference, TypeScript export, linting, the regex tester, batch mode, `$ref` resolution, auto-fix, docs export, format conversion) or a general JSON Schema concept (draft differences, `anyOf`/`oneOf`, YAML vs JSON). One post, [`what-is-json-schema`](blog/what-is-json-schema/index.html), is a from-scratch beginner's guide (what JSON is, what a schema is, a worked example, common beginner mistakes) — every other post links to it via a small `.beginner-note` line right after the lede, so a reader who's lost can start there instead of bouncing off a post that assumes prior knowledge. **Adding a post** = new `blog/{slug}/index.html` (auto-discovered by both `vite.config.ts` and `scripts/generate-sitemap.mjs`) + a link from `blog/index.html` (the only place posts are listed for visitors) + a few "Related posts" cross-links on existing posts + `public/llms.txt`. `wordCount` in the `BlogPosting` JSON-LD is computed from the actual rendered body — recompute it if you substantially edit a post's length.

### AI crawlers
`public/robots.txt` explicitly allows the major AI crawlers/agents (GPTBot, ChatGPT-User, ClaudeBot, anthropic-ai, Claude-User, PerplexityBot, Google-Extended, CCBot) alongside the wildcard `Allow: /` — belt-and-suspenders since most already fall under `*`, but explicit entries are what these bots' own docs recommend checking for. `public/llms.txt` (the emerging llms.txt convention) gives LLM-based crawlers/agents a plain-markdown summary of what the app does, its pages, and a note that validation runs client-side with no API endpoint to call.

One real gap, not fixed here:
- **This is a client-only SPA with no server-side rendering.** `#root` is empty until JavaScript runs — the `<noscript>` block in `index.html` gives crawlers a fallback description, and modern Googlebot does execute JS, but there's no static HTML content for a crawler that doesn't. If organic search ranking matters more than it does today, revisit static generation (e.g. prerendering just this one page) — that would need a build-step change, not just meta tags.

## Monetization: Google AdSense
The AdSense Auto ads loader script is a static `<script async>` tag in every page's `<head>` — `index.html` and all ~30 static landing/blog pages — loaded unconditionally on every page view. **This is not gated behind cookie consent.** That's a deliberate owner decision, made with the GDPR/AdSense-policy tradeoff explicitly flagged beforehand (loading ad scripts before consent is a compliance risk for EEA/UK visitors) — see [CLAUDE.md](CLAUDE.md)'s AdSense entry before "fixing" this back to consent-gated.

[src/lib/adsense.ts](src/lib/adsense.ts) holds the publisher ID (`ADSENSE_PUBLISHER_ID`) and `isAdsConfigured()`. [src/components/AdSlot.tsx](src/components/AdSlot.tsx) renders a real `<ins class="adsbygoogle">` unit whenever `isAdsConfigured()` is true, framed in a max-width container so a full-width-responsive unit can't stretch edge-to-edge or crowd nearby content — otherwise it falls back to a placeholder box of the same size. A [ConsentBanner](src/components/ConsentBanner.tsx) is still shown once (choice persisted via [src/lib/consent.ts](src/lib/consent.ts)) for disclosure, but neither Accept nor Decline affects whether the ad script loads. A [Privacy Policy modal](src/components/PrivacyPolicyModal.tsx), linked from the footer and the consent banner, documents what's actually stored locally and links to Google's ad-personalization opt-out.

**Status:** the real publisher ID (`ca-pub-5852027898822024`) is wired in — `ADSENSE_PUBLISHER_ID` in `src/lib/adsense.ts`, `index.html`'s `google-adsense-account` meta tag and script tag, every static page's script tag, and `public/ads.txt`'s pub ID all match.

Manual `<ins class="adsbygoogle">` units also sit on every blog post and `blog/index.html` (content pages) — plain static HTML, styled via `public/landing.css`'s copy of the same `.ad-slot-frame` classes. The interactive app itself keeps only the one footer slot, on purpose (an ad shouldn't interrupt someone mid-validation).

**Status:** all manual ad units — the app's `<AdSlot id="3418754801">` and every blog page's `<ins data-ad-slot="3418754801">` — use the same real "CommonAd" ad-unit slot ID, created in the AdSense dashboard. The same unit can safely render in multiple placements/pages at once.

**Related posts:** every blog post ends with a "Related posts" section (3 hand-picked links to topically-adjacent posts) — more pageviews per session, and it's genuinely useful, not just an ad-impressions trick. `blog/index.html` doesn't need one (it already lists everything).

**Keep adding content:** SEO/content pages compound over months, not days — periodically adding new landing pages (a new supported keyword/feature angle) and blog posts (tied to a real shipped feature, per CLAUDE.md's rule) is expected ongoing maintenance, not a one-time task.

## Analytics: Google Analytics (gtag.js)
Google's standard gtag.js snippet (Measurement ID `G-SEEZP9MLKB`) is the first thing inside `<head>` on every page — `index.html` and all static landing/blog pages — loaded unconditionally, same as AdSense and for the same reason (see [CLAUDE.md](CLAUDE.md)'s AdSense entry). Hardcoded per page rather than a shared constant, since these are static files.

## Remaining backlog
- Custom ajv keywords/formats, user-registrable (see "Intentionally not built" — the sandboxing question needs resolving first).
- Full accessibility pass (some ARIA/keyboard work landed — dialog roles, Escape-to-close, labeled icon buttons — but no screen-reader testing has been done).
- i18n — translatable error messages.
- Further code-splitting: `fast-xml-parser`/`papaparse` are still in the main bundle (loaded eagerly since `parse`/`serialize` are synchronous); only `json-schema-faker` and `jsonrepair` were split out via dynamic `import()`.
