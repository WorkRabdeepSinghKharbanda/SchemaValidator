import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { discoverPages } from "./routes.mjs";

const ROOT = fileURLToPath(new URL("..", import.meta.url)).replace(/\/$/, "");
const BASE_URL = "https://schema-validator-livid.vercel.app";

// Priority/changefreq by route shape — same heuristic used by hand before this was automated.
function metaFor(routePath) {
  if (routePath === "/") return { priority: "1.0", changefreq: "monthly" };
  if (routePath === "/blog/") return { priority: "0.7", changefreq: "weekly" };
  if (routePath.startsWith("/blog/")) return { priority: "0.6", changefreq: "monthly" };
  if (routePath === "/tools/") return { priority: "0.75", changefreq: "monthly" };
  if (routePath.startsWith("/tools/")) return { priority: "0.75", changefreq: "monthly" };
  return { priority: "0.8", changefreq: "monthly" };
}

// Last commit date for the page's own file, so lastmod reflects reality instead of "whenever this
// script last ran" — falls back to today for an uncommitted new page (git log returns nothing).
function lastmodFor(htmlPath) {
  try {
    const out = execFileSync("git", ["log", "-1", "--format=%cs", "--", htmlPath], {
      cwd: ROOT,
      encoding: "utf-8",
    }).trim();
    if (out) return out;
  } catch {
    // Not a git repo, or git unavailable — fall through to today's date.
  }
  return new Date().toISOString().slice(0, 10);
}

const pages = discoverPages(ROOT);

const urls = pages
  .map(({ routePath, htmlPath }) => {
    const { priority, changefreq } = metaFor(routePath);
    const lastmod = lastmodFor(htmlPath);
    return `  <url>
    <loc>${BASE_URL}${routePath}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`;
  })
  .join("\n");

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`;

writeFileSync(`${ROOT}/public/sitemap.xml`, xml);
console.log(`Generated public/sitemap.xml with ${pages.length} URLs.`);
