/**
 * Supabase browser client singleton for use in Client Components.
 *
 * createBrowserClient from @supabase/ssr automatically handles cookie-based
 * session persistence in the browser. It returns a singleton — safe to call
 * from multiple components without creating duplicate clients.
 */

import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      "Missing required environment variables: " +
        "NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY must be set."
    );
  }

  return createBrowserClient(supabaseUrl, supabaseAnonKey);
}
