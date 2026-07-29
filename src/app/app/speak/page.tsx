import type { Metadata } from "next";
import Link from "next/link";

import { CreateScenarioForm } from "@/app/app/speak/create-scenario-form";
import { Badge, Card } from "@/components/ui";
import { requireProfile } from "@/lib/data/profile";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Speaking" };

export default async function SpeakPage() {
  await requireProfile();
  const supabase = await createClient();

  // RLS already limits this to the user's own scenarios plus shared templates.
  const { data: scenarios } = await supabase
    .from("speaking_scenarios")
    .select("id, title, description, level, is_template")
    .order("is_template", { ascending: false })
    .order("created_at", { ascending: false });

  const mine = (scenarios ?? []).filter((scenario) => !scenario.is_template);
  const templates = (scenarios ?? []).filter((scenario) => scenario.is_template);

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Speaking</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Hold a real conversation out loud, and get feedback on how you sounded.
        </p>
      </header>

      <section>
        <h2 className="mb-2 text-sm font-medium text-ink-muted">
          Practise something specific
        </h2>
        <Card>
          <CreateScenarioForm />
        </Card>
      </section>

      {mine.length > 0 ? (
        <section>
          <h2 className="mb-2 text-sm font-medium text-ink-muted">Yours</h2>
          <ScenarioGrid scenarios={mine} />
        </section>
      ) : null}

      <section>
        <h2 className="mb-2 text-sm font-medium text-ink-muted">Ready to go</h2>
        <ScenarioGrid scenarios={templates} />
      </section>
    </div>
  );
}

function ScenarioGrid({
  scenarios,
}: {
  scenarios: Array<{
    id: string;
    title: string;
    description: string;
    level: string;
  }>;
}) {
  return (
    <ul className="grid gap-3 sm:grid-cols-2">
      {scenarios.map((scenario) => (
        <li key={scenario.id}>
          <Link href={`/app/speak/${scenario.id}`} className="block">
            <Card className="h-full transition-colors hover:border-accent">
              <div className="flex items-start justify-between gap-3">
                <h3 className="font-medium text-ink">{scenario.title}</h3>
                <Badge
                  tone={
                    scenario.level === "advanced"
                      ? "warning"
                      : scenario.level === "intermediate"
                        ? "accent"
                        : "neutral"
                  }
                >
                  {scenario.level}
                </Badge>
              </div>
              <p className="mt-1 text-sm text-ink-muted">{scenario.description}</p>
            </Card>
          </Link>
        </li>
      ))}
    </ul>
  );
}
