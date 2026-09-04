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

  function onKeydown(e: React.KeyboardEvent) {
    if (e.key === "Escape") {
      e.preventDefault();
      onClose();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      runActive();
    }
  }

  return (
    <div className="drawer-overlay command-overlay" onClick={onClose}>
      <div className="command-palette" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Command palette">
        <input
          autoFocus
          className="command-input"
          placeholder="Type a command…"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          onKeyDown={onKeydown}
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
