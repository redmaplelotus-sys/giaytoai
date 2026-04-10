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
      { error: `Invalid output_language. Must be one of: ${OUTPUT_LANGUAGE_CODES.join(", ")}` },
      { status: 422 },
    );
  }

  // Resolve slug → document_type row
  const { data: docType, error: dtError } = await supabaseAdmin
    .from("document_types")
    .select("id, name_en")
    .eq("slug", slug)
    .single();

  if (dtError || !docType) {
    return NextResponse.json({ error: "Document type not found" }, { status: 404 });
  }

  // Resolve clerk_id → internal user UUID
  const { data: user, error: userError } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", userId)
    .single();

  if (userError || !user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const session = await createSession(user.id, docType.id);
  await saveAnswers(session.id, answers);

  return NextResponse.json({ id: session.id }, { status: 201 });
}
