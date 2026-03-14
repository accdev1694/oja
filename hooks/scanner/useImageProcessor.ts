import { useState, useCallback } from "react";
import { useMutation, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { ScannedProduct } from "@/hooks/useProductScanner";

interface ImageProcessorProps {
  addPendingTile: (uri: string) => void;
  removePending: (uri: string) => void;
  promotePending: (uri: string, product: ScannedProduct) => void;
  checkDuplicate: (product: ScannedProduct) => boolean;
  setLastError: (msg: string | null) => void;
}
import { haptic } from "@/lib/haptics/safeHaptics";
import { MAX_FILE_SIZE } from "./dedupHelpers";

// ─────────────────────────────────────────────────────────────────────────────
// Image upload + AI scan pipeline
// ─────────────────────────────────────────────────────────────────────────────

export function useImageProcessor({ addPendingTile, removePending, promotePending, checkDuplicate, setLastError }: ImageProcessorProps) {
  const [isProcessing, setIsProcessing] = useState(false);

  const generateUploadUrl = useMutation(api.receipts.generateUploadUrl);
  const scanProduct = useAction(api.ai.scanProduct);

  /**
   * Shared pipeline: add pending tile, upload image, AI-scan, dedup, then
   * promote to ready or remove on failure.
   */
  const processImageUri = useCallback(
    async (uri: string, errorHint: string) => {
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

        const uploadedData = await uploadResponse.json();
        const storageId = uploadedData.storageId;

        // Call AI to identify product
        const parsed = await scanProduct({ storageId });

        if (!parsed.success) {
          haptic("error");
          setLastError(parsed.rejection || errorHint);
          removePending(uri);
          setIsProcessing(false);
          return null;
        }

        let sizeSourceValue: "visible" | "estimated" | "unknown" | undefined = undefined;
        if (typeof parsed.sizeSource === "string") {
          if (parsed.sizeSource === "visible" || parsed.sizeSource === "estimated" || parsed.sizeSource === "unknown") {
            sizeSourceValue = parsed.sizeSource;
          }
        }

        const product: ScannedProduct = {
          name: typeof parsed.name === "string" ? parsed.name : "Unknown Product",
          category: typeof parsed.category === "string" ? parsed.category : "Other",
          quantity: typeof parsed.quantity === "number" ? parsed.quantity : 1,
          size: typeof parsed.size === "string" ? parsed.size : undefined,
          unit: typeof parsed.unit === "string" ? parsed.unit : undefined,
          brand: typeof parsed.brand === "string" ? parsed.brand : undefined,
          estimatedPrice: typeof parsed.estimatedPrice === "number" ? parsed.estimatedPrice : undefined,
          confidence: typeof parsed.confidence === "number" ? parsed.confidence : 0,
          sizeSource: sizeSourceValue,
          imageStorageId: String(storageId),
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
