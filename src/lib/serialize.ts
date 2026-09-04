import * as yaml from "js-yaml";
import * as toml from "smol-toml";
import { XMLBuilder } from "fast-xml-parser";
import Papa from "papaparse";
import type { Format } from "./parse";

export function serialize(data: unknown, format: Format): string {
  switch (format) {
    case "json":
      return JSON.stringify(data, null, 2);
    case "yaml":
      return yaml.dump(data);
    case "toml":
      return toml.stringify(data as Record<string, unknown>);
    case "xml":
      return new XMLBuilder({ ignoreAttributes: false, attributeNamePrefix: "@_", format: true }).build(data);
    case "csv":
      return Papa.unparse(Array.isArray(data) ? data : [data]);
    default:
      throw new Error(`Unsupported format: ${format}`);
  }
}
