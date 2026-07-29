# peak.learn

An AI language-learning app: turn a photo or a paragraph into flashcards,
schedule them with spaced repetition, drill the grammar, then use the words in
a spoken conversation.

Built as a clone of [OpenQuiz.AI](https://openquiz.ai). Free throughout — there
is no billing, paywall, or premium tier.

## What's here

| Area | Detail |
|---|---|
| **Decks** | Create by hand, from pasted text, or from a photo (vision OCR) |
| **Spaced repetition** | SM-2 variant with learning steps, lapse handling and interval fuzz; 7-day forecast |
| **Study modes** | Flashcards, learn, dictation, graded test, timed match |
| **Grammar** | Translate, word-order and fill-the-blank exercises built from your own vocabulary |
| **Speaking** | In-character AI conversation with delivery feedback, plus repeat-after-me pronunciation drills |
| **Classes** | Teacher creates a class, hands out a join code, assigns decks, follows progress |
| **Languages** | 45, in both directions |

## Stack

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind v4 · Supabase
(Postgres + Auth + Storage + RLS) · Anthropic Claude · Vitest · Playwright.

## Running it

```bash
npm install
cp .env.example .env.local   # fill in the blanks (see below)
npm run dev
```

### Environment

| Variable | Required | Notes |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | yes | Project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | yes | Safe in the browser — RLS is what protects the data |
| `ANTHROPIC_API_KEY` | no | Leave blank and the app runs on a deterministic mock generator |
| `ANTHROPIC_MODEL` | no | Defaults to `claude-opus-5` |

**Without an Anthropic key the app still works end to end.** Card generation,
grammar exercises and the speaking partner return clearly-labelled sample
content instead of failing, so every screen stays usable. Add a key and the
same code paths call Claude — nothing else changes.

### Database

Migrations live in `supabase/migrations/` and are applied in filename order.
Every table has RLS enabled; the policy helpers live in a `private` schema so
they aren't reachable as PostgREST RPC endpoints.

## Tests

```bash
npm test          # unit tests: scheduler, forecast, answer matching, pronunciation scoring
npm run test:e2e  # Playwright; auth-dependent specs skip if Supabase is unreachable
npm run build     # production build + type check
npx eslint .      # lint
```

The unit tests concentrate on the pure logic where a silent bug is expensive:
the spaced-repetition scheduler, answer comparison, and pronunciation scoring.

## A note on pronunciation scoring

Scoring is deliberately split in two, because the browser can only measure some
of what a full assessment would:

- **`scoreDelivery`** — used for free conversation. Reports fluency, an
  estimated prosody figure, speaking rate and hesitation count. It does *not*
  report accuracy or completeness: the learner chose their own words, so there
  is no target to compare against, and scoring a transcript against itself
  would return 100 every time and mean nothing.
- **`scorePronunciation`** — used for repeat-after-me drills, where a target
  line exists. Reports measured accuracy, fluency and completeness.

**Prosody is an estimate in both cases**, derived from timing and hesitation
markers rather than acoustic analysis, and the UI labels it as such. A real
prosody score needs an acoustic model such as Azure's Pronunciation Assessment.
