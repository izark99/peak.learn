"use server";

import { revalidatePath } from "next/cache";

import { requireProfile } from "@/lib/data/profile";
import { getLanguage } from "@/lib/languages";
import { createClient } from "@/lib/supabase/server";

export type SettingsState = { error: string } | { notice: string } | null;

export async function updateProfile(
  _prev: SettingsState,
  formData: FormData,
): Promise<SettingsState> {
  const { userId } = await requireProfile();
  const supabase = await createClient();

  const nativeLanguage = String(formData.get("native_language") ?? "");
  const targetLanguage = String(formData.get("target_language") ?? "");

  // Reject codes that aren't in the picker — an unknown code would break
  // speech synthesis and show a raw code in the UI.
  if (!getLanguage(nativeLanguage) || !getLanguage(targetLanguage)) {
    return { error: "Pick a language from the list." };
  }
  if (nativeLanguage === targetLanguage) {
    return { error: "Your languages need to be different." };
  }

  const dailyGoal = Number(formData.get("daily_goal") ?? 20);
  if (!Number.isFinite(dailyGoal) || dailyGoal < 5 || dailyGoal > 500) {
    return { error: "Set a daily goal between 5 and 500 cards." };
  }

  const { error } = await supabase
    .from("profiles")
    .update({
      display_name: String(formData.get("display_name") ?? "").trim().slice(0, 80),
      native_language: nativeLanguage,
      target_language: targetLanguage,
      daily_goal: Math.round(dailyGoal),
    })
    .eq("id", userId);

  if (error) return { error: error.message };

  revalidatePath("/app", "layout");
  return { notice: "Saved." };
}
