import { useCallback } from "react";
import * as ImagePicker from "expo-image-picker";
import type { ScannedProduct } from "@/hooks/useProductScanner";
import { haptic } from "@/lib/haptics/safeHaptics";

// ─────────────────────────────────────────────────────────────────────────────
// Camera + library image picking with permission handling
// ─────────────────────────────────────────────────────────────────────────────

export function useImageCapture({ processImageUri, setIsProcessing, setLastError }: ImageCaptureProps) {
  /**
   * Open camera, take photo, upload, and scan with AI.
   * Returns the scanned product if successful, or null if cancelled/failed/duplicate.
   */
  const captureProduct = useCallback(async () => {
    setLastError(null);

    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== "granted") {
        setLastError("Camera permission required");
        return null;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: "images",
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
  }, [processImageUri, setIsProcessing, setLastError]);

  /**
   * Pick a photo from the device library, upload, and scan with AI.
   * The AI validates that the image is actually a product photo.
   */
  const pickFromLibrary = useCallback(async () => {
    setLastError(null);

    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        setLastError("Photo library permission required");
        return null;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: "images",
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
  }, [processImageUri, setIsProcessing, setLastError]);

  return {
    captureProduct,
    pickFromLibrary,
  };
}
