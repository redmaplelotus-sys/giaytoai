import { createClient } from "@supabase/supabase-js";
import { clientEnv } from "@/lib/env";

/**
 * Public anon client — safe for Server Components, Client Components,
 * and Route Handlers. Respects RLS; no elevated privileges.
 */
export const supabaseAnon = createClient(
  clientEnv.supabaseUrl,
  clientEnv.supabaseAnonKey,
);

/**
 * Creates a user-scoped client by forwarding the caller's JWT.
 * RLS policies using current_user_id() will resolve to this user.
 * Call with the token from Clerk's getToken({ template: "supabase" }).
 */
export function getSupabaseForUser(token: string) {
  return createClient(clientEnv.supabaseUrl, clientEnv.supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false },
  });
}
