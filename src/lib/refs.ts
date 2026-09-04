export interface ReferenceSchema {
  id: string;
  schema: unknown;
}

// Session-only (not persisted) — reference schemas are usually large and re-uploading them
// each session is cheap; skip localStorage to avoid silently growing storage with big blobs.
export function refsCacheKey(refs: ReferenceSchema[]): string {
  return refs.map((r) => `${r.id}:${JSON.stringify(r.schema)}`).join("|");
}
