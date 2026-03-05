import { useState, useCallback } from "react";
import * as ImagePicker from "expo-image-picker";
import { useAction, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { haptic } from "@/lib/haptics/safeHaptics";
import { useRouter } from "expo-router";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB limit for receipts (can be larger than products)

export interface UseReceiptScannerOptions {
  returnTo?: string;
  onSuccess?: (receiptId: string) => void;
}

export function useReceiptScanner(options?: UseReceiptScannerOptions) {
  const router = useRouter();
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);

  const generateUploadUrl = useMutation(api.receipts.generateUploadUrl);
  const parseReceipt = useAction(api.ai.parseReceipt);
  const saveReceipt = useMutation(api.receipts.create);

  const processImageUri = useCallback(
    async (uri: string): Promise<string | null> => {
      setIsProcessing(true);
      setLastError(null);
      haptic("medium");

      try {
        // 1. Upload to Convex Storage
        const uploadUrl = await generateUploadUrl();
        const imageResponse = await fetch(uri);
        const blob = await imageResponse.blob();

        if (blob.size > MAX_FILE_SIZE) {
          throw new Error("Receipt image too large. Please take a closer photo (max 10MB).");
        }

        const uploadResponse = await fetch(uploadUrl, {
          method: "POST",
          headers: { "Content-Type": blob.type },
          body: blob,
        });

        if (!uploadResponse.ok) throw new Error("Upload failed");
        const { storageId } = await uploadResponse.json();

        // 2. AI Parse
        const parsed = await parseReceipt({ storageId });

        if (parsed.rejection) {
          throw new Error(parsed.rejection);
        }

        // 3. Save to Database (all at once)
        const receiptId = await saveReceipt({
          imageStorageId: storageId,
          storeName: parsed.storeName,
          storeAddress: parsed.storeAddress,
          purchaseDate: new Date(parsed.purchaseDate).getTime(),
          items: parsed.items,
          total: parsed.total,
          tax: parsed.tax,
          subtotal: parsed.subtotal,
          imageQuality: parsed.imageQuality,
          imageHash: parsed.imageHash,
        });

        haptic("success");
        setIsProcessing(false);

        if (options?.onSuccess) {
          options.onSuccess(receiptId);
        } else {
          // Default: go to receipt detail review
          router.push(`/receipt/${receiptId}/confirm` as any);
        }

        return receiptId;
      } catch (error) {
        console.error("Receipt scan error:", error);
        haptic("error");
        const msg = error instanceof Error ? error.message : "Failed to process receipt";
        setLastError(msg);
        setIsProcessing(false);
        return null;
      }
    },
    [generateUploadUrl, parseReceipt, saveReceipt, options, router]
  );

  const captureReceipt = useCallback(async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      setLastError("Camera permission required");
      return null;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });

    if (result.canceled || !result.assets[0]) return null;
    return await processImageUri(result.assets[0].uri);
  }, [processImageUri]);

  const pickReceipt = useCallback(async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      setLastError("Photo library permission required");
      return null;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });

    if (result.canceled || !result.assets[0]) return null;
    return await processImageUri(result.assets[0].uri);
  }, [processImageUri]);

  return {
    isProcessing,
    lastError,
    captureReceipt,
    pickReceipt,
    setLastError,
  };
}
