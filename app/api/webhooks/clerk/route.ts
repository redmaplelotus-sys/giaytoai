import { Webhook, WebhookRequiredHeaders } from "svix";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { serverEnv } from "@/lib/server-env";
import { supabaseAdmin } from "@/lib/supabase-admin";

// Clerk sends these three headers on every webhook delivery.
async function verifySignature(body: string): Promise<unknown> {
  const headerStore = await headers();
  const svixHeaders: WebhookRequiredHeaders = {
    "svix-id": headerStore.get("svix-id") ?? "",
    "svix-timestamp": headerStore.get("svix-timestamp") ?? "",
    "svix-signature": headerStore.get("svix-signature") ?? "",
  };

  const wh = new Webhook(serverEnv.clerkWebhookSecret);
  // Throws WebhookVerificationError on bad signature or expired timestamp.
  return wh.verify(body, svixHeaders);
}

type ClerkEmailAddress = { email_address: string; id: string };

interface UserCreatedEvent {
  type: "user.created";
  data: {
    id: string;
    email_addresses: ClerkEmailAddress[];
    primary_email_address_id: string;
    first_name: string | null;
    last_name: string | null;
    image_url: string | null;
  };
}

interface UserUpdatedEvent {
  type: "user.updated";
  data: {
    id: string;
    email_addresses: ClerkEmailAddress[];
    primary_email_address_id: string;
    first_name: string | null;
    last_name: string | null;
    image_url: string | null;
  };
}

interface UserDeletedEvent {
  type: "user.deleted";
  data: { id: string; deleted: true };
}

type ClerkEvent = UserCreatedEvent | UserUpdatedEvent | UserDeletedEvent;

const FREE_CREDITS = 2;

export async function POST(request: Request) {
  const body = await request.text();

  let event: ClerkEvent;
  try {
    event = (await verifySignature(body)) as ClerkEvent;
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  switch (event.type) {
    case "user.created": {
      const { id, email_addresses, primary_email_address_id, first_name, last_name, image_url } = event.data;
      const email = email_addresses.find(
        (e) => e.id === primary_email_address_id,
      )?.email_address;

      if (!email) {
        return NextResponse.json({ error: "No primary email" }, { status: 422 });
      }

      const fullName =
        [first_name, last_name].filter(Boolean).join(" ") || null;

      const { error } = await supabaseAdmin.from("users").upsert(
        {
          clerk_id: id,
          email,
          full_name: fullName,
          avatar_url: image_url,
          credits_remaining: FREE_CREDITS,
        },
        { onConflict: "clerk_id", ignoreDuplicates: true },
      );

      if (error) {
        console.error("[clerk webhook] user.created", error);
        return NextResponse.json({ error: "DB error" }, { status: 500 });
      }
      break;
    }

    case "user.updated": {
      const { id, email_addresses, primary_email_address_id, first_name, last_name, image_url } = event.data;
      const email = email_addresses.find(
        (e) => e.id === primary_email_address_id,
      )?.email_address;

      const fullName =
        [first_name, last_name].filter(Boolean).join(" ") || null;

      const { error } = await supabaseAdmin
        .from("users")
        .update({
          ...(email && { email }),
          full_name: fullName,
          avatar_url: image_url,
        })
        .eq("clerk_id", id);

      if (error) {
        console.error("[clerk webhook] user.updated", error);
        return NextResponse.json({ error: "DB error" }, { status: 500 });
      }
      break;
    }

    case "user.deleted": {
      const { error } = await supabaseAdmin
        .from("users")
        .delete()
        .eq("clerk_id", event.data.id);

      if (error) {
        console.error("[clerk webhook] user.deleted", error);
        return NextResponse.json({ error: "DB error" }, { status: 500 });
      }
      break;
    }
  }

  return NextResponse.json({ received: true });
}
