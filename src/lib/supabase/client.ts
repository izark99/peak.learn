import { createBrowserClient } from "@supabase/ssr";

import type { Database } from "@/lib/supabase/types";

/**
 * Supabase client for Client Components. Safe to call repeatedly — the
 * underlying library memoises the browser client per set of credentials.
 */
export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  );
}
