"use client";

import { useSyncExternalStore } from "react";

import { isSpeechRecognitionSupported } from "@/lib/speech/recognition";
import { isSpeechSynthesisSupported } from "@/lib/speech/tts";

/**
 * Browser capability checks as external-store reads.
 *
 * These can't run during server render, and setting them from an effect
 * triggers a cascading re-render. `useSyncExternalStore` is the primitive
 * built for exactly this: a server snapshot for the initial HTML, a client
 * snapshot after hydration, and no extra render pass.
 *
 * Support never changes within a page load, so `subscribe` is a no-op.
 */
const neverChanges = () => () => {};

/**
 * The server snapshot assumes support. Rendering the mic controls and then
 * hiding them reads better than the reverse, where an unsupported-browser
 * warning would flash for everyone on first paint.
 */
const assumeSupported = () => true;

export function useSpeechRecognitionSupport(): boolean {
  return useSyncExternalStore(
    neverChanges,
    isSpeechRecognitionSupported,
    assumeSupported,
  );
}

export function useSpeechSynthesisSupport(): boolean {
  return useSyncExternalStore(
    neverChanges,
    isSpeechSynthesisSupported,
    assumeSupported,
  );
}
