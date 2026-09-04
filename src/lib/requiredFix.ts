// One-click "add to required" for an ajv `required` error. `instancePath` is the JSON pointer
// of the *object* missing the property (e.g. "/address" for a top-level "address" object), so
// the schema node to patch is found by walking `properties`/`items` the same number of segments
// deep — mirroring how validate.ts's locateNode walks the *data* tree for the same instancePath.
interface SchemaNode {
  properties?: Record<string, SchemaNode>;
  items?: SchemaNode;
  required?: string[];
  [key: string]: unknown;
}

function walk(node: SchemaNode | undefined, segments: string[]): SchemaNode | undefined {
  if (!node) return undefined;
  if (segments.length === 0) return node;
  const [head, ...rest] = segments;
  if (node.properties?.[head]) return walk(node.properties[head], rest);
  if (node.items && !Number.isNaN(Number(head))) return walk(node.items, rest);
  return undefined;
}

// A "required" ajv error means the schema demands `propName` but the data doesn't have it — the
// quick fix that's always safe to offer from the schema side (data can be any of 5 formats, but
// the schema is always JSON) is to loosen the schema: drop `propName` from that node's `required`.
export function makeFieldOptional(schema: unknown, instancePath: string, propName: string): unknown {
  const cloned = structuredClone(schema) as SchemaNode;
  const segments = instancePath.split("/").filter(Boolean);
  const target = walk(cloned, segments);
  if (!target?.required) return schema;
  target.required = target.required.filter((name) => name !== propName);
  return cloned;
}
