export type FieldType = "text" | "textarea" | "number";

export interface FieldMeta {
  label: string;
  hint?: string;
  type: FieldType;
  rows?: number;
}

interface FieldDef {
  label: Record<string, string>;
  hint?: Record<string, string>;
  type: FieldType;
  rows?: number;
}

const FIELDS: Record<string, FieldDef> = {
  // Identity
  full_name:                         { label: { en: "Full name", vi: "Họ và tên" }, type: "text" },
  applicant_name:                    { label: { en: "Applicant name", vi: "Tên ứng viên" }, type: "text" },
  referee_name:                      { label: { en: "Referee name", vi: "Tên người giới thiệu" }, type: "text" },
  referee_title:                     { label: { en: "Referee title / position", vi: "Chức vụ người giới thiệu" }, type: "text" },
  referee_institution:               { label: { en: "Referee institution", vi: "Cơ quan người giới thiệu" }, type: "text" },
  relationship_and_duration:         { label: { en: "Relationship & duration", vi: "Mối quan hệ & thời gian" }, hint: { en: "e.g. Thesis supervisor for 2 years", vi: "VD: Giáo viên hướng dẫn luận văn trong 2 năm" }, type: "text" },
  // Targets
  target_university:                 { label: { en: "Target university", vi: "Trường đại học mục tiêu" }, type: "text" },
  target_degree:                     { label: { en: "Degree / programme", vi: "Bằng / chương trình" }, type: "text" },
  target_subject:                    { label: { en: "Target subject", vi: "Chuyên ngành mục tiêu" }, type: "text" },
  target_programme:                  { label: { en: "Target programme", vi: "Chương trình mục tiêu" }, type: "text" },
  target_institution:                { label: { en: "Target institution", vi: "Cơ sở mục tiêu" }, type: "text" },
  target_role:                       { label: { en: "Target role / job title", vi: "Vị trí ứng tuyển" }, type: "text" },
  target_company:                    { label: { en: "Target company", vi: "Công ty mục tiêu" }, type: "text" },
  target_programme_or_role:          { label: { en: "Target programme or role", vi: "Chương trình hoặc vị trí mục tiêu" }, type: "text" },
  scholarship_name:                  { label: { en: "Scholarship name", vi: "Tên học bổng" }, type: "text" },
  // Limits
  word_limit:                        { label: { en: "Word limit", vi: "Giới hạn số từ" }, hint: { en: "Maximum words", vi: "Số từ tối đa" }, type: "number" },
  length_limit:                      { label: { en: "Length limit", vi: "Giới hạn độ dài" }, hint: { en: "Words (EN/ZH) or characters (KO)", vi: "Từ (EN/ZH) hoặc ký tự (KO)" }, type: "number" },
  // Academic
  academic_background:               { label: { en: "Academic background", vi: "Học vấn" }, hint: { en: "Degrees, institutions, GPA, relevant coursework", vi: "Bằng cấp, trường, GPA, môn học liên quan" }, type: "textarea" },
  achievements:                      { label: { en: "Key achievements", vi: "Thành tích nổi bật" }, hint: { en: "Academic, extracurricular, and professional highlights", vi: "Thành tích học tập, ngoại khóa, và nghề nghiệp" }, type: "textarea" },
  academic_achievements:             { label: { en: "Academic achievements", vi: "Thành tích học tập" }, type: "textarea" },
  subject_interest_evidence:         { label: { en: "Evidence of subject interest", vi: "Bằng chứng đam mê ngành học" }, hint: { en: "Specific books, projects, experiments, competitions", vi: "Sách, dự án, thí nghiệm, cuộc thi cụ thể" }, type: "textarea" },
  relevant_reading_or_projects:      { label: { en: "Relevant reading or independent projects", vi: "Sách đã đọc hoặc dự án cá nhân liên quan" }, type: "textarea" },
  // Experience
  work_experience:                   { label: { en: "Work / volunteer experience", vi: "Kinh nghiệm làm việc / tình nguyện" }, type: "textarea" },
  extracurriculars:                  { label: { en: "Extracurricular activities", vi: "Hoạt động ngoại khóa" }, type: "textarea" },
  current_background:                { label: { en: "Current title / background", vi: "Vị trí / bối cảnh hiện tại" }, hint: { en: "e.g. Final-year CS student at HCMUT", vi: "VD: Sinh viên năm cuối CNTT tại Đại học Bách khoa TP.HCM" }, type: "text" },
  relevant_experience:               { label: { en: "Relevant experience", vi: "Kinh nghiệm liên quan" }, hint: { en: "Roles, projects, or achievements directly related to the role", vi: "Vai trò, dự án, thành tích liên quan trực tiếp đến vị trí" }, type: "textarea" },
  key_skills:                        { label: { en: "Key skills", vi: "Kỹ năng chính" }, hint: { en: "Technical and soft skills — be specific", vi: "Kỹ năng chuyên môn và mềm — càng cụ thể càng tốt" }, type: "textarea" },
  highlight_achievement:             { label: { en: "Highlight achievement", vi: "Thành tích nổi bật nhất" }, hint: { en: "Your single strongest result to feature prominently", vi: "Thành tích ấn tượng nhất để làm nổi bật" }, type: "textarea" },
  applicant_strengths:               { label: { en: "Applicant strengths", vi: "Điểm mạnh của ứng viên" }, hint: { en: "Qualities and skills for the referee to vouch for", vi: "Phẩm chất và kỹ năng để người giới thiệu xác nhận" }, type: "textarea" },
  specific_examples:                 { label: { en: "Specific examples or anecdotes", vi: "Ví dụ hoặc câu chuyện cụ thể" }, hint: { en: "Concrete stories the referee witnessed first-hand", vi: "Câu chuyện mà người giới thiệu đã trực tiếp chứng kiến" }, type: "textarea" },
  // Motivation
  motivation:                        { label: { en: "Motivation for this role", vi: "Động lực ứng tuyển vị trí này" }, type: "textarea" },
  company_motivation:                { label: { en: "Why this company specifically", vi: "Tại sao chọn công ty này" }, hint: { en: "Name a product, value, initiative, or team", vi: "Nêu tên sản phẩm, giá trị, sáng kiến, hoặc đội ngũ cụ thể" }, type: "textarea" },
  why_this_degree:                   { label: { en: "Why this degree", vi: "Tại sao chọn ngành này" }, type: "textarea" },
  why_australia:                     { label: { en: "Why Australia / why this university", vi: "Tại sao chọn Úc / trường này" }, type: "textarea" },
  why_this_programme:                { label: { en: "Why this programme", vi: "Tại sao chọn chương trình này" }, hint: { en: "Name a specific course, professor, or research group", vi: "Nêu tên môn học, giáo sư, hoặc nhóm nghiên cứu cụ thể" }, type: "textarea" },
  research_or_professional_interest: { label: { en: "Research or professional interest", vi: "Quan tâm nghiên cứu hoặc chuyên môn" }, type: "textarea" },
  career_goal:                       { label: { en: "Long-term career goal", vi: "Mục tiêu nghề nghiệp dài hạn" }, type: "textarea" },
  future_plans:                      { label: { en: "Future plans", vi: "Kế hoạch tương lai" }, hint: { en: "How the scholarship or opportunity enables your goals", vi: "Học bổng hoặc cơ hội này giúp bạn đạt mục tiêu như thế nào" }, type: "textarea" },
  // Essays
  personal_story:                    { label: { en: "Personal story", vi: "Câu chuyện cá nhân" }, hint: { en: "A formative experience or moment that defines you", vi: "Trải nghiệm hoặc khoảnh khắc đã hình thành con người bạn" }, type: "textarea" },
  challenge_or_growth:               { label: { en: "Challenge or moment of growth", vi: "Thử thách hoặc bước trưởng thành" }, type: "textarea" },
  intellectual_interest:             { label: { en: "Intellectual interest / academic passion", vi: "Đam mê học thuật / trí tuệ" }, type: "textarea" },
  prompt_text:                       { label: { en: "Essay prompt", vi: "Đề bài luận" }, hint: { en: "Paste the exact prompt or question", vi: "Dán nguyên văn đề bài hoặc câu hỏi" }, type: "textarea" },
  essay_prompt:                      { label: { en: "Scholarship essay prompt", vi: "Đề bài luận học bổng" }, hint: { en: "Paste the exact prompt", vi: "Dán nguyên văn đề bài" }, type: "textarea" },
  financial_or_personal_context:     { label: { en: "Financial or personal context", vi: "Hoàn cảnh tài chính / cá nhân" }, type: "textarea" },
  community_impact_or_leadership:    { label: { en: "Community impact or leadership", vi: "Tác động cộng đồng hoặc lãnh đạo" }, type: "textarea" },
  // Translation
  document_type:                     { label: { en: "Document type", vi: "Loại tài liệu" }, hint: { en: "e.g. Diploma, Academic Transcript, Birth Certificate", vi: "VD: Bằng tốt nghiệp, Bảng điểm, Giấy khai sinh" }, type: "text" },
  purpose:                           { label: { en: "Purpose of translation", vi: "Mục đích dịch thuật" }, hint: { en: "e.g. University application in Korea, visa application", vi: "VD: Nộp hồ sơ đại học Hàn Quốc, xin visa" }, type: "text" },
  source_text_vi:                    { label: { en: "Source document (Vietnamese)", vi: "Tài liệu gốc (tiếng Việt)" }, hint: { en: "Paste the full text of the original document", vi: "Dán toàn bộ nội dung tài liệu gốc" }, type: "textarea", rows: 8 },
};

/** Fields set by the new-session wizard — never shown as editable questions. */
export const SYSTEM_FIELDS = new Set([
  "output_language",
  "goal",
  "destination",
  "target_word_count",
]);

let _locale = "vi";

/** Set the active locale for field labels. Call once from providers or layout. */
export function setFieldLocale(locale: string) {
  _locale = locale;
}

export function getMeta(key: string): FieldMeta {
  const def = FIELDS[key];
  if (def) {
    return {
      label: def.label[_locale] ?? def.label.en ?? def.label.vi,
      hint: def.hint ? (def.hint[_locale] ?? def.hint.en ?? def.hint.vi) : undefined,
      type: def.type,
      rows: def.rows,
    };
  }
  // Fallback: generate label from key
  const label = key.split("_").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
  return { label, type: "textarea" };
}

// Keep backwards compat — old code may reference FIELD_META directly
export const FIELD_META: Record<string, FieldMeta> = new Proxy({} as Record<string, FieldMeta>, {
  get(_, key: string) {
    return getMeta(key);
  },
  has(_, key: string) {
    return key in FIELDS;
  },
});
