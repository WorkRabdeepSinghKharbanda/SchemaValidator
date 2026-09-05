export interface BatchRow {
  index: number;
  valid: boolean;
  errorSummary: string;
}

export function BatchTable({
  rows,
  onExportJson,
  onExportPdf,
  onExportFailingJson,
  onExportCsv,
}: {
  rows: BatchRow[];
  onExportJson: () => void;
  onExportPdf: () => void;
  onExportFailingJson: () => void;
  onExportCsv: () => void;
}) {
  const passCount = rows.filter((r) => r.valid).length;
  const passPercent = rows.length ? Math.round((passCount / rows.length) * 100) : 0;
  const failCount = rows.length - passCount;

  return (
    <div className="batch-table-wrap">
      <div className="batch-summary">
        <span>
          {passCount} / {rows.length} records valid ({passPercent}%)
        </span>
        <span className="result-actions">
          {failCount > 0 && (
            <button className="export-btn" onClick={onExportFailingJson}>
              Export failing only ({failCount})
            </button>
          )}
          <button className="export-btn" onClick={onExportJson}>
            Export JSON
          </button>
          <button className="export-btn" onClick={onExportCsv}>
            Export CSV
          </button>
          <button className="export-btn" onClick={onExportPdf}>
            Export PDF
          </button>
        </span>
      </div>
      <div className="batch-progress">
        <div className="batch-progress-fill" style={{ width: `${passPercent}%` }} />
      </div>
      <table className="batch-table">
        <thead>
          <tr>
            <th>#</th>
            <th>Status</th>
            <th>Detail</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.index} className={r.valid ? "row-pass" : "row-fail"}>
              <td>{r.index}</td>
              <td>{r.valid ? "✓ pass" : "✗ fail"}</td>
              <td>{r.errorSummary}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
