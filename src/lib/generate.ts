// json-schema-faker is only needed for the "generate sample" action — dynamic import keeps
// it out of the main bundle for everyone who never clicks that button.
export async function generateSample(schema: unknown): Promise<unknown> {
  const { generateSync } = await import("json-schema-faker");
  return generateSync(schema as never);
}

// Batch mode's "generate N samples" — one import, N calls, rather than N separate dynamic
// imports (generateSample does its own import each time, which is fine for a single click but
// wasteful in a loop).
export async function generateSampleArray(schema: unknown, count: number): Promise<unknown[]> {
  const { generateSync } = await import("json-schema-faker");
  return Array.from({ length: count }, () => generateSync(schema as never));
}
