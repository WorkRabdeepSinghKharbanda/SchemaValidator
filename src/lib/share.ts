import { compressToEncodedURIComponent, decompressFromEncodedURIComponent } from "lz-string";
import { isFormat, type Format } from "./parse";
import { isDraft, type Draft } from "./validate";
import type { ReferenceSchema } from "./refs";

export interface SharedState {
  schema: string;
  data: string;
  format: Format;
  draft: Draft;
  refSchemas: ReferenceSchema[];
}

export function encodeShareState(state: SharedState): string {
  return compressToEncodedURIComponent(JSON.stringify(state));
}

export function decodeShareState(encoded: string): SharedState | null {
  try {
    const json = decompressFromEncodedURIComponent(encoded);
    if (!json) return null;
    const parsed = JSON.parse(json);
    if (typeof parsed.schema !== "string" || typeof parsed.data !== "string" || !isFormat(parsed.format)) {
      return null;
    }
    // Links created before draft/refSchemas were part of the share payload default to what
    // validation already defaulted to, so old links keep behaving exactly as before.
    return {
      schema: parsed.schema,
      data: parsed.data,
      format: parsed.format,
      draft: isDraft(parsed.draft) ? parsed.draft : "2020-12",
      refSchemas: Array.isArray(parsed.refSchemas) ? parsed.refSchemas : [],
    };
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
