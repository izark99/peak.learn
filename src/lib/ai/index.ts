import "server-only";

import { generateStructured, isAiConfigured, type Effort } from "@/lib/ai/client";
import {
  mockConversationReply,
  mockExercises,
  mockScenario,
  mockVocabFromImage,
  mockVocabFromText,
} from "@/lib/ai/mock";
import {
  ConversationReplySchema,
  ExerciseSetSchema,
  GeneratedScenarioSchema,
  VocabSetSchema,
  type ConversationReply,
  type ExerciseSet,
  type GeneratedScenario,
  type VocabSet,
} from "@/lib/ai/schemas";
import { languageName } from "@/lib/languages";

/**
 * The app's AI surface. Every function returns the same envelope and silently
 * degrades to the mock generator when no API key is configured, so callers
 * never branch on whether Claude is available — they just report `usedMock`.
 */
export type AiOutcome<T> = {
  data: T;
  model: string;
  inputTokens: number | null;
  outputTokens: number | null;
  usedMock: boolean;
};

function mocked<T>(data: T): AiOutcome<T> {
  return { data, model: "mock", inputTokens: null, outputTokens: null, usedMock: true };
}

function tutorSystem(targetLanguage: string, nativeLanguage: string): string {
  return [
    `You build study material for someone whose first language is ${languageName(nativeLanguage)}`,
    `and who is learning ${languageName(targetLanguage)}.`,
    "",
    `Every "term", "example_sentence", "prompt" and "answer" must be written in ${languageName(targetLanguage)}.`,
    `Every "translation" and "*_translation" must be written in ${languageName(nativeLanguage)}.`,
    "",
    "Choose words that are genuinely useful to a learner rather than the rarest words available.",
    "Skip proper nouns, numerals, and words that are identical in both languages.",
  ].join("\n");
}

export async function generateVocabFromText({
  text,
  targetLanguage,
  nativeLanguage,
  count = 12,
  level = "beginner",
}: {
  text: string;
  targetLanguage: string;
  nativeLanguage: string;
  count?: number;
  level?: string;
}): Promise<AiOutcome<VocabSet>> {
  if (!isAiConfigured()) {
    return mocked(mockVocabFromText(text, count));
  }

  const result = await generateStructured({
    schema: VocabSetSchema,
    system: tutorSystem(targetLanguage, nativeLanguage),
    content: [
      {
        type: "text",
        text: [
          `Pull out up to ${count} vocabulary items at ${level} level from the passage below.`,
          "Give the deck a short title describing the passage's subject.",
          "",
          "Passage:",
          text.slice(0, 20000),
        ].join("\n"),
      },
    ],
    effort: "medium",
  });

  return { ...result, usedMock: false };
}

export async function generateVocabFromImage({
  imageBase64,
  mediaType,
  targetLanguage,
  nativeLanguage,
  count = 12,
  level = "beginner",
}: {
  imageBase64: string;
  mediaType: "image/jpeg" | "image/png" | "image/webp" | "image/gif";
  targetLanguage: string;
  nativeLanguage: string;
  count?: number;
  level?: string;
}): Promise<AiOutcome<VocabSet>> {
  if (!isAiConfigured()) {
    return mocked(mockVocabFromImage(count));
  }

  const result = await generateStructured({
    schema: VocabSetSchema,
    system: tutorSystem(targetLanguage, nativeLanguage),
    content: [
      {
        type: "image",
        source: { type: "base64", media_type: mediaType, data: imageBase64 },
      },
      {
        type: "text",
        text: [
          `Read the text in this image and build up to ${count} vocabulary cards at ${level} level.`,
          "It may be a menu, a page from a book, a sign, or a screenshot.",
          "Title the deck after what the image actually shows.",
          "If the image contains no readable text, return an empty cards array.",
        ].join("\n"),
      },
    ],
    // Vision + extraction benefits from a little more room to work.
    effort: "high",
  });

  return { ...result, usedMock: false };
}

export async function generateExercises({
  terms,
  targetLanguage,
  nativeLanguage,
  count = 8,
}: {
  terms: string[];
  targetLanguage: string;
  nativeLanguage: string;
  count?: number;
}): Promise<AiOutcome<ExerciseSet>> {
  if (!isAiConfigured()) {
    return mocked(mockExercises(terms, count));
  }

  const result = await generateStructured({
    schema: ExerciseSetSchema,
    system: tutorSystem(targetLanguage, nativeLanguage),
    content: [
      {
        type: "text",
        text: [
          `Write ${count} short grammar exercises built around these words:`,
          terms.slice(0, 40).join(", "),
          "",
          "Mix the three kinds roughly evenly:",
          `- translate: prompt in ${languageName(nativeLanguage)}, answer in ${languageName(targetLanguage)}.`,
          "- word_order: put the full correct sentence in `answer`, and its words SHUFFLED in `tokens`.",
          "- fill_blank: put the sentence with ___ where the missing word goes in `prompt`, the missing word in `answer`.",
          "",
          "List reasonable alternative phrasings in accepted_answers so correct answers are not marked wrong.",
        ].join("\n"),
      },
    ],
    effort: "medium",
  });

  return { ...result, usedMock: false };
}

export async function generateScenario({
  topic,
  targetLanguage,
  nativeLanguage,
  level = "beginner",
  terms = [],
}: {
  topic: string;
  targetLanguage: string;
  nativeLanguage: string;
  level?: string;
  terms?: string[];
}): Promise<AiOutcome<GeneratedScenario>> {
  if (!isAiConfigured()) {
    return mocked(mockScenario(topic));
  }

  const result = await generateStructured({
    schema: GeneratedScenarioSchema,
    system: tutorSystem(targetLanguage, nativeLanguage),
    content: [
      {
        type: "text",
        text: [
          `Design a speaking practice scenario about: ${topic}`,
          `Aim it at a ${level} learner.`,
          terms.length > 0
            ? `Build it so these words come up naturally: ${terms.slice(0, 20).join(", ")}`
            : "",
          `Write opening_line in ${languageName(targetLanguage)}; everything else in ${languageName(nativeLanguage)}.`,
        ]
          .filter(Boolean)
          .join("\n"),
      },
    ],
    effort: "medium",
    maxTokens: 2000,
  });

  return { ...result, usedMock: false };
}

export async function generateConversationReply({
  scenario,
  history,
  userMessage,
  requiredTerms,
  targetLanguage,
  nativeLanguage,
  effort = "low",
}: {
  scenario: {
    title: string;
    setting: string;
    ai_role: string;
    user_role: string;
  };
  history: Array<{ speaker: "user" | "ai"; text: string }>;
  userMessage: string;
  requiredTerms: string[];
  targetLanguage: string;
  nativeLanguage: string;
  effort?: Effort;
}): Promise<AiOutcome<ConversationReply>> {
  if (!isAiConfigured()) {
    return mocked(
      mockConversationReply(userMessage, requiredTerms, history.length),
    );
  }

  const transcript = history
    .map((turn) => `${turn.speaker === "ai" ? "You" : "Learner"}: ${turn.text}`)
    .join("\n");

  const result = await generateStructured({
    schema: ConversationReplySchema,
    system: [
      `You are playing "${scenario.ai_role}" in a spoken language-practice scenario.`,
      `Setting: ${scenario.setting}`,
      `The learner is "${scenario.user_role}", practising ${languageName(targetLanguage)}.`,
      "",
      `Speak only ${languageName(targetLanguage)} in the reply field, and keep it to one or`,
      "two short sentences — this is meant to be said out loud. Stay in character and",
      "always end in a way that invites the learner to respond.",
      "",
      `Write reply_translation in ${languageName(nativeLanguage)} — it is the safety net`,
      "for a learner who did not follow the reply.",
      "",
      requiredTerms.length > 0
        ? `Steer the conversation so the learner has reason to use: ${requiredTerms.join(", ")}`
        : "",
      "",
      "In `used_terms`, list only the required terms that actually appear in the learner's",
      "latest message. Leave `correction` empty unless they made a clear mistake worth",
      "mentioning; when they did, keep it to one encouraging sentence.",
    ]
      .filter(Boolean)
      .join("\n"),
    content: [
      {
        type: "text",
        text: [
          transcript ? `Conversation so far:\n${transcript}` : "The conversation is just starting.",
          "",
          `Learner just said: ${userMessage}`,
        ].join("\n"),
      },
    ],
    effort,
    maxTokens: 1500,
  });

  return { ...result, usedMock: false };
}
