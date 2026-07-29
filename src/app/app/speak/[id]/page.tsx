import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";

import { Conversation } from "@/app/app/speak/[id]/conversation";
import { requireProfile } from "@/lib/data/profile";
import { speechCode } from "@/lib/languages";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Conversation" };

export default async function ScenarioPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { profile } = await requireProfile();
  const supabase = await createClient();

  const { data: scenario } = await supabase
    .from("speaking_scenarios")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (!scenario) notFound();

  const { data: cards } = scenario.required_card_ids.length
    ? await supabase.from("cards").select("term").in("id", scenario.required_card_ids)
    : { data: [] };

  return (
    <div className="space-y-4">
      <header>
        <Link
          href="/app/speak"
          className="inline-flex items-center gap-1 text-sm text-ink-faint hover:text-ink"
        >
          <ChevronLeft className="size-4" aria-hidden />
          Scenarios
        </Link>
        <h1 className="mt-2 text-xl font-semibold tracking-tight">
          {scenario.title}
        </h1>
        <p className="mt-1 text-sm text-ink-muted">
          {scenario.setting} You are {scenario.user_role.toLowerCase()}.
        </p>
      </header>

      <Conversation
        scenarioId={scenario.id}
        speechLang={speechCode(
          // Templates are language-neutral, so they follow the learner's own
          // target language rather than a fixed one.
          scenario.target_language === "any"
            ? profile.target_language
            : scenario.target_language,
        )}
        requiredTerms={(cards ?? []).map((card) => card.term)}
      />
    </div>
  );
}
