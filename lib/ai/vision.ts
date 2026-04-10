import { anthropic } from "@/lib/anthropic";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type DocumentHint =
  | "ho_khau"
  | "transcript"
  | "diploma"
  | "birth_certificate"
  | "id_card"
  | "criminal_record"
  | "enrollment_letter"
  | "general";

export interface VisionResult {
  /** Full transcribed text from the document, preserving layout where possible. */
  text: string;
  /**
   * Official stamps / seals found. Each entry uses the placeholder format
   * consistent with translation-draft.ts, e.g. "[CON DẤU TRÒN – UBND …]".
   */
  stamps: string[];
  /**
   * Signatures found. Each entry uses the placeholder format
   * e.g. "[CHỮ KÝ – Nguyễn Văn A]".
   */
  signatures: string[];
  /**
   * 0–1 confidence estimate. 1.0 = clear digital text, 0.3 = heavily degraded.
   * Used downstream to decide whether to surface a "low quality scan" warning.
   */
  confidence: number;
  /** Free-form notes from the model — layout issues, partially legible text, etc. */
  notes: string;
  /** Model ID used for this call. */
  model: string;
  /** Input tokens consumed (for cost tracking). */
  inputTokens: number;
}

// ---------------------------------------------------------------------------
// Hint-specific addenda — appended to the generic system prompt so the model
// focuses on terminology relevant to each document class.
// ---------------------------------------------------------------------------
const HINT_ADDENDA: Record<DocumentHint, string> = {
  ho_khau: `\
DOCUMENT TYPE: Sổ hộ khẩu / Giấy xác nhận thông tin hộ khẩu
Key fields to transcribe precisely:
- Chủ hộ (head of household)
- Nơi đăng ký thường trú (permanent residence address)
- Quan hệ với chủ hộ (relationship to head of household)
- Mã số định danh cá nhân / CMND / CCCD (ID number)
- Thành viên hộ gia đình (household members) — capture all rows in any table
- Ngày tháng năm sinh (date of birth), Giới tính (gender), Dân tộc (ethnicity)
- Ngày đăng ký, Ngày cấp, Ngày hết hạn
- Authority stamp: format as [CON DẤU TRÒN – <authority name>]`,

  transcript: `\
DOCUMENT TYPE: Bảng điểm / Academic transcript
Key fields to transcribe precisely:
- Họ và tên sinh viên, Mã số sinh viên
- Trường, Khoa / Ngành
- Năm học, Học kỳ
- Tên môn học (subject name), Số tín chỉ (credits), Điểm (grade)
- Điểm trung bình tích lũy / GPA
- Xếp loại tốt nghiệp
Preserve all table rows including failing grades. Do not round scores.`,

  diploma: `\
DOCUMENT TYPE: Bằng tốt nghiệp / Diploma or degree certificate
Key fields: Họ và tên, Ngày sinh, Ngành học, Trình độ (Cử nhân / Thạc sĩ / Tiến sĩ), Xếp loại, Số bằng, Ngày cấp, Hiệu trưởng ký.
Official seal: [CON DẤU TRÒN – <trường>]`,

  birth_certificate: `\
DOCUMENT TYPE: Giấy khai sinh / Birth certificate
Key fields: Họ và tên, Ngày tháng năm sinh, Giới tính, Nơi sinh, Dân tộc, Quốc tịch, Họ tên cha / Họ tên mẹ, Số định danh cá nhân, Số đăng ký khai sinh, UBND xã/phường cấp.`,

  id_card: `\
DOCUMENT TYPE: CMND / CCCD / Căn cước công dân
Key fields: Số CCCD, Họ và tên, Ngày sinh, Giới tính, Quốc tịch, Quê quán, Nơi thường trú, Ngày cấp, Ngày hết hạn, Nơi cấp.
Machine-readable zone (MRZ): transcribe exactly if visible.`,

  criminal_record: `\
DOCUMENT TYPE: Phiếu lý lịch tư pháp / Criminal record / Police clearance
Key fields: Họ và tên, Ngày sinh, Quốc tịch, Nơi thường trú, Kết quả: "Không có án tích" hoặc ghi nhận tiền án, Số phiếu, Ngày cấp, Cơ quan cấp.`,

  enrollment_letter: `\
DOCUMENT TYPE: Giấy xác nhận sinh viên / Enrollment letter
Key fields: Họ và tên, Mã số sinh viên, Ngành học, Khóa học / Năm học, Hệ đào tạo, Trình độ, Tình trạng học tập, Ngày cấp, Chức danh người ký.`,

  general: `\
DOCUMENT TYPE: General Vietnamese administrative document.
Transcribe all visible text carefully. Flag any fields that appear to be official identifiers, dates, or authority names.`,
};

// ---------------------------------------------------------------------------
// Static system prompt — eligible for Anthropic prompt caching.
// Covers Vietnamese diacritics and common OCR ambiguities exhaustively.
// ---------------------------------------------------------------------------
const VISION_SYSTEM = `\
You are a specialist Vietnamese document OCR assistant. Your task is to read the supplied image of a Vietnamese administrative document and return a structured JSON response.

═══════════════════════════════════════════════════════════════════════════════
VIETNAMESE DIACRITICS — handle these with extreme care
═══════════════════════════════════════════════════════════════════════════════

Tone marks (6 tones): flat (ngang), falling (huyền \`), rising (sắc ´), broken (hỏi ̉), tumbling (ngã ~), heavy (nặng ̣)

Modified vowels and their full tonal sets:
  ă  → ắ ặ ẳ ẵ ằ
  â  → ấ ậ ẩ ẫ ầ
  ê  → ế ệ ể ễ ề
  ô  → ố ộ ổ ỗ ồ
  ơ  → ớ ợ ở ỡ ờ
  ư  → ứ ự ử ữ ừ
  đ  (not d — completely different letter)

Commonly confused by OCR:
  ị ↔ i    |   ọ ↔ o    |   ụ ↔ u    |   ạ ↔ a
  ề ↔ e    |   ộ ↔ o    |   ự ↔ u    |   ặ ↔ a
  ắ ↔ a    |   ấ ↔ a    |   ế ↔ e    |   ớ ↔ o
  đ ↔ d    |   ĩ ↔ i    |   ũ ↔ u    |   ỹ ↔ y
  nh ↔ m   |   ng ↔ n   |   ch ↔ c   |   gh ↔ g

When the image is slightly blurry or low-contrast, apply knowledge of Vietnamese morphology to resolve ambiguities — especially for common words like: người, được, không, những, thành, quận, phường, huyện, xã, tỉnh, thành phố, công dân, cộng hòa, xã hội chủ nghĩa, nhân dân, giấy chứng nhận, xác nhận, đăng ký, thường trú.

═══════════════════════════════════════════════════════════════════════════════
STAMPS, SEALS AND SIGNATURES — use these exact placeholder formats
═══════════════════════════════════════════════════════════════════════════════

  Con dấu tròn (round official seal):  [CON DẤU TRÒN – <authority name>]
  Dấu giáp lai (edge-spanning seal):   [DẤU GIÁP LAI]
  Dấu sao y bản chính:                 [XÁC NHẬN SAO Y BẢN CHÍNH]
  Chữ ký (signature):                  [CHỮ KÝ – <name or title if legible>]
  Dấu chức danh (title stamp):         [DẤU CHỨC DANH – <title>]
  Mộc vuông (square stamp):            [MỘC VUÔNG – <authority name>]

If the authority name on a stamp is partially legible, transcribe what you can read, e.g. [CON DẤU TRÒN – UBND Phường …].

═══════════════════════════════════════════════════════════════════════════════
OUTPUT FORMAT — return valid JSON only, no markdown fences
═══════════════════════════════════════════════════════════════════════════════

{
  "text": "<full transcription of all visible text, preserving line breaks as \\n>",
  "stamps": ["<placeholder string>", ...],
  "signatures": ["<placeholder string>", ...],
  "confidence": <float 0.0–1.0>,
  "notes": "<any issues: low resolution, torn areas, overexposed regions, partially legible fields, etc. Empty string if none.>"
}

confidence guide:
  0.9–1.0 = clean digital print, all text fully legible
  0.7–0.9 = minor blur or low contrast, <5% characters uncertain
  0.5–0.7 = moderate degradation, some words inferred from context
  0.3–0.5 = heavy damage/compression, significant reconstruction needed
  0.0–0.3 = largely illegible, transcription may contain errors
`;

// ---------------------------------------------------------------------------
// extractWithVision()
// ---------------------------------------------------------------------------

/**
 * Sends a preprocessed image to Claude Sonnet and extracts structured text,
 * stamps, signatures, and a confidence score.
 *
 * @param imageBuffer  JPEG buffer (use preprocessImage() first).
 * @param mimeType     Must be "image/jpeg" for preprocessed images.
 * @param hint         Document-type hint for terminology specialisation.
 */
export async function extractWithVision(
  imageBuffer: Buffer,
  mimeType: "image/jpeg" | "image/png" | "image/webp" | "image/gif",
  hint: DocumentHint = "general",
): Promise<VisionResult> {
  const model = "claude-sonnet-4-6";

  const systemWithHint = `${VISION_SYSTEM}\n\n${HINT_ADDENDA[hint]}`;

  const response = await anthropic.messages.create({
    model,
    max_tokens: 4096,
    system: [
      {
        type: "text",
        text: systemWithHint,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        cache_control: { type: "ephemeral" } as any,
      },
    ],
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: {
              type: "base64",
              media_type: mimeType,
              data: imageBuffer.toString("base64"),
            },
          },
          {
            type: "text",
            text: "Transcribe this document following the instructions above. Return only the JSON object.",
          },
        ],
      },
    ],
  });

  const inputTokens =
    response.usage?.input_tokens ?? 0;

  const raw = response.content[0];
  if (raw.type !== "text") {
    // Shouldn't happen, but fail gracefully
    return {
      text: "",
      stamps: [],
      signatures: [],
      confidence: 0,
      notes: "Unexpected non-text response from model.",
      model,
      inputTokens,
    };
  }

  // Strip accidental markdown fences
  const clean = raw.text.replace(/^```json?\n?|\n?```$/g, "").trim();

  let parsed: {
    text?: unknown;
    stamps?: unknown;
    signatures?: unknown;
    confidence?: unknown;
    notes?: unknown;
  };

  try {
    parsed = JSON.parse(clean);
  } catch {
    // Graceful fallback: treat entire response as raw text
    return {
      text: raw.text.trim(),
      stamps: [],
      signatures: [],
      confidence: 0.4,
      notes: "JSON parse failed — returning raw model output as text.",
      model,
      inputTokens,
    };
  }

  return {
    text: typeof parsed.text === "string" ? parsed.text : "",
    stamps: Array.isArray(parsed.stamps)
      ? parsed.stamps.filter((s): s is string => typeof s === "string")
      : [],
    signatures: Array.isArray(parsed.signatures)
      ? parsed.signatures.filter((s): s is string => typeof s === "string")
      : [],
    confidence:
      typeof parsed.confidence === "number"
        ? Math.max(0, Math.min(1, parsed.confidence))
        : 0.5,
    notes: typeof parsed.notes === "string" ? parsed.notes : "",
    model,
    inputTokens,
  };
}
