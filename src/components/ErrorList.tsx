import { useState } from "react";
import { explainError } from "../lib/explainError";

export interface ErrorItem {
  message: string;
  line?: number;
  path?: string;
  keyword?: string;
  missingProperty?: string;
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
  onExportJson,
  onExportPdf,
  onAutoFix,
  onCopyIssue,
  onAddRequired,
}: {
  errors: ErrorItem[];
  success: boolean | null;
  onJump: (line: number) => void;
  onExportJson: () => void;
  onExportPdf: () => void;
  onAutoFix?: () => void;
  onCopyIssue?: () => void;
  onAddRequired?: (path: string, propName: string) => void;
}) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState("");
  // React's documented "adjusting state during render" pattern: reset the filter the moment a
  // fresh validation's `errors` array shows up, without a useEffect (which would re-render twice).
  const [prevErrors, setPrevErrors] = useState(errors);
  if (errors !== prevErrors) {
    setPrevErrors(errors);
    setFilter("");
  }

  if (success === null) return null;

  if (success) {
    return (
      <div className="result success">
        <span>
          <span className="result-check">✓</span> Valid
        </span>
        <span className="result-actions">
          <button className="export-btn" onClick={onExportJson}>
            Export JSON
          </button>
          <button className="export-btn" onClick={onExportPdf}>
            Export PDF
          </button>
        </span>
      </div>
    );
  }

  const q = filter.trim().toLowerCase();
  const visibleErrors = q ? errors.filter((e) => e.message.toLowerCase().includes(q) || e.path?.toLowerCase().includes(q)) : errors;
  const groups = groupErrors(visibleErrors);
  const firstErrorLine = errors.find((e) => e.line)?.line;

  return (
    <div className="result failure">
      <div className="result-heading">
        <span>
          ✗ {errors.length} error{errors.length !== 1 ? "s" : ""}
        </span>
        <span className="result-actions">
          {firstErrorLine && (
            <button className="export-btn" onClick={() => onJump(firstErrorLine)}>
              Jump to first error
            </button>
          )}
          {onAutoFix && (
            <button className="export-btn" onClick={onAutoFix}>
              Try auto-fix
            </button>
          )}
          {onCopyIssue && (
            <button className="export-btn" onClick={onCopyIssue}>
              Copy as issue
            </button>
          )}
          <button className="export-btn" onClick={onExportJson}>
            Export JSON
          </button>
          <button className="export-btn" onClick={onExportPdf}>
            Export PDF
          </button>
        </span>
      </div>
      {errors.length > 5 && (
        <input
          className="error-filter"
          type="search"
          placeholder="Filter errors by path or message…"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
      )}
      {q && <p className="error-filter-count">Showing {visibleErrors.length} of {errors.length}</p>}
      <ul>
        {groups.map((group) => {
          const isGroup = group.items.length > 1;
          const isOpen = expanded.has(group.message);
          const shown = isGroup && !isOpen ? group.items.slice(0, 1) : group.items;

          return (
            <li key={group.message} className="error-group">
              {shown.map((err, i) => {
                const explanation = explainError(err.keyword);
                return (
                  <div key={i} className="error-item">
                    <div className={`error-row ${err.line ? "clickable" : ""}`} onClick={() => err.line && onJump(err.line)}>
                      {err.path && <code>{err.path}</code>}
                      {err.line && <span className="line-ref">line {err.line}</span>}
                      <span>{err.message}</span>
                      {onAddRequired && err.missingProperty && (
                        <button
                          className="quick-fix-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            onAddRequired(err.path ?? "", err.missingProperty as string);
                          }}
                        >
                          Make optional
                        </button>
                      )}
                    </div>
                    {explanation && <div className="error-explain">{explanation}</div>}
                  </div>
                );
              })}
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
