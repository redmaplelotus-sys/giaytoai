import { auth, currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

const FREE_CREDITS = 2;

export async function POST() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Check if user already exists to make this endpoint idempotent.
  const { data: existing } = await supabaseAdmin
    .from("users")
    .select("clerk_id")
    .eq("clerk_id", userId)
    .single();

  if (existing) {
    return NextResponse.json({ status: "exists" });
  }

  const clerkUser = await currentUser();
  if (!clerkUser) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const email = clerkUser.emailAddresses[0]?.emailAddress;
  if (!email) {
    return NextResponse.json({ error: "No email address" }, { status: 422 });
  }

  const fullName =
    [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" ") ||
    null;

  const { error } = await supabaseAdmin.from("users").insert({
    clerk_id: userId,
    email,
    full_name: fullName,
    avatar_url: clerkUser.imageUrl ?? null,
    credits_remaining: FREE_CREDITS,
  });

  if (error) {
    console.error("[users/setup]", error);
    return NextResponse.json({ error: "Failed to create user" }, { status: 500 });
  }

  return NextResponse.json({ status: "created", credits: FREE_CREDITS });
}
