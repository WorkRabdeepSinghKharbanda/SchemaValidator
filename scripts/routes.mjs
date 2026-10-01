import { readdirSync, statSync } from "node:fs";

// Not a page directory even though it sits at repo root.
const EXCLUDED_TOP_LEVEL_DIRS = new Set([
  "node_modules", "dist", "src", "public", "scripts", ".git", ".claude", ".vercel", ".vscode",
]);

function hasIndexHtml(dir) {
  try {
    return statSync(`${dir}/index.html`).isFile();
  } catch {
    return false;
  }
}

// Single source of truth for "what pages does this site have" — both vite.config.ts (build
// entries) and scripts/generate-sitemap.mjs (sitemap.xml) import this, so a new top-level
// dir/index.html or blog/<slug>/index.html is picked up by both automatically. A directory that
// exists but has no index.html (e.g. a future non-page dir) is silently skipped, not an error.
export function discoverPages(rootDir) {
  const pages = [{ routePath: "/", htmlPath: `${rootDir}/index.html` }];

  for (const entry of readdirSync(rootDir, { withFileTypes: true })) {
    if (!entry.isDirectory() || EXCLUDED_TOP_LEVEL_DIRS.has(entry.name)) continue;
    const dir = `${rootDir}/${entry.name}`;

    if (entry.name === "blog") {
      if (hasIndexHtml(dir)) pages.push({ routePath: "/blog/", htmlPath: `${dir}/index.html` });
      for (const post of readdirSync(dir, { withFileTypes: true })) {
        if (post.isDirectory() && hasIndexHtml(`${dir}/${post.name}`)) {
          pages.push({ routePath: `/blog/${post.name}/`, htmlPath: `${dir}/${post.name}/index.html` });
        }
      }
      continue;
    }

    if (entry.name === "tools") {
      if (hasIndexHtml(dir)) pages.push({ routePath: "/tools/", htmlPath: `${dir}/index.html` });
      for (const hub of readdirSync(dir, { withFileTypes: true })) {
        if (hub.isDirectory() && hasIndexHtml(`${dir}/${hub.name}`)) {
          pages.push({ routePath: `/tools/${hub.name}/`, htmlPath: `${dir}/${hub.name}/index.html` });
        }
      }
      continue;
    }

    if (hasIndexHtml(dir)) pages.push({ routePath: `/${entry.name}/`, htmlPath: `${dir}/index.html` });
  }

  return pages;
}
