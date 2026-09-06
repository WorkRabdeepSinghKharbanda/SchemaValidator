// Real publisher ID from adsense.google.com. Keep index.html's google-adsense-account meta tag
// and public/ads.txt's pub ID in sync with this by hand — both are static files, not built from
// this constant.
export const ADSENSE_PUBLISHER_ID: string = "ca-pub-5852027898822024";

export function isAdsConfigured(): boolean {
  return ADSENSE_PUBLISHER_ID !== "ca-pub-0000000000000000";
}

let scriptLoaded = false;

// Injects AdSense's loader script exactly once. Must only be called after the visitor has
// consented (GDPR) — never unconditionally on page load. Safe to call more than once (e.g. once
// from a returning-consented-visitor's mount effect and once from a fresh Accept click); the
// scriptLoaded flag and the DOM check both guard against injecting it twice.
export function loadAdsenseScript(): void {
  if (scriptLoaded || typeof document === "undefined") return;
  if (document.querySelector("script[data-adsbygoogle-loader]")) {
    scriptLoaded = true;
    return;
  }
  const script = document.createElement("script");
  script.async = true;
  script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_PUBLISHER_ID}`;
  script.crossOrigin = "anonymous";
  script.dataset.adsbygoogleLoader = "true";
  document.head.appendChild(script);
  scriptLoaded = true;
}
