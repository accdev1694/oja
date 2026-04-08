import { useCallback } from "react";
import { haptic } from "@/lib/haptics/safeHaptics";
import { Id } from "@/convex/_generated/dataModel";
import { ESSENTIALS_SECTION_TITLE } from "@/components/stock/stockStyles";
import type { PantryItem } from "./types";
import type { useStockData } from "./useStockData";

type DataReturn = ReturnType<typeof useStockData>;

interface StockItemActionsInput {
  items: DataReturn["items"];
  archivedItems: PantryItem[] | undefined;
  duplicateGroups: DataReturn["duplicateGroups"];
  mergeDuplicatesMut: DataReturn["mergeDuplicatesMut"];
  togglePin: DataReturn["togglePin"];
  archiveItemMut: DataReturn["archiveItemMut"];
  unarchiveItemMut: DataReturn["unarchiveItemMut"];
  setDedupDismissed: DataReturn["setDedupDismissed"];

  alert: (
    title: string,
    message: string,
    buttons: { text: string; style?: "cancel" | "destructive"; onPress?: () => void }[]
  ) => void;
}

/**
 * Long-press, merge-duplicates, and toggle-essentials actions
 * extracted from useStockActions to stay under the 400-line limit.
 */
export function useStockItemActions(input: StockItemActionsInput) {
  const {
    items,
    archivedItems,
    duplicateGroups,
    mergeDuplicatesMut,
    togglePin,
    archiveItemMut,
    unarchiveItemMut,
    alert,
    setDedupDismissed,
  } = input;

  // ── Merge duplicates ───────────────────────────────────────────────────

  const handleMergeDuplicates = useCallback(async () => {
    if (!duplicateGroups || duplicateGroups.length === 0) return;

    const totalDupes = duplicateGroups.reduce(
      (sum: number, g: PantryItem[]) => sum + g.length - 1,
      0
    );
    const groupCount = duplicateGroups.length;

    alert(
      "Merge Duplicates",
      `Found ${groupCount} group${groupCount !== 1 ? "s" : ""} of duplicates (${totalDupes} extra item${totalDupes !== 1 ? "s" : ""}). The best data (receipt prices, purchase counts, pinned status) will be kept for each.`,
      [
        {
          text: "Dismiss",
          style: "cancel",
          onPress: () => setDedupDismissed(true),
        },
        {
          text: "Merge All",
          onPress: async () => {
            try {
              for (const group of duplicateGroups) {
                const priceRank = (source?: string) =>
                  source === "receipt"
                    ? 3
                    : source === "user"
                      ? 2
                      : source === "ai_estimate"
                        ? 1
                        : 0;

                const sorted = [...group].sort(
                  (a: PantryItem, b: PantryItem) => {
                    const priceDiff =
                      priceRank(b.priceSource) - priceRank(a.priceSource);
                    if (priceDiff !== 0) return priceDiff;
                    return (b.purchaseCount ?? 0) - (a.purchaseCount ?? 0);
                  }
                );

                const keepId = sorted[0]._id;
                const deleteIds = sorted
                  .slice(1)
                  .map((item: PantryItem) => item._id);

                await mergeDuplicatesMut({ keepId, deleteIds });
              }
              haptic("success");
            } catch (err: unknown) {
              console.error("Merge duplicates failed:", err);
              haptic("error");
            }
          },
        },
      ]
    );
  }, [duplicateGroups, alert, mergeDuplicatesMut, setDedupDismissed]);

  // ── Long press ─────────────────────────────────────────────────────────

  const handleItemLongPress = useCallback(
    (itemId: Id<"pantryItems">) => {
      const item =
        items?.find((i: PantryItem) => i._id === itemId) ??
        archivedItems?.find((i: PantryItem) => i._id === itemId);
      if (!item) return;

      haptic("medium");

      const isArchived = item.status === "archived";
      const isPinned = item.pinned === true;

      if (isArchived) {
        alert("Archived Item", `"${item.name}" is archived.`, [
          { text: "Cancel", style: "cancel" },
          {
            text: "Restore to Pantry",
            onPress: async () => {
              try {
                await unarchiveItemMut({ pantryItemId: item._id });
                haptic("success");
              } catch (err: unknown) {
                console.error("Failed to unarchive:", err);
              }
            },
          },
        ]);
        return;
      }

      const pinLabel = isPinned
        ? "Unpin from Essentials"
        : "Pin to Essentials";
      const options: {
        text: string;
        style?: "cancel" | "destructive";
        onPress?: () => void;
      }[] = [
        { text: "Cancel", style: "cancel" },
        {
          text: pinLabel,
          onPress: async () => {
            try {
              await togglePin({ pantryItemId: item._id });
              haptic("light");
            } catch (err: unknown) {
              console.error("Failed to toggle pin:", err);
            }
          },
        },
      ];

      if (!isPinned) {
        options.push({
          text: "Archive",
          style: "destructive",
          onPress: async () => {
            try {
              await archiveItemMut({ pantryItemId: item._id });
              haptic("light");
            } catch (err: unknown) {
              console.error("Failed to archive:", err);
            }
          },
        });
      }

      alert("Item Options", `"${item.name}"`, options);
    },
    [items, archivedItems, togglePin, archiveItemMut, unarchiveItemMut, alert]
  );

  // ── Toggle essentials ──────────────────────────────────────────────────

  const toggleEssentials = useCallback((toggleCategory: (cat: string) => void) => {
    toggleCategory(ESSENTIALS_SECTION_TITLE);
  }, []);

  return {
    handleMergeDuplicates,
    handleItemLongPress,
    toggleEssentials,
  };
}
