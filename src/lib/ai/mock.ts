import type {
  ConversationReply,
  ExerciseSet,
  GeneratedCard,
  GeneratedScenario,
  VocabSet,
} from "@/lib/ai/schemas";

/**
 * Deterministic stand-in for Claude, used when ANTHROPIC_API_KEY is unset.
 *
 * The point is that every screen — deck creation, study, grammar, speaking —
 * stays usable and testable with no credentials. Output is intentionally
 * labelled so nobody mistakes it for a real translation.
 */

const MOCK_NOTE = "[sample]";

/** Stable pseudo-random in [0,1) from a string, so output never churns. */
function seededUnit(seed: string): number {
  let hash = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return ((hash >>> 0) % 100000) / 100000;
}

const PARTS_OF_SPEECH = ["noun", "verb", "adjective", "adverb", "phrase"];

/**
 * Pull candidate vocabulary out of raw text: distinct, reasonably long words,
 * most frequent first, so the result feels related to what was pasted in.
 */
function extractTerms(text: string, limit: number): string[] {
  const counts = new Map<string, number>();

  for (const raw of text.split(/[\s\p{P}]+/u)) {
    const word = raw.trim();
    if (word.length < 4) continue;
    const key = word.toLocaleLowerCase();
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([word]) => word);
}

function buildCard(term: string, index: number): GeneratedCard {
  const pos = PARTS_OF_SPEECH[Math.floor(seededUnit(term) * PARTS_OF_SPEECH.length)];
  return {
    term,
    translation: `${MOCK_NOTE} meaning of "${term}"`,
    phonetic: term.toLocaleLowerCase().split("").join("·"),
    part_of_speech: pos,
    example_sentence: `${term} — used here in a sentence.`,
    example_translation: `${MOCK_NOTE} translation of the example for "${term}".`,
    synonyms: [`${term}-alt`],
    // Neighbouring terms make plausible distractors in the test mode.
    confusables: [`${term}${index % 2 === 0 ? "e" : "a"}`],
  };
}

export function mockVocabFromText(text: string, count: number): VocabSet {
  const terms = extractTerms(text, count);
  const fallback = Array.from(
    { length: Math.max(0, count - terms.length) },
    (_, i) => `sample${i + 1}`,
  );

  return {
    deck_title: `Sample set ${MOCK_NOTE}`,
    detected_language: "en",
    cards: [...terms, ...fallback].map(buildCard),
  };
}

/**
 * There is no OCR without a model, so the photo path returns a fixed set. The
 * UI tells the user this is sample data rather than pretending it read the
 * image.
 */
export function mockVocabFromImage(count: number): VocabSet {
  const terms = [
    "menu",
    "breakfast",
    "receipt",
    "reserve",
    "recommend",
    "delicious",
    "vegetarian",
    "allergy",
    "portion",
    "dessert",
  ];

  return {
    deck_title: `From photo ${MOCK_NOTE}`,
    detected_language: "en",
    cards: terms.slice(0, count).map(buildCard),
  };
}

export function mockExercises(
  terms: string[],
  count: number,
): ExerciseSet {
  const pool = terms.length > 0 ? terms : ["sample"];

  const exercises = Array.from({ length: count }, (_, i) => {
    const term = pool[i % pool.length];
    const sentence = `I would like the ${term} please`;
    const words = sentence.split(" ");

    if (i % 3 === 0) {
      return {
        kind: "word_order" as const,
        prompt: `${MOCK_NOTE} Arrange the words: "${sentence}"`,
        answer: sentence,
        accepted_answers: [],
        // Deterministic shuffle so tests and reloads agree.
        tokens: [...words].sort(
          (a, b) => seededUnit(a + term) - seededUnit(b + term),
        ),
        hint: "Subject, verb, then object.",
      };
    }

    if (i % 3 === 1) {
      return {
        kind: "translate" as const,
        prompt: `${MOCK_NOTE} Translate: "${sentence}"`,
        answer: sentence,
        accepted_answers: [sentence.toLocaleLowerCase()],
        tokens: [],
        hint: `Uses the word "${term}".`,
      };
    }

    return {
      kind: "fill_blank" as const,
      prompt: `${MOCK_NOTE} I would like the ___ please`,
      answer: term,
      accepted_answers: [term.toLocaleLowerCase()],
      tokens: [],
      hint: "One word.",
    };
  });

  return { exercises };
}

export function mockScenario(title: string): GeneratedScenario {
  return {
    title: `${title} ${MOCK_NOTE}`,
    description: "A short practice conversation generated without a model.",
    setting: "A quiet cafe in the afternoon.",
    ai_role: "A friendly local",
    user_role: "A visitor practising the language",
    level: "beginner",
    opening_line: "Hello! Good to see you. How has your day been?",
  };
}

/**
 * Keeps the conversation moving and — importantly — really does check which
 * required terms the learner used, so the vocab tracking in the UI is honest
 * even on the mock path.
 */
export function mockConversationReply(
  userMessage: string,
  requiredTerms: string[],
  turnIndex: number,
): ConversationReply {
  const lowered = userMessage.toLocaleLowerCase();
  const used = requiredTerms.filter((term) =>
    lowered.includes(term.toLocaleLowerCase()),
  );

  const prompts = [
    "That makes sense. Can you tell me a bit more?",
    "Interesting — and what did you do after that?",
    "Nice. How did you feel about it?",
    "Good. What would you like to do next?",
  ];

  return {
    reply: prompts[turnIndex % prompts.length],
    reply_translation: `${MOCK_NOTE} translation of the reply.`,
    used_terms: used,
    correction: "",
  };
}
