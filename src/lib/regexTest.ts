// Powers the inline regex tester on a "pattern" ajv error — schemas are user/third-party-authored
// text, so the pattern string could in principle be malformed even though ajv already compiled it
// successfully once (a fresh `new RegExp` here is a second, independent parse). Returns null
// instead of throwing so the UI can show "invalid pattern" rather than crash.
export function testPattern(pattern: string, value: string): boolean | null {
  try {
    return new RegExp(pattern).test(value);
  } catch {
    return null;
  }
}
