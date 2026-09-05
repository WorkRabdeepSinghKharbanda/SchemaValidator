import { test } from "node:test";
import assert from "node:assert/strict";
import { testPattern } from "./regexTest.ts";

test("returns true when the value matches", () => {
  assert.equal(testPattern("^[a-z]+$", "hello"), true);
});

test("returns false when the value doesn't match", () => {
  assert.equal(testPattern("^[a-z]+$", "HELLO"), false);
});

test("returns null instead of throwing for an invalid pattern", () => {
  assert.equal(testPattern("(unclosed", "anything"), null);
});
