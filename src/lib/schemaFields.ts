export interface SchemaField {
  key: string;
  type: "string" | "integer" | "number" | "boolean" | "array" | "object";
  required: boolean;
  format?: string;
}

export const FIELD_TYPES: SchemaField["type"][] = ["string", "integer", "number", "boolean", "array", "object"];
export const STRING_FORMATS = ["", "email", "uuid", "date", "date-time", "uri", "ipv4"];

interface RawSchema {
  type?: string;
  properties?: Record<string, { type?: string; format?: string }>;
  required?: string[];
  [key: string]: unknown;
}

// Reads only top-level object properties — the visual builder is a quick-start tool for flat
// shapes, not a full schema editor. Nested/complex schemas still edit fine in Code mode.
export function schemaToFields(schema: unknown): SchemaField[] {
  const root = schema as RawSchema;
  if (!root || typeof root !== "object" || !root.properties) return [];
  return Object.entries(root.properties).map(([key, value]) => ({
    key,
    type: (FIELD_TYPES as string[]).includes(value.type ?? "") ? (value.type as SchemaField["type"]) : "string",
    required: root.required?.includes(key) ?? false,
    format: value.format,
  }));
}

// Preserves each field's original schema fragment (nested `properties`, `items`, etc.) when
// only its name/required/format changed — a bare `{type, format}` rebuild would silently drop
// any nested object/array shape the moment the user touches an unrelated field in Visual mode.
export function fieldsToSchema(fields: SchemaField[], baseSchema: unknown): Record<string, unknown> {
  const base = (typeof baseSchema === "object" && baseSchema !== null ? { ...(baseSchema as RawSchema) } : {}) as RawSchema;
  const originalProperties = base.properties ?? {};
  const properties: Record<string, unknown> = {};
  const required: string[] = [];

  for (const field of fields) {
    if (!field.key) continue;
    const original = originalProperties[field.key];
    const keepOriginalShape = original && original.type === field.type;
    const merged: Record<string, unknown> = keepOriginalShape ? { ...original } : { type: field.type };
    if (field.format) merged.format = field.format;
    else delete merged.format;
    properties[field.key] = merged;
    if (field.required) required.push(field.key);
  }

  return { ...base, type: "object", properties, required };
}
