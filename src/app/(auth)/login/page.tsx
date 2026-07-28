import type { Metadata } from "next";

import { AuthForm } from "@/app/(auth)/auth-form";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const { next, error } = await searchParams;

  return (
    <>
      <h1 className="text-xl font-semibold">Welcome back</h1>
      <p className="mt-1 mb-6 text-sm text-ink-muted">
        Pick up your streak where you left it.
      </p>
      <AuthForm mode="login" next={next} initialError={error} />
    </>
  );
}
