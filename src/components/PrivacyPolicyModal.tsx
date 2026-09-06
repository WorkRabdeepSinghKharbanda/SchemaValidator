import { useEffect } from "react";

export function PrivacyPolicyModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  useEffect(() => {
    if (!open) return;
    function onKeydown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeydown);
    return () => window.removeEventListener("keydown", onKeydown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="drawer-overlay" onClick={onClose}>
      <div
        className="drawer privacy-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Privacy policy"
      >
        <div className="drawer-header">
          <h3>Privacy Policy</h3>
          <button onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>
        <div className="privacy-body">
          <p>
            Schema Validator is a client-only tool — the schema and data you paste or upload are validated entirely
            in your browser and are never sent to a server. There is no backend, no database, and no analytics
            tracking of what you validate.
          </p>
          <h4>What's stored locally</h4>
          <p>Everything this site remembers lives in your browser's own storage (never uploaded anywhere):</p>
          <ul>
            <li>Recent validations and named workspaces (schema/data pairs you've saved)</li>
            <li>Your custom field presets</li>
            <li>Display preferences — theme, editor font size, word wrap, minimap</li>
            <li>Your cookie-consent choice for ads (below)</li>
          </ul>
          <p>Clearing your browser's site data for this domain removes all of it.</p>
          <h4>Ads</h4>
          <p>
            If you accept the cookie prompt, this site may show ads served by Google AdSense. AdSense can use
            cookies to personalize the ads you see and to measure their performance. If you decline, no ad script
            loads and no ad-related cookies are set. You can opt out of personalized advertising (or see which
            companies are serving you ads) at{" "}
            <a href="https://adssettings.google.com" target="_blank" rel="noreferrer">
              adssettings.google.com
            </a>
            .
          </p>
          <h4>Third parties</h4>
          <p>
            The code editor (Monaco) is loaded from a CDN (cdn.jsdelivr.net) at runtime — that's a static asset
            request, not a data upload. No other third-party service is contacted by this app.
          </p>
        </div>
      </div>
    </div>
  );
}
