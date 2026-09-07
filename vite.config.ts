import { fileURLToPath } from 'node:url'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

const resolve = (p: string) => fileURLToPath(new URL(p, import.meta.url))

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    // Static, keyword-targeted landing pages (SEO) — plain HTML, no React, so they're fully
    // crawlable without executing JS. Add a new one here + its dir + sitemap.xml + llms.txt.
    rollupOptions: {
      input: {
        main: resolve('index.html'),
        'yaml-validator': resolve('yaml-validator/index.html'),
        'openapi-validator': resolve('openapi-validator/index.html'),
        'csv-validator': resolve('csv-validator/index.html'),
        'json-validator': resolve('json-validator/index.html'),
        'toml-validator': resolve('toml-validator/index.html'),
        'xml-validator': resolve('xml-validator/index.html'),
        blog: resolve('blog/index.html'),
        'blog-json-schema-draft-differences': resolve('blog/json-schema-draft-differences/index.html'),
        'blog-openapi-vs-json-schema': resolve('blog/openapi-vs-json-schema/index.html'),
        'blog-validate-json-in-ci': resolve('blog/validate-json-in-ci/index.html'),
      },
    },
  },
})
