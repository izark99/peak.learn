"use client";

import { useEffect, useId, useMemo, useState } from "react";

import { Button } from "@/components/ui";
import type { ModeProps, StudyCard } from "@/components/study/types";
import { createSeededRandom, shuffle } from "@/lib/study/answer";
import { cn } from "@/lib/utils";

type Tile = {
  key: string;
  cardId: string;
  text: string;
  side: "term" | "translation";
};

/** Only so many tiles fit on screen and stay playable on a phone. */
const ROUND_SIZE = 6;

/**
 * Timed pair matching. A card cleared without a wrong tap counts as Good; one
 * the learner fumbled counts as Hard, so speed-matching can't silently push a
 * shaky card out to a long interval.
 */
export function MatchMode({ cards, onAnswer, onFinish }: ModeProps) {
  // Seeded so the grid doesn't rearrange itself mid-tap on a re-render.
  const seed = useId();

  const round = useMemo<StudyCard[]>(
    () => shuffle(cards, createSeededRandom(`${seed}-round`)).slice(0, ROUND_SIZE),
    [cards, seed],
  );

  const tiles = useMemo<Tile[]>(
    () =>
      shuffle(
        round.flatMap((card) => [
          {
            key: `${card.id}-term`,
            cardId: card.id,
            text: card.term,
            side: "term" as const,
          },
          {
            key: `${card.id}-translation`,
            cardId: card.id,
            text: card.translation || "—",
            side: "translation" as const,
          },
        ]),
        createSeededRandom(`${seed}-tiles`),
      ),
    [round, seed],
  );

  const [selected, setSelected] = useState<Tile | null>(null);
  const [matched, setMatched] = useState<Set<string>>(new Set());
  const [wrongKeys, setWrongKeys] = useState<string[]>([]);
  const [missedCards, setMissedCards] = useState<Set<string>>(new Set());
  const [elapsed, setElapsed] = useState(0);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (done) return;
    const timer = window.setInterval(() => setElapsed((value) => value + 1), 1000);
    return () => window.clearInterval(timer);
  }, [done]);

  const finishRound = (missed: Set<string>) => {
    setDone(true);
    for (const card of round) {
      const fumbled = missed.has(card.id);
      onAnswer({
        cardId: card.id,
        rating: fumbled ? 2 : 3,
        correct: !fumbled,
      });
    }
  };

  const handleTap = (tile: Tile) => {
    if (done || matched.has(tile.cardId) || wrongKeys.length > 0) return;

    if (!selected) {
      setSelected(tile);
      return;
    }

    if (selected.key === tile.key) {
      setSelected(null);
      return;
    }

    if (selected.cardId === tile.cardId && selected.side !== tile.side) {
      const nextMatched = new Set(matched).add(tile.cardId);
      setMatched(nextMatched);
      setSelected(null);

      if (nextMatched.size === round.length) {
        finishRound(missedCards);
      }
      return;
    }

    // Wrong pair: flash both, and remember that this card wasn't clean.
    setMissedCards((prev) => new Set(prev).add(selected.cardId).add(tile.cardId));
    setWrongKeys([selected.key, tile.key]);
    window.setTimeout(() => {
      setWrongKeys([]);
      setSelected(null);
    }, 500);
  };

  if (done) {
    return (
      <div className="space-y-5 text-center">
        <div className="rounded-card border border-border bg-surface p-8">
          <p className="text-4xl font-semibold text-ink">{elapsed}s</p>
          <p className="mt-1 text-sm text-ink-muted">
            {round.length} pairs · {round.length - missedCards.size} matched first try
          </p>
        </div>
        <Button size="lg" className="w-full" onClick={onFinish}>
          Finish
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-sm text-ink-muted">
        <span>
          {matched.size}/{round.length} matched
        </span>
        <span className="tabular-nums">{elapsed}s</span>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {tiles.map((tile) => {
          const isMatched = matched.has(tile.cardId);
          const isSelected = selected?.key === tile.key;
          const isWrong = wrongKeys.includes(tile.key);

          return (
            <button
              key={tile.key}
              type="button"
              onClick={() => handleTap(tile)}
              disabled={isMatched}
              className={cn(
                "flex min-h-20 items-center justify-center rounded-card border p-3 text-center text-sm transition-all",
                isMatched && "border-success/30 bg-success/10 text-success opacity-60",
                isWrong && "border-danger bg-danger/10 text-danger",
                isSelected && "border-accent bg-accent-soft text-accent",
                !isMatched &&
                  !isWrong &&
                  !isSelected &&
                  "border-border bg-surface text-ink hover:border-border-strong",
              )}
            >
              {tile.text}
            </button>
          );
        })}
      </div>

      <p className="text-center text-xs text-ink-faint">
        Tap a term, then its meaning.
      </p>
    </div>
  );
}
