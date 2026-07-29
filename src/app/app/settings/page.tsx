import type { Metadata } from "next";

import { signOut } from "@/app/(auth)/actions";
import { SettingsForm } from "@/app/app/settings/settings-form";
import { Button, Card } from "@/components/ui";
import { isAiConfigured } from "@/lib/ai/client";
import { requireProfile } from "@/lib/data/profile";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const { profile } = await requireProfile();

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
      </header>

      <Card>
        <SettingsForm profile={profile} />
      </Card>

      {!isAiConfigured() ? (
        <Card className="border-warning/30 bg-warning/5">
          <h2 className="text-sm font-medium text-warning">AI features are in sample mode</h2>
          <p className="mt-1 text-sm text-ink-muted">
            No <code className="font-mono text-xs">ANTHROPIC_API_KEY</code> is set, so
            card generation, grammar exercises and the speaking partner return
            clearly-labelled sample content. Add a key to{" "}
            <code className="font-mono text-xs">.env.local</code> and restart to switch
            them on — nothing else changes.
          </p>
        </Card>
      ) : null}

      <Card>
        <h2 className="text-sm font-medium text-ink">Account</h2>
        <p className="mt-1 text-sm text-ink-muted">
          Signed in as {profile.display_name || "learner"}.
        </p>
        <form action={signOut} className="mt-3">
          <Button type="submit" variant="secondary" size="sm">
            Sign out
          </Button>
        </form>
      </Card>
    </div>
  );
}
