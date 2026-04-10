import { auth } from "@clerk/nextjs/server";
import { redirect, notFound } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getSession } from "@/lib/db/sessions";
import { PROMPT_REGISTRY } from "@/lib/prompts/registry";
import { AnswersForm } from "./AnswersForm";

export default async function SessionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  // Resolve clerk_id → internal UUID and fetch session in parallel
  const [userResult, session] = await Promise.all([
    supabaseAdmin
      .from("users")
      .select("id")
      .eq("clerk_id", userId)
      .single(),
    getSession(id).catch(() => null),
  ]);

  if (!session || !userResult.data) notFound();
  if (session.user_id !== userResult.data.id) notFound(); // same response as 404 — don't leak existence

  const slug = session.document_types?.slug as string | undefined;
  if (!slug || !(slug in PROMPT_REGISTRY)) notFound();

  const template = PROMPT_REGISTRY[slug as keyof typeof PROMPT_REGISTRY];

  // Pre-populate word_limit from wizard's target_word_count if not yet set
  const stored = (session.answers ?? {}) as Record<string, unknown>;
  const initialAnswers: Record<string, string> = {};
  for (const [k, v] of Object.entries(stored)) {
    initialAnswers[k] = String(v ?? "");
  }
  if (!initialAnswers.word_limit && initialAnswers.target_word_count) {
    initialAnswers.word_limit = initialAnswers.target_word_count;
  }

  return (
    <AnswersForm
      sessionId={id}
      slug={slug}
      docTypeName={session.document_types?.name_en ?? slug}
      requiredFields={template.requiredFields}
      initialAnswers={initialAnswers}
    />
  );
}
