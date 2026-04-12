/**
 * useScanCommitHandlers
 *
 * Bundles the five callbacks that commit scanned products either to a
 * shopping list (via the list-picker modal) or directly to the pantry.
 * Extracted from `app/(app)/(tabs)/scan.tsx` so that file stays under the
 * 400-line ceiling and so the commit logic can be unit-tested in isolation
 * if needed.
 */

import { useCallback, useState } from "react";
import { useMutation } from "convex/react";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";

import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import type { EditedScannedItem } from "@/components/scan/EditScannedItemModal";
import type { AlertButton } from "@/components/ui/glass";
import type { useProductScanner } from "@/hooks/useProductScanner";

type ProductScanner = ReturnType<typeof useProductScanner>;
type ViewingProduct = { index: number } | null;

interface UseScanCommitHandlersProps {
  productScanner: ProductScanner;
  viewingProduct: ViewingProduct;
  alert: (
    title: string,
    message?: string,
    buttons?: AlertButton[]
  ) => void;
}

export interface ScanCommitHandlers {
  /** Payload currently queued for the list-picker modal, or null when closed */
  pendingListAdd: { items: EditedScannedItem[]; scanIndex: number | null } | null;
  /** Dismiss the list picker without committing */
  cancelListPicker: () => void;
  /** Bulk "Add All to List" CTA */
  handleAddAllToList: () => void;
  /** Bulk "Add All to Pantry" CTA */
  handleAddAllToPantry: () => Promise<void>;
  /** List-picker resolution callback */
  handleListPicked: (listId: Id<"shoppingLists">) => Promise<void>;
  /** Single-item "Add to List" from the review modal */
  handleModalAddToList: (edited: EditedScannedItem) => void;
  /** Single-item "Add to Pantry" from the review modal */
  handleModalAddToPantry: (edited: EditedScannedItem) => Promise<void>;
}

export function useScanCommitHandlers({
  productScanner,
  viewingProduct,
  alert,
}: UseScanCommitHandlersProps): ScanCommitHandlers {
  const router = useRouter();
  const addItemsToList = useMutation(api.listItems.addBatchFromScan);
  const addItemsToPantry = useMutation(api.pantryItems.addBatchFromScan);

  const [pendingListAdd, setPendingListAdd] = useState<
    { items: EditedScannedItem[]; scanIndex: number | null } | null
  >(null);

  const buildAllItems = useCallback((): EditedScannedItem[] => {
    return productScanner.scannedProducts.map((p) => ({
      name: p.name,
      category: p.category || "Other",
      quantity: p.quantity || 1,
      size: p.size,
      unit: p.unit,
      brand: p.brand,
      estimatedPrice: p.estimatedPrice,
      confidence: p.confidence,
      imageStorageId: p.imageStorageId,
    }));
  }, [productScanner.scannedProducts]);

  const handleAddAllToList = useCallback(() => {
    if (productScanner.scannedProducts.length === 0) return;
    setPendingListAdd({ items: buildAllItems(), scanIndex: null });
  }, [productScanner.scannedProducts.length, buildAllItems]);

  const handleListPicked = useCallback(
    async (listId: Id<"shoppingLists">) => {
      const pending = pendingListAdd;
      setPendingListAdd(null);
      if (!pending) return;
      try {
        await addItemsToList({ listId, items: pending.items });
        if (pending.scanIndex !== null) {
          productScanner.removeProduct(pending.scanIndex);
        } else {
          productScanner.clearAll();
        }
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

        const count = pending.items.length;
        alert(
          "Success",
          `Added ${count} ${count === 1 ? "item" : "items"} to your list!`,
          [
            { text: "Stay Here", style: "cancel" },
            { text: "View List", onPress: () => router.push(`/list/${listId}`) },
          ]
        );
      } catch (err) {
        console.error("Add to list failed:", err);
        alert("Error", "Failed to add items to list. Please try again.");
      }
    },
    [pendingListAdd, addItemsToList, productScanner, alert, router]
  );

  const showPantryCapAlert = useCallback(
    (skippedCount: number, capMax: number | undefined, partialSuccess: boolean) => {
      const capLabel = capMax != null ? `${capMax}` : "your plan's limit";
      const title = partialSuccess ? "Pantry partially updated" : "Pantry full";
      const message = partialSuccess
        ? `${skippedCount} item${skippedCount === 1 ? "" : "s"} couldn't be added — you're at ${capLabel} pantry items on the free plan. Upgrade to Premium to save unlimited items.`
        : `You've reached ${capLabel} pantry items on the free plan. Upgrade to Premium to save unlimited items and keep scanning without interruption.`;
      alert(title, message, [
        { text: "Not Now", style: "cancel" },
        { text: "Upgrade to Premium", onPress: () => router.push("/subscription") },
      ]);
    },
    [alert, router]
  );

  const handleAddAllToPantry = useCallback(async () => {
    if (productScanner.scannedProducts.length === 0) return;
    try {
      const itemsToAdd = buildAllItems();
      const result = await addItemsToPantry({ items: itemsToAdd });
      const successCount = result.added + result.restocked;

      if (successCount === 0 && result.skippedCap > 0) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        showPantryCapAlert(result.skippedCap, result.capMax, false);
        return;
      }

      // Remove only successful items from the scan queue so capped items
      // remain visible for retry after upgrading. Iterate in reverse to keep
      // indexes stable as we splice them out.
      if (result.skippedCap > 0 && result.skippedIndexes.length > 0) {
        const skippedSet = new Set(result.skippedIndexes);
        for (let i = itemsToAdd.length - 1; i >= 0; i--) {
          if (!skippedSet.has(i)) {
            productScanner.removeProduct(i);
          }
        }
      } else {
        productScanner.clearAll();
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      if (result.skippedCap > 0) {
        showPantryCapAlert(result.skippedCap, result.capMax, true);
        return;
      }

      const parts: string[] = [];
      if (result.added > 0) parts.push(`${result.added} added`);
      if (result.restocked > 0) parts.push(`${result.restocked} restocked`);
      const summary = parts.length > 0 ? parts.join(" · ") : "Pantry updated";

      alert("Pantry Updated", summary, [
        { text: "Stay Here", style: "cancel" },
        { text: "View Pantry", onPress: () => router.push("/stock") },
      ]);
    } catch (err) {
      console.error("Bulk add to pantry failed:", err);
      alert("Error", "Failed to add items to pantry. Please try again.");
    }
  }, [addItemsToPantry, buildAllItems, productScanner, alert, router, showPantryCapAlert]);

  const handleModalAddToList = useCallback(
    (edited: EditedScannedItem) => {
      if (!viewingProduct) return;
      setPendingListAdd({ items: [edited], scanIndex: viewingProduct.index });
    },
    [viewingProduct]
  );

  const handleModalAddToPantry = useCallback(
    async (edited: EditedScannedItem) => {
      if (!viewingProduct) return;
      const scanIndex = viewingProduct.index;
      try {
        const result = await addItemsToPantry({ items: [edited] });

        if (result.added === 0 && result.restocked === 0 && result.skippedCap > 0) {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          showPantryCapAlert(result.skippedCap, result.capMax, false);
          return;
        }

        productScanner.removeProduct(scanIndex);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

        const summary =
          result.restocked > 0 ? `${edited.name} restocked` : `${edited.name} added to pantry`;
        alert("Pantry Updated", summary, [
          { text: "Stay Here", style: "cancel" },
          { text: "View Pantry", onPress: () => router.push("/stock") },
        ]);
      } catch (err) {
        console.error("Single pantry add failed:", err);
        alert("Error", "Failed to add item to pantry. Please try again.");
      }
    },
    [viewingProduct, addItemsToPantry, productScanner, alert, router, showPantryCapAlert]
  );

  const cancelListPicker = useCallback(() => setPendingListAdd(null), []);

  return {
    pendingListAdd,
    cancelListPicker,
    handleAddAllToList,
    handleAddAllToPantry,
    handleListPicked,
    handleModalAddToList,
    handleModalAddToPantry,
  };
}
