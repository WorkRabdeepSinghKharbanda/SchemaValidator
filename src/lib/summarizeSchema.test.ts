import { test } from "node:test";
import assert from "node:assert/strict";
import { summarizeSchema } from "./summarizeSchema.ts";

test("summarizes required and optional fields", () => {
  const schema = {
    type: "object",
    properties: { name: { type: "string" }, age: { type: "integer" } },
    required: ["name"],
  };
  const summary = summarizeSchema(schema);
  assert.match(summary ?? "", /2 fields \(name, age\)/);
  assert.match(summary ?? "", /1 required: name/);
});

test("notes when nothing is required", () => {
  const schema = { type: "object", properties: { name: { type: "string" } } };
  const summary = summarizeSchema(schema);
  assert.match(summary ?? "", /None are required/);
});

test("returns undefined for a schema with no properties", () => {
  assert.equal(summarizeSchema({ type: "object" }), undefined);
  assert.equal(summarizeSchema(null), undefined);
});
