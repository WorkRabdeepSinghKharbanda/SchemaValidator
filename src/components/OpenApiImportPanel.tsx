import { useEffect, useRef, useState } from "react";
import { parse } from "../lib/parse";
import { extractOpenApiSchemas } from "../lib/openapi";

export function OpenApiImportPanel({
  open,
  onClose,
  onImport,
  onError,
  onWarning,
}: {
  open: boolean;
  onClose: () => void;
  onImport: (name: string, schemas: Record<string, unknown>) => void;
  onError: (message: string) => void;
  onWarning: (message: string) => void;
}) {
  const [schemas, setSchemas] = useState<Record<string, unknown> | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    function onKeydown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeydown);
    return () => window.removeEventListener("keydown", onKeydown);
  }, [open, onClose]);

  function handleFile(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result ?? "");
      // OpenAPI/Swagger specs ship as either JSON or YAML — try both rather than asking the
      // user to say which.
      const asJson = parse(text, "json");
      const asYaml = asJson.error ? parse(text, "yaml") : asJson;
      if (asYaml.error) {
        onError(`"${file.name}" isn't valid JSON or YAML: ${asYaml.error.message}`);
        return;
      }
      const { schemas: found, unresolvedRefs } = extractOpenApiSchemas(asYaml.data);
      if (Object.keys(found).length === 0) {
        onError(`No schemas found under components.schemas / definitions in "${file.name}"`);
        return;
      }
      if (unresolvedRefs.length > 0) {
        onWarning(
          `${unresolvedRefs.length} $ref${unresolvedRefs.length !== 1 ? "s" : ""} outside components/schemas ` +
            `(e.g. parameters, or external files) couldn't be rewritten and may fail to resolve: ${unresolvedRefs.slice(0, 3).join(", ")}${unresolvedRefs.length > 3 ? "…" : ""}`,
        );
      }
      setSchemas(found);
    };
    reader.onerror = () => onError(`Couldn't read "${file.name}": ${reader.error?.message ?? "unknown error"}`);
    reader.readAsText(file);
  }

  if (!open) return null;

  return (
    <div className="drawer-overlay" onClick={onClose}>
      <div className="drawer" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Import from OpenAPI">
        <div className="drawer-header">
          <h3>Import from OpenAPI</h3>
          <button onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>
        <p className="drawer-empty">
          Upload an OpenAPI or Swagger spec (JSON or YAML). Pick one of its schemas to load — the rest are added as
          reference schemas so <code>$ref</code>s between them resolve.
        </p>

        {!schemas && (
          <button className="builder-add" onClick={() => fileRef.current?.click()}>
            + Upload spec file
          </button>
        )}

        {schemas && (
          <ul className="history-list">
            {Object.keys(schemas).map((name) => (
              <li key={name}>
                <button className="history-entry" onClick={() => onImport(name, schemas)}>
                  <span className="history-format">{name}</span>
                </button>
              </li>
            ))}
          </ul>
        )}

        <input
          ref={fileRef}
          type="file"
          accept=".json,.yaml,.yml"
          hidden
          onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
        />
      </div>
    </div>
  );
}
