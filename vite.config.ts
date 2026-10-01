import { fileURLToPath } from 'node:url'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { discoverPages } from './scripts/routes.mjs'

const resolve = (p: string) => fileURLToPath(new URL(p, import.meta.url))
const rootDir = fileURLToPath(new URL('.', import.meta.url)).replace(/\/$/, '')

// Static, keyword-targeted landing pages + blog posts + tool hubs (SEO) — plain HTML, no React,
// so they're fully crawlable without executing JS. `discoverPages()` (scripts/routes.mjs) is the
// single source of truth for "what pages exist" — scripts/generate-sitemap.mjs builds
// public/sitemap.xml from the exact same list, so the build and the sitemap can never drift.
// Adding a new page/post/hub is just adding its directory + index.html — no edit needed here.
// Still update public/llms.txt by hand for each one (not derivable from the filesystem).
const input: Record<string, string> = {}
for (const { routePath, htmlPath } of discoverPages(rootDir)) {
  const name = routePath === '/' ? 'main' : routePath.replace(/^\/|\/$/g, '').replace(/\//g, '-')
  input[name] = resolve(htmlPath.slice(rootDir.length + 1))
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: { input },
  },
})
