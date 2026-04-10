import { anthropic } from "@/lib/anthropic";
import { FIELD_META } from "@/lib/session/field-meta";

// ---------------------------------------------------------------------------
// Structured CV profile — the parsed representation of the candidate's CV.
// Stored alongside prefilledAnswers so callers can render a "what we found"
// summary without re-parsing.
// ---------------------------------------------------------------------------

export interface CVEducation {
  institution: string;
  degree: string;      // e.g. "Bachelor of Science"
  field: string;       // e.g. "Computer Science"
  gpa?: string;        // e.g. "3.8/4.0" — preserve exact notation
  honours?: string;    // e.g. "Distinction", "Magna Cum Laude"
  start?: string;      // "2020"
  end?: string;        // "2024" or "Present"
}

export interface CVExperience {
  title: string;
  organisation: string;
  start?: string;
  end?: string;
  /** 1–3 sentence summary of responsibilities and impact. */
  description?: string;
}

export interface CVProfile {
  full_name?: string;
  email?: string;
  phone?: string;
  /** Formatted current position, e.g. "Software Engineer at Grab" */
  current_title?: string;
  education: CVEducation[];
  experience: CVExperience[];
  /** Specific technical and soft skills mentioned in the CV. */
  skills: string[];
  /** Quantified achievements, awards, publications. */
  achievements: string[];
  /** Spoken / written languages and proficiency levels. */
  languages: string[];
  certifications: string[];
}

// ---------------------------------------------------------------------------
// Result returned to callers
// ---------------------------------------------------------------------------

export interface CVDataResult {
  /** Structured parsed representation of the CV. */
  profile: CVProfile;
  /**
   * Form-ready answer values keyed by FIELD_META keys.
   * Empty-string values are omitted so callers can safely spread into answers
   * without clobbering existing user edits.
   */
  prefilledAnswers: Record<string, string>;
  /** Number of answer fields that were successfully populated. */
  count: number;
}

// ---------------------------------------------------------------------------
// Fields that cannot be derived from a CV — never passed to the model.
// ---------------------------------------------------------------------------
const NON_EXTRACTABLE = new Set([
  "output_language",
  "goal",
  "destination",
  "target_word_count",
  "word_limit",
  "length_limit",
  "prompt_text",
  "essay_prompt",
  "motivation",
  "company_motivation",
  "why_this_degree",
  "why_australia",
  "why_this_programme",
  "financial_or_personal_context",
  "future_plans",
  "document_type",
  "purpose",
  "source_text_vi",
]);

// ---------------------------------------------------------------------------
// System prompt — cached; describes both output shapes.
// ---------------------------------------------------------------------------
const SYSTEM = `\
You are a CV parser. Given a CV or résumé, return a single JSON object with two top-level keys:

"profile" — a structured representation of the candidate:
{
  "full_name":      string | null,
  "email":          string | null,
  "phone":          string | null,
  "current_title":  string | null,   // e.g. "Final-year Computer Science student at HUST"
  "education": [
    {
      "institution": string,
      "degree":      string,          // e.g. "Bachelor of Engineering"
      "field":       string,          // e.g. "Software Engineering"
      "gpa":         string | null,   // preserve exact notation, e.g. "3.72/4.0"
      "honours":     string | null,   // e.g. "Distinction", "Cum Laude"
      "start":       string | null,   // "2020"
      "end":         string | null    // "2024" or "Present"
    }
  ],
  "experience": [
    {
      "title":        string,
      "organisation": string,
      "start":        string | null,
      "end":          string | null,
      "description":  string | null   // 1–3 sentences: responsibilities + impact
    }
  ],
  "skills":          string[],        // specific tools, languages, frameworks, soft skills
  "achievements":    string[],        // awards, publications, rankings, quantified results
  "languages":       string[],        // spoken/written, e.g. ["Vietnamese (native)", "English (C1)"]
  "certifications":  string[]
}

"answers" — form-field values derived from the profile. Each key is a form field
name; the value is a ready-to-use string (1–4 sentences unless the field is a
single value). Omit a key entirely if there is no evidence for it in the CV.
Do not invent information. Do not include motivation, goals, or essay prompts —
those cannot come from a CV.

Rules:
1. Extract only information clearly stated in the CV.
2. Preserve exact numbers: GPA, years, rankings, scores, dates.
3. For multi-item fields (academic_background, work_experience, key_skills, etc.)
   synthesise all relevant profile data into a coherent paragraph or bullet list.
4. Return valid JSON only — no markdown fences, no commentary outside the object.\
`;

// ---------------------------------------------------------------------------
// extractCVData()
// ---------------------------------------------------------------------------

/**
 * Parses a CV/résumé text with Claude Haiku and returns:
 * - a rich structured `CVProfile` (education, experience, skills, …)
 * - `prefilledAnswers` mapped to FIELD_META keys, ready to merge into session
 *   answers without overwriting existing user edits.
 *
 * @param cvText       Raw text of the CV (from pdf-parse / mammoth / plain text).
 * @param targetFields Optional subset of FIELD_META keys to populate.
 *                     When omitted, all extractable keys are attempted.
 */
export async function extractCVData(
  cvText: string,
  targetFields?: string[],
): Promise<CVDataResult> {
  // Determine which answer keys to request
  const allKeys = targetFields ?? Object.keys(FIELD_META);
  const extractable = allKeys.filter((k) => !NON_EXTRACTABLE.has(k));

  // Build the field catalogue so Haiku knows exactly what keys to emit
  const fieldCatalogue = extractable
    .map((key) => {
      const meta = FIELD_META[key];
      const desc = meta
        ? `${meta.label}${meta.hint ? ` (${meta.hint})` : ""}`
        : key;
      return `  "${key}": ${desc}`;
    })
    .join("\n");

  const userMessage =
    `ANSWER FIELDS TO POPULATE (omit any you cannot fill from the CV):\n` +
    `{\n${fieldCatalogue}\n}\n\n` +
    `CV TEXT:\n${cvText}`;

  const response = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 4096,
    system: [
      {
        type: "text",
        text: SYSTEM,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        cache_control: { type: "ephemeral" } as any,
      },
    ],
    messages: [{ role: "user", content: userMessage }],
  });

  const raw = response.content[0];
  if (raw.type !== "text") {
    return emptyResult();
  }

  const clean = raw.text.replace(/^```json?\n?|\n?```$/g, "").trim();

  let parsed: { profile?: unknown; answers?: unknown };
  try {
    parsed = JSON.parse(clean);
  } catch {
    return emptyResult();
  }

  const profile = normaliseProfile(parsed.profile);
  const prefilledAnswers = normaliseAnswers(parsed.answers, extractable);

  return {
    profile,
    prefilledAnswers,
    count: Object.keys(prefilledAnswers).length,
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function emptyResult(): CVDataResult {
  return {
    profile: { education: [], experience: [], skills: [], achievements: [], languages: [], certifications: [] },
    prefilledAnswers: {},
    count: 0,
  };
}

function str(v: unknown): string | undefined {
  return typeof v === "string" && v.trim() ? v.trim() : undefined;
}

function strArr(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.filter((x): x is string => typeof x === "string" && x.trim().length > 0).map((x) => x.trim());
}

function normaliseProfile(raw: unknown): CVProfile {
  if (!raw || typeof raw !== "object") return emptyResult().profile;
  const r = raw as Record<string, unknown>;

  const education: CVEducation[] = Array.isArray(r.education)
    ? r.education
        .filter((e): e is Record<string, unknown> => !!e && typeof e === "object")
        .map((e) => ({
          institution: str(e.institution) ?? "",
          degree:      str(e.degree) ?? "",
          field:       str(e.field) ?? "",
          gpa:         str(e.gpa),
          honours:     str(e.honours),
          start:       str(e.start),
          end:         str(e.end),
        }))
        .filter((e) => e.institution || e.degree)
    : [];

  const experience: CVExperience[] = Array.isArray(r.experience)
    ? r.experience
        .filter((e): e is Record<string, unknown> => !!e && typeof e === "object")
        .map((e) => ({
          title:        str(e.title) ?? "",
          organisation: str(e.organisation) ?? "",
          start:        str(e.start),
          end:          str(e.end),
          description:  str(e.description),
        }))
        .filter((e) => e.title || e.organisation)
    : [];

  return {
    full_name:     str(r.full_name),
    email:         str(r.email),
    phone:         str(r.phone),
    current_title: str(r.current_title),
    education,
    experience,
    skills:         strArr(r.skills),
    achievements:   strArr(r.achievements),
    languages:      strArr(r.languages),
    certifications: strArr(r.certifications),
  };
}

function normaliseAnswers(
  raw: unknown,
  allowed: string[],
): Record<string, string> {
  if (!raw || typeof raw !== "object") return {};
  const allowedSet = new Set(allowed);
  const result: Record<string, string> = {};

  for (const [key, val] of Object.entries(raw as Record<string, unknown>)) {
    if (!allowedSet.has(key)) continue;
    if (typeof val === "string" && val.trim()) {
      result[key] = val.trim();
    }
  }

  return result;
}
