import { useMemo, useState } from "react";

export interface Command {
  label: string;
  hint?: string;
  run: () => void;
}

// Parent only renders this component while `open` is true (see App.tsx), so query/activeIndex
// start fresh on every mount — no reset-on-open effect needed.
export function CommandPalette({ open, onClose, commands }: { open: boolean; onClose: () => void; commands: Command[] }) {
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return commands;
    return commands.filter((c) => c.label.toLowerCase().includes(q));
  }, [query, commands]);

  if (!open) return null;

  function runActive() {
    const command = filtered[activeIndex];
    if (command) {
      onClose();
      command.run();
    }
  }

  function onQueryChange(value: string) {
    setQuery(value);
    setActiveIndex(0);
  }

  // Attached to the dialog container (not just the input) so Escape/arrow-nav/Enter still work
  // after focus moves to a list item's <button> — keydown bubbles up from any child. Every key
  // here also stops propagation so it can't reach App.tsx's global window keydown listener
  // (e.g. Cmd+Enter would otherwise both run the highlighted command AND trigger Validate).
  function onKeydown(e: React.KeyboardEvent) {
    if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      onClose();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      e.stopPropagation();
      setActiveIndex((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      e.stopPropagation();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      e.stopPropagation();
      runActive();
    }
  }

  return (
    <div className="drawer-overlay command-overlay" onClick={onClose}>
      <div
        className="command-palette"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={onKeydown}
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
      >
        <input
          autoFocus
          className="command-input"
          placeholder="Type a command…"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
        />
        <ul className="command-list">
          {filtered.length === 0 && <li className="command-empty">No matching commands</li>}
          {filtered.map((c, i) => (
            <li key={c.label}>
              <button
                className={i === activeIndex ? "active" : ""}
                onMouseEnter={() => setActiveIndex(i)}
                onClick={() => {
                  onClose();
                  c.run();
                }}
              >
                <span>{c.label}</span>
                {c.hint && <kbd>{c.hint}</kbd>}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
