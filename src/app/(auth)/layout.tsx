import Link from "next/link";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="aurora flex min-h-screen flex-col items-center justify-center px-4 py-12">
      <Link href="/" className="mb-8 text-lg font-semibold tracking-tight">
        peak<span className="text-accent">.learn</span>
      </Link>
      <div className="w-full max-w-sm rounded-card border border-border bg-surface p-6 shadow-xl">
        {children}
      </div>
    </div>
  );
}
