import { readdirSync, statSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

const resolve = (p: string) => fileURLToPath(new URL(p, import.meta.url))
const rootDir = fileURLToPath(new URL('.', import.meta.url))

// Not a page directory even though it sits at repo root.
const EXCLUDED_TOP_LEVEL_DIRS = new Set([
  'node_modules', 'dist', 'src', 'public', '.git', '.claude', '.vercel', '.vscode',
])

function hasIndexHtml(dir: string): boolean {
  try {
    return statSync(`${dir}/index.html`).isFile()
  } catch {
    return false
  }
}

// Static, keyword-targeted landing pages + blog posts (SEO) — plain HTML, no React, so they're
// fully crawlable without executing JS. Discovered automatically: any top-level directory with
// an index.html becomes its own build entry (a landing page), and every `blog/<slug>/` directory
// becomes a blog post entry. Adding a new page/post is just adding its directory + index.html —
// no edit needed here. Still update public/sitemap.xml and public/llms.txt by hand for each one.
const input: Record<string, string> = { main: resolve('index.html') }

for (const name of readdirSync(rootDir, { withFileTypes: true })) {
  if (!name.isDirectory() || EXCLUDED_TOP_LEVEL_DIRS.has(name.name)) continue
  const dir = `${rootDir}${name.name}`
  if (name.name === 'blog') {
    if (hasIndexHtml(dir)) input.blog = `${dir}/index.html`
    for (const post of readdirSync(dir, { withFileTypes: true })) {
      if (post.isDirectory() && hasIndexHtml(`${dir}/${post.name}`)) {
        input[`blog-${post.name}`] = `${dir}/${post.name}/index.html`
      }
    }
    continue
  }
  if (hasIndexHtml(dir)) input[name.name] = `${dir}/index.html`
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: { input },
  },
})
