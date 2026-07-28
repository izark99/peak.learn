"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, Mic, Repeat2, Send, Square, Volume2, X } from "lucide-react";

import {
  endConversation,
  speakTurn,
  startConversation,
} from "@/app/app/speak/actions";
import { Button, Input } from "@/components/ui";
import {
  isSpeechRecognitionSupported,
  listenOnce,
  RecognitionError,
} from "@/lib/speech/recognition";
import {
  scoreDelivery,
  scoreLabel,
  scorePronunciation,
  type DeliveryScore,
  type PronunciationScore,
} from "@/lib/speech/score";
import { speak } from "@/lib/speech/tts";
import { cn } from "@/lib/utils";

type Turn = {
  id: string;
  speaker: "user" | "ai";
  text: string;
  translation?: string;
  delivery?: DeliveryScore;
};

function ScoreBar({
  label,
  value,
  estimated,
}: {
  label: string;
  value: number;
  estimated?: boolean;
}) {
  return (
    <div>
      <div className="flex justify-between text-xs">
        <span className="text-ink-muted">
          {label}
          {estimated ? <span className="text-ink-faint"> (est.)</span> : null}
        </span>
        <span className="tabular-nums text-ink">{value}</span>
      </div>
      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-surface-2">
        <div
          className={cn(
            "h-full rounded-full",
            value >= 75 ? "bg-success" : value >= 50 ? "bg-warning" : "bg-danger",
          )}
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}

/**
 * Free-speech feedback. Only fluency and hesitation are shown, because the
 * learner picked their own words — there is nothing to measure accuracy or
 * completeness against.
 */
function DeliveryCard({ score }: { score: DeliveryScore }) {
  return (
    <div className="mt-2 rounded-lg border border-border bg-surface-2 p-3 text-left">
      <div className="mb-2 flex items-baseline justify-between">
        <span className="text-sm font-medium text-ink">Delivery</span>
        <span className="text-xs text-ink-faint">
          {score.wordsPerMinute} wpm
          {score.hesitations > 0 ? ` · ${score.hesitations} hesitation${score.hesitations === 1 ? "" : "s"}` : ""}
        </span>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        <ScoreBar label="Fluency" value={score.fluency} />
        <ScoreBar label="Prosody" value={score.prosody} estimated />
      </div>
    </div>
  );
}

/** Target-based scoring, shown after repeating one of the AI's lines. */
function PronunciationCard({ score }: { score: PronunciationScore }) {
  return (
    <div className="mt-3 rounded-lg border border-border bg-surface p-3">
      <div className="mb-2 flex items-baseline justify-between">
        <span className="text-sm font-medium text-ink">{scoreLabel(score.overall)}</span>
        <span className="text-lg font-semibold tabular-nums text-ink">
          {score.overall}
        </span>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <ScoreBar label="Accuracy" value={score.accuracy} />
        <ScoreBar label="Fluency" value={score.fluency} />
        <ScoreBar label="Completeness" value={score.completeness} />
        <ScoreBar label="Prosody" value={score.prosody} estimated />
      </div>

      {score.words.some((word) => !word.matched) ? (
        <p className="mt-2 text-xs text-ink-faint">
          Came out unclear:{" "}
          {score.words
            .filter((word) => !word.matched)
            .map((word) => word.word)
            .join(", ")}
        </p>
      ) : null}

      <p className="mt-2 text-[11px] leading-snug text-ink-faint">
        Accuracy, fluency and completeness are measured from the transcript.
        Prosody is estimated from timing and hesitation, not measured
        acoustically.
      </p>
    </div>
  );
}

export function Conversation({
  scenarioId,
  speechLang,
  requiredTerms,
}: {
  scenarioId: string;
  speechLang: string;
  requiredTerms: string[];
}) {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [status, setStatus] = useState<"starting" | "idle" | "listening" | "thinking">(
    "starting",
  );
  const [error, setError] = useState<string | null>(null);
  const [typed, setTyped] = useState("");
  const [usedTerms, setUsedTerms] = useState<Set<string>>(new Set());
  const [micSupported, setMicSupported] = useState(true);
  const [ended, setEnded] = useState(false);

  // The repeat-after-me drill: a target line plus the last attempt's score.
  const [drill, setDrill] = useState<{
    target: string;
    listening: boolean;
    score: PronunciationScore | null;
  } | null>(null);

  const stopRef = useRef<(() => void) | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const started = useRef(false);

  useEffect(() => {
    setMicSupported(isSpeechRecognitionSupported());
  }, []);

  // Open the session once. The ref guard keeps React's development
  // double-mount from creating two sessions.
  useEffect(() => {
    if (started.current) return;
    started.current = true;

    void startConversation(scenarioId).then((result) => {
      if ("error" in result) {
        setError(result.error);
        setStatus("idle");
        return;
      }

      setSessionId(result.sessionId);
      setTurns([
        {
          id: "opening",
          speaker: "ai",
          text: result.opening,
          translation: result.openingTranslation,
        },
      ]);
      setStatus("idle");
      void speak(result.opening, speechLang);
    });
  }, [scenarioId, speechLang]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [turns]);

  const submitTurn = useCallback(
    async (text: string, delivery: DeliveryScore | null, durationMs: number) => {
      if (!sessionId || !text.trim()) {
        setStatus("idle");
        return;
      }

      const history = turns.map((turn) => ({
        speaker: turn.speaker,
        text: turn.text,
      }));

      setTurns((current) => [
        ...current,
        {
          id: `user-${Date.now()}`,
          speaker: "user",
          text,
          delivery: delivery ?? undefined,
        },
      ]);
      setStatus("thinking");

      const result = await speakTurn({
        sessionId,
        scenarioId,
        text,
        score: delivery,
        audioDurationMs: durationMs,
        history,
      });

      if ("error" in result) {
        setError(result.error);
        setStatus("idle");
        return;
      }

      if (result.usedTerms.length > 0) {
        setUsedTerms((current) => {
          const next = new Set(current);
          for (const term of result.usedTerms) next.add(term);
          return next;
        });
      }

      setTurns((current) => [
        ...current,
        {
          id: `ai-${Date.now()}`,
          speaker: "ai",
          text: result.reply,
          translation: result.translation,
        },
      ]);
      setStatus("idle");
      void speak(result.reply, speechLang);
    },
    [scenarioId, sessionId, speechLang, turns],
  );

  const record = useCallback(async () => {
    setError(null);
    setStatus("listening");

    const { promise, stop } = listenOnce(speechLang);
    stopRef.current = stop;

    try {
      const result = await promise;
      stopRef.current = null;

      if (!result.transcript) {
        setError("Nothing was picked up. Try again.");
        setStatus("idle");
        return;
      }

      await submitTurn(
        result.transcript,
        scoreDelivery({
          transcript: result.transcript,
          durationMs: result.durationMs,
        }),
        result.durationMs,
      );
    } catch (recognitionError) {
      stopRef.current = null;
      setError(
        recognitionError instanceof RecognitionError
          ? recognitionError.message
          : "Recording failed.",
      );
      setStatus("idle");
    }
  }, [speechLang, submitTurn]);

  /** Record an attempt at repeating `drill.target` and score it against that line. */
  const runDrill = useCallback(async () => {
    if (!drill) return;
    setError(null);
    setDrill({ ...drill, listening: true, score: null });

    const { promise, stop } = listenOnce(speechLang);
    stopRef.current = stop;

    try {
      const result = await promise;
      stopRef.current = null;

      setDrill((current) =>
        current
          ? {
              ...current,
              listening: false,
              score: scorePronunciation({
                expected: current.target,
                transcript: result.transcript,
                durationMs: result.durationMs,
                confidence: result.confidence,
              }),
            }
          : null,
      );
    } catch (recognitionError) {
      stopRef.current = null;
      setDrill((current) => (current ? { ...current, listening: false } : null));
      setError(
        recognitionError instanceof RecognitionError
          ? recognitionError.message
          : "Recording failed.",
      );
    }
  }, [drill, speechLang]);

  const busy = status === "thinking" || status === "starting";

  return (
    <div className="flex h-[calc(100vh-11rem)] flex-col">
      {requiredTerms.length > 0 ? (
        <div className="mb-3 flex flex-wrap gap-1.5">
          {requiredTerms.map((term) => (
            <span
              key={term}
              className={cn(
                "rounded-full border px-2.5 py-0.5 text-xs transition-colors",
                usedTerms.has(term)
                  ? "border-success/30 bg-success/10 text-success line-through"
                  : "border-border bg-surface text-ink-muted",
              )}
            >
              {term}
            </span>
          ))}
        </div>
      ) : null}

      <div className="flex-1 space-y-4 overflow-y-auto rounded-card border border-border bg-surface p-4">
        {status === "starting" ? (
          <p className="flex items-center gap-2 text-sm text-ink-muted">
            <Loader2 className="size-4 animate-spin" aria-hidden />
            Setting the scene…
          </p>
        ) : null}

        {turns.map((turn) => (
          <div
            key={turn.id}
            className={cn(
              "flex",
              turn.speaker === "user" ? "justify-end" : "justify-start",
            )}
          >
            <div className={cn("max-w-[85%]", turn.speaker === "user" && "text-right")}>
              <div
                className={cn(
                  "inline-block rounded-2xl px-4 py-2.5 text-left",
                  turn.speaker === "ai" ? "bg-surface-2 text-ink" : "bg-accent text-white",
                )}
              >
                <p>{turn.text}</p>
                {turn.translation ? (
                  <p
                    className={cn(
                      "mt-1 text-xs",
                      turn.speaker === "ai" ? "text-ink-faint" : "text-white/70",
                    )}
                  >
                    {turn.translation}
                  </p>
                ) : null}
              </div>

              {turn.speaker === "ai" ? (
                <div className="mt-1 flex gap-3">
                  <button
                    type="button"
                    onClick={() => speak(turn.text, speechLang)}
                    className="flex items-center gap-1 text-xs text-ink-faint hover:text-ink"
                  >
                    <Volume2 className="size-3" aria-hidden />
                    Replay
                  </button>
                  {micSupported ? (
                    <button
                      type="button"
                      onClick={() =>
                        setDrill({ target: turn.text, listening: false, score: null })
                      }
                      className="flex items-center gap-1 text-xs text-ink-faint hover:text-ink"
                    >
                      <Repeat2 className="size-3" aria-hidden />
                      Practise saying this
                    </button>
                  ) : null}
                </div>
              ) : null}

              {turn.delivery ? <DeliveryCard score={turn.delivery} /> : null}
            </div>
          </div>
        ))}

        {status === "thinking" ? (
          <p className="flex items-center gap-2 text-sm text-ink-faint">
            <Loader2 className="size-4 animate-spin" aria-hidden />
            Thinking…
          </p>
        ) : null}

        <div ref={bottomRef} />
      </div>

      {error ? (
        <p role="alert" className="mt-3 text-sm text-danger">
          {error}
        </p>
      ) : null}

      {drill ? (
        <div className="mt-3 rounded-card border border-accent/40 bg-accent-soft/40 p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs uppercase tracking-wide text-accent">
                Repeat after me
              </p>
              <p className="mt-1 text-ink">{drill.target}</p>
            </div>
            <button
              type="button"
              onClick={() => setDrill(null)}
              aria-label="Close the practice panel"
              className="rounded-md p-1 text-ink-faint hover:text-ink"
            >
              <X className="size-4" aria-hidden />
            </button>
          </div>

          <div className="mt-3 flex gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => speak(drill.target, speechLang)}
            >
              <Volume2 className="size-4" aria-hidden />
              Hear it
            </Button>
            <Button size="sm" onClick={runDrill} disabled={drill.listening}>
              <Mic className="size-4" aria-hidden />
              {drill.listening ? "Listening…" : "Say it"}
            </Button>
          </div>

          {drill.score ? <PronunciationCard score={drill.score} /> : null}
        </div>
      ) : null}

      <div className="mt-4 space-y-3">
        {micSupported ? (
          <div className="flex justify-center">
            {status === "listening" ? (
              <button
                type="button"
                onClick={() => stopRef.current?.()}
                className="flex size-16 items-center justify-center rounded-full bg-danger text-white transition-transform hover:scale-105"
                aria-label="Stop recording"
              >
                <Square className="size-6 fill-current" aria-hidden />
              </button>
            ) : (
              <button
                type="button"
                onClick={record}
                disabled={busy || !sessionId || ended}
                className="flex size-16 items-center justify-center rounded-full bg-accent text-white transition-transform hover:scale-105 disabled:opacity-50 disabled:hover:scale-100"
                aria-label="Start recording"
              >
                <Mic className="size-6" aria-hidden />
              </button>
            )}
          </div>
        ) : (
          <p className="rounded-lg border border-warning/30 bg-warning/10 px-3 py-2 text-sm text-warning">
            This browser can&apos;t record speech — Chrome, Edge or Safari can. You can
            still practise by typing below.
          </p>
        )}

        <form
          onSubmit={(event) => {
            event.preventDefault();
            const value = typed.trim();
            if (!value || busy) return;
            setTyped("");
            void submitTurn(value, null, 0);
          }}
          className="flex gap-2"
        >
          <Input
            value={typed}
            onChange={(event) => setTyped(event.target.value)}
            placeholder={micSupported ? "…or type instead" : "Type your reply"}
            disabled={busy || !sessionId || ended}
          />
          <Button type="submit" disabled={busy || !typed.trim() || ended} aria-label="Send">
            <Send className="size-4" aria-hidden />
          </Button>
        </form>

        <div className="text-center">
          {ended ? (
            <p className="text-xs text-ink-faint">Conversation ended.</p>
          ) : (
            <button
              type="button"
              onClick={() => {
                if (!sessionId) return;
                setEnded(true);
                void endConversation(sessionId);
              }}
              className="text-xs text-ink-faint hover:text-ink"
            >
              End conversation
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
