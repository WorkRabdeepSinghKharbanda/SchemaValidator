import { test } from "node:test";
import assert from "node:assert/strict";
import { lintSchema } from "./schemaLint.ts";

test("warns when additionalProperties is unset on an object schema", () => {
  const hints = lintSchema({ type: "object", properties: { name: { type: "string" } } });
  assert.ok(hints.some((h) => h.message.includes("additionalProperties")));
});

test("stays quiet when additionalProperties is explicitly set", () => {
  const hints = lintSchema({ type: "object", properties: { name: { type: "string" } }, additionalProperties: false });
  assert.ok(!hints.some((h) => h.message.includes("additionalProperties")));
});

test("stays quiet when patternProperties is used instead of additionalProperties", () => {
  const hints = lintSchema({ type: "object", properties: { name: { type: "string" } }, patternProperties: { "^x-": {} } });
  assert.ok(!hints.some((h) => h.message.includes("additionalProperties")));
});

test("flags a required property that isn't declared", () => {
  const hints = lintSchema({ type: "object", properties: { name: { type: "string" } }, required: ["name", "age"], additionalProperties: true });
  assert.ok(hints.some((h) => h.message.includes('"age"') && h.severity === "warn"));
});

test("flags a single-value enum as a candidate for const", () => {
  const hints = lintSchema({ type: "object", properties: { status: { enum: ["active"] } }, additionalProperties: true });
  assert.ok(hints.some((h) => h.message.includes("const")));
});

test("recurses into nested object properties and array items", () => {
  const hints = lintSchema({
    type: "object",
    properties: {
      address: { type: "object", properties: { zip: { type: "string" } } },
      tags: { type: "array", items: { type: "object", properties: { name: { type: "string" } } } },
    },
    additionalProperties: true,
  });
  assert.ok(hints.some((h) => h.path === "address"));
  assert.ok(hints.some((h) => h.path === "tags[]"));
});

test("skips a $ref node instead of recursing into it", () => {
  const hints = lintSchema({ type: "object", properties: { owner: { $ref: "#/definitions/Owner" } }, additionalProperties: true });
  assert.deepEqual(hints, []);
});

test("returns nothing for a non-object schema", () => {
  assert.deepEqual(lintSchema(null), []);
  assert.deepEqual(lintSchema("nope"), []);
});
