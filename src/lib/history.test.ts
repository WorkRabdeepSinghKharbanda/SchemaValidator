import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { loadHistory, saveToHistory } from "./history.ts";

// Same in-memory localStorage shim as workspaces.test.ts — plain Node has no localStorage global.
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

const KEY = "schema-validator:history";
beforeEach(() => (globalThis as unknown as { localStorage: MemoryStorage }).localStorage.clear());

const VALID_ENTRY = { id: "a", timestamp: 1, schema: "{}", data: "{}", format: "json", valid: true };

test("round-trips a well-formed entry", () => {
  const updated = saveToHistory({ schema: "{}", data: "{}", format: "json", draft: "2020-12", refSchemas: [], valid: true });
  assert.equal(updated.length, 1);
  assert.equal(loadHistory().length, 1);
});

test("defaults a missing draft/refSchemas on an entry saved before those fields existed", () => {
  localStorage.setItem(KEY, JSON.stringify([VALID_ENTRY]));
  const result = loadHistory();
  assert.equal(result[0].draft, "2020-12");
  assert.deepEqual(result[0].refSchemas, []);
});

test("falls back to 2020-12 for a corrupted draft value instead of passing it through", () => {
  localStorage.setItem(KEY, JSON.stringify([{ ...VALID_ENTRY, draft: "banana" }]));
  assert.equal(loadHistory()[0].draft, "2020-12");
});

test("drops an entry with an invalid format rather than restoring a broken format tab", () => {
  localStorage.setItem(KEY, JSON.stringify([VALID_ENTRY, { ...VALID_ENTRY, id: "b", format: "protobuf" }]));
  const result = loadHistory();
  assert.equal(result.length, 1);
  assert.equal(result[0].id, "a");
});
