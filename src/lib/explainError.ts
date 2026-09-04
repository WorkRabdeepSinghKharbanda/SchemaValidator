// Static keyword → plain-English lookup, no LLM call (keeps the client-only/no-network
// constraint) — covers the ajv keywords that show up most often for people unfamiliar with
// JSON Schema terminology. Falls back to null (ErrorList just shows ajv's own message).
const EXPLANATIONS: Record<string, string> = {
  additionalProperties: "This object has a field the schema doesn't allow. Either remove the field or add it to the schema's properties.",
  required: "The schema requires this field, but it's missing from the data.",
  type: "The value is the wrong data type for this field.",
  enum: "The value isn't one of the fixed set of options the schema allows.",
  pattern: "The value doesn't match the required text pattern (regex).",
  format: "The value doesn't look like the expected format (e.g. email, date, UUID).",
  minimum: "The number is smaller than the schema's allowed minimum.",
  maximum: "The number is larger than the schema's allowed maximum.",
  minLength: "The text is shorter than the schema's minimum length.",
  maxLength: "The text is longer than the schema's maximum length.",
  minItems: "The array has fewer items than the schema requires.",
  maxItems: "The array has more items than the schema allows.",
  uniqueItems: "The array has duplicate items, but the schema requires them to be unique.",
  oneOf: "The value must match exactly one of several schema options, but it matched none (or more than one).",
  anyOf: "The value must match at least one of several schema options, but it matched none.",
  allOf: "The value must satisfy every one of several combined schemas, but it failed at least one.",
  not: "The value matches a schema it's specifically not allowed to match.",
  const: "The value must be an exact fixed value, and this doesn't match it.",
  multipleOf: "The number isn't a multiple of the schema's required step value.",
  dependentRequired: "Because another field is present, this field is also required.",
  propertyNames: "One of this object's keys doesn't match the schema's naming rule.",
};

export function explainError(keyword?: string): string | undefined {
  return keyword ? EXPLANATIONS[keyword] : undefined;
}
