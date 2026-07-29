"use client";

import { useActionState, useState } from "react";
import { FileText, ImageIcon, PenLine } from "lucide-react";

import {
  createDeck,
  createDeckFromImage,
  createDeckFromText,
  type ActionState,
} from "@/app/app/decks/actions";
import { Button, Card, Input, Label, Select, Textarea } from "@/components/ui";
import { ALL_LANGUAGES, FEATURED_LANGUAGES } from "@/lib/languages";
import { cn } from "@/lib/utils";

type Mode = "photo" | "text" | "manual";

const MODES: Array<{ id: Mode; label: string; icon: typeof PenLine; blurb: string }> = [
  {
    id: "photo",
    label: "From a photo",
    icon: ImageIcon,
    blurb: "Point your camera at a menu, a page, or a sign.",
  },
  {
    id: "text",
    label: "From text",
    icon: FileText,
    blurb: "Paste an article, lyrics, or a chat transcript.",
  },
  {
    id: "manual",
    label: "By hand",
    icon: PenLine,
    blurb: "Start empty and add your own cards.",
  },
];

function LanguagePicker({
  name,
  defaultValue,
  label,
}: {
  name: string;
  defaultValue: string;
  label: string;
}) {
  return (
    <div>
      <Label htmlFor={name}>{label}</Label>
      <Select id={name} name={name} defaultValue={defaultValue}>
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
    </div>
  );
}

function Feedback({ state }: { state: ActionState }) {
  if (!state || !("error" in state)) return null;
  return (
    <p
      role="alert"
      className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger"
    >
      {state.error}
    </p>
  );
}

export function NewDeckForm({
  nativeLanguage,
  targetLanguage,
  aiConfigured,
}: {
  nativeLanguage: string;
  targetLanguage: string;
  aiConfigured: boolean;
}) {
  const [mode, setMode] = useState<Mode>("photo");

  const [photoState, photoAction, photoPending] = useActionState<ActionState, FormData>(
    createDeckFromImage,
    null,
  );
  const [textState, textAction, textPending] = useActionState<ActionState, FormData>(
    createDeckFromText,
    null,
  );
  const [manualState, manualAction, manualPending] = useActionState<ActionState, FormData>(
    createDeck,
    null,
  );

  return (
    <div className="space-y-5">
      <div className="grid gap-2 sm:grid-cols-3" role="tablist">
        {MODES.map(({ id, label, icon: Icon, blurb }) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={mode === id}
            onClick={() => setMode(id)}
            className={cn(
              "rounded-card border p-4 text-left transition-colors",
              mode === id
                ? "border-accent bg-accent-soft"
                : "border-border bg-surface hover:border-border-strong",
            )}
          >
            <Icon
              className={cn("size-5", mode === id ? "text-accent" : "text-ink-faint")}
              aria-hidden
            />
            <span className="mt-2 block text-sm font-medium text-ink">{label}</span>
            <span className="mt-0.5 block text-xs text-ink-muted">{blurb}</span>
          </button>
        ))}
      </div>

      {!aiConfigured && mode !== "manual" ? (
        <p className="rounded-lg border border-warning/30 bg-warning/10 px-3 py-2 text-sm text-warning">
          No <code>ANTHROPIC_API_KEY</code> is set, so this will produce clearly-labelled
          sample cards instead of real ones. Everything else works normally.
        </p>
      ) : null}

      <Card>
        {mode === "photo" ? (
          <form action={photoAction} className="space-y-4">
            <div>
              <Label htmlFor="image">Photo</Label>
              <Input
                id="image"
                name="image"
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                capture="environment"
                required
                className="h-auto py-2 file:mr-3 file:rounded-md file:border-0 file:bg-surface file:px-3 file:py-1 file:text-sm file:text-ink"
              />
              <p className="mt-1 text-xs text-ink-faint">
                JPEG, PNG, WebP or GIF, up to 5 MB. iPhone HEIC photos need converting
                first.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <LanguagePicker
                name="target_language"
                defaultValue={targetLanguage}
                label="Language being learned"
              />
              <div>
                <Label htmlFor="photo-count">Cards to make</Label>
                <Input
                  id="photo-count"
                  name="count"
                  type="number"
                  min={4}
                  max={40}
                  defaultValue={12}
                />
              </div>
            </div>

            <Feedback state={photoState} />
            <Button type="submit" size="lg" disabled={photoPending}>
              {photoPending ? "Reading the photo…" : "Create deck"}
            </Button>
          </form>
        ) : null}

        {mode === "text" ? (
          <form action={textAction} className="space-y-4">
            <div>
              <Label htmlFor="text">Text</Label>
              <Textarea
                id="text"
                name="text"
                rows={8}
                required
                placeholder="Paste an article, a song, a conversation…"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <LanguagePicker
                name="target_language"
                defaultValue={targetLanguage}
                label="Language"
              />
              <div>
                <Label htmlFor="level">Level</Label>
                <Select id="level" name="level" defaultValue="beginner">
                  <option value="beginner">Beginner</option>
                  <option value="intermediate">Intermediate</option>
                  <option value="advanced">Advanced</option>
                </Select>
              </div>
              <div>
                <Label htmlFor="text-count">Cards</Label>
                <Input
                  id="text-count"
                  name="count"
                  type="number"
                  min={4}
                  max={40}
                  defaultValue={12}
                />
              </div>
            </div>

            <Feedback state={textState} />
            <Button type="submit" size="lg" disabled={textPending}>
              {textPending ? "Picking out vocabulary…" : "Create deck"}
            </Button>
          </form>
        ) : null}

        {mode === "manual" ? (
          <form action={manualAction} className="space-y-4">
            <div>
              <Label htmlFor="title">Title</Label>
              <Input id="title" name="title" required placeholder="Kitchen vocabulary" />
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" name="description" rows={2} />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <LanguagePicker
                name="source_language"
                defaultValue={nativeLanguage}
                label="You speak"
              />
              <LanguagePicker
                name="target_language"
                defaultValue={targetLanguage}
                label="You're learning"
              />
            </div>

            <Feedback state={manualState} />
            <Button type="submit" size="lg" disabled={manualPending}>
              {manualPending ? "Creating…" : "Create deck"}
            </Button>
          </form>
        ) : null}
      </Card>
    </div>
  );
}
