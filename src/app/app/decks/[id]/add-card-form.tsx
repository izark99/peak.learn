"use client";

import { useActionState, useEffect, useRef } from "react";

import { addCard, type ActionState } from "@/app/app/decks/actions";
import { Button, Input, Label } from "@/components/ui";

export function AddCardForm({ deckId }: { deckId: string }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    addCard,
    null,
  );

  // Clear the fields after a successful add so several cards can be entered
  // in a row without reaching for the mouse.
  useEffect(() => {
    if (state && "notice" in state) {
      formRef.current?.reset();
    }
  }, [state]);

  return (
    <form ref={formRef} action={formAction} className="space-y-4">
      <input type="hidden" name="deck_id" value={deckId} />

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="term">Term</Label>
          <Input id="term" name="term" required placeholder="식당" />
        </div>
        <div>
          <Label htmlFor="translation">Translation</Label>
          <Input id="translation" name="translation" placeholder="restaurant" />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="phonetic">Pronunciation</Label>
          <Input id="phonetic" name="phonetic" placeholder="sikdang" />
        </div>
        <div>
          <Label htmlFor="example_sentence">Example</Label>
          <Input
            id="example_sentence"
            name="example_sentence"
            placeholder="식당에 갈까요?"
          />
        </div>
      </div>

      {state && "error" in state ? (
        <p role="alert" className="text-sm text-danger">
          {state.error}
        </p>
      ) : null}
      {state && "notice" in state && state.notice ? (
        <p role="status" className="text-sm text-success">
          {state.notice}
        </p>
      ) : null}

      <Button type="submit" disabled={pending}>
        {pending ? "Adding…" : "Add card"}
      </Button>
    </form>
  );
}
