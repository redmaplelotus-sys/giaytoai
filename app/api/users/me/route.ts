import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

const SUPPORTED_LOCALES = ["vi", "en"] as const;
type Locale = (typeof SUPPORTED_LOCALES)[number];

export async function PATCH(request: Request) {
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

  const { preferred_lang } = body as Record<string, unknown>;

  if (!SUPPORTED_LOCALES.includes(preferred_lang as Locale)) {
    return NextResponse.json(
      { error: `preferred_lang must be one of: ${SUPPORTED_LOCALES.join(", ")}` },
      { status: 422 },
    );
  }

  const { error } = await supabaseAdmin
    .from("users")
    .update({ locale: preferred_lang as Locale })
    .eq("clerk_id", userId);

  if (error) {
    console.error("[users/me PATCH]", error);
    return NextResponse.json({ error: "Failed to update" }, { status: 500 });
  }

  return NextResponse.json({ preferred_lang });
}
