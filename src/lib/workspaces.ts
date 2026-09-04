import type { Format } from "./parse";
import type { Draft } from "./validate";
import type { ReferenceSchema } from "./refs";

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
