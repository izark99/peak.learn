import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { Card, Deck } from "@/lib/supabase/types";

export type DeckSummary = Deck & {
  cardCount: number;
  dueCount: number;
  newCount: number;
};

/**
 * Decks owned by the user, with per-deck study counts.
 *
 * Counts are assembled from two flat queries rather than a per-deck subquery
 * so the page cost stays constant as the deck list grows.
 */
export async function listDecks(userId: string): Promise<DeckSummary[]> {
  const supabase = await createClient();

  const { data: decks } = await supabase
    .from("decks")
    .select("*")
    .eq("owner_id", userId)
    .order("updated_at", { ascending: false });

  if (!decks || decks.length === 0) return [];

  const deckIds = decks.map((deck) => deck.id);

  const { data: cards } = await supabase
    .from("cards")
    .select("id, deck_id")
    .in("deck_id", deckIds);

  const cardIds = (cards ?? []).map((card) => card.id);

  // Only cards this user has actually seen have a review_states row; anything
  // without one is still "new".
  const { data: states } = cardIds.length
    ? await supabase
        .from("review_states")
        .select("card_id, due_at")
        .eq("user_id", userId)
        .in("card_id", cardIds)
    : { data: [] };

  const now = Date.now();
  const dueByCard = new Map(
    (states ?? []).map((state) => [state.card_id, new Date(state.due_at).getTime()]),
  );

  const totals = new Map<string, { cards: number; due: number; fresh: number }>();
  for (const deck of decks) {
    totals.set(deck.id, { cards: 0, due: 0, fresh: 0 });
  }

  for (const card of cards ?? []) {
    const bucket = totals.get(card.deck_id);
    if (!bucket) continue;

    bucket.cards += 1;
    const dueAt = dueByCard.get(card.id);
    if (dueAt === undefined) {
      bucket.fresh += 1;
    } else if (dueAt <= now) {
      bucket.due += 1;
    }
  }

  return decks.map((deck) => {
    const bucket = totals.get(deck.id) ?? { cards: 0, due: 0, fresh: 0 };
    return {
      ...deck,
      cardCount: bucket.cards,
      dueCount: bucket.due,
      newCount: bucket.fresh,
    };
  });
}

/** A deck and its cards in display order, or null if not readable. */
export async function getDeckWithCards(
  deckId: string,
): Promise<{ deck: Deck; cards: Card[] } | null> {
  const supabase = await createClient();

  const { data: deck } = await supabase
    .from("decks")
    .select("*")
    .eq("id", deckId)
    .maybeSingle();

  if (!deck) return null;

  const { data: cards } = await supabase
    .from("cards")
    .select("*")
    .eq("deck_id", deckId)
    .order("position", { ascending: true });

  return { deck, cards: cards ?? [] };
}
