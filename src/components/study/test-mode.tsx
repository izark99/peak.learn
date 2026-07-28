"use client";

import { useId, useMemo, useState } from "react";

import { Button, Input } from "@/components/ui";
import type { ModeProps, StudyCard } from "@/components/study/types";
import {
  buildChoices,
  createSeededRandom,
  isAnswerCorrect,
  shuffle,
} from "@/lib/study/answer";
import { cn } from "@/lib/utils";

type Question =
  | { kind: "choice"; card: StudyCard; options: string[] }
  | { kind: "typed"; card: StudyCard }
  | { kind: "boolean"; card: StudyCard; shown: string; isTrue: boolean };

/**
 * A graded quiz: mixed question types, no feedback until the end. Answers are
 * held locally and only written to the scheduler once the paper is submitted,
 * so a mid-test bail-out doesn't half-grade the deck.
 */
export function TestMode({ cards, onAnswer, onFinish }: ModeProps) {
  // A stable per-instance seed. The paper is built during render, so it has to
  // be idempotent — Math.random would reshuffle the questions under the
  // learner's cursor on any incidental re-render.
  const seed = useId();

  const questions = useMemo<Question[]>(() => {
    const random = createSeededRandom(seed);
    const others = (card: StudyCard) => cards.filter((entry) => entry.id !== card.id);

    return shuffle(cards, random).map((card, index) => {
      const pool = others(card).map((entry) => entry.translation);

      if (index % 3 === 0) {
        return {
          kind: "choice",
          card,
          options: buildChoices({
            correct: card.translation,
            pool,
            confusables: card.confusables,
            random,
          }),
        };
      }

      if (index % 3 === 1) {
        return { kind: "typed", card };
      }

      // Half of the true/false questions show a deliberately wrong pairing.
      const isTrue = random() < 0.5;
      const wrong = pool.length > 0 ? shuffle(pool, random)[0] : `${card.translation}?`;
      return {
        kind: "boolean",
        card,
        shown: isTrue ? card.translation : wrong,
        isTrue,
      };
    });
  }, [cards, seed]);

  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [graded, setGraded] = useState<null | {
    correct: number;
    results: Array<{ card: StudyCard; correct: boolean; given: string }>;
  }>(null);

  const setAnswer = (cardId: string, value: string) =>
    setAnswers((prev) => ({ ...prev, [cardId]: value }));

  const submit = () => {
    const results = questions.map((question) => {
      const given = answers[question.card.id] ?? "";
      let correct = false;

      if (question.kind === "boolean") {
        correct = given === String(question.isTrue);
      } else {
        correct = isAnswerCorrect(given, question.card.translation, [
          ...question.card.synonyms,
        ]);
      }

      return { card: question.card, correct, given };
    });

    for (const result of results) {
      onAnswer({
        cardId: result.card.id,
        rating: result.correct ? 3 : 1,
        correct: result.correct,
      });
    }

    setGraded({
      correct: results.filter((result) => result.correct).length,
      results,
    });
  };

  if (graded) {
    return (
      <div className="space-y-5">
        <div className="rounded-card border border-border bg-surface p-6 text-center">
          <p className="text-3xl font-semibold text-ink">
            {graded.correct}/{graded.results.length}
          </p>
          <p className="mt-1 text-sm text-ink-muted">
            {Math.round((graded.correct / graded.results.length) * 100)}% correct
          </p>
        </div>

        <ul className="divide-y divide-border overflow-hidden rounded-card border border-border bg-surface">
          {graded.results.map(({ card, correct, given }) => (
            <li key={card.id} className="flex items-start gap-3 p-3 text-sm">
              <span aria-hidden className={correct ? "text-success" : "text-danger"}>
                {correct ? "✓" : "✗"}
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-medium text-ink">{card.term}</p>
                <p className="text-ink-muted">{card.translation}</p>
                {!correct ? (
                  <p className="text-xs text-ink-faint">
                    You answered: {given || "(blank)"}
                  </p>
                ) : null}
              </div>
            </li>
          ))}
        </ul>

        <Button size="lg" className="w-full" onClick={onFinish}>
          Finish
        </Button>
      </div>
    );
  }

  const answeredCount = questions.filter(
    (question) => (answers[question.card.id] ?? "") !== "",
  ).length;

  return (
    <div className="space-y-4">
      {questions.map((question, index) => (
        <div
          key={question.card.id}
          className="rounded-card border border-border bg-surface p-4"
        >
          <p className="text-xs text-ink-faint">Question {index + 1}</p>

          {question.kind === "choice" ? (
            <>
              <p className="mt-1 text-lg font-medium text-ink">
                {question.card.term}
              </p>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {question.options.map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setAnswer(question.card.id, option)}
                    className={cn(
                      "rounded-lg border px-3 py-2 text-left text-sm transition-colors",
                      answers[question.card.id] === option
                        ? "border-accent bg-accent-soft text-accent"
                        : "border-border bg-surface-2 text-ink hover:border-border-strong",
                    )}
                  >
                    {option || "—"}
                  </button>
                ))}
              </div>
            </>
          ) : null}

          {question.kind === "typed" ? (
            <>
              <p className="mt-1 text-lg font-medium text-ink">
                {question.card.term}
              </p>
              <Input
                className="mt-3"
                value={answers[question.card.id] ?? ""}
                onChange={(event) => setAnswer(question.card.id, event.target.value)}
                placeholder="Type the meaning"
                autoComplete="off"
              />
            </>
          ) : null}

          {question.kind === "boolean" ? (
            <>
              <p className="mt-1 text-sm text-ink-muted">
                <span className="text-lg font-medium text-ink">
                  {question.card.term}
                </span>{" "}
                means &ldquo;{question.shown}&rdquo;
              </p>
              <div className="mt-3 flex gap-2">
                {["true", "false"].map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setAnswer(question.card.id, value)}
                    className={cn(
                      "flex-1 rounded-lg border px-3 py-2 text-sm capitalize transition-colors",
                      answers[question.card.id] === value
                        ? "border-accent bg-accent-soft text-accent"
                        : "border-border bg-surface-2 text-ink hover:border-border-strong",
                    )}
                  >
                    {value}
                  </button>
                ))}
              </div>
            </>
          ) : null}
        </div>
      ))}

      <div className="sticky bottom-4">
        <Button size="lg" className="w-full shadow-lg" onClick={submit}>
          Submit ({answeredCount}/{questions.length} answered)
        </Button>
      </div>
    </div>
  );
}
