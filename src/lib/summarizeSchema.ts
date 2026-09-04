// One-paragraph plain-English summary shown above the schema pane, for people who don't read
// JSON Schema fluently. Heuristic, top-level only (matches schemaFields.ts's "flat shape" scope).
interface SchemaLike {
  type?: string;
  properties?: Record<string, { type?: string }>;
  required?: string[];
}

export function summarizeSchema(schema: unknown): string | undefined {
  const root = schema as SchemaLike;
  if (!root || typeof root !== "object") return undefined;
  const properties = root.properties;
  if (!properties || Object.keys(properties).length === 0) return undefined;

  const keys = Object.keys(properties);
  const required = root.required ?? [];
  const requiredCount = keys.filter((k) => required.includes(k)).length;

  const fieldWord = keys.length === 1 ? "field" : "fields";
  let summary = `Expects an object with ${keys.length} ${fieldWord} (${keys.join(", ")}).`;
  if (requiredCount > 0) {
    summary += ` ${requiredCount} required: ${required.filter((k) => keys.includes(k)).join(", ")}.`;
  } else {
    summary += " None are required.";
  }
  return summary;
}
