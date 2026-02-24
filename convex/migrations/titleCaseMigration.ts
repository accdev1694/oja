/**
 * One-time data migration to normalize existing item names to title case.
 *
 * Run from Convex Dashboard → Functions → titleCaseMigration:migrateAllNames
 *
 * Safe to run multiple times (idempotent) — only patches items whose name
 * actually changes after normalization.
 */
import { internalMutation } from "../_generated/server";
import { toGroceryTitleCase } from "../lib/titleCase";
import { getIconForItem } from "../iconMapping";

/**
 * Migrate pantryItems names to title case.
 * Processes all items in the database (no user filter — runs as internal).
 */
export const migratePantryItems = internalMutation({
  args: {},
  handler: async (ctx) => {
    const items = await ctx.db.query("pantryItems").collect();
    let updated = 0;

    for (const item of items) {
      const normalized = toGroceryTitleCase(item.name);
      if (normalized !== item.name) {
        await ctx.db.patch(item._id, {
          name: normalized,
          icon: getIconForItem(normalized, item.category),
          updatedAt: Date.now(),
        });
        updated++;
      }
    }

    console.log(`[titleCaseMigration] pantryItems: ${updated}/${items.length} updated`);
    return { updated, total: items.length };
  },
});

/**
 * Migrate listItems names to title case.
 */
export const migrateListItems = internalMutation({
  args: {},
  handler: async (ctx) => {
    const items = await ctx.db.query("listItems").collect();
    let updated = 0;

    for (const item of items) {
      const normalized = toGroceryTitleCase(item.name);
      if (normalized !== item.name) {
        await ctx.db.patch(item._id, {
          name: normalized,
          updatedAt: Date.now(),
        });
        updated++;
      }
    }

    console.log(`[titleCaseMigration] listItems: ${updated}/${items.length} updated`);
    return { updated, total: items.length };
  },
});

/**
 * Migrate currentPrices itemName to title case.
 */
export const migrateCurrentPrices = internalMutation({
  args: {},
  handler: async (ctx) => {
    const prices = await ctx.db.query("currentPrices").collect();
    let updated = 0;

    for (const price of prices) {
      const normalized = toGroceryTitleCase(price.itemName);
      if (normalized !== price.itemName) {
        await ctx.db.patch(price._id, {
          itemName: normalized,
          updatedAt: Date.now(),
        });
        updated++;
      }
    }

    console.log(`[titleCaseMigration] currentPrices: ${updated}/${prices.length} updated`);
    return { updated, total: prices.length };
  },
});

/**
 * Migrate itemVariants variantName to title case.
 */
export const migrateItemVariants = internalMutation({
  args: {},
  handler: async (ctx) => {
    const variants = await ctx.db.query("itemVariants").collect();
    let updated = 0;

    for (const variant of variants) {
      const normalized = toGroceryTitleCase(variant.variantName);
      if (normalized !== variant.variantName) {
        await ctx.db.patch(variant._id, {
          variantName: normalized,
        });
        updated++;
      }
    }

    console.log(`[titleCaseMigration] itemVariants: ${updated}/${variants.length} updated`);
    return { updated, total: variants.length };
  },
});

/**
 * Migrate shoppingLists names to title case.
 */
export const migrateShoppingLists = internalMutation({
  args: {},
  handler: async (ctx) => {
    const lists = await ctx.db.query("shoppingLists").collect();
    let updated = 0;

    for (const list of lists) {
      const normalized = toGroceryTitleCase(list.name);
      if (normalized !== list.name) {
        await ctx.db.patch(list._id, {
          name: normalized,
          updatedAt: Date.now(),
        });
        updated++;
      }
    }

    console.log(`[titleCaseMigration] shoppingLists: ${updated}/${lists.length} updated`);
    return { updated, total: lists.length };
  },
});

/**
 * Convenience: run all migrations in sequence.
 * Call this from Convex Dashboard.
 */
export const migrateAllNames = internalMutation({
  args: {},
  handler: async (ctx) => {
    // Pantry items
    const pantryItems = await ctx.db.query("pantryItems").collect();
    let pantryUpdated = 0;
    for (const item of pantryItems) {
      const normalized = toGroceryTitleCase(item.name);
      if (normalized !== item.name) {
        await ctx.db.patch(item._id, {
          name: normalized,
          icon: getIconForItem(normalized, item.category),
          updatedAt: Date.now(),
        });
        pantryUpdated++;
      }
    }

    // List items
    const listItems = await ctx.db.query("listItems").collect();
    let listUpdated = 0;
    for (const item of listItems) {
      const normalized = toGroceryTitleCase(item.name);
      if (normalized !== item.name) {
        await ctx.db.patch(item._id, {
          name: normalized,
          updatedAt: Date.now(),
        });
        listUpdated++;
      }
    }

    // Current prices
    const prices = await ctx.db.query("currentPrices").collect();
    let priceUpdated = 0;
    for (const price of prices) {
      const normalized = toGroceryTitleCase(price.itemName);
      if (normalized !== price.itemName) {
        await ctx.db.patch(price._id, {
          itemName: normalized,
          updatedAt: Date.now(),
        });
        priceUpdated++;
      }
    }

    // Item variants
    const variants = await ctx.db.query("itemVariants").collect();
    let variantUpdated = 0;
    for (const variant of variants) {
      const normalized = toGroceryTitleCase(variant.variantName);
      if (normalized !== variant.variantName) {
        await ctx.db.patch(variant._id, {
          variantName: normalized,
        });
        variantUpdated++;
      }
    }

    // Shopping lists
    const lists = await ctx.db.query("shoppingLists").collect();
    let listNameUpdated = 0;
    for (const list of lists) {
      const normalized = toGroceryTitleCase(list.name);
      if (normalized !== list.name) {
        await ctx.db.patch(list._id, {
          name: normalized,
          updatedAt: Date.now(),
        });
        listNameUpdated++;
      }
    }

    const result = {
      pantryItems: { updated: pantryUpdated, total: pantryItems.length },
      listItems: { updated: listUpdated, total: listItems.length },
      currentPrices: { updated: priceUpdated, total: prices.length },
      itemVariants: { updated: variantUpdated, total: variants.length },
      shoppingLists: { updated: listNameUpdated, total: lists.length },
    };

    console.log("[titleCaseMigration] Complete:", JSON.stringify(result));
    return result;
  },
});
