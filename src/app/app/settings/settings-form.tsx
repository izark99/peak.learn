"use client";

import { useActionState } from "react";

import { updateProfile, type SettingsState } from "@/app/app/settings/actions";
import { Button, Input, Label, Select } from "@/components/ui";
import { ALL_LANGUAGES, FEATURED_LANGUAGES } from "@/lib/languages";
import type { Profile } from "@/lib/supabase/types";

function LanguageSelect({
  id,
  name,
  defaultValue,
}: {
  id: string;
  name: string;
  defaultValue: string;
}) {
  return (
    <Select id={id} name={name} defaultValue={defaultValue}>
      <optgroup label="Popular">
        {FEATURED_LANGUAGES.map((language) => (
          <option key={language.code} value={language.code}>
            {language.name}
          </option>
        ))}
      </optgroup>
      <optgroup label="All languages">
        {ALL_LANGUAGES.map((language) => (
          <option key={language.code} value={language.code}>
            {language.name} — {language.nativeName}
          </option>
        ))}
      </optgroup>
    </Select>
  );
}

export function SettingsForm({ profile }: { profile: Profile }) {
  const [state, formAction, pending] = useActionState<SettingsState, FormData>(
    updateProfile,
    null,
  );

  return (
    <form action={formAction} className="space-y-5">
      <div>
        <Label htmlFor="display_name">Name</Label>
        <Input
          id="display_name"
          name="display_name"
          defaultValue={profile.display_name}
          placeholder="Sam"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="native_language">You speak</Label>
          <LanguageSelect
            id="native_language"
            name="native_language"
            defaultValue={profile.native_language}
          />
        </div>
        <div>
          <Label htmlFor="target_language">You&apos;re learning</Label>
          <LanguageSelect
            id="target_language"
            name="target_language"
            defaultValue={profile.target_language}
          />
        </div>
      </div>

      <div>
        <Label htmlFor="daily_goal">Daily goal (cards)</Label>
        <Input
          id="daily_goal"
          name="daily_goal"
          type="number"
          min={5}
          max={500}
          step={5}
          defaultValue={profile.daily_goal}
          className="max-w-32"
        />
      </div>

      {state && "error" in state ? (
        <p role="alert" className="text-sm text-danger">
          {state.error}
        </p>
      ) : null}
      {state && "notice" in state ? (
        <p role="status" className="text-sm text-success">
          {state.notice}
        </p>
      ) : null}

      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : "Save changes"}
      </Button>
    </form>
  );
}
