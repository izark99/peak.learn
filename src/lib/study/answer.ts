/**
 * Answer checking and question construction. Pure and unit-tested — a
 * too-strict comparison here marks correct answers wrong, which is the fastest
 * way to make a learner give up on the app.
 */

/**
 * Fold away the differences that shouldn't count as a wrong answer:
 * case, surrounding and repeated whitespace, punctuation, and the leading
 * articles learners routinely omit.
 *
 * Accents are deliberately preserved — in most languages they change the word,
 * so stripping them would mark a genuine mistake as correct.
 */
export function normalizeAnswer(value: string): string {
  return value
    .normalize("NFC")
    .toLocaleLowerCase()
    .replace(/[.,!?;:"'’“”()\[\]{}]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^(the|a|an|to|le|la|les|un|une|el|los|las|der|die|das)\s+/u, "");
}

/** True when the response matches the expected answer or any accepted variant. */
export function isAnswerCorrect(
  response: string,
  expected: string,
  accepted: string[] = [],
): boolean {
  const normalized = normalizeAnswer(response);
  if (normalized.length === 0) return false;

  return [expected, ...accepted]
    .map(normalizeAnswer)
    .some((candidate) => candidate.length > 0 && candidate === normalized);
}

/** Levenshtein distance, used to spot near-misses worth a nudge. */
export function editDistance(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  let previous = Array.from({ length: b.length + 1 }, (_, i) => i);

  for (let i = 1; i <= a.length; i += 1) {
    const current = [i];
    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      current[j] = Math.min(
        current[j - 1] + 1,
        previous[j] + 1,
        previous[j - 1] + cost,
      );
    }
    previous = current;
  }

  return previous[b.length];
}

/**
 * A response that is one small slip away from correct — a typo rather than not
 * knowing the word. Worth telling the learner so they don't think the app is
 * broken.
 */
export function isNearMiss(response: string, expected: string): boolean {
  const a = normalizeAnswer(response);
  const b = normalizeAnswer(expected);
  if (a.length === 0 || b.length === 0 || a === b) return false;

  const allowed = b.length <= 4 ? 1 : 2;
  return editDistance(a, b) <= allowed;
}

/**
 * A seeded pseudo-random generator (mulberry32).
 *
 * Question sets are built during render, where `Math.random` is impure: a
 * re-render would reshuffle the options under the learner's cursor. Seeding
 * from a stable per-session id makes the same set come out every time while
 * still differing between sessions.
 */
export function createSeededRandom(seed: string): () => number {
  let state = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    state ^= seed.charCodeAt(i);
    state = Math.imul(state, 16777619);
  }

  return () => {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Deterministic shuffle when given a seeded `random`; Math.random otherwise. */
export function shuffle<T>(items: T[], random: () => number = Math.random): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/**
 * Build the wrong options for a multiple-choice question.
 *
 * Words the deck marked as commonly confused come first — they make the
 * question actually test the distinction rather than being obviously wrong —
 * then other answers from the deck fill any remaining slots.
 */
export function pickDistractors({
  correct,
  pool,
  confusables = [],
  count = 3,
  random = Math.random,
}: {
  correct: string;
  pool: string[];
  confusables?: string[];
  count?: number;
  random?: () => number;
}): string[] {
  const correctKey = normalizeAnswer(correct);
  const seen = new Set([correctKey]);
  const chosen: string[] = [];

  const take = (candidates: string[]) => {
    for (const candidate of candidates) {
      if (chosen.length >= count) return;
      const key = normalizeAnswer(candidate);
      if (key.length === 0 || seen.has(key)) continue;
      seen.add(key);
      chosen.push(candidate);
    }
  };

  take(shuffle(confusables, random));
  take(shuffle(pool, random));

  return chosen;
}

/** The four options for a multiple-choice question, in random order. */
export function buildChoices({
  correct,
  pool,
  confusables = [],
  count = 4,
  random = Math.random,
}: {
  correct: string;
  pool: string[];
  confusables?: string[];
  count?: number;
  random?: () => number;
}): string[] {
  const distractors = pickDistractors({
    correct,
    pool,
    confusables,
    count: count - 1,
    random,
  });
  return shuffle([correct, ...distractors], random);
}
