import type { Metadata } from "next";
import Link from "next/link";
import { Flame, Layers, Mic, Plus } from "lucide-react";

import { Card, EmptyState, Progress, buttonStyles } from "@/components/ui";
import { listDecks } from "@/lib/data/decks";
import { requireProfile } from "@/lib/data/profile";
import { loadDueSchedule } from "@/lib/data/study";
import { buildForecast, countDue } from "@/lib/srs/forecast";
import { languageName } from "@/lib/languages";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const { userId, profile } = await requireProfile();

  const [decks, schedule] = await Promise.all([
    listDecks(userId),
    loadDueSchedule(userId),
  ]);

  const dueNow = countDue(schedule);
  const forecast = buildForecast(schedule);
  const busiestDay = Math.max(1, ...forecast.map((day) => day.count));
  const totalCards = decks.reduce((sum, deck) => sum + deck.cardCount, 0);

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">
          {profile.display_name ? `Hi ${profile.display_name}` : "Welcome back"}
        </h1>
        <p className="mt-1 text-sm text-ink-muted">
          Learning {languageName(profile.target_language)}
        </p>
      </header>

      <div className="grid gap-3 sm:grid-cols-3">
        <Card>
          <div className="flex items-center gap-2 text-ink-muted">
            <Flame className="size-4" aria-hidden />
            <span className="text-sm">Streak</span>
          </div>
          <p className="mt-2 text-3xl font-semibold tabular-nums text-ink">
            {profile.streak_count}
          </p>
          <p className="text-xs text-ink-faint">
            day{profile.streak_count === 1 ? "" : "s"} in a row
          </p>
        </Card>

        <Card>
          <div className="flex items-center gap-2 text-ink-muted">
            <Layers className="size-4" aria-hidden />
            <span className="text-sm">Due now</span>
          </div>
          <p className="mt-2 text-3xl font-semibold tabular-nums text-ink">{dueNow}</p>
          <p className="text-xs text-ink-faint">
            of {totalCards} card{totalCards === 1 ? "" : "s"}
          </p>
        </Card>

        <Card>
          <div className="flex items-center gap-2 text-ink-muted">
            <span className="text-sm">Daily goal</span>
          </div>
          <p className="mt-2 text-3xl font-semibold tabular-nums text-ink">
            {profile.daily_goal}
          </p>
          <Progress
            value={Math.min(dueNow, profile.daily_goal)}
            max={profile.daily_goal}
            className="mt-2"
          />
        </Card>
      </div>

      {dueNow > 0 ? (
        <Link href="/app/review" className={buttonStyles({ size: "lg", className: "w-full" })}>
          Review {dueNow} card{dueNow === 1 ? "" : "s"}
        </Link>
      ) : null}

      <section>
        <h2 className="mb-2 text-sm font-medium text-ink-muted">Next 7 days</h2>
        <Card>
          <div className="flex items-end justify-between gap-2">
            {forecast.map((day) => (
              <div key={day.date} className="flex flex-1 flex-col items-center gap-2">
                <span className="text-xs tabular-nums text-ink-faint">
                  {day.count > 0 ? day.count : ""}
                </span>
                <div
                  className="w-full rounded-t bg-accent/70"
                  // Bars are scaled against the busiest day so a light week
                  // still reads as a shape rather than a flat line.
                  style={{
                    height: `${Math.max(4, (day.count / busiestDay) * 96)}px`,
                  }}
                  aria-hidden
                />
                <span className="text-[11px] text-ink-faint">{day.label}</span>
              </div>
            ))}
          </div>
          <p className="sr-only">
            {forecast
              .map((day) => `${day.label}: ${day.count} cards due`)
              .join(". ")}
          </p>
        </Card>
      </section>

      <section>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-medium text-ink-muted">Your decks</h2>
          <Link href="/app/decks" className="text-sm text-accent hover:underline">
            See all
          </Link>
        </div>

        {decks.length === 0 ? (
          <EmptyState
            title="Nothing to study yet"
            description="Make your first deck from a photo, some text, or by hand."
            action={
              <Link href="/app/decks/new" className={buttonStyles()}>
                <Plus className="size-4" aria-hidden />
                New deck
              </Link>
            }
          />
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {decks.slice(0, 4).map((deck) => (
              <li key={deck.id}>
                <Link href={`/app/decks/${deck.id}`} className="block">
                  <Card className="transition-colors hover:border-border-strong">
                    <div className="flex items-center justify-between gap-3">
                      <span className="truncate font-medium text-ink">{deck.title}</span>
                      <span className="shrink-0 text-xs text-ink-faint">
                        {deck.dueCount > 0 ? `${deck.dueCount} due` : `${deck.cardCount} cards`}
                      </span>
                    </div>
                  </Card>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="mb-2 text-sm font-medium text-ink-muted">Practise speaking</h2>
        <Link href="/app/speak" className="block">
          <Card className="flex items-center gap-4 transition-colors hover:border-accent">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent">
              <Mic className="size-5" aria-hidden />
            </span>
            <span>
              <span className="block font-medium text-ink">
                Have a conversation out loud
              </span>
              <span className="block text-sm text-ink-muted">
                Order food, sit an interview, or just chat — with feedback on how you
                sounded.
              </span>
            </span>
          </Card>
        </Link>
      </section>
    </div>
  );
}
