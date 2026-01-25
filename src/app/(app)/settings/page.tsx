'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { SignOutButton } from '@/components/auth';
import { SubscriptionStatus } from '@/components/subscription';
import { DeleteAccountDialog } from '@/components/account';
import { Button } from '@/components/ui';
import { deleteAccount } from '@/lib/utils/accountDeletion';

/**
 * Settings Page
 *
 * User account settings, subscription management, and sign out functionality.
 * Protected route - requires authentication (handled by middleware).
 */
export default function SettingsPage() {
  const router = useRouter();
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const handleUpgrade = () => {
    router.push('/upgrade');
  };

  const handleDeleteAccount = async () => {
    setIsDeleting(true);
    setDeleteError(null);

    try {
      const result = await deleteAccount();

      if (result.success) {
        // Close dialog and redirect to login
        setIsDeleteDialogOpen(false);
        router.push('/login?deleted=true');
      } else {
        setDeleteError(
          result.error || 'Failed to delete account. Please try again.'
        );
      }
    } catch (error) {
      setDeleteError(
        error instanceof Error ? error.message : 'An unexpected error occurred'
      );
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--color-background)] p-4">
      <div className="max-w-md mx-auto">
        <h1 className="text-2xl font-bold text-[var(--color-text)] mb-6">
          Settings
        </h1>

        {/* Subscription Section */}
        <section className="mb-4" data-testid="subscription-section">
          <SubscriptionStatus onUpgrade={handleUpgrade} />
        </section>

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

        {/* Danger Zone Section */}
        <section
          className="bg-white rounded-lg p-4 shadow-sm border border-red-200"
          data-testid="danger-zone-section"
        >
          <h2 className="text-lg font-semibold text-red-600 mb-4">
            Danger Zone
          </h2>

          <div className="border-t border-red-100 pt-4">
            <p className="text-sm text-[var(--color-text-secondary)] mb-3">
              Permanently delete your account and all associated data. This
              action cannot be undone.
            </p>
            <Button
              type="button"
              variant="secondary"
              size="default"
              className="!border-red-300 !text-red-600 hover:!bg-red-50"
              onClick={() => setIsDeleteDialogOpen(true)}
              data-testid="delete-account-button"
            >
              Delete Account
            </Button>
          </div>
        </section>
      </div>

      {/* Delete Account Dialog */}
      <DeleteAccountDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => {
          setIsDeleteDialogOpen(false);
          setDeleteError(null);
        }}
        onConfirm={handleDeleteAccount}
        isLoading={isDeleting}
        error={deleteError}
      />
    </div>
  );
}
