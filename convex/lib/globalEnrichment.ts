/**
 * Global product DB enrichment from scanned products.
 *
 * When users scan products (via the product scanner), the data should also
 * enrich the shared `itemVariants` and `currentPrices` tables so that all
 * users benefit from improved product catalog and pricing.
 *
 * Called from both listItems.addBatchFromScan and pantryItems.addBatchFromScan.
 */

import type { MutationCtx } from "../_generated/server";
import type { Id } from "../_generated/dataModel";
import { isValidProductName, variantKey } from "./communityHelpers";
import { normalizeItemName } from "./fuzzyMatch";
import { cleanItemForStorage } from "./itemNameParser";

/**
 * Enrich global product DB from a scanned product.
 * Writes to `itemVariants` (product catalog) and optionally `currentPrices` (AI estimate).
 */
export async function enrichGlobalFromProductScan(
  ctx: MutationCtx,
  item: {
    name: string;
    category: string;
    size?: string;
    unit?: string;
    brand?: string;
    estimatedPrice?: number;
    confidence?: number;
    imageStorageId?: string;
  },
  userId: Id<"users">,
): Promise<void> {
  // Normalize name/size/unit through the canonical parser so legacy callers
  // that pass "250" + "g" (separate) become "250g" + "g" here. Without this,
  // the variant row gets a bare-number size and every downstream seed/display
  // renders "250 Butter" instead of "250g Butter".
  const cleaned = cleanItemForStorage(item.name, item.size, item.unit);
  // Skip if no size/unit — can't create a meaningful variant
  if (!cleaned.size || !cleaned.unit) return;
  const cleanedItemName = cleaned.name;
  const cleanedSize = cleaned.size;
  const cleanedUnit = cleaned.unit;

  const normalizedBase = cleanedItemName.toLowerCase().trim();
  const normalizedSize = cleanedSize.toLowerCase().trim();

  // Quality gates (same as enrichFromScan in itemVariants.ts)
  const confidenceOk = (item.confidence ?? 0) >= 70;
  const nameValid = isValidProductName(cleanedItemName);
  const communityEnrich = confidenceOk && nameValid;

  // Find existing variants for this base item
  let existing = await ctx.db
    .query("itemVariants")
    .withIndex("by_base_item", (q) => q.eq("baseItem", normalizedBase))
    .collect();

  // Fuzzy fallback: check if any baseItem is a suffix of the scanned name
  // (e.g. scanned "free range eggs" -> DB has "eggs")
  if (existing.length === 0) {
    const words = normalizedBase.split(/\s+/);
    for (let i = 1; i < words.length; i++) {
      const suffix = words.slice(i).join(" ");
      const fallback = await ctx.db
        .query("itemVariants")
        .withIndex("by_base_item", (q) => q.eq("baseItem", suffix))
        .collect();
      if (fallback.length > 0) {
        existing = fallback;
        break;
      }
    }
  }

  // Compute variant key for community dedup
  const scanKey = variantKey(cleanedItemName, cleanedSize);

  // Match by size (normalized) OR by variant key for community matching
  const match =
    existing.find((v) => v.size.toLowerCase().trim() === normalizedSize) ??
    (communityEnrich
      ? existing.find(
          (v) => variantKey(v.productName ?? v.variantName, v.size) === scanKey,
        )
      : undefined);

  if (match) {
    // Enrich existing variant with scan data
    const updates: Record<string, unknown> = {
      scanCount: (match.scanCount ?? 0) + 1,
    };
    if (item.brand) updates.brand = item.brand;
    if (item.estimatedPrice != null) updates.estimatedPrice = item.estimatedPrice;
    if (match.source === "ai_seeded") updates.source = "scan_enriched";

    // Community enrichment: update shared fields when gating passes
    if (communityEnrich) {
      updates.lastSeenAt = Date.now();
      updates.userCount = (match.userCount ?? 0) + 1;
      // First image wins — only set if not already present
      if (!match.imageStorageId && item.imageStorageId) {
        updates.imageStorageId = item.imageStorageId as Id<"_storage">;
      }
    }

    await ctx.db.patch(match._id, updates);
  } else {
    // Create new variant under the existing baseItem if we found one,
    // otherwise use the scanned name
    const targetBase = existing.length > 0 ? existing[0].baseItem : normalizedBase;
    const newVariantName = `${cleanedItemName} ${cleanedSize}`;

    await ctx.db.insert("itemVariants", {
      baseItem: targetBase,
      variantName: newVariantName,
      size: cleanedSize,
      unit: cleanedUnit,
      category: item.category,
      source: "scan_enriched",
      brand: item.brand,
      productName: cleanedItemName,
      estimatedPrice: item.estimatedPrice,
      scanCount: 1,
      // Community fields on new variants (if gating passes)
      ...(communityEnrich
        ? {
            userCount: 1,
            lastSeenAt: Date.now(),
            ...(item.imageStorageId
              ? { imageStorageId: item.imageStorageId as Id<"_storage"> }
              : {}),
          }
        : {}),
    });
  }

  // Also write AI-estimated price to currentPrices if we have one
  if (item.estimatedPrice != null && nameValid) {
    const storeName = "AI Estimate";
    const existingPrice = await ctx.db
      .query("currentPrices")
      .withIndex("by_item_store", (q) =>
        q.eq("normalizedName", normalizedBase).eq("storeName", storeName),
      )
      .first();

    const now = Date.now();
    if (existingPrice) {
      // Only update if no receipt-verified price exists (reportCount === 0 means AI-only)
      if (existingPrice.reportCount === 0) {
        await ctx.db.patch(existingPrice._id, {
          unitPrice: item.estimatedPrice,
          averagePrice: item.estimatedPrice,
          confidence: 0.05,
          updatedAt: now,
          size: cleanedSize,
          unit: cleanedUnit,
        });
      }
    } else {
      await ctx.db.insert("currentPrices", {
        normalizedName: normalizedBase,
        itemName: cleanedItemName,
        storeName,
        unitPrice: item.estimatedPrice,
        averagePrice: item.estimatedPrice,
        reportCount: 0,
        confidence: 0.05,
        lastSeenDate: now,
        lastReportedBy: userId,
        updatedAt: now,
        size: cleanedSize,
        unit: cleanedUnit,
      });
    }
  }
}

/**
 * Enrich global product DB from a processed receipt.
 * This is the primary driver for "Communal Price Intelligence".
 * Updates itemVariants and currentPrices with real-world store/region data.
 */
export async function enrichGlobalFromReceipt(
  ctx: MutationCtx,
  receipt: {
    userId: Id<"users">;
    storeName: string;
    normalizedStoreId?: string;
    purchaseDate: number;
    items: {
      name: string;
      quantity: number;
      unitPrice: number;
      category?: string;
      size?: string;
      unit?: string;
    }[];
  }
): Promise<void> {
  const user = await ctx.db.get(receipt.userId);
  // In a real app, we might extract the region from user.postcodePrefix or similar.
  // For now, we'll use a placeholder or country-level region if available.
  const region = user?.postcodePrefix || user?.country || "UK";

  for (const item of receipt.items) {
    const nameValid = isValidProductName(item.name);
    if (!nameValid) continue;

    // Canonicalize before touching the shared catalogue. Receipt OCR often
    // hands us a bare-number size and a separate unit; without cleaning, the
    // variant ends up unusable downstream.
    const cleaned = cleanItemForStorage(item.name, item.size, item.unit);
    const cleanedItemName = cleaned.name;
    const cleanedSize = cleaned.size;
    const cleanedUnit = cleaned.unit;

    const normalizedBase = cleanedItemName.toLowerCase().trim();
    const now = Date.now();

    // ── 1. Update/Create Item Variant ────────────────────────────────────────
    // Only write a variant row when we have a valid size+unit pair — a variant
    // with placeholder "Standard" + "unit" is meaningless and pollutes the
    // global catalogue (CLAUDE.md rule #13: size without unit is UNACCEPTABLE).
    if (cleanedSize && cleanedUnit) {
      const existingVariants = await ctx.db
        .query("itemVariants")
        .withIndex("by_base_item", (q) => q.eq("baseItem", normalizedBase))
        .collect();

      const scanKey = variantKey(cleanedItemName, cleanedSize);
      const match = existingVariants.find(
        (v) => variantKey(v.productName ?? v.variantName, v.size) === scanKey
      );

      if (match) {
        await ctx.db.patch(match._id, {
          scanCount: (match.scanCount ?? 0) + 1,
          userCount: (match.userCount ?? 0) + 1,
          lastSeenAt: now,
          // If we found a real price, update the estimate
          estimatedPrice: item.unitPrice,
          source: "receipt_discovered",
          region,
        });
      } else {
        const targetBase = existingVariants.length > 0 ? existingVariants[0].baseItem : normalizedBase;
        await ctx.db.insert("itemVariants", {
          baseItem: targetBase,
          variantName: `${cleanedItemName} ${cleanedSize}`,
          size: cleanedSize,
          unit: cleanedUnit,
          category: item.category || "Other",
          source: "receipt_discovered",
          productName: cleanedItemName,
          estimatedPrice: item.unitPrice,
          scanCount: 1,
          userCount: 1,
          lastSeenAt: now,
          region,
        });
      }
    }

    // ── 2. Update Communal Prices (The "Price Engine") ───────────────────────
    const existingPrice = await ctx.db
      .query("currentPrices")
      .withIndex("by_item_store_region", (q) =>
        q.eq("normalizedName", normalizedBase).eq("storeName", receipt.storeName).eq("region", region)
      )
      .first();

    if (existingPrice) {
      const oldAverage = existingPrice.averagePrice ?? existingPrice.unitPrice;
      const oldTotal = oldAverage * existingPrice.reportCount;
      const newReportCount = existingPrice.reportCount + 1;
      const newAverage = (oldTotal + item.unitPrice) / newReportCount;

      await ctx.db.patch(existingPrice._id, {
        unitPrice: item.unitPrice, // Freshest price
        averagePrice: newAverage,
        minPrice: Math.min(existingPrice.minPrice ?? item.unitPrice, item.unitPrice),
        maxPrice: Math.max(existingPrice.maxPrice ?? item.unitPrice, item.unitPrice),
        reportCount: newReportCount,
        lastSeenDate: receipt.purchaseDate,
        lastReportedBy: receipt.userId,
        normalizedStoreId: receipt.normalizedStoreId,
        region,
        updatedAt: now,
        // Update size/unit only when the cleaned pair is valid — avoid
        // overwriting a good size with a stray bare-number entry.
        ...(cleanedSize && cleanedUnit ? { size: cleanedSize, unit: cleanedUnit } : {}),
      });
    } else {
      await ctx.db.insert("currentPrices", {
        normalizedName: normalizedBase,
        itemName: cleanedItemName,
        storeName: receipt.storeName,
        normalizedStoreId: receipt.normalizedStoreId,
        region,
        unitPrice: item.unitPrice,
        averagePrice: item.unitPrice,
        minPrice: item.unitPrice,
        maxPrice: item.unitPrice,
        reportCount: 1,
        confidence: 0.8, // Initial high confidence for receipt data
        lastSeenDate: receipt.purchaseDate,
        lastReportedBy: receipt.userId,
        updatedAt: now,
        ...(cleanedSize && cleanedUnit ? { size: cleanedSize, unit: cleanedUnit } : {}),
      });
    }
  }
}
