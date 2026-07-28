"use client";

import { useActionState } from "react";

import {
  assignDeck,
  createClass,
  joinClass,
  type ClassState,
} from "@/app/app/classes/actions";
import { Button, Input, Label, Select, Textarea } from "@/components/ui";
import { ALL_LANGUAGES } from "@/lib/languages";

function Feedback({ state }: { state: ClassState }) {
  if (!state) return null;
  if ("error" in state) {
    return (
      <p role="alert" className="w-full text-sm text-danger">
        {state.error}
      </p>
    );
  }
  return (
    <p role="status" className="w-full text-sm text-success">
      {state.notice}
    </p>
  );
}

export function JoinClassForm() {
  const [state, formAction, pending] = useActionState<ClassState, FormData>(
    joinClass,
    null,
  );

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-3">
      <div className="min-w-44 flex-1">
        <Label htmlFor="join_code">Class code</Label>
        <Input
          id="join_code"
          name="join_code"
          required
          maxLength={6}
          placeholder="7KDQP4"
          // Codes are stored uppercase; showing them that way avoids
          // "it says my code is wrong" when the student types lowercase.
          className="uppercase tracking-widest"
          autoCapitalize="characters"
          autoComplete="off"
        />
      </div>
      <Button type="submit" variant="secondary" disabled={pending}>
        {pending ? "Joining…" : "Join class"}
      </Button>
      <Feedback state={state} />
    </form>
  );
}

export function CreateClassForm({ defaultLanguage }: { defaultLanguage: string }) {
  const [state, formAction, pending] = useActionState<ClassState, FormData>(
    createClass,
    null,
  );

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <Label htmlFor="name">Class name</Label>
        <Input id="name" name="name" required placeholder="Year 9 Spanish" />
      </div>

      <div>
        <Label htmlFor="description">Description</Label>
        <Textarea id="description" name="description" rows={2} />
      </div>

      <div>
        <Label htmlFor="target_language">Language</Label>
        <Select
          id="target_language"
          name="target_language"
          defaultValue={defaultLanguage}
        >
          {ALL_LANGUAGES.map((language) => (
            <option key={language.code} value={language.code}>
              {language.name}
            </option>
          ))}
        </Select>
      </div>

      <Feedback state={state} />
      <Button type="submit" size="lg" disabled={pending}>
        {pending ? "Creating…" : "Create class"}
      </Button>
    </form>
  );
}

export function AssignDeckForm({
  classId,
  decks,
}: {
  classId: string;
  decks: Array<{ id: string; title: string }>;
}) {
  const [state, formAction, pending] = useActionState<ClassState, FormData>(
    assignDeck,
    null,
  );

  if (decks.length === 0) {
    return (
      <p className="text-sm text-ink-faint">
        You have no decks to assign yet. Create one first.
      </p>
    );
  }

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-3">
      <input type="hidden" name="class_id" value={classId} />

      <div className="min-w-44 flex-1">
        <Label htmlFor="deck_id">Deck</Label>
        <Select id="deck_id" name="deck_id" defaultValue={decks[0]?.id}>
          {decks.map((deck) => (
            <option key={deck.id} value={deck.id}>
              {deck.title}
            </option>
          ))}
        </Select>
      </div>

      <div className="w-44">
        <Label htmlFor="due_at">Due (optional)</Label>
        <Input id="due_at" name="due_at" type="date" />
      </div>

      <Button type="submit" disabled={pending}>
        {pending ? "Assigning…" : "Assign"}
      </Button>
      <Feedback state={state} />
    </form>
  );
}
