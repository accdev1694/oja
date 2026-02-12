import { useState, useCallback, useRef, useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

export interface ItemSuggestion {
  name: string;
  source: "pantry" | "known" | "variant";
  similarity: number;
  isExactMatch: boolean;
  pantryItemId?: string;
  stockLevel?: string;
  estimatedPrice?: number;
  priceSource?: string;
  storeName?: string;
  size?: string;
  unit?: string;
  category?: string;
}

export interface DidYouMean {
  original: string;
  suggestion: string;
  similarity: number;
}

interface UseItemSuggestionsOptions {
  storeName?: string;
  debounceMs?: number;
  minChars?: number;
}

export function useItemSuggestions(options?: UseItemSuggestionsOptions) {
  const { storeName, debounceMs = 300, minChars = 2 } = options ?? {};

  const [debouncedTerm, setDebouncedTerm] = useState("");
  const [dismissed, setDismissed] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestTermRef = useRef("");

  // Reactive Convex query — skips when term is too short
  const queryArgs = useMemo(() => {
    if (debouncedTerm.trim().length < minChars) return "skip" as const;
    return {
      searchTerm: debouncedTerm.trim(),
      ...(storeName ? { storeName } : {}),
    };
  }, [debouncedTerm, storeName, minChars]);

  const result = useQuery(api.itemSearch.searchItems, queryArgs);

  const suggestions: ItemSuggestion[] = result?.suggestions ?? [];
  const didYouMean: DidYouMean | null =
    !dismissed && result?.didYouMean ? result.didYouMean : null;
  const isLoading = queryArgs !== "skip" && result === undefined;

  const search = useCallback(
    (term: string) => {
      latestTermRef.current = term;
      setDismissed(false);

      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }

      if (term.trim().length < minChars) {
        setDebouncedTerm("");
        return;
      }

      timerRef.current = setTimeout(() => {
        // Only update if this is still the latest term
        if (latestTermRef.current === term) {
          setDebouncedTerm(term);
        }
      }, debounceMs);
    },
    [debounceMs, minChars]
  );

  const acceptSuggestion = useCallback(
    (suggestion: ItemSuggestion): string => {
      setDebouncedTerm("");
      setDismissed(false);
      return suggestion.name;
    },
    []
  );

  const acceptDidYouMean = useCallback((): string => {
    if (!didYouMean) return latestTermRef.current;
    const corrected = didYouMean.suggestion;
    setDebouncedTerm("");
    setDismissed(false);
    return corrected;
  }, [didYouMean]);

  const dismissDidYouMean = useCallback(() => {
    setDismissed(true);
  }, []);

  const clear = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    setDebouncedTerm("");
    setDismissed(false);
    latestTermRef.current = "";
  }, []);

  return {
    suggestions,
    didYouMean,
    isLoading,
    search,
    acceptSuggestion,
    acceptDidYouMean,
    dismissDidYouMean,
    clear,
  };
}
