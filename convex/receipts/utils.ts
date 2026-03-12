import { v } from "convex/values";
import { mutation } from "../_generated/server";

export function generateFingerprint(storeName: string, total: number, purchaseDate: number): string {
  const day = new Date(purchaseDate).toISOString().split("T")[0];
  const normStore = storeName.toLowerCase().trim();
  const normTotal = total.toFixed(2);
  return `${normStore}|${normTotal}|${day}`;
}

export const checkDuplicate = mutation({
  args: {
    receiptId: v.id("receipts"),
    storeName: v.string(),
    total: v.number(),
    purchaseDate: v.number(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    const user = await ctx.db.query("users").withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject)).unique();
    if (!user) throw new Error("User not found");

    const fingerprint = generateFingerprint(args.storeName, args.total, args.purchaseDate);
    const existing = await ctx.db.query("receipts").withIndex("by_user_fingerprint", (q: any) => q.eq("userId", user._id).eq("fingerprint", fingerprint)).first();

    if (existing && existing._id !== args.receiptId) {
      return { isDuplicate: true, existingReceipt: { id: existing._id, storeName: existing.storeName, total: existing.total, date: existing.purchaseDate } };
    }
    await ctx.db.patch(args.receiptId, { fingerprint });
    return { isDuplicate: false };
  },
});
