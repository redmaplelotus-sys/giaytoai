// Detailed prompt template for Australian personal statements.
// Overrides the short registry entry when a full-quality generation is needed.
// Store this string in prompt_versions.user_prompt_template (document_type slug:
// personal-statement-au, version 1).

export const PERSONAL_STATEMENT_AU_TEMPLATE = `\
Write an Australian university personal statement for the applicant below.

---
TARGET UNIVERSITY: {{target_university}}
DEGREE / PROGRAM: {{target_degree}}
WORD LIMIT: {{word_limit}} words (hard limit — do not exceed; stay within 5 words under)
---

APPLICANT PROFILE
Name: {{full_name}}
Academic background: {{academic_background}}
Key achievements (academic, extracurricular, professional): {{achievements}}
Work or volunteer experience: {{work_experience}}
Why this degree: {{why_this_degree}}
Why Australia / why this university specifically: {{why_australia}}
Long-term career goal: {{career_goal}}

---

WORD COUNT RULE
The final body must hit exactly {{word_limit}} words, ±5. Count every word in the body field before returning. If you are over, cut; if under, expand a concrete detail. Never pad with filler. Return the exact count in word_count.

---

REQUIRED SECTION ORDER
Write the body in exactly this order. Do not add section headings — the sections must flow as continuous prose.

1. OPENING (10–15% of word limit)
   Open with the applicant's single most compelling achievement, moment, or insight. This must be concrete and specific. Do not introduce yourself by name or degree. Do not use a rhetorical question.

2. ACADEMIC FOUNDATION (20–25%)
   Establish the academic background relevant to the degree. Mention specific subjects, results, or projects. Frame as evidence of readiness, not as a list of grades.

3. PRACTICAL EXPERIENCE (20–25%)
   Describe work, volunteer, or extracurricular experience that connects to the degree. Quantify impact where possible (number of people, outcomes, scale). Show initiative, not just participation.

4. MOTIVATION FOR THIS DEGREE AND UNIVERSITY (20–25%)
   Explain why this specific degree at this specific university. Reference a course, professor, research group, industry partnership, or program feature by name if the applicant provided one. Generic "world-class facilities" language is not acceptable — every claim must be tied to a named detail.

5. CAREER GOAL (15–20%)
   State the concrete career outcome. Connect it directly to the Australian context: graduate employment pathways, industry presence in Australia, or post-study work visa opportunities if relevant. Close with a forward-looking sentence that does not begin with "In conclusion."

---

FORBIDDEN PHRASES (do not use any of the following, verbatim or paraphrased)
- "Ever since I was young / a child / little"
- "I have always been passionate / interested / fascinated"
- "I am passionate about"
- "I believe that [field] is important"
- "I was lucky / fortunate / blessed to"
- "I would like to" (use "I will" or "I aim to")
- "Thank you for considering"
- "In conclusion" / "To conclude" / "In summary"
- "I am a hardworking and dedicated individual"
- "This scholarship / opportunity will change my life"
- Any phrasing that attributes the applicant's achievements to luck, family, or circumstances rather than their own effort and decisions

---

DESTINATION-SPECIFIC NOTES (apply silently — do not mention these in the body)

UAC / VTAC CONTEXT
Australian undergraduate admissions decisions are primarily ATAR-driven. The personal statement is used for tie-breaking, bonus point schemes (UAC Educational Access Schemes, VTAC Special Entry Access Scheme), and some direct-entry or portfolio-based programs. Write to demonstrate the applicant's fit and readiness, not to repeat what is already in their academic record.

INSTITUTION QUIRKS
- University of Melbourne: Prefers subject-specific intellectual engagement over personal narrative. If target_university is Melbourne, weight section 2 (Academic Foundation) to 30% and reduce section 1 (Opening) to 8%.
- Monash University: Values industry connection and practical outcomes. Weight section 3 (Practical Experience) to 30%.
- ANU: Research culture is prominent. If the degree has a research component, mention a specific ANU research group, school, or academic by name if the applicant provided one.
- UNSW / UTS: Both have strong industry partnership programs (e.g. UNSW Co-op, UTS Cooperative Scholarship). If the applicant mentions these, name them explicitly.
- University of Queensland: Frequently asks about community contribution in Queensland or Australian society. Tie career goals to tangible community or industry impact in Australia.
- If target_university is not one of the above, apply the default section weights.

INTERNATIONAL STUDENT CONTEXT
The applicant is Vietnamese. Australian admissions officers are familiar with Vietnamese school systems (Bằng Tốt Nghiệp THPT, university entrance scores). It is not necessary to explain the Vietnamese education system. Do not translate Vietnamese institution names — use the official Vietnamese name followed by the English translation in parentheses on first mention only.

---
\
`;

export const personalStatementAuBlock = {
  template: PERSONAL_STATEMENT_AU_TEMPLATE,
  requiredFields: [
    "full_name",
    "target_university",
    "target_degree",
    "word_limit",
    "academic_background",
    "achievements",
    "work_experience",
    "why_this_degree",
    "why_australia",
    "career_goal",
  ],
};
