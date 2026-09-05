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
  editorFontSize,
  onEditorFontSizeChange,
  wordWrap,
  onToggleWordWrap,
  focusMode,
  onToggleFocusMode,
  minimapEnabled,
  onToggleMinimap,
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
  editorFontSize: number;
  onEditorFontSizeChange: (size: number) => void;
  wordWrap: boolean;
  onToggleWordWrap: () => void;
  focusMode: boolean;
  onToggleFocusMode: () => void;
  minimapEnabled: boolean;
  onToggleMinimap: () => void;
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
              <label className="toggle">
                <input type="checkbox" checked={wordWrap} onChange={onToggleWordWrap} />
                Wrap long lines
              </label>
              <label className="toggle">
                <input type="checkbox" checked={minimapEnabled} onChange={onToggleMinimap} />
                Show minimap
              </label>
              <label className="toggle settings-font-size">
                Editor font size
                <select value={editorFontSize} onChange={(e) => onEditorFontSizeChange(Number(e.target.value))}>
                  {[11, 12, 13, 14, 16, 18, 20].map((size) => (
                    <option key={size} value={size}>
                      {size}px
                    </option>
                  ))}
                </select>
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
        <button onClick={onToggleFocusMode} title="Toggle focus mode" aria-label="Toggle focus mode" aria-pressed={focusMode}>
          ⛶
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
