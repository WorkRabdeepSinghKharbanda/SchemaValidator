# Monetization Ad Slot

- **Category:** Platform
- **Entry point:** `src/lib/adsense.ts`, `src/components/AdSlot.tsx`, the AdSense `<script>` tag duplicated in every page's `<head>`
- Renders a real Google AdSense unit once a publisher ID is configured; falls back to a placeholder box otherwise. The AdSense loader script itself loads unconditionally on every page, not gated behind cookie consent — a deliberate owner decision, see CLAUDE.md's AdSense entry before changing it back.
