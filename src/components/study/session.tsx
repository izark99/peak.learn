"use client";

import { useCallback, useRef, useState } from "react";

import { finishStudySession, submitReview } from "@/app/app/study-actions";
import { DictationMode } from "@/components/study/dictation-mode";
import { FlashcardMode } from "@/components/study/flashcard-mode";
import { LearnMode } from "@/components/study/learn-mode";
import { MatchMode } from "@/components/study/match-mode";
import { SessionComplete, SessionShell } from "@/components/study/session-shell";
import { TestMode } from "@/components/study/test-mode";
import type { AnswerOutcome, ModeProps, StudyCard } from "@/components/study/types";
import type { StudyMode } from "@/lib/study/modes";

const MODE_COMPONENTS: Record<StudyMode, (props: ModeProps) => React.ReactNode> = {
  flashcards: FlashcardMode,
  learn: LearnMode,
  dictation: DictationMode,
  test: TestMode,
  match: MatchMode,
};

/**
 * Owns everything the five modes share: progress, scoring, writing reviews
 * through the scheduler, and closing out the session. Each mode only has to
 * decide what to show and call `onAnswer`.
 */
export function StudySession({
  deckId,
  title,
  mode,
  cards,
  speechLang,
  exitHref,
}: {
  deckId: string | null;
  title: string;
  mode: StudyMode;
  cards: StudyCard[];
  speechLang: string;
  exitHref: string;
}) {
  const [studied, setStudied] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [finished, setFinished] = useState(false);
  const [runKey, setRunKey] = useState(0);

  const startedAt = useRef(new Date().toISOString());
  // Kept in refs as well as state: the finish handler reads them synchronously,
  // and state updates from the final answer may not have flushed yet.
  const studiedRef = useRef(0);
  const correctRef = useRef(0);

  const handleAnswer = useCallback(
    (outcome: AnswerOutcome) => {
      studiedRef.current += 1;
      setStudied(studiedRef.current);

      if (outcome.correct) {
        correctRef.current += 1;
        setCorrect(correctRef.current);
      }

      // Fire-and-forget: a failed write must not interrupt the learner's flow.
      // The next answer on this card will reconcile the schedule anyway.
      void submitReview({
        cardId: outcome.cardId,
        rating: outcome.rating,
        mode,
      }).catch((error) => {
        console.error("Could not record review", error);
      });
    },
    [mode],
  );

  const handleFinish = useCallback(() => {
    setFinished(true);
    void finishStudySession({
      deckId,
      mode,
      cardsStudied: studiedRef.current,
      correctCount: correctRef.current,
      startedAt: startedAt.current,
    }).catch((error) => {
      console.error("Could not save the session", error);
    });
  }, [deckId, mode]);

  const restart = useCallback(() => {
    studiedRef.current = 0;
    correctRef.current = 0;
    startedAt.current = new Date().toISOString();
    setStudied(0);
    setCorrect(0);
    setFinished(false);
    // Remount the mode so it rebuilds its queue and question set.
    setRunKey((value) => value + 1);
  }, []);

  if (cards.length === 0) {
    return (
      <SessionComplete studied={0} correct={0} exitHref={exitHref} />
    );
  }

  if (finished) {
    return (
      <SessionComplete
        studied={studied}
        correct={correct}
        exitHref={exitHref}
        onRestart={restart}
      />
    );
  }

  const Mode = MODE_COMPONENTS[mode];

  return (
    <SessionShell
      title={title}
      exitHref={exitHref}
      current={Math.min(studied, cards.length)}
      total={cards.length}
    >
      <Mode
        key={runKey}
        cards={cards}
        speechLang={speechLang}
        onAnswer={handleAnswer}
        onFinish={handleFinish}
      />
    </SessionShell>
  );
}
