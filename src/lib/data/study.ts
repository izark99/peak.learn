import "server-only";

import type { StudyCard } from "@/components/study/types";
import { createClient } from "@/lib/supabase/server";
import type { StudyMode } from "@/lib/study/modes";

/** How many cards a session serves, per mode. */
const SESSION_SIZE: Record<StudyMode, number> = {
  flashcards: 20,
  learn: 12,
  dictation: 15,
  test: 10,
  match: 6,
};

type CardRow = {
  id: string;
  term: string;
  translation: string;
  phonetic: string;
  example_sentence: string;
  synonyms: string[];
  confusables: string[];
};

function toStudyCard(row: CardRow): StudyCard {
  return {
    id: row.id,
    term: row.term,
    translation: row.translation,
    phonetic: row.phonetic,
    example_sentence: row.example_sentence,
    synonyms: row.synonyms ?? [],
    confusables: row.confusables ?? [],
  };
}

const CARD_COLUMNS =
  "id, term, translation, phonetic, example_sentence, synonyms, confusables";

/**
 * Order a deck for study: cards that are due first (most overdue leading),
 * then cards never seen, then everything else.
 *
 * Serving overdue material before new material is what keeps a backlog from
 * growing — the opposite order buries the review queue under fresh cards.
 */
export async function loadDeckQueue({
  userId,
  deckId,
  mode,
}: {
  userId: string;
  deckId: string;
  mode: StudyMode;
}): Promise<StudyCard[]> {
  const supabase = await createClient();

  const { data: cards } = await supabase
    .from("cards")
    .select(CARD_COLUMNS)
    .eq("deck_id", deckId)
    .order("position", { ascending: true });

  if (!cards || cards.length === 0) return [];

  const { data: states } = await supabase
    .from("review_states")
    .select("card_id, due_at")
    .eq("user_id", userId)
    .in(
      "card_id",
      cards.map((card) => card.id),
    );

  const dueByCard = new Map(
    (states ?? []).map((state) => [state.card_id, new Date(state.due_at).getTime()]),
  );
  const now = Date.now();

  const ranked = [...cards].sort((a, b) => {
    const aDue = dueByCard.get(a.id);
    const bDue = dueByCard.get(b.id);

    // Bucket 0: due now. Bucket 1: never studied. Bucket 2: scheduled ahead.
    const bucket = (due: number | undefined) =>
      due === undefined ? 1 : due <= now ? 0 : 2;

    const bucketDiff = bucket(aDue) - bucket(bDue);
    if (bucketDiff !== 0) return bucketDiff;

    // Within the due bucket, most overdue first.
    if (aDue !== undefined && bDue !== undefined) return aDue - bDue;
    return 0;
  });

  return ranked.slice(0, SESSION_SIZE[mode]).map(toStudyCard);
}

/**
 * Every card across all of the user's decks that is due now, most overdue
 * first. This is the cross-deck review queue.
 */
export async function loadDueQueue({
  userId,
  limit = 30,
}: {
  userId: string;
  limit?: number;
}): Promise<StudyCard[]> {
  const supabase = await createClient();

  const { data: states } = await supabase
    .from("review_states")
    .select("card_id")
    .eq("user_id", userId)
    .lte("due_at", new Date().toISOString())
    .order("due_at", { ascending: true })
    .limit(limit);

  if (!states || states.length === 0) return [];

  const cardIds = states.map((state) => state.card_id);
  const { data: cards } = await supabase
    .from("cards")
    .select(CARD_COLUMNS)
    .in("id", cardIds);

  if (!cards) return [];

  // Restore the due-date ordering the id lookup discarded.
  const byId = new Map(cards.map((card) => [card.id, card]));
  return cardIds
    .map((id) => byId.get(id))
    .filter((card): card is CardRow => Boolean(card))
    .map(toStudyCard);
}

/** All due timestamps for the user, used by the dashboard forecast. */
export async function loadDueSchedule(userId: string): Promise<string[]> {
  const supabase = await createClient();

  const { data } = await supabase
    .from("review_states")
    .select("due_at")
    .eq("user_id", userId);

  return (data ?? []).map((row) => row.due_at);
}
