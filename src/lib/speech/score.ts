import { editDistance, normalizeAnswer } from "@/lib/study/answer";

/**
 * Pronunciation scoring from a speech-recognition transcript.
 *
 * Honest framing, because this matters: the Web Speech API gives us a
 * transcript, a confidence number, and how long the learner spoke. It does not
 * give per-phoneme timings, pitch, or stress. So:
 *
 *   - accuracy, completeness  — genuinely measured, from the transcript
 *   - fluency                 — measured, from speaking rate
 *   - prosody                 — ESTIMATED from speaking rate and hesitation
 *                               markers. It is not an acoustic measurement,
 *                               and the UI labels it as an estimate.
 *
 * A real prosody score needs an acoustic model (Azure's Pronunciation
 * Assessment is the usual one). `estimated: true` on the result exists so no
 * caller can present these as equivalent by accident.
 */

export type WordScore = {
  word: string;
  matched: boolean;
  /** 0–100 similarity to the closest transcript token. */
  similarity: number;
};

export type PronunciationScore = {
  /** How closely the recognised words match the target, 0–100. */
  accuracy: number;
  /** Speaking rate versus a natural band, 0–100. */
  fluency: number;
  /** Share of the target actually said, 0–100. */
  completeness: number;
  /** Estimate only — see the module note. 0–100. */
  prosody: number;
  overall: number;
  words: WordScore[];
  /** True when prosody is an estimate rather than an acoustic measurement. */
  estimated: true;
};

/** Comfortable conversational range, in words per minute. */
const NATURAL_WPM_LOW = 90;
const NATURAL_WPM_HIGH = 170;

/** Hesitation markers most recognisers transcribe literally. */
const FILLERS = new Set(["um", "uh", "er", "erm", "ah", "hmm", "eh"]);

function tokenize(value: string): string[] {
  const normalized = normalizeAnswer(value);
  if (normalized.length === 0) return [];

  // Chinese, Japanese and Korean don't delimit words with spaces; fall back to
  // per-character tokens so those languages score at all.
  if (!normalized.includes(" ") && /[぀-ヿ㐀-鿿가-힯]/.test(normalized)) {
    return [...normalized];
  }

  return normalized.split(" ").filter(Boolean);
}

function similarity(a: string, b: string): number {
  if (a === b) return 100;
  const longest = Math.max(a.length, b.length);
  if (longest === 0) return 0;
  return Math.max(0, Math.round((1 - editDistance(a, b) / longest) * 100));
}

function clamp(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

/**
 * Speaking rate to a 0–100 fluency score, with ratio-based decay either side
 * of the natural band.
 *
 * The decay is a ratio rather than a linear penalty on purpose: a linear one
 * bottoms out at zero around 420 wpm, which would score a rushed but perfectly
 * correct attempt identically to saying nothing at all. A ratio only
 * approaches zero, so silence remains the single true zero.
 */
function rateToFluency(wpm: number, wordCount: number): number {
  if (wordCount === 0) return 0;
  if (wpm >= NATURAL_WPM_LOW && wpm <= NATURAL_WPM_HIGH) return 100;
  if (wpm < NATURAL_WPM_LOW) return clamp((wpm / NATURAL_WPM_LOW) * 100);
  return clamp((NATURAL_WPM_HIGH / wpm) * 100);
}

/**
 * Match target words against the transcript in order, allowing skips on both
 * sides. Order matters — "the dog bit the man" should not score full marks
 * against "the man bit the dog".
 */
function alignWords(expected: string[], heard: string[]): WordScore[] {
  const scores: WordScore[] = [];
  let cursor = 0;

  for (const word of expected) {
    let best = { index: -1, score: 0 };

    // Look a little way ahead so one missed word doesn't derail the rest.
    for (let i = cursor; i < Math.min(heard.length, cursor + 4); i += 1) {
      const score = similarity(word, heard[i]);
      if (score > best.score) best = { index: i, score };
    }

    // 70% similarity treats a mispronunciation as the intended word rather
    // than a different one.
    const matched = best.score >= 70;
    if (matched && best.index >= 0) {
      cursor = best.index + 1;
    }

    scores.push({ word, matched, similarity: best.score });
  }

  return scores;
}

export function scorePronunciation({
  expected,
  transcript,
  durationMs,
  confidence = 1,
}: {
  expected: string;
  transcript: string;
  durationMs: number;
  /** Recogniser confidence, 0–1, when the browser supplies one. */
  confidence?: number;
}): PronunciationScore {
  const expectedWords = tokenize(expected);
  const heardWords = tokenize(transcript);

  if (expectedWords.length === 0) {
    return {
      accuracy: 0,
      fluency: 0,
      completeness: 0,
      prosody: 0,
      overall: 0,
      words: [],
      estimated: true,
    };
  }

  const words = alignWords(expectedWords, heardWords);
  const matched = words.filter((word) => word.matched);

  const completeness = clamp((matched.length / expectedWords.length) * 100);

  // Average per-word similarity, nudged by how sure the recogniser was. The
  // confidence floor stops a browser that reports 0 from zeroing a good
  // attempt outright.
  const rawAccuracy =
    words.reduce((total, word) => total + word.similarity, 0) / words.length;
  const accuracy = clamp(rawAccuracy * (0.7 + 0.3 * Math.max(0, Math.min(1, confidence))));

  // Fluency: speaking rate against the natural band.
  const minutes = Math.max(durationMs, 1) / 60000;
  const wpm = heardWords.length / minutes;

  const fluency = rateToFluency(wpm, heardWords.length);

  // Prosody ESTIMATE. Rate naturalness, minus a penalty per hesitation marker.
  const fillerCount = heardWords.filter((word) => FILLERS.has(word)).length;
  const hesitationPenalty = Math.min(40, fillerCount * 15);
  const prosody = clamp(fluency * 0.75 + completeness * 0.25 - hesitationPenalty);

  const overall = clamp(
    accuracy * 0.45 + completeness * 0.3 + fluency * 0.15 + prosody * 0.1,
  );

  return { accuracy, fluency, completeness, prosody, overall, words, estimated: true };
}

/**
 * What can be measured when there is no target sentence — i.e. open
 * conversation, where the learner chose their own words.
 *
 * Accuracy and completeness are deliberately absent: with nothing to compare
 * against, the only way to produce them would be to score the transcript
 * against itself, which returns 100 every time and tells the learner nothing.
 * Use `scorePronunciation` for repeat-after-me drills, where a target exists.
 */
export type DeliveryScore = {
  fluency: number;
  /** Estimate — see the module note. */
  prosody: number;
  overall: number;
  wordsPerMinute: number;
  hesitations: number;
  estimated: true;
};

export function scoreDelivery({
  transcript,
  durationMs,
}: {
  transcript: string;
  durationMs: number;
}): DeliveryScore {
  const heardWords = tokenize(transcript);

  if (heardWords.length === 0 || durationMs <= 0) {
    return {
      fluency: 0,
      prosody: 0,
      overall: 0,
      wordsPerMinute: 0,
      hesitations: 0,
      estimated: true,
    };
  }

  const minutes = durationMs / 60000;
  const wpm = heardWords.length / minutes;
  const fluency = rateToFluency(wpm, heardWords.length);

  const hesitations = heardWords.filter((word) => FILLERS.has(word)).length;
  const prosody = clamp(fluency - Math.min(40, hesitations * 15));

  return {
    fluency,
    prosody,
    overall: clamp(fluency * 0.65 + prosody * 0.35),
    wordsPerMinute: Math.round(wpm),
    hesitations,
    estimated: true,
  };
}

/** Short verdict for the score badge. */
export function scoreLabel(overall: number): string {
  if (overall >= 90) return "Excellent";
  if (overall >= 75) return "Good";
  if (overall >= 55) return "Getting there";
  if (overall > 0) return "Keep practising";
  return "No speech detected";
}
