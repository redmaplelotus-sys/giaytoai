// Official document translation draft prompt.
// Accuracy-first — every field must match the source exactly.
// Stamps, seals, and signatures become labelled placeholders.
// Store in prompt_versions (document_type slug: translation-prep, version 2).

export const TRANSLATION_DRAFT_TEMPLATE = `\
Produce a translation draft of the Vietnamese official document below.

---
DOCUMENT TYPE: {{document_type}}
OUTPUT LANGUAGE: {{output_language}}  (EN = English | KO = Korean | ZH = Simplified Chinese)
PURPOSE: {{purpose}}
---

SOURCE DOCUMENT (Vietnamese)
{{source_text_vi}}

---

ACCURACY RULES — READ BEFORE TRANSLATING

These rules override any stylistic preference. A wrong number is worse than an awkward sentence.

1. EXACT FIGURES: Reproduce every number, date, code, score, GPA, and ranking exactly as it appears in the source. Do not convert, round, reformat, or normalise. If the source says "8.5/10", the output says "8.5/10" — not "8.5 out of 10.0", not "3.4/4.0".

2. PROPER NOUNS: Translate Vietnamese institution names using their official English (or target-language) name if one exists and is unambiguous. If no official translation is known, keep the Vietnamese name and append the target language in parentheses: e.g. "Đại học Quốc gia Hà Nội (Vietnam National University, Hanoi)". Never invent an unofficial translation. Add a note in the notes array for every institution name you translated, stating the source and translation.

3. DATES: Preserve the original date format. If the source says "ngày 15 tháng 6 năm 2023", output "15 June 2023" (EN), "2023년 6월 15일" (KO), or "2023年6月15日" (ZH). Do not reorder to MM/DD/YYYY unless the target system requires it — if it does, note this explicitly.

4. PERSONAL NAMES: Transliterate Vietnamese names exactly as written. Do not reorder (family name, middle name, given name order must match the source). Do not omit tone marks from the transliteration unless the document itself omits them.

5. CODES AND IDENTIFIERS: Student ID, citizen ID, document serial number, ministry codes — reproduce character-for-character. Do not add or remove hyphens, spaces, or leading zeros.

6. AMBIGUITY: If a term or abbreviation has more than one plausible translation, choose the most common official translation and add all alternatives to the notes array. Never silently pick one without flagging it.

---

STAMP, SEAL, AND SIGNATURE PLACEHOLDERS

Whenever the source document references a physical stamp, seal, signature, or notarisation mark, replace it with a clearly labelled placeholder. Do not omit these elements — their position in the layout matters for certified translation.

Use exactly these placeholder strings:

| Source element                          | Placeholder to use                          |
|-----------------------------------------|---------------------------------------------|
| Con dấu tròn / official round seal      | [CON DẤU TRÒN / OFFICIAL ROUND SEAL]       |
| Chữ ký / signature                      | [CHỮ KÝ / SIGNATURE]                        |
| Chữ ký và họ tên / signed + printed name| [CHỮ KÝ VÀ HỌ TÊN / SIGNATURE AND NAME]    |
| Dấu giáp lai / page-linking seal        | [DẤU GIÁP LAI / PAGE-LINKING SEAL]         |
| Xác nhận sao y / certified true copy    | [XÁC NHẬN SAO Y / CERTIFIED TRUE COPY]     |
| Công chứng / notary seal                | [CÔNG CHỨNG / NOTARY SEAL]                 |
| Dấu bưu điện / postal stamp             | [DẤU BƯU ĐIỆN / POSTAL STAMP]              |
| Mã QR / QR verification code            | [MÃ QR / QR VERIFICATION CODE]             |

If a seal or signature appears with a named issuing authority (e.g. "Hiệu trưởng" / Principal), include the title: [CHỮ KÝ VÀ HỌ TÊN – HIỆU TRƯỞNG / SIGNATURE AND NAME – PRINCIPAL].

---

DOCUMENT-TYPE FORMATTING

Apply the layout conventions for the specific document type. Preserve the visual hierarchy of the source (headers, tables, fields) using Markdown in the body field.

ACADEMIC TRANSCRIPT (Bảng điểm)
- Render the grade table as a Markdown table with columns: No. | Subject code | Subject name | Credits | Grade | Result
- Preserve the summary row (total credits, GPA, classification)
- Place cumulative GPA exactly as written — do not convert scale

DIPLOMA / DEGREE CERTIFICATE (Bằng tốt nghiệp)
- Preserve the formal proclamation sentence structure
- Include the degree classification (e.g. Xuất sắc → Excellent / 우수 / 优秀) as a direct translation, and add the original Vietnamese term in parentheses
- Signature block at the bottom: [CHỮ KÝ VÀ HỌ TÊN – HIỆU TRƯỞNG / SIGNATURE AND NAME – PRINCIPAL] followed by [CON DẤU TRÒN / OFFICIAL ROUND SEAL]

BIRTH CERTIFICATE (Giấy khai sinh)
- Lay out as labelled fields, not prose: "Full name:", "Date of birth:", "Place of birth:", etc.
- Ethnic group (Dân tộc) and nationality (Quốc tịch) must be translated exactly — "Kinh" stays "Kinh (Viet)" in EN
- Registration number must be reproduced exactly

CONFIRMATION / ENROLMENT LETTER (Giấy xác nhận)
- Preserve the formal letter structure: issuing authority header, body, date line, signature block
- Opening phrase "Trân trọng xác nhận" → "This is to certify that" (EN) / "이에 확인합니다" (KO) / "特此证明" (ZH)

CRIMINAL RECORD CHECK (Phiếu lý lịch tư pháp)
- "Không có tiền án" → "No criminal record" (EN) / "전과 없음" (KO) / "无犯罪记录" (ZH)
- Preserve every field label and value pair, including fields that are blank (render as "—")

HOUSEHOLD REGISTRATION (Sổ hộ khẩu)
- Render each household member as a separate labelled row
- Preserve relationship terms: Chủ hộ → Head of Household; Con → Child; Vợ/Chồng → Spouse

If {{document_type}} does not match one of the above categories, apply general formatting: labelled field-value pairs, Markdown table for any tabular data, formal paragraph prose for narrative sections.

---

After the translated document, append a --- separator followed by a bulleted notes list covering: every institution name translation decision, every ambiguous term with alternatives, and every placeholder inserted.
\
`;

export const translationDraftBlock = {
  template: TRANSLATION_DRAFT_TEMPLATE,
  requiredFields: [
    "document_type",
    "output_language",
    "purpose",
    "source_text_vi",
  ],
};
