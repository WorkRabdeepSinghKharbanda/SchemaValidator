import type { Draft } from "./validate";

// Lets someone take the exact schema+draft they just tested in the browser and re-run the
// same check outside it (CI, a script) — without us building a CLI or public API (both
// intentionally not built, see CLAUDE.md's "hard constraint" list).
const AJV_IMPORT: Record<Draft, string> = {
  "draft-07": "ajv",
  "2019-09": "ajv/dist/2019",
  "2020-12": "ajv/dist/2020",
};

export function generateNodeSnippet(schemaText: string, draft: Draft): string {
  return `const Ajv = require("${AJV_IMPORT[draft]}");
const addFormats = require("ajv-formats");

const schema = ${schemaText};
const data = /* your data here */ {};

const ajv = new Ajv({ allErrors: true, strict: false });
addFormats(ajv);
const validate = ajv.compile(schema);

if (validate(data)) {
  console.log("valid");
} else {
  console.error(validate.errors);
}
`;
}

const JSONSCHEMA_LIB: Record<Draft, string> = {
  "draft-07": "Draft7Validator",
  "2019-09": "Draft201909Validator",
  "2020-12": "Draft202012Validator",
};

export function generatePythonSnippet(schemaText: string, draft: Draft): string {
  const validatorClass = JSONSCHEMA_LIB[draft];
  return `import json
from jsonschema import ${validatorClass} as Validator

schema = json.loads(r'''${schemaText}''')
data = {}  # your data here

validator = Validator(schema)
errors = list(validator.iter_errors(data))
if not errors:
    print("valid")
else:
    for e in errors:
        print(f"{list(e.path)}: {e.message}")
`;
}
