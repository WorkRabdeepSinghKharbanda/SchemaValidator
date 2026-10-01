# Blog

- **Category:** Platform
- **Entry point:** `blog/index.html`, 15 posts at `blog/{slug}/index.html`, auto-discovered by `vite.config.ts` and `scripts/generate-sitemap.mjs`
- Static, no-React blog (same pattern as the SEO landing pages) with `BlogPosting` + `BreadcrumbList` JSON-LD per post, 1200-1600 words each, tied to a real shipped feature or a general JSON Schema concept; `blog/index.html` is the only listing page, so a new post must be linked there to be discoverable by visitors. Every post has a hand-curated "Related posts" section — add a new post to a few existing posts' related lists too, not just the index.
