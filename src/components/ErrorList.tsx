import { useState } from "react";

export interface ErrorItem {
  message: string;
  line?: number;
  path?: string;
}

interface ErrorGroup {
  message: string;
  items: ErrorItem[];
}

function groupErrors(errors: ErrorItem[]): ErrorGroup[] {
  const groups = new Map<string, ErrorItem[]>();
  for (const err of errors) {
    const list = groups.get(err.message) ?? [];
    list.push(err);
    groups.set(err.message, list);
  }
  return Array.from(groups.entries()).map(([message, items]) => ({ message, items }));
}

export function ErrorList({
  errors,
  success,
  onJump,
  onExport,
  onAutoFix,
}: {
  errors: ErrorItem[];
  success: boolean | null;
  onJump: (line: number) => void;
  onExport: () => void;
  onAutoFix?: () => void;
}) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  if (success === null) return null;

  if (success) {
    return (
      <div className="result success">
        <span className="result-check">✓</span> Valid
      </div>
    );
  }

  const groups = groupErrors(errors);

  return (
    <div className="result failure">
      <div className="result-heading">
        <span>
          ✗ {errors.length} error{errors.length !== 1 ? "s" : ""}
        </span>
        <span className="result-actions">
          {onAutoFix && (
            <button className="export-btn" onClick={onAutoFix}>
              Try auto-fix
            </button>
          )}
          <button className="export-btn" onClick={onExport}>
            Export report
          </button>
        </span>
      </div>
      <ul>
        {groups.map((group) => {
          const isGroup = group.items.length > 1;
          const isOpen = expanded.has(group.message);
          const shown = isGroup && !isOpen ? group.items.slice(0, 1) : group.items;

          return (
            <li key={group.message} className="error-group">
              {shown.map((err, i) => (
                <div
                  key={i}
                  className={`error-row ${err.line ? "clickable" : ""}`}
                  onClick={() => err.line && onJump(err.line)}
                >
                  {err.path && <code>{err.path}</code>}
                  {err.line && <span className="line-ref">line {err.line}</span>}
                  <span>{err.message}</span>
                </div>
              ))}
              {isGroup && (
                <button
                  className="group-toggle"
                  onClick={() =>
                    setExpanded((prev) => {
                      const next = new Set(prev);
                      if (next.has(group.message)) next.delete(group.message);
                      else next.add(group.message);
                      return next;
                    })
                  }
                >
                  {isOpen ? "Show less" : `+ ${group.items.length - 1} more with this error`}
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
