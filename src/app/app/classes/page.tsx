import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";

import { JoinClassForm } from "@/app/app/classes/class-forms";
import { Badge, Card, EmptyState, buttonStyles } from "@/components/ui";
import { requireProfile } from "@/lib/data/profile";
import { languageName } from "@/lib/languages";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Classes" };

export default async function ClassesPage() {
  const { userId } = await requireProfile();
  const supabase = await createClient();

  // RLS limits this to classes the user teaches or belongs to.
  const { data: classes } = await supabase
    .from("classes")
    .select("id, name, description, target_language, teacher_id, join_code")
    .order("created_at", { ascending: false });

  const teaching = (classes ?? []).filter((entry) => entry.teacher_id === userId);
  const enrolled = (classes ?? []).filter((entry) => entry.teacher_id !== userId);

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Classes</h1>
          <p className="mt-1 text-sm text-ink-muted">
            Free for teachers — assign decks and follow how everyone is doing.
          </p>
        </div>
        <Link href="/app/classes/new" className={buttonStyles({ className: "shrink-0" })}>
          <Plus className="size-4" aria-hidden />
          New class
        </Link>
      </header>

      <Card>
        <h2 className="mb-3 text-sm font-medium text-ink-muted">
          Joining with a code
        </h2>
        <JoinClassForm />
      </Card>

      {teaching.length > 0 ? (
        <section>
          <h2 className="mb-2 text-sm font-medium text-ink-muted">You teach</h2>
          <ul className="grid gap-3 sm:grid-cols-2">
            {teaching.map((entry) => (
              <li key={entry.id}>
                <Link href={`/app/classes/${entry.id}`} className="block">
                  <Card className="h-full transition-colors hover:border-accent">
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="font-medium text-ink">{entry.name}</h3>
                      <Badge tone="accent">{entry.join_code}</Badge>
                    </div>
                    <p className="mt-1 text-sm text-ink-muted">
                      {entry.description || languageName(entry.target_language)}
                    </p>
                  </Card>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {enrolled.length > 0 ? (
        <section>
          <h2 className="mb-2 text-sm font-medium text-ink-muted">You&apos;re in</h2>
          <ul className="grid gap-3 sm:grid-cols-2">
            {enrolled.map((entry) => (
              <li key={entry.id}>
                <Link href={`/app/classes/${entry.id}`} className="block">
                  <Card className="h-full transition-colors hover:border-accent">
                    <h3 className="font-medium text-ink">{entry.name}</h3>
                    <p className="mt-1 text-sm text-ink-muted">
                      {entry.description || languageName(entry.target_language)}
                    </p>
                  </Card>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {teaching.length === 0 && enrolled.length === 0 ? (
        <EmptyState
          title="No classes yet"
          description="Create one to share decks with a group, or join an existing class with the code your teacher gave you."
          action={
            <Link href="/app/classes/new" className={buttonStyles()}>
              Create a class
            </Link>
          }
        />
      ) : null}
    </div>
  );
}
