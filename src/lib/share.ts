// Default import + destructure, not named imports: lz-string is a CJS/UMD module whose named
// exports Node's ESM loader can't auto-detect (works fine under Vite's bundler-style CJS interop
// either way, but named imports fail outright under plain `node --test`).
import LZString from "lz-string";
const { compressToEncodedURIComponent, decompressFromEncodedURIComponent } = LZString;
import { isFormat, type Format } from "./parse.ts";
import { isDraft, type Draft } from "./validate.ts";
import type { ReferenceSchema } from "./refs.ts";

export interface SharedState {
  schema: string;
  data: string;
  format: Format;
  draft: Draft;
  refSchemas: ReferenceSchema[];
}

// Shared by both the URL-hash share link and the downloadable session file below — same
// untrusted-external-input trust boundary either way, so one validator for both.
function validateSharedState(parsed: unknown): SharedState | null {
  if (typeof parsed !== "object" || parsed === null) return null;
  const p = parsed as Record<string, unknown>;
  if (typeof p.schema !== "string" || typeof p.data !== "string" || !isFormat(p.format)) return null;
  // Payloads created before draft/refSchemas existed default to what validation already
  // defaulted to, so an old link/file keeps behaving exactly as before.
  return {
    schema: p.schema,
    data: p.data,
    format: p.format,
    draft: isDraft(p.draft) ? p.draft : "2020-12",
    refSchemas: Array.isArray(p.refSchemas) ? (p.refSchemas as ReferenceSchema[]) : [],
  };
}

export function encodeShareState(state: SharedState): string {
  return compressToEncodedURIComponent(JSON.stringify(state));
}

export function decodeShareState(encoded: string): SharedState | null {
  try {
    const json = decompressFromEncodedURIComponent(encoded);
    return json ? validateSharedState(JSON.parse(json)) : null;
  } catch {
    return null;
  }
}

export function buildShareUrl(state: SharedState): string {
  const url = new URL(window.location.href);
  url.hash = `s=${encodeShareState(state)}`;
  return url.toString();
}

export function readShareStateFromUrl(): SharedState | null {
  const match = /s=([^&]+)/.exec(window.location.hash);
  if (!match) return null;
  return decodeShareState(match[1]);
}

// A downloadable alternative to the URL-hash share link: a URL has a practical length ceiling
// (browsers/servers commonly choke well under 100KB), which a large schema + reference schemas
// can exceed even after lz-string compression. A plain JSON file has no such limit.
export function exportSessionFile(state: SharedState): string {
  return JSON.stringify(state, null, 2);
}

export function importSessionFile(json: string): SharedState {
  const state = validateSharedState(JSON.parse(json));
  if (!state) throw new Error("File doesn't look like a valid session export (missing/invalid schema, data, or format)");
  return state;
}
