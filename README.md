# Schema Validator

Client-only React app that validates JSON / YAML / TOML data against a JSON Schema. No backend — everything runs in the browser.

**Live:** https://schema-validator-livid.vercel.app

For agent-facing architecture notes and control flow, see [CLAUDE.md](CLAUDE.md).

## Features
- JSON Schema validation (draft-07, 2019-09, 2020-12 — switchable) via [ajv](https://ajv.js.org/), with multi-file `$ref` resolution against uploaded reference schemas.
- **Import from OpenAPI/Swagger** — upload a spec (JSON or YAML), pick one of its `components.schemas`/`definitions` entries to load into the schema pane; its sibling schemas are auto-added as reference schemas so `$ref`s between them resolve.
- Syntax-only checking (no schema needed) for JSON, YAML, TOML, XML, CSV. JSON/schema text tolerates comments and trailing commas (JSONC-style).
- Monaco editor panes, resizable split, inline red-squiggle error markers at the exact line.
- **Live autocomplete + hover docs** in the data editor — the current schema is wired into Monaco's JSON language service, so typing data gets real IntelliSense.
- Click an error to jump the cursor to it. Repeated errors (e.g. across array items) collapse into one expandable group instead of flooding the list.
- **Auto-fix** — one click repairs common JSON slips (trailing commas, single quotes, unquoted keys) via `jsonrepair`.
- Real-time (debounced) validation toggle.
- **Visual schema builder** — a Code/Visual toggle above the schema editor lets you add/edit top-level fields (name, type, required, format) with no JSON typing; nested shapes are preserved when editing unrelated fields.
- **Schema inference** — generate a draft schema from pasted data.
- **Sample data generator** — generate example data from a schema (json-schema-faker).
- **Format converter** — convert data between JSON/YAML/TOML in place.
- **Shareable links** — encode schema+data+format into the URL, no backend needed.
- **File upload and drag-and-drop** for schema and data.
- **Saved workspaces** — name and pin a schema/data pair for reuse, separate from the last-20 auto-saved recent history. Both live in one "Saved" drawer.
- **Batch validation mode** — validate an array of records, per-row pass/fail table with a progress bar.
- **Diff from last valid** — after an invalid edit, compare the current data against the last version that passed.
- **Export report** (JSON or a branded PDF) for both single and batch validation results, and **export field docs** (Markdown or PDF table generated from the schema, for sharing with non-engineers). PDFs share the app's dark theme and brand mark rather than a plain report.
- **Schema diff** — compare the current schema against any saved workspace, line diff shown inline.
- **Copy as code snippet** — one click copies a ready-to-run Node.js (ajv) or Python (jsonschema) script that re-runs the same check outside the browser.
- **Plain-English error explanations** — common ajv errors (missing required field, wrong type, pattern mismatch, etc.) get a one-line explanation, not just the raw ajv message.
- **Copy error list as a GitHub issue** — one click copies a markdown checklist of the current errors, ready to paste into a bug tracker.
- **Plain-English schema summary** — a one-line description of what the schema expects, shown above the editors.
- **"Make optional" quick-fix** — a missing-required-field error gets a one-click button to loosen the schema instead of hand-editing it.
- **Keyboard shortcuts modal** — press `?` (or the toolbar button) for a cheat-sheet of every shortcut.
- **Command palette** — press `⌘/Ctrl+K` (or the toolbar button) to search and run any action without hunting through menus.
- **Auto theme** — theme now cycles dark → light → auto (follows your OS setting live), not just a two-way toggle.
- **Error search** — once there are more than a handful of errors, a filter box narrows the list by path or message.
- **Editor status bar** — line/column, JSON path breadcrumb, and character count shown under each editor pane.
- **Workspace backup** — export all saved workspaces as one JSON file, import (merges, doesn't overwrite) on another machine or as a manual backup.
- **Editor font size / word wrap** — adjustable from the Settings menu.
- **Focus mode** — hide the header/toolbar/ad slot for a distraction-free view, toggled from the toolbar or command palette.
- **Custom preset snippets** — save your own field snippets (beyond the built-in Email/UUID/Date), insertable from the schema pane's "⋯" menu.
- **Jump to first error** — one click from the failure heading to the first error with a known line.
- **Minimap toggle** and **click-to-copy JSON path** in the editor status bar.
- **Auto-detect draft** — pasting a schema with a recognized `$schema` URI switches the draft dropdown to match.
- **Session file export/import** — download/upload the full session as a JSON file, for schemas too large for a URL share link.
- **Pinned default workspace** — mark one saved workspace to auto-load on app start (unless a share link takes precedence).
- **Batch table: export failing rows only** — pull just the broken records out of a large batch run.
- **Undo** — a one-click "Undo" on the success toast after auto-fix, sample generation, "Make optional", preset insertion, or OpenAPI import.
- **Export as TypeScript interface** — a best-effort `.d.ts` generated from the schema.
- **Type-coercion quick-fix** — a wrong-type data error gets a "Convert to {type}" button alongside the fix-the-schema options.
- **Batch mode: generate N samples** — fill the data pane with N valid sample records at once for batch testing.
- **Keyboard shortcuts** — Cmd/Ctrl+Enter to validate, Cmd/Ctrl+S to save to history.
- Dark/light theme, persisted.
- Premium dark-glass UI, full-height layout. Pane-specific actions live in each editor's own "⋯" menu rather than one crowded toolbar — the top bar only holds cross-cutting controls (draft, settings, saved, share, theme).

## Local dev
```
npm install
npm run dev
```

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
`index.html` carries a title/meta description/keywords, canonical URL, Open Graph + Twitter card tags, and a `WebApplication` JSON-LD block. `public/robots.txt` and `public/sitemap.xml` point at the live URL; `public/site.webmanifest` covers basic PWA/installability signals. All of it is hardcoded to `https://schema-validator-livid.vercel.app/` — **update that URL in `index.html`, `public/robots.txt`, and `public/sitemap.xml` together if the app ever moves to a real domain** (e.g. schema.validator.com).

Two real gaps, not fixed here:
- **No OG image.** The Open Graph/Twitter tags have no `og:image`/`twitter:image` — social link previews will show no thumbnail. Needs an actual 1200×630 PNG designed and dropped into `public/`, then referenced from `index.html`; not something to fake with a placeholder.
- **This is a client-only SPA with no server-side rendering.** `#root` is empty until JavaScript runs — the `<noscript>` block in `index.html` gives crawlers a fallback description, and modern Googlebot does execute JS, but there's no static HTML content for a crawler that doesn't. If organic search ranking matters more than it does today, revisit static generation (e.g. prerendering just this one page) — that would need a build-step change, not just meta tags.

## Monetization hook
[src/components/AdSlot.tsx](src/components/AdSlot.tsx) is a placeholder ad unit rendered at the bottom of the page (`<AdSlot id="footer" />` in `App.tsx`). Swap its inner div for an ad network's script/tag when ready — isolated in its own component so ad code never touches the validator logic.

## Remaining backlog
- Custom ajv keywords/formats, user-registrable (see "Intentionally not built" — the sandboxing question needs resolving first).
- Full accessibility pass (some ARIA/keyboard work landed — dialog roles, Escape-to-close, labeled icon buttons — but no screen-reader testing has been done).
- i18n — translatable error messages.
- Further code-splitting: `fast-xml-parser`/`papaparse` are still in the main bundle (loaded eagerly since `parse`/`serialize` are synchronous); only `json-schema-faker` and `jsonrepair` were split out via dynamic `import()`.
