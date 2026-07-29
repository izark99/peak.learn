import "server-only";

import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import type { z } from "zod";

/**
 * The single place that touches the Anthropic API key. Everything else calls
 * `generateStructured`, so the key never has a path to the browser.
 *
 * When ANTHROPIC_API_KEY is unset the caller falls back to the deterministic
 * generator in ./mock.ts, which keeps every screen usable without credentials.
 */

const DEFAULT_MODEL = "claude-opus-5";

export type Effort = "low" | "medium" | "high" | "xhigh" | "max";

export type StructuredResult<T> = {
  data: T;
  model: string;
  inputTokens: number | null;
  outputTokens: number | null;
};

let client: Anthropic | null = null;

function getClient(): Anthropic {
  if (!client) {
    client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return client;
}

export function isAiConfigured(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

export function activeModel(): string {
  return process.env.ANTHROPIC_MODEL || DEFAULT_MODEL;
}

/**
 * Ask Claude for a value matching `schema`.
 *
 * Uses structured outputs rather than prose parsing: the schema is enforced by
 * the API, and `messages.parse` re-validates the response, so a malformed
 * result throws here instead of landing half-formed in the database.
 */
export async function generateStructured<S extends z.ZodType>({
  schema,
  system,
  content,
  effort = "medium",
  maxTokens = 8000,
}: {
  schema: S;
  system: string;
  /** Text, or text plus images for the photo-to-flashcard path. */
  content: Anthropic.ContentBlockParam[];
  effort?: Effort;
  maxTokens?: number;
}): Promise<StructuredResult<z.infer<S>>> {
  const model = activeModel();

  const response = await getClient().messages.parse({
    model,
    max_tokens: maxTokens,
    system,
    // Thinking is on by default on Opus 5. Left on deliberately: disabling it
    // is what makes the model leak <thinking> tags into its output, which
    // would corrupt a structured response. Cost is controlled with `effort`.
    output_config: {
      effort,
      format: zodOutputFormat(schema),
    },
    messages: [{ role: "user", content }],
  });

  if (response.stop_reason === "refusal") {
    throw new AiError(
      "The request was declined by the model's safety system. Try different source material.",
    );
  }

  if (response.stop_reason === "max_tokens") {
    throw new AiError(
      "The response was cut off. Try again with a shorter passage or fewer cards.",
    );
  }

  // parsed_output is null when the response could not be validated.
  if (!response.parsed_output) {
    throw new AiError("The model returned an unusable response. Please try again.");
  }

  return {
    data: response.parsed_output as z.infer<S>,
    model,
    inputTokens: response.usage?.input_tokens ?? null,
    outputTokens: response.usage?.output_tokens ?? null,
  };
}

/** Errors safe to show the user verbatim. */
export class AiError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AiError";
  }
}

/** Media types the vision API accepts. HEIC is not among them. */
export const SUPPORTED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
] as const;

export function isSupportedImageType(
  mediaType: string,
): mediaType is (typeof SUPPORTED_IMAGE_TYPES)[number] {
  return (SUPPORTED_IMAGE_TYPES as readonly string[]).includes(mediaType);
}
