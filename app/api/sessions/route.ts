import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { createSession, saveAnswers } from "@/lib/db/sessions";
import { PROMPT_REGISTRY, type DocTypeSlug } from "@/lib/prompts/registry";
import { OUTPUT_LANGUAGE_CODES } from "@/lib/prompts/compile";

const DOC_TYPE_SLUGS = Object.keys(PROMPT_REGISTRY) as DocTypeSlug[];

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { slug, answers } = body as {
    slug: unknown;
    answers: Record<string, unknown>;
  };

  if (!DOC_TYPE_SLUGS.includes(slug as DocTypeSlug)) {
    return NextResponse.json(
      { error: `Invalid slug. Must be one of: ${DOC_TYPE_SLUGS.join(", ")}` },
      { status: 422 },
    );
  }

  const outputLang = String(answers?.output_language ?? "en");
  if (!OUTPUT_LANGUAGE_CODES.includes(outputLang as never)) {
    return NextResponse.json(
      {
        error: `Invalid output_language. Must be one of: ${OUTPUT_LANGUAGE_CODES.join(", ")}`,
      },
      { status: 422 },
    );
  }

  // Resolve doc type and user in parallel
  const [docTypeResult, userResult] = await Promise.all([
    supabaseAdmin
      .from("document_types")
      .select("id")
      .eq("slug", slug)
      .single(),
    supabaseAdmin
      .from("users")
      .select("id, credits_remaining, plan")
      .eq("clerk_id", userId)
      .single(),
  ]);

  if (docTypeResult.error || !docTypeResult.data) {
    return NextResponse.json({ error: "Document type not found" }, { status: 404 });
  }

  if (userResult.error || !userResult.data) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const { id: documentTypeId } = docTypeResult.data;
  const { id: internalUserId, credits_remaining, plan } = userResult.data;

  // Credit gate — unlimited plan bypasses the check
  if (plan !== "unlimited" && credits_remaining <= 0) {
    return NextResponse.json({ error: "no_credits" }, { status: 402 });
  }

  const session = await createSession(internalUserId, documentTypeId);
  await saveAnswers(session.id, answers);

  return NextResponse.json({ id: session.id }, { status: 201 });
}
