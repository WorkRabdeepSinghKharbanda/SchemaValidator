// Shown once until the visitor makes a choice (persisted via lib/consent.ts, purely for the
// record — see CLAUDE.md's AdSense entry). Neither Accept nor Decline affects whether ads
// actually load: the AdSense script is a static <script> tag in every page's <head>, present
// unconditionally, so the copy below must never claim otherwise.
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
        This site shows ads, which may use cookies for personalization.{" "}
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
