import { useEffect } from "react";

const SHORTCUTS: [string, string][] = [
  ["⌘/Ctrl + Enter", "Validate"],
  ["⌘/Ctrl + S", "Validate and save to history"],
  ["⌘/Ctrl + K", "Open command palette"],
  ["?", "Show this shortcuts list"],
  ["Esc", "Close any open panel"],
];

export function ShortcutsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
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
      <div className="drawer shortcuts-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Keyboard shortcuts">
        <div className="drawer-header">
          <h3>Keyboard shortcuts</h3>
          <button onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>
        <ul className="shortcuts-list">
          {SHORTCUTS.map(([keys, label]) => (
            <li key={keys}>
              <kbd>{keys}</kbd>
              <span>{label}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
