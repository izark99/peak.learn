"use client";

import Link from "next/link";
import { useActionState } from "react";

import { signIn, signUp, type AuthState } from "@/app/(auth)/actions";
import { Button, Input, Label } from "@/components/ui";

export function AuthForm({
  mode,
  next,
  initialError,
}: {
  mode: "login" | "signup";
  next?: string;
  initialError?: string;
}) {
  const action = mode === "login" ? signIn : signUp;
  const [state, formAction, pending] = useActionState<AuthState, FormData>(
    action,
    initialError ? { error: initialError } : null,
  );

  return (
    <form action={formAction} className="space-y-4">
      {next ? <input type="hidden" name="next" value={next} /> : null}

      {mode === "signup" ? (
        <div>
          <Label htmlFor="display_name">Name</Label>
          <Input
            id="display_name"
            name="display_name"
            autoComplete="name"
            placeholder="Sam"
          />
        </div>
      ) : null}

      <div>
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder="you@example.com"
        />
      </div>

      <div>
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          name="password"
          type="password"
          required
          autoComplete={mode === "login" ? "current-password" : "new-password"}
          placeholder={mode === "signup" ? "At least 8 characters" : "••••••••"}
        />
      </div>

      {state?.error ? (
        <p
          role="alert"
          className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger"
        >
          {state.error}
        </p>
      ) : null}

      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending
          ? "One moment…"
          : mode === "login"
            ? "Sign in"
            : "Create account"}
      </Button>

      <p className="text-center text-sm text-ink-muted">
        {mode === "login" ? (
          <>
            New here?{" "}
            <Link href="/signup" className="text-accent hover:underline">
              Create an account
            </Link>
          </>
        ) : (
          <>
            Already have an account?{" "}
            <Link href="/login" className="text-accent hover:underline">
              Sign in
            </Link>
          </>
        )}
      </p>
    </form>
  );
}
