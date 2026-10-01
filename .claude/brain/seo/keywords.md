# Keyword research — raw signal, not volumes

Source: Google's public autocomplete endpoint (`suggestqueries.google.com`), queried 2026-10-01 for
each page's `{seed}` / `{seed} online` / `{seed} free` / `how to {seed}` / `best {seed}` /
`{seed} alternative`. This is **demand signal from what people actually type**, not search volume —
no Semrush/Ahrefs connected this round. Raw JSON (96 base queries + 7 follow-ups) is in
`keywords.json`. Regenerate by re-running the same query set if this goes stale (autocomplete
results drift over time) — don't hand-edit `keywords.json`, it's a data dump.

## Page-by-page takeaways (used to drive titles/H2s/FAQs in this content round)

- **json-validator** (46 unique suggestions, strong volume) — "json validator **and fixer/corrector**"
  appears repeatedly → strengthens the json-validator ↔ json-repair cross-link. "json validator
  **with schema**" / "online json validator against schema" → the page's core pitch already matches.
  IDE-specific intent ("in vscode", "in notepad++", "in postman", "in rest assured") → worth one FAQ
  line clarifying this is a browser tool, not an IDE plugin, pointing to the "Copy as snippet" feature
  for CI/script use instead of inventing IDE integration we don't have.

- **yaml-validator** (32 unique) — "yaml validator **cli**", "yaml validator **for kubernetes**" →
  FAQ should honestly note no CLI exists (intentionally not built, per README) while still landing
  the "validate K8s manifests" use case in prose (already true — YAML + JSON Schema is exactly how
  you'd check a manifest). "lint yaml" phrasing as common as "validate yaml" → use both terms in copy.

- **toml-validator** (6 unique, thin — mostly off-topic noise like "spring validator example") —
  genuinely low direct search demand for this format specifically. Don't over-invest; keep the
  existing page, rely on internal linking rather than inventing demand that isn't there.

- **xml-validator** (42 unique, strong volume) — **dominant intent is XSD validation**
  ("validator against xsd", "with xsd", "xsd" in ~15 of 42 suggestions). This tool validates XML
  against a JSON Schema, not an XSD — a real mismatch between searcher intent and what the page
  offers. Must be stated clearly and early (not buried) so an XSD-seeking visitor isn't misled, even
  though it costs some of that traffic. The generic "xml checker/tester online" (format-agnostic
  syntax check) intent is a genuine match.

- **csv-validator** (24 unique) — "how to check csv **encoding**/**is utf8**" is a distinct, real
  sub-intent this tool doesn't address (we validate structure/values against a schema, not file
  encoding) — worth a one-line FAQ disambiguation. "csv validator python/js/github" → people often
  want a library, not a browser tool; the "Copy as Node/Python snippet" feature is the actual answer
  to that intent, worth surfacing.

- **openapi-validator** (25 unique) — explicit draft/version intent ("openapi 3.1 validator",
  "openapi 3.0 validator") → worth naming OpenAPI 3.0/3.1 and Swagger 2.0 explicitly rather than
  just "OpenAPI/Swagger".

- **json-schema-generator** (27 unique) — "json schema generator online **draft 7**" → mention draft
  selection explicitly. "json schema **form** generator" is a distinct intent (generating a UI form
  from a schema) this tool doesn't do — don't claim it.

- **sample-json-generator** (11 unique) — "sample json generator **from schema**" is an exact match
  for what this page already does.

- **json-to-typescript** (30 unique, strong volume) — most variants ask for **interface** specifically
  (matches what this tool produces), but "class"/"model"/"type" variants exist too — one FAQ line
  clarifying this generates a `.d.ts`-style `interface`, not a class, is worth it. Also: several
  queries assume converting raw JSON *data* to TS, but this tool converts a JSON **Schema** to TS —
  a real distinction worth stating up front.

- **json-yaml-converter** (24 unique) — **"is yaml better than json" / "yaml vs json example"** is a
  genuinely good, distinct blog-post topic (comparison, not instructional) not currently covered.

- **json-schema-linter** (4 unique, thin) — low volume; keep existing content, no major rewrite
  priority.

- **regex-tester** (31 unique, strong volume) — dominated by language-specific intent ("regex tester
  python/js/java/c#/php/powershell"). This tool tests against a schema's `pattern` keyword using JS
  regex semantics specifically — worth being explicit that results may differ from another language's
  regex engine (this is already covered in the existing "How the JSON Schema pattern keyword
  actually works" blog post; the landing page's FAQ should say it too, not just the post).

- **batch-json-validator** (re-queried with broader phrasing after the original seed returned
  nothing) — genuinely low/no direct search demand for "batch validate JSON against schema" as a
  phrase, in any wording tried. This is a real, useful feature but not one people are searching for
  by name — treat it as an internal-linking target (from json-validator, csv-validator, the sample
  generator) rather than a page we expect to rank on its own search term.

- **json-schema-diff** (14 unique) — "difference between **anyOf and oneOf**" is a distinct, good
  FAQ addition (a real, common JSON Schema confusion, unrelated to the diff *feature* itself but a
  natural question for anyone on a "json schema diff" search).

- **json-repair** (26 unique, strong volume) — confirms existing content direction. "json_repair
  **pip/pypi**" queries are for the unrelated Python package of the same name — not something to
  chase.

- **json-schema-docs-generator** (5 unique, thin) — low volume, direct-match terms only.

## New content this round, driven by the above
- **New blog post**: "YAML vs JSON: when to use which" (`is yaml better than json` / `yaml vs json
  example`) — comparison angle, not currently covered by any existing post.
- **New blog post**: "anyOf vs oneOf in JSON Schema: what's the difference" (`difference between
  anyof and oneof`) — common point of confusion, ties into the schema-diff and schema-generator pages.
- Existing pages/posts get FAQ additions per the disambiguation notes above (XSD, CSV encoding,
  interface-vs-class, language-specific regex dialects, CLI-not-built) rather than fabricated
  capabilities to chase the mismatched intent.
