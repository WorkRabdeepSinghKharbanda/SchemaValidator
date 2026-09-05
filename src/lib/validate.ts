import Ajv, { type ValidateFunction } from "ajv";
import Ajv2019 from "ajv/dist/2019.js";
import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import { parseTree, type Node } from "jsonc-parser";
import type { Format } from "./parse.ts";
import type { ReferenceSchema } from "./refs.ts";

export type Draft = "draft-07" | "2019-09" | "2020-12";

const AJV_CLASS: Record<Draft, typeof Ajv> = {
  "draft-07": Ajv,
  "2019-09": Ajv2019 as unknown as typeof Ajv,
  "2020-12": Ajv2020 as unknown as typeof Ajv,
};

export const DRAFTS = Object.keys(AJV_CLASS) as Draft[];

export function isDraft(value: unknown): value is Draft {
  return typeof value === "string" && (DRAFTS as string[]).includes(value);
}

// Caches the compiled ajv validator per (draft, schema text) so realtime/debounced
// re-validation doesn't recompile an unchanged schema on every keystroke of the data pane.
// Capped and evicted oldest-first so a long editing session can't grow this unbounded.
const COMPILE_CACHE_LIMIT = 20;
const compileCache = new Map<string, ValidateFunction>();

function compile(schema: unknown, draft: Draft, schemaCacheKey?: string, refSchemas: ReferenceSchema[] = []): ValidateFunction {
  const cacheKey = schemaCacheKey && `${draft}::${schemaCacheKey}`;
  const cached = cacheKey && compileCache.get(cacheKey);
  if (cached) return cached;

  const AjvClass = AJV_CLASS[draft];
  const ajv = new AjvClass({ allErrors: true, strict: false });
  addFormats(ajv);
  for (const ref of refSchemas) {
    ajv.addSchema(ref.schema as object, ref.id);
  }
  const validateFn = ajv.compile(schema as object);

  if (cacheKey) {
    if (compileCache.size >= COMPILE_CACHE_LIMIT) {
      const oldestKey = compileCache.keys().next().value;
      if (oldestKey !== undefined) compileCache.delete(oldestKey);
    }
    compileCache.set(cacheKey, validateFn);
  }
  return validateFn;
}

// ajv instancePath segments are JSON-Pointer-escaped (RFC 6901: "~" -> "~0", "/" -> "~1") — a
// property literally named e.g. "a/b" appears in the path as "a~1b". Unescape before comparing
// against the parse tree's real (unescaped) property names, or such a property's error would
// never resolve to a line number. Order matters: undo "~1" before "~0" (the reverse of how they
// were escaped), so "~01" (an escaped "~" followed by a literal "1") doesn't get double-unescaped.
export function unescapeJsonPointerSegment(segment: string): string {
  return segment.replace(/~1/g, "/").replace(/~0/g, "~");
}

// Walks the JSON parse tree by hand instead of jsonc-parser's findNodeAtLocation: that helper
// requires every numeric-looking path segment to index an array, but ajv instancePaths can
// contain numeric-looking OBJECT keys too (e.g. "/123/name"), which it then fails to resolve.
function locateNode(node: Node | undefined, segments: string[]): Node | undefined {
  if (!node) return undefined;
  if (segments.length === 0) return node;
  const [head, ...rest] = segments;
  if (node.type === "array") {
    const index = Number(head);
    if (Number.isNaN(index)) return undefined;
    return locateNode(node.children?.[index], rest);
  }
  if (node.type === "object") {
    const property = node.children?.find((child) => child.children?.[0]?.value === head);
    return locateNode(property?.children?.[1], rest);
  }
  return undefined;
}

export interface ValidationError {
  path: string;
  message: string;
  keyword: string;
  line?: number;
  missingProperty?: string;
  expectedType?: string;
  pattern?: string;
}

export interface ValidationOutcome {
  valid: boolean;
  errors: ValidationError[];
}

export interface ValidateOptions {
  sourceText?: string;
  sourceFormat?: Format;
  draft?: Draft;
  schemaCacheKey?: string;
  refSchemas?: ReferenceSchema[];
}

export function validate(data: unknown, schema: unknown, options: ValidateOptions = {}): ValidationOutcome {
  const { sourceText, sourceFormat, draft = "2020-12", schemaCacheKey, refSchemas } = options;
  let validateFn: ValidateFunction;
  try {
    validateFn = compile(schema, draft, schemaCacheKey, refSchemas);
  } catch (e) {
    return {
      valid: false,
      errors: [{ path: "", message: `Invalid schema: ${(e as Error).message}`, keyword: "schema" }],
    };
  }

  const valid = validateFn(data);
  if (valid) return { valid: true, errors: [] };

  const tree = sourceFormat === "json" && sourceText ? parseTree(sourceText) : undefined;

  const errors = (validateFn.errors ?? []).map((err) => {
    const path = err.instancePath || "/";
    let line: number | undefined;
    if (tree && sourceText) {
      const segments = path.split("/").filter(Boolean).map(unescapeJsonPointerSegment);
      const node = locateNode(tree, segments);
      if (node) {
        line = sourceText.slice(0, node.offset).split("\n").length;
      }
    }
    const missingProperty = err.keyword === "required" ? (err.params as { missingProperty?: string }).missingProperty : undefined;
    // ajv's "type" params.type can be an array (e.g. schema allows ["string", "null"]) when
    // multiple types are permitted — only offer a single unambiguous coercion target for a
    // single expected type, not a pick-one-of-several list.
    const rawExpectedType = err.keyword === "type" ? (err.params as { type?: string | string[] }).type : undefined;
    const expectedType = typeof rawExpectedType === "string" ? rawExpectedType : undefined;
    const pattern = err.keyword === "pattern" ? (err.params as { pattern?: string }).pattern : undefined;
    return {
      path,
      message: err.message ?? "invalid",
      keyword: err.keyword,
      ...(line ? { line } : {}),
      ...(missingProperty ? { missingProperty } : {}),
      ...(expectedType ? { expectedType } : {}),
      ...(pattern ? { pattern } : {}),
    };
  });
  return { valid: false, errors };
}
