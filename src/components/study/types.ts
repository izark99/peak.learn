/** The card fields the study modes actually need. */
export type StudyCard = {
  id: string;
  term: string;
  translation: string;
  phonetic: string;
  example_sentence: string;
  synonyms: string[];
  confusables: string[];
};

/** What a mode reports back after the learner answers one card. */
export type AnswerOutcome = {
  cardId: string;
  /** 1 Again · 2 Hard · 3 Good · 4 Easy — fed straight to the scheduler. */
  rating: 1 | 2 | 3 | 4;
  correct: boolean;
};

export type ModeProps = {
  cards: StudyCard[];
  /** BCP-47 tag for speech synthesis, e.g. "ko-KR". */
  speechLang: string;
  onAnswer: (outcome: AnswerOutcome) => void;
  onFinish: () => void;
};
