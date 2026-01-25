import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Oja - Sign In',
  description: 'Sign in to your Oja account',
};

/**
 * Auth Layout
 *
 * Centered layout for authentication pages (login, register, etc.)
 * Mobile-first design with warm background
 */
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[var(--color-warm-white)] flex flex-col">
      {/* Header with logo */}
      <header className="p-6 flex justify-center">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-xl bg-[var(--color-orange)] flex items-center justify-center">
            <span className="text-white font-bold text-xl">O</span>
          </div>
          <span className="text-2xl font-bold text-[var(--color-charcoal)]">
            Oja
          </span>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 flex items-start justify-center px-4 py-8">
        <div className="w-full max-w-md">{children}</div>
      </main>

      {/* Footer */}
      <footer className="p-4 text-center text-sm text-[var(--color-muted)]">
        Budget-First Shopping Confidence
      </footer>
    </div>
  );
}
