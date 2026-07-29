import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Trash2 } from "lucide-react";

import { deleteCard, deleteDeck } from "@/app/app/decks/actions";
import { AddCardForm } from "@/app/app/decks/[id]/add-card-form";
import { Badge, Button, Card, buttonStyles } from "@/components/ui";
import { STUDY_MODES } from "@/lib/study/modes";
import { getDeckWithCards } from "@/lib/data/decks";
import { requireProfile } from "@/lib/data/profile";
import { languageName } from "@/lib/languages";

export const metadata: Metadata = { title: "Deck" };

export default async function DeckPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { userId } = await requireProfile();

  const result = await getDeckWithCards(id);
  if (!result) notFound();

  const { deck, cards } = result;
  const isOwner = deck.owner_id === userId;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight">{deck.title}</h1>
          <p className="mt-1 text-sm text-ink-muted">
            {cards.length} card{cards.length === 1 ? "" : "s"} ·{" "}
            {languageName(deck.source_language)} → {languageName(deck.target_language)}
          </p>
          {deck.description ? (
            <p className="mt-2 max-w-prose text-sm text-ink-muted">{deck.description}</p>
          ) : null}
        </div>

        {isOwner ? (
          <form action={deleteDeck}>
            <input type="hidden" name="deck_id" value={deck.id} />
            <Button type="submit" variant="danger" size="sm">
              Delete deck
            </Button>
          </form>
        ) : null}
      </header>

      {cards.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border px-4 py-6 text-center text-sm text-ink-muted">
          This deck has no cards yet. Add one below to start studying.
        </p>
      ) : (
        <section>
          <h2 className="mb-2 text-sm font-medium text-ink-muted">Study</h2>
          <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-5">
            {STUDY_MODES.map((mode) => (
              <Link
                key={mode.id}
                href={`/app/decks/${deck.id}/study/${mode.id}`}
                className="rounded-card border border-border bg-surface p-3 transition-colors hover:border-accent"
              >
                <span className="block text-sm font-medium text-ink">{mode.label}</span>
                <span className="mt-0.5 block text-xs text-ink-muted">
                  {mode.blurb}
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 className="mb-2 text-sm font-medium text-ink-muted">Cards</h2>
        <ul className="divide-y divide-border overflow-hidden rounded-card border border-border bg-surface">
          {cards.map((card) => (
            <li key={card.id} className="flex items-start gap-3 p-4">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline gap-2">
                  <span className="font-medium text-ink">{card.term}</span>
                  {card.phonetic ? (
                    <span className="text-xs text-ink-faint">{card.phonetic}</span>
                  ) : null}
                  {card.part_of_speech ? (
                    <Badge>{card.part_of_speech}</Badge>
                  ) : null}
                </div>
                <p className="mt-0.5 text-sm text-ink-muted">{card.translation}</p>
                {card.example_sentence ? (
                  <p className="mt-1 text-sm text-ink-faint italic">
                    {card.example_sentence}
                  </p>
                ) : null}
              </div>

              {isOwner ? (
                <form action={deleteCard}>
                  <input type="hidden" name="card_id" value={card.id} />
                  <input type="hidden" name="deck_id" value={deck.id} />
                  <button
                    type="submit"
                    aria-label={`Delete ${card.term}`}
                    className="rounded-md p-1.5 text-ink-faint transition-colors hover:bg-surface-2 hover:text-danger"
                  >
                    <Trash2 className="size-4" aria-hidden />
                  </button>
                </form>
              ) : null}
            </li>
          ))}

          {cards.length === 0 ? (
            <li className="p-4 text-sm text-ink-faint">No cards yet.</li>
          ) : null}
        </ul>
      </section>

      {isOwner ? (
        <section>
          <h2 className="mb-2 text-sm font-medium text-ink-muted">Add a card</h2>
          <Card>
            <AddCardForm deckId={deck.id} />
          </Card>
        </section>
      ) : (
        <p className="text-sm text-ink-faint">
          This deck belongs to someone else, so it is read-only.{" "}
          <Link href="/app/decks" className={buttonStyles({ variant: "ghost", size: "sm" })}>
            Back to your decks
          </Link>
        </p>
      )}
    </div>
  );
}
