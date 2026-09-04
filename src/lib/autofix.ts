// jsonrepair is only needed for the "Try auto-fix" action — dynamic import keeps it out of
// the main bundle for everyone who never hits a JSON parse error.
export async function tryAutoFix(text: string): Promise<string | null> {
  try {
    const { jsonrepair } = await import("jsonrepair");
    return jsonrepair(text);
  } catch {
    return null;
  }
}
