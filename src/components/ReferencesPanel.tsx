import { useEffect, useRef } from "react";
import type { ReferenceSchema } from "../lib/refs";

export function ReferencesPanel({
  open,
  onClose,
  refs,
  onAdd,
  onRemove,
  onError,
}: {
  open: boolean;
  onClose: () => void;
  refs: ReferenceSchema[];
  onAdd: (id: string, schema: unknown) => void;
  onRemove: (id: string) => void;
  onError: (message: string) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);

  function handleFile(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const schema = JSON.parse(String(reader.result ?? "")) as { $id?: string };
        const id = schema.$id ?? file.name;
        onAdd(id, schema);
      } catch (e) {
        onError(`"${file.name}" isn't valid JSON: ${(e as Error).message}`);
      }
    };
    reader.onerror = () => onError(`Couldn't read "${file.name}": ${reader.error?.message ?? "unknown error"}`);
    reader.readAsText(file);
  }

  useEffect(() => {
    if (!open) return;
    function onKeydown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeydown);
    return () => window.removeEventListener("keydown", onKeydown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="drawer-overlay" onClick={onClose}>
      <div className="drawer" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Reference schemas">
        <div className="drawer-header">
          <h3>Reference schemas</h3>
          <button onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>
        <p className="drawer-empty">
          Upload schemas that your main schema's <code>$ref</code> can point to by <code>$id</code> or filename.
        </p>

        {refs.length === 0 && <p className="drawer-empty">No reference schemas added yet.</p>}
        <ul className="history-list">
          {refs.map((r) => (
            <li key={r.id}>
              <span className="history-entry ref-entry">
                <span className="history-format">{r.id}</span>
              </span>
              <button className="history-icon-btn" onClick={() => onRemove(r.id)} title="Remove" aria-label={`Remove ${r.id}`}>
                ✕
              </button>
            </li>
          ))}
        </ul>

        <button className="builder-add" onClick={() => fileRef.current?.click()}>
          + Add reference schema
        </button>
        <input
          ref={fileRef}
          type="file"
          accept=".json"
          hidden
          onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
        />
      </div>
    </div>
  );
}
