import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabaseAdmin
    .from("users")
    .select("clerk_id, email, credits_remaining, plan")
    .eq("clerk_id", userId)
    .single();

  return NextResponse.json({ clerkUserId: userId, dbRow: data, dbError: error?.message });
}
