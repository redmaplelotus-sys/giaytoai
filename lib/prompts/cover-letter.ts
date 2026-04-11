// Detailed cover letter prompt supporting EN, KO, and ZH output languages.
// The output_language variable selects the language-specific format block below.
// Store in prompt_versions (document_type slug: cover-letter, version 1).

export const COVER_LETTER_TEMPLATE = `\
Write a cover letter for the applicant below. Output language: {{output_language}}.

---
TARGET ROLE: {{target_role}}
TARGET COMPANY: {{target_company}}
OUTPUT LANGUAGE: {{output_language}}  (EN = English | KO = Korean | ZH = Simplified Chinese)
WORD / CHARACTER LIMIT: {{length_limit}}
---

APPLICANT PROFILE
Name: {{full_name}}
Current title / background: {{current_background}}
Relevant experience: {{relevant_experience}}
Key skills: {{key_skills}}
Specific achievement to highlight: {{highlight_achievement}}
Motivation for this role: {{motivation}}
Motivation for this company specifically: {{company_motivation}}

---

LANGUAGE-SPECIFIC FORMAT AND CONVENTIONS
Apply the block that matches {{output_language}}. Ignore the other two blocks.

### EN (English)
Structure: four paragraphs — opening hook, experience evidence, company-specific fit, call to action.
Opening: one sentence that names the role and delivers the strongest reason to keep reading. Do not begin with "I am writing to apply for…" or "My name is…".
Tone: confident, specific, professional. Active voice throughout.
Length: hit {{length_limit}} words ±10. If no limit given, target 300–350 words.
Forbidden: "I am a hardworking and dedicated individual", "team player", "fast learner", "passionate about", "to whom it may concern".
Salutation: "Dear [Hiring Manager's name]," if a name was provided, otherwise "Dear Hiring Team,".
Sign-off: "Sincerely," followed by the applicant's full name.

### KO (Korean — 자기소개서 style)
Korean cover letters for corporate roles follow the 자기소개서 (self-introduction letter) convention, not the Western one-page letter format.

Required sections (write as prose with clear section headings in Korean):
1. 성장 과정 (Background and upbringing) — brief, 2–3 sentences, focused on character formation relevant to professional life
2. 지원 동기 (Motivation for applying) — why this company and role specifically; name a concrete company value, product, or initiative
3. 직무 역량 (Job-relevant competencies) — evidence-backed skills; use the STAR format implicitly (situation → task → action → result) without labelling it
4. 입사 후 포부 (Goals after joining) — specific, achievable goals for the first 1–2 years; connect to the company's stated direction

Tone: formal (합쇼체 / -ㅂ니다 / -습니다 endings). No casual speech. Humble register, but not self-deprecating — avoid "부족하지만" (though I am lacking) and "열심히 하겠습니다" as a standalone promise.
Length: {{length_limit}} characters if specified, otherwise 600–800 Korean characters per section (total ~2,400–3,200 characters).
Accuracy: every stated fact (GPA, 학점, competition rank, certificate name, award) must match the applicant's input exactly. Do not round, approximate, or translate loosely.
Salutation and sign-off: omit — Korean 자기소개서 does not use letter salutations.

### ZH (Simplified Chinese — 求职信 style)
Structure: formal letter format — date line, recipient block, body (3–4 paragraphs), closing.
Paragraph order:
1. 自我介绍 (Self-introduction) — current role/background and purpose of the letter in 2–3 sentences
2. 岗位匹配 (Role fit) — connect specific experience and skills to the job requirements using concrete evidence
3. 对公司的了解 (Company knowledge) — name a specific product, initiative, value, or recent development; demonstrate genuine research
4. 期望与展望 (Expectations and outlook) — career goal and what the applicant will contribute in the first year

Tone: formal, respectful (您 for the reader). No contractions. Avoid overly flowery language — modern Chinese business writing prefers clarity.
Length: {{length_limit}} characters if specified, otherwise 500–700 Chinese characters.
Accuracy: every factual claim must match input exactly — GPA (学分绩点), competition name, award title, institution name. If Chinese translations of Vietnamese institution names are provided, use them; otherwise keep the Vietnamese name and add (越南) in parentheses.
Salutation: 尊敬的[职位/姓名]：
Sign-off: 此致 / 敬礼 followed by applicant name and date.

---

RULES THAT APPLY TO ALL LANGUAGES
- Never invent a company value, product name, department, or initiative not mentioned in the applicant's input. If {{company_motivation}} is vague, ask for clarification in notes rather than fabricating specifics.
- Never use placeholder text in body (e.g. "[Company Name]") — use the actual name provided or flag it in notes.
- Active voice. Remove filler: "in order to", "I would like to", "it is worth noting that".
- The highlight achievement ({{highlight_achievement}}) must appear in the body. Do not bury it.

---
\
`;

export const coverLetterBlock = {
  template: COVER_LETTER_TEMPLATE,
  requiredFields: [
    "full_name",
    "output_language",
    "target_role",
    "target_company",
    "length_limit",
    "current_background",
    "relevant_experience",
    "key_skills",
    "highlight_achievement",
    "motivation",
    "company_motivation",
  ],
};
