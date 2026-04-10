"use client";

/**
 * exportToPdf(html, options)
 *
 * Client-side PDF generation via html2pdf.js (html2canvas + jsPDF).
 * Dynamically imported so the ~500 kB bundle is never loaded on page load —
 * only fetched when the user clicks "Export PDF".
 *
 * Usage:
 *   await exportToPdf(editor.getHTML(), { filename: "personal-statement.pdf" });
 */

import { documentCss } from "./document-styles";

export interface ExportPdfOptions {
  /** Download filename (default: "document.pdf"). */
  filename?: string;
  /** Applicant name shown in a small header above the content. */
  authorName?: string;
}

export async function exportToPdf(
  html:    string,
  options: ExportPdfOptions = {},
): Promise<void> {
  const { filename = "document.pdf", authorName = "" } = options;

  // ── Dynamically import html2pdf.js (client-only, ~500 kB) ────────────────
  const html2pdf = (await import("html2pdf.js")).default;

  // ── Build a self-contained render element ─────────────────────────────────
  // We create an off-screen div so html2canvas can measure it accurately.
  // Explicit px widths are required because html2canvas ignores CSS max-width.
  const CONTENT_WIDTH_PX = 794; // A4 at 96 dpi (210 mm)

  const wrapper = document.createElement("div");
  wrapper.style.cssText = [
    `width:${CONTENT_WIDTH_PX}px`,
    "position:fixed",
    "top:0",
    "left:-9999px",
    "background:#ffffff",
    "color:#111111",
  ].join(";");

  wrapper.innerHTML = buildHtml(html, authorName, CONTENT_WIDTH_PX);
  document.body.appendChild(wrapper);

  try {
    // html2pdf() returns a Worker (not a Promise directly); cast to escape type constraints
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const worker = html2pdf() as any;
    await worker
      .set({
        margin:      [12, 15, 12, 15],  // mm: top, right, bottom, left
        filename,
        image:       { type: "jpeg", quality: 0.97 },
        html2canvas: {
          scale:           2,           // retina-quality rasterisation
          useCORS:         true,
          letterRendering: true,
          backgroundColor: "#ffffff",
          width:           CONTENT_WIDTH_PX,
          windowWidth:     CONTENT_WIDTH_PX,
        },
        jsPDF:     { unit: "mm", format: "a4", orientation: "portrait" },
        pagebreak: { mode: ["avoid-all", "css"] },
      })
      .from(wrapper)
      .save();
  } finally {
    document.body.removeChild(wrapper);
  }
}

// ---------------------------------------------------------------------------
// HTML builder — inlines all styles so html2canvas renders correctly
// ---------------------------------------------------------------------------

function buildHtml(body: string, authorName: string, widthPx: number): string {
  const headerHtml = authorName
    ? `<div style="
        font-family:Arial,Helvetica,sans-serif;
        font-size:10px;
        color:#555555;
        text-align:right;
        padding-bottom:8px;
        margin-bottom:12px;
        border-bottom:1px solid #e5e7eb;
      ">${escapeHtml(authorName)}</div>`
    : "";

  return `
    <style>
      * { box-sizing: border-box; }
      ${documentCss("print")}
      body, div {
        width: ${widthPx}px;
        font-family: Georgia, "Times New Roman", serif;
        font-size: 12pt;
        line-height: 1.75;
        color: #111111;
        background: #ffffff;
      }
      p    { margin: 0 0 0.9em; orphans: 3; widows: 3; }
      h1   { font-size: 21pt; }
      h2   { font-size: 16.5pt; }
      h3   { font-size: 13.5pt; }
      h1,h2,h3 {
        font-family: Arial, Helvetica, sans-serif;
        font-weight: 700;
        page-break-after: avoid;
        margin: 1.4em 0 0.4em;
      }
      ul, ol { margin: 0 0 0.9em; padding-left: 1.5em; }
      li     { margin-bottom: 0.25em; }
      strong { font-weight: 700; }
      em     { font-style: italic; }
    </style>
    ${headerHtml}
    ${body}
  `;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
