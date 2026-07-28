/** The five study modes, in the order they're offered on a deck. */
export const STUDY_MODES = [
  {
    id: "flashcards",
    label: "Flashcards",
    blurb: "Flip, then rate how well you knew it.",
  },
  {
    id: "learn",
    label: "Learn",
    blurb: "Multiple choice first, typing once it sticks.",
  },
  {
    id: "dictation",
    label: "Dictation",
    blurb: "Hear the word, type what you hear.",
  },
  { id: "test", label: "Test", blurb: "A mixed quiz, graded at the end." },
  { id: "match", label: "Match", blurb: "Pair terms against the clock." },
] as const;

export type StudyMode = (typeof STUDY_MODES)[number]["id"];

const IDS = new Set(STUDY_MODES.map((mode) => mode.id));

export function isStudyMode(value: string): value is StudyMode {
  return IDS.has(value as StudyMode);
}

export function studyModeLabel(mode: StudyMode): string {
  return STUDY_MODES.find((entry) => entry.id === mode)?.label ?? mode;
}
