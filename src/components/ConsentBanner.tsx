// Shown once until the visitor makes a choice (persisted via lib/consent.ts). Decline just
// records the choice — AdSlot stays a placeholder, no AdSense script is ever loaded. Accept is
// the only path that leads to loadAdsenseScript() being called (in App.tsx, keyed off the
// consent state this banner sets) — the ad script must never load before consent (GDPR).
export function ConsentBanner({
  onAccept,
  onDecline,
  onOpenPrivacyPolicy,
}: {
  onAccept: () => void;
  onDecline: () => void;
  onOpenPrivacyPolicy: () => void;
}) {
  return (
    <div className="consent-banner" role="dialog" aria-label="Cookie consent">
      <p>
        This site may show ads once you accept — they use cookies for personalization.{" "}
        <button className="consent-link" onClick={onOpenPrivacyPolicy}>
          Privacy Policy
        </button>
      </p>
      <div className="consent-actions">
        <button className="consent-decline" onClick={onDecline}>
          Decline
        </button>
        <button className="consent-accept" onClick={onAccept}>
          Accept
        </button>
      </div>
    </div>
  );
}
