import * as yaml from "js-yaml";
import * as toml from "smol-toml";
import { XMLParser, XMLValidator } from "fast-xml-parser";
import Papa from "papaparse";
import { parse as parseJsonc, printParseErrorCode, type ParseError as JsoncParseError } from "jsonc-parser";

export type Format = "json" | "yaml" | "toml" | "xml" | "csv";

export const FORMATS: readonly Format[] = ["json", "yaml", "toml", "xml", "csv"];

export function isFormat(value: unknown): value is Format {
  return typeof value === "string" && (FORMATS as readonly string[]).includes(value);
}

export interface ParseError {
  message: string;
  line?: number;
  column?: number;
}

export interface ParseResult {
  data: unknown;
  error: null;
}

export interface ParseFailure {
  data: null;
  error: ParseError;
}

export function parse(text: string, format: Format): ParseResult | ParseFailure {
  if (text.trim() === "") {
    return { data: null, error: { message: "Input is empty" } };
  }
  try {
    switch (format) {
      case "json":
        return parseJson(text);
      case "yaml":
        return { data: yaml.load(text), error: null };
      case "toml":
        return { data: toml.parse(text), error: null };
      case "xml":
        return parseXml(text);
      case "csv":
        return parseCsv(text);
      default:
        return { data: null, error: { message: `Unsupported format: ${format}` } };
    }
  } catch (e) {
    return { data: null, error: toParseError(e) };
  }
}

// Uses jsonc-parser instead of JSON.parse so the data pane tolerates // comments and
// trailing commas (JSON5/JSONC-style) — a quality-of-life upgrade with no UI, since anything
// that was already strict JSON parses identically either way. validate.ts's line-mapping
// already depends on jsonc-parser's parse tree, so this keeps one JSON parser as the source
// of truth instead of two that could disagree on what's valid.
function parseJson(text: string): ParseResult | ParseFailure {
  const errors: JsoncParseError[] = [];
  const data = parseJsonc(text, errors, { allowTrailingComma: true });
  if (errors.length > 0) {
    const first = errors[0];
    const before = text.slice(0, first.offset);
    const line = before.split("\n").length;
    const column = first.offset - before.lastIndexOf("\n");
    return { data: null, error: { message: printParseErrorCode(first.error), line, column } };
  }
  return { data, error: null };
}

function parseXml(text: string): ParseResult | ParseFailure {
  const validation = XMLValidator.validate(text);
  if (validation !== true) {
    return { data: null, error: { message: validation.err.msg, line: validation.err.line, column: validation.err.col } };
  }
  const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "@_" });
  return { data: parser.parse(text), error: null };
}

function parseCsv(text: string): ParseResult | ParseFailure {
  const result = Papa.parse<Record<string, unknown>>(text, { header: true, skipEmptyLines: true, dynamicTyping: true });
  if (result.errors.length > 0) {
    // Papa's error.row indexes the post-skipEmptyLines row array, not raw file lines, so it
    // can't be turned into an accurate line number here — message-only rather than a wrong jump.
    return { data: null, error: { message: result.errors[0].message } };
  }
  return { data: result.data, error: null };
}

function toParseError(e: unknown): ParseError {
  // json's own parser (parseJson, above) never throws — it reports errors via jsonc-parser's
  // error array instead — so this function only ever handles yaml/toml exceptions.
  // js-yaml and smol-toml errors carry a `mark`/`line` with 0-indexed line numbers
  const err = e as { message?: string; mark?: { line?: number; column?: number }; line?: number; column?: number };
  const line = err.mark?.line ?? err.line;
  const column = err.mark?.column ?? err.column;
  return {
    message: err.message ?? String(e),
    ...(line !== undefined ? { line: line + 1 } : {}),
    ...(column !== undefined ? { column: column + 1 } : {}),
  };
}
