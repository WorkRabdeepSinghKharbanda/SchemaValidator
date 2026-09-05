export interface ReferenceSchema {
  id: string;
  schema: unknown;
}

// refSchemas *is* persisted (history, workspaces, share links all round-trip it — see CLAUDE.md's
// "Reference schemas / $ref" note), so this key must fold in the actual ref contents, not just
// count/ids: two saved entries with the same ref ids but different schema bodies must compile
// separately, or a restore could silently validate against stale/wrong $ref targets.
export function refsCacheKey(refs: ReferenceSchema[]): string {
  return refs.map((r) => `${r.id}:${JSON.stringify(r.schema)}`).join("|");
}
