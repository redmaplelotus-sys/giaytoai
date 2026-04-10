import { preprocessImage } from "@/lib/image/preprocess";
import { extractWithVision, type DocumentHint, type VisionResult } from "@/lib/ai/vision";

// ---------------------------------------------------------------------------
// Result types
// ---------------------------------------------------------------------------

export type ExtractionMethod = "pdf-text" | "pdf-vision" | "docx" | "txt";

export interface ExtractTextResult {
  /** Plain text content of the document. */
  text: string;
  method: ExtractionMethod;
  /**
   * Only set when the PDF fell back to vision extraction.
   * Gives access to stamps, signatures, confidence, etc.
   */
  vision?: VisionResult;
  /**
   * Number of characters in `text`. Useful for downstream length gating.
   */
  charCount: number;
}

// ---------------------------------------------------------------------------
// Minimum text length to consider a PDF "has a text layer".
// PDFs exported from Word/LibreOffice typically contain thousands of chars;
// image-only or heavily-compressed PDFs produce < 80 chars after Tj/TJ extraction.
// Using a slightly higher bar (120) to avoid triggering vision on forms with
// only a handful of embedded text runs.
// ---------------------------------------------------------------------------
const MIN_PDF_TEXT_CHARS = 120;

// ---------------------------------------------------------------------------
// extractText()
//
// Routing logic:
//   1. DOCX (.docx)           → mammoth → plain text
//   2. PDF with text layer    → pdf-parse → plain text
//   3. PDF without text layer → sharp preprocess → Claude Sonnet vision → text
//   4. TXT / MD               → UTF-8 decode
// ---------------------------------------------------------------------------

export async function extractText(
  buffer: Buffer,
  filename: string,
  hint: DocumentHint = "general",
): Promise<ExtractTextResult> {
  const name = filename.toLowerCase();
  const isPdf = name.endsWith(".pdf");
  const isDocx = name.endsWith(".docx");
  const isTxt = name.endsWith(".txt") || name.endsWith(".md");

  // ── DOCX ──────────────────────────────────────────────────────────────────
  if (isDocx) {
    const mammoth = (await import("mammoth")).default;
    const { value } = await mammoth.extractRawText({ buffer });
    return { text: value.trim(), method: "docx", charCount: value.trim().length };
  }

  // ── Plain text ─────────────────────────────────────────────────────────────
  if (isTxt) {
    const text = buffer.toString("utf-8").trim();
    return { text, method: "txt", charCount: text.length };
  }

  // ── PDF ────────────────────────────────────────────────────────────────────
  if (isPdf) {
    // Try text layer first (fast, free)
    let pdfText = "";
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const pdfParse = ((await import("pdf-parse")) as any).default ?? (await import("pdf-parse"));
      const result = await pdfParse(buffer, {
        // Disable test-mode page limit
        max: 0,
      });
      pdfText = result.text.replace(/\s+/g, " ").trim();
    } catch {
      // Corrupt or encrypted PDF — fall through to vision
    }

    if (pdfText.length >= MIN_PDF_TEXT_CHARS) {
      return { text: pdfText, method: "pdf-text", charCount: pdfText.length };
    }

    // Text layer insufficient — preprocess then run vision
    const preprocessed = await preprocessImage(buffer, { contrastMode: "clahe" });
    const vision = await extractWithVision(
      preprocessed.buffer,
      preprocessed.mimeType,
      hint,
    );

    return {
      text: vision.text,
      method: "pdf-vision",
      vision,
      charCount: vision.text.length,
    };
  }

  // ── Unknown format ─────────────────────────────────────────────────────────
  // Attempt UTF-8 decode as a last resort (catches files sent without extension)
  const text = buffer.toString("utf-8").trim();
  return { text, method: "txt", charCount: text.length };
}
