import { test } from "node:test";
import assert from "node:assert/strict";
import { generateTypeScriptInterface } from "./schemaToTs.ts";

test("generates required and optional fields correctly", () => {
  const schema = {
    type: "object",
    properties: { name: { type: "string" }, age: { type: "integer" } },
    required: ["name"],
  };
  const ts = generateTypeScriptInterface(schema, "Person");
  assert.match(ts, /export interface Person \{/);
  assert.match(ts, /"name": string;/);
  assert.match(ts, /"age"\?: number;/);
});

test("generates an array field's element type", () => {
  const schema = { type: "object", properties: { tags: { type: "array", items: { type: "string" } } }, required: [] };
  const ts = generateTypeScriptInterface(schema, "Post");
  assert.match(ts, /"tags"\?: string\[\];/);
});

test("generates an enum as a union of literals", () => {
  const schema = { type: "object", properties: { status: { enum: ["open", "closed"] } }, required: ["status"] };
  const ts = generateTypeScriptInterface(schema, "Ticket");
  assert.match(ts, /"status": "open" \| "closed";/);
});

test("generates a nested object as its own interface", () => {
  const schema = {
    type: "object",
    properties: { address: { type: "object", properties: { zip: { type: "string" } }, required: [] } },
    required: [],
  };
  const ts = generateTypeScriptInterface(schema, "User");
  assert.match(ts, /export interface User_addressNested0 \{/);
  assert.match(ts, /"zip"\?: string;/);
});

test("resolves a $ref by its final path segment", () => {
  const schema = { type: "object", properties: { owner: { $ref: "#/definitions/Owner" } }, required: [] };
  const ts = generateTypeScriptInterface(schema, "Repo");
  assert.match(ts, /"owner"\?: Owner;/);
});

test("falls back to `unknown` for a non-object schema", () => {
  assert.equal(generateTypeScriptInterface(null, "X"), "export type X = unknown;\n");
  assert.equal(generateTypeScriptInterface("nope", "X"), "export type X = unknown;\n");
});
