// json-schema-faker is only needed for the "generate sample" action — dynamic import keeps
// it out of the main bundle for everyone who never clicks that button.
export async function generateSample(schema: unknown): Promise<unknown> {
  const { generateSync } = await import("json-schema-faker");
  return generateSync(schema as never);
}
