import { useState, useCallback, useRef, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { haptic } from "@/lib/haptics/safeHaptics";
import type { ScannedProduct } from "@/hooks/useProductScanner";
import { STORAGE_KEY, isSameQueueProduct } from "./dedupHelpers";

// ─────────────────────────────────────────────────────────────────────────────
// Queue state management: products array, persistence, add/remove/update/clear
// ─────────────────────────────────────────────────────────────────────────────

export function useScannerQueue(onDuplicate?: (existing: ScannedProduct, duplicate: ScannedProduct) => void) {
  const [scannedProducts, setScannedProducts] = useState<ScannedProduct[]>([]);
  const [lastError, setLastError] = useState<string | null>(null);
  const hydratedRef = useRef(false);

  // Hydrate from AsyncStorage on mount.
  // Uses functional updater to MERGE with any items that may have been
  // added before hydration completed (e.g. Android activity recreation
  // during image picker -- the picker callback can fire before the async
  // AsyncStorage read resolves).
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((raw) => {
      hydratedRef.current = true;
      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setScannedProducts((prev) => {
              if (prev.length === 0) return parsed;
              // Merge: keep items added before hydration, append stored items that aren't dupes
              const existingIds = new Set(prev.map((p) => p.imageStorageId));
              const newFromStorage = parsed.filter((p) => !existingIds.has(p.imageStorageId));
              return [...prev, ...newFromStorage];
            });
          }
        } catch {
          // corrupted -- ignore
        }
      }
    });
  }, []);

  // Persist to AsyncStorage on every change (skip initial empty state before hydration).
  // Only persist ready items -- pending items have local URIs that won't survive restart.
  useEffect(() => {
    if (!hydratedRef.current) return;
    const readyProducts = scannedProducts.filter((p) => p.status !== "pending");
    if (readyProducts.length === 0) {
      AsyncStorage.removeItem(STORAGE_KEY);
    } else {
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(readyProducts));
    }
  }, [scannedProducts]);

  // Keep a ref so callbacks always see the latest products
  const productsRef = useRef<ScannedProduct[]>([]);
  productsRef.current = scannedProducts;

  const onDuplicateRef = useRef(onDuplicate);
  onDuplicateRef.current = onDuplicate;

  /** Helper: remove a pending item by its localImageUri */
  const removePending = useCallback((uri: string) => {
    setScannedProducts((prev) =>
      prev.filter((p) => !(p.localImageUri === uri && p.status === "pending"))
    );
  }, []);

  /** Add a pending placeholder tile for immediate visual feedback */
  const addPendingTile = useCallback((uri: string) => {
    setScannedProducts((prev) => [
      ...prev,
      {
        name: "",
        category: "",
        quantity: 1,
        confidence: 0,
        imageStorageId: "",
        localImageUri: uri,
        status: "pending",
      },
    ]);
  }, []);

  /** Replace a pending item with the ready product */
  const promotePending = useCallback((uri: string, product: ScannedProduct) => {
    setScannedProducts((prev) =>
      prev.map((p) =>
        p.localImageUri === uri && p.status === "pending" ? product : p
      )
    );
  }, []);

  /** Check if a product is a duplicate of one already in the queue */
  const checkDuplicate = useCallback((product: ScannedProduct) => {
    const existingMatch = productsRef.current.find(
      (p) => p.status !== "pending" && isSameQueueProduct(p, product)
    );
    if (existingMatch) {
      onDuplicateRef.current?.(existingMatch, product);
      return true;
    }
    return false;
  }, []);

  /** Remove a scanned product by index */
  const removeProduct = useCallback((index: number) => {
    haptic("light");
    setScannedProducts((prev) => prev.filter((_, i) => i !== index));
  }, []);

  /** Update a scanned product (e.g., edit name or price) */
  const updateProduct = useCallback((index: number, updates: Partial<ScannedProduct>) => {
    setScannedProducts((prev) =>
      prev.map((p, i) => (i === index ? { ...p, ...updates } : p))
    );
  }, []);

  /** Manually add a product (e.g. from pantry browser) with dedup check */
  const addProduct = useCallback((product: ScannedProduct) => {
    if (checkDuplicate(product)) return false;
    setScannedProducts((prev) => [...prev, product]);
    haptic("success");
    return true;
  }, [checkDuplicate]);

  /** Clear only the last error */
  const clearLastError = useCallback(() => {
    setLastError(null);
  }, []);

  /** Clear all scanned products and storage */
  const clearAll = useCallback(() => {
    setScannedProducts([]);
    setLastError(null);
    AsyncStorage.removeItem(STORAGE_KEY);
  }, []);

  return {
    scannedProducts,
    lastError,
    setLastError,
    addPendingTile,
    removePending,
    promotePending,
    checkDuplicate,
    addProduct,
    removeProduct,
    updateProduct,
    clearAll,
    clearLastError,
  };
}
