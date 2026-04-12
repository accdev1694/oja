/**
 * One-time data migration to normalize category names to the new canonical set.
 *
 * Run from Convex Dashboard → Functions → migrateCategoryNames:migratePantryItems
 * then migrateCategoryNames:migrateListItems, then migrateItemVariants, then migrateCurrentPrices
 *
 * Safe to run multiple times (idempotent) — only patches items whose category
 * actually changes after normalization.
 */
import { internalMutation } from "../_generated/server";
import { normalizeCategory } from "../lib/categoryNormalizer";
import { getIconForItem } from "../iconMapping";

/** Old → new category mapping for direct renames */
const CATEGORY_REMAP: Record<string, string> = {
  "Meat & Fish": "Meat & Seafood",
  "Bakery": "Bread & Bakery",
  "Grains & Pasta": "Rice, Pasta & Grains",
  "Canned & Jarred": "Tinned & Canned",
  "Baking": "Cooking & Baking",
  "Oils & Vinegars": "Cooking & Baking",
  "Ethnic Ingredients": "World Foods",
  "Personal Care": "Health & Beauty",
  "Health & Wellness": "Health & Beauty",
  "Household": "Household & Cleaning",
  "Pantry Staples": "Other",
  "Electronics": "Other",
  "Clothing": "Other",
  "Garden & Outdoor": "Other",
  "Office & Stationery": "Other",
};

function remapCategory(category: string): string {
  // First check direct remap, then fall back to normalizeCategory
  const remapped = CATEGORY_REMAP[category];
  if (remapped) return remapped;
  return normalizeCategory(category);
}

/**
 * Migrate pantryItems categories to new canonical names.
 */
export const migratePantryItems = internalMutation({
  args: {},
  handler: async (ctx) => {
    const items = await ctx.db.query("pantryItems").collect();
    let updated = 0;

    for (const item of items) {
      const newCategory = remapCategory(item.category);
      if (newCategory !== item.category) {
        await ctx.db.patch(item._id, {
          category: newCategory,
          icon: getIconForItem(item.name, newCategory),
          updatedAt: Date.now(),
        });
        updated++;
      }
    }

    console.log(`[migrateCategoryNames] pantryItems: ${updated}/${items.length} updated`);
    return { updated, total: items.length };
  },
});

/**
 * Migrate listItems categories to new canonical names.
 */
export const migrateListItems = internalMutation({
  args: {},
  handler: async (ctx) => {
    const items = await ctx.db.query("listItems").collect();
    let updated = 0;

    for (const item of items) {
      if (!item.category) continue;
      const newCategory = remapCategory(item.category);
      if (newCategory !== item.category) {
        await ctx.db.patch(item._id, {
          category: newCategory,
          updatedAt: Date.now(),
        });
        updated++;
      }
    }

    console.log(`[migrateCategoryNames] listItems: ${updated}/${items.length} updated`);
    return { updated, total: items.length };
  },
});

/**
 * Migrate itemVariants categories to new canonical names.
 */
export const migrateItemVariants = internalMutation({
  args: {},
  handler: async (ctx) => {
    const items = await ctx.db.query("itemVariants").collect();
    let updated = 0;

    for (const item of items) {
      if (!item.category) continue;
      const newCategory = remapCategory(item.category);
      if (newCategory !== item.category) {
        await ctx.db.patch(item._id, {
          category: newCategory,
        });
        updated++;
      }
    }

    console.log(`[migrateCategoryNames] itemVariants: ${updated}/${items.length} updated`);
    return { updated, total: items.length };
  },
});

