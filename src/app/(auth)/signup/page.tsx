import type { Metadata } from "next";

import { AuthForm } from "@/app/(auth)/auth-form";

export const metadata: Metadata = { title: "Create account" };

export default function SignupPage() {
  return (
    <>
      <h1 className="text-xl font-semibold">Start learning</h1>
      <p className="mt-1 mb-6 text-sm text-ink-muted">
        Free, and it stays free — every study mode is unlocked.
      </p>
      <AuthForm mode="signup" />
    </>
  );
}
