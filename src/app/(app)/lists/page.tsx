'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  getShoppingLists,
  createShoppingList,
  type ShoppingList,
} from '@/lib/utils/shoppingListStorage';
import { getDefaultBudget } from '@/lib/utils/onboardingStorage';
import { ShoppingListGrid } from '@/components/lists';
import { Toast, useToast } from '@/components/ui/Toast';

export default function ListsPage() {
  const router = useRouter();
  const [lists, setLists] = useState<ShoppingList[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast, showToast, hideToast } = useToast();

  // Load lists from localStorage
  useEffect(() => {
    const loadLists = () => {
      const shoppingLists = getShoppingLists();
      setLists(shoppingLists);
      setIsLoading(false);
    };

    loadLists();
  }, []);

  // Handle list click - navigate to detail page
  const handleListClick = useCallback(
    (list: ShoppingList) => {
      router.push(`/lists/${list.id}`);
    },
    [router]
  );

  // Handle new list creation
  const handleNewList = useCallback(() => {
    // Create default name using today's date
    const today = new Date();
    const defaultName = today.toLocaleDateString('en-GB', {
      weekday: 'long',
      day: 'numeric',
      month: 'short',
    });

    // Get default budget from onboarding
    const defaultBudget = getDefaultBudget();

    // Create the list
    const newList = createShoppingList({
      name: defaultName,
      budget: defaultBudget,
    });

    // Update local state
    setLists((prev) => [newList, ...prev]);

    // Show success toast
    const autoAddedInfo = newList.budget
      ? 'Budget applied from your settings.'
      : '';
    showToast(`List created! ${autoAddedInfo}`.trim(), { type: 'success' });

    // Navigate to the new list
    router.push(`/lists/${newList.id}`);
  }, [router, showToast]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[var(--color-background)] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-pulse">
            <span className="text-4xl" role="img" aria-hidden="true">
              📝
            </span>
          </div>
          <p className="text-[var(--color-text-secondary)] mt-2">
            Loading lists...
          </p>
        </div>
      </div>
    );
  }

  // Calculate active/completed counts
  const activeLists = lists.filter(
    (list) => list.status === 'active' || list.status === 'shopping'
  );
  const completedLists = lists.filter(
    (list) => list.status === 'completed' || list.status === 'archived'
  );

  return (
    <div className="min-h-screen bg-[var(--color-background)] pb-24">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-[var(--color-background)] border-b border-[var(--color-border)]">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-[var(--color-text)]">
                Shopping Lists
              </h1>
              {lists.length > 0 && (
                <p className="text-sm text-[var(--color-text-secondary)]">
                  {activeLists.length} active
                  {completedLists.length > 0 &&
                    `, ${completedLists.length} completed`}
                </p>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-2xl mx-auto px-4 py-4">
        <ShoppingListGrid
          lists={lists}
          onListClick={handleListClick}
          onNewList={handleNewList}
        />
      </main>

      {/* FAB - New List Button */}
      <button
        type="button"
        onClick={handleNewList}
        className="fixed right-4 bottom-20 w-14 h-14 rounded-full bg-[var(--color-primary)] text-white shadow-lg flex items-center justify-center transition-transform hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:ring-offset-2 z-20"
        aria-label="Create new list"
        data-testid="fab-new-list"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="28"
          height="28"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
      </button>

      {/* Toast */}
      <Toast
        message={toast.message}
        type={toast.type}
        isVisible={toast.isVisible}
        onDismiss={hideToast}
        onUndo={toast.onUndo}
      />

      {/* Bottom Navigation */}
      <nav
        className="fixed bottom-0 left-0 right-0 bg-white border-t border-[var(--color-border)] z-10"
        aria-label="Main navigation"
      >
        <div className="max-w-2xl mx-auto flex justify-around py-2">
          <Link
            href="/pantry"
            className="flex flex-col items-center min-w-[64px] py-2 text-[var(--color-text-secondary)]"
          >
            <span className="text-2xl" role="img" aria-label="Pantry">
              🏠
            </span>
            <span className="text-xs mt-0.5">Pantry</span>
          </Link>
          <button
            type="button"
            className="flex flex-col items-center min-w-[64px] py-2 text-[var(--color-primary)]"
            aria-current="page"
          >
            <span className="text-2xl" role="img" aria-hidden="true">
              📝
            </span>
            <span className="text-xs font-medium mt-0.5">Lists</span>
          </button>
          <button
            type="button"
            className="flex flex-col items-center min-w-[64px] py-2 text-[var(--color-text-secondary)] opacity-50"
            disabled
            aria-label="Scan (coming soon)"
          >
            <span className="text-2xl" role="img" aria-hidden="true">
              📷
            </span>
            <span className="text-xs mt-0.5">Scan</span>
          </button>
          <button
            type="button"
            className="flex flex-col items-center min-w-[64px] py-2 text-[var(--color-text-secondary)] opacity-50"
            disabled
            aria-label="Insights (coming soon)"
          >
            <span className="text-2xl" role="img" aria-hidden="true">
              📊
            </span>
            <span className="text-xs mt-0.5">Insights</span>
          </button>
        </div>
      </nav>
    </div>
  );
}
