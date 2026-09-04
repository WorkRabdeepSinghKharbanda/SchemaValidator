import { useState } from "react";
import { DRAFTS, type Draft } from "../lib/validate";
import type { ThemePref } from "../lib/theme";

const THEME_ICON: Record<ThemePref, string> = { dark: "☾", light: "☀︎", auto: "🖥" };
const THEME_LABEL: Record<ThemePref, string> = { dark: "Dark theme", light: "Light theme", auto: "Auto (system) theme" };

export function Toolbar({
  themePref,
  onToggleTheme,
  realtime,
  onToggleRealtime,
  draft,
  onDraftChange,
  onShare,
  batchMode,
  onToggleBatchMode,
  onOpenSaved,
  onSaveAs,
  onOpenShortcuts,
  onOpenPalette,
}: {
  themePref: ThemePref;
  onToggleTheme: () => void;
  realtime: boolean;
  onToggleRealtime: () => void;
  draft: Draft;
  onDraftChange: (d: Draft) => void;
  onShare: () => void;
  batchMode: boolean;
  onToggleBatchMode: () => void;
  onOpenSaved: () => void;
  onSaveAs: () => void;
  onOpenShortcuts: () => void;
  onOpenPalette: () => void;
}) {
  const [settingsOpen, setSettingsOpen] = useState(false);

  return (
    <div className="toolbar">
      <div className="toolbar-group">
        <select value={draft} onChange={(e) => onDraftChange(e.target.value as Draft)} title="JSON Schema draft version">
          {DRAFTS.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>

        <div className="preset-menu-wrap">
          <button onClick={() => setSettingsOpen((v) => !v)} title="Validation settings">
            ⚙ Settings
          </button>
          {settingsOpen && (
            <div className="preset-menu settings-menu" onMouseLeave={() => setSettingsOpen(false)}>
              <label className="toggle">
                <input type="checkbox" checked={realtime} onChange={onToggleRealtime} />
                Validate as I type
              </label>
              <label className="toggle">
                <input type="checkbox" checked={batchMode} onChange={onToggleBatchMode} />
                Batch mode (validate an array)
              </label>
            </div>
          )}
        </div>
      </div>

      <div className="toolbar-group">
        <button onClick={onSaveAs} title="Save this schema + data as a named workspace">
          Save as…
        </button>
        <button onClick={onOpenSaved} title="View saved workspaces and recent validations">
          Saved
        </button>
        <button onClick={onShare} title="Copy a shareable link">
          Share
        </button>
        <button onClick={onOpenPalette} title="Command palette (⌘K)" aria-label="Command palette">
          ⌘K
        </button>
        <button onClick={onOpenShortcuts} title="Keyboard shortcuts (?)" aria-label="Keyboard shortcuts">
          ?
        </button>
        <button onClick={onToggleTheme} title={`${THEME_LABEL[themePref]} — click to cycle`} aria-label="Cycle theme" className="theme-btn">
          {THEME_ICON[themePref]}
        </button>
      </div>
    </div>
  );
}
