/**
 * Shared document style constants used across all export formats
 * (HTML standalone, print/PDF, DOCX wrapper) and the Tiptap editor prose config.
 *
 * Single source of truth — change here to affect every output.
 */

// ---------------------------------------------------------------------------
// Typography
// ---------------------------------------------------------------------------

export const FONT = {
  /** Body copy — serif for formal document feel. */
  body:    "Georgia, \"Times New Roman\", serif",
  /** Headings — clean sans-serif to contrast body. */
  heading: "Arial, Helvetica, sans-serif",
  /** UI chrome (tips, labels) — system font. */
  ui:      "system-ui, -apple-system, sans-serif",
} as const;

/** Body font size in pt (print) and px (screen). */
export const FONT_SIZE = {
  bodyPt:  12,
  bodyPx:  16,
} as const;

// ---------------------------------------------------------------------------
// Heading scale  (em relative to body)
// ---------------------------------------------------------------------------

export const HEADING_SIZE = {
  h1: 1.75,   // ~21pt / 28px
  h2: 1.375,  // ~16.5pt / 22px
  h3: 1.125,  // ~13.5pt / 18px
} as const;

// ---------------------------------------------------------------------------
// Spacing
// ---------------------------------------------------------------------------

/** Line height multiplier applied to body text. */
export const LINE_HEIGHT = 1.75;

/** Paragraph spacing (em) — gap below each <p>. */
export const PARAGRAPH_SPACING = 0.9;

/** Heading top margin (em) — breathing room above headings. */
export const HEADING_MARGIN_TOP = 1.4;

// ---------------------------------------------------------------------------
// Page geometry  (used for print CSS and DOCX margins)
// ---------------------------------------------------------------------------

export const PAGE = {
  /** A4 page margins in mm. */
  marginTopMm:    25,
  marginBottomMm: 25,
  marginLeftMm:   20,
  marginRightMm:  20,

  /** Max content width for screen rendering (px). */
  maxWidthPx: 720,
} as const;

// ---------------------------------------------------------------------------
// Colour
// ---------------------------------------------------------------------------

export const COLOR = {
  body:    "#111111",
  heading: "#000000",
  muted:   "#555555",
} as const;

// ---------------------------------------------------------------------------
// DOCX-specific constants
// ---------------------------------------------------------------------------

/**
 * Fonts confirmed to support Vietnamese diacritics (tones + combining marks)
 * and available on both Windows and macOS without installation.
 */
export const DOCX_FONT = {
  body:    "Times New Roman",  // full Vietnamese range, universally available
  heading: "Arial",            // clean sans, covers toàn bộ dấu tiếng Việt
} as const;

/** All margins = 1 inch (1440 twips). */
export const DOCX_MARGIN_TWIP = 1440; // convertInchesToTwip(1)

/** Body font size in half-points (docx unit). 24 = 12pt. */
export const DOCX_FONT_SIZE_HPC = FONT_SIZE.bodyPt * 2;

/** Heading sizes in half-points. */
export const DOCX_HEADING_SIZE_HPC = {
  h1: Math.round(FONT_SIZE.bodyPt * HEADING_SIZE.h1 * 2),  // 42 hpc ≈ 21pt
  h2: Math.round(FONT_SIZE.bodyPt * HEADING_SIZE.h2 * 2),  // 33 hpc ≈ 16.5pt
  h3: Math.round(FONT_SIZE.bodyPt * HEADING_SIZE.h3 * 2),  // 27 hpc ≈ 13.5pt
} as const;

/**
 * Line spacing in twips (240 twips = 1 line at 12pt).
 * We use exact spacing so LINE_HEIGHT maps directly.
 */
export const DOCX_LINE_SPACING = Math.round(240 * LINE_HEIGHT); // 420 twips

/** Space after paragraph in twips (≈ PARAGRAPH_SPACING × 240). */
export const DOCX_SPACE_AFTER = Math.round(PARAGRAPH_SPACING * 240); // 216 twips

// ---------------------------------------------------------------------------
// CSS helpers
// ---------------------------------------------------------------------------

/**
 * Returns the shared CSS rule-set as a string, ready to embed in a <style> tag.
 * `context` controls which rules are included:
 *   - "screen"  — adds max-width centering and screen margins
 *   - "print"   — adds @page, orphan/widow control, and page-break rules
 *   - "both"    — screen rules + print media query (for the standalone HTML export)
 */
export function documentCss(context: "screen" | "print" | "both"): string {
  const base = `
  body {
    font-family: ${FONT.body};
    font-size: ${FONT_SIZE.bodyPt}pt;
    line-height: ${LINE_HEIGHT};
    color: ${COLOR.body};
    margin: 0;
  }
  p {
    margin: 0 0 ${PARAGRAPH_SPACING}em;
  }
  h1, h2, h3, h4, h5, h6 {
    font-family: ${FONT.heading};
    font-weight: 700;
    color: ${COLOR.heading};
    margin: ${HEADING_MARGIN_TOP}em 0 0.4em;
    page-break-after: avoid;
  }
  h1 { font-size: ${HEADING_SIZE.h1}em; }
  h2 { font-size: ${HEADING_SIZE.h2}em; }
  h3 { font-size: ${HEADING_SIZE.h3}em; }
  ul, ol {
    margin: 0 0 ${PARAGRAPH_SPACING}em;
    padding-left: 1.5em;
  }
  li { margin-bottom: 0.25em; }
  strong { font-weight: 700; }
  em     { font-style: italic; }
`.trimStart();

  const screenOnly = `
  body {
    max-width: ${PAGE.maxWidthPx}px;
    margin: 3rem auto;
    padding: 0 1.5rem;
  }
`.trimStart();

  const printOnly = `
  @page {
    size: A4;
    margin: ${PAGE.marginTopMm}mm ${PAGE.marginRightMm}mm ${PAGE.marginBottomMm}mm ${PAGE.marginLeftMm}mm;
  }
  p     { orphans: 3; widows: 3; }
  h1, h2, h3 { page-break-after: avoid; }
`.trimStart();

  if (context === "screen") {
    return base + screenOnly;
  }
  if (context === "print") {
    return base + printOnly;
  }
  // "both" — screen by default, override for print
  return base + screenOnly + `@media print {\n  ${printOnly.replace(/\n/g, "\n  ").trimEnd()}\n}`;
}
