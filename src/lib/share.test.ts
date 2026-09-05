import { test } from "node:test";
import assert from "node:assert/strict";
import { encodeShareState, decodeShareState, exportSessionFile, importSessionFile, type SharedState } from "./share.ts";

const STATE: SharedState = { schema: "{}", data: "{}", format: "json", draft: "2020-12", refSchemas: [] };

test("share link round-trips through encode/decode", () => {
  const decoded = decodeShareState(encodeShareState(STATE));
  assert.deepEqual(decoded, STATE);
});

test("share link decode defaults draft/refSchemas for an old-format payload", () => {
  const decoded = decodeShareState(encodeShareState({ ...STATE, draft: "banana" as never, refSchemas: {} as never }));
  assert.equal(decoded?.draft, "2020-12");
  assert.deepEqual(decoded?.refSchemas, []);
});

test("share link decode rejects garbage", () => {
  assert.equal(decodeShareState("not-valid-lz-string-data"), null);
});

test("session file round-trips through export/import", () => {
  const imported = importSessionFile(exportSessionFile(STATE));
  assert.deepEqual(imported, STATE);
});

test("session file import rejects invalid JSON and invalid shape", () => {
  assert.throws(() => importSessionFile("not json"));
  assert.throws(() => importSessionFile(JSON.stringify({ schema: "{}" })));
});
