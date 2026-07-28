import { describe, expect, it } from "vitest";

import {
  buildChoices,
  createSeededRandom,
  editDistance,
  isAnswerCorrect,
  isNearMiss,
  normalizeAnswer,
  pickDistractors,
  shuffle,
} from "@/lib/study/answer";

describe("normalizeAnswer", () => {
  it("folds case and surrounding whitespace", () => {
    expect(normalizeAnswer("  Restaurant ")).toBe("restaurant");
  });

  it("collapses repeated inner whitespace", () => {
    expect(normalizeAnswer("train   station")).toBe("train station");
  });

  it("drops punctuation, including typographic apostrophes", () => {
    expect(normalizeAnswer("it's, really!")).toBe("its really");
    expect(normalizeAnswer("it’s")).toBe("its");
  });

  it("drops a leading article", () => {
    expect(normalizeAnswer("the restaurant")).toBe("restaurant");
    expect(normalizeAnswer("el gato")).toBe("gato");
  });

  it("keeps accents, which change the word in most languages", () => {
    expect(normalizeAnswer("café")).toBe("café");
    expect(normalizeAnswer("cafe")).not.toBe(normalizeAnswer("café"));
  });

  it("leaves non-Latin scripts intact", () => {
    expect(normalizeAnswer(" 식당 ")).toBe("식당");
  });
});

describe("isAnswerCorrect", () => {
  it("accepts an exact match", () => {
    expect(isAnswerCorrect("restaurant", "restaurant")).toBe(true);
  });

  it("accepts a match that differs only by case, spacing or article", () => {
    expect(isAnswerCorrect("  The Restaurant ", "restaurant")).toBe(true);
  });

  it("accepts any of the listed alternatives", () => {
    expect(isAnswerCorrect("diner", "restaurant", ["diner", "eatery"])).toBe(true);
  });

  it("rejects a genuinely different word", () => {
    expect(isAnswerCorrect("station", "restaurant")).toBe(false);
  });

  it("rejects empty or whitespace-only input", () => {
    expect(isAnswerCorrect("", "restaurant")).toBe(false);
    expect(isAnswerCorrect("   ", "restaurant")).toBe(false);
  });

  it("does not treat an empty expected answer as matching empty input", () => {
    expect(isAnswerCorrect("", "")).toBe(false);
  });
});

describe("isNearMiss", () => {
  it("flags a single-character typo", () => {
    expect(isNearMiss("restaurent", "restaurant")).toBe(true);
  });

  it("is stricter on short words, where one letter is a different word", () => {
    // "cat" vs "cap" is one edit, but on a 3-letter word that's a real miss.
    expect(isNearMiss("cap", "cat")).toBe(true);
    expect(isNearMiss("dog", "cat")).toBe(false);
  });

  it("does not flag an exact match", () => {
    expect(isNearMiss("restaurant", "restaurant")).toBe(false);
  });

  it("does not flag a completely different answer", () => {
    expect(isNearMiss("station", "restaurant")).toBe(false);
  });
});

describe("editDistance", () => {
  it("returns zero for identical strings", () => {
    expect(editDistance("abc", "abc")).toBe(0);
  });

  it("counts substitutions, insertions and deletions", () => {
    expect(editDistance("kitten", "sitting")).toBe(3);
    expect(editDistance("", "abc")).toBe(3);
    expect(editDistance("abc", "")).toBe(3);
  });
});

describe("createSeededRandom", () => {
  it("produces the same sequence for the same seed", () => {
    const a = createSeededRandom("card-1");
    const b = createSeededRandom("card-1");

    const first = Array.from({ length: 10 }, () => a());
    const second = Array.from({ length: 10 }, () => b());

    expect(first).toEqual(second);
  });

  it("produces different sequences for different seeds", () => {
    const a = createSeededRandom("card-1");
    const b = createSeededRandom("card-2");

    expect(a()).not.toBe(b());
  });

  it("stays within [0, 1)", () => {
    const random = createSeededRandom("seed");
    for (let i = 0; i < 500; i += 1) {
      const value = random();
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });

  it("does not get stuck returning one value", () => {
    const random = createSeededRandom("seed");
    const values = new Set(Array.from({ length: 50 }, () => random()));

    expect(values.size).toBeGreaterThan(40);
  });

  it("shuffles identically when seeded the same way", () => {
    const items = [1, 2, 3, 4, 5, 6, 7, 8];

    expect(shuffle(items, createSeededRandom("x"))).toEqual(
      shuffle(items, createSeededRandom("x")),
    );
  });
});

describe("shuffle", () => {
  it("keeps every element", () => {
    const input = [1, 2, 3, 4, 5];
    expect([...shuffle(input, () => 0.5)].sort()).toEqual(input);
  });

  it("does not mutate the input", () => {
    const input = [1, 2, 3];
    shuffle(input, () => 0.5);
    expect(input).toEqual([1, 2, 3]);
  });
});

describe("pickDistractors", () => {
  const random = () => 0.5;

  it("prefers confusables over generic pool entries", () => {
    const result = pickDistractors({
      correct: "restaurant",
      pool: ["airport", "hospital", "library"],
      confusables: ["restroom"],
      count: 3,
      random,
    });

    expect(result).toContain("restroom");
    expect(result).toHaveLength(3);
  });

  it("never includes the correct answer", () => {
    const result = pickDistractors({
      correct: "restaurant",
      pool: ["restaurant", "The Restaurant", "airport"],
      count: 3,
      random,
    });

    expect(result).toEqual(["airport"]);
  });

  it("does not repeat an option that only differs by case or article", () => {
    const result = pickDistractors({
      correct: "station",
      pool: ["airport", "The Airport", "AIRPORT"],
      count: 3,
      random,
    });

    expect(result).toEqual(["airport"]);
  });

  it("returns fewer than requested rather than padding a thin deck", () => {
    const result = pickDistractors({
      correct: "restaurant",
      pool: ["airport"],
      count: 3,
      random,
    });

    expect(result).toHaveLength(1);
  });
});

describe("buildChoices", () => {
  it("always includes the correct answer", () => {
    const choices = buildChoices({
      correct: "restaurant",
      pool: ["airport", "hospital", "library"],
      random: () => 0.5,
    });

    expect(choices).toContain("restaurant");
    expect(choices).toHaveLength(4);
  });

  it("degrades to what the deck can supply", () => {
    const choices = buildChoices({
      correct: "restaurant",
      pool: [],
      random: () => 0.5,
    });

    expect(choices).toEqual(["restaurant"]);
  });
});
