import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { discoverPages } from "./routes.mjs";

function makeFixture() {
  const root = mkdtempSync(join(tmpdir(), "routes-test-"));
  writeFileSync(join(root, "index.html"), "root");
  mkdirSync(join(root, "a-tool"));
  writeFileSync(join(root, "a-tool", "index.html"), "tool");
  mkdirSync(join(root, "empty-dir")); // no index.html — should be skipped
  mkdirSync(join(root, "blog"));
  writeFileSync(join(root, "blog", "index.html"), "blog index");
  mkdirSync(join(root, "blog", "post-1"));
  writeFileSync(join(root, "blog", "post-1", "index.html"), "post");
  mkdirSync(join(root, "tools"));
  writeFileSync(join(root, "tools", "index.html"), "tools index");
  mkdirSync(join(root, "tools", "hub-1"));
  writeFileSync(join(root, "tools", "hub-1", "index.html"), "hub");
  mkdirSync(join(root, "node_modules")); // excluded dir — should never appear
  writeFileSync(join(root, "node_modules", "index.html"), "nope");
  return root;
}

test("discoverPages finds the root page, a top-level tool, blog posts, and tool hubs", () => {
  const root = makeFixture();
  try {
    const pages = discoverPages(root);
    const routes = pages.map((p) => p.routePath).sort();
    assert.deepEqual(routes, [
      "/", "/a-tool/", "/blog/", "/blog/post-1/", "/tools/", "/tools/hub-1/",
    ]);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("discoverPages skips excluded directories and dirs without an index.html", () => {
  const root = makeFixture();
  try {
    const pages = discoverPages(root);
    const routes = pages.map((p) => p.routePath);
    assert.ok(!routes.includes("/node_modules/"));
    assert.ok(!routes.includes("/empty-dir/"));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
