"use client";

import { useCallback, useEffect, useState } from "react";
import { Volume2 } from "lucide-react";

import { speak } from "@/lib/speech/tts";
import type { ModeProps } from "@/components/study/types";
import { cn } from "@/lib/utils";

const RATINGS = [
  { rating: 1 as const, label: "Again", hint: "No idea", color: "bg-again" },
  { rating: 2 as const, label: "Hard", hint: "Struggled", color: "bg-hard" },
  { rating: 3 as const, label: "Good", hint: "Got it", color: "bg-good" },
  { rating: 4 as const, label: "Easy", hint: "Instant", color: "bg-easy" },
];

/** Classic flip-and-rate. The learner grades themselves; ratings drive the SRS. */
export function FlashcardMode({ cards, speechLang, onAnswer, onFinish }: ModeProps) {
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);

  const card = cards[index];

  const rate = useCallback(
    (rating: 1 | 2 | 3 | 4) => {
      if (!card) return;
      onAnswer({ cardId: card.id, rating, correct: rating >= 3 });

      if (index + 1 >= cards.length) {
        onFinish();
      } else {
        setIndex((value) => value + 1);
        setFlipped(false);
      }
    },
    [card, cards.length, index, onAnswer, onFinish],
  );

  // Space flips, 1–4 rate. Keyboard is how this mode is actually usable at speed.
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLInputElement) return;

      if (event.code === "Space") {
        event.preventDefault();
        setFlipped((value) => !value);
        return;
      }

      if (flipped && ["1", "2", "3", "4"].includes(event.key)) {
        event.preventDefault();
        rate(Number(event.key) as 1 | 2 | 3 | 4);
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [flipped, rate]);

  if (!card) return null;

  return (
    <div className="space-y-6">
      <div className="flip-scene">
        <button
          type="button"
          onClick={() => setFlipped((value) => !value)}
          aria-label={flipped ? "Show the term" : "Reveal the translation"}
          className="flip-inner relative block h-64 w-full text-left"
          data-flipped={flipped}
        >
          <span className="flip-face absolute inset-0 flex flex-col items-center justify-center rounded-card border border-border bg-surface p-6">
            <span className="text-center text-3xl font-semibold text-ink">
              {card.term}
            </span>
            {card.phonetic ? (
              <span className="mt-2 text-sm text-ink-faint">{card.phonetic}</span>
            ) : null}
            <span className="mt-6 text-xs text-ink-faint">
              Tap or press space to flip
            </span>
          </span>

          <span className="flip-face flip-face-back absolute inset-0 flex flex-col items-center justify-center rounded-card border border-accent/40 bg-surface-2 p-6">
            <span className="text-center text-2xl font-medium text-ink">
              {card.translation || "—"}
            </span>
            {card.example_sentence ? (
              <span className="mt-3 max-w-sm text-center text-sm text-ink-muted italic">
                {card.example_sentence}
              </span>
            ) : null}
          </span>
        </button>
      </div>

      <div className="flex justify-center">
        <button
          type="button"
          onClick={() => speak(card.term, speechLang)}
          className="inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm text-ink-muted transition-colors hover:bg-surface-2 hover:text-ink"
        >
          <Volume2 className="size-4" aria-hidden />
          Hear it
        </button>
      </div>

      {flipped ? (
        <div className="grid grid-cols-4 gap-2">
          {RATINGS.map(({ rating, label, hint, color }) => (
            <button
              key={rating}
              type="button"
              onClick={() => rate(rating)}
              className="rounded-lg border border-border bg-surface px-2 py-3 text-center transition-colors hover:border-border-strong"
            >
              <span className={cn("mx-auto block size-2 rounded-full", color)} aria-hidden />
              <span className="mt-2 block text-sm font-medium text-ink">{label}</span>
              <span className="mt-0.5 block text-xs text-ink-faint">{hint}</span>
            </button>
          ))}
        </div>
      ) : (
        <p className="text-center text-sm text-ink-faint">
          Flip the card to grade yourself.
        </p>
      )}
    </div>
  );
}
