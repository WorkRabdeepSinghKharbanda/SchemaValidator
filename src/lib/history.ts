import { isFormat, type Format } from "./parse.ts";
import { isDraft, type Draft } from "./validate.ts";
import type { ReferenceSchema } from "./refs.ts";

export interface HistoryEntry {
  id: string;
  timestamp: number;
  schema: string;
  data: string;
  format: Format;
  draft: Draft;
  refSchemas: ReferenceSchema[];
  valid: boolean;
}

const KEY = "schema-validator:history";
const MAX_ENTRIES = 20;

export function loadHistory(): HistoryEntry[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    // Entries saved before draft/refSchemas existed won't have those fields — default them
    // rather than let a restore silently validate under the wrong draft or missing refs. Also
    // guards against a corrupted format/draft value, not just a missing one (localStorage can be
    // hand-edited or shared across app versions with different valid values).
    const parsed = JSON.parse(raw) as Partial<HistoryEntry>[];
    return parsed
      .filter((e) => isFormat(e.format))
      .map((e) => ({
        ...e,
        draft: isDraft(e.draft) ? e.draft : "2020-12",
        refSchemas: Array.isArray(e.refSchemas) ? e.refSchemas : [],
      })) as HistoryEntry[];
  } catch {
    return [];
  }
}

export function saveToHistory(entry: Omit<HistoryEntry, "id" | "timestamp">): HistoryEntry[] {
  const history = loadHistory();
  const next: HistoryEntry = { ...entry, id: crypto.randomUUID(), timestamp: Date.now() };
  const updated = [next, ...history].slice(0, MAX_ENTRIES);
  localStorage.setItem(KEY, JSON.stringify(updated));
  return updated;
}

export function clearHistory(): HistoryEntry[] {
  localStorage.removeItem(KEY);
  return [];
}

export function removeHistoryEntry(id: string): HistoryEntry[] {
  const updated = loadHistory().filter((e) => e.id !== id);
  localStorage.setItem(KEY, JSON.stringify(updated));
  return updated;
}
