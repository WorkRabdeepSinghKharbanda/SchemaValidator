import { test } from "node:test";
import assert from "node:assert/strict";
import { ADSENSE_PUBLISHER_ID, isAdsConfigured } from "./adsense.ts";

test("isAdsConfigured is false while the publisher ID is still the placeholder", () => {
  assert.equal(ADSENSE_PUBLISHER_ID, "ca-pub-0000000000000000");
  assert.equal(isAdsConfigured(), false);
});
