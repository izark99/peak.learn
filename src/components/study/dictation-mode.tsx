"use client";

import { useCallback, useEffect, useState } from "react";
import { Volume2 } from "lucide-react";

import { Button, Input } from "@/components/ui";
import type { ModeProps } from "@/components/study/types";
import { isAnswerCorrect, isNearMiss } from "@/lib/study/answer";
import { speak } from "@/lib/speech/tts";
import { useSpeechSynthesisSupport } from "@/lib/speech/use-support";
import { cn } from "@/lib/utils";

/**
 * The term is spoken, never shown — the learner types what they hear. Trains
 * the sound-to-spelling link that reading-only study skips entirely.
 */
export function DictationMode({ cards, speechLang, onAnswer, onFinish }: ModeProps) {
  const [index, setIndex] = useState(0);
  const [response, setResponse] = useState("");
  const [feedback, setFeedback] = useState<
    { correct: boolean; message: string } | null
  >(null);
  const supported = useSpeechSynthesisSupport();

  const card = cards[index];

  const play = useCallback(() => {
    if (card) void speak(card.term, speechLang);
  }, [card, speechLang]);

  // Speak each new card as it comes up.
  useEffect(() => {
    if (supported) play();
  }, [play, supported]);

  if (!card) return null;

  if (!supported) {
    return (
      <div className="rounded-card border border-warning/30 bg-warning/10 p-6 text-center">
        <p className="text-sm text-warning">
          This browser has no speech synthesis, so dictation can&apos;t play audio.
          Chrome, Edge and Safari all support it.
        </p>
      </div>
    );
  }

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (feedback) return;

    const correct = isAnswerCorrect(response, card.term);
    const near = !correct && isNearMiss(response, card.term);

    setFeedback({
      correct,
      message: correct
        ? card.translation ? `Correct — ${card.translation}` : "Correct"
        : near
          ? `Almost — it's "${card.term}"`
          : `It was "${card.term}"`,
    });

    onAnswer({
      cardId: card.id,
      // A near miss is a spelling slip rather than a memory failure, so it
      // earns Hard instead of Again.
      rating: correct ? 3 : near ? 2 : 1,
      correct,
    });

    window.setTimeout(
      () => {
        setFeedback(null);
        setResponse("");
        if (index + 1 >= cards.length) {
          onFinish();
        } else {
          setIndex((value) => value + 1);
        }
      },
      correct ? 700 : 2000,
    );
  };

  return (
    <div className="space-y-6">
      <div className="rounded-card border border-border bg-surface p-8 text-center">
        <button
          type="button"
          onClick={play}
          className="mx-auto flex size-16 items-center justify-center rounded-full bg-accent text-white transition-colors hover:bg-accent-hover"
          aria-label="Play the word again"
        >
          <Volume2 className="size-7" aria-hidden />
        </button>
        <p className="mt-4 text-sm text-ink-muted">Type what you hear</p>
      </div>

      <form onSubmit={submit} className="space-y-3">
        <Input
          value={response}
          onChange={(event) => setResponse(event.target.value)}
          autoFocus
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          disabled={Boolean(feedback)}
          placeholder="…"
          className="text-center text-lg"
        />
        <Button type="submit" size="lg" className="w-full" disabled={Boolean(feedback)}>
          Check
        </Button>
      </form>

      {feedback ? (
        <p
          role="status"
          className={cn(
            "rounded-lg px-3 py-2 text-center text-sm",
            feedback.correct ? "bg-success/10 text-success" : "bg-danger/10 text-danger",
          )}
        >
          {feedback.message}
        </p>
      ) : null}
    </div>
  );
}
