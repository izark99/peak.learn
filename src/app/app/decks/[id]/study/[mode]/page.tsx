import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { StudySession } from "@/components/study/session";
import { getDeckWithCards } from "@/lib/data/decks";
import { requireProfile } from "@/lib/data/profile";
import { loadDeckQueue } from "@/lib/data/study";
import { speechCode } from "@/lib/languages";
import { isStudyMode, studyModeLabel } from "@/lib/study/modes";

export const metadata: Metadata = { title: "Study" };

export default async function StudyPage({
  params,
}: {
  params: Promise<{ id: string; mode: string }>;
}) {
  const { id, mode } = await params;
  if (!isStudyMode(mode)) notFound();

  const { userId } = await requireProfile();

  const deck = await getDeckWithCards(id);
  if (!deck) notFound();

  const cards = await loadDeckQueue({ userId, deckId: id, mode });

  return (
    <StudySession
      deckId={id}
      title={`${deck.deck.title} · ${studyModeLabel(mode)}`}
      mode={mode}
      cards={cards}
      speechLang={speechCode(deck.deck.target_language)}
      exitHref={`/app/decks/${id}`}
    />
  );
}
