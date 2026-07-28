import type { NextRequest } from "next/server";

import { updateSession } from "@/lib/supabase/session";

/**
 * Runs before every matched request: refreshes the Supabase auth token and
 * keeps unauthenticated users out of /app.
 *
 * Next 16 renamed this file convention from `middleware` to `proxy`, and the
 * exported function has to be named to match.
 */
export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Everything except static assets and image files — those never carry a
     * session and running the refresh on them wastes a Supabase round trip.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|woff2?)$).*)",
  ],
};
