"use client";

import { useTA } from "@/lib/i18n";
import type { DocTypeSlug } from "@/lib/prompts/registry";

// ---------------------------------------------------------------------------
// Sample excerpts — one per slug, used only for the blurred preview.
// Intentionally generic so they work for any applicant's context.
// ---------------------------------------------------------------------------

const SAMPLE_EXCERPTS: Record<DocTypeSlug, string> = {
  "personal-statement-au": `Growing up in Hà Nội, I watched my mother navigate a healthcare system stretched beyond its limits. It was in those quiet hospital corridors — helping translate for patients who could not speak for themselves — that I first understood the profound intersection of language, empathy, and medicine. That understanding has shaped every academic choice I have made since.

My undergraduate thesis examined how community health workers in rural Việt Nam adapt clinical guidelines to local knowledge systems. The research required eighteen months of fieldwork across three provinces and produced findings that were subsequently cited in two WHO reports on low-resource primary care.`,

  "personal-statement-us": `The summer I turned sixteen, I dismantled every clock in our apartment. My parents were less than pleased. But in those gears and springs I found something unexpected: not just how things work, but why we build them in the first place. That question has driven every intellectual pursuit since — from competitive mathematics to the computational linguistics research I conducted last year at the university's natural language processing lab.

I applied for a grant to study tonal ambiguity in Vietnamese-English machine translation. The grant was declined. I ran the study anyway, using university computing credits and three months of weekends.`,

  "personal-statement-uk": `My fascination with molecular biology began not in a laboratory but in a rice field on the outskirts of Cần Thơ, watching my grandmother test soil pH with strips of paper folded in her apron pocket. The precision of that act — empirical knowledge applied with quiet confidence to lived experience — is what I want to bring to research.

Since then I have pursued that precision through a degree in biochemistry, a summer placement at the Institute for Genomics and Integrative Biology in New Delhi, and an independent literature review on CRISPR interference mechanisms that my supervisor submitted to BioRxiv on my behalf.`,

  "cover-letter": `Dear Hiring Manager,

I am writing to express my strong interest in the Software Engineer position. With three years of experience building scalable web applications and a track record of leading cross-functional teams through complex technical challenges, I am confident I can contribute meaningfully from day one.

In my current role at a fintech startup, I reduced API response times by 40% through query optimisation and introduced a testing culture that brought code coverage from 34% to 87% within two quarters. I am particularly drawn to your company's work on distributed systems and would welcome the opportunity to bring that same rigour to your engineering organisation.`,

  "motivation-letter": `It is the tension between what we know and what remains unknown that has guided every significant decision in my academic career. My undergraduate research in applied linguistics revealed a gap in our understanding of how code-switching affects cognitive load in bilingual learners — a gap I am determined to address through doctoral study.

Your department's work on multilingual cognition, particularly Professor Chen's longitudinal studies of heritage language acquisition, represents the most rigorous ongoing inquiry into the questions that have occupied me for the past four years. I am applying not simply because your programme is excellent, but because the specific intellectual community you have built is the one in which my research can be most productive.`,

  "scholarship-essay": `When the factory where my father had worked for twenty years closed in 2019, our family faced a choice familiar to many in our province: adapt or fall behind. I chose to adapt — and to become the first in my family to pursue university education abroad.

That decision did not come without cost. I deferred my enrolment for a year to help stabilise our household finances, teaching English to secondary students in the evenings while working mornings at a logistics company. Those months taught me more about resilience and resource management than any coursework has since. They also clarified my purpose: I intend to return with the skills to build the kind of economic infrastructure my community needs.`,

  "translation-prep": `SOCIALIST REPUBLIC OF VIETNAM
Ministry of Education and Training

CERTIFICATE OF GRADUATION

This is to certify that the individual named herein has successfully completed all curriculum requirements of the degree programme and is entitled to all rights and privileges pertaining thereto.

[OFFICIAL ROUND SEAL]

Issued in accordance with Decision No. [DECISION NUMBER] of the Ministry of Education and Training.

Rector: [RECTOR SIGNATURE]
[INSTITUTION NAME]`,

  "reference-letter": `To Whom It May Concern,

It is with great pleasure and without reservation that I recommend the applicant for admission to the Master of Public Health programme. In twelve years of teaching and mentoring graduate students, I have rarely encountered a researcher who combines intellectual rigour with the practical empathy this individual brings to every project.

During the two years she worked as my research assistant, she co-authored two peer-reviewed articles, managed a field study involving over four hundred participants across two provinces, and mentored three junior students whose work she guided with a patience and clarity well beyond her years. I recommend her in the strongest possible terms.`,
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface DocTypePreviewCardProps {
  slug: DocTypeSlug;
}

export function DocTypePreviewCard({ slug }: DocTypePreviewCardProps) {
  const m = useTA();
  const { name, description } = m.documentTypes[slug];
  const excerpt = SAMPLE_EXCERPTS[slug];

  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-5 space-y-3 dark:border-neutral-800 dark:bg-neutral-950">
      {/* Slug badge */}
      <span className="inline-block rounded-full bg-neutral-100 px-2.5 py-0.5 text-xs font-medium text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400">
        {slug}
      </span>

      {/* Name + description */}
      <div className="space-y-1">
        <h3 className="text-base font-semibold leading-snug">{name}</h3>
        <p className="text-sm text-neutral-500 leading-relaxed">{description}</p>
      </div>

      {/* Blurred sample excerpt */}
      <div className="relative overflow-hidden rounded-lg bg-neutral-50 px-4 pt-4 pb-0 dark:bg-neutral-900">
        <p className="text-xs leading-relaxed text-neutral-600 dark:text-neutral-400 whitespace-pre-line select-none pointer-events-none">
          {excerpt}
        </p>

        {/* Gradient fade — bottom two-thirds become unreadable */}
        <div
          aria-hidden="true"
          className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-neutral-50 to-transparent dark:from-neutral-900"
        />

        {/* Blur layer — sits on top of the gradient */}
        <div
          aria-hidden="true"
          className="absolute inset-x-0 bottom-0 h-16 backdrop-blur-[2px]"
          style={{
            maskImage: "linear-gradient(to top, black 40%, transparent 100%)",
            WebkitMaskImage:
              "linear-gradient(to top, black 40%, transparent 100%)",
          }}
        />

        {/* "Sample preview" label */}
        <div className="relative z-10 flex justify-center py-3">
          <span className="text-xs text-neutral-400 dark:text-neutral-600">
            sample preview
          </span>
        </div>
      </div>
    </div>
  );
}
