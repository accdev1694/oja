import { useState, useCallback, useRef, useEffect } from "react";
import * as ImagePicker from "expo-image-picker";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAction, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { haptic } from "@/lib/haptics/safeHaptics";
import {
  normalizeItemName,
  calculateSimilarity,
} from "@/lib/text/fuzzyMatch";

const STORAGE_KEY = "oja:scannedProducts";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface ScannedProduct {
  name: string;
  category: string;
  quantity: number;
  size?: string;
  unit?: string;
  brand?: string;
  estimatedPrice?: number;
  confidence: number;
  imageStorageId: string;
  /** Local file URI for immediate display before upload completes */
  localImageUri?: string;
  /** Processing status — undefined or 'ready' means complete */
  status?: "pending" | "ready";
}

export interface UseProductScannerOptions {
  /** Called when a scanned product is a duplicate of one already in the session */
  onDuplicate?: (existing: ScannedProduct, scanned: ScannedProduct) => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// Client-side dedup helpers
// ─────────────────────────────────────────────────────────────────────────────

const QUEUE_DEDUP_THRESHOLD = 92;

/** Two products match if normalised names are exact or ≥92% similar, and sizes agree. */
function isSameQueueProduct(a: ScannedProduct, b: ScannedProduct): boolean {
  const normA = normalizeItemName(a.name);
  const normB = normalizeItemName(b.name);
  if (!normA || !normB) return false;

  if (normA === normB) return sizesMatch(a.size, b.size);

  const sim = calculateSimilarity(normA, normB);
  if (sim >= QUEUE_DEDUP_THRESHOLD) return sizesMatch(a.size, b.size);

  return false;
}

function sizesMatch(a?: string, b?: string): boolean {
  const normA = normalizeSize(a);
  const normB = normalizeSize(b);
  // Both absent → match; both present → must be equal
  return normA === normB;
}

function normalizeSize(size?: string): string {
  if (!size || !size.trim()) return "";
  return size.toLowerCase().trim().replace(/\s+/g, "");
}

// ─────────────────────────────────────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────────────────────────────────────

export function useProductScanner(options?: UseProductScannerOptions) {
  const [scannedProducts, setScannedProducts] = useState<ScannedProduct[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);
  const hydratedRef = useRef(false);

  // Hydrate from AsyncStorage on mount.
  // Uses functional updater to MERGE with any items that may have been
  // added before hydration completed (e.g. Android activity recreation
  // during image picker — the picker callback can fire before the async
  // AsyncStorage read resolves).
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((raw) => {
      hydratedRef.current = true;
      if (raw) {
        try {
          const parsed: ScannedProduct[] = JSON.parse(raw);
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
          // corrupted — ignore
        }
      }
    });
  }, []);

  // Persist to AsyncStorage on every change (skip initial empty state before hydration).
  // Only persist ready items — pending items have local URIs that won't survive restart.
  useEffect(() => {
    if (!hydratedRef.current) return;
    const readyProducts = scannedProducts.filter((p) => p.status !== "pending");
    if (readyProducts.length === 0) {
      AsyncStorage.removeItem(STORAGE_KEY);
    } else {
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(readyProducts));
    }
  }, [scannedProducts]);

  // Keep a ref so the capture callback always sees the latest products
  const productsRef = useRef<ScannedProduct[]>([]);
  productsRef.current = scannedProducts;

  const onDuplicateRef = useRef(options?.onDuplicate);
  onDuplicateRef.current = options?.onDuplicate;

  const generateUploadUrl = useMutation(api.receipts.generateUploadUrl);
  const scanProduct = useAction(api.ai.scanProduct);

  /** Helper: remove a pending item by its localImageUri */
  const removePending = useCallback((uri: string) => {
    setScannedProducts((prev) =>
      prev.filter((p) => !(p.localImageUri === uri && p.status === "pending"))
    );
  }, []);

  /**
   * Shared: add pending tile immediately, upload, AI-scan, dedup, then
   * promote to ready or remove on failure.
   */
  const processImageUri = useCallback(
    async (uri: string, errorHint: string): Promise<ScannedProduct | null> => {
      setIsProcessing(true);
      haptic("medium");

      // Add pending item to queue immediately for visual feedback
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

      try {
        // Upload image to Convex storage
        const uploadUrl = await generateUploadUrl();
        const imageResponse = await fetch(uri);
        const blob = await imageResponse.blob();

        const uploadResponse = await fetch(uploadUrl, {
          method: "POST",
          headers: { "Content-Type": blob.type },
          body: blob,
        });

        if (!uploadResponse.ok) {
          throw new Error("Upload failed");
        }

        const { storageId } = await uploadResponse.json();

        // Call AI to identify product
        const parsed = await scanProduct({ storageId });

        if (!parsed.success) {
          haptic("error");
          setLastError(parsed.rejection || errorHint);
          removePending(uri);
          setIsProcessing(false);
          return null;
        }

        const product: ScannedProduct = {
          name: parsed.name as string,
          category: parsed.category as string,
          quantity: typeof parsed.quantity === "number" ? parsed.quantity : 1,
          size: parsed.size as string | undefined,
          unit: parsed.unit as string | undefined,
          brand: parsed.brand as string | undefined,
          estimatedPrice: parsed.estimatedPrice as number | undefined,
          confidence: parsed.confidence as number,
          imageStorageId: storageId,
          localImageUri: uri,
          status: "ready",
        };

        // Client-side dedup: same normalised name (or ≥92% similar) + matching size
        const existingMatch = productsRef.current.find(
          (p) => p.status !== "pending" && isSameQueueProduct(p, product)
        );
        if (existingMatch) {
          haptic("warning");
          removePending(uri);
          setIsProcessing(false);
          onDuplicateRef.current?.(existingMatch, product);
          return null;
        }

        // Replace pending item with ready product
        setScannedProducts((prev) =>
          prev.map((p) =>
            p.localImageUri === uri && p.status === "pending" ? product : p
          )
        );
        haptic("success");
        setIsProcessing(false);
        return product;
      } catch (error) {
        // Remove pending item on any error — let caller handle the rest
        removePending(uri);
        throw error;
      }
    },
    [generateUploadUrl, scanProduct, removePending]
  );

  /**
   * Open camera, take photo, upload, and scan with AI.
   * Returns the scanned product if successful, or null if cancelled/failed/duplicate.
   */
  const captureProduct = useCallback(async (): Promise<ScannedProduct | null> => {
    setLastError(null);

    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== "granted") {
        setLastError("Camera permission required");
        return null;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: "images" as ImagePicker.MediaType,
        allowsEditing: true,
        quality: 0.8,
        aspect: [1, 1],
      });

      if (result.canceled || !result.assets[0]) {
        return null;
      }

      return await processImageUri(
        result.assets[0].uri,
        "Product not recognised. Snap the label showing name and size."
      );
    } catch (error) {
      console.error("Product scan error:", error);
      haptic("error");
      setLastError(
        error instanceof Error ? error.message : "Failed to scan product"
      );
      setIsProcessing(false);
      return null;
    }
  }, [processImageUri]);

  /**
   * Pick a photo from the device library, upload, and scan with AI.
   * The AI validates that the image is actually a product photo.
   */
  const pickFromLibrary = useCallback(async (): Promise<ScannedProduct | null> => {
    setLastError(null);

    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        setLastError("Photo library permission required");
        return null;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: "images" as ImagePicker.MediaType,
        allowsEditing: true,
        quality: 0.8,
        aspect: [1, 1],
      });

      if (result.canceled || !result.assets[0]) {
        return null;
      }

      return await processImageUri(
        result.assets[0].uri,
        "This doesn't look like a product photo. Pick a clear image of a product label."
      );
    } catch (error) {
      console.error("Library scan error:", error);
      haptic("error");
      setLastError(
        error instanceof Error ? error.message : "Failed to scan image"
      );
      setIsProcessing(false);
      return null;
    }
  }, [processImageUri]);

  /** Remove a scanned product by index */
  const removeProduct = useCallback((index: number) => {
    haptic("light");
    setScannedProducts((prev) => prev.filter((_, i) => i !== index));
  }, []);

  /** Update a scanned product (e.g., edit name or price) */
  const updateProduct = useCallback(
    (index: number, updates: Partial<ScannedProduct>) => {
      setScannedProducts((prev) =>
        prev.map((p, i) => (i === index ? { ...p, ...updates } : p))
      );
    },
    []
  );

  /** Manually add a product (e.g. from pantry browser) with dedup check */
  const addProduct = useCallback((product: ScannedProduct): boolean => {
    const existingMatch = productsRef.current.find(
      (p) => p.status !== "pending" && isSameQueueProduct(p, product)
    );
    if (existingMatch) {
      onDuplicateRef.current?.(existingMatch, product);
      return false;
    }
    setScannedProducts((prev) => [...prev, product]);
    haptic("success");
    return true;
  }, []);

  /** Clear all scanned products and storage */
  const clearAll = useCallback(() => {
    setScannedProducts([]);
    setLastError(null);
    AsyncStorage.removeItem(STORAGE_KEY);
  }, []);

  return {
    scannedProducts,
    isProcessing,
    lastError,
    captureProduct,
    pickFromLibrary,
    addProduct,
    removeProduct,
    updateProduct,
    clearAll,
  };
}
