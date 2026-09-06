export type ConsentChoice = "accepted" | "declined";

const KEY = "schema-validator:ad-consent";

export function getConsentChoice(): ConsentChoice | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw === "accepted" || raw === "declined" ? raw : null;
  } catch {
    return null;
  }
}

export function setConsentChoice(choice: ConsentChoice): void {
  try {
    localStorage.setItem(KEY, choice);
  } catch {
    // localStorage can throw (private browsing, quota exceeded) — the banner just reappears
    // next load, which fails closed (no ads) rather than open, so it's safe to ignore.
  }
}
