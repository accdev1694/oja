import { useState, useCallback, useEffect, useRef } from "react";
import { useAction, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { haptic } from "@/lib/haptics/safeHaptics";
import type { ListItem } from "@/components/list/ShoppingListItem";

interface UseAddItemSuggestionsOptions {
  listId: Id<"shoppingLists">;
  listUserId?: Id<"users">;
  existingItems: ListItem[] | undefined;
  alert: (title: string, message: string) => void;
}

export function useAddItemSuggestions({
  listId,
  listUserId,
  existingItems,
  alert,
}: UseAddItemSuggestionsOptions) {
  const addItem = useMutation(api.listItems.create);
  const generateSuggestions = useAction(api.ai.generateListSuggestions);
  const estimateItemPrice = useAction(api.ai.estimateItemPrice);

  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [dismissedSuggestions, setDismissedSuggestions] = useState<string[]>([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const hasLoadedInitialSuggestions = useRef(false);

  const loadSuggestions = useCallback(async () => {
    if (!existingItems || existingItems.length === 0 || !showSuggestions) {
      setSuggestions([]);
      return;
    }

    setIsLoadingSuggestions(true);
    try {
      const currentItemNames = existingItems.map((item) => item.name);
      const excludeItems = [...currentItemNames, ...dismissedSuggestions];

      const newSuggestions = await generateSuggestions({
        currentItems: currentItemNames,
        excludeItems,
      });

      setSuggestions(newSuggestions);
    } catch (error) {
      console.error("Failed to load suggestions:", error);
      setSuggestions([]);
    } finally {
      setIsLoadingSuggestions(false);
    }
  }, [existingItems, dismissedSuggestions, showSuggestions, generateSuggestions]);

  useEffect(() => {
    if (hasLoadedInitialSuggestions.current) return;

    const timeoutId = setTimeout(() => {
      if (existingItems && existingItems.length > 0 && showSuggestions) {
        hasLoadedInitialSuggestions.current = true;
        loadSuggestions();
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [existingItems?.length, showSuggestions]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleAddSuggestion = useCallback(async (suggestionName: string) => {
    haptic("light");

    setSuggestions((prev) => prev.filter((s) => s !== suggestionName));

    try {
      let price: number | undefined;
      try {
        if (listUserId) {
          const estimate = await estimateItemPrice({ itemName: suggestionName, userId: listUserId as Id<"users"> });
          price = estimate?.estimatedPrice;
        }
      } catch {
        // Price estimation failed -- add without price rather than blocking
      }

      await addItem({
        listId,
        name: suggestionName,
        quantity: 1,
        estimatedPrice: price,
        force: true,
      });
      haptic("success");
    } catch (error) {
      console.error("Failed to add suggestion:", error);
      setSuggestions((prev) => [...prev, suggestionName]);
      alert("Error", "Failed to add item");
    }
  }, [listId, listUserId, addItem, estimateItemPrice, alert]);

  const handleDismissSuggestion = useCallback((suggestionName: string) => {
    haptic("light");
    setSuggestions((prev) => prev.filter((s) => s !== suggestionName));
    setDismissedSuggestions((prev) => [...prev, suggestionName]);
  }, []);

  const handleRefreshSuggestions = useCallback(() => {
    haptic("light");
    loadSuggestions();
  }, [loadSuggestions]);

  const handleToggleSuggestions = useCallback(() => {
    haptic("light");
    setShowSuggestions((prev) => !prev);
    if (!showSuggestions) {
      setDismissedSuggestions([]);
    }
  }, [showSuggestions]);

  return {
    suggestions,
    isLoadingSuggestions,
    showSuggestions,
    handleAddSuggestion,
    handleDismissSuggestion,
    handleRefreshSuggestions,
    handleToggleSuggestions,
  };
}
