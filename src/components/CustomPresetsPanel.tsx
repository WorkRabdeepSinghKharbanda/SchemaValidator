import { useEffect, useState } from "react";
import type { CustomPreset } from "../lib/customPresets";

export function CustomPresetsPanel({
  open,
  onClose,
  presets,
  onSave,
  onRemove,
  onInsert,
  onError,
}: {
  open: boolean;
  onClose: () => void;
  presets: CustomPreset[];
  onSave: (label: string, snippetJson: string) => void;
  onRemove: (id: string) => void;
  onInsert: (snippetJson: string) => void;
  onError: (message: string) => void;
}) {
  const [label, setLabel] = useState("");
  const [snippet, setSnippet] = useState(`{\n  "type": "string"\n}`);

  useEffect(() => {
    if (!open) return;
    function onKeydown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeydown);
    return () => window.removeEventListener("keydown", onKeydown);
  }, [open, onClose]);

  if (!open) return null;

  function handleSave() {
    if (!label.trim()) {
      onError("Give the preset a name first");
      return;
    }
    try {
      JSON.parse(snippet);
    } catch (e) {
      onError(`Snippet isn't valid JSON: ${(e as Error).message}`);
      return;
    }
    onSave(label.trim(), snippet);
    setLabel("");
  }

  return (
    <div className="drawer-overlay" onClick={onClose}>
      <div className="drawer" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Custom field presets">
        <div className="drawer-header">
          <h3>Custom presets</h3>
          <button onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>
        <p className="drawer-empty">Save your own field snippets, insertable from the schema pane's "⋯" menu alongside the built-in ones.</p>

        {presets.length === 0 && <p className="drawer-empty">No custom presets yet.</p>}
        <ul className="history-list">
          {presets.map((p) => (
            <li key={p.id}>
              <button className="history-entry" onClick={() => onInsert(p.snippetJson)} title="Insert into schema">
                <span className="history-meta">
                  <span className="history-format">{p.label}</span>
                </span>
              </button>
              <button className="history-remove" onClick={() => onRemove(p.id)} title="Remove" aria-label={`Remove ${p.label}`}>
                ✕
              </button>
            </li>
          ))}
        </ul>

        <label className="preset-form-label">
          Name
          <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="e.g. Phone number" />
        </label>
        <label className="preset-form-label">
          Field snippet (JSON)
          <textarea className="preset-form-textarea" value={snippet} onChange={(e) => setSnippet(e.target.value)} rows={5} />
        </label>
        <button className="builder-add" onClick={handleSave}>
          + Save preset
        </button>
      </div>
    </div>
  );
}
