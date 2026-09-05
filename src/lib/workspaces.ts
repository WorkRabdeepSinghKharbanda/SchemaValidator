import { isFormat, type Format } from "./parse.ts";
import type { Draft } from "./validate.ts";
import type { ReferenceSchema } from "./refs.ts";

export interface Workspace {
  id: string;
  name: string;
  schema: string;
  data: string;
  format: Format;
  draft: Draft;
  refSchemas: ReferenceSchema[];
  savedAt: number;
}

const KEY = "schema-validator:workspaces";

export function loadWorkspaces(): Workspace[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    // Workspaces saved before draft/refSchemas existed won't have those fields — default them
    // rather than let a restore silently validate under the wrong draft or missing refs.
    const parsed = JSON.parse(raw) as Partial<Workspace>[];
    return parsed.map((w) => ({ ...w, draft: w.draft ?? "2020-12", refSchemas: w.refSchemas ?? [] })) as Workspace[];
  } catch {
    return [];
  }
}

export function saveWorkspace(entry: Omit<Workspace, "id" | "savedAt">): Workspace[] {
  const workspaces = loadWorkspaces();
  const next: Workspace = { ...entry, id: crypto.randomUUID(), savedAt: Date.now() };
  const updated = [next, ...workspaces];
  localStorage.setItem(KEY, JSON.stringify(updated));
  return updated;
}

export function removeWorkspace(id: string): Workspace[] {
  const updated = loadWorkspaces().filter((w) => w.id !== id);
  localStorage.setItem(KEY, JSON.stringify(updated));
  return updated;
}

export function exportWorkspacesBackup(): string {
  return JSON.stringify(loadWorkspaces(), null, 2);
}

// Merges a previously-exported backup into the current list rather than replacing it, so
// importing a teammate's backup can't silently wipe out workspaces saved locally. Re-generates
// ids to avoid collisions with existing entries (a backup re-imported twice, or imported on a
// machine that already has workspaces with the same ids, would otherwise dedupe/overwrite).
export function importWorkspacesBackup(json: string): Workspace[] {
  const incoming = JSON.parse(json) as unknown;
  if (!Array.isArray(incoming)) throw new Error("Backup file must contain a list of workspaces");
  const imported = incoming.map((w) => {
    const raw = (w ?? {}) as Partial<Workspace>;
    if (typeof raw.name !== "string" || typeof raw.schema !== "string" || typeof raw.data !== "string") {
      throw new Error("Backup file has an entry missing name/schema/data");
    }
    if (!isFormat(raw.format)) {
      throw new Error(`Backup file has an entry with an invalid format: ${String(raw.format)}`);
    }
    return {
      ...raw,
      id: crypto.randomUUID(),
      format: raw.format,
      draft: raw.draft ?? "2020-12",
      refSchemas: Array.isArray(raw.refSchemas) ? raw.refSchemas : [],
      savedAt: raw.savedAt ?? Date.now(),
    } as Workspace;
  });
  const merged = [...imported, ...loadWorkspaces()];
  localStorage.setItem(KEY, JSON.stringify(merged));
  return merged;
}
