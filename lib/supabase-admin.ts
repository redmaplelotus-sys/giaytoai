import { createClient } from "@supabase/supabase-js";
import { clientEnv, serverEnv } from "@/lib/env";

/**
 * Service-role admin client — bypasses RLS entirely.
 * ONLY import this in Route Handlers, Server Actions, and server components.
 * It must never be bundled into the client; serverEnv will throw if it is.
 */
export const supabaseAdmin = createClient(
  clientEnv.supabaseUrl,
  serverEnv.supabaseServiceRoleKey,
  { auth: { persistSession: false } },
);
