import { useState, useCallback } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { haptic } from "@/lib/haptics/safeHaptics";
import type { Id } from "@/convex/_generated/dataModel";

interface UseTripLogicProps {
  listId: Id<"shoppingLists">;
  onTripFinished?: (stats: unknown) => void;
}

export function useTripLogic({ listId, onTripFinished }: UseTripLogicProps) {
  const finishTripMutation = useMutation(api.shoppingLists.finishTrip);
  const restockFromCheckedItemsMutation = useMutation(api.pantryItems.restockFromCheckedItems);

  const list = useQuery(api.shoppingLists.getById, { id: listId });

  const [isFinishing, setIsFinishing] = useState(false);

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

  return {
    isFinishing,
    finishTrip,
  };
}
