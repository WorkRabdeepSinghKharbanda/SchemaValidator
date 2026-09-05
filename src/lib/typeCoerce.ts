import { unescapeJsonPointerSegment } from "./validate.ts";

// One-click fix for a "type" ajv error: converts the offending value in-place to the schema's
// expected type, when the conversion is unambiguous (a numeric-looking string -> number, etc.).
// Works for any data format, not just JSON — it operates on the already-parsed in-memory value
// tree (which every format produces the same shape of), and the caller re-serializes back to
// whatever format was active via serialize().
function coercePrimitive(value: unknown, expectedType: string): { ok: true; value: unknown } | { ok: false } {
  switch (expectedType) {
    case "number":
    case "integer": {
      if (typeof value === "boolean") return { ok: true, value: value ? 1 : 0 };
      if (typeof value !== "string" || value.trim() === "") return { ok: false };
      const n = Number(value);
      if (Number.isNaN(n)) return { ok: false };
      return { ok: true, value: expectedType === "integer" ? Math.trunc(n) : n };
    }
    case "string": {
      if (typeof value === "number" || typeof value === "boolean") return { ok: true, value: String(value) };
      return { ok: false };
    }
    case "boolean": {
      if (value === "true" || value === 1) return { ok: true, value: true };
      if (value === "false" || value === 0) return { ok: true, value: false };
      return { ok: false };
    }
    default:
      return { ok: false };
  }
}

export function coerceValueAtPath(data: unknown, instancePath: string, expectedType: string): { ok: true; data: unknown } | { ok: false } {
  const segments = instancePath.split("/").filter(Boolean).map(unescapeJsonPointerSegment);

  if (segments.length === 0) {
    const result = coercePrimitive(data, expectedType);
    return result.ok ? { ok: true, data: result.value } : { ok: false };
  }

  const cloned = structuredClone(data) as Record<string, unknown> | unknown[];
  let parent: unknown = cloned;
  for (const segment of segments.slice(0, -1)) {
    if (parent === null || typeof parent !== "object") return { ok: false };
    parent = (parent as Record<string, unknown>)[segment];
  }
  if (parent === null || typeof parent !== "object") return { ok: false };

  const lastKey = segments[segments.length - 1];
  const container = parent as Record<string, unknown>;
  const result = coercePrimitive(container[lastKey], expectedType);
  if (!result.ok) return { ok: false };
  container[lastKey] = result.value;
  return { ok: true, data: cloned };
}
