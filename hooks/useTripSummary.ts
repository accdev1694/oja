/**
 * useTripSummary - Formats raw trip statistics into display-ready values.
 *
 * Takes TripStats from the getTripStats query and returns formatted strings,
 * percentages, and boolean flags for the TripSummaryModal UI.
 */
import { useMemo } from "react";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface TripStats {
  checkedCount: number;
  uncheckedCount: number;
  uncheckedItems: {
    _id: string;
    name: string;
    quantity: number;
    estimatedPrice: number | undefined;
    priority: string;
    category: string | undefined;
  }[];
  totalItems: number;
  estimatedTotal: number;
  actualSpent: number;
  budget: number;
  budgetRemaining: number;
  savings: number;
  tripDuration: number | null;
  storeName: string | undefined;
  storeId: string | undefined;
  storeBreakdown?: {
    storeId: string;
    storeName: string;
    itemCount: number;
    subtotal: number;
  }[];
}

export interface TripSummaryDisplay {
  /** e.g. "8/12 items" */
  checkedLabel: string;
  /** e.g. "23 min" or "1h 5min" or "--" */
  durationLabel: string;
  /** e.g. "£32.50 / £50.00" */
  budgetUsedLabel: string;
  /** 0-100+ (can exceed 100 if over budget) */
  budgetPercentage: number;
  /** e.g. "Saved £3.20" or "£2.10 over estimates" */
  savingsLabel: string;
  /** true if saved money (savings >= 0) */
  savingsIsPositive: boolean;
  /** true if actualSpent <= budget */
  isUnderBudget: boolean;
  /** true if every item was checked off */
  isAllChecked: boolean;
  /** true if there are unchecked items */
  hasUncheckedItems: boolean;
  /** Per-store breakdown labels for multi-store trips, e.g. "Tesco: £32.50 (8 items)" */
  storeBreakdownLabels: { storeId: string; storeName: string; label: string }[];
  /** true if more than one store was visited */
  isMultiStore: boolean;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatDuration(ms: number | null): string {
  if (ms === null || ms <= 0) return "--";

  const totalMinutes = Math.round(ms / 60_000);
  if (totalMinutes < 1) return "< 1 min";
  if (totalMinutes < 60) return `${totalMinutes} min`;

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return minutes > 0 ? `${hours}h ${minutes}min` : `${hours}h`;
}

function formatPrice(amount: number): string {
  return `\u00A3${Math.abs(amount).toFixed(2)}`;
}

// ─── Hook ───────────────────────────────────────────────────────────────────

export function useTripSummary(stats: TripStats | null): TripSummaryDisplay | null {
  return useMemo(() => {
    if (!stats) return null;

    const {
      checkedCount,
      uncheckedCount,
      totalItems,
      actualSpent,
      budget,
      savings,
      tripDuration,
    } = stats;

    // Checked label: "8/12 items"
    const checkedLabel = `${checkedCount}/${totalItems} items`;

    // Duration
    const durationLabel = formatDuration(tripDuration);

    // Budget used: "£32.50 / £50.00"
    const budgetUsedLabel =
      budget > 0
        ? `${formatPrice(actualSpent)} / ${formatPrice(budget)}`
        : formatPrice(actualSpent);

    // Budget percentage (can exceed 100)
    const budgetPercentage = budget > 0 ? (actualSpent / budget) * 100 : 0;

    // Savings
    const savingsIsPositive = savings >= 0;
    const savingsLabel = savingsIsPositive
      ? `Saved ${formatPrice(savings)}`
      : `${formatPrice(savings)} over estimates`;

    // Boolean flags
    const isUnderBudget = budget > 0 ? actualSpent <= budget : true;
    const isAllChecked = uncheckedCount === 0;
    const hasUncheckedItems = uncheckedCount > 0;

    // Per-store breakdown (multi-store trips)
    const breakdown = stats.storeBreakdown ?? [];
    const storeBreakdownLabels = breakdown.map((s) => ({
      storeId: s.storeId,
      storeName: s.storeName,
      label: `${s.storeName}: ${formatPrice(s.subtotal)} (${s.itemCount} item${s.itemCount !== 1 ? "s" : ""})`,
    }));
    const isMultiStore = breakdown.length > 1;

    return {
      checkedLabel,
      durationLabel,
      budgetUsedLabel,
      budgetPercentage,
      savingsLabel,
      savingsIsPositive,
      isUnderBudget,
      isAllChecked,
      hasUncheckedItems,
      storeBreakdownLabels,
      isMultiStore,
    };
  }, [stats]);
}
