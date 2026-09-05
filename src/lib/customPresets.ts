// User-defined field snippets, alongside the built-in Email/UUID/Date presets in App.tsx's
// schema-pane menu. Stored as raw JSON text (not a parsed object) so a temporarily-invalid
// edit in the manage panel doesn't lose the user's in-progress snippet.
export interface CustomPreset {
  id: string;
  label: string;
  snippetJson: string;
}

const KEY = "schema-validator:customPresets";

export function loadCustomPresets(): CustomPreset[] {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as CustomPreset[]) : [];
  } catch {
    return [];
  }
}

export function saveCustomPreset(label: string, snippetJson: string): CustomPreset[] {
  const updated = [...loadCustomPresets(), { id: crypto.randomUUID(), label, snippetJson }];
  localStorage.setItem(KEY, JSON.stringify(updated));
  return updated;
}

export function removeCustomPreset(id: string): CustomPreset[] {
  const updated = loadCustomPresets().filter((p) => p.id !== id);
  localStorage.setItem(KEY, JSON.stringify(updated));
  return updated;
}
