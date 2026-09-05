// Generates a best-effort TypeScript interface from a JSON Schema — a common enough "I just
// want the shape in my editor" ask that it's worth a quick client-side generator rather than
// sending anyone to a separate tool. Deliberately not exhaustive: handles the common keywords
// (type, properties, required, items, enum, $ref by name, oneOf/anyOf as unions) and falls back
// to `unknown` for anything fancier (allOf, conditionals, tuple-style items, etc.).
interface SchemaLike {
  type?: string | string[];
  properties?: Record<string, SchemaLike>;
  required?: string[];
  items?: SchemaLike;
  enum?: unknown[];
  oneOf?: SchemaLike[];
  anyOf?: SchemaLike[];
  $ref?: string;
  [key: string]: unknown;
}

function refName(ref: string): string {
  const segments = ref.split("/");
  return segments[segments.length - 1] || "Unknown";
}

function toEnumLiteral(value: unknown): string {
  return typeof value === "string" ? JSON.stringify(value) : String(value);
}

function scalarType(type: string): string {
  switch (type) {
    case "integer":
    case "number":
      return "number";
    case "string":
      return "string";
    case "boolean":
      return "boolean";
    case "null":
      return "null";
    default:
      return "unknown";
  }
}

function typeOf(schema: SchemaLike | undefined, interfaceName: string, extraInterfaces: string[]): string {
  if (!schema) return "unknown";
  if (schema.$ref) return refName(schema.$ref);
  if (schema.enum) return schema.enum.map(toEnumLiteral).join(" | ") || "unknown";
  if (schema.oneOf || schema.anyOf) {
    return (schema.oneOf ?? schema.anyOf ?? []).map((s) => typeOf(s, interfaceName, extraInterfaces)).join(" | ") || "unknown";
  }
  const type = Array.isArray(schema.type) ? schema.type[0] : schema.type;
  if (type === "array") return `${typeOf(schema.items, interfaceName, extraInterfaces)}[]`;
  if (type === "object" && schema.properties) {
    const nestedName = `${interfaceName}Nested${extraInterfaces.length}`;
    extraInterfaces.push(generateInterfaceBody(nestedName, schema));
    return nestedName;
  }
  if (!type) return "unknown";
  return scalarType(type);
}

function generateInterfaceBody(name: string, schema: SchemaLike): string {
  const properties = schema.properties ?? {};
  const required = new Set(schema.required ?? []);
  const extraInterfaces: string[] = [];
  const fields = Object.entries(properties).map(([key, value]) => {
    const optional = required.has(key) ? "" : "?";
    return `  ${JSON.stringify(key)}${optional}: ${typeOf(value, `${name}_${key}`, extraInterfaces)};`;
  });
  const body = [`export interface ${name} {`, ...fields, "}"].join("\n");
  return [...extraInterfaces, body].join("\n\n");
}

export function generateTypeScriptInterface(schema: unknown, interfaceName = "Schema"): string {
  const root = schema as SchemaLike;
  if (typeof root !== "object" || root === null) return `export type ${interfaceName} = unknown;\n`;
  if (root.properties) return `${generateInterfaceBody(interfaceName, root)}\n`;
  return `export type ${interfaceName} = ${typeOf(root, interfaceName, [])};\n`;
}
