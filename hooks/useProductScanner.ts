import { useState, useCallback, useRef } from "react";
import * as ImagePicker from "expo-image-picker";
import { useAction, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { haptic } from "@/lib/haptics/safeHaptics";
import {
  normalizeItemName,
  calculateSimilarity,
} from "@/lib/text/fuzzyMatch";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface ScannedProduct {
  name: string;
  category: string;
  size?: string;
  unit?: string;
  brand?: string;
  estimatedPrice?: number;
  confidence: number;
  imageStorageId: string;
}

export interface UseProductScannerOptions {
  /** Called when a scanned product is a duplicate of one already in the session */
  onDuplicate?: (existing: ScannedProduct, scanned: ScannedProduct) => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// Client-side dedup helpers
// ─────────────────────────────────────────────────────────────────────────────

const DUPLICATE_THRESHOLD = 85;
const TOKEN_OVERLAP_THRESHOLD = 0.75;

/**
 * Tokenize a normalized name for overlap comparison.
 * Normalizes pack formats so "12pk", "12 pack", "12x" all become "12".
 */
function tokenize(normalizedName: string): string[] {
  const s = normalizedName
    .replace(/(\d+)\s*pk\b/g, "$1")
    .replace(/(\d+)\s*pack\b/g, "$1")
    .replace(/(\d+)\s*x\b/g, "$1")
    .replace(/\bpack\s*of\s*(\d+)/g, "$1");

  const stopWords = new Set(["of", "the", "a", "an", "and", "in", "with", "for"]);
  return s.split(/\s+/).filter((w) => w.length > 0 && !stopWords.has(w));
}

/**
 * Token-overlap similarity using smaller set as denominator.
 * "12 medium free range egg" vs "12pk free range egg"
 * → tokens {12, free, range, egg} overlap = 4/4 = 1.0
 */
function tokenOverlapSimilarity(norm1: string, norm2: string): number {
  const tokens1 = tokenize(norm1);
  const tokens2 = tokenize(norm2);
  if (tokens1.length === 0 || tokens2.length === 0) return 0;

  const set1 = new Set(tokens1);
  const set2 = new Set(tokens2);

  let overlap = 0;
  for (const t of set1) {
    if (set2.has(t)) overlap++;
  }

  return overlap / Math.min(set1.size, set2.size);
}

function isSameProduct(a: ScannedProduct, b: ScannedProduct): boolean {
  const normA = normalizeItemName(a.name);
  const normB = normalizeItemName(b.name);
  if (!normA || !normB) return false;

  // Exact normalized match
  if (normA === normB) return sizesMatch(a.size, b.size);

  // Fuzzy similarity (Levenshtein)
  const sim = calculateSimilarity(normA, normB);
  if (sim >= DUPLICATE_THRESHOLD) return sizesMatch(a.size, b.size);

  // Token-overlap: catches different descriptions of the same product
  const tokenSim = tokenOverlapSimilarity(normA, normB);
  if (tokenSim >= TOKEN_OVERLAP_THRESHOLD) return sizesMatch(a.size, b.size);

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

  // Keep a ref so the capture callback always sees the latest products
  const productsRef = useRef<ScannedProduct[]>([]);
  productsRef.current = scannedProducts;

  const onDuplicateRef = useRef(options?.onDuplicate);
  onDuplicateRef.current = options?.onDuplicate;

  const generateUploadUrl = useMutation(api.receipts.generateUploadUrl);
  const scanProduct = useAction(api.ai.scanProduct);

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

      setIsProcessing(true);
      haptic("medium");

      // Upload image to Convex storage
      const uploadUrl = await generateUploadUrl();
      const imageResponse = await fetch(result.assets[0].uri);
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
        setLastError(parsed.rejection || "Product not recognised. Snap the label showing name and size.");
        setIsProcessing(false);
        return null;
      }

      const product: ScannedProduct = {
        name: parsed.name as string,
        category: parsed.category as string,
        size: parsed.size as string | undefined,
        unit: parsed.unit as string | undefined,
        brand: parsed.brand as string | undefined,
        estimatedPrice: parsed.estimatedPrice as number | undefined,
        confidence: parsed.confidence as number,
        imageStorageId: storageId,
      };

      // Client-side dedup: check against already-scanned products in this session
      const existingMatch = productsRef.current.find((p) => isSameProduct(p, product));
      if (existingMatch) {
        haptic("warning");
        setIsProcessing(false);
        onDuplicateRef.current?.(existingMatch, product);
        return null;
      }

      setScannedProducts((prev) => [...prev, product]);
      haptic("success");
      setIsProcessing(false);
      return product;
    } catch (error) {
      console.error("Product scan error:", error);
      haptic("error");
      setLastError(
        error instanceof Error ? error.message : "Failed to scan product"
      );
      setIsProcessing(false);
      return null;
    }
  }, [generateUploadUrl, scanProduct]);

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

  /** Clear all scanned products */
  const clearAll = useCallback(() => {
    setScannedProducts([]);
    setLastError(null);
  }, []);

  return {
    scannedProducts,
    isProcessing,
    lastError,
    captureProduct,
    removeProduct,
    updateProduct,
    clearAll,
  };
}
