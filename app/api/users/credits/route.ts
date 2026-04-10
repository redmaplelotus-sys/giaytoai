import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabaseAdmin
    .from("users")
    .select("credits_remaining, plan")
    .eq("clerk_id", userId)
    .single();

  if (error || !data) {
    return NextResponse.json({ credits_remaining: 0, plan: "free" });
  }

  return NextResponse.json({
    credits_remaining: data.credits_remaining,
    plan: data.plan,
  });
}
