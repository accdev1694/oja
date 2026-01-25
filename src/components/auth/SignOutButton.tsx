'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui';
import { signOut } from '@/lib/supabase/auth';

interface SignOutButtonProps {
  /** Button variant - defaults to 'secondary' */
  variant?: 'primary' | 'secondary' | 'ghost' | 'destructive';
  /** Additional class names */
  className?: string;
}

/**
 * Sign Out Button Component
 *
 * Signs out the current user and redirects to login.
 * - Preserves local cached data (IndexedDB) for offline access
 * - Shows loading state during sign out
 * - Handles errors gracefully
 */
export function SignOutButton({
  variant = 'secondary',
  className,
}: SignOutButtonProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSignOut = async () => {
    setError(null);
    setIsLoading(true);

    try {
      const { error: signOutError } = await signOut();

      if (signOutError) {
        setError('Failed to sign out. Please try again.');
        return;
      }

      // Redirect to login page
      router.push('/login');
      router.refresh();
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      <Button
        type="button"
        variant={variant}
        onClick={handleSignOut}
        disabled={isLoading}
        className={className}
      >
        {isLoading ? 'Signing out...' : 'Sign Out'}
      </Button>
      {error && (
        <p className="mt-2 text-sm text-[var(--color-error)]" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
