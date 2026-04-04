/**
 * Category Normalizer
 *
 * Maps all known category variants from AI prompts (vision.ts, pantry.ts)
 * and user input to a single canonical set. Applied before DB insertion
 * so pantry items never end up with duplicate categories like
 * "Dairy" vs "Dairy & Eggs" or "Baking" vs "Bakery".
 */

// Canonical categories — the single source of truth
export const CANONICAL_CATEGORIES = [
  "Dairy & Eggs",
  "Meat & Fish",
  "Fruits & Vegetables",
  "Bakery",
  "Drinks",
  "Snacks & Sweets",
  "Canned & Jarred",
  "Frozen",
  "Household",
  "Personal Care",
  "Condiments & Sauces",
  "Grains & Pasta",
  "Baking",
  "Baby & Kids",
  "Pets",
  "Pantry Staples",
  "Spices & Seasonings",
  "Oils & Vinegars",
  "Ethnic Ingredients",
  "Health & Wellness",
  "Electronics",
  "Clothing",
  "Garden & Outdoor",
  "Office & Stationery",
  "Other",
] as const;

// Lowercase lookup → canonical name
const CATEGORY_MAP: Record<string, string> = {};

// Self-map all canonical categories
for (const cat of CANONICAL_CATEGORIES) {
  CATEGORY_MAP[cat.toLowerCase()] = cat;
}

// Map known variants to their canonical form
const ALIASES: Record<string, string> = {
  // Dairy variants
  "dairy": "Dairy & Eggs",
  "eggs": "Dairy & Eggs",
  "dairy & eggs": "Dairy & Eggs",
  "dairy and eggs": "Dairy & Eggs",

  // Meat variants
  "meat": "Meat & Fish",
  "fish": "Meat & Fish",
  "meat & fish": "Meat & Fish",
  "meat and fish": "Meat & Fish",
  "proteins": "Meat & Fish",
  "seafood": "Meat & Fish",
  "poultry": "Meat & Fish",

  // Produce variants
  "produce": "Fruits & Vegetables",
  "fruit": "Fruits & Vegetables",
  "fruits": "Fruits & Vegetables",
  "vegetables": "Fruits & Vegetables",
  "fruits & vegetables": "Fruits & Vegetables",
  "fruits and vegetables": "Fruits & Vegetables",
  "fresh produce": "Fruits & Vegetables",

  // Bakery (baked goods, bread) vs Baking (flour, sugar, ingredients)
  "bakery": "Bakery",
  "bread": "Bakery",
  "baked goods": "Bakery",
  "baking": "Baking",

  // Drinks variants
  "drinks": "Drinks",
  "beverages": "Drinks",
  "beverage": "Drinks",

  // Snacks variants
  "snacks": "Snacks & Sweets",
  "sweets": "Snacks & Sweets",
  "snacks & sweets": "Snacks & Sweets",
  "snacks and sweets": "Snacks & Sweets",
  "confectionery": "Snacks & Sweets",

  // Canned variants
  "canned": "Canned & Jarred",
  "canned goods": "Canned & Jarred",
  "canned & jarred": "Canned & Jarred",
  "canned and jarred": "Canned & Jarred",
  "tinned": "Canned & Jarred",

  // Condiments variants
  "condiments": "Condiments & Sauces",
  "sauces": "Condiments & Sauces",
  "condiments & sauces": "Condiments & Sauces",
  "condiments and sauces": "Condiments & Sauces",

  // Pet variants
  "pet": "Pets",
  "pets": "Pets",
  "pet care": "Pets",

  // Other aliases
  "pantry staples": "Pantry Staples",
  "pantry": "Pantry Staples",
  "spices & seasonings": "Spices & Seasonings",
  "spices": "Spices & Seasonings",
  "seasonings": "Spices & Seasonings",
  "oils & vinegars": "Oils & Vinegars",
  "oils": "Oils & Vinegars",
  "cooking oils": "Oils & Vinegars",
  "ethnic ingredients": "Ethnic Ingredients",
  "world foods": "Ethnic Ingredients",
  "international": "Ethnic Ingredients",
  "international foods": "Ethnic Ingredients",
  "african food": "Ethnic Ingredients",
  "african foods": "Ethnic Ingredients",
  "west african food": "Ethnic Ingredients",
  "east african food": "Ethnic Ingredients",
  "north african food": "Ethnic Ingredients",
  "south african food": "Ethnic Ingredients",
  "caribbean food": "Ethnic Ingredients",
  "south asian food": "Ethnic Ingredients",
  "indian food": "Ethnic Ingredients",
  "pakistani food": "Ethnic Ingredients",
  "southeast asian food": "Ethnic Ingredients",
  "thai food": "Ethnic Ingredients",
  "vietnamese food": "Ethnic Ingredients",
  "filipino food": "Ethnic Ingredients",
  "filipino foods": "Ethnic Ingredients",
  "turkish food": "Ethnic Ingredients",
  "turkish foods": "Ethnic Ingredients",
  "mediterranean food": "Ethnic Ingredients",
  "italian food": "Ethnic Ingredients",
  "greek food": "Ethnic Ingredients",
  "greek foods": "Ethnic Ingredients",
  "french food": "Ethnic Ingredients",
  "french foods": "Ethnic Ingredients",
  "eastern european food": "Ethnic Ingredients",
  "polish food": "Ethnic Ingredients",
  "polish foods": "Ethnic Ingredients",
  "romanian food": "Ethnic Ingredients",
  "hungarian food": "Ethnic Ingredients",
  "latin american food": "Ethnic Ingredients",
  "mexican food": "Ethnic Ingredients",
  "brazilian food": "Ethnic Ingredients",
  "health & wellness": "Health & Wellness",
  "health": "Health & Wellness",
  "wellness": "Health & Wellness",
  "baby & kids": "Baby & Kids",
  "baby": "Baby & Kids",
  "household": "Household",
  "household & cleaning": "Household",
  "cleaning": "Household",
  "laundry": "Household",
  "personal care": "Personal Care",
  "toiletries": "Personal Care",
  "grains & pasta": "Grains & Pasta",
  "grains": "Grains & Pasta",
  "pasta": "Grains & Pasta",
  "frozen": "Frozen",
  "frozen foods": "Frozen",
  "electronics": "Electronics",
  "electronics & tech": "Electronics",
  "tech": "Electronics",
  "clothing": "Clothing",
  "clothing & accessories": "Clothing",
  "garden & outdoor": "Garden & Outdoor",
  "gardening": "Garden & Outdoor",
  "office & stationery": "Office & Stationery",
  "office": "Office & Stationery",
  "stationery": "Office & Stationery",
  "other": "Other",
  "miscellaneous": "Other",
  "general": "Other",
};

// Merge aliases into the map
for (const [alias, canonical] of Object.entries(ALIASES)) {
  CATEGORY_MAP[alias] = canonical;
}

/**
 * Normalizes a category string to its canonical form.
 * Returns the canonical category, or the original string with title casing
 * if no mapping is found (to prevent data loss).
 */
export function normalizeCategory(category: string): string {
  if (!category) return "Other";
  const mapped = CATEGORY_MAP[category.toLowerCase().trim()];
  if (mapped) return mapped;
  // Unknown category — return as-is (title-cased) rather than losing data
  return category.trim();
}

/**
 * Comma-separated canonical category list for AI prompts.
 * Use this in vision.ts and pantry.ts instead of hardcoded strings.
 */
export const AI_CATEGORY_PROMPT = CANONICAL_CATEGORIES.join(", ");
