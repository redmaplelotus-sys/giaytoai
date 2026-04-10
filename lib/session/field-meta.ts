export type FieldType = "text" | "textarea" | "number";

export interface FieldMeta {
  label: string;
  hint?: string;
  type: FieldType;
  rows?: number;
}

export const FIELD_META: Record<string, FieldMeta> = {
  // Identity
  full_name:                         { label: "Full name", type: "text" },
  applicant_name:                    { label: "Applicant name", type: "text" },
  referee_name:                      { label: "Referee name", type: "text" },
  referee_title:                     { label: "Referee title / position", type: "text" },
  referee_institution:               { label: "Referee institution", type: "text" },
  relationship_and_duration:         { label: "Relationship & duration", hint: "e.g. Thesis supervisor for 2 years", type: "text" },
  // Targets
  target_university:                 { label: "Target university", type: "text" },
  target_degree:                     { label: "Degree / programme", type: "text" },
  target_subject:                    { label: "Target subject", type: "text" },
  target_programme:                  { label: "Target programme", type: "text" },
  target_institution:                { label: "Target institution", type: "text" },
  target_role:                       { label: "Target role / job title", type: "text" },
  target_company:                    { label: "Target company", type: "text" },
  target_programme_or_role:          { label: "Target programme or role", type: "text" },
  scholarship_name:                  { label: "Scholarship name", type: "text" },
  // Limits
  word_limit:                        { label: "Word limit", hint: "Maximum words", type: "number" },
  length_limit:                      { label: "Length limit", hint: "Words (EN/ZH) or characters (KO)", type: "number" },
  // Academic
  academic_background:               { label: "Academic background", hint: "Degrees, institutions, GPA, relevant coursework", type: "textarea" },
  achievements:                      { label: "Key achievements", hint: "Academic, extracurricular, and professional highlights", type: "textarea" },
  academic_achievements:             { label: "Academic achievements", type: "textarea" },
  subject_interest_evidence:         { label: "Evidence of subject interest", hint: "Specific books, projects, experiments, competitions", type: "textarea" },
  relevant_reading_or_projects:      { label: "Relevant reading or independent projects", type: "textarea" },
  // Experience
  work_experience:                   { label: "Work / volunteer experience", type: "textarea" },
  extracurriculars:                  { label: "Extracurricular activities", type: "textarea" },
  current_background:                { label: "Current title / background", hint: "e.g. Final-year CS student at HCMUT", type: "text" },
  relevant_experience:               { label: "Relevant experience", hint: "Roles, projects, or achievements directly related to the role", type: "textarea" },
  key_skills:                        { label: "Key skills", hint: "Technical and soft skills — be specific", type: "textarea" },
  highlight_achievement:             { label: "Highlight achievement", hint: "Your single strongest result to feature prominently", type: "textarea" },
  applicant_strengths:               { label: "Applicant strengths", hint: "Qualities and skills for the referee to vouch for", type: "textarea" },
  specific_examples:                 { label: "Specific examples or anecdotes", hint: "Concrete stories the referee witnessed first-hand", type: "textarea" },
  // Motivation — not extractable from CV, but included for completeness
  motivation:                        { label: "Motivation for this role", type: "textarea" },
  company_motivation:                { label: "Why this company specifically", hint: "Name a product, value, initiative, or team", type: "textarea" },
  why_this_degree:                   { label: "Why this degree", type: "textarea" },
  why_australia:                     { label: "Why Australia / why this university", type: "textarea" },
  why_this_programme:                { label: "Why this programme", hint: "Name a specific course, professor, or research group", type: "textarea" },
  research_or_professional_interest: { label: "Research or professional interest", type: "textarea" },
  career_goal:                       { label: "Long-term career goal", type: "textarea" },
  future_plans:                      { label: "Future plans", hint: "How the scholarship or opportunity enables your goals", type: "textarea" },
  // Essays
  personal_story:                    { label: "Personal story", hint: "A formative experience or moment that defines you", type: "textarea" },
  challenge_or_growth:               { label: "Challenge or moment of growth", type: "textarea" },
  intellectual_interest:             { label: "Intellectual interest / academic passion", type: "textarea" },
  prompt_text:                       { label: "Essay prompt", hint: "Paste the exact prompt or question", type: "textarea" },
  essay_prompt:                      { label: "Scholarship essay prompt", hint: "Paste the exact prompt", type: "textarea" },
  financial_or_personal_context:     { label: "Financial or personal context", type: "textarea" },
  community_impact_or_leadership:    { label: "Community impact or leadership", type: "textarea" },
  // Translation
  document_type:                     { label: "Document type", hint: "e.g. Diploma, Academic Transcript, Birth Certificate", type: "text" },
  purpose:                           { label: "Purpose of translation", hint: "e.g. University application in Korea, visa application", type: "text" },
  source_text_vi:                    { label: "Source document (Vietnamese)", hint: "Paste the full text of the original document", type: "textarea", rows: 8 },
};

/** Fields set by the new-session wizard — never shown as editable questions. */
export const SYSTEM_FIELDS = new Set([
  "output_language",
  "goal",
  "destination",
  "target_word_count",
]);

export function getMeta(key: string): FieldMeta {
  if (FIELD_META[key]) return FIELD_META[key];
  const label = key.split("_").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
  return { label, type: "textarea" };
}
