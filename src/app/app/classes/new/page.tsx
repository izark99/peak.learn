import type { Metadata } from "next";

import { CreateClassForm } from "@/app/app/classes/class-forms";
import { Card } from "@/components/ui";
import { requireProfile } from "@/lib/data/profile";

export const metadata: Metadata = { title: "New class" };

export default async function NewClassPage() {
  const { profile } = await requireProfile();

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">New class</h1>
        <p className="mt-1 text-sm text-ink-muted">
          You&apos;ll get a join code to hand out once it&apos;s created.
        </p>
      </header>

      <Card>
        <CreateClassForm defaultLanguage={profile.target_language} />
      </Card>
    </div>
  );
}
