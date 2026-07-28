"use server";

import { revalidatePath } from "next/cache";

import { generateExercises } from "@/lib/ai";
import { AiError } from "@/lib/ai/client";
import { requireProfile } from "@/lib/data/profile";
import { createClient } from "@/lib/supabase/server";

export type GrammarState = { error: string } | { notice: string } | null;

/**
 * Build a fresh set of exercises from a deck's vocabulary. Replaces the
 * previous set for that deck so the practice list doesn't grow without bound.
 */
export async function buildExercises(
  _prev: GrammarState,
  formData: FormData,
): Promise<GrammarState> {
  const { userId, profile } = await requireProfile();
  const supabase = await createClient();

  const deckId = String(formData.get("deck_id") ?? "");
  if (!deckId) return { error: "Choose a deck first." };

  const { data: deck } = await supabase
    .from("decks")
    .select("id, target_language")
    .eq("id", deckId)
    .maybeSingle();

  if (!deck) return { error: "That deck could not be found." };

  const { data: cards } = await supabase
    .from("cards")
    .select("term")
    .eq("deck_id", deckId)
    .limit(40);

  if (!cards || cards.length === 0) {
    return { error: "That deck has no cards to build exercises from." };
  }

  try {
    const outcome = await generateExercises({
      terms: cards.map((card) => card.term),
      targetLanguage: deck.target_language,
      nativeLanguage: profile.native_language,
      count: 8,
    });

    await supabase
      .from("grammar_exercises")
      .delete()
      .eq("owner_id", userId)
      .eq("deck_id", deckId);

    const { error } = await supabase.from("grammar_exercises").insert(
      outcome.data.exercises.map((exercise) => ({
        owner_id: userId,
        deck_id: deckId,
        kind: exercise.kind,
        prompt: exercise.prompt,
        answer: exercise.answer,
        accepted_answers: exercise.accepted_answers,
        tokens: exercise.tokens,
        hint: exercise.hint,
        target_language: deck.target_language,
      })),
    );

    if (error) return { error: error.message };

    await supabase.from("ai_generations").insert({
      user_id: userId,
      kind: "grammar",
      input_summary: `${cards.length} terms`,
      model: outcome.model,
      input_tokens: outcome.inputTokens,
      output_tokens: outcome.outputTokens,
    });
  } catch (error) {
    return {
      error:
        error instanceof AiError ? error.message : "Could not build exercises.",
    };
  }

  revalidatePath("/app/grammar");
  return { notice: "Exercises ready." };
}

/** Log one attempt. Used for progress, and to surface repeated weak spots. */
export async function recordAttempt({
  exerciseId,
  response,
  isCorrect,
}: {
  exerciseId: string;
  response: string;
  isCorrect: boolean;
}) {
  const { userId } = await requireProfile();
  const supabase = await createClient();

  await supabase.from("grammar_attempts").insert({
    user_id: userId,
    exercise_id: exerciseId,
    response: response.slice(0, 500),
    is_correct: isCorrect,
  });
}
