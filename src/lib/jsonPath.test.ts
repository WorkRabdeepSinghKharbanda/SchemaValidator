import { test } from "node:test";
import assert from "node:assert/strict";
import { describeJsonPathAtOffset } from "./jsonPath.ts";

test("returns root for the top level", () => {
  const text = `{"name": "Ada"}`;
  assert.equal(describeJsonPathAtOffset(text, 0), "root");
});

test("describes a nested object property", () => {
  const text = `{"address": {"zip": "1"}}`;
  const offset = text.indexOf('"1"');
  assert.equal(describeJsonPathAtOffset(text, offset), "root.address.zip");
});

test("describes an array index", () => {
  const text = `{"items": ["a", "b"]}`;
  const offset = text.indexOf('"b"');
  assert.equal(describeJsonPathAtOffset(text, offset), "root.items[1]");
});
