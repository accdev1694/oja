import { useState, useCallback, useMemo } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { haptic } from "@/lib/haptics/safeHaptics";
import type { Id } from "@/convex/_generated/dataModel";

interface UseTripLogicProps {
  listId: Id<"shoppingLists">;
  onTripStarted?: () => void;
  onTripFinished?: (stats: unknown) => void;
}

export function useTripLogic({ listId, onTripStarted, onTripFinished }: UseTripLogicProps) {
  const startTripMutation = useMutation(api.shoppingLists.markTripStart);
  const finishTripMutation = useMutation(api.shoppingLists.finishTrip);
  const switchStoreMidShopMutation = useMutation(api.shoppingLists.switchStoreMidShop);
  const restockFromCheckedItemsMutation = useMutation(api.pantryItems.restockFromCheckedItems);
  const getTripStatsQuery = useQuery(api.shoppingLists.getTripStats, { id: listId });

  const list = useQuery(api.shoppingLists.getById, { id: listId });

  const [isFinishing, setIsFinishing] = useState(false);

  const startTrip = useCallback(async (storeId?: string, storeName?: string) => {
    try {
      haptic("medium");
      await startTripMutation({
        id: listId,
        storeId,
        storeName,
      });
      onTripStarted?.();
    } catch (error) {
      console.error("Failed to start trip:", error);
      throw error;
    }
  }, [listId, startTripMutation, onTripStarted]);

  const switchStoreMidShop = useCallback(async (storeId: string) => {
    try {
      haptic("medium");
      const result = await switchStoreMidShopMutation({
        listId,
        newStoreId: storeId,
      });
      haptic("success");
      return result;
    } catch (error) {
      console.error("Failed to switch store mid-shop:", error);
      throw error;
    }
  }, [listId, switchStoreMidShopMutation]);

  const finishTrip = useCallback(async () => {
    if (!list) return;
    
    try {
      setIsFinishing(true);
      haptic("success");
      
      const stats = await finishTripMutation({
        id: listId,
      });
      
      await restockFromCheckedItemsMutation({ listId });
      
      onTripFinished?.(stats);
      return stats;
    } catch (error) {
      console.error("Failed to finish trip:", error);
      throw error;
    } finally {
      setIsFinishing(false);
    }
  }, [list, listId, finishTripMutation, restockFromCheckedItemsMutation, onTripFinished]);

  const tripDuration = useMemo(() => {
    if (!list?.shoppingStartedAt) return 0;
    const end = list.completedAt || Date.now();
    return Math.floor((end - list.shoppingStartedAt) / 1000 / 60); // minutes
  }, [list?.shoppingStartedAt, list?.completedAt]);

  return {
    isInProgress: list?.status === "active" && list.shoppingStartedAt != null && list.completedAt == null,
    isFinishing,
    startTrip,
    switchStoreMidShop,
    finishTrip,
    tripDuration,
    shoppingStartedAt: list?.shoppingStartedAt,
  };
}
