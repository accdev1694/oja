import { v } from "convex/values";
import { mutation } from "../_generated/server";
import {
  isValidProductName,
  variantKey,
} from "../lib/communityHelpers";
import { toGroceryTitleCase } from "../lib/titleCase";
import { trackFunnelEvent } from "../lib/analytics";
import { cleanItemForStorage } from "../lib/itemNameParser";

/**
 * Insert a new variant (from AI seeding or receipt discovery).
 * Skips duplicates (same baseItem + variantName).
 */
export const upsert = mutation({
  args: {
    baseItem: v.string(),
    variantName: v.string(),
    size: v.string(),
    unit: v.string(),
    category: v.string(),
    source: v.string(),
    commonality: v.optional(v.number()),
    estimatedPrice: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // Canonicalize name/size/unit — rejects bare-number sizes like "250"
    // that would otherwise leak into the global catalogue.
    const cleaned = cleanItemForStorage(args.variantName, args.size, args.unit);
    if (!cleaned.size || !cleaned.unit) {
      throw new Error("itemVariants.upsert: size and unit are required and must be valid");
    }
    const normalizedBase = args.baseItem.toLowerCase().trim();

    // Check for existing variant
    const existing = await ctx.db
      .query("itemVariants")
      .withIndex("by_base_item", (q) => q.eq("baseItem", normalizedBase))
      .collect();

    const duplicate = existing.find(
      (v) => v.variantName.toLowerCase() === cleaned.name.toLowerCase()
    );

    if (duplicate) {
      // Update commonality if receipt-discovered and existing was ai-seeded
      if (args.source === "receipt_discovered" && duplicate.source === "ai_seeded") {
        await ctx.db.patch(duplicate._id, {
          source: "receipt_discovered",
          commonality: args.commonality ?? (duplicate.commonality ?? 0) + 0.1,
        });
      }
      // Update estimatedPrice if provided and not already set
      if (args.estimatedPrice != null && duplicate.estimatedPrice == null) {
        await ctx.db.patch(duplicate._id, {
          estimatedPrice: args.estimatedPrice,
        });
      }
      return duplicate._id;
    }

    return await ctx.db.insert("itemVariants", {
      baseItem: normalizedBase,
      variantName: toGroceryTitleCase(cleaned.name),
      size: cleaned.size,
      unit: cleaned.unit,
      category: args.category,
      source: args.source,
      commonality: args.commonality,
      estimatedPrice: args.estimatedPrice,
    });
  },
});

/**
 * Enrich or create a variant from scan data.
 * If a variant with matching baseItem + size exists, enrich it with brand/productName.
 * Otherwise create a new variant. Increments scanCount each time.
 *
 * Community enrichment (updating userCount, lastSeenAt, imageStorageId) is gated on:
 * 1. AI confidence >= 70
 * 2. Valid product name (not garbage OCR)
 */
export const enrichFromScan = mutation({
  args: {
    baseItem: v.string(),
    size: v.string(),
    unit: v.string(),
    category: v.string(),
    brand: v.optional(v.string()),
    productName: v.optional(v.string()),
    displayLabel: v.optional(v.string()),
    estimatedPrice: v.optional(v.number()),
    confidence: v.optional(v.number()),
    imageStorageId: v.optional(v.id("_storage")),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    // Canonicalize upfront. Use productName-or-baseItem as the seed name so
    // the parser can split "250" + "g" into "250g" before it reaches the DB.
    const cleaned = cleanItemForStorage(
      args.productName ?? args.baseItem,
      args.size,
      args.unit,
    );
    // Silently skip malformed rows instead of throwing. The client calls
    // this opportunistically (`.catch(() => {})`) and throwing here just
    // spams Convex error logs without any user benefit. A bad size/unit
    // pair means we can't build a canonical variant row, so the only safe
    // thing is to do nothing.
    if (!cleaned.size || !cleaned.unit) {
      return null;
    }
    const cleanedSize = cleaned.size;
    const cleanedUnit = cleaned.unit;
    const normalizedBase = args.baseItem.toLowerCase().trim();
    const normalizedSize = cleanedSize.toLowerCase().trim();

    // Determine if community enrichment is allowed
    const confidenceOk = (args.confidence ?? 0) >= 70;
    const nameValid = isValidProductName(args.productName ?? args.baseItem);
    const communityEnrich = confidenceOk && nameValid;

    // Track funnel event if user is authenticated
    if (identity) {
      const user = await ctx.db
        .query("users")
        .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
        .unique();
      if (user) {
        await trackFunnelEvent(ctx, user._id, "first_scan");
      }
    }

    // Try exact baseItem match first
    let existing = await ctx.db
      .query("itemVariants")
      .withIndex("by_base_item", (q) => q.eq("baseItem", normalizedBase))
      .collect();

    // Fuzzy fallback: if no match, check if any baseItem is a suffix of
    // the scanned name (e.g. scanned "free range eggs" -> DB has "eggs")
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
    const scanKey = variantKey(
      args.productName ?? args.baseItem,
      cleanedSize
    );

    // Match by size (normalized) OR by variant key for community matching
    const match =
      existing.find((v) => v.size.toLowerCase().trim() === normalizedSize) ??
      (communityEnrich
        ? existing.find(
            (v) =>
              variantKey(v.productName ?? v.variantName, v.size) === scanKey
          )
        : undefined);

    if (match) {
      // Enrich existing variant with scan data -- newer scans overwrite
      const updates: Record<string, unknown> = {
        scanCount: (match.scanCount ?? 0) + 1,
      };
      if (args.brand) updates.brand = args.brand;
      if (args.productName) updates.productName = args.productName;
      if (args.displayLabel) updates.displayLabel = args.displayLabel;
      if (args.estimatedPrice != null) {
        updates.estimatedPrice = args.estimatedPrice;
      }
      if (match.source === "ai_seeded") updates.source = "scan_enriched";

      // Community enrichment: update shared fields when gating passes
      if (communityEnrich) {
        updates.lastSeenAt = Date.now();
        updates.userCount = (match.userCount ?? 0) + 1;
        // First image wins -- only set if not already present
        if (!match.imageStorageId && args.imageStorageId) {
          updates.imageStorageId = args.imageStorageId;
        }
      }

      await ctx.db.patch(match._id, updates);
      return match._id;
    }

    // Create new variant under the existing baseItem if we found one,
    // otherwise use the scanned name
    const targetBase = existing.length > 0 ? existing[0].baseItem : normalizedBase;
    const newVariantName = args.productName
      ? `${args.productName} ${cleanedSize}`
      : `${args.baseItem} ${cleanedSize}`;

    return await ctx.db.insert("itemVariants", {
      baseItem: targetBase,
      variantName: toGroceryTitleCase(newVariantName),
      size: cleanedSize,
      unit: cleanedUnit,
      category: args.category,
      source: "scan_enriched",
      brand: args.brand,
      productName: args.productName,
      displayLabel: args.displayLabel,
      estimatedPrice: args.estimatedPrice,
      scanCount: 1,
      // Community fields on new variants (if gating passes)
      ...(communityEnrich
        ? {
            userCount: 1,
            lastSeenAt: Date.now(),
            ...(args.imageStorageId
              ? { imageStorageId: args.imageStorageId }
              : {}),
          }
        : {}),
    });
  },
});

/**
 * Bulk insert variants (used by AI seeding after onboarding).
 */
export const bulkUpsert = mutation({
  args: {
    variants: v.array(
      v.object({
        baseItem: v.string(),
        variantName: v.string(),
        size: v.string(),
        unit: v.string(),
        category: v.string(),
        source: v.string(),
        commonality: v.optional(v.number()),
        estimatedPrice: v.optional(v.number()),
      })
    ),
  },
  handler: async (ctx, args) => {
    let inserted = 0;
    let updated = 0;

    let skipped = 0;

    for (const variant of args.variants) {
      // Canonicalize before touching the table. Silently skip (don't throw)
      // on bad rows — bulk callers shouldn't fail the whole batch for one
      // malformed item, and pollution here affects every future seed.
      const cleaned = cleanItemForStorage(variant.variantName, variant.size, variant.unit);
      if (!cleaned.size || !cleaned.unit) {
        skipped++;
        continue;
      }
      const normalizedBase = variant.baseItem.toLowerCase().trim();

      const existing = await ctx.db
        .query("itemVariants")
        .withIndex("by_base_item", (q) => q.eq("baseItem", normalizedBase))
        .collect();

      const duplicate = existing.find(
        (v) => v.variantName.toLowerCase() === cleaned.name.toLowerCase()
      );

      if (duplicate) {
        // Update estimatedPrice if provided and not already set
        if (variant.estimatedPrice != null && duplicate.estimatedPrice == null) {
          await ctx.db.patch(duplicate._id, {
            estimatedPrice: variant.estimatedPrice,
          });
          updated++;
        }
      } else {
        await ctx.db.insert("itemVariants", {
          baseItem: normalizedBase,
          variantName: toGroceryTitleCase(cleaned.name),
          size: cleaned.size,
          unit: cleaned.unit,
          category: variant.category,
          source: variant.source,
          commonality: variant.commonality,
          estimatedPrice: variant.estimatedPrice,
        });
        inserted++;
      }
    }

    return { inserted, updated, skipped };
  },
});
