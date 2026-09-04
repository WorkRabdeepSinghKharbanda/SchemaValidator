import type { jsPDF } from "jspdf";
import type { Format } from "./parse";
import type { Draft } from "./validate";
import type { ErrorItem } from "../components/ErrorList";
import type { BatchRow } from "../components/BatchTable";

// Mirrors App.css's dark theme tokens so every exported PDF carries the same brand identity
// as the app itself, rather than a plain black-on-white report.
type RGB = [number, number, number];
const COLORS: Record<"bg" | "bgElevated" | "accent" | "success" | "error" | "text" | "textDim", RGB> = {
  bg: [14, 15, 19],
  bgElevated: [22, 23, 31],
  accent: [124, 92, 255],
  success: [52, 211, 153],
  error: [255, 107, 107],
  text: [230, 230, 239],
  textDim: [139, 141, 156],
};

async function loadPdf() {
  const [{ default: JsPDF }, { default: autoTable }] = await Promise.all([import("jspdf"), import("jspdf-autotable")]);
  return { JsPDF, autoTable };
}

function drawDiamond(doc: jsPDF, cx: number, cy: number, s: number, color: RGB) {
  doc.setFillColor(...color);
  doc.lines([[s, s], [-s, s], [-s, -s]], cx, cy - s, [1, 1], "F", true);
}

function paintBackground(doc: jsPDF) {
  const { width, height } = doc.internal.pageSize;
  doc.setFillColor(...COLORS.bg);
  doc.rect(0, 0, width, height, "F");
}

function addHeader(doc: jsPDF, subtitle: string): number {
  const { width } = doc.internal.pageSize;
  doc.setFillColor(...COLORS.bgElevated);
  doc.rect(0, 0, width, 30, "F");
  drawDiamond(doc, 18, 15, 4, COLORS.accent);
  doc.setTextColor(...COLORS.text);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("Schema Validator", 28, 14);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...COLORS.textDim);
  doc.text(subtitle, 28, 21);
  doc.setDrawColor(...COLORS.accent);
  doc.setLineWidth(0.8);
  doc.line(0, 30, width, 30);
  return 40;
}

function addFooter(doc: jsPDF) {
  const { width, height } = doc.internal.pageSize;
  doc.setFontSize(8);
  doc.setTextColor(...COLORS.textDim);
  doc.text(`Generated ${new Date().toLocaleString()} — schema-validator-livid.vercel.app`, 14, height - 8);
  doc.text(`Page ${doc.getCurrentPageInfo().pageNumber}`, width - 14, height - 8, { align: "right" });
}

// autoTable's `didDrawPage` fires once per page, including the first — but page 1's background
// and header band are already painted before autoTable is called (so the page-1-specific
// summary line drawn in between isn't immediately overpainted). Repainting them again here
// only for page 2+ is what keeps a multi-page export branded all the way through instead of
// reverting to a plain white jsPDF page after the first; calling addFooter unconditionally
// here (and nowhere else) is what avoids drawing it twice on the last page.
function decoratePage(doc: jsPDF, subtitle: string, pageNumber: number) {
  if (pageNumber > 1) {
    paintBackground(doc);
    addHeader(doc, subtitle);
  }
  addFooter(doc);
}

export async function exportValidationReportPdf(report: {
  valid: boolean | null;
  format: Format;
  draft: Draft;
  errors: ErrorItem[];
}) {
  const { JsPDF, autoTable } = await loadPdf();
  const doc = new JsPDF();
  const subtitle = `Validation report — ${report.format.toUpperCase()} data, JSON Schema ${report.draft}`;
  paintBackground(doc);
  const y = addHeader(doc, subtitle);

  if (report.valid) {
    doc.setTextColor(...COLORS.success);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text("✓  Valid — no errors found", 14, y + 6);
    addFooter(doc);
  } else {
    doc.setTextColor(...COLORS.error);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text(`✗  ${report.errors.length} error${report.errors.length !== 1 ? "s" : ""} found`, 14, y);
    autoTable(doc, {
      startY: y + 6,
      head: [["Path", "Line", "Message"]],
      body: report.errors.map((e) => [e.path ?? "", e.line ? String(e.line) : "", e.message]),
      styles: { fillColor: COLORS.bgElevated, textColor: COLORS.text, lineColor: COLORS.bg },
      headStyles: { fillColor: COLORS.accent, textColor: [255, 255, 255] },
      alternateRowStyles: { fillColor: COLORS.bg },
      didDrawPage: (data) => decoratePage(doc, subtitle, data.pageNumber),
    });
  }
  doc.save("validation-report.pdf");
}

export async function exportBatchReportPdf(rows: BatchRow[]) {
  const { JsPDF, autoTable } = await loadPdf();
  const doc = new JsPDF();
  const subtitle = "Batch validation report";
  paintBackground(doc);
  const y = addHeader(doc, subtitle);

  const passCount = rows.filter((r) => r.valid).length;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(...COLORS.text);
  doc.text(`${passCount} / ${rows.length} records valid (${rows.length ? Math.round((passCount / rows.length) * 100) : 0}%)`, 14, y);

  autoTable(doc, {
    startY: y + 6,
    head: [["#", "Status", "Detail"]],
    body: rows.map((r) => [String(r.index), r.valid ? "Pass" : "Fail", r.errorSummary]),
    styles: { fillColor: COLORS.bgElevated, textColor: COLORS.text, lineColor: COLORS.bg, fontSize: 8 },
    headStyles: { fillColor: COLORS.accent, textColor: [255, 255, 255] },
    alternateRowStyles: { fillColor: COLORS.bg },
    didParseCell: (data) => {
      if (data.section === "body" && data.column.index === 1) {
        data.cell.styles.textColor = data.cell.raw === "Pass" ? [...COLORS.success] : [...COLORS.error];
      }
    },
    didDrawPage: (data) => decoratePage(doc, subtitle, data.pageNumber),
  });
  doc.save("batch-validation-report.pdf");
}

export async function exportSchemaDocsPdf(schema: unknown) {
  interface SchemaLike {
    type?: string;
    properties?: Record<string, SchemaLike>;
    required?: string[];
    description?: string;
    format?: string;
    enum?: unknown[];
  }
  const rows: string[][] = [];
  function describe(s: SchemaLike): string {
    const parts: string[] = [];
    if (s.format) parts.push(`format: ${s.format}`);
    if (s.enum) parts.push(`enum: ${s.enum.join(", ")}`);
    if (s.description) parts.push(s.description);
    return parts.join(" — ") || "—";
  }
  function walk(properties: Record<string, SchemaLike> | undefined, required: string[] | undefined, prefix: string) {
    if (!properties) return;
    for (const [key, value] of Object.entries(properties)) {
      rows.push([`${prefix}${key}`, value.type ?? "any", required?.includes(key) ? "yes" : "no", describe(value)]);
      if (value.type === "object" && value.properties) walk(value.properties, value.required, `${prefix}${key}.`);
    }
  }
  const root = schema as SchemaLike;
  walk(root.properties, root.required, "");

  const { JsPDF, autoTable } = await loadPdf();
  const doc = new JsPDF();
  const subtitle = "Schema field reference";
  paintBackground(doc);
  const y = addHeader(doc, subtitle);

  autoTable(doc, {
    startY: y,
    head: [["Field", "Type", "Required", "Details"]],
    body: rows,
    styles: { fillColor: COLORS.bgElevated, textColor: COLORS.text, lineColor: COLORS.bg, fontSize: 9 },
    headStyles: { fillColor: COLORS.accent, textColor: [255, 255, 255] },
    alternateRowStyles: { fillColor: COLORS.bg },
    didDrawPage: (data) => decoratePage(doc, subtitle, data.pageNumber),
  });
  doc.save("schema-docs.pdf");
}
