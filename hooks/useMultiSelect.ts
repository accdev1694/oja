import { useState, useCallback } from "react";
import type { Id } from "@/convex/_generated/dataModel";
import { haptic } from "@/lib/haptics/safeHaptics";
import { colors, type AlertButton } from "@/components/ui/glass";

export function useMultiSelect(
  removeMultiple: (args: { ids: Id<"listItems">[] }) => Promise<unknown>,
  alert: (title: string, message?: string, buttons?: AlertButton[]) => void,
  showToast: (message: string, icon: string, iconColor: string) => void
) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const selectionActive = selectedIds.size > 0;

  const handleSelectToggle = useCallback((itemId: Id<"listItems">) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(itemId)) {
        next.delete(itemId);
      } else {
        next.add(itemId);
      }
      return next;
    });
  }, []);

  const handleClearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const handleDeleteSelected = useCallback(() => {
    const count = selectedIds.size;
    alert("Delete Items", `Remove ${count} selected item${count > 1 ? "s" : ""}?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await removeMultiple({ ids: [...selectedIds] as Id<"listItems">[] });
            haptic("success");
            showToast(`${count} item${count > 1 ? "s" : ""} removed`, "trash-can-outline", colors.text.tertiary);
            setSelectedIds(new Set());
          } catch (error) {
            console.error("Bulk delete failed:", error);
          }
        },
      },
    ]);
  }, [selectedIds, removeMultiple, alert, showToast]);

  return {
    selectedIds,
    selectionActive,
    handleSelectToggle,
    handleClearSelection,
    handleDeleteSelected,
  };
}
