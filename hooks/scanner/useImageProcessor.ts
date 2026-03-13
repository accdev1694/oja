import { useState, useCallback } from "react";
import { useMutation, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { haptic } from "@/lib/haptics/safeHaptics";
import { MAX_FILE_SIZE } from "./dedupHelpers";

// ─────────────────────────────────────────────────────────────────────────────
// Image upload + AI scan pipeline
// ─────────────────────────────────────────────────────────────────────────────

export function useImageProcessor({ addPendingTile, removePending, promotePending, checkDuplicate, setLastError }: any) {
  const [isProcessing, setIsProcessing] = useState(false);

  const generateUploadUrl = useMutation(api.receipts.generateUploadUrl);
  const scanProduct = useAction(api.ai.scanProduct);

  /**
   * Shared pipeline: add pending tile, upload image, AI-scan, dedup, then
   * promote to ready or remove on failure.
   */
  const processImageUri = useCallback(
    async (uri: any, errorHint: any) => {
      setIsProcessing(true);
      haptic("medium");

      // Add pending item to queue immediately for visual feedback
      addPendingTile(uri);

      try {
        // Upload image to Convex storage
        const uploadUrl = await generateUploadUrl();
        const imageResponse = await fetch(uri);
        const blob = await imageResponse.blob();

        // Security/Cost Control: Validate file size before upload
        if (blob.size > MAX_FILE_SIZE) {
          throw new Error("Image too large. Please take a closer photo (max 5MB).");
        }

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

        const product = {
          name: parsed.name,
          category: parsed.category,
          quantity: typeof parsed.quantity === "number" ? parsed.quantity : 1,
          size: parsed.size,
          unit: parsed.unit,
          brand: parsed.brand,
          estimatedPrice: parsed.estimatedPrice,
          confidence: parsed.confidence,
          sizeSource: parsed.sizeSource,
          imageStorageId: storageId,
          localImageUri: uri,
          status: "ready",
        };

        // Client-side dedup: same normalised name (or >=92% similar) + matching size
        if (checkDuplicate(product)) {
          haptic("warning");
          removePending(uri);
          setIsProcessing(false);
          return null;
        }

        // Replace pending item with ready product
        promotePending(uri, product);
        haptic("success");
        setIsProcessing(false);
        return product;
      } catch (error) {
        // Remove pending item on any error -- let caller handle the rest
        removePending(uri);
        throw error;
      }
    },
    [generateUploadUrl, scanProduct, addPendingTile, removePending, promotePending, checkDuplicate, setLastError]
  );

  return {
    isProcessing,
    setIsProcessing,
    processImageUri,
  };
}
