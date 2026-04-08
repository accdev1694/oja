import { v } from "convex/values";
import { mutation, query } from "../_generated/server";
import {
  requireUser,
  optionalUser,
  requireEditableList,
} from "./helpers";
import {
  getAllStores,
  getStoreInfoSafe,
} from "../lib/storeNormalizer";
import { parseSize } from "../lib/sizeUtils";
import { getUserListPermissions } from "../partners";

const SIZE_MATCH_TOLERANCE = 0.2;

function findClosestSizeMatch(
  targetSize: string,
  availableSizes: { size: string; price: number }[]
): { size: string; price: number; isExact: boolean; percentDiff: number } | null {
  const targetParsed = parseSize(targetSize);
  if (!targetParsed) return null;

  let bestMatch: { size: string; price: number; isExact: boolean; percentDiff: number } | null = null;

  for (const available of availableSizes) {
    const availableParsed = parseSize(available.size);
    if (!availableParsed) continue;
    if (availableParsed.category !== targetParsed.category) continue;

    const diff = Math.abs(availableParsed.normalizedValue - targetParsed.normalizedValue);
    if (targetParsed.normalizedValue === 0) continue;
    const percentDiff = diff / targetParsed.normalizedValue;

    if (percentDiff <= SIZE_MATCH_TOLERANCE) {
      const isExact = percentDiff <= 0.01;
      if (!bestMatch || percentDiff < bestMatch.percentDiff) {
        bestMatch = { size: available.size, price: available.price, isExact, percentDiff };
      }
    }
  }
  return bestMatch;
}

export const compareListAcrossStores = query({
  args: { listId: v.id("shoppingLists") },
  handler: async (ctx, args) => {
    const user = await optionalUser(ctx);
    if (!user) return null;

    const list = await ctx.db.get(args.listId);
    if (!list) return null;

    if (list.userId !== user._id) {
      const partner = await ctx.db
        .query("listPartners")
        .withIndex("by_list_user", (q) =>
          q.eq("listId", args.listId).eq("userId", user._id)
        )
        .unique();
      if (!partner || (partner.status !== "accepted" && partner.status !== "pending")) {
        return null;
      }
    }

    const currentStoreId = list.normalizedStoreId ?? null;
    const items = await ctx.db
      .query("listItems")
      .withIndex("by_list", (q) => q.eq("listId", args.listId))
      .collect();

    if (items.length === 0) return { currentStore: currentStoreId ?? "unknown", currentTotal: 0, alternatives: [] };

    const currentTotal = items.reduce((sum, item) => sum + (item.estimatedPrice ?? 0) * item.quantity, 0);
    const allStores = getAllStores();
    const userFavorites = user.storePreferences?.favorites ?? [];
    const storesToCompare: string[] = [];

    for (const storeId of userFavorites) {
      if (storeId !== currentStoreId && !storesToCompare.includes(storeId)) {
        storesToCompare.push(storeId);
      }
    }

    for (const store of allStores) {
      if (storesToCompare.length >= 5) break;
      if (store.id !== currentStoreId && !storesToCompare.includes(store.id)) {
        storesToCompare.push(store.id);
      }
    }

    // Batch-fetch all prices once per item (not per item × per store)
    type PriceRow = Awaited<ReturnType<typeof ctx.db.get<"currentPrices">>> & {};
    const pricesByItem = new Map<string, PriceRow[]>();
    const uniqueItemNames = new Set(items.map((i) => i.name.toLowerCase().trim()));
    for (const normalizedName of uniqueItemNames) {
      const prices = await ctx.db
        .query("currentPrices")
        .withIndex("by_item", (q) => q.eq("normalizedName", normalizedName))
        .collect();
      pricesByItem.set(normalizedName, prices);
    }

    const alternatives = storesToCompare.map((storeId) => {
      const storeInfo = getStoreInfoSafe(storeId);
      if (!storeInfo) return null;

      let storeTotal = 0;
      for (const item of items) {
        const normalizedItemName = item.name.toLowerCase().trim();
        if (item.priceOverride && item.estimatedPrice) {
          storeTotal += item.estimatedPrice * item.quantity;
          continue;
        }

        const allPrices = pricesByItem.get(normalizedItemName) ?? [];
        const storePrices = allPrices.filter(
          (p) => p.normalizedStoreId === storeId || p.storeName?.toLowerCase() === storeId
        );

        if (storePrices.length === 0) {
          if (item.estimatedPrice) storeTotal += item.estimatedPrice * item.quantity;
          continue;
        }

        const availableSizes = storePrices.map((p) => ({
          size: p.size ?? "",
          price: p.averagePrice ?? p.unitPrice,
        }));

        const itemSize = item.size ?? "";
        let matchedPrice: number | null = null;

        if (itemSize) {
          const sizeMatch = findClosestSizeMatch(itemSize, availableSizes);
          if (sizeMatch) matchedPrice = sizeMatch.price;
        }

        if (matchedPrice === null) {
          const exactMatch = storePrices.find((p) => p.size === itemSize);
          if (exactMatch) matchedPrice = exactMatch.averagePrice ?? exactMatch.unitPrice;
          else {
            const sorted = [...storePrices].sort((a, b) => (a.averagePrice ?? a.unitPrice) - (b.averagePrice ?? b.unitPrice));
            matchedPrice = sorted[0].averagePrice ?? sorted[0].unitPrice;
          }
        }

        if (matchedPrice !== null) storeTotal += matchedPrice * item.quantity;
        else if (item.estimatedPrice) storeTotal += item.estimatedPrice * item.quantity;
      }

      return {
        store: storeId,
        storeDisplayName: storeInfo.displayName,
        storeColor: storeInfo.color,
        total: Math.round(storeTotal * 100) / 100,
        savings: Math.round((currentTotal - storeTotal) * 100) / 100,
      };
    });

    return {
      currentStore: currentStoreId ?? "unknown",
      currentStoreDisplayName: getStoreInfoSafe(currentStoreId || "")?.displayName ?? list.storeName ?? "Unknown Store",
      currentTotal: Math.round(currentTotal * 100) / 100,
      alternatives: alternatives.filter((alt) => alt !== null).sort((a, b) => b!.savings - a!.savings),
    };
  },
});

export const switchStore = mutation({
  args: { listId: v.id("shoppingLists"), newStore: v.string() },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const list = await ctx.db.get(args.listId);
    if (!list) throw new Error("List not found");
    requireEditableList(list);

    const perms = await getUserListPermissions(ctx, args.listId, user._id);
    if (!perms.canEdit) throw new Error("Unauthorized");

    const newStoreInfo = getStoreInfoSafe(args.newStore);
    if (!newStoreInfo) throw new Error(`Invalid store: ${args.newStore}`);

    const previousStore = list.normalizedStoreId ?? "unknown";
    const items = await ctx.db
      .query("listItems")
      .withIndex("by_list", (q) => q.eq("listId", args.listId))
      .collect();

    // Batch-fetch all prices once per unique item name (avoids N+1)
    type SwitchPriceRow = Awaited<ReturnType<typeof ctx.db.get<"currentPrices">>> & {};
    const priceCache = new Map<string, SwitchPriceRow[]>();
    const uniqueNames = new Set(items.map((i) => i.name.toLowerCase().trim()));
    for (const normalizedName of uniqueNames) {
      const prices = await ctx.db
        .query("currentPrices")
        .withIndex("by_item", (q) => q.eq("normalizedName", normalizedName))
        .collect();
      priceCache.set(normalizedName, prices);
    }

    for (const item of items) {
      if (item.priceOverride === true) continue;
      const normalizedItemName = item.name.toLowerCase().trim();

      if (item.sizeOverride === true) {
        const allItemPrices = priceCache.get(normalizedItemName) ?? [];
        const storePrice = allItemPrices.find((p) =>
          (p.normalizedStoreId === args.newStore || p.storeName?.toLowerCase() === args.newStore) &&
          p.size === (item.size ?? "")
        );
        const priceForSize = storePrice ? (storePrice.averagePrice ?? storePrice.unitPrice) : null;
        if (priceForSize !== null) await ctx.db.patch(item._id, { estimatedPrice: priceForSize, updatedAt: Date.now() });
        continue;
      }

      const isSwitchingBackToOriginal = item.originalSize && previousStore !== args.newStore;
      let targetSize = isSwitchingBackToOriginal ? item.originalSize! : (item.size ?? "");

      const prices = priceCache.get(normalizedItemName) ?? [];

      const storePrices = prices.filter(
        (p) => p.normalizedStoreId === args.newStore || p.storeName?.toLowerCase() === args.newStore
      );

      if (storePrices.length === 0) continue;

      const availableSizes = storePrices.map((p) => ({
        size: p.size ?? "",
        price: p.averagePrice ?? p.unitPrice,
      }));

      let matchedSize: string | null = null;
      let matchedPrice: number | null = null;
      let sizeChanged = false;

      if (targetSize) {
        const exactMatch = availableSizes.find((s) => s.size === targetSize);
        if (exactMatch) {
          matchedSize = exactMatch.size;
          matchedPrice = exactMatch.price;
        } else {
          const sizeMatch = findClosestSizeMatch(targetSize, availableSizes);
          if (sizeMatch) {
            matchedSize = sizeMatch.size;
            matchedPrice = sizeMatch.price;
            sizeChanged = !sizeMatch.isExact;
          }
        }
      }

      if (matchedPrice === null && availableSizes.length > 0) {
        const cheapest = [...availableSizes].sort((a, b) => a.price - b.price)[0];
        matchedSize = cheapest.size;
        matchedPrice = cheapest.price;
        sizeChanged = true;
      }

      const updates: Record<string, unknown> = { updatedAt: Date.now() };
      if (matchedPrice !== null) updates.estimatedPrice = matchedPrice;
      if (sizeChanged && matchedSize !== null) {
        if (!item.originalSize) updates.originalSize = item.size;
        updates.size = matchedSize;
      } else if (isSwitchingBackToOriginal && item.originalSize) {
        updates.size = item.originalSize;
        updates.originalSize = undefined;
      }

      if (Object.keys(updates).length > 1) await ctx.db.patch(item._id, updates);
    }

    await ctx.db.patch(args.listId, {
      normalizedStoreId: args.newStore,
      storeName: newStoreInfo.displayName,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

