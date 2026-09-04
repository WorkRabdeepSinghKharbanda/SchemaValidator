import Editor, { type OnMount } from "@monaco-editor/react";
import { useRef, useEffect, useState, type DragEvent } from "react";
import type * as Monaco from "monaco-editor";

// @monaco-editor/react loads Monaco itself (and its worker scripts) from a CDN
// (cdn.jsdelivr.net) on first mount rather than bundling it — this is the library's documented
// default, not an accident. A local self-hosted build was tried and reverted: this project's
// Rolldown-based Vite setup pulled in every Monaco language contribution (2.6MB+) and couldn't
// resolve the worker `?worker` imports. The CDN default keeps our own bundle small; it does mean
// the editor needs network access to jsdelivr on first load — noted in README.

const LANGUAGE_BY_FORMAT: Record<string, string> = {
  json: "json",
  yaml: "yaml",
  toml: "ini", // monaco has no toml grammar; ini is the closest built-in highlighter
  xml: "xml",
  csv: "plaintext", // monaco has no csv grammar
};

export interface EditorMarker {
  line: number;
  message: string;
}

// monaco.languages.json.jsonDefaults.setDiagnosticsOptions is a single GLOBAL singleton shared
// by every JSON model in the page — calling it with `schemas: [...]` replaces the whole array,
// it doesn't merge. With two EditorPane instances both using language="json" (schema pane +
// data pane), each one's effect would wipe out the other's entry. This module-level registry
// lets each pane own just its own entry (keyed by model path) and always pushes the full,
// merged set.
const jsonSchemaRegistry = new Map<string, { uri: string; fileMatch: string[]; schema: unknown }>();

function syncJsonDiagnostics(monacoInstance: typeof Monaco) {
  const jsonLanguage = monacoInstance.languages.json as unknown as {
    jsonDefaults: { setDiagnosticsOptions: (opts: unknown) => void };
  };
  jsonLanguage.jsonDefaults.setDiagnosticsOptions({
    validate: true,
    // lib/parse.ts accepts JSONC (comments + trailing commas) via jsonc-parser — match that
    // leniency here so the editor doesn't red-squiggle syntax the validator actually accepts.
    allowComments: true,
    trailingCommas: "ignore",
    schemas: Array.from(jsonSchemaRegistry.values()),
  });
}

export function EditorPane({
  label,
  language,
  value,
  onChange,
  jumpToLine,
  markers,
  theme,
  actions,
  path,
  onDropFile,
  onDropError,
  liveSchema,
}: {
  label: string;
  language: string;
  value: string;
  onChange: (value: string) => void;
  jumpToLine?: number;
  markers?: EditorMarker[];
  theme: "dark" | "light";
  actions?: React.ReactNode;
  path?: string;
  onDropFile?: (text: string) => void;
  onDropError?: (message: string) => void;
  /** When set, wires this JSON model up to live schema validation + autocomplete (JSON only). */
  liveSchema?: unknown;
}) {
  const editorRef = useRef<Monaco.editor.IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<typeof Monaco | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [cursor, setCursor] = useState({ line: 1, column: 1 });

  const handleMount: OnMount = (editor, monacoInstance) => {
    editorRef.current = editor;
    monacoRef.current = monacoInstance;
    // Monaco itself loads asynchronously (from the CDN), so this may mount well after the
    // liveSchema-diagnostics effect below already ran and no-opped on a null monacoRef —
    // apply the current liveSchema now that we actually have an instance to apply it to.
    applyLiveSchema(monacoInstance);
    editor.onDidChangeCursorPosition((e) => setCursor({ line: e.position.lineNumber, column: e.position.column }));
  };

  function applyLiveSchema(monacoInstance: typeof Monaco) {
    if (language !== "json" || !path) return;
    if (liveSchema) {
      jsonSchemaRegistry.set(path, { uri: `inmemory://schema-validator/${path}.schema.json`, fileMatch: [path], schema: liveSchema });
    } else {
      jsonSchemaRegistry.delete(path);
    }
    syncJsonDiagnostics(monacoInstance);
  }

  useEffect(() => {
    if (jumpToLine && editorRef.current) {
      editorRef.current.revealLineInCenter(jumpToLine);
      editorRef.current.setPosition({ lineNumber: jumpToLine, column: 1 });
      editorRef.current.focus();
    }
  }, [jumpToLine]);

  useEffect(() => {
    const editor = editorRef.current;
    const monacoInstance = monacoRef.current;
    if (!editor || !monacoInstance) return;
    const model = editor.getModel();
    if (!model) return;
    const lineCount = model.getLineCount();
    monacoInstance.editor.setModelMarkers(
      model,
      "schema-validator",
      (markers ?? [])
        .filter((m) => m.line >= 1 && m.line <= lineCount)
        .map((m) => ({
          startLineNumber: m.line,
          endLineNumber: m.line,
          startColumn: 1,
          endColumn: model.getLineMaxColumn(m.line),
          message: m.message,
          severity: monacoInstance.MarkerSeverity.Error,
        })),
    );
  }, [markers, value]);

  // Feeds the schema into Monaco's built-in JSON language service so the data editor gets
  // real autocomplete + hover docs + live diagnostics for free, scoped to just this model
  // (see the jsonSchemaRegistry comment above — this API is a global singleton, not per-model).
  useEffect(() => {
    const monacoInstance = monacoRef.current;
    if (!monacoInstance) return;
    applyLiveSchema(monacoInstance);
    return () => {
      if (path) jsonSchemaRegistry.delete(path);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [liveSchema, language, path]);

  function handleDrop(e: DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (!file || !onDropFile) return;
    const reader = new FileReader();
    reader.onload = () => onDropFile(String(reader.result ?? ""));
    reader.onerror = () => onDropError?.(`Couldn't read "${file.name}": ${reader.error?.message ?? "unknown error"}`);
    reader.readAsText(file);
  }

  return (
    <div
      className={`editor-pane ${dragOver ? "drag-over" : ""}`}
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
    >
      <div className="editor-label">
        <span>{label}</span>
        {actions && <span className="editor-actions">{actions}</span>}
      </div>
      <div className="editor-monaco-wrap">
        <Editor
          height="100%"
          path={path}
          language={LANGUAGE_BY_FORMAT[language] ?? language}
          value={value}
          onChange={(v) => onChange(v ?? "")}
          onMount={handleMount}
          theme={theme === "dark" ? "vs-dark" : "vs"}
          options={{ minimap: { enabled: false }, fontSize: 13, scrollBeyondLastLine: false }}
        />
        {dragOver && <div className="drop-overlay">Drop file to load</div>}
      </div>
      <div className="editor-status-bar">
        <span>
          Ln {cursor.line}, Col {cursor.column}
        </span>
        <span>{value.length.toLocaleString()} chars</span>
      </div>
    </div>
  );
}
