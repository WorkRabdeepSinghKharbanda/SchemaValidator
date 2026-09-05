import { test } from "node:test";
import assert from "node:assert/strict";
import { detectDraftFromSchema } from "./detectDraft.ts";

test("detects draft-07 with or without a trailing #", () => {
  assert.equal(detectDraftFromSchema({ $schema: "http://json-schema.org/draft-07/schema#" }), "draft-07");
  assert.equal(detectDraftFromSchema({ $schema: "https://json-schema.org/draft-07/schema" }), "draft-07");
});

test("detects 2019-09 and 2020-12", () => {
  assert.equal(detectDraftFromSchema({ $schema: "https://json-schema.org/draft/2019-09/schema" }), "2019-09");
  assert.equal(detectDraftFromSchema({ $schema: "https://json-schema.org/draft/2020-12/schema" }), "2020-12");
});

test("returns undefined for a schema with no $schema, an unrecognized URI, or a non-object", () => {
  assert.equal(detectDraftFromSchema({}), undefined);
  assert.equal(detectDraftFromSchema({ $schema: "https://example.com/whatever" }), undefined);
  assert.equal(detectDraftFromSchema(null), undefined);
  assert.equal(detectDraftFromSchema("not an object"), undefined);
});
