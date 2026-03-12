import { v } from "convex/values";
import { mutation, internalMutation } from "../_generated/server";
import { normalizeStoreName } from "../lib/storeNormalizer";
import { computeConfidence, computeWeightedAverage } from "../lib/priceValidator";
import { isValidProductName } from "../lib/communityHelpers";
import { toGroceryTitleCase } from "../lib/titleCase";

const TWELVE_MONTHS_MS = 365 * 24 * 60 * 60 * 1000;

export const pruneStale = internalMutation({
  args: {},
  handler: async (ctx) => {
    const twelveMonthsAgo = Date.now() - TWELVE_MONTHS_MS;
    const stalePrices = await ctx.db
      .query("currentPrices")
      .withIndex("by_updated", (q) => q.lt("updatedAt", twelveMonthsAgo))
      .collect();

    let deletedCount = 0;
    for (const price of stalePrices) {
      await ctx.db.delete(price._id);
      deletedCount++;
    }
    return { deleted: deletedCount };
  },
});

export const upsertFromReceipt = mutation({
  args: {
    receiptId: v.id("receipts"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();
    if (!user) throw new Error("User not found");

    const receipt = await ctx.db.get(args.receiptId);
    if (!receipt || receipt.userId !== user._id) {
      throw new Error("Receipt not found or unauthorized");
    }

    const now = Date.now();
    let upsertCount = 0;
    let variantsDiscovered = 0;
    const normalizedStoreId = normalizeStoreName(receipt.storeName);

    for (const item of receipt.items) {
      const normalizedName = item.name.toLowerCase().trim();
      const existing = await ctx.db
        .query("currentPrices")
        .withIndex("by_item_store", (q) =>
          q.eq("normalizedName", normalizedName).eq("storeName", receipt.storeName)
        )
        .first();

      const daysSinceReceipt = Math.max(0, (now - receipt.purchaseDate) / (1000 * 60 * 60 * 24));

      if (existing) {
        if (receipt.purchaseDate >= existing.lastSeenDate) {
          const newReportCount = existing.reportCount + 1;
          const confidence = computeConfidence(newReportCount, daysSinceReceipt);

          await ctx.db.patch(existing._id, {
            unitPrice: item.unitPrice,
            itemName: toGroceryTitleCase(item.name),
            ...(item.size && { size: item.size }),
            ...(item.unit && { unit: item.unit }),
            ...(normalizedStoreId && { normalizedStoreId }),
            minPrice: existing.minPrice !== undefined ? Math.min(existing.minPrice, item.unitPrice) : item.unitPrice,
            maxPrice: existing.maxPrice !== undefined ? Math.max(existing.maxPrice, item.unitPrice) : item.unitPrice,
            averagePrice: existing.averagePrice !== undefined
              ? computeWeightedAverage(existing.averagePrice, existing.reportCount, item.unitPrice, daysSinceReceipt)
              : item.unitPrice,
            confidence,
            lastSeenDate: receipt.purchaseDate,
            reportCount: newReportCount,
            lastReportedBy: user._id,
            updatedAt: now,
          });
          upsertCount++;
        }
      } else {
        const confidence = computeConfidence(1, daysSinceReceipt);
        await ctx.db.insert("currentPrices", {
          normalizedName,
          itemName: toGroceryTitleCase(item.name),
          storeName: receipt.storeName,
          ...(normalizedStoreId && { normalizedStoreId }),
          ...(item.size && { size: item.size }),
          ...(item.unit && { unit: item.unit }),
          unitPrice: item.unitPrice,
          averagePrice: item.unitPrice,
          minPrice: item.unitPrice,
          maxPrice: item.unitPrice,
          confidence,
          lastSeenDate: receipt.purchaseDate,
          reportCount: 1,
          lastReportedBy: user._id,
          updatedAt: now,
        });
        upsertCount++;
      }

      // Variant discovery / Bracket matching logic could be extracted further if needed
      // Keeping it here for now as part of the core upsert flow
      if (item.size && item.unit) {
        const baseItem = normalizedName.replace(/\d+\s*(ml|l|g|kg|pt|pint|pints|pack|oz|lb)\b/gi, "").replace(/\s+/g, " ").trim();
        const existingVariants = await ctx.db.query("itemVariants").withIndex("by_base_item", (q) => q.eq("baseItem", baseItem || normalizedName)).collect();
        const isDuplicate = existingVariants.some((v) => v.variantName.toLowerCase() === item.name.toLowerCase());

        if (!isDuplicate) {
          if (isValidProductName(item.name)) {
            await ctx.db.insert("itemVariants", {
              baseItem: baseItem || normalizedName,
              variantName: toGroceryTitleCase(item.name),
              size: item.size,
              unit: item.unit,
              category: item.category || "Other",
              source: "receipt_discovered",
              scanCount: 1,
              userCount: 1,
              lastSeenAt: now,
            });
            variantsDiscovered++;
          }
        } else {
          const matchingVariant = existingVariants.find((v) => v.variantName.toLowerCase() === item.name.toLowerCase());
          if (matchingVariant) {
            await ctx.db.patch(matchingVariant._id, {
              scanCount: (matchingVariant.scanCount ?? 0) + 1,
              userCount: (matchingVariant.userCount ?? 0) + 1,
              lastSeenAt: now,
            });
          }
        }
      }
    }
    return { upsertCount, variantsDiscovered };
  },
});

export const upsertAIEstimate = mutation({
  args: {
    normalizedName: v.string(),
    itemName: v.string(),
    unitPrice: v.number(),
    userId: v.id("users"),
    size: v.optional(v.string()),
    unit: v.optional(v.string()),
    variantName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const storeName = "AI Estimate";
    const existing = await ctx.db.query("currentPrices").withIndex("by_item_store", (q) => q.eq("normalizedName", args.normalizedName).eq("storeName", storeName)).first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        unitPrice: args.unitPrice,
        averagePrice: args.unitPrice,
        confidence: 0.05,
        updatedAt: now,
        ...(args.size && { size: args.size }),
        ...(args.unit && { unit: args.unit }),
        ...(args.variantName && { variantName: args.variantName }),
      });
      return existing._id;
    }

    return await ctx.db.insert("currentPrices", {
      normalizedName: args.normalizedName,
      itemName: toGroceryTitleCase(args.itemName),
      storeName,
      unitPrice: args.unitPrice,
      averagePrice: args.unitPrice,
      reportCount: 0,
      confidence: 0.05,
      lastSeenDate: now,
      lastReportedBy: args.userId,
      updatedAt: now,
      ...(args.size && { size: args.size }),
      ...(args.unit && { unit: args.unit }),
      ...(args.variantName && { variantName: args.variantName }),
    });
  },
});
