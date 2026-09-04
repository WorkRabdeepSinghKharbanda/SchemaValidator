// Reserved slot for a future ad unit (e.g. AdSense/Ezoic). Renders nothing but a
// placeholder today — swap the placeholder div for the ad network's script/tag when ready.
// Kept as its own component so ad-network code never touches App.tsx or the validator logic.
export function AdSlot({ id }: { id: string }) {
  return (
    <div className="ad-slot" data-ad-slot={id}>
      <span>Ad space reserved</span>
    </div>
  );
}
