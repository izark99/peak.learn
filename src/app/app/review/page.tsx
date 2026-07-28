import type { Metadata } from "next";
import Link from "next/link";

import { StudySession } from "@/components/study/session";
import { EmptyState, buttonStyles } from "@/components/ui";
import { requireProfile } from "@/lib/data/profile";
import { loadDueQueue } from "@/lib/data/study";
import { speechCode } from "@/lib/languages";

export const metadata: Metadata = { title: "Review" };

/**
 * The cross-deck due queue — the "just tell me what to study" entry point,
 * and where the spaced repetition schedule actually pays off.
 */
export default async function ReviewPage() {
  const { userId, profile } = await requireProfile();
  const cards = await loadDueQueue({ userId });

  if (cards.length === 0) {
    return (
      <div className="space-y-6">
        <header>
          <h1 className="text-2xl font-semibold tracking-tight">Review</h1>
        </header>
        <EmptyState
          title="Nothing due right now"
          description="You're all caught up. New cards become due as their intervals elapse — study a deck to add more to the schedule."
          action={
            <Link href="/app/decks" className={buttonStyles()}>
              Go to decks
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <StudySession
      deckId={null}
      title={`Review · ${cards.length} due`}
      mode="flashcards"
      cards={cards}
      speechLang={speechCode(profile.target_language)}
      exitHref="/app"
    />
  );
}
