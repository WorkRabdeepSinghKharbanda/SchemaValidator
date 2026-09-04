import { FIELD_TYPES, STRING_FORMATS, type SchemaField } from "../lib/schemaFields";

export function SchemaBuilder({
  fields,
  onChange,
}: {
  fields: SchemaField[];
  onChange: (fields: SchemaField[]) => void;
}) {
  function update(index: number, patch: Partial<SchemaField>) {
    onChange(fields.map((f, i) => (i === index ? { ...f, ...patch } : f)));
  }

  function remove(index: number) {
    onChange(fields.filter((_, i) => i !== index));
  }

  function add() {
    onChange([...fields, { key: `field${fields.length + 1}`, type: "string", required: false }]);
  }

  return (
    <div className="schema-builder">
      {fields.length === 0 && <p className="builder-empty">No fields yet — add one below.</p>}
      {fields.map((field, i) => (
        <div className="builder-row" key={i}>
          <input
            className="builder-key"
            value={field.key}
            onChange={(e) => update(i, { key: e.target.value })}
            placeholder="field name"
          />
          <select value={field.type} onChange={(e) => update(i, { type: e.target.value as SchemaField["type"], format: undefined })}>
            {FIELD_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
          {field.type === "string" && (
            <select value={field.format ?? ""} onChange={(e) => update(i, { format: e.target.value || undefined })}>
              {STRING_FORMATS.map((f) => (
                <option key={f} value={f}>
                  {f || "plain"}
                </option>
              ))}
            </select>
          )}
          <label className="builder-required">
            <input type="checkbox" checked={field.required} onChange={(e) => update(i, { required: e.target.checked })} />
            required
          </label>
          <button className="builder-remove" onClick={() => remove(i)} title="Remove field" aria-label={`Remove field ${field.key || i + 1}`}>
            ✕
          </button>
        </div>
      ))}
      <button className="builder-add" onClick={add}>
        + Add field
      </button>
    </div>
  );
}
