# Blog

- **Category:** Platform
- **Entry point:** `blog/index.html`, 13 posts at `blog/{slug}/index.html`, auto-discovered by `vite.config.ts`
- Static, no-React blog (same pattern as the SEO landing pages) with `Article` JSON-LD per post, each tied to a real shipped feature; `blog/index.html` is the only listing page, so a new post must be linked there to be discoverable by visitors. Every post also has a hand-curated "Related posts" section (3 links) — add a new post to a few existing posts' related lists too, not just the index.
