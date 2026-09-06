import { test } from "node:test";
import assert from "node:assert/strict";
import { ADSENSE_PUBLISHER_ID, isAdsConfigured } from "./adsense.ts";

test("isAdsConfigured is true once a real publisher ID replaces the placeholder", () => {
  assert.notEqual(ADSENSE_PUBLISHER_ID, "ca-pub-0000000000000000");
  assert.equal(isAdsConfigured(), true);
});
