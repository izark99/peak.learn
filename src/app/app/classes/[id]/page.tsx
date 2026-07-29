import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";

import { leaveClass, removeStudent } from "@/app/app/classes/actions";
import { AssignDeckForm } from "@/app/app/classes/class-forms";
import { Badge, Button, Card, Progress } from "@/components/ui";
import { requireProfile } from "@/lib/data/profile";
import { languageName } from "@/lib/languages";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Class" };

export default async function ClassPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { userId } = await requireProfile();
  const supabase = await createClient();

  const { data: klass } = await supabase
    .from("classes")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (!klass) notFound();

  const isTeacher = klass.teacher_id === userId;

  const [{ data: members }, { data: assignments }, { data: myDecks }] =
    await Promise.all([
      supabase
        .from("class_members")
        .select("user_id, role, joined_at")
        .eq("class_id", id),
      supabase
        .from("class_assignments")
        .select("id, deck_id, title, due_at, created_at")
        .eq("class_id", id)
        .order("created_at", { ascending: false }),
      isTeacher
        ? supabase
            .from("decks")
            .select("id, title")
            .eq("owner_id", userId)
            .order("updated_at", { ascending: false })
        : Promise.resolve({ data: [] }),
    ]);

  const studentIds = (members ?? [])
    .filter((member) => member.role === "student")
    .map((member) => member.user_id);

  const assignmentIds = (assignments ?? []).map((assignment) => assignment.id);
  const deckIds = (assignments ?? []).map((assignment) => assignment.deck_id);

  // Teachers can read their students' profiles via the shares_class_with
  // policy; students only ever see their own.
  const [{ data: profiles }, { data: progress }, { data: decks }] = await Promise.all([
    studentIds.length
      ? supabase.from("profiles").select("id, display_name").in("id", studentIds)
      : Promise.resolve({ data: [] }),
    assignmentIds.length
      ? supabase
          .from("assignment_progress")
          .select("assignment_id, user_id, cards_completed, accuracy")
          .in("assignment_id", assignmentIds)
      : Promise.resolve({ data: [] }),
    deckIds.length
      ? supabase.from("decks").select("id, title").in("id", deckIds)
      : Promise.resolve({ data: [] }),
  ]);

  const nameById = new Map(
    (profiles ?? []).map((profile) => [profile.id, profile.display_name]),
  );
  const deckById = new Map((decks ?? []).map((deck) => [deck.id, deck.title]));

  const progressFor = (assignmentId: string, studentId: string) =>
    (progress ?? []).find(
      (row) => row.assignment_id === assignmentId && row.user_id === studentId,
    );

  return (
    <div className="space-y-8">
      <header>
        <Link
          href="/app/classes"
          className="inline-flex items-center gap-1 text-sm text-ink-faint hover:text-ink"
        >
          <ChevronLeft className="size-4" aria-hidden />
          Classes
        </Link>

        <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{klass.name}</h1>
            <p className="mt-1 text-sm text-ink-muted">
              {languageName(klass.target_language)} ·{" "}
              {studentIds.length} student{studentIds.length === 1 ? "" : "s"}
            </p>
            {klass.description ? (
              <p className="mt-2 max-w-prose text-sm text-ink-muted">
                {klass.description}
              </p>
            ) : null}
          </div>

          {isTeacher ? (
            <div className="rounded-card border border-accent/30 bg-accent-soft px-4 py-2 text-center">
              <p className="text-xs text-ink-muted">Join code</p>
              <p className="font-mono text-lg tracking-widest text-accent">
                {klass.join_code}
              </p>
            </div>
          ) : (
            <form action={leaveClass}>
              <input type="hidden" name="class_id" value={klass.id} />
              <Button type="submit" variant="danger" size="sm">
                Leave class
              </Button>
            </form>
          )}
        </div>
      </header>

      {isTeacher ? (
        <section>
          <h2 className="mb-2 text-sm font-medium text-ink-muted">Assign a deck</h2>
          <Card>
            <AssignDeckForm classId={klass.id} decks={myDecks ?? []} />
          </Card>
        </section>
      ) : null}

      <section>
        <h2 className="mb-2 text-sm font-medium text-ink-muted">Assignments</h2>

        {!assignments || assignments.length === 0 ? (
          <p className="rounded-card border border-dashed border-border px-4 py-6 text-center text-sm text-ink-muted">
            Nothing assigned yet.
          </p>
        ) : (
          <ul className="space-y-3">
            {assignments.map((assignment) => {
              const mine = progressFor(assignment.id, userId);

              return (
                <li key={assignment.id}>
                  <Card>
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <h3 className="font-medium text-ink">
                          {assignment.title || deckById.get(assignment.deck_id) || "Deck"}
                        </h3>
                        <p className="mt-0.5 text-xs text-ink-faint">
                          {assignment.due_at
                            ? `Due ${new Date(assignment.due_at).toLocaleDateString()}`
                            : "No due date"}
                        </p>
                      </div>
                      <Link
                        href={`/app/decks/${assignment.deck_id}/study/flashcards`}
                        className="text-sm text-accent hover:underline"
                      >
                        Study
                      </Link>
                    </div>

                    {isTeacher ? (
                      <div className="mt-4 space-y-2">
                        {studentIds.length === 0 ? (
                          <p className="text-sm text-ink-faint">
                            No students have joined yet.
                          </p>
                        ) : (
                          studentIds.map((studentId) => {
                            const row = progressFor(assignment.id, studentId);
                            return (
                              <div
                                key={studentId}
                                className="flex items-center gap-3 text-sm"
                              >
                                <span className="w-32 shrink-0 truncate text-ink-muted">
                                  {nameById.get(studentId) || "Student"}
                                </span>
                                <Progress
                                  value={row?.cards_completed ?? 0}
                                  max={Math.max(20, row?.cards_completed ?? 0)}
                                  className="flex-1"
                                />
                                <span className="w-24 shrink-0 text-right text-xs tabular-nums text-ink-faint">
                                  {row
                                    ? `${row.cards_completed} · ${Math.round(row.accuracy * 100)}%`
                                    : "not started"}
                                </span>
                              </div>
                            );
                          })
                        )}
                      </div>
                    ) : (
                      <p className="mt-3 text-xs text-ink-faint">
                        {mine
                          ? `${mine.cards_completed} cards studied · ${Math.round(mine.accuracy * 100)}% correct`
                          : "Not started"}
                      </p>
                    )}
                  </Card>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {isTeacher ? (
        <section>
          <h2 className="mb-2 text-sm font-medium text-ink-muted">Roster</h2>
          {studentIds.length === 0 ? (
            <p className="rounded-card border border-dashed border-border px-4 py-6 text-center text-sm text-ink-muted">
              Share the join code above to add students.
            </p>
          ) : (
            <ul className="divide-y divide-border overflow-hidden rounded-card border border-border bg-surface">
              {studentIds.map((studentId) => (
                <li
                  key={studentId}
                  className="flex items-center justify-between gap-3 p-3"
                >
                  <span className="text-sm text-ink">
                    {nameById.get(studentId) || "Student"}
                  </span>
                  <form action={removeStudent}>
                    <input type="hidden" name="class_id" value={klass.id} />
                    <input type="hidden" name="student_id" value={studentId} />
                    <button
                      type="submit"
                      className="text-xs text-ink-faint transition-colors hover:text-danger"
                    >
                      Remove
                    </button>
                  </form>
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : null}

      {isTeacher ? (
        <Badge>Classes are free — teachers and students, no limits.</Badge>
      ) : null}
    </div>
  );
}
