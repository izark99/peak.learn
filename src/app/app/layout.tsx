import Link from "next/link";
import {
  BookOpen,
  GraduationCap,
  Home,
  Layers,
  MessageCircle,
  Mic,
  Settings,
} from "lucide-react";

import { signOut } from "@/app/(auth)/actions";
import { NavLink } from "@/components/nav-link";
import { requireProfile } from "@/lib/data/profile";
import { languageName } from "@/lib/languages";

const NAV = [
  { href: "/app", label: "Dashboard", icon: Home },
  { href: "/app/review", label: "Review", icon: Layers },
  { href: "/app/decks", label: "Decks", icon: BookOpen },
  { href: "/app/grammar", label: "Grammar", icon: MessageCircle },
  { href: "/app/speak", label: "Speaking", icon: Mic },
  { href: "/app/classes", label: "Classes", icon: GraduationCap },
  { href: "/app/settings", label: "Settings", icon: Settings },
];

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { profile } = await requireProfile();

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <aside className="flex shrink-0 flex-col border-b border-border bg-surface md:h-screen md:w-60 md:border-r md:border-b-0">
        <div className="flex items-center justify-between p-4 md:block">
          <Link href="/app" className="text-lg font-semibold tracking-tight">
            peak<span className="text-accent">.learn</span>
          </Link>
          <p className="hidden text-xs text-ink-faint md:mt-1 md:block">
            Learning {languageName(profile.target_language)}
          </p>
        </div>

        {/* Horizontally scrollable on phones, vertical from md up. */}
        <nav className="flex gap-1 overflow-x-auto px-2 pb-2 md:flex-col md:overflow-visible md:px-3">
          {NAV.map(({ href, label, icon: Icon }) => (
            <NavLink key={href} href={href}>
              <Icon className="size-4 shrink-0" aria-hidden />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="mt-auto hidden border-t border-border p-3 md:block">
          <p className="truncate px-2 text-sm text-ink-muted">
            {profile.display_name || "Learner"}
          </p>
          <form action={signOut}>
            <button
              type="submit"
              className="mt-1 w-full rounded-lg px-2 py-1.5 text-left text-sm text-ink-faint transition-colors hover:bg-surface-2 hover:text-ink"
            >
              Sign out
            </button>
          </form>
        </div>
      </aside>

      <main className="flex-1 md:h-screen md:overflow-y-auto">
        <div className="mx-auto w-full max-w-5xl px-4 py-6 md:px-8 md:py-10">
          {children}
        </div>
      </main>
    </div>
  );
}
