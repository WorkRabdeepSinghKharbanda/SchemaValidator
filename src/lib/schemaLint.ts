// Best-practice hints, not validation errors — these never block anything, just surface common
// schema-authoring mistakes ajv itself won't complain about (a schema with these issues is still
// perfectly valid JSON Schema, just probably not what the author meant).
export interface LintHint {
  path: string;
  severity: "warn" | "info";
  message: string;
}

interface SchemaLike {
  type?: string | string[];
  properties?: Record<string, SchemaLike>;
  required?: string[];
  additionalProperties?: unknown;
  enum?: unknown[];
  items?: SchemaLike;
  $ref?: string;
  [key: string]: unknown;
}

const MAX_DEPTH = 6;

function lintNode(schema: SchemaLike, path: string, depth: number, hints: LintHint[]): void {
  if (depth > MAX_DEPTH || schema.$ref) return;

  const type = Array.isArray(schema.type) ? schema.type[0] : schema.type;
  const isObjectish = type === "object" || (!type && schema.properties);

  if (isObjectish && schema.properties) {
    if (!("additionalProperties" in schema)) {
      hints.push({
        path,
        severity: "info",
        message: `"additionalProperties" isn't set${path ? ` on ${path}` : ""} — any extra field will silently pass validation.`,
      });
    }
    const propertyNames = new Set(Object.keys(schema.properties));
    for (const name of schema.required ?? []) {
      if (!propertyNames.has(name)) {
        hints.push({
          path,
          severity: "warn",
          message: `"required" lists "${name}"${path ? ` on ${path}` : ""}, but it isn't declared in "properties" — this can never pass.`,
        });
      }
    }
    for (const [key, value] of Object.entries(schema.properties)) {
      lintNode(value, path ? `${path}.${key}` : key, depth + 1, hints);
    }
  }

  if (type === "array" && schema.items) {
    lintNode(schema.items, path ? `${path}[]` : "[]", depth + 1, hints);
  }

  if (schema.enum && schema.enum.length === 1) {
    hints.push({
      path,
      severity: "info",
      message: `"enum"${path ? ` on ${path}` : ""} has only one option — "const" says the same thing more clearly.`,
    });
  }
}

export function lintSchema(schema: unknown): LintHint[] {
  if (typeof schema !== "object" || schema === null) return [];
  const hints: LintHint[] = [];
  lintNode(schema as SchemaLike, "", 0, hints);
  return hints;
}
