import type { ErrorItem } from "../components/ErrorList";
import type { Format } from "./parse";
import type { Draft } from "./validate";

export function generateIssueMarkdown(errors: ErrorItem[], format: Format, draft: Draft): string {
  const lines = [
    `## Validation failed (${format.toUpperCase()} data, JSON Schema ${draft})`,
    "",
    ...errors.map((e) => `- [ ] ${e.path ? `\`${e.path}\`: ` : ""}${e.message}${e.line ? ` (line ${e.line})` : ""}`),
  ];
  return lines.join("\n");
}
