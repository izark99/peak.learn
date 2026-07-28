"use client";

/**
 * Text-to-speech via the browser's SpeechSynthesis API. No keys, no network —
 * but voice availability varies by platform, so every call degrades quietly
 * rather than throwing.
 */

export function isSpeechSynthesisSupported(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

/**
 * Voices load asynchronously in Chrome: the first getVoices() call often
 * returns an empty array, and the list only populates after a voiceschanged
 * event. This resolves once they're actually available.
 */
function loadVoices(): Promise<SpeechSynthesisVoice[]> {
  return new Promise((resolve) => {
    const existing = window.speechSynthesis.getVoices();
    if (existing.length > 0) {
      resolve(existing);
      return;
    }

    const timeout = window.setTimeout(() => resolve([]), 1000);
    window.speechSynthesis.addEventListener(
      "voiceschanged",
      () => {
        window.clearTimeout(timeout);
        resolve(window.speechSynthesis.getVoices());
      },
      { once: true },
    );
  });
}

/** Best available voice for a BCP-47 tag, preferring an exact region match. */
async function pickVoice(lang: string): Promise<SpeechSynthesisVoice | null> {
  const voices = await loadVoices();
  if (voices.length === 0) return null;

  const target = lang.toLowerCase();
  const base = target.split("-")[0];

  return (
    voices.find((voice) => voice.lang.toLowerCase() === target) ??
    voices.find((voice) => voice.lang.toLowerCase().startsWith(base)) ??
    null
  );
}

/**
 * Speak `text`, resolving when playback finishes. Resolves immediately when
 * synthesis is unavailable so callers never hang waiting for audio that will
 * not arrive.
 */
export async function speak(
  text: string,
  lang: string,
  { rate = 0.9 }: { rate?: number } = {},
): Promise<void> {
  if (!isSpeechSynthesisSupported() || !text.trim()) return;

  // Cancel anything still playing, or utterances queue up and overlap.
  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = lang;
  // Slightly under natural pace: this is a learner hearing a new word.
  utterance.rate = rate;

  const voice = await pickVoice(lang);
  if (voice) utterance.voice = voice;

  return new Promise((resolve) => {
    // Some platforms never fire `end`; the timeout keeps the UI responsive.
    const timeout = window.setTimeout(resolve, 8000);
    const done = () => {
      window.clearTimeout(timeout);
      resolve();
    };
    utterance.onend = done;
    utterance.onerror = done;
    window.speechSynthesis.speak(utterance);
  });
}

export function stopSpeaking() {
  if (isSpeechSynthesisSupported()) {
    window.speechSynthesis.cancel();
  }
}
