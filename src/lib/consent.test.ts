import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { getConsentChoice, setConsentChoice } from "./consent.ts";

// Plain Node has no localStorage global — a minimal in-memory shim, same pattern as
// workspaces.test.ts.
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

test("returns null before any choice is made", () => {
  assert.equal(getConsentChoice(), null);
});

test("round-trips accepted/declined", () => {
  setConsentChoice("accepted");
  assert.equal(getConsentChoice(), "accepted");
  setConsentChoice("declined");
  assert.equal(getConsentChoice(), "declined");
});

test("treats a corrupted stored value as no choice made", () => {
  localStorage.setItem("schema-validator:ad-consent", "yes-please");
  assert.equal(getConsentChoice(), null);
});
