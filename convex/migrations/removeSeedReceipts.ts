/**
 * One-time migration to remove all placeholder "Seed Data" receipts.
 * 
 * Run from Convex Dashboard → Functions → migrations/removeSeedReceipts:removeSeedReceipts
 * 
 * This cleans up the admin dashboard to show only REAL scanned receipts.
 */
import { internalMutation } from "../_generated/server";

export const removeSeedReceipts = internalMutation({
  args: {},
  handler: async (ctx) => {
    // 1. Find all receipts marked with the admin seed flag
    const seedReceipts = await ctx.db
      .query("receipts")
      .withIndex("by_processing_status") // Just a helper index to scan
      .collect();

    let deletedCount = 0;
    
    for (const receipt of seedReceipts) {
      // Logic for determining if it's "Seed Data":
      // - Explicitly marked as isAdminSeed: true
      // - OR has a dummy imageStorageId (usually "placeholder-X" or "seed-X")
      // - OR has a storage ID that doesn't contain a Convex underscore "_"
      
      const isSeedFlag = !!receipt.isAdminSeed;
      const isDummyId = receipt.imageStorageId && (
        receipt.imageStorageId.startsWith("placeholder") || 
        receipt.imageStorageId.startsWith("seed") ||
        !receipt.imageStorageId.includes("_")
      );

      if (isSeedFlag || isDummyId) {
        await ctx.db.delete(receipt._id);
        deletedCount++;
      }
    }

    console.log(`[removeSeedReceipts] Successfully removed ${deletedCount} seed receipts.`);
    return {
      success: true,
      message: `Deleted ${deletedCount} placeholder receipts.`,
      deletedCount
    };
  },
});
