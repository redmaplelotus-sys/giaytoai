import { auth, currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

const FREE_CREDITS = 2;

export async function POST() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
    [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" ") || null;

  // ON CONFLICT (clerk_id) DO NOTHING — safe to call multiple times.
  // An existing row is left completely untouched, so credits are never reset.
  const { error } = await supabaseAdmin.from("users").upsert(
    {
      clerk_id: userId,
      email,
      full_name: fullName,
      avatar_url: clerkUser.imageUrl ?? null,
      credits_remaining: FREE_CREDITS,
    },
    { onConflict: "clerk_id", ignoreDuplicates: true },
  );

  if (error) {
    console.error("[users/setup]", error);
    return NextResponse.json({ error: "Failed to create user" }, { status: 500 });
  }

  return NextResponse.json({ status: "ok", credits: FREE_CREDITS });
}
