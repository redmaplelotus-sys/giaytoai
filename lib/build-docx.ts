/**
 * buildDocx / buildBilingualDocx
 *
 * buildDocx(html, options)
 *   Converts Tiptap HTML to a monolingual .docx buffer.
 *
 * buildBilingualDocx(englishHtml, vietnameseText, options)
 *   Two-column English | Tiếng Việt table. Each English block is paired
 *   with the corresponding Vietnamese paragraph in the same row so readers
 *   can scan both languages side-by-side.
 *
 * Both functions:
 *   - Vietnamese-compatible fonts (Times New Roman / Arial)
 *   - 1-inch margins, right-aligned name header, centred page-number footer
 */

import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  Header,
  Footer,
  AlignmentType,
  HeadingLevel,
  PageNumber,
  NumberFormat,
  LevelFormat,
  BorderStyle,
  WidthType,
  ShadingType,
  VerticalAlign,
  convertInchesToTwip,
} from "docx";
import { parse, type HTMLElement as NHTMLElement, type Node as NNode } from "node-html-parser";
import {
  DOCX_FONT,
  DOCX_FONT_SIZE_HPC,
  DOCX_HEADING_SIZE_HPC,
  DOCX_LINE_SPACING,
  DOCX_SPACE_AFTER,
  DOCX_MARGIN_TWIP,
} from "./document-styles";

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export interface BuildDocxOptions {
  /** Applicant's name shown right-aligned in the header. Pass "" to omit. */
  authorName?: string;
  /** Document title embedded in OOXML metadata. */
  title?: string;
}

/**
 * Converts HTML (Tiptap output) to a .docx Buffer.
 *
 * @example
 * const buf = await buildDocx(editor.getHTML(), { authorName: "Nguyễn Văn A" });
 * // → send as application/vnd.openxmlformats-officedocument.wordprocessingml.document
 */
export async function buildDocx(html: string, options: BuildDocxOptions = {}): Promise<Buffer> {
  const { authorName = "", title = "Document" } = options;

  const { docParagraphs, numbering } = parseHtml(html);

  const doc = new Document({
    title,
    creator:   authorName || "Giấy Tờ AI",
    numbering: numbering ? { config: [numbering.config] } : undefined,

    styles: {
      default: {
        document: {
          run:       { font: DOCX_FONT.body, size: DOCX_FONT_SIZE_HPC, color: "111111" },
          paragraph: { spacing: { line: DOCX_LINE_SPACING, after: DOCX_SPACE_AFTER } },
        },
      },
    },

    sections: [
      {
        properties: {
          page: {
            margin: { top: DOCX_MARGIN_TWIP, bottom: DOCX_MARGIN_TWIP, left: DOCX_MARGIN_TWIP, right: DOCX_MARGIN_TWIP },
            pageNumbers: { start: 1, formatType: NumberFormat.DECIMAL },
          },
        },
        headers: { default: makeHeader(authorName) },
        footers: { default: makeFooter() },
        children: docParagraphs,
      },
    ],
  });

  return Buffer.from(await Packer.toBuffer(doc));
}

// ---------------------------------------------------------------------------
// buildBilingualDocx
// ---------------------------------------------------------------------------

/**
 * Builds a two-column English | Tiếng Việt .docx.
 *
 * @param englishHtml  Tiptap HTML of the source document.
 * @param vietnameseText  Plain text translation (paragraph breaks = \n or \n\n).
 *                        Passing an HTML string is also accepted.
 */
export async function buildBilingualDocx(
  englishHtml:     string,
  vietnameseText:  string,
  options:         BuildDocxOptions = {},
): Promise<Buffer> {
  const { authorName = "", title = "Document" } = options;

  // ── Parse both sides ──────────────────────────────────────────────────────
  const enBlocks  = parseHtmlToBlocks(englishHtml);
  const viBlocks  = parseTextToBlocks(vietnameseText);

  // Pad shorter side with empty blocks so every row has two cells
  const rowCount  = Math.max(enBlocks.length, viBlocks.length);
  const emptyBlk: Paragraph[] = [new Paragraph({ children: [] })];

  // A4 usable width with 1-inch margins on both sides (twips)
  // A4 = 11906 twips wide; 2 × 1440 = 2880 margin → 9026 usable
  const USABLE_W = 9026;
  const COL_W    = Math.floor(USABLE_W / 2);

  // ── Border definitions ────────────────────────────────────────────────────
  const NO_BORDER  = { style: BorderStyle.NONE,   size: 0, color: "FFFFFF" } as const;
  const DIV_BORDER = { style: BorderStyle.SINGLE, size: 4, color: "CCCCCC" } as const;
  const ROW_BORDER = { style: BorderStyle.SINGLE, size: 2, color: "EEEEEE" } as const;

  // Cell padding (twips): 6pt top/bottom, 8pt left/right
  const CELL_MARGIN = { top: 120, bottom: 120, left: 160, right: 160 } as const;

  // ── Column header row ─────────────────────────────────────────────────────
  const headerRow = new TableRow({
    tableHeader: true,
    children: [
      headerCell("English",     COL_W, CELL_MARGIN, DIV_BORDER, NO_BORDER),
      headerCell("Tiếng Việt",  COL_W, CELL_MARGIN, NO_BORDER,  NO_BORDER),
    ],
  });

  // ── Content rows ──────────────────────────────────────────────────────────
  const contentRows = Array.from({ length: rowCount }, (_, i) =>
    new TableRow({
      children: [
        contentCell(enBlocks[i] ?? emptyBlk, COL_W, CELL_MARGIN, DIV_BORDER, ROW_BORDER),
        contentCell(viBlocks[i] ?? emptyBlk, COL_W, CELL_MARGIN, NO_BORDER,  ROW_BORDER),
      ],
    }),
  );

  // ── Table ─────────────────────────────────────────────────────────────────
  const table = new Table({
    width:   { size: USABLE_W, type: WidthType.DXA },
    borders: {
      top:              NO_BORDER,
      bottom:           NO_BORDER,
      left:             NO_BORDER,
      right:            NO_BORDER,
      insideHorizontal: NO_BORDER,
      insideVertical:   NO_BORDER,
    },
    rows: [headerRow, ...contentRows],
  });

  const doc = new Document({
    title,
    creator: authorName || "Giấy Tờ AI",

    styles: {
      default: {
        document: {
          run:       { font: DOCX_FONT.body, size: DOCX_FONT_SIZE_HPC, color: "111111" },
          paragraph: { spacing: { line: DOCX_LINE_SPACING, after: DOCX_SPACE_AFTER } },
        },
      },
    },

    sections: [
      {
        properties: {
          page: {
            margin: {
              top:    DOCX_MARGIN_TWIP,
              bottom: DOCX_MARGIN_TWIP,
              left:   DOCX_MARGIN_TWIP,
              right:  DOCX_MARGIN_TWIP,
            },
            pageNumbers: { start: 1, formatType: NumberFormat.DECIMAL },
          },
        },
        headers: { default: makeHeader(authorName) },
        footers: { default: makeFooter() },
        children: [table],
      },
    ],
  });

  return Buffer.from(await Packer.toBuffer(doc));
}

// ---------------------------------------------------------------------------
// Table cell helpers
// ---------------------------------------------------------------------------

type CellBorderDef = { style: typeof BorderStyle[keyof typeof BorderStyle]; size: number; color: string };
type CellMargin    = { top: number; bottom: number; left: number; right: number };

function headerCell(
  label:       string,
  width:       number,
  margin:      CellMargin,
  rightBorder: CellBorderDef,
  bottomBorder: CellBorderDef,
): TableCell {
  return new TableCell({
    width: { size: width, type: WidthType.DXA },
    verticalAlign: VerticalAlign.CENTER,
    shading: { type: ShadingType.SOLID, color: "F3F4F6" },
    margins: margin,
    borders: {
      top:    { style: BorderStyle.SINGLE, size: 4, color: "CCCCCC" },
      bottom: { style: BorderStyle.SINGLE, size: 4, color: "CCCCCC" },
      left:   { style: BorderStyle.NONE,   size: 0, color: "FFFFFF" },
      right:  rightBorder,
    },
    children: [
      new Paragraph({
        children: [
          new TextRun({
            text:  label,
            font:  DOCX_FONT.heading,
            size:  DOCX_FONT_SIZE_HPC,
            bold:  true,
            color: "374151",
          }),
        ],
        spacing: { after: 0 },
      }),
    ],
  });
}

function contentCell(
  paragraphs:   Paragraph[],
  width:        number,
  margin:       CellMargin,
  rightBorder:  CellBorderDef,
  bottomBorder: CellBorderDef,
): TableCell {
  return new TableCell({
    width:         { size: width, type: WidthType.DXA },
    verticalAlign: VerticalAlign.TOP,
    margins:       margin,
    borders: {
      top:    { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
      bottom: bottomBorder,
      left:   { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
      right:  rightBorder,
    },
    children: paragraphs,
  });
}

// ---------------------------------------------------------------------------
// Header / footer factories (shared by both buildDocx and buildBilingualDocx)
// ---------------------------------------------------------------------------

function makeHeader(authorName: string): Header {
  return new Header({
    children: [
      new Paragraph({
        alignment: AlignmentType.RIGHT,
        children: [
          new TextRun({ text: authorName, font: DOCX_FONT.heading, size: 20, color: "555555" }),
        ],
      }),
    ],
  });
}

function makeFooter(): Footer {
  return new Footer({
    children: [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [
          new TextRun({ text: "Page ",  font: DOCX_FONT.body, size: 18, color: "777777" }),
          new TextRun({ children: [PageNumber.CURRENT],     font: DOCX_FONT.body, size: 18, color: "777777" }),
          new TextRun({ text: " of ",   font: DOCX_FONT.body, size: 18, color: "777777" }),
          new TextRun({ children: [PageNumber.TOTAL_PAGES], font: DOCX_FONT.body, size: 18, color: "777777" }),
        ],
      }),
    ],
  });
}

// ---------------------------------------------------------------------------
// HTML → docx nodes
// ---------------------------------------------------------------------------

// Hoisted so parseTextToBlocks (below) can reference it before paragraph factories
const BODY_SPACING = { line: DOCX_LINE_SPACING, after: DOCX_SPACE_AFTER };

interface ParseResult {
  docParagraphs: Paragraph[];
  numbering:     ReturnType<typeof makeNumbering> | null;
}

function parseHtml(html: string): ParseResult {
  const root      = parse(`<body>${html}</body>`);
  const body      = root.querySelector("body")!;
  const hasOl     = !!body.querySelector("ol");

  const numbering = hasOl ? makeNumbering() : null;
  const ctx       = { numbering };

  const docParagraphs = walkBlock(body.childNodes, ctx);

  return { docParagraphs, numbering };
}

/**
 * Parses HTML into a flat array of single-paragraph blocks for bilingual table rows.
 * Each <p>, <h1>–<h3>, and <li> becomes its own block (array of one Paragraph).
 */
function parseHtmlToBlocks(html: string): Paragraph[][] {
  const root = parse(`<body>${html}</body>`);
  const body = root.querySelector("body")!;
  const hasOl = !!body.querySelector("ol");
  const numbering = hasOl ? makeNumbering() : null;
  const ctx = { numbering };
  // walkBlock returns a flat Paragraph[]; each element is already one block
  return walkBlock(body.childNodes, ctx).map((p) => [p]);
}

/**
 * Splits plain-text (or very basic HTML) translation into paragraph blocks.
 * Double newline → new block. Single newline → <br> within same block.
 * Also handles the case where a translation was returned as HTML.
 */
function parseTextToBlocks(text: string): Paragraph[][] {
  // If the input looks like HTML, strip tags and normalise
  const isHtml = /<[a-z]/i.test(text);
  const plain  = isHtml
    ? text.replace(/<br\s*\/?>/gi, "\n").replace(/<[^>]+>/g, "").trim()
    : text.trim();

  return plain
    .split(/\n{2,}/)          // paragraph break
    .map((chunk) => chunk.trim())
    .filter(Boolean)
    .map((chunk) => {
      const lines = chunk.split(/\n/);
      const runs: TextRun[] = [];
      lines.forEach((line, i) => {
        runs.push(new TextRun({ text: line, font: DOCX_FONT.body, size: DOCX_FONT_SIZE_HPC, color: "111111" }));
        if (i < lines.length - 1) runs.push(new TextRun({ break: 1 }));
      });
      return [new Paragraph({ children: runs, spacing: BODY_SPACING })];
    });
}

interface Ctx {
  numbering: ReturnType<typeof makeNumbering> | null;
}

function walkBlock(nodes: NNode[], ctx: Ctx): Paragraph[] {
  const out: Paragraph[] = [];

  for (const node of nodes) {
    if (node.nodeType === 3) {
      // Top-level text node — wrap in plain paragraph
      const text = node.text.trim();
      if (text) out.push(bodyParagraph([new TextRun({ text, font: DOCX_FONT.body, size: DOCX_FONT_SIZE_HPC })]));
      continue;
    }

    const el  = node as NHTMLElement;
    const tag = el.tagName?.toLowerCase() ?? "";

    switch (tag) {
      case "p":
        out.push(bodyParagraph(inlineRuns(el)));
        break;

      case "h1":
        out.push(headingParagraph(inlineRuns(el), HeadingLevel.HEADING_1, DOCX_HEADING_SIZE_HPC.h1));
        break;
      case "h2":
        out.push(headingParagraph(inlineRuns(el), HeadingLevel.HEADING_2, DOCX_HEADING_SIZE_HPC.h2));
        break;
      case "h3":
      case "h4":
      case "h5":
      case "h6":
        out.push(headingParagraph(inlineRuns(el), HeadingLevel.HEADING_3, DOCX_HEADING_SIZE_HPC.h3));
        break;

      case "ul":
        for (const li of el.querySelectorAll("li")) {
          out.push(bulletParagraph(inlineRuns(li)));
        }
        break;

      case "ol":
        for (const li of el.querySelectorAll("li")) {
          out.push(numberedParagraph(inlineRuns(li), ctx.numbering!));
        }
        break;

      case "blockquote":
        // Render blockquote children as indented body paragraphs
        for (const child of el.childNodes) {
          const childEl = child as NHTMLElement;
          if (childEl.tagName?.toLowerCase() === "p") {
            out.push(blockquoteParagraph(inlineRuns(childEl)));
          }
        }
        break;

      case "br":
        out.push(bodyParagraph([]));
        break;

      default:
        // Recurse into unknown block wrappers (div, section, etc.)
        out.push(...walkBlock(el.childNodes, ctx));
    }
  }

  return out;
}

// ---------------------------------------------------------------------------
// Inline → TextRun[]
// ---------------------------------------------------------------------------

interface RunStyle {
  bold?:   boolean;
  italic?: boolean;
  code?:   boolean;
  strike?: boolean;
}

function inlineRuns(el: NHTMLElement, inherited: RunStyle = {}): TextRun[] {
  const runs: TextRun[] = [];

  for (const node of el.childNodes) {
    if (node.nodeType === 3) {
      // Text node
      const text = node.text;
      if (text) {
        runs.push(makeRun(text, inherited));
      }
      continue;
    }

    const child = node as NHTMLElement;
    const tag   = child.tagName?.toLowerCase() ?? "";

    switch (tag) {
      case "strong":
      case "b":
        runs.push(...inlineRuns(child, { ...inherited, bold: true }));
        break;
      case "em":
      case "i":
        runs.push(...inlineRuns(child, { ...inherited, italic: true }));
        break;
      case "s":
      case "del":
        runs.push(...inlineRuns(child, { ...inherited, strike: true }));
        break;
      case "code":
        runs.push(...inlineRuns(child, { ...inherited, code: true }));
        break;
      case "br":
        runs.push(new TextRun({ break: 1 }));
        break;
      case "a":
        // Hyperlinks: render as underlined text (full hyperlink needs Relationship API)
        runs.push(...inlineRuns(child, inherited));
        break;
      default:
        runs.push(...inlineRuns(child, inherited));
    }
  }

  return runs;
}

function makeRun(text: string, style: RunStyle): TextRun {
  return new TextRun({
    text,
    font:          style.code ? "Courier New" : DOCX_FONT.body,
    size:          DOCX_FONT_SIZE_HPC,
    bold:          style.bold   ?? false,
    italics:       style.italic ?? false,
    strike:        style.strike ?? false,
    color:         "111111",
  });
}

// ---------------------------------------------------------------------------
// Paragraph factories
// ---------------------------------------------------------------------------

function bodyParagraph(children: TextRun[]): Paragraph {
  return new Paragraph({
    children,
    spacing: BODY_SPACING,
  });
}

function headingParagraph(children: TextRun[], level: typeof HeadingLevel[keyof typeof HeadingLevel], sizeHpc: number): Paragraph {
  // Override run sizes with heading size
  const resized = children.map((r) =>
    new TextRun({ ...(r as unknown as Record<string, unknown>), size: sizeHpc, font: DOCX_FONT.heading, bold: true, color: "000000" }),
  );
  return new Paragraph({
    heading:  level,
    children: resized,
    spacing:  { before: convertInchesToTwip(0.15), after: convertInchesToTwip(0.05), line: DOCX_LINE_SPACING },
  });
}

function bulletParagraph(children: TextRun[]): Paragraph {
  return new Paragraph({
    children,
    bullet:  { level: 0 },
    spacing: BODY_SPACING,
  });
}

function numberedParagraph(children: TextRun[], num: ReturnType<typeof makeNumbering>): Paragraph {
  return new Paragraph({
    children,
    numbering: { reference: num.reference, level: 0 },
    spacing:   BODY_SPACING,
  });
}

function blockquoteParagraph(children: TextRun[]): Paragraph {
  return new Paragraph({
    children,
    indent:  { left: convertInchesToTwip(0.5) },
    spacing: BODY_SPACING,
  });
}

// ---------------------------------------------------------------------------
// Ordered-list numbering definition
// ---------------------------------------------------------------------------

function makeNumbering() {
  const reference = "ol-default";
  const config = {
    reference,
    levels: [
      {
        level:     0,
        format:    LevelFormat.DECIMAL,
        text:      "%1.",
        alignment: AlignmentType.LEFT,
        style: {
          paragraph: { indent: { left: convertInchesToTwip(0.5), hanging: convertInchesToTwip(0.25) } },
          run:       { font: DOCX_FONT.body, size: DOCX_FONT_SIZE_HPC },
        },
      },
    ],
  };

  return { config, reference };
}
