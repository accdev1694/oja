import { useState, useCallback } from "react";
import * as ImagePicker from "expo-image-picker";
import * as Haptics from "expo-haptics";
import { useAction, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";

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

// ─────────────────────────────────────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────────────────────────────────────

export function useProductScanner() {
  const [scannedProducts, setScannedProducts] = useState<ScannedProduct[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);

  const generateUploadUrl = useMutation(api.receipts.generateUploadUrl);
  const scanProduct = useAction(api.ai.scanProduct);

  /**
   * Open camera, take photo, upload, and scan with AI.
   * Returns the scanned product if successful, or null if cancelled/failed.
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
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

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
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        setLastError(parsed.rejection || "Could not identify product");
        setIsProcessing(false);
        return null;
      }

      // Add to scanned products list
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

      setScannedProducts((prev) => [...prev, product]);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setIsProcessing(false);
      return product;
    } catch (error) {
      console.error("Product scan error:", error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setLastError(
        error instanceof Error ? error.message : "Failed to scan product"
      );
      setIsProcessing(false);
      return null;
    }
  }, [generateUploadUrl, scanProduct]);

  /** Remove a scanned product by index */
  const removeProduct = useCallback((index: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
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
