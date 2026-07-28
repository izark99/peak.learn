"use server";

import { revalidatePath } from "next/cache";

import { requireProfile, touchStreak } from "@/lib/data/profile";
import {
  initialCard,
  schedule,
  type CardState,
  type Rating,
  type SchedulerCard,
} from "@/lib/srs/scheduler";
import { createClient } from "@/lib/supabase/server";

/**
 * Record one answer and advance the card's spaced-repetition state.
 *
 * The scheduler itself is pure; this is the only place its output is written,
 * so every mode funnels through the same maths.
 */
export async function submitReview({
  cardId,
  rating,
  mode = "flashcards",
}: {
  cardId: string;
  rating: Rating;
  mode?: string;
}): Promise<{ dueAt: string; intervalDays: number } | { error: string }> {
  const { userId } = await requireProfile();
  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("review_states")
    .select("*")
    .eq("user_id", userId)
    .eq("card_id", cardId)
    .maybeSingle();

  const now = new Date();

  const current: SchedulerCard = existing
    ? {
        state: existing.state as CardState,
        easeFactor: existing.ease_factor,
        intervalDays: existing.interval_days,
        repetitions: existing.repetitions,
        lapses: existing.lapses,
        learningStep: existing.learning_step,
        dueAt: new Date(existing.due_at),
      }
    : initialCard(now);

  const next = schedule(current, rating, now);

  const { error } = await supabase.from("review_states").upsert(
    {
      user_id: userId,
      card_id: cardId,
      state: next.state,
      ease_factor: next.easeFactor,
      interval_days: next.intervalDays,
      repetitions: next.repetitions,
      lapses: next.lapses,
      learning_step: next.learningStep,
      due_at: next.dueAt.toISOString(),
      last_reviewed_at: now.toISOString(),
    },
    { onConflict: "user_id,card_id" },
  );

  if (error) return { error: error.message };

  await supabase.from("review_logs").insert({
    user_id: userId,
    card_id: cardId,
    rating,
    previous_interval: current.intervalDays,
    new_interval: next.intervalDays,
    mode,
    reviewed_at: now.toISOString(),
  });

  return { dueAt: next.dueAt.toISOString(), intervalDays: next.intervalDays };
}

/**
 * Close out a session: store the summary row and move the streak along.
 * Called once when the user finishes or leaves a session.
 */
export async function finishStudySession({
  deckId,
  mode,
  cardsStudied,
  correctCount,
  startedAt,
}: {
  deckId: string | null;
  mode: string;
  cardsStudied: number;
  correctCount: number;
  startedAt: string;
}) {
  const { userId, profile } = await requireProfile();

  // Nothing worth recording — don't inflate the streak for an opened-and-closed
  // session.
  if (cardsStudied === 0) return { streak: profile.streak_count };

  const supabase = await createClient();

  await supabase.from("study_sessions").insert({
    user_id: userId,
    deck_id: deckId,
    mode,
    cards_studied: cardsStudied,
    correct_count: correctCount,
    started_at: startedAt,
    ended_at: new Date().toISOString(),
  });

  if (deckId) {
    await recordAssignmentProgress({
      userId,
      deckId,
      cardsStudied,
      correctCount,
    });
  }

  const streak = await touchStreak(profile);

  revalidatePath("/app");
  revalidatePath("/app/decks");
  return { streak };
}

/**
 * Mirror a study session into assignment_progress for any class assignment
 * covering this deck.
 *
 * Teachers can't read a student's review_states — those are private under RLS —
 * so progress can't be derived on the teacher's side. The student writes this
 * row themselves as they study, which is the only path that respects the
 * privacy boundary.
 */
async function recordAssignmentProgress({
  userId,
  deckId,
  cardsStudied,
  correctCount,
}: {
  userId: string;
  deckId: string;
  cardsStudied: number;
  correctCount: number;
}) {
  const supabase = await createClient();

  // RLS returns only assignments in classes this user belongs to.
  const { data: assignments } = await supabase
    .from("class_assignments")
    .select("id")
    .eq("deck_id", deckId);

  if (!assignments || assignments.length === 0) return;

  for (const assignment of assignments) {
    const { data: existing } = await supabase
      .from("assignment_progress")
      .select("cards_completed, accuracy")
      .eq("assignment_id", assignment.id)
      .eq("user_id", userId)
      .maybeSingle();

    const priorCards = existing?.cards_completed ?? 0;
    const totalCards = priorCards + cardsStudied;

    // Running accuracy over every card the student has answered for this
    // assignment, not just the latest session.
    const priorCorrect = Math.round((existing?.accuracy ?? 0) * priorCards);
    const accuracy = totalCards === 0 ? 0 : (priorCorrect + correctCount) / totalCards;

    await supabase.from("assignment_progress").upsert(
      {
        assignment_id: assignment.id,
        user_id: userId,
        cards_completed: totalCards,
        accuracy: Math.min(1, Math.max(0, accuracy)),
      },
      { onConflict: "assignment_id,user_id" },
    );
  }
}
