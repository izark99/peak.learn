"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireProfile } from "@/lib/data/profile";
import { createClient } from "@/lib/supabase/server";

export type ClassState = { error: string } | { notice: string } | null;

/**
 * Join codes avoid O/0 and I/1/L — students type these off a whiteboard, and
 * an ambiguous character turns into a support request.
 */
const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const CODE_LENGTH = 6;

function generateJoinCode(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(CODE_LENGTH));
  return Array.from(bytes, (byte) => CODE_ALPHABET[byte % CODE_ALPHABET.length]).join(
    "",
  );
}

export async function createClass(
  _prev: ClassState,
  formData: FormData,
): Promise<ClassState> {
  const { userId, profile } = await requireProfile();
  const supabase = await createClient();

  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "Give the class a name." };

  // join_code is unique; collisions are rare but retry rather than fail.
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const joinCode = generateJoinCode();

    const { data, error } = await supabase
      .from("classes")
      .insert({
        teacher_id: userId,
        name: name.slice(0, 120),
        description: String(formData.get("description") ?? "").trim(),
        target_language: String(
          formData.get("target_language") ?? profile.target_language,
        ),
        join_code: joinCode,
      })
      .select("id")
      .single();

    if (data) {
      // The teacher is a member of their own class so roster queries and
      // assignment lists work the same for both roles.
      await supabase
        .from("class_members")
        .insert({ class_id: data.id, user_id: userId, role: "teacher" });

      revalidatePath("/app/classes");
      redirect(`/app/classes/${data.id}`);
    }

    // 23505 is a unique-constraint violation — try another code.
    if (error && error.code !== "23505") {
      return { error: error.message };
    }
  }

  return { error: "Could not allocate a join code. Please try again." };
}

export async function joinClass(
  _prev: ClassState,
  formData: FormData,
): Promise<ClassState> {
  await requireProfile();
  const supabase = await createClient();

  const code = String(formData.get("join_code") ?? "")
    .trim()
    .toUpperCase();

  if (code.length !== CODE_LENGTH) {
    return { error: `Join codes are ${CODE_LENGTH} characters.` };
  }

  // A student can't read the classes table before joining, so resolving the
  // code and creating the membership both happen inside one definer function.
  // Re-joining a class you're already in is a no-op there, so it lands on the
  // class page rather than erroring.
  const { data: classId, error } = await supabase.rpc("join_class_by_code", {
    p_join_code: code,
  });

  if (error) return { error: error.message };
  if (!classId) return { error: "No class matches that code." };

  revalidatePath("/app/classes");
  redirect(`/app/classes/${classId}`);
}

export async function assignDeck(
  _prev: ClassState,
  formData: FormData,
): Promise<ClassState> {
  await requireProfile();
  const supabase = await createClient();

  const classId = String(formData.get("class_id") ?? "");
  const deckId = String(formData.get("deck_id") ?? "");
  if (!classId || !deckId) return { error: "Pick a deck to assign." };

  const dueAtRaw = String(formData.get("due_at") ?? "").trim();

  const { error } = await supabase.from("class_assignments").insert({
    class_id: classId,
    deck_id: deckId,
    title: String(formData.get("title") ?? "").trim(),
    due_at: dueAtRaw ? new Date(dueAtRaw).toISOString() : null,
  });

  // RLS restricts inserts to the class teacher, so this is the permission
  // check as well as the error path.
  if (error) return { error: error.message };

  // Assigned decks become visible to the class through the deck_shared_with_user
  // policy, which only applies to decks marked 'class'.
  await supabase.from("decks").update({ visibility: "class" }).eq("id", deckId);

  revalidatePath(`/app/classes/${classId}`);
  return { notice: "Deck assigned." };
}

export async function leaveClass(formData: FormData) {
  const { userId } = await requireProfile();
  const supabase = await createClient();

  const classId = String(formData.get("class_id") ?? "");
  if (!classId) return;

  await supabase
    .from("class_members")
    .delete()
    .eq("class_id", classId)
    .eq("user_id", userId);

  revalidatePath("/app/classes");
  redirect("/app/classes");
}

export async function removeStudent(formData: FormData) {
  await requireProfile();
  const supabase = await createClient();

  const classId = String(formData.get("class_id") ?? "");
  const studentId = String(formData.get("student_id") ?? "");
  if (!classId || !studentId) return;

  await supabase
    .from("class_members")
    .delete()
    .eq("class_id", classId)
    .eq("user_id", studentId);

  revalidatePath(`/app/classes/${classId}`);
}
