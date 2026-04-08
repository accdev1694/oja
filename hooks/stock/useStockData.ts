import { useEffect, useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useIsSwitchingUsers } from "@/hooks/useIsSwitchingUsers";
import type { PantryItem } from "./types";

/**
 * Encapsulates all Convex queries and mutations for the stock screen.
 * Returns raw data and mutation handles used by other sub-hooks.
 */
export function useStockData() {
  const isSwitchingUsers = useIsSwitchingUsers();

  // ── Queries ───────────────────────────────────────────────────────────
  const items = useQuery(
    api.pantryItems.getByUser,
    !isSwitchingUsers ? {} : "skip"
  );
  const activeLists = useQuery(
    api.shoppingLists.getActive,
    !isSwitchingUsers ? {} : "skip"
  );
  const duplicateGroups = useQuery(
    api.pantryItems.findDuplicates,
    !isSwitchingUsers ? {} : "skip"
  );
  const archivedItems = useQuery(
    api.pantryItems.getArchivedItems,
    !isSwitchingUsers ? {} : "skip"
  );

  // ── Mutations ─────────────────────────────────────────────────────────
  const updateStockLevel = useMutation(api.pantryItems.updateStockLevel);
  const createList = useMutation(api.shoppingLists.create);
  const addListItem = useMutation(api.listItems.create);
  const migrateIcons = useMutation(api.pantryItems.migrateIcons);
  const removePantryItem = useMutation(api.pantryItems.remove);
  const mergeDuplicatesMut = useMutation(api.pantryItems.mergeDuplicates);
  const togglePin = useMutation(api.pantryItems.togglePin);
  const archiveItemMut = useMutation(api.pantryItems.archiveItem);
  const unarchiveItemMut = useMutation(api.pantryItems.unarchiveItem);

  // ── Dedup dismissed state ─────────────────────────────────────────────
  const [dedupDismissed, setDedupDismissed] = useState(false);

  // ── Derived ───────────────────────────────────────────────────────────
  const archivedCount = archivedItems?.length ?? 0;

  // ── Icon migration side-effect ────────────────────────────────────────
  useEffect(() => {
    if (items && items.length > 0) {
      const needsMigration = items.some((item: PantryItem) => !item.icon);
      if (needsMigration) {
        migrateIcons({}).catch((err: unknown) => {
          console.error("Migration failed:", err);
        });
      }
    }
  }, [items?.length]);

  return {
    // Raw data
    items,
    activeLists,
    duplicateGroups,
    archivedItems,
    archivedCount,

    // Dedup state
    dedupDismissed,
    setDedupDismissed,

    // Mutations
    updateStockLevel,
    createList,
    addListItem,
    removePantryItem,
    mergeDuplicatesMut,
    togglePin,
    archiveItemMut,
    unarchiveItemMut,
  };
}
