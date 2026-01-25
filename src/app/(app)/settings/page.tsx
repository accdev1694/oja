import { SignOutButton } from '@/components/auth';

export const metadata = {
  title: 'Settings | Oja',
  description: 'Manage your Oja account settings',
};

/**
 * Settings Page
 *
 * User account settings and sign out functionality.
 * Protected route - requires authentication (handled by middleware).
 */
export default function SettingsPage() {
  return (
    <div className="min-h-screen bg-[var(--color-background)] p-4">
      <div className="max-w-md mx-auto">
        <h1 className="text-2xl font-bold text-[var(--color-text)] mb-6">
          Settings
        </h1>

        {/* Account Section */}
        <section className="bg-white rounded-lg p-4 shadow-sm border border-[var(--color-border)] mb-4">
          <h2 className="text-lg font-semibold text-[var(--color-text)] mb-4">
            Account
          </h2>

          <div className="border-t border-[var(--color-border)] pt-4">
            <p className="text-sm text-[var(--color-text-secondary)] mb-3">
              Sign out of your account on this device. Your local data will be
              preserved.
            </p>
            <SignOutButton />
          </div>
        </section>
      </div>
    </div>
  );
}
