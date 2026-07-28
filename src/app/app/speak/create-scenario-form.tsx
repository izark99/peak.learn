"use client";

import { useActionState } from "react";

import { createScenario, type SpeakState } from "@/app/app/speak/actions";
import { Button, Input, Label, Select } from "@/components/ui";

export function CreateScenarioForm() {
  const [state, formAction, pending] = useActionState<SpeakState, FormData>(
    createScenario,
    null,
  );

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-3">
      <div className="min-w-56 flex-1">
        <Label htmlFor="topic">What do you want to practise?</Label>
        <Input
          id="topic"
          name="topic"
          required
          placeholder="Returning something to a shop"
        />
      </div>

      <div className="w-36">
        <Label htmlFor="level">Level</Label>
        <Select id="level" name="level" defaultValue="beginner">
          <option value="beginner">Beginner</option>
          <option value="intermediate">Intermediate</option>
          <option value="advanced">Advanced</option>
        </Select>
      </div>

      <Button type="submit" disabled={pending}>
        {pending ? "Writing the scene…" : "Create"}
      </Button>

      {state && "error" in state ? (
        <p role="alert" className="w-full text-sm text-danger">
          {state.error}
        </p>
      ) : null}
    </form>
  );
}
