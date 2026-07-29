"use client";

import { useActionState } from "react";

import { buildExercises, type GrammarState } from "@/app/app/grammar/actions";
import { Button, Label, Select } from "@/components/ui";

export function GenerateExercisesForm({
  decks,
  defaultDeckId,
}: {
  decks: Array<{ id: string; title: string }>;
  defaultDeckId?: string;
}) {
  const [state, formAction, pending] = useActionState<GrammarState, FormData>(
    buildExercises,
    null,
  );

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-3">
      <div className="min-w-52 flex-1">
        <Label htmlFor="deck_id">Build from deck</Label>
        <Select id="deck_id" name="deck_id" defaultValue={defaultDeckId}>
          {decks.map((deck) => (
            <option key={deck.id} value={deck.id}>
              {deck.title}
            </option>
          ))}
        </Select>
      </div>

      <Button type="submit" disabled={pending}>
        {pending ? "Writing exercises…" : "Generate"}
      </Button>

      {state && "error" in state ? (
        <p role="alert" className="w-full text-sm text-danger">
          {state.error}
        </p>
      ) : null}
    </form>
  );
}
