import { useCallback } from "react";
import * as ImagePicker from "expo-image-picker";
import type { ScannedProduct } from "@/hooks/useProductScanner";
import { haptic } from "@/lib/haptics/safeHaptics";

// ─────────────────────────────────────────────────────────────────────────────
// Camera + library image picking with permission handling
// ─────────────────────────────────────────────────────────────────────────────

interface UseImageCaptureProps {
  processImageUri: (uri: string, errorHint: string) => Promise<ScannedProduct | null>;
  setIsProcessing: (isProcessing: boolean) => void;
  setLastError: (error: string | null) => void;
}

export function useImageCapture(props: UseImageCaptureProps) {
  const {
    processImageUri = () => Promise.resolve(null),
    setIsProcessing = () => {},
    setLastError = () => {},
  } = props ?? {};

  // Ensure non-null through usage
  if (!processImageUri || !setIsProcessing || !setLastError) {
    throw new Error("useImageCapture requires processImageUri, setIsProcessing, and setLastError");
  }

  const _processImageUri = processImageUri;
  const _setIsProcessing = setIsProcessing;
  const _setLastError = setLastError;

  /**
   * Open camera, take photo, upload, and scan with AI.
   * Returns the scanned product if successful, or null if cancelled/failed/duplicate.
   */
  const captureProduct = useCallback(async () => {
    _setLastError(null);

    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== "granted") {
        _setLastError("Camera permission required");
        return null;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
        aspect: [1, 1],
      });

      if (result.canceled || !result.assets[0]) {
        return null;
      }

      return await _processImageUri(
        result.assets[0].uri,
        "Product not recognised. Snap the label showing name and size."
      );
    } catch (error) {
      console.error("Product scan error:", error);
      haptic("error");
      _setLastError(
        error instanceof Error ? error.message : "Failed to scan product"
      );
      _setIsProcessing(false);
      return null;
    }
  }, [_processImageUri, _setIsProcessing, _setLastError]);

  /**
   * Pick a photo from the device library, upload, and scan with AI.
   * The AI validates that the image is actually a product photo.
   */
  const pickFromLibrary = useCallback(async () => {
    _setLastError(null);

    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        _setLastError("Photo library permission required");
        return null;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
        aspect: [1, 1],
      });

      if (result.canceled || !result.assets[0]) {
        return null;
      }

      return await _processImageUri(
        result.assets[0].uri,
        "This doesn't look like a product photo. Pick a clear image of a product label."
      );
    } catch (error) {
      console.error("Library scan error:", error);
      haptic("error");
      _setLastError(
        error instanceof Error ? error.message : "Failed to scan image"
      );
      _setIsProcessing(false);
      return null;
    }
  }, [_processImageUri, _setIsProcessing, _setLastError]);

  return {
    captureProduct,
    pickFromLibrary,
  };
}
