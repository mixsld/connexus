/**
 * Supabase server-side client factory for Next.js App Router.
 *
 * Creates a new SupabaseClient per request using @supabase/ssr's
 * createServerClient with the Next.js `cookies()` adapter.
 *
 * Rules:
 * - Always create a new client per request — never share across requests.
 * - `setAll` is intentionally omitted in Route Handlers and Server Components
 *   because they cannot write response cookies directly. A middleware should
 *   handle session refresh writes if needed.
 * - Uses `getAll` (not the deprecated `get`) per @supabase/ssr v0.x guidance.
 *
 * Requirement: 10.6 — auth validation via Supabase session token.
 */

import { createServerClient as createSupabaseServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Create a Supabase client configured for server-side use in Route Handlers
 * and Server Components.
 *
 * Reads SUPABASE_URL and SUPABASE_ANON_KEY from environment variables.
 * Throws at runtime if either variable is missing.
 */
export async function createServerClient() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      "Missing required environment variables: SUPABASE_URL and SUPABASE_ANON_KEY must be set."
    );
  }

  const cookieStore = await cookies();

  return createSupabaseServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      // setAll is omitted: Route Handlers cannot write response cookies directly.
      // Configure a Next.js middleware to handle session refresh cookie writes.
    },
  });
}
