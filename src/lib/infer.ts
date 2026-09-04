// Infers a draft JSON Schema (2020-12) from a sample data value.
// ponytail: heuristic inference — union types collapse to the first-seen shape for objects
// in arrays; good enough for scaffolding a schema, not a full structural merge. Upgrade to
// per-item merge if arrays of heterogeneous objects become common.
export function inferSchema(value: unknown): Record<string, unknown> {
  return infer(value);
}

function infer(value: unknown): Record<string, unknown> {
  if (value === null) return { type: "null" };
  if (Array.isArray(value)) {
    return {
      type: "array",
      items: value.length > 0 ? infer(value[0]) : {},
    };
  }
  switch (typeof value) {
    case "string":
      return { type: "string" };
    case "number":
      return { type: Number.isInteger(value) ? "integer" : "number" };
    case "boolean":
      return { type: "boolean" };
    case "object": {
      const properties: Record<string, unknown> = {};
      const required: string[] = [];
      for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
        properties[key] = infer(val);
        if (val !== undefined) required.push(key);
      }
      return { type: "object", properties, required };
    }
    default:
      return {};
  }
}
