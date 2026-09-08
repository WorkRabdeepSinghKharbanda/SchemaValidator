// Real publisher ID from adsense.google.com. Keep index.html's google-adsense-account meta tag
// and public/ads.txt's pub ID in sync with this by hand — both are static files, not built from
// this constant.
export const ADSENSE_PUBLISHER_ID: string = "ca-pub-5852027898822024";

export function isAdsConfigured(): boolean {
  return ADSENSE_PUBLISHER_ID !== "ca-pub-0000000000000000";
}
