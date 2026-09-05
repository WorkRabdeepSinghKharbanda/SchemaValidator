import type { Draft } from "./validate.ts";

// Maps a schema's own "$schema" meta-schema URI to the Draft this app understands, so pasting/
// loading a schema authored for a specific draft can auto-switch the draft dropdown instead of
// silently validating it under whatever draft happened to be selected before. Both http/https
// and with/without a trailing "#" are accepted since real-world schemas use either.
const URI_TO_DRAFT: Record<string, Draft> = {
  "http://json-schema.org/draft-07/schema": "draft-07",
  "https://json-schema.org/draft-07/schema": "draft-07",
  "http://json-schema.org/draft/2019-09/schema": "2019-09",
  "https://json-schema.org/draft/2019-09/schema": "2019-09",
  "http://json-schema.org/draft/2020-12/schema": "2020-12",
  "https://json-schema.org/draft/2020-12/schema": "2020-12",
};

export function detectDraftFromSchema(schema: unknown): Draft | undefined {
  if (typeof schema !== "object" || schema === null) return undefined;
  const uri = (schema as { $schema?: unknown }).$schema;
  if (typeof uri !== "string") return undefined;
  return URI_TO_DRAFT[uri.replace(/#$/, "")];
}
