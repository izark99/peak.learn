import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";

import { Badge, Card, EmptyState, buttonStyles } from "@/components/ui";
import { listDecks } from "@/lib/data/decks";
import { requireProfile } from "@/lib/data/profile";
import { languageName } from "@/lib/languages";

export const metadata: Metadata = { title: "Decks" };

export default async function DecksPage() {
  const { userId } = await requireProfile();
  const decks = await listDecks(userId);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Your decks</h1>
          <p className="mt-1 text-sm text-ink-muted">
            {decks.length === 0
              ? "Nothing here yet."
              : `${decks.length} deck${decks.length === 1 ? "" : "s"}`}
          </p>
        </div>
        <Link href="/app/decks/new" className={buttonStyles({ className: "shrink-0" })}>
          <Plus className="size-4" aria-hidden />
          New deck
        </Link>
      </header>

      {decks.length === 0 ? (
        <EmptyState
          title="Create your first deck"
          description="Snap a photo of a menu or page, paste in some text, or add cards by hand."
          action={
            <Link href="/app/decks/new" className={buttonStyles()}>
              New deck
            </Link>
          }
        />
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {decks.map((deck) => (
            <li key={deck.id}>
              <Link href={`/app/decks/${deck.id}`} className="block">
                <Card className="h-full transition-colors hover:border-border-strong">
                  <div className="flex items-start justify-between gap-3">
                    <h2 className="font-medium text-ink">{deck.title}</h2>
                    {deck.dueCount > 0 ? (
                      <Badge tone="accent">{deck.dueCount} due</Badge>
                    ) : null}
                  </div>

                  {deck.description ? (
                    <p className="mt-1 line-clamp-2 text-sm text-ink-muted">
                      {deck.description}
                    </p>
                  ) : null}

                  <p className="mt-4 text-xs text-ink-faint">
                    {deck.cardCount} card{deck.cardCount === 1 ? "" : "s"}
                    {deck.newCount > 0 ? ` · ${deck.newCount} new` : ""} ·{" "}
                    {languageName(deck.target_language)}
                  </p>
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
