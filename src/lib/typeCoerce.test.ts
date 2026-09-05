import { test } from "node:test";
import assert from "node:assert/strict";
import { coerceValueAtPath } from "./typeCoerce.ts";

test("coerces a numeric-looking string to a number at a top-level path", () => {
  const result = coerceValueAtPath({ age: "30" }, "/age", "number");
  assert.deepEqual(result, { ok: true, data: { age: 30 } });
});

test("coerces to an integer by truncating", () => {
  const result = coerceValueAtPath({ count: "3.7" }, "/count", "integer");
  assert.deepEqual(result, { ok: true, data: { count: 3 } });
});

test("coerces a nested value via a multi-segment path", () => {
  const result = coerceValueAtPath({ user: { age: "30" } }, "/user/age", "number");
  assert.deepEqual(result, { ok: true, data: { user: { age: 30 } } });
});

test("coerces an array element", () => {
  const result = coerceValueAtPath({ items: ["1", "2"] }, "/items/1", "number");
  assert.deepEqual(result, { ok: true, data: { items: ["1", 2] } });
});

test("coerces a number/boolean to a string", () => {
  assert.deepEqual(coerceValueAtPath({ id: 42 }, "/id", "string"), { ok: true, data: { id: "42" } });
  assert.deepEqual(coerceValueAtPath({ flag: true }, "/flag", "string"), { ok: true, data: { flag: "true" } });
});

test("coerces string/number to boolean", () => {
  assert.deepEqual(coerceValueAtPath({ ok: "true" }, "/ok", "boolean"), { ok: true, data: { ok: true } });
  assert.deepEqual(coerceValueAtPath({ ok: 0 }, "/ok", "boolean"), { ok: true, data: { ok: false } });
});

test("fails when the string isn't a valid number", () => {
  assert.deepEqual(coerceValueAtPath({ age: "not a number" }, "/age", "number"), { ok: false });
});

test("fails for an unsupported expected type", () => {
  assert.deepEqual(coerceValueAtPath({ x: "1" }, "/x", "object"), { ok: false });
});

test("coerces the root value itself when the path is empty", () => {
  assert.deepEqual(coerceValueAtPath("30", "", "number"), { ok: true, data: 30 });
});

test("fails gracefully when the path doesn't resolve", () => {
  assert.deepEqual(coerceValueAtPath({ a: 1 }, "/missing/deep", "number"), { ok: false });
});
