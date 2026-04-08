import { useState, useCallback } from "react";
import type { Id } from "@/convex/_generated/dataModel";
import { haptic } from "@/lib/haptics/safeHaptics";
import { colors } from "@/components/ui/glass";

export function useListPriceRefresh(
  refreshPrices: (args: { listId: Id<"shoppingLists"> }) => Promise<{ updated: number; total: number }>,
  listId: Id<"shoppingLists">,
  showToast: (message: string, icon: string, iconColor: string) => void
) {
  const [isRefreshingPrices, setIsRefreshingPrices] = useState(false);

  const handleRefreshPrices = useCallback(async () => {
    haptic("light");
    setIsRefreshingPrices(true);
    try {
      const result = await refreshPrices({ listId });
      haptic("success");
      showToast(
        `Updated ${result.updated} of ${result.total} prices`,
        "cash-sync",
        colors.accent.primary
      );
    } catch (error) {
      console.error("Price refresh failed:", error);
    } finally {
      setIsRefreshingPrices(false);
    }
  }, [refreshPrices, listId, showToast]);

  return { isRefreshingPrices, handleRefreshPrices };
}
