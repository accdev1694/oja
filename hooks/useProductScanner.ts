import { useMemo } from "react";
import { useScannerQueue } from "./scanner/useScannerQueue";
import { useImageProcessor } from "./scanner/useImageProcessor";
import { useImageCapture } from "./scanner/useImageCapture";

// ─────────────────────────────────────────────────────────────────────────────
// Types (public API — re-exported for consumers)
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
  sizeSource?: "visible" | "estimated" | "unknown";
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
// Composed hook
// ─────────────────────────────────────────────────────────────────────────────

export function useProductScanner(options?: UseProductScannerOptions) {
  // 1. Queue state: products array, persistence, add/remove/update/clear
  const queue = useScannerQueue(options?.onDuplicate);

  // 2. Image upload + AI scan pipeline
  const processor = useImageProcessor({
    addPendingTile: queue.addPendingTile,
    removePending: queue.removePending,
    promotePending: queue.promotePending,
    checkDuplicate: queue.checkDuplicate,
    setLastError: queue.setLastError,
  });

  // 3. Camera + library image picking
  const capture = useImageCapture({
    processImageUri: processor.processImageUri,
    setIsProcessing: processor.setIsProcessing,
    setLastError: queue.setLastError,
  });

  return useMemo(
    () => ({
      scannedProducts: queue.scannedProducts,
      isProcessing: processor.isProcessing,
      lastError: queue.lastError,
      captureProduct: capture.captureProduct,
      pickFromLibrary: capture.pickFromLibrary,
      addProduct: queue.addProduct,
      removeProduct: queue.removeProduct,
      updateProduct: queue.updateProduct,
      clearAll: queue.clearAll,
      clearLastError: queue.clearLastError,
    }),
    [
      queue.scannedProducts,
      processor.isProcessing,
      queue.lastError,
      capture.captureProduct,
      capture.pickFromLibrary,
      queue.addProduct,
      queue.removeProduct,
      queue.updateProduct,
      queue.clearAll,
      queue.clearLastError,
    ]
  );
}
