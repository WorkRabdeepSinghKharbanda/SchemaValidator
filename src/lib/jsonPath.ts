import { getLocation } from "jsonc-parser";

// Powers the editor status bar's "where am I" breadcrumb for JSON panes. Reuses jsonc-parser
// (already the parser of record for JSON/JSONC elsewhere in this app) rather than hand-rolling
// a second tree walk — same reasoning as validate.ts's locateNode staying on one JSON parser.
export function describeJsonPathAtOffset(text: string, offset: number): string {
  const location = getLocation(text, offset);
  if (location.path.length === 0) return "root";
  return "root" + location.path.map((segment) => (typeof segment === "number" ? `[${segment}]` : `.${segment}`)).join("");
}
