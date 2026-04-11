import { useState, useCallback } from "react";
import type { Id } from "@/convex/_generated/dataModel";
import { haptic } from "@/lib/haptics/safeHaptics";
import type { FlashDetail, FlashMessage } from "@/components/ui/FlashInsightBanner";

// Monotonic counter — guarantees every flash gets a unique id even if two
// refresh calls complete inside the same millisecond (Date.now() resolution
// is not enough in fast emulators or test environments, and the banner
// drops same-id updates on purpose to avoid restart loops).
let flashIdCounter = 0;
function nextFlashId(prefix: string): string {
  flashIdCounter += 1;
  return `${prefix}-${flashIdCounter}`;
}

interface PriceChange {
  name: string;
  oldPrice?: number;
  newPrice: number;
}

interface RefreshResult {
  updated: number;
  total: number;
  changes: PriceChange[];
}

/**
 * UK GBP formatter — the app is UK-only (see CLAUDE.md). Handles missing
 * prior prices by returning an em-dash so the banner can show "— → £1.25"
 * for items whose estimatedPrice was previously undefined.
 */
export function formatGBP(price?: number): string {
  if (price === undefined || price === null || Number.isNaN(price)) return "—";
  return `£${price.toFixed(2)}`;
}

/**
 * Map a price delta to a trend the banner can color-code.
 * "down" (cheaper) is good → success; "up" (pricier) → warning.
 * If the item had no prior price we return "neutral" — it's a fill, not a diff.
 */
export function priceChangeToDetail(change: PriceChange): FlashDetail {
  const { name, oldPrice, newPrice } = change;
  let trend: FlashDetail["trend"] = "neutral";
  if (oldPrice !== undefined && !Number.isNaN(oldPrice)) {
    if (newPrice < oldPrice) trend = "down";
    else if (newPrice > oldPrice) trend = "up";
  }
  return {
    label: name,
    value: `${formatGBP(oldPrice)} → ${formatGBP(newPrice)}`,
    trend,
  };
}

export function useListPriceRefresh(
  refreshPrices: (args: { listId: Id<"shoppingLists"> }) => Promise<RefreshResult>,
  listId: Id<"shoppingLists">,
  onFlash: (message: FlashMessage) => void
) {
  const [isRefreshingPrices, setIsRefreshingPrices] = useState(false);

  const handleRefreshPrices = useCallback(async () => {
    haptic("light");
    setIsRefreshingPrices(true);
    try {
      const { updated, total, changes } = await refreshPrices({ listId });
      haptic("success");
      const id = nextFlashId("list-refresh");
      if (total === 0) {
        onFlash({
          id,
          tone: "info",
          icon: "playlist-remove",
          title: "Nothing to refresh",
          body: "This list has no items yet, so there are no prices to update.",
        });
      } else if (updated === 0) {
        onFlash({
          id,
          tone: "info",
          title: "Prices already up to date",
          body: `Checked ${total} item${total !== 1 ? "s" : ""} — nothing has changed since the last refresh.`,
        });
      } else {
        const details = (changes ?? []).map(priceChangeToDetail);
        onFlash({
          id,
          tone: "success",
          title: "Prices refreshed",
          body: `${updated} of ${total} item${total !== 1 ? "s" : ""} updated.`,
          details,
        });
      }
    } catch (error) {
      console.error("Price refresh failed:", error);
      haptic("error");
      onFlash({
        id: nextFlashId("list-refresh-error"),
        tone: "error",
        title: "Couldn't refresh prices",
        body: "Something went wrong updating your list prices. Please try again in a moment.",
      });
    } finally {
      setIsRefreshingPrices(false);
    }
  }, [refreshPrices, listId, onFlash]);

  return { isRefreshingPrices, handleRefreshPrices };
}
