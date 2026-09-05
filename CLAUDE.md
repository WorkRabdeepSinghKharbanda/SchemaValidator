# CLAUDE.md — agent onboarding

## Read first (in order)
1. This file.
2. [README.md](README.md) — feature list + backlog, so you don't re-propose ideas already built or listed.
3. [src/lib/parse.ts](src/lib/parse.ts) and [src/lib/validate.ts](src/lib/validate.ts) — the two files carrying core validation logic.
4. [src/lib/](src/lib/) as a whole — every feature's logic lives here as a pure function; `App.tsx` only wires them together.

## What this is
Client-only React SPA that validates JSON / YAML / TOML / XML / CSV data against a JSON Schema (draft-07, 2019-09, or 2020-12), with `$ref` resolution against uploaded reference schemas. No backend, no server, no database — everything runs in the browser (Monaco itself is the one exception: it's fetched from a CDN at runtime — see README's "A note on Monaco and the CDN").

## Core validation control flow

```
User input (Schema pane, Data pane, Format tab, Toolbar)
         │
         ▼
  App.tsx holds all state: schemaText, dataText, format, draft, refSchemas,
  theme, realtime, batchMode, success/errors, history, workspaces, toasts
         │
         ├─ manual Validate click / Cmd+Enter / Cmd+S ──► handleValidate(saveHistory)
         ├─ realtime ON ──► debounced schemaText/dataText change ──► handleValidate(false)
         │
         ▼
   batchMode?
     │yes                                    │no
     ▼                                        ▼
 runBatchValidation()                   runSingleValidation()
   parse data as array                    parse(dataText, format) ──► parse error? ──► ErrorList + editor marker
   schema empty? ──► all rows valid             │ ok
   validate(item, schema) per row               ▼
   ──► BatchTable                        schema empty? ──► success
                                                │ no
                                                ▼
                                          parse(schemaText, "json")
                                                │ ok
                                                ▼
                                          validate(data, schema, {sourceText, sourceFormat, draft, schemaCacheKey, refSchemas})
                                          — ajv errors mapped to source line via jsonc-parser (JSON data only)
                                                │
                                                ▼
                                          ErrorList + EditorPane markers (Monaco squiggles)
```

Note: batch mode and single mode must both treat an empty schema pane as "trivially valid" (syntax-only check) — they diverged once (single mode did, batch mode errored on empty schema and spammed toasts under realtime), so if you touch either path, check the other still matches.

## Features, one by one

Each entry: what it does, where its logic lives, and the gotcha worth knowing before touching it.

- **Core validate** (`lib/parse.ts`, `lib/validate.ts`) — see control-flow diagram above. `validate()` takes an options object (`sourceText`, `sourceFormat`, `draft`, `schemaCacheKey`, `refSchemas`) rather than positional params — extend that object, don't add more positional args.

- **Multi-draft support** (`lib/validate.ts`) — `AJV_CLASS` maps `Draft` → the right Ajv class (draft-07 / 2019-09 / 2020-12). `DRAFTS = Object.keys(AJV_CLASS)` is exported and consumed by `Toolbar.tsx`'s dropdown. **New draft = add to `AJV_CLASS`, never add a second hardcoded list.**

- **Multi-format data** (`lib/parse.ts`, `lib/serialize.ts`) — `FORMATS` (JSON, YAML, TOML, XML, CSV) is the single source of truth, consumed by `FormatTabs.tsx`. **New format = new branch in both files' switches, never a second hardcoded list.** Only JSON gets exact line-number error mapping (via `validate.ts`'s `jsonc-parser` tree walk); YAML/TOML get an approximate line from the library's own error object; XML/CSV are message-only — Papa's CSV error `row` indexes post-`skipEmptyLines` rows, not raw file lines, so don't try to turn it into a line number without accounting for that (this was tried and reverted once already).

- **JSONC leniency** (`lib/parse.ts`'s `parseJson()`) — uses `jsonc-parser`'s `parse()`, not `JSON.parse`, so JSON/schema text tolerates comments and trailing commas. Deliberately the same library `validate.ts` uses for `parseTree()`-based error-line mapping — one JSON parser as the source of truth, not two that could disagree on what's valid. `EditorPane.tsx`'s Monaco JSON diagnostics set `allowComments`/`trailingCommas: "ignore"` to match — don't let the editor's linting drift stricter than what `parse()` actually accepts.

- **Compile caching** (`lib/validate.ts`) — `compile()` caches the compiled ajv validator keyed by `` `${draft}::${schemaCacheKey}` ``, capped at 20 entries (oldest evicted first), so realtime/debounced re-validation doesn't recompile an unchanged schema on every keystroke of the data pane. Callers build `schemaCacheKey` as `` `${schemaText}::refs:${refsCacheKey(refSchemas)}` `` — if you add anything else that affects compilation (e.g. a future custom-format registry), fold it into that key too, or stale compiled validators will silently apply the wrong rules.

- **Reference schemas / `$ref`** (`lib/refs.ts`, `ReferencesPanel`) — `ReferenceSchema {id, schema}`, uploaded via the schema pane's "⋯" menu. `validate()`'s `compile()` calls `ajv.addSchema(ref.schema, ref.id)` for each before compiling the main schema. `refsCacheKey()` folds the ref set into the compile cache key. **`refSchemas` is real app state now saved/restored with history and workspaces and share links** (this was a real bug once: restoring a saved workspace left whatever refs happened to be currently loaded in place, silently validating against the wrong `$ref` targets) — if you add another persistence surface (history, workspaces, share, or a future one), make sure it round-trips `refSchemas` too.

- **OpenAPI import** (`lib/openapi.ts`, `OpenApiImportPanel`) — `extractOpenApiSchemas()` pulls `components.schemas` (OpenAPI 3) or `definitions` (Swagger 2), rewrites internal `$ref`s from `#/components/schemas/Foo` to plain `"Foo"` (JSON-Pointer-unescaped and percent-decoded — ref segments are URI fragments). `handleImportOpenApi` in `App.tsx` then registers every *other* schema from the spec as a reference schema under that same plain name, filtering old refs with `Object.hasOwn` (not `in`, which walks the prototype chain and would wrongly match an id like `"toString"`). Refs outside `components/schemas`/`definitions` (parameters, responses, external files) can't be rewritten this way — `extractOpenApiSchemas` returns them as `unresolvedRefs` and the panel warns rather than letting them fail silently at ajv-compile time later. The panel tries JSON first, then YAML, since specs ship as either.

- **Batch validation mode** (`App.tsx`'s `runBatchValidation`, `BatchTable`) — validates each item of a top-level data array independently, shown as a pass/fail table with a progress bar. Must mirror single mode's "empty schema → trivially valid" behavior (see control-flow note above). Toggling batch mode on/off clears `dataMarkers`/`errors`/`success`/`batchRows` immediately — without that, stale single-mode error squiggles used to linger in the data editor after switching into batch mode.

- **Visual schema builder** (`lib/schemaFields.ts`, `SchemaBuilder`) — Code/Visual toggle above the schema pane. `schemaToFields(schema)` reads top-level `properties` into a flat `SchemaField[]`; `fieldsToSchema(fields, base)` writes it back, preserving each field's original nested shape (`properties`/`items`/etc.) whenever its `type` didn't change, so unrelated edits can't silently discard nested schemas. Flat top-level shape only — nested editing still requires Code mode. **The schema code editor stays visible and editable while Visual mode is showing** — `App.tsx` tracks `schemaParseResult` (not just the derived fields) precisely so the builder can render "fix it in Code mode" instead of an empty add-field form when the user has typed the schema into a syntax error; `SchemaBuilder` (and `handleSchemaFieldsChange`) must never render/run against an unparseable `schemaText`, or an edit in the builder will rebuild the whole schema from an empty `{}` base and silently discard everything (this was a real data-loss bug once).

- **Auto-fix** (`lib/autofix.ts`) — wraps `jsonrepair`, dynamic-imported only when the button is clicked. Only offered for JSON data with a plain parse error. Snapshots `dataText` before its `await` and re-checks it hasn't changed after — without that check, a fix computed against stale data could silently clobber edits the user made while the import was in flight (this happened once with both this and "Generate sample").

- **Sample data generator** (`lib/generate.ts`) — wraps `json-schema-faker`, dynamic-imported. Same stale-snapshot guard as auto-fix, plus uses `formatRef.current` (not the `format` closure) to serialize, since the target format can change while the import is in flight.

- **Format converter** (`FormatTabs.tsx`'s convert buttons, `lib/serialize.ts`) — `parse(dataText, format)` → `serialize(data, targetFormat)`, switches the format tab.

- **Schema inference** (`lib/infer.ts`) — `parse(dataText)` → `inferSchema(data)` → writes into the schema pane. Heuristic: arrays infer their shape from the first element only (documented limitation in the file).

- **Preset snippets** (`lib/presets.ts`) — merges a snippet into `schema.properties` under a generated key, only reachable from Code mode.

- **Live autocomplete** (`EditorPane.tsx`) — feeds the current schema into Monaco's built-in JSON language service whenever `liveSchema` changes. `monaco.languages.json.jsonDefaults.setDiagnosticsOptions` is a **global singleton** shared by every JSON model on the page, not a per-model API — calling it replaces the whole `schemas` array. With two `EditorPane`s both using `language="json"` (schema pane + data pane), a naive per-pane call wipes out the other pane's entry. The module-level `jsonSchemaRegistry` map (keyed by model `path`) and `syncJsonDiagnostics()` exist specifically to merge entries before every call — **never call `setDiagnosticsOptions` directly from anywhere else.**

- **Diff from last valid** (`App.tsx`'s `lastValidData`, `DiffView`) — keeps the data text as of the last successful validation; renders a line diff (via the `diff` package) against the current text on demand.

- **Shareable links** (`lib/share.ts`) — compresses `{schema, data, format, draft, refSchemas}` into the URL hash (lz-string), read back on mount via `readShareStateFromUrl()`. `isFormat()` gates the decoded format, and `draft`/`refSchemas` default safely (`"2020-12"` / `[]`) if absent, so both a corrupted link and an old link created before those fields existed degrade gracefully instead of crashing or silently applying the wrong draft (the latter was a real bug: a schema written for draft-07 could pass for the sender and silently fail differently for the recipient with no share-payload record of which draft was used).

- **History** (`lib/history.ts`) — localStorage list of past validations, capped at 20, only written on an explicit Validate/Cmd+S (never from realtime auto-validate, to avoid spamming entries). Stores `{schema, data, format, draft, refSchemas, valid}`; `loadHistory()` defaults missing `draft`/`refSchemas` on entries saved before those fields existed.

- **Saved workspaces** (`lib/workspaces.ts`) — named, user-pinned, unbounded (unlike history) schema/data pairs, same `{schema, data, format, draft, refSchemas}` shape and same backward-compatible defaulting on load. `SavedPanel` renders both history and workspaces as tabs of one drawer.

- **Export report / export docs** (`App.tsx`'s `handleExportReportJson`, `lib/docgen.ts`'s `generateSchemaDocs`) — downloads validation results as JSON, or a Markdown field table generated from the schema, respectively.

- **Branded PDF export** (`lib/pdf.ts`) — `exportValidationReportPdf`, `exportBatchReportPdf`, `exportSchemaDocsPdf`, all dynamic-importing `jspdf`/`jspdf-autotable` (both are large; keep them out of the main bundle). Every PDF shares the same look: a dark header band with the ◆ brand mark (drawn as a vector diamond via `doc.lines()`, not a font glyph — Unicode "◆" isn't reliably in jsPDF's built-in fonts), a full dark page background, and a footer with timestamp + page number, matching the app's own dark theme rather than a plain white report. `COLORS` in `pdf.ts` mirrors `App.css`'s CSS custom properties — if the theme palette changes, update both. Wired into three places: `ErrorList` (both the failure state and, since this was a real gap, the success/valid state — a passing result should be just as exportable as a failing one), `BatchTable`, and the schema pane's "Export field docs" menu (alongside the existing Markdown export, not replacing it).
  - **Multi-page gotcha**: for the two exports built on `autoTable()` (error list, batch table, docs table — anything that can paginate), page 1's dark background/header/logo are painted once before `autoTable()` runs, and every page's footer + every *subsequent* page's background/header are painted from inside `decoratePage()`, called via autoTable's `didDrawPage` hook. **Never call `addFooter` a second time after `autoTable()` returns** — `didDrawPage` already fires on the last page, so an extra call double-draws overlapping footer text (this was a real bug once). And never repaint the background/header for page 1 inside `didDrawPage` — page 1's own summary line (e.g. "✗ N errors found") is drawn *before* `autoTable()` is called, so redoing the full-page background fill there would paint over it; `decoratePage`'s `pageNumber > 1` guard exists specifically for this.

- **Schema diff** (`App.tsx`'s `schemaDiffTarget`, reuses `DiffView`) — schema pane's "⋯" menu has a "Compare with" `<select>` (rendered via `OverflowMenu`'s `extra` slot) listing saved workspace names; picking one shows a line diff of that workspace's schema vs. the current `schemaText` below the editors. Only compares schemas (not data) against saved workspaces, not live against each other — pick two workspaces by saving your current schema first if you need that.

- **Copy validation snippet** (`lib/snippet.ts`) — schema pane's "⋯" menu offers "Copy as Node.js snippet" / "Copy as Python snippet", each a self-contained ajv (Node) or `jsonschema` (Python) script templated with the current `schemaText` and `draft`, copied to the clipboard. Lets someone re-run the same check outside the browser (CI, a script) without us building a CLI or public API — both intentionally not built.

- **Plain-English error explanations** (`lib/explainError.ts`) — a static keyword → sentence lookup (no LLM call, keeps the app client-only/offline-capable) shown under each error row in `ErrorList` when the ajv `keyword` has an entry. `validate.ts`'s `ValidationError.keyword` is threaded through as `ErrorItem.keyword` — if you add a new mapped path from ajv errors to `ErrorItem`, carry `keyword` through too or explanations silently stop appearing for it.

- **Copy error list as GitHub issue markdown** (`lib/issueMarkdown.ts`) — failure state's "Copy as issue" button in `ErrorList` copies a markdown checklist (one `- [ ]` per error, format+draft in the heading) to the clipboard, for pasting straight into a bug tracker.

- **Schema summary** (`lib/summarizeSchema.ts`) — one-line plain-English summary ("Expects an object with N fields...") shown above the editors when the schema has top-level `properties`. Same "flat top-level shape" scope as `schemaFields.ts` — doesn't describe nested objects.

- **"Make optional" quick-fix** (`lib/requiredFix.ts`) — a `required`-keyword ajv error gets a one-click button that removes that property from the schema's `required` array. `validate.ts` threads ajv's `err.params.missingProperty` through as `ValidationError.missingProperty` → `ErrorItem.missingProperty` — carry it through if you touch that mapping again. `makeFieldOptional()` walks the schema by the error's `instancePath` (via `properties`/`items`, same shape-walking idea as `validate.ts`'s `locateNode`, but over the schema tree instead of the data tree) to find the right nested node, since the missing property can be inside a nested object.

- **Keyboard shortcuts modal** (`ShortcutsModal`) — opened by the Toolbar's "?" button or the `?` key itself. The `?` global listener in `App.tsx` guards against firing while typing inside Monaco or a text input (checks `e.target.closest(".monaco-editor")`) — don't remove that guard, or typing a literal "?" into schema/data text pops the modal.

- **Command palette** (`CommandPalette`, ⌘/Ctrl+K or Toolbar's "⌘K" button) — a searchable list of every cross-cutting action (validate, save, share, export, copy snippet, toggle batch/realtime, cycle theme, etc.), built as a plain array literal in `App.tsx` (`commands`) after all the handler functions it references are defined. **Only rendered while `paletteOpen` is true** (`{paletteOpen && <CommandPalette .../>}` in `App.tsx`) rather than always-mounted-but-hidden — that's deliberate: it lets `query`/`activeIndex` start fresh on every mount with no reset-on-open effect, and lets the input use plain `autoFocus` instead of a ref+`requestAnimationFrame` dance. Follow this "conditionally mount, don't hide" pattern for the same reason if you add another modal like it.

- **Three-way theme (dark/light/auto)** (`lib/theme.ts`) — `ThemePref` is `"dark" | "light" | "auto"`, persisted to `localStorage`; `resolveTheme(pref, systemPrefersDark)` collapses it to the actual `"dark" | "light"` used everywhere else (Monaco's `theme` prop, the `data-theme` attribute). `App.tsx` tracks `systemPrefersDark` via a `matchMedia("(prefers-color-scheme: dark)")` change listener so "auto" updates live if the OS theme flips while the tab is open. The Toolbar's theme button cycles dark → light → auto (`nextThemePref`) rather than a two-state toggle now — if you add a fourth theme, update `ORDER` in `lib/theme.ts`, not a component-local list.

- **Error search filter** (`ErrorList`) — a filter box appears once there are more than 5 errors, matching on path or message substring. Its reset-on-new-validation logic uses React's "adjust state during render" pattern (`if (errors !== prevErrors) { setPrevErrors(errors); setFilter(""); }`) instead of a `useEffect`, specifically to avoid the redundant extra-render `react(set-state-in-effect)` lint warning — keep that pattern if you touch this again rather than reintroducing an effect.

- **Editor status bar** (`EditorPane`) — a thin footer under each Monaco pane showing cursor line/column (via `editor.onDidChangeCursorPosition`, set up in `handleMount`) and character count (`value.length`). Required wrapping the `<Editor>` itself in a new `.editor-monaco-wrap` div: the old `.editor-pane > div:last-child { flex: 1 }` CSS rule assumed Monaco's own wrapper was always the pane's last child, which broke the moment the status bar became the new last child (it would have claimed the flex space instead of the editor). If you add another sibling after the editor, make sure it doesn't reintroduce that assumption.

- **Workspace backup export/import** (`lib/workspaces.ts`'s `exportWorkspacesBackup`/`importWorkspacesBackup`, wired into `SavedPanel`'s "Named" tab) — export downloads the full saved-workspaces list as one JSON file; import **merges** it into whatever's already saved locally (prepended, not replacing), re-generating every imported entry's `id` via `crypto.randomUUID()` so re-importing the same backup twice (or importing on a machine that already has workspaces) can't collide/overwrite by id. `importWorkspacesBackup` validates each entry has `name`/`schema`/`data` as strings and a valid `format` (via `parse.ts`'s `isFormat()` — the same gate `share.ts` uses for the same field from the same kind of untrusted-external-input trust boundary) before accepting it, and coerces a malformed `refSchemas` to `[]` rather than passing it through; a malformed file throws, caught by `App.tsx`'s `handleImportWorkspaces` and shown as a toast rather than corrupting `localStorage`. **Validate every field this way, not just some** — an earlier version of this validated `name`/`schema`/`data` but let `format` through unchecked, which would have restored a workspace with no active format tab (this repo's already been bitten by the equivalent gap for `draft`/`refSchemas` once, per the note below).

- **Editor font size / word wrap** (`Toolbar`'s Settings menu) — two more persisted `App.tsx` states (`editorFontSize`, `wordWrap`, both in `localStorage` the same way `theme` is) passed straight through as `EditorPane` props to Monaco's own `fontSize`/`wordWrap` options. Display-only, like `themePref` — not threaded through history/workspaces/share (that rule only covers state that affects *validation results*).

- **Focus mode** (`App.tsx`'s `focusMode`, toggled by the Toolbar's "⛶" button or the command palette) — pure CSS: adds a `focus-mode` class to the root `.app` div that `display: none`s `header`, `.toolbar`, and `.ad-slot` (see `App.css`). Not persisted (resets to off on reload) since it's a transient "hide the chrome for a bit" mode, not a preference. A fixed-position "Exit focus mode" button appears in its place since the Toolbar (which would otherwise hold the toggle) is itself hidden.

- **JSON path breadcrumb** (`lib/jsonPath.ts`'s `describeJsonPathAtOffset`, shown in `EditorPane`'s status bar for JSON panes only) — wraps `jsonc-parser`'s `getLocation()` rather than hand-rolling a second offset→path walk; same "one JSON parser as the source of truth" reasoning as `validate.ts`'s `locateNode` and `parse.ts`'s `parseJson()`. Computed from the cursor's character offset (`model.getOffsetAt(position)`, captured alongside line/column in `EditorPane`'s `onDidChangeCursorPosition` handler).

- **Custom preset snippets** (`lib/customPresets.ts`, `CustomPresetsPanel`) — user-defined field snippets alongside the built-in Email/UUID/Date presets, stored in `localStorage` as raw JSON **text** (not a parsed object), specifically so a temporarily-broken in-progress edit in the manage panel doesn't lose the snippet. Presets show up as `Insert: {label}` entries in the schema pane's "⋯" menu and the command palette, both calling the same `handleInsertPreset()` used by the built-ins after `JSON.parse`-ing the stored text.

- **Jump to first error** (`ErrorList`) — a button in the failure heading jumps to the first error that actually has a line number (`errors.find((e) => e.line)?.line`) — not necessarily `errors[0]`, since some errors (schema-level failures, non-JSON formats) have no line at all and the button doesn't render if none do.

- **Minimap toggle** (`Toolbar` Settings menu) — `minimapEnabled`, persisted like `wordWrap`/`editorFontSize`, passed to `EditorPane`'s `minimap` prop → Monaco's `options.minimap.enabled` (previously hardcoded `false`).

- **Copy JSON path** (`EditorPane`'s status bar) — the JSON-path breadcrumb (see below) is now a clickable button, not just a label: copies the path to the clipboard and flashes "Copied!" for 1.2s (`copyTimeoutRef`, cleared on unmount). JSON panes only, same as the breadcrumb itself.

- **Perf** — `EditorPane`, `SchemaBuilder`, and `DiffView` are all `React.lazy` + `Suspense` from `App.tsx` (Monaco is the app's single biggest dependency by far). `generateSample()` and `tryAutoFix()` dynamic-`import()` their libraries rather than importing them at module top level, so those libraries only load when the corresponding action actually runs.

UI organization: per-pane actions (infer, export docs, insert-preset, generate-sample, upload, manage references, OpenAPI import) live in that pane's own `OverflowMenu` (its header's "⋯"), not in the global `Toolbar` — keeps the top bar to cross-cutting controls only (draft version, realtime/batch settings, saved, share, theme). Follow this placement for new pane-specific actions; don't grow `Toolbar.tsx`.

## Tests
No test framework/dependency — `npm test` runs `node --experimental-strip-types --test src/lib/*.test.ts` (Node's built-in test runner + `assert`, both zero-dependency). Not every `lib/` file has a `.test.ts` yet; add one for new non-trivial pure logic (branching, recursion, edge cases), following `requiredFix.test.ts`/`summarizeSchema.test.ts` as examples. Import the module under test with an explicit `.ts` extension (`./foo.ts`, not `./foo`) — the strip-types loader doesn't do bundler-style extension resolution. **If the module under test itself imports other local `lib/` files** (e.g. `workspaces.ts` imports from `parse.ts`/`validate.ts`/`refs.ts`), those internal imports need the explicit `.ts` extension too, or the test run fails with `ERR_MODULE_NOT_FOUND` even though `tsc`/Vite build it fine — this repo's `tsconfig.app.json` already has `allowImportingTsExtensions: true`, so adding the extension doesn't break the app build. A `lib/` file that touches `localStorage` (like `workspaces.ts`) needs a tiny in-memory shim assigned to `globalThis.localStorage` at the top of its test file, since plain Node has no `localStorage` global — see `workspaces.test.ts`.

## Where logic lives — hard rule
- `lib/` = pure functions, **zero React imports**, unit-testable standalone. One file per concern (parse, validate, serialize, infer, generate, share, history, workspaces, presets, schemaFields, docgen, autofix, refs, openapi).
- `components/` = presentational only, no parsing/validation/storage logic inline.
- `hooks/` = generic React hooks with no app-specific logic (`useDebounce`).

## Conventions
- TypeScript strict mode.
- No new dependencies without first checking [README.md](README.md)'s backlog — the feature may already have a chosen library.
- No backend/server code, and no execution of arbitrary user-supplied code. This is a hard constraint: **CLI companion, browser extension, public API endpoint, AI-assisted fix suggestions, permalink shortening, and a custom-ajv-keyword sandbox are intentionally NOT built** — the first four need a server or a packaging step outside this SPA, the last would mean `eval`-ing user input. If asked to build one of these, say so explicitly and get sign-off first.
- Schemas are always JSON (JSON Schema spec), even though data can be JSON/YAML/TOML/XML/CSV.
- Theme tokens live in `App.css` under `:root[data-theme="dark"]` / `:root[data-theme="light"]` — never hardcode a color in a component, add a token instead.
- Any list that mirrors a `lib/` source of truth (supported formats, drafts, presets) must import it, not redeclare it. This bit us once already: `FormatTabs`/`Toolbar` had their own hardcoded lists that drifted from `parse.ts`/`validate.ts` before being fixed.
- **Any new state that affects validation results (draft, refSchemas, and anything added later) must be threaded through every persistence/restore surface**: history, saved workspaces, and share links. `refSchemas` and `draft` were both added to `App.tsx` state in an earlier round than the persistence surfaces knew about them, causing silent wrong-validation bugs on restore — check `lib/history.ts`, `lib/workspaces.ts`, and `lib/share.ts` together whenever you add validation-affecting state.
