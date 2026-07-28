import "server-only";

import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/supabase/types";

/**
 * The signed-in user's profile. Every page under /app calls this, so it also
 * doubles as the auth gate — the middleware redirects unauthenticated users,
 * and this catches the gap if a route is ever added outside the matcher.
 */
export async function requireProfile(): Promise<{
  userId: string;
  profile: Profile;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (profile) {
    return { userId: user.id, profile };
  }

  // The handle_new_user trigger normally creates this row. Backfill covers
  // accounts created before the trigger existed.
  const { data: created, error } = await supabase
    .from("profiles")
    .insert({
      id: user.id,
      display_name: user.email?.split("@")[0] ?? "",
    })
    .select()
    .single();

  if (error || !created) {
    throw new Error(`Could not load your profile: ${error?.message ?? "unknown"}`);
  }

  return { userId: user.id, profile: created };
}

/**
 * Advance the daily streak. Called once a study session records progress.
 *
 * Same-day repeats are a no-op; a gap of more than one day restarts at 1.
 * Dates are compared as local calendar days, not timestamps, so studying at
 * 23:58 and again at 00:02 correctly counts as two days.
 */
export async function touchStreak(profile: Profile, today: Date = new Date()) {
  const supabase = await createClient();

  const todayKey = toLocalDateKey(today);
  if (profile.last_studied_on === todayKey) {
    return profile.streak_count;
  }

  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const continued = profile.last_studied_on === toLocalDateKey(yesterday);
  const streak = continued ? profile.streak_count + 1 : 1;

  await supabase
    .from("profiles")
    .update({ streak_count: streak, last_studied_on: todayKey })
    .eq("id", profile.id);

  return streak;
}

function toLocalDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
