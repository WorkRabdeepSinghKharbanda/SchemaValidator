import { FORMATS, type Format } from "../lib/parse";

export function FormatTabs({
  value,
  onChange,
  onConvertTo,
}: {
  value: Format;
  onChange: (format: Format) => void;
  onConvertTo: (format: Format) => void;
}) {
  return (
    <div className="format-tabs">
      {FORMATS.map((f) => (
        <button key={f} className={f === value ? "active" : ""} onClick={() => onChange(f)}>
          {f.toUpperCase()}
        </button>
      ))}
      <span className="format-tabs-spacer" />
      {FORMATS.filter((f) => f !== value).map((f) => (
        <button key={f} className="convert-btn" onClick={() => onConvertTo(f)} title={`Convert current data to ${f.toUpperCase()}`}>
          → {f.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
