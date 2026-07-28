"use client";

import { useMemo, useState } from "react";

import { Button, Input } from "@/components/ui";
import type { ModeProps, StudyCard } from "@/components/study/types";
import { buildChoices, isAnswerCorrect, isNearMiss } from "@/lib/study/answer";
import { cn } from "@/lib/utils";

type Phase = "choice" | "typed";

/**
 * Adaptive recall: every card is first shown as multiple choice, and once the
 * learner picks it correctly the same card comes back as free typing. Only the
 * typed round retires the card, so recognition alone isn't mistaken for recall.
 */
export function LearnMode({ cards, onAnswer, onFinish }: ModeProps) {
  const [queue, setQueue] = useState<Array<{ card: StudyCard; phase: Phase }>>(() =>
    cards.map((card) => ({ card, phase: "choice" as Phase })),
  );
  const [response, setResponse] = useState("");
  const [feedback, setFeedback] = useState<
    { correct: boolean; message: string } | null
  >(null);

  const current = queue[0];

  const choices = useMemo(() => {
    if (!current || current.phase !== "choice") return [];
    return buildChoices({
      correct: current.card.translation,
      pool: cards
        .filter((card) => card.id !== current.card.id)
        .map((card) => card.translation),
      confusables: current.card.confusables,
    });
  }, [cards, current]);

  if (!current) return null;

  const advance = (correct: boolean) => {
    const [head, ...rest] = queue;

    if (!correct) {
      // Missed cards go three places back so they return within this session
      // rather than at the very end.
      const reinsertAt = Math.min(3, rest.length);
      setQueue([
        ...rest.slice(0, reinsertAt),
        { card: head.card, phase: "choice" },
        ...rest.slice(reinsertAt),
      ]);
      return;
    }

    if (head.phase === "choice") {
      // Recognised it — now make them produce it.
      setQueue([...rest, { card: head.card, phase: "typed" }]);
      return;
    }

    if (rest.length === 0) {
      onFinish();
      return;
    }
    setQueue(rest);
  };

  const handleChoice = (choice: string) => {
    if (feedback) return;

    const correct = isAnswerCorrect(choice, current.card.translation);
    setFeedback({
      correct,
      message: correct ? "Correct" : `Answer: ${current.card.translation}`,
    });

    // The choice round doesn't grade the card — only the typed round does,
    // so a lucky guess can't inflate the schedule.
    window.setTimeout(() => {
      setFeedback(null);
      advance(correct);
    }, correct ? 500 : 1600);
  };

  const handleTyped = (event: React.FormEvent) => {
    event.preventDefault();
    if (feedback) return;

    const correct = isAnswerCorrect(response, current.card.translation, [
      ...current.card.synonyms,
    ]);
    const near = !correct && isNearMiss(response, current.card.translation);

    setFeedback({
      correct,
      message: correct
        ? "Correct"
        : near
          ? `So close — it's "${current.card.translation}"`
          : `Answer: ${current.card.translation}`,
    });

    onAnswer({
      cardId: current.card.id,
      rating: correct ? 3 : 1,
      correct,
    });

    window.setTimeout(
      () => {
        setFeedback(null);
        setResponse("");
        advance(correct);
      },
      correct ? 600 : 1800,
    );
  };

  return (
    <div className="space-y-6">
      <div className="rounded-card border border-border bg-surface p-6 text-center">
        <p className="text-xs uppercase tracking-wide text-ink-faint">
          {current.phase === "choice" ? "Pick the meaning" : "Type the meaning"}
        </p>
        <p className="mt-3 text-3xl font-semibold text-ink">{current.card.term}</p>
        {current.card.phonetic ? (
          <p className="mt-1 text-sm text-ink-faint">{current.card.phonetic}</p>
        ) : null}
      </div>

      {current.phase === "choice" ? (
        <div className="grid gap-2 sm:grid-cols-2">
          {choices.map((choice) => (
            <button
              key={choice}
              type="button"
              onClick={() => handleChoice(choice)}
              disabled={Boolean(feedback)}
              className="rounded-lg border border-border bg-surface px-4 py-3 text-left text-sm text-ink transition-colors hover:border-accent disabled:opacity-60"
            >
              {choice || "—"}
            </button>
          ))}
        </div>
      ) : (
        <form onSubmit={handleTyped} className="space-y-3">
          <Input
            value={response}
            onChange={(event) => setResponse(event.target.value)}
            placeholder="What does it mean?"
            autoFocus
            autoComplete="off"
            disabled={Boolean(feedback)}
          />
          <Button type="submit" size="lg" className="w-full" disabled={Boolean(feedback)}>
            Check
          </Button>
        </form>
      )}

      {feedback ? (
        <p
          role="status"
          className={cn(
            "rounded-lg px-3 py-2 text-center text-sm",
            feedback.correct
              ? "bg-success/10 text-success"
              : "bg-danger/10 text-danger",
          )}
        >
          {feedback.message}
        </p>
      ) : null}

      <p className="text-center text-xs text-ink-faint">
        {queue.length} card{queue.length === 1 ? "" : "s"} left in this round
      </p>
    </div>
  );
}
