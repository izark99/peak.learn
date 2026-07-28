import { describe, expect, it } from "vitest";

import { scoreDelivery, scoreLabel, scorePronunciation } from "@/lib/speech/score";

/** Five words at ~120 wpm sits squarely in the natural band. */
const NATURAL_DURATION = 2500;

describe("scorePronunciation", () => {
  it("gives a perfect repetition top marks", () => {
    const score = scorePronunciation({
      expected: "I would like a coffee",
      transcript: "I would like a coffee",
      durationMs: NATURAL_DURATION,
      confidence: 1,
    });

    expect(score.accuracy).toBe(100);
    expect(score.completeness).toBe(100);
    expect(score.fluency).toBe(100);
    expect(score.overall).toBeGreaterThanOrEqual(95);
  });

  it("ignores case and punctuation differences", () => {
    const score = scorePronunciation({
      expected: "I would like a coffee.",
      transcript: "i would like a coffee",
      durationMs: NATURAL_DURATION,
    });

    expect(score.accuracy).toBe(100);
  });

  it("drops completeness when words are missed", () => {
    const score = scorePronunciation({
      expected: "I would like a coffee",
      transcript: "I would like",
      durationMs: 1500,
    });

    expect(score.completeness).toBe(60); // 3 of 5
    expect(score.words.filter((word) => word.matched)).toHaveLength(3);
  });

  it("still credits a near-miss pronunciation as the intended word", () => {
    const score = scorePronunciation({
      expected: "restaurant",
      transcript: "restaurent",
      durationMs: 800,
    });

    expect(score.words[0].matched).toBe(true);
    expect(score.accuracy).toBeGreaterThan(70);
    expect(score.accuracy).toBeLessThan(100);
  });

  it("does not credit a completely different word", () => {
    const score = scorePronunciation({
      expected: "restaurant",
      transcript: "helicopter",
      durationMs: 800,
    });

    expect(score.words[0].matched).toBe(false);
    expect(score.completeness).toBe(0);
  });

  it("penalises word order rather than scoring a scramble as perfect", () => {
    const ordered = scorePronunciation({
      expected: "the dog bit the man",
      transcript: "the dog bit the man",
      durationMs: NATURAL_DURATION,
    });
    const scrambled = scorePronunciation({
      expected: "the dog bit the man",
      transcript: "the man bit the dog",
      durationMs: NATURAL_DURATION,
    });

    expect(scrambled.overall).toBeLessThan(ordered.overall);
  });

  it("scores silence at zero across the board", () => {
    const score = scorePronunciation({
      expected: "I would like a coffee",
      transcript: "",
      durationMs: 3000,
    });

    expect(score.overall).toBe(0);
    expect(score.completeness).toBe(0);
    expect(score.fluency).toBe(0);
  });

  it("returns zeroes rather than dividing by zero on an empty target", () => {
    const score = scorePronunciation({
      expected: "",
      transcript: "hello",
      durationMs: 1000,
    });

    expect(score.overall).toBe(0);
    expect(score.words).toEqual([]);
  });

  it("marks halting speech down on fluency", () => {
    const slow = scorePronunciation({
      expected: "I would like a coffee",
      transcript: "I would like a coffee",
      durationMs: 20000, // ~15 wpm
    });

    expect(slow.fluency).toBeLessThan(30);
    expect(slow.accuracy).toBe(100); // said correctly, just slowly
  });

  it("marks rushed speech down more gently than halting speech", () => {
    const fast = scorePronunciation({
      expected: "I would like a coffee",
      transcript: "I would like a coffee",
      durationMs: 600, // ~500 wpm
    });

    expect(fast.fluency).toBeLessThan(100);
    expect(fast.fluency).toBeGreaterThan(0);
  });

  it("penalises prosody for hesitation markers", () => {
    const clean = scorePronunciation({
      expected: "I would like a coffee",
      transcript: "I would like a coffee",
      durationMs: NATURAL_DURATION,
    });
    const hesitant = scorePronunciation({
      expected: "I would like a coffee",
      transcript: "I um would uh like a coffee",
      durationMs: 3500,
    });

    expect(hesitant.prosody).toBeLessThan(clean.prosody);
  });

  it("lets low recogniser confidence pull accuracy down, but not to zero", () => {
    const confident = scorePronunciation({
      expected: "coffee",
      transcript: "coffee",
      durationMs: 700,
      confidence: 1,
    });
    const unsure = scorePronunciation({
      expected: "coffee",
      transcript: "coffee",
      durationMs: 700,
      confidence: 0,
    });

    expect(unsure.accuracy).toBeLessThan(confident.accuracy);
    expect(unsure.accuracy).toBe(70); // the confidence floor
  });

  it("always flags prosody as an estimate", () => {
    const score = scorePronunciation({
      expected: "coffee",
      transcript: "coffee",
      durationMs: 700,
    });

    expect(score.estimated).toBe(true);
  });

  it("tokenises Korean per character rather than scoring it as one word", () => {
    const score = scorePronunciation({
      expected: "식당",
      transcript: "식당",
      durationMs: 700,
    });

    expect(score.words).toHaveLength(2);
    expect(score.completeness).toBe(100);
  });

  it("keeps every score within 0–100", () => {
    for (const durationMs of [1, 100, 5000, 600000]) {
      const score = scorePronunciation({
        expected: "one two three",
        transcript: "one two three",
        durationMs,
      });

      for (const value of [
        score.accuracy,
        score.fluency,
        score.completeness,
        score.prosody,
        score.overall,
      ]) {
        expect(value).toBeGreaterThanOrEqual(0);
        expect(value).toBeLessThanOrEqual(100);
      }
    }
  });
});

describe("scoreDelivery", () => {
  it("reports only what is measurable without a target sentence", () => {
    const score = scoreDelivery({
      transcript: "I would like a coffee",
      durationMs: NATURAL_DURATION,
    });

    // Accuracy and completeness are deliberately absent: scoring a free-speech
    // transcript against itself would always report 100 and mean nothing.
    expect(score).not.toHaveProperty("accuracy");
    expect(score).not.toHaveProperty("completeness");
    expect(score.fluency).toBe(100);
    expect(score.estimated).toBe(true);
  });

  it("reports the speaking rate", () => {
    const score = scoreDelivery({
      transcript: "one two three four five six",
      durationMs: 3000,
    });

    expect(score.wordsPerMinute).toBe(120);
  });

  it("counts hesitations and marks prosody down for them", () => {
    const clean = scoreDelivery({
      transcript: "I would like a coffee",
      durationMs: NATURAL_DURATION,
    });
    const hesitant = scoreDelivery({
      transcript: "I um would uh like a coffee",
      durationMs: 3500,
    });

    expect(hesitant.hesitations).toBe(2);
    expect(hesitant.prosody).toBeLessThan(clean.prosody);
  });

  it("scores silence at zero", () => {
    const score = scoreDelivery({ transcript: "", durationMs: 3000 });

    expect(score.overall).toBe(0);
    expect(score.wordsPerMinute).toBe(0);
  });

  it("does not divide by zero on a zero duration", () => {
    const score = scoreDelivery({ transcript: "hello", durationMs: 0 });

    expect(Number.isFinite(score.overall)).toBe(true);
    expect(score.overall).toBe(0);
  });
});

describe("scoreLabel", () => {
  it("describes each band", () => {
    expect(scoreLabel(95)).toBe("Excellent");
    expect(scoreLabel(80)).toBe("Good");
    expect(scoreLabel(60)).toBe("Getting there");
    expect(scoreLabel(20)).toBe("Keep practising");
    expect(scoreLabel(0)).toBe("No speech detected");
  });
});
