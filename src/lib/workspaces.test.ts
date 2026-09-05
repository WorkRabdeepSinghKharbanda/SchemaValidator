import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { importWorkspacesBackup, loadWorkspaces, saveWorkspace, togglePinnedWorkspace } from "./workspaces.ts";

// This file runs under plain Node (node:test), which has no localStorage global — a minimal
// in-memory shim is enough to exercise workspaces.ts's real read/write path without a browser.
class MemoryStorage {
  private store = new Map<string, string>();
  getItem(key: string) {
    return this.store.has(key) ? this.store.get(key)! : null;
  }
  setItem(key: string, value: string) {
    this.store.set(key, value);
  }
  clear() {
    this.store.clear();
  }
}
(globalThis as unknown as { localStorage: MemoryStorage }).localStorage = new MemoryStorage();

beforeEach(() => (globalThis as unknown as { localStorage: MemoryStorage }).localStorage.clear());

const VALID_ENTRY = { name: "test", schema: "{}", data: "{}", format: "json" as const };

test("imports a well-formed backup", () => {
  const result = importWorkspacesBackup(JSON.stringify([VALID_ENTRY]));
  assert.equal(result.length, 1);
  assert.equal(result[0].format, "json");
  assert.equal(result[0].draft, "2020-12");
  assert.deepEqual(result[0].refSchemas, []);
});

test("merges into existing workspaces instead of replacing them", () => {
  importWorkspacesBackup(JSON.stringify([VALID_ENTRY]));
  const result = importWorkspacesBackup(JSON.stringify([{ ...VALID_ENTRY, name: "second" }]));
  assert.equal(result.length, 2);
  assert.equal(loadWorkspaces().length, 2);
});

test("regenerates ids so re-importing the same backup doesn't collide", () => {
  const first = importWorkspacesBackup(JSON.stringify([VALID_ENTRY]));
  const second = importWorkspacesBackup(JSON.stringify([VALID_ENTRY]));
  assert.notEqual(first[0].id, second[0].id);
});

test("rejects a non-array backup", () => {
  assert.throws(() => importWorkspacesBackup(JSON.stringify({ not: "an array" })));
});

test("rejects an entry missing name/schema/data", () => {
  assert.throws(() => importWorkspacesBackup(JSON.stringify([{ format: "json" }])));
});

test("rejects an entry with an invalid format", () => {
  assert.throws(() => importWorkspacesBackup(JSON.stringify([{ ...VALID_ENTRY, format: "protobuf" }])));
});

test("rejects a null entry without crashing with a raw TypeError", () => {
  assert.throws(() => importWorkspacesBackup(JSON.stringify([null])));
});

test("falls back to an empty array for a non-array refSchemas", () => {
  const result = importWorkspacesBackup(JSON.stringify([{ ...VALID_ENTRY, refSchemas: { bad: true } }]));
  assert.deepEqual(result[0].refSchemas, []);
});

test("falls back to 2020-12 for an invalid draft on import, instead of passing it through", () => {
  const result = importWorkspacesBackup(JSON.stringify([{ ...VALID_ENTRY, draft: "banana" }]));
  assert.equal(result[0].draft, "2020-12");
});

test("loadWorkspaces falls back to 2020-12 for a corrupted draft value already in storage", () => {
  localStorage.setItem("schema-validator:workspaces", JSON.stringify([{ ...VALID_ENTRY, id: "x", savedAt: 1, draft: "banana" }]));
  const result = loadWorkspaces();
  assert.equal(result[0].draft, "2020-12");
});

test("loadWorkspaces drops an entry with an invalid format already in storage", () => {
  const good = { ...VALID_ENTRY, id: "a", savedAt: 1 };
  const bad = { ...VALID_ENTRY, id: "b", savedAt: 2, format: "protobuf" };
  localStorage.setItem("schema-validator:workspaces", JSON.stringify([good, bad]));
  const result = loadWorkspaces();
  assert.equal(result.length, 1);
  assert.equal(result[0].id, "a");
});

test("togglePinnedWorkspace pins exactly one workspace, un-pinning any previous one", () => {
  saveWorkspace({ ...VALID_ENTRY, name: "first", draft: "2020-12", refSchemas: [] });
  saveWorkspace({ ...VALID_ENTRY, name: "second", draft: "2020-12", refSchemas: [] });
  const [second, first] = loadWorkspaces();

  const afterFirstPin = togglePinnedWorkspace(first.id);
  assert.equal(afterFirstPin.find((w) => w.id === first.id)?.pinned, true);
  assert.equal(afterFirstPin.find((w) => w.id === second.id)?.pinned, false);

  const afterSwitchingPin = togglePinnedWorkspace(second.id);
  assert.equal(afterSwitchingPin.find((w) => w.id === first.id)?.pinned, false);
  assert.equal(afterSwitchingPin.find((w) => w.id === second.id)?.pinned, true);
});

test("togglePinnedWorkspace un-pins when called again on the same workspace", () => {
  saveWorkspace({ ...VALID_ENTRY, draft: "2020-12", refSchemas: [] });
  const [{ id }] = loadWorkspaces();
  togglePinnedWorkspace(id);
  const result = togglePinnedWorkspace(id);
  assert.equal(result.find((w) => w.id === id)?.pinned, false);
});
