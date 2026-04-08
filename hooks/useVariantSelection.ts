import { useState, useEffect, useCallback, useMemo } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import type { VariantOption } from "@/components/items/VariantPicker";

interface UseVariantSelectionOptions {
  itemName: string;
  listUserId?: Id<"users">;
  listStoreName?: string;
  setNewItemName: (name: string) => void;
  setNewItemPrice: (price: string) => void;
  setShowSuggestionsDropdown: (show: boolean) => void;
}

export function useVariantSelection({
  itemName,
  listUserId,
  listStoreName,
  setNewItemName,
  setNewItemPrice,
  setShowSuggestionsDropdown,
}: UseVariantSelectionOptions) {
  const setPreferredVariant = useMutation(api.pantryItems.setPreferredVariant);

  const [selectedVariantName, setSelectedVariantName] = useState<string | null>(null);
  const [selectedVariantSize, setSelectedVariantSize] = useState<string | null>(null);
  const [selectedVariantUnit, setSelectedVariantUnit] = useState<string | null>(null);

  const trimmedName = itemName.trim();

  const itemVariants = useQuery(
    api.itemVariants.getWithPrices,
    trimmedName.length >= 2
      ? {
          baseItem: trimmedName,
          ...(listUserId ? { userId: listUserId } : {}),
          ...(listStoreName ? { storeName: listStoreName } : {}),
        }
      : "skip"
  );

  useEffect(() => {
    setSelectedVariantName(null);
    setSelectedVariantSize(null);
    setSelectedVariantUnit(null);
  }, [itemName]);

  useEffect(() => {
    if (!itemVariants || itemVariants.length === 0 || selectedVariantName) return;

    const usualVariant = itemVariants.find((v) => v.priceSource === "personal");
    if (usualVariant) {
      setSelectedVariantName(usualVariant.variantName);
      setSelectedVariantSize(usualVariant.size);
      setSelectedVariantUnit(usualVariant.unit);
      setNewItemName(usualVariant.variantName);
      if (usualVariant.price != null) {
        setNewItemPrice(usualVariant.price.toFixed(2));
      }
    }
  }, [itemVariants]); // eslint-disable-line react-hooks/exhaustive-deps

  const variantOptions: VariantOption[] = useMemo(() => {
    if (!itemVariants || itemVariants.length === 0) return [];
    return itemVariants.map((v) => ({
      variantName: v.variantName,
      size: v.size,
      unit: v.unit,
      price: v.price ?? null,
      priceSource: v.priceSource as VariantOption["priceSource"],
      isUsual: v.priceSource === "personal",
    }));
  }, [itemVariants]);

  const handleVariantSelect = useCallback((variantName: string) => {
    const variant = itemVariants?.find((v) => v.variantName === variantName);
    if (!variant) return;

    setSelectedVariantName(variant.variantName);
    setSelectedVariantSize(variant.size);
    setSelectedVariantUnit(variant.unit);
    setNewItemName(variant.variantName);
    setShowSuggestionsDropdown(false);
    if (variant.price != null) {
      setNewItemPrice(variant.price.toFixed(2));
    }
    setPreferredVariant({
      itemName: variant.baseItem,
      preferredVariant: variant.variantName,
    }).catch(console.error);
  }, [itemVariants, setPreferredVariant, setNewItemName, setNewItemPrice, setShowSuggestionsDropdown]);

  const clearVariantSelection = useCallback(() => {
    setSelectedVariantName(null);
    setSelectedVariantSize(null);
    setSelectedVariantUnit(null);
  }, []);

  const setVariantSizeUnit = useCallback((size: string | null, unit: string | null) => {
    if (size) setSelectedVariantSize(size);
    if (unit) setSelectedVariantUnit(unit);
  }, []);

  return {
    selectedVariantName,
    selectedVariantSize,
    selectedVariantUnit,
    itemVariants,
    variantOptions,
    handleVariantSelect,
    clearVariantSelection,
    setVariantSizeUnit,
  };
}
