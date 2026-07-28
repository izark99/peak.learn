import Link from "next/link";
import {
  Camera,
  GraduationCap,
  Layers,
  MessageCircle,
  Mic,
  Repeat,
} from "lucide-react";

import { buttonStyles } from "@/components/ui";
import { FEATURED_LANGUAGES, OTHER_LANGUAGES } from "@/lib/languages";
import { getCurrentUser } from "@/lib/supabase/server";

const FEATURES = [
  {
    icon: Camera,
    title: "A photo becomes a study set",
    body: "Point your camera at a menu, a page, or a street sign. The words come back as flashcards with meanings, pronunciation and an example sentence.",
  },
  {
    icon: Repeat,
    title: "Spaced repetition that adapts",
    body: "Every card is scheduled from how well you actually knew it. A seven-day forecast shows what's coming, so nothing piles up unseen.",
  },
  {
    icon: MessageCircle,
    title: "Grammar you build, not memorise",
    body: "Translate sentences and rebuild word order using the vocabulary you already have. Patterns stick because you used them.",
  },
  {
    icon: Mic,
    title: "Speak, and hear how you did",
    body: "Hold a real conversation out loud — ordering food, a job interview, catching up with a friend — and get feedback on fluency and pronunciation.",
  },
  {
    icon: Layers,
    title: "Five ways to study",
    body: "Flashcards, learn, dictation, a graded test, and timed matching. Same deck, five angles, one schedule underneath.",
  },
  {
    icon: GraduationCap,
    title: "Classes, free for teachers",
    body: "Create a class, hand out the join code, assign decks and watch progress come in. No seat limits, no upgrade prompt.",
  },
];

const FAQ = [
  {
    q: "How much does it cost?",
    a: "Nothing. Every study mode, the speaking practice and the class tools are all included.",
  },
  {
    q: "Which languages can I learn?",
    a: "Forty-five, including English, Korean, Japanese, Chinese and Spanish. You pick what you speak and what you're learning, and the app works in both directions.",
  },
  {
    q: "Do I need a microphone?",
    a: "Only for speaking practice, and there's a typing fallback if your browser can't record. Everything else works without one.",
  },
  {
    q: "What happens to my photos?",
    a: "They're used to build the cards and stored privately against your account. Nobody else can read them.",
  },
];

export default async function LandingPage() {
  // Signed-in visitors get a link straight to the app rather than the pitch.
  const user = await getCurrentUser();

  return (
    <div className="flex min-h-screen flex-col">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-5 sm:px-6">
        <span className="text-lg font-semibold tracking-tight">
          peak<span className="text-accent">.learn</span>
        </span>
        <nav className="flex items-center gap-2">
          {user ? (
            <Link href="/app" className={buttonStyles({ size: "sm" })}>
              Open the app
            </Link>
          ) : (
            <>
              <Link
                href="/login"
                className={buttonStyles({ variant: "ghost", size: "sm" })}
              >
                Sign in
              </Link>
              <Link href="/signup" className={buttonStyles({ size: "sm" })}>
                Get started
              </Link>
            </>
          )}
        </nav>
      </header>

      <main className="flex-1">
        <section className="aurora">
          <div className="mx-auto w-full max-w-3xl px-4 py-20 text-center sm:px-6 sm:py-28">
            <p className="text-sm font-medium text-accent">Free, and it stays free</p>
            <h1 className="mt-3 text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
              Remember the words. Then actually say them.
            </h1>
            <p className="mx-auto mt-5 max-w-xl text-lg text-pretty text-ink-muted">
              peak.learn turns a photo or a paragraph into flashcards, schedules them so
              they stick, and then puts you in a conversation where you have to use them.
            </p>

            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Link
                href={user ? "/app" : "/signup"}
                className={buttonStyles({ size: "lg" })}
              >
                {user ? "Open the app" : "Start learning"}
              </Link>
              <Link
                href="#how"
                className={buttonStyles({ variant: "secondary", size: "lg" })}
              >
                See how it works
              </Link>
            </div>

            <p className="mt-4 text-xs text-ink-faint">No card required. 45 languages.</p>
          </div>
        </section>

        <section id="how" className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6">
          <h2 className="text-center text-2xl font-semibold tracking-tight">
            Everything in one place
          </h2>
          <p className="mx-auto mt-2 max-w-xl text-center text-ink-muted">
            Vocabulary, grammar and speaking usually live in three different apps. Here
            they share one set of words.
          </p>

          <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map(({ icon: Icon, title, body }) => (
              <li key={title} className="rounded-card border border-border bg-surface p-5">
                <span className="flex size-10 items-center justify-center rounded-lg bg-accent-soft text-accent">
                  <Icon className="size-5" aria-hidden />
                </span>
                <h3 className="mt-4 font-medium text-ink">{title}</h3>
                <p className="mt-1.5 text-sm text-pretty text-ink-muted">{body}</p>
              </li>
            ))}
          </ul>
        </section>

        <section className="border-y border-border bg-surface/50">
          <div className="mx-auto w-full max-w-4xl px-4 py-14 text-center sm:px-6">
            <h2 className="text-xl font-semibold tracking-tight">
              45 languages, both directions
            </h2>
            <div className="mt-6 flex flex-wrap justify-center gap-2">
              {FEATURED_LANGUAGES.map((language) => (
                <span
                  key={language.code}
                  className="rounded-full border border-accent/30 bg-accent-soft px-3 py-1 text-sm text-accent"
                >
                  {language.name}
                </span>
              ))}
              {OTHER_LANGUAGES.map((language) => (
                <span
                  key={language.code}
                  className="rounded-full border border-border bg-surface px-3 py-1 text-sm text-ink-muted"
                >
                  {language.name}
                </span>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto w-full max-w-2xl px-4 py-16 sm:px-6">
          <h2 className="text-center text-2xl font-semibold tracking-tight">Questions</h2>
          <dl className="mt-8 space-y-6">
            {FAQ.map(({ q, a }) => (
              <div key={q}>
                <dt className="font-medium text-ink">{q}</dt>
                <dd className="mt-1 text-sm text-pretty text-ink-muted">{a}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section className="mx-auto w-full max-w-3xl px-4 pb-20 text-center sm:px-6">
          <div className="rounded-card border border-border bg-surface p-10">
            <h2 className="text-2xl font-semibold tracking-tight text-balance">
              Learn a word today, use it in a conversation tonight.
            </h2>
            <Link
              href={user ? "/app" : "/signup"}
              className={buttonStyles({ size: "lg", className: "mt-6" })}
            >
              {user ? "Open the app" : "Create a free account"}
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-6 text-sm text-ink-faint sm:px-6">
          <span>
            peak<span className="text-accent">.learn</span>
          </span>
          <span>Built with Next.js, Supabase and Claude.</span>
        </div>
      </footer>
    </div>
  );
}
