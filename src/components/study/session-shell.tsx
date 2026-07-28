"use client";

import Link from "next/link";
import { X } from "lucide-react";

import { Progress, buttonStyles } from "@/components/ui";

/** Header shared by every mode: exit, progress, and position. */
export function SessionShell({
  title,
  exitHref,
  current,
  total,
  children,
}: {
  title: string;
  exitHref: string;
  current: number;
  total: number;
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto flex min-h-[70vh] w-full max-w-2xl flex-col">
      <header className="mb-6 flex items-center gap-4">
        <Link
          href={exitHref}
          aria-label="Leave this session"
          className="rounded-md p-1.5 text-ink-faint transition-colors hover:bg-surface-2 hover:text-ink"
        >
          <X className="size-5" aria-hidden />
        </Link>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-ink">{title}</p>
          <Progress value={current} max={total} className="mt-1.5" />
        </div>
        <p className="shrink-0 text-sm tabular-nums text-ink-faint">
          {Math.min(current + 1, total)}/{total}
        </p>
      </header>

      <div className="flex-1">{children}</div>
    </div>
  );
}

/** End-of-session summary. */
export function SessionComplete({
  studied,
  correct,
  exitHref,
  onRestart,
}: {
  studied: number;
  correct: number;
  exitHref: string;
  onRestart?: () => void;
}) {
  const accuracy = studied === 0 ? 0 : Math.round((correct / studied) * 100);

  return (
    <div className="mx-auto max-w-md py-16 text-center">
      <p className="text-5xl" aria-hidden>
        {accuracy >= 80 ? "🎯" : accuracy >= 50 ? "👍" : "💪"}
      </p>
      <h2 className="mt-4 text-xl font-semibold">Session complete</h2>
      <p className="mt-1 text-sm text-ink-muted">
        {studied} card{studied === 1 ? "" : "s"} · {accuracy}% correct
      </p>

      <div className="mt-6 flex justify-center gap-3">
        {onRestart ? (
          <button type="button" onClick={onRestart} className={buttonStyles()}>
            Go again
          </button>
        ) : null}
        <Link href={exitHref} className={buttonStyles({ variant: "secondary" })}>
          Done
        </Link>
      </div>
    </div>
  );
}
