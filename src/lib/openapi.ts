interface OpenApiDoc {
  components?: { schemas?: Record<string, unknown> };
  definitions?: Record<string, unknown>; // Swagger 2.0
}

// JSON Pointer escaping (RFC 6901): ~1 -> /, ~0 -> ~, applied in that order. Names must also be
// percent-decoded since OpenAPI $refs are URI fragments.
function decodePointerSegment(segment: string): string {
  return decodeURIComponent(segment.replace(/~1/g, "/").replace(/~0/g, "~"));
}

// Rewrites "#/components/schemas/Foo" (OpenAPI 3) / "#/definitions/Foo" (Swagger 2) $refs to
// plain "Foo" — matching the $id each sibling schema gets registered under via ajv.addSchema
// in App.tsx's handleImportOpenApi. ajv resolves a non-URI $ref like "Foo" directly against a
// schema added under that exact key, so this is enough to make cross-schema $refs work without
// needing to preserve the full OpenAPI document structure. Refs outside components/schemas or
// definitions (e.g. #/components/parameters/X, or external file refs) are left untouched —
// they can't be resolved this way — and collected into `unresolved` so the caller can warn
// rather than let them fail silently at ajv-compile time.
function rewriteRefs(node: unknown, unresolved: Set<string>): unknown {
  if (Array.isArray(node)) return node.map((item) => rewriteRefs(item, unresolved));
  if (node && typeof node === "object") {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(node as Record<string, unknown>)) {
      if (key === "$ref" && typeof value === "string") {
        const match = /^#\/(?:components\/schemas|definitions)\/([^/]+)$/.exec(value);
        if (match) {
          result[key] = decodePointerSegment(match[1]);
        } else {
          result[key] = value;
          unresolved.add(value);
        }
      } else {
        result[key] = rewriteRefs(value, unresolved);
      }
    }
    return result;
  }
  return node;
}

export interface ExtractedOpenApiSchemas {
  schemas: Record<string, unknown>;
  /** $ref values that couldn't be rewritten (point outside components/schemas, or external files). */
  unresolvedRefs: string[];
}

export function extractOpenApiSchemas(spec: unknown): ExtractedOpenApiSchemas {
  const doc = spec as OpenApiDoc;
  const raw = doc.components?.schemas ?? doc.definitions ?? {};
  const unresolved = new Set<string>();
  const schemas: Record<string, unknown> = {};
  for (const [name, schema] of Object.entries(raw)) {
    schemas[name] = rewriteRefs(schema, unresolved);
  }
  return { schemas, unresolvedRefs: Array.from(unresolved) };
}
