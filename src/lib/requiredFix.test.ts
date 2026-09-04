import { test } from "node:test";
import assert from "node:assert/strict";
import { makeFieldOptional } from "./requiredFix.ts";

test("removes a top-level required field", () => {
  const schema = { type: "object", properties: { name: { type: "string" } }, required: ["name"] };
  const result = makeFieldOptional(schema, "/", "name") as { required: string[] };
  assert.deepEqual(result.required, []);
});

test("removes a nested required field via properties", () => {
  const schema = {
    type: "object",
    properties: { address: { type: "object", properties: { zip: { type: "string" } }, required: ["zip"] } },
  };
  const result = makeFieldOptional(schema, "/address", "zip") as {
    properties: { address: { required: string[] } };
  };
  assert.deepEqual(result.properties.address.required, []);
});

test("no-ops when the schema node has no required array", () => {
  const schema = { type: "object", properties: { name: { type: "string" } } };
  const result = makeFieldOptional(schema, "/", "name");
  assert.equal(result, schema);
});

test("no-ops when instancePath doesn't resolve", () => {
  const schema = { type: "object", properties: { name: { type: "string" } }, required: ["name"] };
  const result = makeFieldOptional(schema, "/missing/deep", "name");
  assert.equal(result, schema);
});
