import { describe, expect, it } from "vitest";

import {
  describeInterval,
  initialCard,
  previewRatings,
  schedule,
  type SchedulerCard,
} from "@/lib/srs/scheduler";

const NOW = new Date("2026-01-01T09:00:00.000Z");

/** Fuzz disabled, so every interval assertion below is exact. */
const NO_FUZZ = { random: () => 0.5 };

const MINUTE = 60_000;
const DAY = 86_400_000;

function minutesFrom(now: Date, card: SchedulerCard) {
  return Math.round((card.dueAt.getTime() - now.getTime()) / MINUTE);
}

function daysFrom(now: Date, card: SchedulerCard) {
  return (card.dueAt.getTime() - now.getTime()) / DAY;
}

/** A card sitting in review with a known interval. */
function reviewCard(overrides: Partial<SchedulerCard> = {}): SchedulerCard {
  return {
    state: "review",
    easeFactor: 2.5,
    intervalDays: 10,
    repetitions: 3,
    lapses: 0,
    learningStep: 0,
    dueAt: NOW,
    ...overrides,
  };
}

describe("new cards", () => {
  it("enters learning on the first answer instead of graduating", () => {
    const result = schedule(initialCard(NOW), 3, NOW, NO_FUZZ);

    expect(result.state).toBe("learning");
    expect(result.learningStep).toBe(1);
    expect(minutesFrom(NOW, result)).toBe(10);
  });

  it("graduates straight to the easy interval when answered Easy", () => {
    const result = schedule(initialCard(NOW), 4, NOW, NO_FUZZ);

    expect(result.state).toBe("review");
    expect(result.intervalDays).toBe(4);
    expect(result.repetitions).toBe(1);
    expect(daysFrom(NOW, result)).toBe(4);
  });

  it("shows the first step again when answered Again", () => {
    const result = schedule(initialCard(NOW), 1, NOW, NO_FUZZ);

    expect(result.state).toBe("learning");
    expect(result.learningStep).toBe(0);
    expect(minutesFrom(NOW, result)).toBe(1);
  });
});

describe("learning ladder", () => {
  it("graduates to one day after clearing every step", () => {
    let card = schedule(initialCard(NOW), 3, NOW, NO_FUZZ); // step 0 -> 1
    card = schedule(card, 3, NOW, NO_FUZZ); // step 1 -> graduate

    expect(card.state).toBe("review");
    expect(card.intervalDays).toBe(1);
  });

  it("repeats the current step on Hard rather than advancing", () => {
    const card = schedule(initialCard(NOW), 3, NOW, NO_FUZZ);
    const hard = schedule(card, 2, NOW, NO_FUZZ);

    expect(hard.state).toBe("learning");
    expect(hard.learningStep).toBe(card.learningStep);
    expect(minutesFrom(NOW, hard)).toBe(10);
  });

  it("drops back to the first step on Again mid-ladder", () => {
    const card = schedule(initialCard(NOW), 3, NOW, NO_FUZZ);
    const again = schedule(card, 1, NOW, NO_FUZZ);

    expect(again.learningStep).toBe(0);
    expect(minutesFrom(NOW, again)).toBe(1);
  });
});

describe("review intervals", () => {
  it("multiplies by the ease factor on Good", () => {
    const result = schedule(reviewCard(), 3, NOW, NO_FUZZ);

    expect(result.intervalDays).toBe(25); // 10 * 2.5
    expect(result.easeFactor).toBe(2.5); // Good leaves ease untouched
  });

  it("applies the easy bonus and raises ease on Easy", () => {
    const result = schedule(reviewCard(), 4, NOW, NO_FUZZ);

    expect(result.easeFactor).toBe(2.65);
    expect(result.intervalDays).toBe(34.45); // 10 * 2.65 * 1.3
  });

  it("grows slowly and lowers ease on Hard", () => {
    const result = schedule(reviewCard(), 2, NOW, NO_FUZZ);

    expect(result.easeFactor).toBe(2.35);
    expect(result.intervalDays).toBe(12); // 10 * 1.2
  });

  it("never returns an interval that fails to move forward", () => {
    // Hard on a 1-day card: 1 * 1.2 rounds down to the same day without the
    // explicit floor, which would trap the card at one day forever.
    const result = schedule(reviewCard({ intervalDays: 1 }), 2, NOW, NO_FUZZ);

    expect(result.intervalDays).toBeGreaterThan(1);
  });

  it("caps intervals at the maximum", () => {
    const result = schedule(reviewCard({ intervalDays: 9000 }), 4, NOW, {
      ...NO_FUZZ,
      maximumInterval: 365,
    });

    expect(result.intervalDays).toBe(365);
  });
});

describe("lapses", () => {
  it("sends a forgotten review card to relearning with halved interval banked", () => {
    const result = schedule(reviewCard({ intervalDays: 20 }), 1, NOW, NO_FUZZ);

    expect(result.state).toBe("relearning");
    expect(result.lapses).toBe(1);
    expect(result.easeFactor).toBe(2.3);
    expect(result.intervalDays).toBe(10); // banked for graduation
    expect(minutesFrom(NOW, result)).toBe(10);
  });

  it("resumes the banked interval when relearning is cleared", () => {
    const lapsed = schedule(reviewCard({ intervalDays: 20 }), 1, NOW, NO_FUZZ);
    const recovered = schedule(lapsed, 3, NOW, NO_FUZZ);

    expect(recovered.state).toBe("review");
    expect(recovered.intervalDays).toBe(10);
  });

  it("never lets ease fall below the 1.3 floor", () => {
    let card = reviewCard({ easeFactor: 1.4 });
    for (let i = 0; i < 5; i += 1) {
      card = schedule(card, 1, NOW, NO_FUZZ);
      card = schedule(card, 3, NOW, NO_FUZZ); // back out of relearning
    }

    expect(card.easeFactor).toBe(1.3);
  });

  it("keeps a lapsed card at a full day minimum", () => {
    const result = schedule(reviewCard({ intervalDays: 1 }), 1, NOW, NO_FUZZ);

    expect(result.intervalDays).toBe(1);
  });
});

describe("fuzz", () => {
  it("stays within ±5% of the unfuzzed interval", () => {
    const low = schedule(reviewCard(), 3, NOW, { random: () => 0 });
    const high = schedule(reviewCard(), 3, NOW, { random: () => 0.999999 });

    // 10 * 2.5 = 25, so the band is [23.75, 26.25].
    expect(low.intervalDays).toBeGreaterThanOrEqual(23.75);
    expect(high.intervalDays).toBeLessThanOrEqual(26.25);
    expect(low.intervalDays).toBeLessThan(high.intervalDays);
  });

  it("leaves intervals under the 2.5 day threshold alone", () => {
    // Hard on a 1-day card lands at 2 days, below the threshold, so the two
    // extremes of the random source must agree exactly.
    const a = schedule(reviewCard({ intervalDays: 1 }), 2, NOW, { random: () => 0 });
    const b = schedule(reviewCard({ intervalDays: 1 }), 2, NOW, { random: () => 1 });

    expect(a.intervalDays).toBe(2);
    expect(a.intervalDays).toBe(b.intervalDays);
  });
});

describe("purity", () => {
  it("does not mutate the card passed in", () => {
    const card = reviewCard();
    const snapshot = { ...card };
    schedule(card, 1, NOW, NO_FUZZ);

    expect(card).toEqual(snapshot);
  });
});

describe("labels", () => {
  it("formats upcoming intervals at a sensible granularity", () => {
    expect(describeInterval({ ...reviewCard(), dueAt: new Date(NOW.getTime() + 30 * MINUTE) }, NOW)).toBe("30m");
    expect(describeInterval({ ...reviewCard(), dueAt: new Date(NOW.getTime() + 5 * 3600_000) }, NOW)).toBe("5h");
    expect(describeInterval({ ...reviewCard(), dueAt: new Date(NOW.getTime() + 3 * DAY) }, NOW)).toBe("3d");
    expect(describeInterval({ ...reviewCard(), dueAt: new Date(NOW.getTime() + 90 * DAY) }, NOW)).toBe("3mo");
    expect(describeInterval({ ...reviewCard(), dueAt: new Date(NOW.getTime() + 730 * DAY) }, NOW)).toBe("2.0y");
  });

  it("previews all four buttons in ascending order for a review card", () => {
    const preview = previewRatings(reviewCard(), NOW);

    expect(preview[1]).toBe("10m");
    expect(preview[2]).toBe("12d");
    expect(preview[3]).toBe("25d");
    // 34.45 days rounds into the months bucket.
    expect(preview[4]).toBe("1mo");
  });
});
