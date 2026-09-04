interface SchemaLike {
  type?: string;
  properties?: Record<string, SchemaLike>;
  required?: string[];
  description?: string;
  format?: string;
  enum?: unknown[];
}

// Renders a JSON Schema's top-level (and one level of nested object) properties as a
// human-readable Markdown table — for sharing the shape of a schema with non-engineers.
export function generateSchemaDocs(schema: unknown, title = "Schema"): string {
  const root = schema as SchemaLike;
  const lines = [`# ${title}`, "", "| Field | Type | Required | Details |", "|---|---|---|---|"];

  function describe(s: SchemaLike): string {
    const parts: string[] = [];
    if (s.format) parts.push(`format: ${s.format}`);
    if (s.enum) parts.push(`enum: ${s.enum.join(", ")}`);
    if (s.description) parts.push(s.description);
    return parts.join(" — ") || "—";
  }

  function walk(properties: Record<string, SchemaLike> | undefined, required: string[] | undefined, prefix: string) {
    if (!properties) return;
    for (const [key, value] of Object.entries(properties)) {
      const isRequired = required?.includes(key) ? "yes" : "no";
      lines.push(`| ${prefix}${key} | ${value.type ?? "any"} | ${isRequired} | ${describe(value)} |`);
      if (value.type === "object" && value.properties) {
        walk(value.properties, value.required, `${prefix}${key}.`);
      }
    }
  }

  walk(root.properties, root.required, "");
  return lines.join("\n");
}
