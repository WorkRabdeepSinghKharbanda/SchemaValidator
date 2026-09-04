export interface Preset {
  label: string;
  snippet: Record<string, unknown>;
}

// Insertable JSON Schema fragments for common field types.
export const PRESETS: Preset[] = [
  { label: "Email", snippet: { type: "string", format: "email" } },
  { label: "UUID", snippet: { type: "string", format: "uuid" } },
  { label: "ISO Date", snippet: { type: "string", format: "date" } },
  { label: "ISO Date-Time", snippet: { type: "string", format: "date-time" } },
  { label: "URL", snippet: { type: "string", format: "uri" } },
  { label: "IPv4", snippet: { type: "string", format: "ipv4" } },
  { label: "Positive integer", snippet: { type: "integer", minimum: 1 } },
  { label: "Non-empty string", snippet: { type: "string", minLength: 1 } },
  { label: "Enum", snippet: { type: "string", enum: ["option_a", "option_b"] } },
  { label: "Address object", snippet: {
    type: "object",
    properties: {
      street: { type: "string" },
      city: { type: "string" },
      zip: { type: "string" },
      country: { type: "string" },
    },
    required: ["street", "city", "country"],
  } },
];
