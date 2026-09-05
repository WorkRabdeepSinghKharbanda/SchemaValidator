import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import { FormatTabs } from "./components/FormatTabs";
import type { EditorMarker } from "./components/EditorPane";
import { ErrorList, type ErrorItem } from "./components/ErrorList";
import { ResizableSplit } from "./components/ResizableSplit";
import { Toolbar } from "./components/Toolbar";
import { SavedPanel } from "./components/SavedPanel";
import { ReferencesPanel } from "./components/ReferencesPanel";
import { OpenApiImportPanel } from "./components/OpenApiImportPanel";
import { CustomPresetsPanel } from "./components/CustomPresetsPanel";
import { BatchTable, type BatchRow } from "./components/BatchTable";
import { ToastStack, type ToastMessage } from "./components/Toast";
import { OverflowMenu } from "./components/OverflowMenu";
import { AdSlot } from "./components/AdSlot";
import { parse, type Format } from "./lib/parse";
import { serialize } from "./lib/serialize";
import { validate, type Draft } from "./lib/validate";
import { inferSchema } from "./lib/infer";
import { generateSample, generateSampleArray } from "./lib/generate";
import { buildShareUrl, readShareStateFromUrl, exportSessionFile, importSessionFile } from "./lib/share";
import { loadHistory, saveToHistory, clearHistory, removeHistoryEntry, type HistoryEntry } from "./lib/history";
import {
  loadWorkspaces,
  saveWorkspace,
  removeWorkspace,
  togglePinnedWorkspace,
  exportWorkspacesBackup,
  importWorkspacesBackup,
  type Workspace,
} from "./lib/workspaces";
import { schemaToFields, fieldsToSchema, type SchemaField } from "./lib/schemaFields";
import { generateSchemaDocs } from "./lib/docgen";
import { generateTypeScriptInterface } from "./lib/schemaToTs";
import { tryAutoFix } from "./lib/autofix";
import { exportValidationReportPdf, exportBatchReportPdf, exportSchemaDocsPdf } from "./lib/pdf";
import { refsCacheKey, type ReferenceSchema } from "./lib/refs";
import { loadCustomPresets, saveCustomPreset, removeCustomPreset, type CustomPreset } from "./lib/customPresets";
import { detectDraftFromSchema } from "./lib/detectDraft";
import { generateNodeSnippet, generatePythonSnippet } from "./lib/snippet";
import { generateIssueMarkdown } from "./lib/issueMarkdown";
import { makeFieldOptional } from "./lib/requiredFix";
import { coerceValueAtPath } from "./lib/typeCoerce";
import { summarizeSchema } from "./lib/summarizeSchema";
import { ShortcutsModal } from "./components/ShortcutsModal";
import { CommandPalette, type Command } from "./components/CommandPalette";
import { nextThemePref, resolveTheme, isThemePref, type ThemePref } from "./lib/theme";
import { useDebounce } from "./hooks/useDebounce";
import "./App.css";

// Monaco is the single largest dependency in this app (~500kB minified) — lazy-loading the
// editor component keeps it out of the initial bundle so the page shell paints immediately.
const EditorPane = lazy(() => import("./components/EditorPane").then((m) => ({ default: m.EditorPane })));
const SchemaBuilder = lazy(() => import("./components/SchemaBuilder").then((m) => ({ default: m.SchemaBuilder })));
const DiffView = lazy(() => import("./components/DiffView").then((m) => ({ default: m.DiffView })));

const SAMPLE_SCHEMA = `{
  "type": "object",
  "properties": {
    "name": { "type": "string" },
    "age": { "type": "integer", "minimum": 0 }
  },
  "required": ["name"]
}`;

const SAMPLE_DATA = `{
  "name": "Ada",
  "age": 30
}`;

let toastId = 0;

function download(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
}

function App() {
  const shared = useMemo(() => readShareStateFromUrl(), []);
  // A share link always wins (it's an explicit, just-clicked intent) — only fall back to the
  // pinned workspace, if any, when there isn't one.
  const pinnedWorkspace = useMemo(() => (shared ? undefined : loadWorkspaces().find((w) => w.pinned)), [shared]);

  const [themePref, setThemePref] = useState<ThemePref>(() => {
    const stored = localStorage.getItem("theme");
    return isThemePref(stored) ? stored : "dark";
  });
  const [systemPrefersDark, setSystemPrefersDark] = useState(() => window.matchMedia("(prefers-color-scheme: dark)").matches);
  const theme = resolveTheme(themePref, systemPrefersDark);
  const [editorFontSize, setEditorFontSize] = useState(() => Number(localStorage.getItem("editorFontSize")) || 13);
  const [wordWrap, setWordWrap] = useState(() => localStorage.getItem("wordWrap") === "true");
  const [focusMode, setFocusMode] = useState(false);
  const [realtime, setRealtime] = useState(false);
  const [draft, setDraft] = useState<Draft>(shared?.draft ?? pinnedWorkspace?.draft ?? "2020-12");
  const [batchMode, setBatchMode] = useState(false);
  const [format, setFormat] = useState<Format>(shared?.format ?? pinnedWorkspace?.format ?? "json");
  const [schemaText, setSchemaText] = useState(shared?.schema ?? pinnedWorkspace?.schema ?? SAMPLE_SCHEMA);
  const [dataText, setDataText] = useState(shared?.data ?? pinnedWorkspace?.data ?? SAMPLE_DATA);
  const [schemaView, setSchemaView] = useState<"code" | "visual">("code");

  const [success, setSuccess] = useState<boolean | null>(null);
  const [errors, setErrors] = useState<ErrorItem[]>([]);
  const [dataMarkers, setDataMarkers] = useState<EditorMarker[]>([]);
  const [batchRows, setBatchRows] = useState<BatchRow[] | null>(null);
  const [jumpLine, setJumpLine] = useState<number | undefined>();
  const [canAutoFix, setCanAutoFix] = useState(false);
  const [lastValidData, setLastValidData] = useState<string | null>(null);
  const [showDiff, setShowDiff] = useState(false);
  const [schemaDiffTarget, setSchemaDiffTarget] = useState("");

  const [refSchemas, setRefSchemas] = useState<ReferenceSchema[]>(shared?.refSchemas ?? pinnedWorkspace?.refSchemas ?? []);
  const [refsOpen, setRefsOpen] = useState(false);
  const [openApiOpen, setOpenApiOpen] = useState(false);
  const [customPresetsOpen, setCustomPresetsOpen] = useState(false);
  const [customPresets, setCustomPresets] = useState<CustomPreset[]>(() => loadCustomPresets());
  const [minimapEnabled, setMinimapEnabled] = useState(() => localStorage.getItem("minimapEnabled") === "true");

  const [savedOpen, setSavedOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [history, setHistory] = useState<HistoryEntry[]>(() => loadHistory());
  const [workspaces, setWorkspaces] = useState<Workspace[]>(() => loadWorkspaces());
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  useEffect(() => {
    localStorage.setItem("theme", themePref);
  }, [themePref]);

  useEffect(() => {
    localStorage.setItem("editorFontSize", String(editorFontSize));
  }, [editorFontSize]);

  useEffect(() => {
    localStorage.setItem("wordWrap", String(wordWrap));
  }, [wordWrap]);

  useEffect(() => {
    localStorage.setItem("minimapEnabled", String(minimapEnabled));
  }, [minimapEnabled]);

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => setSystemPrefersDark(media.matches);
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

  function toast(text: string, tone: ToastMessage["tone"] = "info", action?: ToastMessage["action"]) {
    const id = ++toastId;
    setToasts((prev) => [...prev, { id, text, tone, action }]);
  }

  // Snapshots the fields a one-click destructive action is about to overwrite, and returns a
  // toast `action` that restores exactly that snapshot — a single-level "Undo" for auto-fix,
  // sample generation, make-optional, preset insertion, and OpenAPI import, all of which
  // overwrite schemaText/dataText/refSchemas wholesale with no confirmation step of their own.
  // Reads from refs, not closure variables — the async handlers that call this (auto-fix, sample
  // generation, batch sample generation) only guard their OWN result against a stale `dataText`
  // (via dataTextRef) before applying it; they don't re-check schemaText/refSchemas. If this read
  // the closure values instead, an Undo after the user edited the schema pane while one of those
  // was in flight would silently restore the stale, pre-edit schema — refs are always current
  // regardless of how long the async work took.
  function snapshotForUndo() {
    const prev = { schemaText: schemaTextRef.current, dataText: dataTextRef.current, refSchemas: refSchemasRef.current };
    return {
      label: "Undo",
      onClick: () => {
        setSchemaText(prev.schemaText);
        setDataText(prev.dataText);
        setRefSchemas(prev.refSchemas);
        clearValidationState();
      },
    };
  }
  function dismissToast(id: number) {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }

  function runSingleValidation(): { ok: boolean; items: ErrorItem[]; markers: EditorMarker[]; autoFixable: boolean } {
    const dataResult = parse(dataText, format);
    if (dataResult.error) {
      const line = dataResult.error.line;
      return {
        ok: false,
        items: [{ message: dataResult.error.message, line }],
        markers: line ? [{ line, message: dataResult.error.message }] : [],
        autoFixable: format === "json",
      };
    }

    if (schemaText.trim() === "") {
      return { ok: true, items: [], markers: [], autoFixable: false };
    }

    const schemaResult = parse(schemaText, "json");
    if (schemaResult.error) {
      return {
        ok: false,
        items: [{ message: `Schema is invalid JSON: ${schemaResult.error.message}` }],
        markers: [],
        autoFixable: false,
      };
    }

    const outcome = validate(dataResult.data, schemaResult.data, {
      sourceText: dataText,
      sourceFormat: format,
      draft,
      schemaCacheKey: `${schemaText}::refs:${refsCacheKey(refSchemas)}`,
      refSchemas,
    });
    return {
      ok: outcome.valid,
      items: outcome.errors.map((e) => ({
        message: e.message,
        path: e.path,
        line: e.line,
        keyword: e.keyword,
        missingProperty: e.missingProperty,
        expectedType: e.expectedType,
      })),
      markers: outcome.errors.filter((e) => e.line).map((e) => ({ line: e.line as number, message: e.message })),
      autoFixable: false,
    };
  }

  function runBatchValidation() {
    const dataResult = parse(dataText, format);
    if (dataResult.error || !Array.isArray(dataResult.data)) {
      toast("Batch mode needs the data pane to contain an array of records.", "error");
      setBatchRows(null);
      return;
    }
    if (schemaText.trim() === "") {
      setBatchRows(dataResult.data.map((_, index) => ({ index, valid: true, errorSummary: "" })));
      return;
    }

    const schemaResult = parse(schemaText, "json");
    if (schemaResult.error) {
      toast(`Schema is invalid JSON: ${schemaResult.error.message}`, "error");
      setBatchRows(null);
      return;
    }
    const rows: BatchRow[] = dataResult.data.map((item, index) => {
      const outcome = validate(item, schemaResult.data, {
        draft,
        schemaCacheKey: `${schemaText}::refs:${refsCacheKey(refSchemas)}`,
        refSchemas,
      });
      return {
        index,
        valid: outcome.valid,
        errorSummary: outcome.valid ? "" : outcome.errors.map((e) => `${e.path}: ${e.message}`).join("; "),
      };
    });
    setBatchRows(rows);
  }

  function handleValidate(saveHistory: boolean) {
    setJumpLine(undefined);
    setShowDiff(false);

    if (batchMode) {
      runBatchValidation();
      return;
    }
    setBatchRows(null);

    const result = runSingleValidation();
    setSuccess(result.ok);
    setErrors(result.items);
    setDataMarkers(result.markers);
    setCanAutoFix(result.autoFixable);
    if (result.ok) setLastValidData(dataText);

    if (saveHistory) {
      const updated = saveToHistory({ schema: schemaText, data: dataText, format, draft, refSchemas, valid: result.ok });
      setHistory(updated);
    }
  }

  const debouncedSchema = useDebounce(schemaText, 500);
  const debouncedData = useDebounce(dataText, 500);
  useEffect(() => {
    if (!realtime) return;
    handleValidate(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSchema, debouncedData, format, draft, realtime, batchMode]);

  const liveSchema = useMemo(() => {
    if (format !== "json") return undefined;
    const result = parse(debouncedSchema, "json");
    return result.error ? undefined : result.data;
  }, [debouncedSchema, format]);

  const handleValidateRef = useRef(handleValidate);
  handleValidateRef.current = handleValidate;
  const batchModeRef = useRef(batchMode);
  batchModeRef.current = batchMode;
  const formatRef = useRef(format);
  formatRef.current = format;
  const dataTextRef = useRef(dataText);
  dataTextRef.current = dataText;
  const schemaTextRef = useRef(schemaText);
  schemaTextRef.current = schemaText;
  const refSchemasRef = useRef(refSchemas);
  refSchemasRef.current = refSchemas;
  // Set right before a restore/import sets its own explicit `draft`, so the auto-detect effect
  // below (which would otherwise immediately re-fire off the new schemaText and silently flip
  // that just-restored draft again) skips exactly one cycle instead of fighting the restore.
  const skipNextDraftDetectRef = useRef(false);

  useEffect(() => {
    function onKeydown(e: KeyboardEvent) {
      const meta = e.metaKey || e.ctrlKey;
      if (meta && e.key === "k") {
        e.preventDefault();
        setPaletteOpen((v) => !v);
      } else if (meta && e.key === "Enter") {
        e.preventDefault();
        handleValidateRef.current(true);
      } else if (meta && e.key === "s") {
        e.preventDefault();
        handleValidateRef.current(true);
        if (!batchModeRef.current) toast("Saved to history", "success");
      } else if (!meta && e.key === "?" && !(e.target instanceof HTMLElement && (e.target.closest(".monaco-editor") || e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA"))) {
        e.preventDefault();
        setShortcutsOpen(true);
      }
    }
    window.addEventListener("keydown", onKeydown);
    return () => window.removeEventListener("keydown", onKeydown);
  }, []);

  function handleInferSchema() {
    const result = parse(dataText, format);
    if (result.error) {
      toast(`Can't infer schema: ${result.error.message}`, "error");
      return;
    }
    setSchemaText(JSON.stringify(inferSchema(result.data), null, 2));
    toast("Schema inferred from data", "success");
  }

  async function handleGenerateSample() {
    const schemaResult = parse(schemaText, "json");
    if (schemaResult.error) {
      toast(`Schema is invalid JSON: ${schemaResult.error.message}`, "error");
      return;
    }
    const dataSnapshot = dataTextRef.current;
    try {
      const sample = await generateSample(schemaResult.data);
      if (dataTextRef.current !== dataSnapshot) {
        toast("Data changed while generating a sample — click again to apply it.", "info");
        return;
      }
      const undo = snapshotForUndo();
      setDataText(serialize(sample, formatRef.current));
      toast("Sample data generated", "success", undo);
    } catch (e) {
      toast(`Couldn't generate sample: ${(e as Error).message}`, "error");
    }
  }

  async function handleGenerateBatchSamples() {
    const schemaResult = parse(schemaText, "json");
    if (schemaResult.error) {
      toast(`Schema is invalid JSON: ${schemaResult.error.message}`, "error");
      return;
    }
    const countInput = window.prompt("How many sample records?", "10");
    if (!countInput) return;
    const count = Math.min(500, Math.max(1, Math.floor(Number(countInput))));
    if (!Number.isFinite(count) || count < 1) {
      toast("Enter a positive number of records", "error");
      return;
    }
    const dataSnapshot = dataTextRef.current;
    try {
      const samples = await generateSampleArray(schemaResult.data, count);
      if (dataTextRef.current !== dataSnapshot) {
        toast("Data changed while generating samples — click again to apply it.", "info");
        return;
      }
      const undo = snapshotForUndo();
      setDataText(serialize(samples, formatRef.current));
      toast(`Generated ${count} sample records`, "success", undo);
    } catch (e) {
      toast(`Couldn't generate samples: ${(e as Error).message}`, "error");
    }
  }

  function handleConvertTo(target: Format) {
    const result = parse(dataText, format);
    if (result.error) {
      toast(`Can't convert invalid data: ${result.error.message}`, "error");
      return;
    }
    setDataText(serialize(result.data, target));
    setFormat(target);
  }

  function handleInsertPreset(snippet: unknown) {
    if (typeof snippet !== "object" || snippet === null || Array.isArray(snippet)) {
      toast("Preset must be a JSON object (a field schema)", "error");
      return;
    }
    const schemaResult = parse(schemaText, "json");
    if (schemaResult.error || typeof schemaResult.data !== "object" || schemaResult.data === null) {
      toast("Fix the schema JSON before inserting a preset", "error");
      return;
    }
    const schema = schemaResult.data as Record<string, unknown>;
    const properties = (schema.properties as Record<string, unknown>) ?? {};
    let key = "newField";
    let n = 1;
    while (key in properties) key = `newField${n++}`;
    properties[key] = snippet;
    schema.properties = properties;
    schema.type = schema.type ?? "object";
    const undo = snapshotForUndo();
    setSchemaText(JSON.stringify(schema, null, 2));
    toast(`Inserted "${key}" field`, "success", undo);
  }

  function handleSaveCustomPreset(label: string, snippetJson: string) {
    setCustomPresets(saveCustomPreset(label, snippetJson));
    toast(`Saved preset "${label}"`, "success");
  }

  function handleInsertCustomPreset(snippetJson: string) {
    try {
      handleInsertPreset(JSON.parse(snippetJson));
      setCustomPresetsOpen(false);
    } catch (e) {
      toast(`Preset isn't valid JSON: ${(e as Error).message}`, "error");
    }
  }

  function handleToggleBatchMode() {
    setBatchMode((v) => !v);
    setDataMarkers([]);
    setErrors([]);
    setSuccess(null);
    setBatchRows(null);
  }

  function handleShare() {
    const url = buildShareUrl({ schema: schemaText, data: dataText, format, draft, refSchemas });
    navigator.clipboard.writeText(url).then(
      () => toast("Shareable link copied to clipboard", "success"),
      () => toast(url, "info"),
    );
  }

  function handleExportSessionFile() {
    const json = exportSessionFile({ schema: schemaText, data: dataText, format, draft, refSchemas });
    download("schema-validator-session.json", json, "application/json");
  }

  function handleImportSessionFile(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const state = importSessionFile(String(reader.result ?? ""));
        skipNextDraftDetectRef.current = true;
        setSchemaText(state.schema);
        setDataText(state.data);
        setFormat(state.format);
        setDraft(state.draft);
        setRefSchemas(state.refSchemas);
        clearValidationState();
        toast("Imported session file", "success");
      } catch (e) {
        toast(`Couldn't import session file: ${(e as Error).message}`, "error");
      }
    };
    reader.onerror = () => toast(`Couldn't read "${file.name}": ${reader.error?.message ?? "unknown error"}`, "error");
    reader.readAsText(file);
  }

  function handleExportReportJson() {
    const report = { valid: success, format, draft, errors, timestamp: new Date().toISOString() };
    download("validation-report.json", JSON.stringify(report, null, 2), "application/json");
  }

  function handleExportReportPdf() {
    exportValidationReportPdf({ valid: success, format, draft, errors }).catch((e) =>
      toast(`Couldn't generate PDF: ${(e as Error).message}`, "error"),
    );
  }

  function handleExportBatchJson() {
    if (!batchRows) return;
    download("batch-validation-report.json", JSON.stringify(batchRows, null, 2), "application/json");
  }

  function handleExportFailingBatchJson() {
    if (!batchRows) return;
    download("batch-validation-failing.json", JSON.stringify(batchRows.filter((r) => !r.valid), null, 2), "application/json");
  }

  function handleExportBatchPdf() {
    if (!batchRows) return;
    exportBatchReportPdf(batchRows).catch((e) => toast(`Couldn't generate PDF: ${(e as Error).message}`, "error"));
  }

  async function handleAutoFix() {
    const dataSnapshot = dataTextRef.current;
    const fixed = await tryAutoFix(dataSnapshot);
    if (!fixed) {
      toast("Couldn't auto-fix — the JSON is too broken to guess at.", "error");
      return;
    }
    if (dataTextRef.current !== dataSnapshot) {
      toast("Data changed before the fix finished — try again.", "info");
      return;
    }
    const undo = snapshotForUndo();
    setDataText(fixed);
    toast("Applied a best-effort fix — re-check the result", "success", undo);
  }

  function handleExportDocs() {
    const schemaResult = parse(schemaText, "json");
    if (schemaResult.error) {
      toast(`Schema is invalid JSON: ${schemaResult.error.message}`, "error");
      return;
    }
    download("schema-docs.md", generateSchemaDocs(schemaResult.data), "text/markdown");
  }

  function handleExportTypeScript() {
    const schemaResult = parse(schemaText, "json");
    if (schemaResult.error) {
      toast(`Schema is invalid JSON: ${schemaResult.error.message}`, "error");
      return;
    }
    download("schema.d.ts", generateTypeScriptInterface(schemaResult.data), "text/typescript");
  }

  function handleCopySnippet(lang: "node" | "python") {
    const schemaResult = parse(schemaText, "json");
    if (schemaResult.error) {
      toast(`Schema is invalid JSON: ${schemaResult.error.message}`, "error");
      return;
    }
    const snippet =
      lang === "node" ? generateNodeSnippet(schemaResult.data, draft) : generatePythonSnippet(schemaResult.data, draft);
    navigator.clipboard.writeText(snippet).then(
      () => toast(`Copied ${lang === "node" ? "Node.js" : "Python"} validation snippet`, "success"),
      () => toast(snippet, "info"),
    );
  }

  function handleMakeFieldOptional(path: string, propName: string) {
    const schemaResult = parse(schemaText, "json");
    if (schemaResult.error) {
      toast(`Schema is invalid JSON: ${schemaResult.error.message}`, "error");
      return;
    }
    const updated = makeFieldOptional(schemaResult.data, path, propName);
    if (updated === schemaResult.data) {
      toast(`Couldn't find "${propName}" in the schema's required list`, "error");
      return;
    }
    const undo = snapshotForUndo();
    setSchemaText(JSON.stringify(updated, null, 2));
    toast(`Made "${propName}" optional`, "success", undo);
  }

  function handleCoerceType(path: string, expectedType: string) {
    const dataResult = parse(dataText, format);
    if (dataResult.error) return;
    const result = coerceValueAtPath(dataResult.data, path, expectedType);
    if (!result.ok) {
      toast(`Couldn't automatically convert that value to ${expectedType}`, "error");
      return;
    }
    const undo = snapshotForUndo();
    setDataText(serialize(result.data, format));
    toast(`Converted value to ${expectedType}`, "success", undo);
  }

  function handleCopyIssueMarkdown() {
    const markdown = generateIssueMarkdown(errors, format, draft);
    navigator.clipboard.writeText(markdown).then(
      () => toast("Copied issue markdown to clipboard", "success"),
      () => toast(markdown, "info"),
    );
  }

  function handleExportDocsPdf() {
    const schemaResult = parse(schemaText, "json");
    if (schemaResult.error) {
      toast(`Schema is invalid JSON: ${schemaResult.error.message}`, "error");
      return;
    }
    exportSchemaDocsPdf(schemaResult.data).catch((e) => toast(`Couldn't generate PDF: ${(e as Error).message}`, "error"));
  }

  function handleSchemaFieldsChange(fields: SchemaField[]) {
    const schemaResult = parse(schemaText, "json");
    const base = schemaResult.error ? {} : schemaResult.data;
    setSchemaText(JSON.stringify(fieldsToSchema(fields, base), null, 2));
  }

  function handleSwitchToVisual() {
    const result = parse(schemaText, "json");
    if (result.error) {
      toast("Fix the schema JSON before switching to Visual mode", "error");
      return;
    }
    setSchemaView("visual");
  }

  function handleAddRef(id: string, schema: unknown) {
    if (schema === null) {
      toast(`Couldn't add "${id}" as a reference schema`, "error");
      return;
    }
    setRefSchemas((prev) => [...prev.filter((r) => r.id !== id), { id, schema }]);
    toast(`Added reference schema "${id}"`, "success");
  }

  function handleImportOpenApi(name: string, schemas: Record<string, unknown>) {
    const undo = snapshotForUndo();
    setSchemaText(JSON.stringify(schemas[name], null, 2));
    const others = Object.entries(schemas)
      .filter(([n]) => n !== name)
      .map(([id, schema]) => ({ id, schema }));
    setRefSchemas((prev) => [...prev.filter((r) => !Object.hasOwn(schemas, r.id)), ...others]);
    setSchemaView("code");
    setOpenApiOpen(false);
    toast(`Imported "${name}" (${others.length} sibling schema${others.length !== 1 ? "s" : ""} added as references)`, "success", undo);
  }

  function handleExportWorkspaces() {
    download("schema-validator-workspaces.json", exportWorkspacesBackup(), "application/json");
  }

  function handleImportWorkspaces(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const updated = importWorkspacesBackup(String(reader.result ?? ""));
        setWorkspaces(updated);
        toast("Imported workspace backup", "success");
      } catch (e) {
        toast(`Couldn't import backup: ${(e as Error).message}`, "error");
      }
    };
    reader.onerror = () => toast(`Couldn't read "${file.name}": ${reader.error?.message ?? "unknown error"}`, "error");
    reader.readAsText(file);
  }

  function handleSaveAs() {
    const name = window.prompt("Name this workspace:");
    if (!name) return;
    const updated = saveWorkspace({ name, schema: schemaText, data: dataText, format, draft, refSchemas });
    setWorkspaces(updated);
    toast(`Saved "${name}"`, "success");
  }

  // Restoring history/a workspace swaps out schemaText/dataText wholesale — any validation
  // output computed against the *previous* text (error markers, the pass/fail state, the diff
  // baseline) is now describing a document that no longer exists. Without this, a stale Monaco
  // squiggle or "Show diff from last valid" button can survive a restore and attach itself to
  // an unrelated line/version of the freshly-loaded data (same class of bug batch-mode toggling
  // already guards against, via handleToggleBatchMode).
  function clearValidationState() {
    setSuccess(null);
    setErrors([]);
    setDataMarkers([]);
    setBatchRows(null);
    setJumpLine(undefined);
    setCanAutoFix(false);
    setLastValidData(null);
    setShowDiff(false);
    setSchemaDiffTarget("");
  }

  function handleRestoreHistory(entry: HistoryEntry) {
    skipNextDraftDetectRef.current = true;
    setSchemaText(entry.schema);
    setDataText(entry.data);
    setFormat(entry.format);
    setDraft(entry.draft);
    setRefSchemas(entry.refSchemas);
    clearValidationState();
    setSavedOpen(false);
    toast("Restored from history", "success");
  }

  function handleRestoreWorkspace(w: Workspace) {
    skipNextDraftDetectRef.current = true;
    setSchemaText(w.schema);
    setDataText(w.data);
    setFormat(w.format);
    setDraft(w.draft);
    setRefSchemas(w.refSchemas);
    clearValidationState();
    setSavedOpen(false);
    toast(`Loaded "${w.name}"`, "success");
  }

  // The schema code editor stays visible and editable in Visual mode (switching modes doesn't
  // lock it), so schemaText can go from valid to invalid while SchemaBuilder is showing. Track
  // the parse result itself, not just the derived fields, so the render below can tell "empty
  // schema" apart from "unparseable schema" — conflating them let handleSchemaFieldsChange
  // silently rebuild (discard) a broken schema from an empty `{}` base. See handleSchemaFieldsChange.
  const schemaParseResult = useMemo(() => parse(schemaText, "json"), [schemaText]);
  const detectedDraft = useMemo(
    () => (schemaParseResult.error ? undefined : detectDraftFromSchema(schemaParseResult.data)),
    [schemaParseResult],
  );
  // Auto-switches the draft dropdown to match the schema's own "$schema" URI. Keyed on
  // `detectedDraft` (not `schemaText`) so this only re-fires when the *detected draft itself*
  // changes — if the user manually overrides the dropdown afterward without touching the schema
  // text again, this won't fight them back to the detected value on the next render. Restoring
  // history/a workspace/a session file sets `skipNextDraftDetectRef` first specifically so this
  // doesn't immediately re-derive (and silently override) that restore's own explicit `draft`.
  useEffect(() => {
    if (skipNextDraftDetectRef.current) {
      skipNextDraftDetectRef.current = false;
      return;
    }
    if (detectedDraft && detectedDraft !== draft) {
      setDraft(detectedDraft);
      toast(`Detected "$schema" — switched draft to ${detectedDraft}`, "info");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [detectedDraft]);
  const schemaSummary = useMemo(
    () => (schemaParseResult.error ? undefined : summarizeSchema(schemaParseResult.data)),
    [schemaParseResult],
  );
  const schemaFields = useMemo(() => {
    if (schemaView !== "visual" || schemaParseResult.error) return [];
    return schemaToFields(schemaParseResult.data);
  }, [schemaView, schemaParseResult]);

  const commands: Command[] = [
    { label: "Validate", hint: "⌘⏎", run: () => handleValidate(true) },
    { label: "Save as workspace…", run: handleSaveAs },
    { label: "Open saved / history", run: () => setSavedOpen(true) },
    { label: "Copy shareable link", run: handleShare },
    { label: `Toggle batch mode (currently ${batchMode ? "on" : "off"})`, run: handleToggleBatchMode },
    { label: `Toggle realtime validation (currently ${realtime ? "on" : "off"})`, run: () => setRealtime((v) => !v) },
    { label: "Export report as JSON", run: handleExportReportJson },
    { label: "Export report as PDF", run: handleExportReportPdf },
    { label: "Export field docs (Markdown)", run: handleExportDocs },
    { label: "Export field docs (PDF)", run: handleExportDocsPdf },
    { label: "Export as TypeScript interface", run: handleExportTypeScript },
    { label: "Copy schema as Node.js snippet", run: () => handleCopySnippet("node") },
    { label: "Copy schema as Python snippet", run: () => handleCopySnippet("python") },
    { label: "Infer schema from data", run: handleInferSchema },
    { label: "Generate sample data from schema", run: handleGenerateSample },
    ...(batchMode ? [{ label: "Generate N samples (batch)…", run: handleGenerateBatchSamples }] : []),
    { label: "Manage reference schemas…", run: () => setRefsOpen(true) },
    { label: "Import from OpenAPI…", run: () => setOpenApiOpen(true) },
    { label: `Manage custom presets (${customPresets.length})`, run: () => setCustomPresetsOpen(true) },
    { label: "Cycle theme (dark / light / auto)", run: () => setThemePref(nextThemePref) },
    { label: `Toggle focus mode (currently ${focusMode ? "on" : "off"})`, run: () => setFocusMode((v) => !v) },
    { label: "Export saved workspaces as backup", run: handleExportWorkspaces },
    { label: "Export session as file", run: handleExportSessionFile },
    { label: "Show keyboard shortcuts", hint: "?", run: () => setShortcutsOpen(true) },
  ];

  return (
    <div className={`app ${focusMode ? "focus-mode" : ""}`}>
      <ToastStack toasts={toasts} onDismiss={dismissToast} />
      {focusMode && (
        <button className="focus-exit-btn" onClick={() => setFocusMode(false)} title="Exit focus mode">
          ⛶ Exit focus mode
        </button>
      )}
      <ShortcutsModal open={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />
      {paletteOpen && <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} commands={commands} />}
      <SavedPanel
        open={savedOpen}
        onClose={() => setSavedOpen(false)}
        history={history}
        onRestoreHistory={handleRestoreHistory}
        onRemoveHistory={(id) => setHistory(removeHistoryEntry(id))}
        onClearHistory={() => setHistory(clearHistory())}
        workspaces={workspaces}
        onRestoreWorkspace={handleRestoreWorkspace}
        onRemoveWorkspace={(id) => setWorkspaces(removeWorkspace(id))}
        onTogglePinned={(id) => setWorkspaces(togglePinnedWorkspace(id))}
        onExportWorkspaces={handleExportWorkspaces}
        onImportWorkspaces={handleImportWorkspaces}
      />
      <ReferencesPanel
        open={refsOpen}
        onClose={() => setRefsOpen(false)}
        refs={refSchemas}
        onAdd={handleAddRef}
        onRemove={(id) => setRefSchemas((prev) => prev.filter((r) => r.id !== id))}
        onError={(message) => toast(message, "error")}
      />
      <OpenApiImportPanel
        open={openApiOpen}
        onClose={() => setOpenApiOpen(false)}
        onImport={handleImportOpenApi}
        onError={(message) => toast(message, "error")}
        onWarning={(message) => toast(message, "info")}
      />
      <CustomPresetsPanel
        open={customPresetsOpen}
        onClose={() => setCustomPresetsOpen(false)}
        presets={customPresets}
        onSave={handleSaveCustomPreset}
        onRemove={(id) => setCustomPresets(removeCustomPreset(id))}
        onInsert={handleInsertCustomPreset}
        onError={(message) => toast(message, "error")}
      />

      <header>
        <div className="brand">
          <span className="brand-mark">◆</span>
          <div>
            <h1>Schema Validator</h1>
            <p>Validate JSON / YAML / TOML data against a JSON Schema — entirely in your browser.</p>
          </div>
        </div>
        <span className="brand-pill">100% client-side</span>
      </header>

      <Toolbar
        themePref={themePref}
        onToggleTheme={() => setThemePref(nextThemePref)}
        realtime={realtime}
        onToggleRealtime={() => setRealtime((v) => !v)}
        draft={draft}
        onDraftChange={setDraft}
        onShare={handleShare}
        batchMode={batchMode}
        onToggleBatchMode={handleToggleBatchMode}
        onOpenSaved={() => setSavedOpen(true)}
        onSaveAs={handleSaveAs}
        onOpenShortcuts={() => setShortcutsOpen(true)}
        onOpenPalette={() => setPaletteOpen(true)}
        editorFontSize={editorFontSize}
        onEditorFontSizeChange={setEditorFontSize}
        wordWrap={wordWrap}
        onToggleWordWrap={() => setWordWrap((v) => !v)}
        focusMode={focusMode}
        onToggleFocusMode={() => setFocusMode((v) => !v)}
        minimapEnabled={minimapEnabled}
        onToggleMinimap={() => setMinimapEnabled((v) => !v)}
      />

      {schemaSummary && <p className="schema-summary">{schemaSummary}</p>}

      <Suspense fallback={<div className="editor-loading">Loading editor…</div>}>
      <ResizableSplit
        left={
          <EditorPane
            label="Schema (JSON Schema)"
            language="json"
            value={schemaText}
            onChange={setSchemaText}
            theme={theme}
            fontSize={editorFontSize}
            wordWrap={wordWrap}
            minimap={minimapEnabled}
            path="schema.json"
            onDropFile={setSchemaText}
            onDropError={(message) => toast(message, "error")}
            actions={
              <>
                <div className="view-toggle">
                  <button className={schemaView === "code" ? "active" : ""} onClick={() => setSchemaView("code")}>
                    Code
                  </button>
                  <button className={schemaView === "visual" ? "active" : ""} onClick={handleSwitchToVisual}>
                    Visual
                  </button>
                </div>
                <OverflowMenu
                  actions={[
                    { label: "Infer from data", onClick: handleInferSchema },
                    { label: "Export field docs (Markdown)", onClick: handleExportDocs },
                    { label: "Export field docs (PDF)", onClick: handleExportDocsPdf },
                    { label: "Export as TypeScript interface", onClick: handleExportTypeScript },
                    { label: "Insert: Email field", onClick: () => handleInsertPreset({ type: "string", format: "email" }) },
                    { label: "Insert: UUID field", onClick: () => handleInsertPreset({ type: "string", format: "uuid" }) },
                    { label: "Insert: Date field", onClick: () => handleInsertPreset({ type: "string", format: "date" }) },
                    ...customPresets.map((p) => ({
                      label: `Insert: ${p.label}`,
                      onClick: () => handleInsertCustomPreset(p.snippetJson),
                    })),
                    { label: `Manage custom presets (${customPresets.length})`, onClick: () => setCustomPresetsOpen(true) },
                    { label: `Manage references (${refSchemas.length})`, onClick: () => setRefsOpen(true) },
                    { label: "Import from OpenAPI…", onClick: () => setOpenApiOpen(true) },
                    { label: "Copy as Node.js snippet", onClick: () => handleCopySnippet("node") },
                    { label: "Copy as Python snippet", onClick: () => handleCopySnippet("python") },
                    { label: "Export session file", onClick: handleExportSessionFile },
                  ]}
                  extra={
                    <>
                      <label className="overflow-menu-file-label">
                        Import session file…
                        <input
                          type="file"
                          accept="application/json"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleImportSessionFile(file);
                            e.target.value = "";
                          }}
                        />
                      </label>
                      {workspaces.length > 0 && (
                        <label className="overflow-select-row">
                          Compare with
                          <select
                            value={schemaDiffTarget}
                            onChange={(e) => setSchemaDiffTarget(e.target.value)}
                          >
                            <option value="">Choose saved schema…</option>
                            {workspaces.map((w) => (
                              <option key={w.id} value={w.id}>
                                {w.name}
                              </option>
                            ))}
                          </select>
                        </label>
                      )}
                    </>
                  }
                />
              </>
            }
          />
        }
        right={
          <div className="data-pane-wrap">
            <FormatTabs value={format} onChange={setFormat} onConvertTo={handleConvertTo} />
            <EditorPane
              label="Data"
              language={format}
              value={dataText}
              onChange={setDataText}
              jumpToLine={jumpLine}
              markers={dataMarkers}
              theme={theme}
              fontSize={editorFontSize}
              wordWrap={wordWrap}
              minimap={minimapEnabled}
              path="data.json"
              onDropFile={setDataText}
              onDropError={(message) => toast(message, "error")}
              liveSchema={liveSchema}
              actions={
                <OverflowMenu
                  actions={[
                    { label: "Generate sample from schema", onClick: handleGenerateSample },
                    ...(batchMode ? [{ label: "Generate N samples…", onClick: handleGenerateBatchSamples }] : []),
                  ]}
                />
              }
            />
          </div>
        }
      />
      </Suspense>

      {schemaDiffTarget && (() => {
        const target = workspaces.find((w) => w.id === schemaDiffTarget);
        if (!target) return null;
        return (
          <div className="schema-diff-wrap">
            <div className="schema-diff-header">
              <span>Comparing current schema with "{target.name}"</span>
              <button className="export-btn" onClick={() => setSchemaDiffTarget("")}>
                Close
              </button>
            </div>
            <Suspense fallback={<div className="editor-loading">Loading…</div>}>
              <DiffView before={target.schema} after={schemaText} />
            </Suspense>
          </div>
        );
      })()}

      {schemaView === "visual" && schemaParseResult.error && (
        <p className="builder-empty">Schema has a JSON error — fix it in Code mode to keep editing it visually.</p>
      )}
      {schemaView === "visual" && !schemaParseResult.error && (
        <Suspense fallback={<div className="editor-loading">Loading…</div>}>
          <SchemaBuilder fields={schemaFields} onChange={handleSchemaFieldsChange} />
        </Suspense>
      )}

      <div className="action-row">
        <button className="validate-btn" onClick={() => handleValidate(true)}>
          Validate <kbd>⌘⏎</kbd>
        </button>
        {!success && lastValidData !== null && lastValidData !== dataText && (
          <button className="diff-toggle" onClick={() => setShowDiff((v) => !v)}>
            {showDiff ? "Hide" : "Show"} diff from last valid
          </button>
        )}
      </div>

      {showDiff && lastValidData !== null && (
        <Suspense fallback={<div className="editor-loading">Loading…</div>}>
          <DiffView before={lastValidData} after={dataText} />
        </Suspense>
      )}

      {batchMode ? (
        batchRows && (
          <BatchTable
            rows={batchRows}
            onExportJson={handleExportBatchJson}
            onExportPdf={handleExportBatchPdf}
            onExportFailingJson={handleExportFailingBatchJson}
          />
        )
      ) : (
        <ErrorList
          errors={errors}
          success={success}
          onJump={setJumpLine}
          onExportJson={handleExportReportJson}
          onExportPdf={handleExportReportPdf}
          onAutoFix={canAutoFix ? handleAutoFix : undefined}
          onCopyIssue={handleCopyIssueMarkdown}
          onAddRequired={handleMakeFieldOptional}
          onCoerceType={handleCoerceType}
        />
      )}

      <AdSlot id="footer" />
    </div>
  );
}

export default App;
