import { useEffect } from "react";
import { ADSENSE_PUBLISHER_ID, isAdsConfigured } from "../lib/adsense";

// Renders a real AdSense unit once (a) a publisher ID is configured (see lib/adsense.ts) and
// (b) the visitor has consented (see App.tsx's ConsentBanner wiring) — otherwise falls back to
// a plain placeholder box so layout stays visible before either is true. Isolated in its own
// component so ad-network code never touches App.tsx or the validator logic.
export function AdSlot({ id, consented }: { id: string; consented: boolean }) {
  const live = isAdsConfigured() && consented;

  useEffect(() => {
    if (!live) return;
    try {
      const w = window as unknown as { adsbygoogle?: unknown[] };
      w.adsbygoogle = w.adsbygoogle ?? [];
      w.adsbygoogle.push({});
    } catch {
      // Throws if the loader script hasn't finished (or an ad blocker removed it) — the <ins>
      // tag stays in the DOM either way, this is a harmless no-op.
    }
  }, [live]);

  if (!live) {
    return (
      <div className="ad-slot ad-slot-placeholder" data-ad-slot={id}>
        <span>Ad space reserved</span>
      </div>
    );
  }

  return (
    <ins
      className="adsbygoogle ad-slot"
      style={{ display: "block" }}
      data-ad-client={ADSENSE_PUBLISHER_ID}
      data-ad-slot={id}
      data-ad-format="auto"
      data-full-width-responsive="true"
    />
  );
}
