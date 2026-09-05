import { useState } from "react";
import { explainError } from "../lib/explainError";
import { testPattern } from "../lib/regexTest";

export interface ErrorItem {
  message: string;
  line?: number;
  path?: string;
  keyword?: string;
  missingProperty?: string;
  expectedType?: string;
  pattern?: string;
}

function RegexTester({ pattern }: { pattern: string }) {
  const [value, setValue] = useState("");
  const result = value ? testPattern(pattern, value) : null;

  return (
    <div className="regex-tester" onClick={(e) => e.stopPropagation()}>
      <code className="regex-tester-pattern">{pattern}</code>
      <input
        className="regex-tester-input"
        type="text"
        placeholder="Type a value to test…"
        value={value}
        onChange={(e) => setValue(e.target.value)}
      />
      {value && (
        <span className={`regex-tester-result ${result === null ? "" : result ? "match" : "no-match"}`}>
          {result === null ? "Invalid pattern" : result ? "✓ Matches" : "✗ No match"}
        </span>
      )}
    </div>
  );
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
  onCoerceType,
}: {
  errors: ErrorItem[];
  success: boolean | null;
  onJump: (line: number) => void;
  onExportJson: () => void;
  onExportPdf: () => void;
  onAutoFix?: () => void;
  onCopyIssue?: () => void;
  onAddRequired?: (path: string, propName: string) => void;
  onCoerceType?: (path: string, expectedType: string) => void;
}) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const [regexTesterOpen, setRegexTesterOpen] = useState<Set<number>>(new Set());
  // React's documented "adjusting state during render" pattern: reset the filter the moment a
  // fresh validation's `errors` array shows up, without a useEffect (which would re-render twice).
  const [prevErrors, setPrevErrors] = useState(errors);
  if (errors !== prevErrors) {
    setPrevErrors(errors);
    setFilter("");
    setActiveIndex(0);
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

  // Same "which rows are actually on screen" computation the render below does (collapsed
  // groups only show their first item), flattened once so arrow-key nav and Enter-to-jump can
  // index into it without re-deriving it inside the keydown handler. `groupStarts[i]` is the
  // flat index of `groups[i]`'s first shown row — precomputed as a plain array (not a mutable
  // counter closed over inside the JSX below) so oxlint doesn't flag it as unsound state.
  const flatShown: ErrorItem[] = [];
  const groupStarts: number[] = [];
  for (const group of groups) {
    groupStarts.push(flatShown.length);
    const isGroup = group.items.length > 1;
    const isOpen = expanded.has(group.message);
    flatShown.push(...(isGroup && !isOpen ? group.items.slice(0, 1) : group.items));
  }

  function onListKeyDown(e: React.KeyboardEvent) {
    if (flatShown.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, flatShown.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const line = flatShown[activeIndex]?.line;
      if (line) onJump(line);
    }
  }

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
          onChange={(e) => {
            setFilter(e.target.value);
            setActiveIndex(0);
          }}
        />
      )}
      {q && <p className="error-filter-count">Showing {visibleErrors.length} of {errors.length}</p>}
      <ul tabIndex={0} onKeyDown={onListKeyDown} aria-label="Errors (arrow keys to move, Enter to jump)">
        {groups.map((group, groupIndex) => {
          const isGroup = group.items.length > 1;
          const isOpen = expanded.has(group.message);
          const shown = isGroup && !isOpen ? group.items.slice(0, 1) : group.items;
          const groupStart = groupStarts[groupIndex];

          return (
            <li key={group.message} className="error-group">
              {shown.map((err, i) => {
                const explanation = explainError(err.keyword);
                const isActive = groupStart + i === activeIndex;
                return (
                  <div key={i} className="error-item">
                    <div
                      className={`error-row ${err.line ? "clickable" : ""} ${isActive ? "active" : ""}`}
                      onClick={() => {
                        setActiveIndex(groupStart + i);
                        if (err.line) onJump(err.line);
                      }}
                    >
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
                      {onCoerceType && err.expectedType && (
                        <button
                          className="quick-fix-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            onCoerceType(err.path ?? "", err.expectedType as string);
                          }}
                        >
                          Convert to {err.expectedType}
                        </button>
                      )}
                      {err.pattern && (
                        <button
                          className="quick-fix-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            setRegexTesterOpen((prev) => {
                              const next = new Set(prev);
                              const idx = groupStart + i;
                              if (next.has(idx)) next.delete(idx);
                              else next.add(idx);
                              return next;
                            });
                          }}
                        >
                          Test pattern
                        </button>
                      )}
                    </div>
                    {explanation && <div className="error-explain">{explanation}</div>}
                    {err.pattern && regexTesterOpen.has(groupStart + i) && <RegexTester pattern={err.pattern} />}
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
