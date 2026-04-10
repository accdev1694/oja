import { v } from "convex/values";
import { mutation } from "../_generated/server";
import { cleanItemForStorage } from "../lib/itemNameParser";

/**
 * Admin mutation: Merge two variants into one.
 * All references to the 'from' variant will be updated to the 'to' variant.
 */
export const mergeVariants = mutation({
  args: {
    fromId: v.id("itemVariants"),
    toId: v.id("itemVariants"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (!user?.isAdmin) throw new Error("Unauthorized: Admin only");

    const fromVariant = await ctx.db.get(args.fromId);
    const toVariant = await ctx.db.get(args.toId);

    if (!fromVariant || !toVariant) throw new Error("Variant not found");

    // 1. Update any pantry items that point to the 'from' variant
    const pantryItems = await ctx.db
      .query("pantryItems")
      .filter((q) => q.eq(q.field("preferredVariant"), fromVariant.variantName))
      .collect();

    for (const item of pantryItems) {
      await ctx.db.patch(item._id, {
        preferredVariant: toVariant.variantName,
        updatedAt: Date.now(),
      });
    }

    // 2. Update currentPrices that point to the 'from' variant
    const prices = await ctx.db
      .query("currentPrices")
      .filter((q) => q.eq(q.field("variantName"), fromVariant.variantName))
      .collect();

    for (const price of prices) {
      await ctx.db.patch(price._id, {
        variantName: toVariant.variantName,
        size: toVariant.size,
        unit: toVariant.unit,
        updatedAt: Date.now(),
      });
    }

    // 3. Merge stats into the 'to' variant
    await ctx.db.patch(args.toId, {
      scanCount: (toVariant.scanCount ?? 0) + (fromVariant.scanCount ?? 0),
      userCount: (toVariant.userCount ?? 0) + (fromVariant.userCount ?? 0),
      lastSeenAt: Math.max(toVariant.lastSeenAt ?? 0, fromVariant.lastSeenAt ?? 0),
    });

    // 4. Delete the 'from' variant
    await ctx.db.delete(args.fromId);

    // 5. Log the action
    await ctx.db.insert("adminLogs", {
      adminUserId: user._id,
      action: "merge_variants",
      targetType: "itemVariants",
      targetId: args.toId,
      details: `Merged variant ${fromVariant.variantName} into ${toVariant.variantName}`,
      createdAt: Date.now(),
    });

    return { success: true };
  },
});

/**
 * Admin mutation: Heal itemVariants rows whose size is a bare number like
 * "250" (missing unit embedded) or whose unit is a non-canonical token like
 * "eggs" / "each". Runs cleanItemForStorage over each row and patches (or
 * deletes, if unrecoverable) the offending entries.
 *
 * Idempotent — safe to run repeatedly. Rows that already pass validation
 * are skipped.
 *
 * Invoke from Convex dashboard as a one-off. Processes a bounded batch per
 * call (limit param) so we don't hit the read/write cap on a big catalogue.
 */
export const backfillVariantSizes = mutation({
  args: {
    limit: v.optional(v.number()),
    dryRun: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();
    if (!user?.isAdmin) throw new Error("Unauthorized: Admin only");

    const limit = args.limit ?? 500;
    const dryRun = args.dryRun ?? false;

    // Full scan via the `by_base_item` index — no constraint, so it walks
    // every row. Satisfies rule #2 (every query uses withIndex) while keeping
    // the one-off backfill simple. The itemVariants catalogue is small
    // (hundreds of rows), so a single `take(limit)` covers it; repeat the
    // call with a larger limit if the table grows.
    const variants = await ctx.db
      .query("itemVariants")
      .withIndex("by_base_item")
      .take(limit);

    let scanned = 0;
    let patched = 0;
    let deleted = 0;
    let skipped = 0;

    for (const variant of variants) {
      scanned++;
      const cleaned = cleanItemForStorage(
        variant.productName ?? variant.variantName,
        variant.size,
        variant.unit,
      );

      // Already canonical? Nothing to do.
      if (cleaned.size === variant.size && cleaned.unit === variant.unit) {
        skipped++;
        continue;
      }

      // Unrecoverable (e.g. unit was "each"/"eggs" and size was bare number
      // so we can't rebuild the pair) — delete so it stops polluting seeds.
      if (!cleaned.size || !cleaned.unit) {
        if (!dryRun) await ctx.db.delete(variant._id);
        deleted++;
        continue;
      }

      if (!dryRun) {
        await ctx.db.patch(variant._id, {
          size: cleaned.size,
          unit: cleaned.unit,
        });
      }
      patched++;
    }

    if (!dryRun) {
      // Bulk operation — no single target row, so point targetId at the
      // acting admin's user record and use targetType "users" (a real table)
      // so downstream log views don't choke on an unresolvable FK. The
      // details field carries the actual counters.
      await ctx.db.insert("adminLogs", {
        adminUserId: user._id,
        action: "backfill_variant_sizes",
        targetType: "users",
        targetId: user._id,
        details: `Backfill: scanned=${scanned} patched=${patched} deleted=${deleted} skipped=${skipped}`,
        createdAt: Date.now(),
      });
    }

    return { scanned, patched, deleted, skipped, dryRun };
  },
});
