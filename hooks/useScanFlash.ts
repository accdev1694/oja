import { useCallback, useEffect, useRef, useState } from "react";
import type { Doc } from "@/convex/_generated/dataModel";
import type { FlashMessage } from "@/components/ui/FlashInsightBanner";

/**
 * Post-scan flash feedback for the Scan tab.
 *
 * Watches `allReceipts` and fires a one-shot `FlashMessage` whenever a
 * receipt transitions to `processingStatus === "completed"` for the first
 * time. Designed so it works for the primary path — user scans a receipt
 * while on the Scan tab, it arrives as "processing", then flips to
 * "completed" a few seconds later.
 *
 * Tracking rules (important):
 *   • Only completed IDs are ever added to the "already flashed" set.
 *     Adding an ID while it's still processing would make us miss the
 *     transition to completed.
 *   • On first load we seed the set with receipts that are ALREADY
 *     completed, so existing history never triggers a flash on mount.
 *     In-flight processing items stay out of the seed set so their
 *     completion still fires exactly once.
 *   • When multiple completions arrive in the same Convex update we pick
 *     the most recently created one to surface, note the extras in the
 *     body text, and mark them all as flashed so none re-trigger.
 */
export function useScanFlash(allReceipts: Doc<"receipts">[] | undefined) {
  const [flashMessage, setFlashMessage] = useState<FlashMessage | null>(null);
  const flashedReceiptIdsRef = useRef<Set<string> | null>(null);
  const handleFlashFinish = useCallback(() => setFlashMessage(null), []);

  useEffect(() => {
    if (!allReceipts) return;

    if (flashedReceiptIdsRef.current === null) {
      flashedReceiptIdsRef.current = new Set(
        allReceipts
          .filter((r) => r.processingStatus === "completed")
          .map((r) => r._id),
      );
      return;
    }

    const flashed = flashedReceiptIdsRef.current;
    const freshCompleted = allReceipts.filter(
      (r) => r.processingStatus === "completed" && !flashed.has(r._id),
    );
    if (freshCompleted.length === 0) return;

    for (const r of freshCompleted) flashed.add(r._id);

    const latest = freshCompleted.reduce((a, b) =>
      (b.createdAt ?? b._creationTime) > (a.createdAt ?? a._creationTime) ? b : a,
    );

    const pts = latest.pointsEarned ?? 0;
    const extra =
      freshCompleted.length > 1 ? ` (+${freshCompleted.length - 1} more)` : "";
    const body =
      pts > 0
        ? `${latest.storeName} \u00b7 \u00a3${latest.total.toFixed(2)} \u00b7 +${pts} pts${extra}`
        : `${latest.storeName} \u00b7 \u00a3${latest.total.toFixed(2)} logged${extra}`;

    setFlashMessage({
      id: `scan-${latest._id}`,
      tone: "success",
      icon: "receipt-text-check-outline",
      title: "Receipt saved",
      body,
    });
  }, [allReceipts]);

  return { flashMessage, handleFlashFinish };
}
