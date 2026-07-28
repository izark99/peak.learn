"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  generateVocabFromImage,
  generateVocabFromText,
  type AiOutcome,
} from "@/lib/ai";
import { AiError, isSupportedImageType } from "@/lib/ai/client";
import type { VocabSet } from "@/lib/ai/schemas";
import { requireProfile } from "@/lib/data/profile";
import { createClient } from "@/lib/supabase/server";

export type ActionState = { error: string } | { notice: string } | null;

/** Largest photo we will base64 into a vision request. */
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

function fail(message: string): ActionState {
  return { error: message };
}

export async function createDeck(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { userId, profile } = await requireProfile();

  const title = String(formData.get("title") ?? "").trim();
  if (!title) return fail("Give the deck a title.");

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("decks")
    .insert({
      owner_id: userId,
      title: title.slice(0, 200),
      description: String(formData.get("description") ?? "").trim(),
      source_language: String(formData.get("source_language") ?? profile.native_language),
      target_language: String(formData.get("target_language") ?? profile.target_language),
      origin: "manual",
    })
    .select("id")
    .single();

  if (error || !data) return fail(error?.message ?? "Could not create the deck.");

  revalidatePath("/app/decks");
  redirect(`/app/decks/${data.id}`);
}

type SaveResult = { ok: true; deckId: string } | { ok: false; error: string };

/**
 * Persist a generated set as a deck plus its cards, and record the generation
 * for the user's own usage history.
 */
async function saveGeneratedDeck({
  userId,
  outcome,
  sourceLanguage,
  targetLanguage,
  origin,
  kind,
  inputSummary,
  fallbackTitle,
}: {
  userId: string;
  outcome: AiOutcome<VocabSet>;
  sourceLanguage: string;
  targetLanguage: string;
  origin: "text" | "image";
  kind: "vocab_from_text" | "vocab_from_image";
  inputSummary: string;
  fallbackTitle: string;
}): Promise<SaveResult> {
  const supabase = await createClient();
  const { data: generated } = outcome;

  if (generated.cards.length === 0) {
    return {
      ok: false,
      error:
        origin === "image"
          ? "No readable text was found in that image. Try a clearer photo."
          : "No usable vocabulary was found in that text.",
    };
  }

  const { data: deck, error: deckError } = await supabase
    .from("decks")
    .insert({
      owner_id: userId,
      title: (generated.deck_title || fallbackTitle).slice(0, 200),
      description: `Generated from ${origin === "image" ? "a photo" : "text"}.`,
      source_language: sourceLanguage,
      target_language: targetLanguage,
      origin,
    })
    .select("id")
    .single();

  if (deckError || !deck) {
    return { ok: false, error: deckError?.message ?? "Could not save the deck." };
  }

  const { error: cardsError } = await supabase.from("cards").insert(
    generated.cards.map((card, index) => ({
      deck_id: deck.id,
      term: card.term.slice(0, 500),
      translation: card.translation,
      phonetic: card.phonetic,
      part_of_speech: card.part_of_speech,
      example_sentence: card.example_sentence,
      example_translation: card.example_translation,
      synonyms: card.synonyms,
      confusables: card.confusables,
      position: index,
    })),
  );

  if (cardsError) {
    // Don't strand an empty deck the user then has to clean up themselves.
    await supabase.from("decks").delete().eq("id", deck.id);
    return { ok: false, error: cardsError.message };
  }

  await supabase.from("ai_generations").insert({
    user_id: userId,
    kind,
    input_summary: inputSummary.slice(0, 200),
    model: outcome.model,
    input_tokens: outcome.inputTokens,
    output_tokens: outcome.outputTokens,
  });

  return { ok: true, deckId: deck.id };
}

export async function createDeckFromText(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { userId, profile } = await requireProfile();

  const text = String(formData.get("text") ?? "").trim();
  if (text.length < 20) {
    return fail("Paste a bit more text — at least a couple of sentences.");
  }

  const targetLanguage = String(formData.get("target_language") ?? profile.target_language);
  const count = Number(formData.get("count") ?? 12);

  let outcome: AiOutcome<VocabSet>;
  try {
    outcome = await generateVocabFromText({
      text,
      targetLanguage,
      nativeLanguage: profile.native_language,
      count: Number.isFinite(count) ? Math.min(40, Math.max(4, count)) : 12,
      level: String(formData.get("level") ?? "beginner"),
    });
  } catch (error) {
    return fail(
      error instanceof AiError ? error.message : "Generation failed. Please try again.",
    );
  }

  const saved = await saveGeneratedDeck({
    userId,
    outcome,
    sourceLanguage: profile.native_language,
    targetLanguage,
    origin: "text",
    kind: "vocab_from_text",
    inputSummary: text.slice(0, 200),
    fallbackTitle: "Pasted text",
  });

  if (!saved.ok) return fail(saved.error);

  revalidatePath("/app/decks");
  redirect(`/app/decks/${saved.deckId}`);
}

export async function createDeckFromImage(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { userId, profile } = await requireProfile();

  const file = formData.get("image");
  if (!(file instanceof File) || file.size === 0) {
    return fail("Choose a photo first.");
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return fail("That image is larger than 5 MB. Try a smaller one.");
  }
  if (!isSupportedImageType(file.type)) {
    // HEIC is the common case here — iPhones shoot it by default.
    return fail(
      `${file.type || "That format"} can't be read. Use a JPEG, PNG, WebP or GIF.`,
    );
  }

  const targetLanguage = String(formData.get("target_language") ?? profile.target_language);
  const count = Number(formData.get("count") ?? 12);
  const imageBase64 = Buffer.from(await file.arrayBuffer()).toString("base64");

  let outcome: AiOutcome<VocabSet>;
  try {
    outcome = await generateVocabFromImage({
      imageBase64,
      mediaType: file.type,
      targetLanguage,
      nativeLanguage: profile.native_language,
      count: Number.isFinite(count) ? Math.min(40, Math.max(4, count)) : 12,
      level: String(formData.get("level") ?? "beginner"),
    });
  } catch (error) {
    return fail(
      error instanceof AiError ? error.message : "Generation failed. Please try again.",
    );
  }

  const saved = await saveGeneratedDeck({
    userId,
    outcome,
    sourceLanguage: profile.native_language,
    targetLanguage,
    origin: "image",
    kind: "vocab_from_image",
    inputSummary: file.name,
    fallbackTitle: "From photo",
  });

  if (!saved.ok) return fail(saved.error);

  revalidatePath("/app/decks");
  redirect(`/app/decks/${saved.deckId}`);
}

export async function addCard(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireProfile();

  const deckId = String(formData.get("deck_id") ?? "");
  const term = String(formData.get("term") ?? "").trim();
  if (!deckId || !term) return fail("A card needs at least a term.");

  const supabase = await createClient();

  // Append to the end of the deck.
  const { count } = await supabase
    .from("cards")
    .select("id", { count: "exact", head: true })
    .eq("deck_id", deckId);

  const { error } = await supabase.from("cards").insert({
    deck_id: deckId,
    term: term.slice(0, 500),
    translation: String(formData.get("translation") ?? "").trim(),
    phonetic: String(formData.get("phonetic") ?? "").trim(),
    example_sentence: String(formData.get("example_sentence") ?? "").trim(),
    position: count ?? 0,
  });

  // RLS rejects writes to a deck the caller doesn't own, so this covers
  // authorisation as well as genuine failures.
  if (error) return fail(error.message);

  revalidatePath(`/app/decks/${deckId}`);
  return { notice: "Card added." };
}

export async function deleteCard(formData: FormData) {
  await requireProfile();

  const cardId = String(formData.get("card_id") ?? "");
  const deckId = String(formData.get("deck_id") ?? "");
  if (!cardId) return;

  const supabase = await createClient();
  await supabase.from("cards").delete().eq("id", cardId);

  revalidatePath(`/app/decks/${deckId}`);
}

export async function deleteDeck(formData: FormData) {
  await requireProfile();

  const deckId = String(formData.get("deck_id") ?? "");
  if (!deckId) return;

  const supabase = await createClient();
  // Cards, review states and logs cascade from the deck's foreign keys.
  await supabase.from("decks").delete().eq("id", deckId);

  revalidatePath("/app/decks");
  redirect("/app/decks");
}
