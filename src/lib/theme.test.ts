import { test } from "node:test";
import assert from "node:assert/strict";
import { isThemePref, nextThemePref, resolveTheme } from "./theme.ts";

test("nextThemePref cycles dark -> light -> auto -> dark", () => {
  assert.equal(nextThemePref("dark"), "light");
  assert.equal(nextThemePref("light"), "auto");
  assert.equal(nextThemePref("auto"), "dark");
});

test("resolveTheme follows the OS preference only when pref is auto", () => {
  assert.equal(resolveTheme("auto", true), "dark");
  assert.equal(resolveTheme("auto", false), "light");
  assert.equal(resolveTheme("dark", false), "dark");
  assert.equal(resolveTheme("light", true), "light");
});

test("isThemePref accepts only the three valid values", () => {
  assert.equal(isThemePref("dark"), true);
  assert.equal(isThemePref("light"), true);
  assert.equal(isThemePref("auto"), true);
  assert.equal(isThemePref(null), false);
  assert.equal(isThemePref("system"), false);
  assert.equal(isThemePref(""), false);
});
