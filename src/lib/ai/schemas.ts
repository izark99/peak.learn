import { z } from "zod";

/**
 * Shapes Claude is constrained to return. These are handed to the API as JSON
 * schemas via `zodOutputFormat`, so the model cannot reply with prose or a
 * differently-shaped object — and the same schema re-validates the result
 * before anything reaches the database.
 *
 * Structured outputs reject numeric and string length constraints, so keep
 * these to plain types; enforce limits after parsing instead.
 */

export const GeneratedCardSchema = z.object({
  term: z.string().describe("The vocabulary item in the target language"),
  translation: z.string().describe("Meaning in the learner's native language"),
  phonetic: z
    .string()
    .describe("Romanisation, pinyin or IPA. Empty string when not useful."),
  part_of_speech: z.string().describe("noun, verb, adjective, phrase, …"),
  example_sentence: z.string().describe("A natural sentence using the term"),
  example_translation: z.string().describe("Translation of the example"),
  synonyms: z.array(z.string()).describe("Close synonyms in the target language"),
  confusables: z
    .array(z.string())
    .describe(
      "Words learners commonly mix this one up with. Used as quiz distractors.",
    ),
});

export const VocabSetSchema = z.object({
  deck_title: z.string().describe("A short title for this set of cards"),
  detected_language: z
    .string()
    .describe("ISO 639-1 code of the language the source text is in"),
  cards: z.array(GeneratedCardSchema),
});

export const GeneratedExerciseSchema = z.object({
  kind: z.enum(["translate", "word_order", "fill_blank"]),
  prompt: z.string().describe("What the learner is shown"),
  answer: z.string().describe("The canonical correct answer"),
  accepted_answers: z
    .array(z.string())
    .describe("Other answers that should also be marked correct"),
  tokens: z
    .array(z.string())
    .describe(
      "For word_order: the words to arrange, already shuffled. Empty otherwise.",
    ),
  hint: z.string().describe("A short grammar hint. Empty string if none."),
});

export const ExerciseSetSchema = z.object({
  exercises: z.array(GeneratedExerciseSchema),
});

export const GeneratedScenarioSchema = z.object({
  title: z.string(),
  description: z.string(),
  setting: z.string().describe("Where the conversation takes place"),
  ai_role: z.string().describe("Who the AI plays"),
  user_role: z.string().describe("Who the learner plays"),
  level: z.enum(["beginner", "intermediate", "advanced"]),
  opening_line: z.string().describe("The AI's first line, in the target language"),
});

export const ConversationReplySchema = z.object({
  reply: z.string().describe("The AI's next line, in the target language"),
  reply_translation: z
    .string()
    .describe("Translation of the reply into the learner's native language"),
  used_terms: z
    .array(z.string())
    .describe(
      "Which of the learner's required vocabulary terms appeared in their last message",
    ),
  correction: z
    .string()
    .describe(
      "A brief, encouraging correction if the learner made a clear mistake. Empty string otherwise.",
    ),
});

export type GeneratedCard = z.infer<typeof GeneratedCardSchema>;
export type VocabSet = z.infer<typeof VocabSetSchema>;
export type GeneratedExercise = z.infer<typeof GeneratedExerciseSchema>;
export type ExerciseSet = z.infer<typeof ExerciseSetSchema>;
export type GeneratedScenario = z.infer<typeof GeneratedScenarioSchema>;
export type ConversationReply = z.infer<typeof ConversationReplySchema>;
