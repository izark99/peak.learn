"use client";

/**
 * Wrapper around the browser SpeechRecognition API.
 *
 * The API is still prefixed in Chrome and absent in Firefox, and TypeScript's
 * DOM lib doesn't declare it, so the shapes we depend on are declared here.
 */

type SpeechRecognitionAlternative = { transcript: string; confidence: number };
type SpeechRecognitionResult = {
  readonly length: number;
  isFinal: boolean;
  [index: number]: SpeechRecognitionAlternative;
};
type SpeechRecognitionResultList = {
  readonly length: number;
  [index: number]: SpeechRecognitionResult;
};

type SpeechRecognitionEventLike = {
  resultIndex: number;
  results: SpeechRecognitionResultList;
};

type SpeechRecognitionErrorEventLike = { error: string; message?: string };

type SpeechRecognitionLike = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
  onend: (() => void) | null;
  onspeechend: (() => void) | null;
};

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

function getConstructor(): SpeechRecognitionConstructor | null {
  if (typeof window === "undefined") return null;
  const scope = window as unknown as {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  };
  return scope.SpeechRecognition ?? scope.webkitSpeechRecognition ?? null;
}

export function isSpeechRecognitionSupported(): boolean {
  return getConstructor() !== null;
}

export type RecognitionResult = {
  transcript: string;
  confidence: number;
  durationMs: number;
};

export class RecognitionError extends Error {
  constructor(
    message: string,
    readonly code: string,
  ) {
    super(message);
    this.name = "RecognitionError";
  }
}

/** Turn the API's terse error codes into something worth showing a user. */
function describeError(code: string): string {
  switch (code) {
    case "not-allowed":
    case "service-not-allowed":
      return "Microphone access was blocked. Allow it in your browser settings and try again.";
    case "no-speech":
      return "No speech was detected. Try again a little louder.";
    case "audio-capture":
      return "No microphone was found.";
    case "network":
      return "Speech recognition needs a network connection.";
    case "aborted":
      return "Recording stopped.";
    default:
      return "Speech recognition failed. Please try again.";
  }
}

/**
 * Record one utterance and resolve with the transcript.
 *
 * `stop()` on the returned handle ends recording early; the promise still
 * resolves with whatever was captured.
 */
export function listenOnce(
  lang: string,
  { maxDurationMs = 15000 }: { maxDurationMs?: number } = {},
): { promise: Promise<RecognitionResult>; stop: () => void } {
  const Recognition = getConstructor();

  if (!Recognition) {
    return {
      promise: Promise.reject(
        new RecognitionError(
          "This browser can't record speech. Chrome, Edge or Safari will work.",
          "unsupported",
        ),
      ),
      stop: () => {},
    };
  }

  const recognition = new Recognition();
  recognition.lang = lang;
  recognition.continuous = false;
  // Interim results let the UI show words as they're recognised.
  recognition.interimResults = true;
  recognition.maxAlternatives = 1;

  const startedAt = Date.now();
  let transcript = "";
  let confidence = 0;
  let settled = false;

  const promise = new Promise<RecognitionResult>((resolve, reject) => {
    const finish = () => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timeout);
      resolve({
        transcript: transcript.trim(),
        confidence,
        durationMs: Date.now() - startedAt,
      });
    };

    const timeout = window.setTimeout(() => {
      recognition.stop();
    }, maxDurationMs);

    recognition.onresult = (event) => {
      // Collect only finalised results; interim ones are re-emitted and would
      // otherwise be counted twice.
      let text = "";
      for (let i = 0; i < event.results.length; i += 1) {
        const result = event.results[i];
        if (result.isFinal) {
          text += `${result[0].transcript} `;
          confidence = Math.max(confidence, result[0].confidence || 0);
        }
      }
      if (text.trim().length > 0) transcript = text;
    };

    recognition.onerror = (event) => {
      if (settled) return;

      // "no-speech" and "aborted" are normal outcomes, not failures — resolve
      // with whatever we have so the caller can score an empty attempt.
      if (event.error === "no-speech" || event.error === "aborted") {
        finish();
        return;
      }

      settled = true;
      window.clearTimeout(timeout);
      reject(new RecognitionError(describeError(event.error), event.error));
    };

    recognition.onend = finish;
  });

  try {
    recognition.start();
  } catch {
    // start() throws if a recognition session is already running.
  }

  return { promise, stop: () => recognition.stop() };
}
