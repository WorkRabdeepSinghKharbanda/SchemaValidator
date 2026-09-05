import { useEffect, useState } from "react";
import type { HistoryEntry } from "../lib/history";
import type { Workspace } from "../lib/workspaces";

export function SavedPanel({
  open,
  onClose,
  history,
  onRestoreHistory,
  onRemoveHistory,
  onClearHistory,
  workspaces,
  onRestoreWorkspace,
  onRemoveWorkspace,
  onTogglePinned,
  onExportWorkspaces,
  onImportWorkspaces,
}: {
  open: boolean;
  onClose: () => void;
  history: HistoryEntry[];
  onRestoreHistory: (entry: HistoryEntry) => void;
  onRemoveHistory: (id: string) => void;
  onClearHistory: () => void;
  workspaces: Workspace[];
  onRestoreWorkspace: (w: Workspace) => void;
  onRemoveWorkspace: (id: string) => void;
  onTogglePinned: (id: string) => void;
  onExportWorkspaces: () => void;
  onImportWorkspaces: (file: File) => void;
}) {
  const [tab, setTab] = useState<"recent" | "saved">("saved");

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
      <div className="drawer" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Saved workspaces and history">
        <div className="drawer-header">
          <h3>Saved</h3>
          <button onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        <div className="drawer-tabs">
          <button className={tab === "saved" ? "active" : ""} onClick={() => setTab("saved")}>
            Named ({workspaces.length})
          </button>
          <button className={tab === "recent" ? "active" : ""} onClick={() => setTab("recent")}>
            Recent ({history.length})
          </button>
        </div>

        {tab === "saved" && (
          <>
            {workspaces.length === 0 && <p className="drawer-empty">No named workspaces yet. Use "Save as" to keep a schema/data pair.</p>}
            <div className="drawer-backup-row">
              <button className="drawer-backup-btn" onClick={onExportWorkspaces} disabled={workspaces.length === 0}>
                Export all
              </button>
              <label className="drawer-backup-btn drawer-import-label">
                Import backup…
                <input
                  type="file"
                  accept="application/json"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) onImportWorkspaces(file);
                    e.target.value = "";
                  }}
                />
              </label>
            </div>
            <ul className="history-list">
              {workspaces.map((w) => (
                <li key={w.id}>
                  <button className="history-entry" onClick={() => onRestoreWorkspace(w)}>
                    <span className="history-meta">
                      <span className="history-format">
                        {w.pinned && <span title="Loads automatically on start">📌 </span>}
                        {w.name}
                      </span>
                      <span className="history-time">
                        {w.format.toUpperCase()} · {new Date(w.savedAt).toLocaleDateString()}
                      </span>
                    </span>
                  </button>
                  <button
                    className="history-remove"
                    onClick={() => onTogglePinned(w.id)}
                    title={w.pinned ? "Unpin (stop auto-loading on start)" : "Pin (auto-load this on start)"}
                    aria-label={w.pinned ? `Unpin ${w.name}` : `Pin ${w.name}`}
                  >
                    {w.pinned ? "📌" : "📍"}
                  </button>
                  <button className="history-remove" onClick={() => onRemoveWorkspace(w.id)} title="Remove" aria-label={`Remove ${w.name}`}>
                    ✕
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}

        {tab === "recent" && (
          <>
            {history.length === 0 && <p className="drawer-empty">No validations run yet.</p>}
            <ul className="history-list">
              {history.map((e) => (
                <li key={e.id}>
                  <button className="history-entry" onClick={() => onRestoreHistory(e)}>
                    <span className={`dot ${e.valid ? "dot-success" : "dot-failure"}`} />
                    <span className="history-meta">
                      <span className="history-format">{e.format.toUpperCase()}</span>
                      <span className="history-time">{new Date(e.timestamp).toLocaleString()}</span>
                    </span>
                  </button>
                  <button className="history-remove" onClick={() => onRemoveHistory(e.id)} title="Remove" aria-label="Remove this entry">
                    ✕
                  </button>
                </li>
              ))}
            </ul>
            {history.length > 0 && (
              <button className="drawer-clear" onClick={onClearHistory}>
                Clear recent
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
