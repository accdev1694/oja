import { v } from "convex/values";
import { mutation } from "../_generated/server";
import { 
  matchReceiptItems, 
  learnMapping, 
  findLearnedMapping, 
  type ReceiptItem, 
  type CandidateItem 
} from "../lib/itemMatcher";
import { isDuplicateItemName } from "../lib/fuzzyMatch";

export const improveArchivedListPrices = mutation({
  args: { receiptId: v.id("receipts") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    const user = await ctx.db.query("users").withIndex("by_clerk_id", (q: any) => q.eq("clerkId", identity.subject)).unique();
    if (!user) throw new Error("User not found");

    const receipt = await ctx.db.get(args.receiptId);
    if (!receipt || receipt.userId !== user._id) throw new Error("Unauthorized");

    const receiptStoreId = receipt.normalizedStoreId;
    if (!receiptStoreId) return { updated: 0 };

    const priceMap = new Map<string, number>();
    for (const item of receipt.items) {
      priceMap.set(item.name.toLowerCase().trim(), item.unitPrice);
    }
    if (priceMap.size === 0) return { updated: 0 };

    const archivedLists = await ctx.db.query("shoppingLists").withIndex("by_user_status", (q: any) => q.eq("userId", user._id).eq("status", "archived")).collect();
    const completedLists = await ctx.db.query("shoppingLists").withIndex("by_user_status", (q: any) => q.eq("userId", user._id).eq("status", "completed")).collect();
    const sameLists = [...archivedLists, ...completedLists].filter(l => l.normalizedStoreId === receiptStoreId);

    let updated = 0;
    const now = Date.now();
    for (const list of sameLists) {
      const items = await ctx.db.query("listItems").withIndex("by_list", (q: any) => q.eq("listId", list._id)).collect();
      for (const item of items) {
        if (item.actualPrice != null) continue;
        const newPrice = priceMap.get(item.name.toLowerCase().trim());
        if (newPrice !== undefined && newPrice !== item.estimatedPrice) {
          await ctx.db.patch(item._id, { estimatedPrice: newPrice, priceSource: "crowdsourced", updatedAt: now });
          updated++;
        }
      }
    }
    return { updated };
  },
});

export const refreshActiveListsFromReceipt = mutation({
  args: { receiptId: v.id("receipts") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    const user = await ctx.db.query("users").withIndex("by_clerk_id", (q: any) => q.eq("clerkId", identity.subject)).unique();
    if (!user) throw new Error("User not found");

    const receipt = await ctx.db.get(args.receiptId);
    if (!receipt || receipt.userId !== user._id) throw new Error("Unauthorized");

    const receiptStoreId = receipt.normalizedStoreId;
    if (!receiptStoreId) return { updated: 0, listsUpdated: 0 };

    const receiptItemsForMatching: ReceiptItem[] = receipt.items.map((item) => ({
      name: item.name,
      unitPrice: item.unitPrice,
      quantity: item.quantity,
      category: item.category,
    }));
    if (receiptItemsForMatching.length === 0) return { updated: 0, listsUpdated: 0, learned: 0 };

    const activeLists = await ctx.db.query("shoppingLists").withIndex("by_user_status", (q: any) => q.eq("userId", user._id).eq("status", "active")).collect();
    const sameStoreLists = activeLists.filter(l => l.normalizedStoreId === receiptStoreId);
    if (sameStoreLists.length === 0) return { updated: 0, listsUpdated: 0, learned: 0 };

    const now = Date.now();
    let totalUpdated = 0;
    let listsUpdated = 0;
    let learned = 0;

    for (const list of sameStoreLists) {
      const items = await ctx.db.query("listItems").withIndex("by_list", (q: any) => q.eq("listId", list._id)).collect();
      const candidates: CandidateItem[] = items.filter((item) => !item.isChecked && !item.priceOverride).map((item) => ({
        id: item._id,
        type: "list_item" as const,
        name: item.name,
        category: item.category,
        estimatedPrice: item.estimatedPrice,
      }));

      if (candidates.length === 0) continue;

      const { matched } = await matchReceiptItems(ctx, receiptItemsForMatching, candidates, receiptStoreId);
      let listItemsUpdated = 0;

      for (const result of matched) {
        if (result.bestMatch && result.matchScore >= 70) {
          const listItem = items.find((i) => i._id === result.bestMatch!.id);
          if (listItem && result.receiptItem.unitPrice !== listItem.estimatedPrice) {
            await ctx.db.patch(result.bestMatch.id as any, { estimatedPrice: result.receiptItem.unitPrice, priceSource: "personal", priceConfidence: 0.95, updatedAt: now });
            listItemsUpdated++;
            totalUpdated++;
            await learnMapping(ctx, receiptStoreId, result.receiptItem.name, result.bestMatch.name, result.bestMatch.category, result.receiptItem.unitPrice, user._id);
            learned++;
          }
        }
      }

      for (const item of items) {
        if (item.isChecked || item.priceOverride || matched.some(m => m.bestMatch?.id === item._id)) continue;
        const learnedMatch = await findLearnedMapping(ctx, receiptStoreId, item.name);
        if (learnedMatch && learnedMatch.confidence >= 60) {
          const receiptMatch = receiptItemsForMatching.find((ri) => isDuplicateItemName(learnedMatch.canonicalName, ri.name) || isDuplicateItemName(item.name, ri.name));
          if (receiptMatch && receiptMatch.unitPrice !== item.estimatedPrice) {
            await ctx.db.patch(item._id, { estimatedPrice: receiptMatch.unitPrice, priceSource: "personal", priceConfidence: 0.9 * (learnedMatch.confidence / 100), updatedAt: now });
            listItemsUpdated++;
            totalUpdated++;
            continue;
          }
        }
        const matchingReceiptItem = receiptItemsForMatching.find((ri) => isDuplicateItemName(item.name, ri.name));
        if (matchingReceiptItem && matchingReceiptItem.unitPrice !== item.estimatedPrice) {
          await ctx.db.patch(item._id, { estimatedPrice: matchingReceiptItem.unitPrice, priceSource: "personal", priceConfidence: 0.85, updatedAt: now });
          listItemsUpdated++;
          totalUpdated++;
        }
      }

      if (listItemsUpdated > 0) {
        await ctx.db.patch(list._id, { updatedAt: now });
        listsUpdated++;
      }
    }
    return { updated: totalUpdated, listsUpdated, learned };
  },
});
