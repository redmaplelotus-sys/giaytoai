// Maps every document_type slug (seeded in migration 000004) to its
// user-prompt template. Variables use {{snake_case}} syntax and correspond
// to keys in sessions.answers (JSONB).
//
// These are the canonical v1 templates. When a new prompt_version row is
// inserted into the DB, copy the template string there — the registry is
// the source of truth for authoring; the DB is the source of truth at runtime.

export type DocTypeSlug =
  | "personal-statement-au"
  | "personal-statement-us"
  | "personal-statement-uk"
  | "cover-letter"
  | "motivation-letter"
  | "scholarship-essay"
  | "translation-prep"
  | "reference-letter";

export interface PromptTemplate {
  /** Human-readable label for the template (English). */
  label: string;
  /** Variable keys expected in sessions.answers for this document type. */
  requiredFields: string[];
  /** The user-turn template. Interpolate {{variable}} before sending. */
  template: string;
}

export const PROMPT_REGISTRY: Record<DocTypeSlug, PromptTemplate> = {
  "personal-statement-au": {
    label: "Personal Statement (Australia)",
    requiredFields: [
      "full_name",
      "target_university",
      "target_degree",
      "why_australia",
      "academic_background",
      "achievements",
      "career_goal",
      "word_limit",
    ],
    template: `\
Write an Australian university personal statement for the following applicant. Target university: {{target_university}}. Degree: {{target_degree}}. Word limit: {{word_limit}}.

Applicant profile:
- Name: {{full_name}}
- Academic background: {{academic_background}}
- Key achievements: {{achievements}}
- Why Australia / this university: {{why_australia}}
- Career goal: {{career_goal}}

Tone: direct, outcomes-focused, confident. Open with the strongest achievement or clearest motivation. No preamble.\
`,
  },

  "personal-statement-us": {
    label: "Personal Statement (United States)",
    requiredFields: [
      "full_name",
      "prompt_text",
      "personal_story",
      "challenge_or_growth",
      "intellectual_interest",
      "word_limit",
    ],
    template: `\
Write a US college personal statement (Common App style) for the following applicant. Word limit: {{word_limit}}.

Essay prompt: {{prompt_text}}

Applicant's raw material:
- Personal story or formative experience: {{personal_story}}
- Challenge faced or moment of growth: {{challenge_or_growth}}
- Intellectual interest or academic passion: {{intellectual_interest}}

Requirements: scene-level detail, first person, visible growth arc. No clichés. Show, do not tell.\
`,
  },

  "personal-statement-uk": {
    label: "Personal Statement (United Kingdom)",
    requiredFields: [
      "full_name",
      "target_subject",
      "subject_interest_evidence",
      "relevant_reading_or_projects",
      "work_experience",
      "extracurriculars",
    ],
    template: `\
Write a UCAS personal statement for the following applicant. Target subject: {{target_subject}}. Hard limit: 4,000 characters / 47 lines.

Applicant profile:
- Evidence of subject interest: {{subject_interest_evidence}}
- Relevant reading, projects, or independent study: {{relevant_reading_or_projects}}
- Work experience or placements: {{work_experience}}
- Extracurricular activities: {{extracurriculars}}

Open with the academic subject. Be ruthlessly concise. No bullet points in the output body.\
`,
  },

  "cover-letter": {
    label: "Cover Letter",
    requiredFields: [
      "full_name",
      "target_role",
      "target_company",
      "relevant_experience",
      "key_skills",
      "motivation",
      "word_limit",
    ],
    template: `\
Write a professional cover letter. Role: {{target_role}} at {{target_company}}. Word limit: {{word_limit}}.

Applicant profile:
- Name: {{full_name}}
- Relevant experience: {{relevant_experience}}
- Key skills: {{key_skills}}
- Motivation for this role and company: {{motivation}}

Tone: confident, professional, specific. Three to four paragraphs. No generic openers.\
`,
  },

  "motivation-letter": {
    label: "Motivation Letter",
    requiredFields: [
      "full_name",
      "target_programme",
      "target_institution",
      "academic_background",
      "research_or_professional_interest",
      "why_this_programme",
      "career_goal",
      "word_limit",
    ],
    template: `\
Write a motivation letter for a graduate programme or scholarship application. Programme: {{target_programme}} at {{target_institution}}. Word limit: {{word_limit}}.

Applicant profile:
- Name: {{full_name}}
- Academic background: {{academic_background}}
- Research or professional interest: {{research_or_professional_interest}}
- Why this specific programme: {{why_this_programme}}
- Long-term career goal: {{career_goal}}

Structure: academic fit → research interest → programme fit → future goal. Formal register.\
`,
  },

  "scholarship-essay": {
    label: "Scholarship Essay",
    requiredFields: [
      "full_name",
      "scholarship_name",
      "essay_prompt",
      "financial_or_personal_context",
      "community_impact_or_leadership",
      "academic_achievements",
      "future_plans",
      "word_limit",
    ],
    template: `\
Write a scholarship essay. Scholarship: {{scholarship_name}}. Word limit: {{word_limit}}.

Essay prompt: {{essay_prompt}}

Applicant profile:
- Name: {{full_name}}
- Personal or financial context: {{financial_or_personal_context}}
- Community impact or leadership: {{community_impact_or_leadership}}
- Academic achievements: {{academic_achievements}}
- Future plans and how the scholarship enables them: {{future_plans}}

Address the prompt directly. Lead with impact. Avoid vague statements of gratitude.\
`,
  },

  "translation-prep": {
    label: "Translation Prep",
    requiredFields: [
      "document_type",
      "source_text_vi",
      "target_language",
      "purpose",
    ],
    template: `\
Restructure and clarify the following Vietnamese source text to prepare it for certified translation into {{target_language}}. Document type: {{document_type}}. Purpose: {{purpose}}.

Source text (Vietnamese):
{{source_text_vi}}

Tasks:
1. Identify and flag any ambiguous terms, abbreviations, or institution names that a translator must verify.
2. Rewrite unclear passages in plain Vietnamese without changing facts.
3. Return the cleaned Vietnamese text in the body field.
4. List all flagged items in the notes field.\
`,
  },

  "reference-letter": {
    label: "Reference Letter",
    requiredFields: [
      "referee_name",
      "referee_title",
      "referee_institution",
      "applicant_name",
      "relationship_and_duration",
      "applicant_strengths",
      "specific_examples",
      "target_programme_or_role",
      "word_limit",
    ],
    template: `\
Draft a reference letter to be reviewed and signed by the referee. Word limit: {{word_limit}}.

Referee: {{referee_name}}, {{referee_title}}, {{referee_institution}}
Applicant: {{applicant_name}}
Relationship: {{relationship_and_duration}}
Target programme or role: {{target_programme_or_role}}

Material to draw from:
- Applicant strengths: {{applicant_strengths}}
- Specific examples or anecdotes: {{specific_examples}}

Write in first person as the referee. Tone: authoritative, specific, warm. Open with how the referee knows the applicant and for how long. Two to three concrete examples minimum.\
`,
  },
};
