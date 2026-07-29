"use server";

import { redirect } from "next/navigation";

import { generateConversationReply, generateScenario } from "@/lib/ai";
import { AiError } from "@/lib/ai/client";
import { requireProfile } from "@/lib/data/profile";
import { createClient } from "@/lib/supabase/server";
import type { DeliveryScore, PronunciationScore } from "@/lib/speech/score";

export type SpeakState = { error: string } | null;

export type Turn = {
  speaker: "user" | "ai";
  text: string;
  translation?: string;
  score?: PronunciationScore | null;
};

async function loadScenario(scenarioId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("speaking_scenarios")
    .select("*")
    .eq("id", scenarioId)
    .maybeSingle();
  return data;
}

/**
 * Open a session and get the AI's first line, so the learner always has
 * something to respond to rather than an empty screen.
 */
export async function startConversation(scenarioId: string): Promise<
  | { sessionId: string; opening: string; openingTranslation: string; usedMock: boolean }
  | { error: string }
> {
  const { userId, profile } = await requireProfile();
  const supabase = await createClient();

  const scenario = await loadScenario(scenarioId);
  if (!scenario) return { error: "That scenario could not be found." };

  const { data: session, error } = await supabase
    .from("speaking_sessions")
    .insert({ user_id: userId, scenario_id: scenarioId })
    .select("id")
    .single();

  if (error || !session) {
    return { error: error?.message ?? "Could not start the session." };
  }

  const requiredTerms = await loadRequiredTerms(scenario.required_card_ids);

  try {
    const outcome = await generateConversationReply({
      scenario: {
        title: scenario.title,
        setting: scenario.setting,
        ai_role: scenario.ai_role,
        user_role: scenario.user_role,
      },
      history: [],
      userMessage:
        "(The learner has just arrived. Open the scene in character with a short greeting.)",
      requiredTerms,
      targetLanguage: profile.target_language,
      nativeLanguage: profile.native_language,
    });

    await supabase.from("speaking_turns").insert({
      session_id: session.id,
      speaker: "ai",
      text: outcome.data.reply,
    });

    return {
      sessionId: session.id,
      opening: outcome.data.reply,
      openingTranslation: outcome.data.reply_translation,
      usedMock: outcome.usedMock,
    };
  } catch (error) {
    return {
      error:
        error instanceof AiError ? error.message : "Could not start the conversation.",
    };
  }
}

async function loadRequiredTerms(cardIds: string[]): Promise<string[]> {
  if (!cardIds || cardIds.length === 0) return [];

  const supabase = await createClient();
  const { data } = await supabase.from("cards").select("term").in("id", cardIds);
  return (data ?? []).map((card) => card.term);
}

/**
 * Store the learner's spoken turn with its pronunciation score, then get the
 * AI's response.
 */
export async function speakTurn({
  sessionId,
  scenarioId,
  text,
  score,
  audioDurationMs,
  history,
}: {
  sessionId: string;
  scenarioId: string;
  text: string;
  /**
   * Delivery scoring for a free-speech turn, or full pronunciation scoring
   * when the turn came from a repeat-after-me drill. Stored as jsonb either
   * way; `estimated` marks which fields are measured.
   */
  score: DeliveryScore | PronunciationScore | null;
  audioDurationMs: number;
  history: Array<{ speaker: "user" | "ai"; text: string }>;
}): Promise<
  | { reply: string; translation: string; usedTerms: string[]; correction: string }
  | { error: string }
> {
  const { profile } = await requireProfile();
  const supabase = await createClient();

  const scenario = await loadScenario(scenarioId);
  if (!scenario) return { error: "That scenario could not be found." };

  const requiredTerms = await loadRequiredTerms(scenario.required_card_ids);

  await supabase.from("speaking_turns").insert({
    session_id: sessionId,
    speaker: "user",
    text,
    audio_duration_ms: audioDurationMs,
    pronunciation_score: score ? JSON.parse(JSON.stringify(score)) : null,
  });

  try {
    const outcome = await generateConversationReply({
      scenario: {
        title: scenario.title,
        setting: scenario.setting,
        ai_role: scenario.ai_role,
        user_role: scenario.user_role,
      },
      history,
      userMessage: text,
      requiredTerms,
      targetLanguage: profile.target_language,
      nativeLanguage: profile.native_language,
    });

    await supabase.from("speaking_turns").insert({
      session_id: sessionId,
      speaker: "ai",
      text: outcome.data.reply,
    });

    // history holds every prior turn; +2 for the pair just added.
    const turnCount = history.length + 2;
    await supabase
      .from("speaking_sessions")
      .update({
        turn_count: turnCount,
        vocab_used_count: outcome.data.used_terms.length,
      })
      .eq("id", sessionId);

    return {
      reply: outcome.data.reply,
      translation: outcome.data.reply_translation,
      usedTerms: outcome.data.used_terms,
      correction: outcome.data.correction,
    };
  } catch (error) {
    return {
      error: error instanceof AiError ? error.message : "Could not get a reply.",
    };
  }
}

export async function endConversation(sessionId: string) {
  await requireProfile();
  const supabase = await createClient();

  await supabase
    .from("speaking_sessions")
    .update({ ended_at: new Date().toISOString() })
    .eq("id", sessionId);
}

/** Create a custom scenario from a one-line topic. */
export async function createScenario(
  _prev: SpeakState,
  formData: FormData,
): Promise<SpeakState> {
  const { userId, profile } = await requireProfile();
  const supabase = await createClient();

  const topic = String(formData.get("topic") ?? "").trim();
  if (!topic) return { error: "Describe the situation you want to practise." };

  let scenarioId: string;

  try {
    const outcome = await generateScenario({
      topic,
      targetLanguage: profile.target_language,
      nativeLanguage: profile.native_language,
      level: String(formData.get("level") ?? "beginner"),
    });

    const { data, error } = await supabase
      .from("speaking_scenarios")
      .insert({
        owner_id: userId,
        title: outcome.data.title,
        description: outcome.data.description,
        setting: outcome.data.setting,
        ai_role: outcome.data.ai_role,
        user_role: outcome.data.user_role,
        level: outcome.data.level,
        target_language: profile.target_language,
        is_template: false,
      })
      .select("id")
      .single();

    if (error || !data) return { error: error?.message ?? "Could not save it." };

    await supabase.from("ai_generations").insert({
      user_id: userId,
      kind: "scenario",
      input_summary: topic.slice(0, 200),
      model: outcome.model,
      input_tokens: outcome.inputTokens,
      output_tokens: outcome.outputTokens,
    });

    scenarioId = data.id;
  } catch (error) {
    return {
      error:
        error instanceof AiError ? error.message : "Could not build that scenario.",
    };
  }

  redirect(`/app/speak/${scenarioId}`);
}
