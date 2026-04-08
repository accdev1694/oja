import { useState, useEffect, useRef } from "react";
import { useQuery, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

interface UseItemPriceEstimationOptions {
  itemName: string;
  listUserId?: Id<"users">;
  itemVariants: unknown[] | undefined;
  setNewItemPrice: (price: string) => void;
}

export function useItemPriceEstimation({
  itemName,
  listUserId,
  itemVariants,
  setNewItemPrice,
}: UseItemPriceEstimationOptions) {
  const estimateItemPrice = useAction(api.ai.estimateItemPrice);

  const [isEstimatingPrice, setIsEstimatingPrice] = useState(false);
  const userHasTypedPrice = useRef(false);

  const trimmedName = itemName.trim();

  const priceEstimate = useQuery(
    api.currentPrices.getEstimate,
    trimmedName.length >= 2 ? { itemName: trimmedName } : "skip"
  );

  useEffect(() => {
    userHasTypedPrice.current = false;
  }, [itemName]);

  useEffect(() => {
    if (priceEstimate && priceEstimate.cheapest && !userHasTypedPrice.current) {
      setNewItemPrice(priceEstimate.cheapest.price.toFixed(2));
    }
  }, [priceEstimate, setNewItemPrice]);

  useEffect(() => {
    if (
      trimmedName.length < 2 ||
      isEstimatingPrice ||
      !listUserId
    ) return;

    if (priceEstimate === undefined || itemVariants === undefined) return;

    if (priceEstimate !== null || (itemVariants && itemVariants.length > 0)) return;

    setIsEstimatingPrice(true);
    estimateItemPrice({
      itemName: trimmedName,
      userId: listUserId!,
    })
      .catch(console.error)
      .finally(() => setIsEstimatingPrice(false));
  }, [itemName, priceEstimate, itemVariants, listUserId]); // eslint-disable-line react-hooks/exhaustive-deps

  const markUserTypedPrice = () => {
    userHasTypedPrice.current = true;
  };

  const resetUserTypedPrice = () => {
    userHasTypedPrice.current = false;
  };

  return {
    priceEstimate,
    isEstimatingPrice,
    markUserTypedPrice,
    resetUserTypedPrice,
  };
}
