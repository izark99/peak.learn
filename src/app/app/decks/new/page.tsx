import type { Metadata } from "next";

import { NewDeckForm } from "@/app/app/decks/new/new-deck-form";
import { isAiConfigured } from "@/lib/ai/client";
import { requireProfile } from "@/lib/data/profile";

export const metadata: Metadata = { title: "New deck" };

export default async function NewDeckPage() {
  const { profile } = await requireProfile();

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">New deck</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Three ways in — pick whichever suits what you have to hand.
        </p>
      </header>

      <NewDeckForm
        nativeLanguage={profile.native_language}
        targetLanguage={profile.target_language}
        aiConfigured={isAiConfigured()}
      />
    </div>
  );
}
