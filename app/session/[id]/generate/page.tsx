import { auth } from "@clerk/nextjs/server";
import { notFound } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { GenerateView } from "./GenerateView";

export default async function GeneratePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { userId } = await auth();
  if (!userId) notFound();

  const { id: sessionId } = await params;

  // Ownership check — 404 on miss or wrong user
  const { data, error } = await supabaseAdmin
    .from("sessions")
    .select("id, user_id, answers")
    .eq("id", sessionId)
    .single();

  if (error || !data || data.user_id !== userId) notFound();

  const answers = (data.answers ?? {}) as Record<string, unknown>;
  const targetWordCount =
    typeof answers.target_word_count === "number" ? answers.target_word_count : null;

  return <GenerateView sessionId={sessionId} targetWordCount={targetWordCount} />;
}
