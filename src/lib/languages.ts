/**
 * Languages offered in the picker. The five the original app leads with come
 * first, then the rest alphabetically — the "50+ languages" claim needs the
 * long tail to actually be selectable.
 *
 * `speechCode` is the BCP-47 tag handed to the browser's SpeechRecognition and
 * SpeechSynthesis APIs. Where a language needs a region to get a voice at all
 * (Korean, Japanese, Chinese), the region is pinned.
 */
export type Language = {
  code: string;
  name: string;
  nativeName: string;
  speechCode: string;
};

export const FEATURED_LANGUAGES: Language[] = [
  { code: "en", name: "English", nativeName: "English", speechCode: "en-US" },
  { code: "ko", name: "Korean", nativeName: "한국어", speechCode: "ko-KR" },
  { code: "ja", name: "Japanese", nativeName: "日本語", speechCode: "ja-JP" },
  { code: "zh", name: "Chinese", nativeName: "中文", speechCode: "zh-CN" },
  { code: "es", name: "Spanish", nativeName: "Español", speechCode: "es-ES" },
];

export const OTHER_LANGUAGES: Language[] = [
  { code: "ar", name: "Arabic", nativeName: "العربية", speechCode: "ar-SA" },
  { code: "bn", name: "Bengali", nativeName: "বাংলা", speechCode: "bn-BD" },
  { code: "bg", name: "Bulgarian", nativeName: "Български", speechCode: "bg-BG" },
  { code: "ca", name: "Catalan", nativeName: "Català", speechCode: "ca-ES" },
  { code: "hr", name: "Croatian", nativeName: "Hrvatski", speechCode: "hr-HR" },
  { code: "cs", name: "Czech", nativeName: "Čeština", speechCode: "cs-CZ" },
  { code: "da", name: "Danish", nativeName: "Dansk", speechCode: "da-DK" },
  { code: "nl", name: "Dutch", nativeName: "Nederlands", speechCode: "nl-NL" },
  { code: "et", name: "Estonian", nativeName: "Eesti", speechCode: "et-EE" },
  { code: "fi", name: "Finnish", nativeName: "Suomi", speechCode: "fi-FI" },
  { code: "fr", name: "French", nativeName: "Français", speechCode: "fr-FR" },
  { code: "de", name: "German", nativeName: "Deutsch", speechCode: "de-DE" },
  { code: "el", name: "Greek", nativeName: "Ελληνικά", speechCode: "el-GR" },
  { code: "he", name: "Hebrew", nativeName: "עברית", speechCode: "he-IL" },
  { code: "hi", name: "Hindi", nativeName: "हिन्दी", speechCode: "hi-IN" },
  { code: "hu", name: "Hungarian", nativeName: "Magyar", speechCode: "hu-HU" },
  { code: "is", name: "Icelandic", nativeName: "Íslenska", speechCode: "is-IS" },
  { code: "id", name: "Indonesian", nativeName: "Indonesia", speechCode: "id-ID" },
  { code: "it", name: "Italian", nativeName: "Italiano", speechCode: "it-IT" },
  { code: "lv", name: "Latvian", nativeName: "Latviešu", speechCode: "lv-LV" },
  { code: "lt", name: "Lithuanian", nativeName: "Lietuvių", speechCode: "lt-LT" },
  { code: "ms", name: "Malay", nativeName: "Melayu", speechCode: "ms-MY" },
  { code: "no", name: "Norwegian", nativeName: "Norsk", speechCode: "nb-NO" },
  { code: "fa", name: "Persian", nativeName: "فارسی", speechCode: "fa-IR" },
  { code: "pl", name: "Polish", nativeName: "Polski", speechCode: "pl-PL" },
  { code: "pt", name: "Portuguese", nativeName: "Português", speechCode: "pt-PT" },
  { code: "ro", name: "Romanian", nativeName: "Română", speechCode: "ro-RO" },
  { code: "ru", name: "Russian", nativeName: "Русский", speechCode: "ru-RU" },
  { code: "sr", name: "Serbian", nativeName: "Српски", speechCode: "sr-RS" },
  { code: "sk", name: "Slovak", nativeName: "Slovenčina", speechCode: "sk-SK" },
  { code: "sl", name: "Slovenian", nativeName: "Slovenščina", speechCode: "sl-SI" },
  { code: "sw", name: "Swahili", nativeName: "Kiswahili", speechCode: "sw-KE" },
  { code: "sv", name: "Swedish", nativeName: "Svenska", speechCode: "sv-SE" },
  { code: "tl", name: "Tagalog", nativeName: "Tagalog", speechCode: "fil-PH" },
  { code: "ta", name: "Tamil", nativeName: "தமிழ்", speechCode: "ta-IN" },
  { code: "th", name: "Thai", nativeName: "ไทย", speechCode: "th-TH" },
  { code: "tr", name: "Turkish", nativeName: "Türkçe", speechCode: "tr-TR" },
  { code: "uk", name: "Ukrainian", nativeName: "Українська", speechCode: "uk-UA" },
  { code: "ur", name: "Urdu", nativeName: "اردو", speechCode: "ur-PK" },
  { code: "vi", name: "Vietnamese", nativeName: "Tiếng Việt", speechCode: "vi-VN" },
  { code: "cy", name: "Welsh", nativeName: "Cymraeg", speechCode: "cy-GB" },
];

export const ALL_LANGUAGES: Language[] = [...FEATURED_LANGUAGES, ...OTHER_LANGUAGES];

const BY_CODE = new Map(ALL_LANGUAGES.map((l) => [l.code, l]));

export function getLanguage(code: string): Language | undefined {
  return BY_CODE.get(code);
}

export function languageName(code: string): string {
  return BY_CODE.get(code)?.name ?? code;
}

/** BCP-47 tag for the Web Speech APIs, falling back to the raw code. */
export function speechCode(code: string): string {
  return BY_CODE.get(code)?.speechCode ?? code;
}
