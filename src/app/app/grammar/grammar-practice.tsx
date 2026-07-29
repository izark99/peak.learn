"use client";

import { useState } from "react";

import { recordAttempt } from "@/app/app/grammar/actions";
import { Button, Card, Input, Progress } from "@/components/ui";
import { isAnswerCorrect, isNearMiss } from "@/lib/study/answer";
import { cn } from "@/lib/utils";

export type Exercise = {
  id: string;
  kind: string;
  prompt: string;
  answer: string;
  accepted_answers: string[];
  tokens: string[];
  hint: string;
};

/**
 * Runs a set of grammar exercises. `translate` and `fill_blank` are typed;
 * `word_order` is built by tapping tokens into place.
 */
export function GrammarPractice({ exercises }: { exercises: Exercise[] }) {
  const [index, setIndex] = useState(0);
  const [typed, setTyped] = useState("");
  const [assembled, setAssembled] = useState<string[]>([]);
  const [feedback, setFeedback] = useState<
    { correct: boolean; message: string } | null
  >(null);
  const [correctCount, setCorrectCount] = useState(0);
  const [showHint, setShowHint] = useState(false);

  const exercise = exercises[index];
  const isLast = index + 1 >= exercises.length;
  const done = index >= exercises.length;

  if (done) {
    return (
      <div className="py-12 text-center">
        <p className="text-4xl" aria-hidden>
          {correctCount === exercises.length ? "🏅" : "📘"}
        </p>
        <h2 className="mt-4 text-xl font-semibold">Practice complete</h2>
        <p className="mt-1 text-sm text-ink-muted">
          {correctCount} of {exercises.length} correct
        </p>
        <Button
          className="mt-6"
          onClick={() => {
            setIndex(0);
            setCorrectCount(0);
            setTyped("");
            setAssembled([]);
            setFeedback(null);
          }}
        >
          Practise again
        </Button>
      </div>
    );
  }

  const remainingTokens = () => {
    const pool = [...exercise.tokens];
    for (const word of assembled) {
      const at = pool.indexOf(word);
      if (at >= 0) pool.splice(at, 1);
    }
    return pool;
  };

  const check = (response: string) => {
    const correct = isAnswerCorrect(
      response,
      exercise.answer,
      exercise.accepted_answers,
    );
    const near = !correct && isNearMiss(response, exercise.answer);

    setFeedback({
      correct,
      message: correct
        ? "Correct"
        : near
          ? `Nearly — it's "${exercise.answer}"`
          : `Answer: ${exercise.answer}`,
    });

    if (correct) setCorrectCount((value) => value + 1);

    void recordAttempt({
      exerciseId: exercise.id,
      response,
      isCorrect: correct,
    }).catch((error) => console.error("Could not record attempt", error));
  };

  const next = () => {
    setFeedback(null);
    setTyped("");
    setAssembled([]);
    setShowHint(false);
    setIndex((value) => value + 1);
  };

  return (
    <div className="space-y-5">
      <Progress value={index} max={exercises.length} />

      <Card className="space-y-4">
        <p className="text-xs uppercase tracking-wide text-ink-faint">
          {exercise.kind === "word_order"
            ? "Put it in order"
            : exercise.kind === "fill_blank"
              ? "Fill the gap"
              : "Translate"}
        </p>
        <p className="text-lg text-ink">{exercise.prompt}</p>

        {exercise.kind === "word_order" ? (
          <div className="space-y-3">
            <div className="min-h-14 rounded-lg border border-dashed border-border bg-surface-2 p-2">
              <div className="flex flex-wrap gap-2">
                {assembled.map((word, position) => (
                  <button
                    key={`${word}-${position}`}
                    type="button"
                    disabled={Boolean(feedback)}
                    onClick={() =>
                      setAssembled((current) =>
                        current.filter((_, i) => i !== position),
                      )
                    }
                    className="rounded-md bg-accent-soft px-2.5 py-1 text-sm text-accent"
                  >
                    {word}
                  </button>
                ))}
                {assembled.length === 0 ? (
                  <span className="px-1 py-1 text-sm text-ink-faint">
                    Tap the words below
                  </span>
                ) : null}
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {remainingTokens().map((word, position) => (
                <button
                  key={`${word}-${position}`}
                  type="button"
                  disabled={Boolean(feedback)}
                  onClick={() => setAssembled((current) => [...current, word])}
                  className="rounded-md border border-border bg-surface px-2.5 py-1 text-sm text-ink transition-colors hover:border-accent"
                >
                  {word}
                </button>
              ))}
            </div>

            {!feedback ? (
              <Button
                onClick={() => check(assembled.join(" "))}
                disabled={assembled.length === 0}
              >
                Check
              </Button>
            ) : null}
          </div>
        ) : (
          <form
            onSubmit={(event) => {
              event.preventDefault();
              if (!feedback) check(typed);
            }}
            className="space-y-3"
          >
            <Input
              value={typed}
              onChange={(event) => setTyped(event.target.value)}
              disabled={Boolean(feedback)}
              autoFocus
              autoComplete="off"
              placeholder="Your answer"
            />
            {!feedback ? <Button type="submit">Check</Button> : null}
          </form>
        )}

        {exercise.hint && !feedback ? (
          showHint ? (
            <p className="text-sm text-ink-faint">💡 {exercise.hint}</p>
          ) : (
            <button
              type="button"
              onClick={() => setShowHint(true)}
              className="text-sm text-accent hover:underline"
            >
              Show hint
            </button>
          )
        ) : null}

        {feedback ? (
          <div className="space-y-3">
            <p
              role="status"
              className={cn(
                "rounded-lg px-3 py-2 text-sm",
                feedback.correct
                  ? "bg-success/10 text-success"
                  : "bg-danger/10 text-danger",
              )}
            >
              {feedback.message}
            </p>
            <Button onClick={next} className="w-full" size="lg">
              {isLast ? "Finish" : "Next"}
            </Button>
          </div>
        ) : null}
      </Card>
    </div>
  );
}
