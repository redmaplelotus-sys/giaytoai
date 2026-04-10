import sharp from "sharp";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PreprocessOptions {
  /**
   * Maximum pixel length on the longest side. Images smaller than this are
   * not upscaled. Default: 2000.
   */
  maxDimension?: number;

  /**
   * JPEG output quality (1–100). Default: 88 — good quality / small file for
   * Claude vision and storage.
   */
  quality?: number;

  /**
   * Contrast enhancement strategy:
   *
   * "normalize" — percentile histogram stretch (fast, good for well-lit scans).
   * "clahe"     — Contrast Limited Adaptive Histogram Equalization (slower,
   *               better for uneven illumination, crumpled or shadowed pages).
   *
   * Default: "normalize".
   */
  contrastMode?: "normalize" | "clahe";
}

export interface PreprocessResult {
  /** Processed image as a JPEG buffer. */
  buffer: Buffer;
  mimeType: "image/jpeg";
  width: number;
  height: number;
  originalWidth: number;
  originalHeight: number;
  /** True when EXIF Orientation tag required rotation (phone photos, etc.). */
  wasRotated: boolean;
  /** True when the source was HEIC/HEIF and was converted. */
  wasConverted: boolean;
}

// ---------------------------------------------------------------------------
// CLAHE tile size — 1/8 of the image on each axis, clamped to [4, 64].
// Small tiles improve local contrast; too small causes blocking artefacts.
// ---------------------------------------------------------------------------
function claheTileSize(dimension: number): number {
  return Math.max(4, Math.min(64, Math.round(dimension / 8)));
}

// ---------------------------------------------------------------------------
// preprocessImage()
//
// Pipeline:
//   1. EXIF auto-rotate      — corrects phone/camera orientation
//   2. sRGB normalisation    — converts HEIC, CMYK, P3, etc. to sRGB
//   3. Resize (inside)       — longest side ≤ maxDimension, never upscale
//   4. Contrast enhancement  — normalize or CLAHE
//   5. Sharpen               — light edge sharpening for text crispness
//   6. JPEG encode           — 88 % quality, non-progressive
// ---------------------------------------------------------------------------

export async function preprocessImage(
  input: Buffer,
  options: PreprocessOptions = {},
): Promise<PreprocessResult> {
  const {
    maxDimension = 2000,
    quality = 88,
    contrastMode = "normalize",
  } = options;

  // Read metadata once so we can report it and compute CLAHE tile sizes.
  const meta = await sharp(input, { failOnError: false }).metadata();

  const originalWidth = meta.width ?? 0;
  const originalHeight = meta.height ?? 0;

  // EXIF orientation 1 = normal; undefined = no tag (treat as normal).
  const wasRotated =
    meta.orientation !== undefined &&
    meta.orientation !== 1;

  const wasConverted =
    meta.format === "heif" || // HEIC / HEIF
    meta.format === "avif";

  // ── Build pipeline ──────────────────────────────────────────────────────

  // Step 1 + 2: EXIF rotate then force sRGB.
  // .rotate() with no arguments reads the EXIF Orientation tag and strips it.
  // .toColorspace("srgb") converts any input colourspace (CMYK, P3, HEIC).
  let pipeline = sharp(input, { failOnError: false })
    .rotate()
    .toColorspace("srgb");

  // Step 3: Resize.
  // fit: "inside" keeps aspect ratio and never exceeds maxDimension on either axis.
  // withoutEnlargement: true leaves small images untouched.
  pipeline = pipeline.resize(maxDimension, maxDimension, {
    fit: "inside",
    withoutEnlargement: true,
  });

  // Step 4: Contrast enhancement.
  // We need the post-rotation dimensions for CLAHE tile sizing, but sharp
  // resolves those lazily. Use originalWidth/Height as an approximation
  // (rotation swaps w/h at 90°/270° — tile sizes stay reasonable either way).
  if (contrastMode === "clahe") {
    const tw = claheTileSize(originalWidth || maxDimension);
    const th = claheTileSize(originalHeight || maxDimension);
    // maxSlope limits contrast amplification to reduce noise in dark regions.
    pipeline = pipeline.clahe({ width: tw, height: th, maxSlope: 3 });
  } else {
    // Percentile stretch: clips the bottom 1 % and top 1 % of pixel values
    // to map the effective tonal range to [0, 255].
    pipeline = pipeline.normalise({ lower: 1, upper: 99 });
  }

  // Step 5: Light unsharp mask — improves text legibility without halos.
  // sigma: blur radius for the mask; m1: flat-area gain; m2: edge gain.
  pipeline = pipeline.sharpen({ sigma: 0.8, m1: 0.3, m2: 4 });

  // Step 6: JPEG output.
  const { data, info } = await pipeline
    .jpeg({ quality, progressive: false, mozjpeg: false })
    .toBuffer({ resolveWithObject: true });

  return {
    buffer: data,
    mimeType: "image/jpeg",
    width: info.width,
    height: info.height,
    originalWidth,
    originalHeight,
    wasRotated,
    wasConverted,
  };
}
