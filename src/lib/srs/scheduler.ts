/**
 * Spaced repetition scheduler — an SM-2 variant with Anki-style learning steps.
 *
 * Deliberately pure and dependency-free: no dates read from the ambient clock,
 * no randomness that cannot be injected. A silent bug here corrupts every
 * learner's review history in a way that is invisible for weeks, so the whole
 * thing is written to be exhaustively unit-testable.
 */

/** 1 Again · 2 Hard · 3 Good · 4 Easy. */
export type Rating = 1 | 2 | 3 | 4;

export type CardState = "new" | "learning" | "review" | "relearning";

export type SchedulerCard = {
  state: CardState;
  easeFactor: number;
  /** Current review interval in days. 0 while the card is still in learning. */
  intervalDays: number;
  /** Successful graduations, for display only. */
  repetitions: number;
  /** Times this card has been forgotten after reaching review. */
  lapses: number;
  /** Index into the learning or relearning step ladder. */
  learningStep: number;
  dueAt: Date;
};

export type SchedulerOptions = {
  /** Minutes between the first exposures of a new card. */
  learningSteps?: number[];
  /** Minutes between exposures after a lapse. */
  relearningSteps?: number[];
  /** Days until the first review once a card graduates. */
  graduatingInterval?: number;
  /** Days until first review when a new card is answered Easy outright. */
  easyInterval?: number;
  /** Upper bound so intervals cannot run away to decades. */
  maximumInterval?: number;
  /** Injectable for deterministic tests. Must return [0, 1). */
  random?: () => number;
};

const DEFAULTS = {
  learningSteps: [1, 10],
  relearningSteps: [10],
  graduatingInterval: 1,
  easyInterval: 4,
  maximumInterval: 365 * 10,
} as const;

const MIN_EASE = 1.3;

/** Ease adjustment per rating, applied only once a card is in review. */
const EASE_DELTA: Record<Rating, number> = {
  1: -0.2,
  2: -0.15,
  3: 0,
  4: 0.15,
};

const HARD_MULTIPLIER = 1.2;
const EASY_BONUS = 1.3;
/** A lapsed card comes back at half its old interval, never below a day. */
const LAPSE_MULTIPLIER = 0.5;

const MINUTE_MS = 60_000;
const DAY_MS = 86_400_000;

function clampEase(ease: number): number {
  return Math.max(MIN_EASE, Number(ease.toFixed(4)));
}

function addMinutes(from: Date, minutes: number): Date {
  return new Date(from.getTime() + minutes * MINUTE_MS);
}

function addDays(from: Date, days: number): Date {
  return new Date(from.getTime() + days * DAY_MS);
}

/**
 * Spread intervals by up to ±5% so a big import does not come back as one
 * enormous pile on the same day. Skipped under ~2.5 days, where the jitter
 * would be smaller than the rounding.
 */
function applyFuzz(intervalDays: number, random: () => number): number {
  if (intervalDays < 2.5) return intervalDays;
  const spread = intervalDays * 0.05;
  return intervalDays + (random() * 2 - 1) * spread;
}

/** The state a card is in before its first review. */
export function initialCard(now: Date = new Date()): SchedulerCard {
  return {
    state: "new",
    easeFactor: 2.5,
    intervalDays: 0,
    repetitions: 0,
    lapses: 0,
    learningStep: 0,
    dueAt: now,
  };
}

/**
 * Apply a rating and return the card's next state. The input is never mutated.
 */
export function schedule(
  card: SchedulerCard,
  rating: Rating,
  now: Date = new Date(),
  options: SchedulerOptions = {},
): SchedulerCard {
  const learningSteps = options.learningSteps ?? [...DEFAULTS.learningSteps];
  const relearningSteps = options.relearningSteps ?? [...DEFAULTS.relearningSteps];
  const graduatingInterval = options.graduatingInterval ?? DEFAULTS.graduatingInterval;
  const easyInterval = options.easyInterval ?? DEFAULTS.easyInterval;
  const maximumInterval = options.maximumInterval ?? DEFAULTS.maximumInterval;
  const random = options.random ?? Math.random;

  const next: SchedulerCard = { ...card };

  // A brand-new card enters the learning ladder on its first answer.
  if (next.state === "new") {
    next.state = "learning";
    next.learningStep = 0;
  }

  if (next.state === "learning" || next.state === "relearning") {
    const wasRelearning = next.state === "relearning";
    const steps = wasRelearning ? relearningSteps : learningSteps;

    if (rating === 1) {
      // Back to the start of the ladder.
      next.learningStep = 0;
      next.dueAt = addMinutes(now, steps[0]);
      return next;
    }

    if (rating === 2) {
      // Hard repeats the current step rather than advancing.
      const step = steps[Math.min(next.learningStep, steps.length - 1)];
      next.dueAt = addMinutes(now, step);
      return next;
    }

    // Good advances one step; Easy graduates immediately.
    const advanced = rating === 4 ? steps.length : next.learningStep + 1;

    if (advanced < steps.length) {
      next.learningStep = advanced;
      next.dueAt = addMinutes(now, steps[advanced]);
      return next;
    }

    // Graduating. A relearning card resumes the halved interval banked when it
    // lapsed; a fresh card starts at the graduating (or easy) interval.
    const graduatedInterval = wasRelearning
      ? Math.max(1, next.intervalDays, rating === 4 ? easyInterval : 0)
      : rating === 4
        ? easyInterval
        : graduatingInterval;

    next.state = "review";
    next.learningStep = 0;
    next.repetitions += 1;
    next.intervalDays = Math.min(maximumInterval, graduatedInterval);
    next.dueAt = addDays(now, next.intervalDays);
    return next;
  }

  // --- review ------------------------------------------------------------
  if (rating === 1) {
    next.lapses += 1;
    next.easeFactor = clampEase(next.easeFactor + EASE_DELTA[1]);
    next.state = "relearning";
    next.learningStep = 0;
    // Banked for when the card graduates out of relearning.
    next.intervalDays = Math.max(1, next.intervalDays * LAPSE_MULTIPLIER);
    next.dueAt = addMinutes(now, relearningSteps[0]);
    return next;
  }

  next.easeFactor = clampEase(next.easeFactor + EASE_DELTA[rating]);

  const base = next.intervalDays > 0 ? next.intervalDays : 1;
  let interval: number;
  if (rating === 2) {
    interval = base * HARD_MULTIPLIER;
  } else if (rating === 3) {
    interval = base * next.easeFactor;
  } else {
    interval = base * next.easeFactor * EASY_BONUS;
  }

  interval = applyFuzz(interval, random);
  // Always move forward: Hard on a 1-day card must not stay at 1 day forever.
  interval = Math.max(base + 1, interval);
  interval = Math.min(maximumInterval, interval);
  interval = Math.round(interval * 100) / 100;

  next.repetitions += 1;
  next.intervalDays = interval;
  next.dueAt = addDays(now, interval);
  return next;
}

/** Human-readable "next review in…" label for the rating buttons. */
export function describeInterval(card: SchedulerCard, now: Date = new Date()): string {
  const ms = card.dueAt.getTime() - now.getTime();
  const minutes = Math.round(ms / MINUTE_MS);

  if (minutes < 1) return "now";
  if (minutes < 60) return `${minutes}m`;

  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h`;

  const days = Math.round(ms / DAY_MS);
  if (days < 30) return `${days}d`;

  const months = Math.round(days / 30);
  if (months < 12) return `${months}mo`;

  return `${(days / 365).toFixed(1)}y`;
}

/**
 * What each button would do, without committing it — used to label the four
 * rating buttons with their resulting interval.
 */
export function previewRatings(
  card: SchedulerCard,
  now: Date = new Date(),
  options: SchedulerOptions = {},
): Record<Rating, string> {
  // Fuzz is disabled in the preview so the label matches what is committed
  // closely enough to not look like a bug.
  const stable: SchedulerOptions = { ...options, random: () => 0.5 };
  return {
    1: describeInterval(schedule(card, 1, now, stable), now),
    2: describeInterval(schedule(card, 2, now, stable), now),
    3: describeInterval(schedule(card, 3, now, stable), now),
    4: describeInterval(schedule(card, 4, now, stable), now),
  };
}
