import type { Metadata } from "next";
import Link from "next/link";

import { GenerateExercisesForm } from "@/app/app/grammar/generate-form";
import { GrammarPractice } from "@/app/app/grammar/grammar-practice";
import { EmptyState, buttonStyles } from "@/components/ui";
import { requireProfile } from "@/lib/data/profile";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Grammar" };

export default async function GrammarPage() {
  const { userId } = await requireProfile();
  const supabase = await createClient();

  const [{ data: decks }, { data: exercises }] = await Promise.all([
    supabase
      .from("decks")
      .select("id, title")
      .eq("owner_id", userId)
      .order("updated_at", { ascending: false }),
    supabase
      .from("grammar_exercises")
      .select("id, kind, prompt, answer, accepted_answers, tokens, hint")
      .eq("owner_id", userId)
      .order("created_at", { ascending: false })
      .limit(8),
  ]);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Grammar</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Translate sentences and rebuild word order using words you already know.
        </p>
      </header>

      {!decks || decks.length === 0 ? (
        <EmptyState
          title="No decks yet"
          description="Grammar exercises are built from the vocabulary in your decks, so make a deck first."
          action={
            <Link href="/app/decks/new" className={buttonStyles()}>
              New deck
            </Link>
          }
        />
      ) : (
        <>
          <div className="rounded-card border border-border bg-surface p-4">
            <GenerateExercisesForm decks={decks} defaultDeckId={decks[0]?.id} />
          </div>

          {exercises && exercises.length > 0 ? (
            <GrammarPractice exercises={exercises} />
          ) : (
            <EmptyState
              title="No exercises yet"
              description="Pick a deck above and generate a set to get started."
            />
          )}
        </>
      )}
    </div>
  );
}
