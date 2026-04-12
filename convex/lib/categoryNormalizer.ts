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
  "Meat & Seafood",
  "Fruits & Vegetables",
  "Bread & Bakery",
  "Rice, Pasta & Grains",
  "Cereals & Breakfast",
  "Tinned & Canned",
  "Frozen",
  "Chilled & Deli",
  "Drinks",
  "Alcohol",
  "Snacks & Sweets",
  "Condiments & Sauces",
  "Spices & Seasonings",
  "Cooking & Baking",
  "World Foods",
  "Health & Beauty",
  "Household & Cleaning",
  "Baby & Kids",
  "Pets",
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
  "meat": "Meat & Seafood",
  "fish": "Meat & Seafood",
  "meat & fish": "Meat & Seafood",
  "meat and fish": "Meat & Seafood",
  "meat & seafood": "Meat & Seafood",
  "meat and seafood": "Meat & Seafood",
  "proteins": "Meat & Seafood",
  "seafood": "Meat & Seafood",
  "poultry": "Meat & Seafood",

  // Produce variants
  "produce": "Fruits & Vegetables",
  "fruit": "Fruits & Vegetables",
  "fruits": "Fruits & Vegetables",
  "vegetables": "Fruits & Vegetables",
  "fruits & vegetables": "Fruits & Vegetables",
  "fruits and vegetables": "Fruits & Vegetables",
  "fresh produce": "Fruits & Vegetables",

  // Bread & Bakery variants
  "bakery": "Bread & Bakery",
  "bread": "Bread & Bakery",
  "bread & bakery": "Bread & Bakery",
  "bread and bakery": "Bread & Bakery",
  "baked goods": "Bread & Bakery",

  // Rice, Pasta & Grains variants
  "grains": "Rice, Pasta & Grains",
  "pasta": "Rice, Pasta & Grains",
  "rice": "Rice, Pasta & Grains",
  "grains & pasta": "Rice, Pasta & Grains",
  "grains and pasta": "Rice, Pasta & Grains",
  "rice, pasta & grains": "Rice, Pasta & Grains",
  "rice pasta and grains": "Rice, Pasta & Grains",
  "noodles": "Rice, Pasta & Grains",

  // Cereals & Breakfast variants
  "cereals": "Cereals & Breakfast",
  "cereal": "Cereals & Breakfast",
  "breakfast": "Cereals & Breakfast",
  "cereals & breakfast": "Cereals & Breakfast",
  "cereals and breakfast": "Cereals & Breakfast",
  "porridge": "Cereals & Breakfast",
  "granola": "Cereals & Breakfast",

  // Tinned & Canned variants
  "canned": "Tinned & Canned",
  "canned goods": "Tinned & Canned",
  "canned & jarred": "Tinned & Canned",
  "canned and jarred": "Tinned & Canned",
  "tinned": "Tinned & Canned",
  "tinned & canned": "Tinned & Canned",
  "tinned and canned": "Tinned & Canned",

  // Drinks variants
  "drinks": "Drinks",
  "beverages": "Drinks",
  "beverage": "Drinks",
  "soft drinks": "Drinks",
  "tea & coffee": "Drinks",

  // Alcohol variants
  "alcohol": "Alcohol",
  "beer": "Alcohol",
  "wine": "Alcohol",
  "spirits": "Alcohol",
  "alcoholic drinks": "Alcohol",
  "beer & wine": "Alcohol",
  "beer, wine & spirits": "Alcohol",

  // Snacks variants
  "snacks": "Snacks & Sweets",
  "sweets": "Snacks & Sweets",
  "snacks & sweets": "Snacks & Sweets",
  "snacks and sweets": "Snacks & Sweets",
  "confectionery": "Snacks & Sweets",

  // Condiments variants
  "condiments": "Condiments & Sauces",
  "sauces": "Condiments & Sauces",
  "condiments & sauces": "Condiments & Sauces",
  "condiments and sauces": "Condiments & Sauces",

  // Spices variants
  "spices & seasonings": "Spices & Seasonings",
  "spices": "Spices & Seasonings",
  "seasonings": "Spices & Seasonings",

  // Cooking & Baking variants (merged from old Baking + Oils & Vinegars)
  "baking": "Cooking & Baking",
  "cooking & baking": "Cooking & Baking",
  "cooking and baking": "Cooking & Baking",
  "baking supplies": "Cooking & Baking",
  "home baking": "Cooking & Baking",
  "oils & vinegars": "Cooking & Baking",
  "oils and vinegars": "Cooking & Baking",
  "oils": "Cooking & Baking",
  "cooking oils": "Cooking & Baking",
  "vinegar": "Cooking & Baking",

  // Chilled & Deli variants
  "chilled": "Chilled & Deli",
  "deli": "Chilled & Deli",
  "chilled & deli": "Chilled & Deli",
  "chilled and deli": "Chilled & Deli",
  "ready meals": "Chilled & Deli",
  "prepared foods": "Chilled & Deli",

  // World Foods variants (renamed from Ethnic Ingredients)
  "world foods": "World Foods",
  "ethnic ingredients": "World Foods",
  "international": "World Foods",
  "international foods": "World Foods",
  "african food": "World Foods",
  "african foods": "World Foods",
  "west african food": "World Foods",
  "east african food": "World Foods",
  "north african food": "World Foods",
  "south african food": "World Foods",
  "caribbean food": "World Foods",
  "south asian food": "World Foods",
  "indian food": "World Foods",
  "pakistani food": "World Foods",
  "southeast asian food": "World Foods",
  "thai food": "World Foods",
  "vietnamese food": "World Foods",
  "filipino food": "World Foods",
  "filipino foods": "World Foods",
  "turkish food": "World Foods",
  "turkish foods": "World Foods",
  "mediterranean food": "World Foods",
  "italian food": "World Foods",
  "greek food": "World Foods",
  "greek foods": "World Foods",
  "french food": "World Foods",
  "french foods": "World Foods",
  "eastern european food": "World Foods",
  "polish food": "World Foods",
  "polish foods": "World Foods",
  "romanian food": "World Foods",
  "hungarian food": "World Foods",
  "latin american food": "World Foods",
  "mexican food": "World Foods",
  "brazilian food": "World Foods",
  "chinese food": "World Foods",
  "japanese food": "World Foods",
  "korean food": "World Foods",
  "middle eastern food": "World Foods",

  // Health & Beauty variants (merged from Personal Care + Health & Wellness)
  "health & beauty": "Health & Beauty",
  "health and beauty": "Health & Beauty",
  "personal care": "Health & Beauty",
  "health & wellness": "Health & Beauty",
  "health and wellness": "Health & Beauty",
  "health": "Health & Beauty",
  "wellness": "Health & Beauty",
  "toiletries": "Health & Beauty",
  "beauty": "Health & Beauty",

  // Household & Cleaning variants
  "household": "Household & Cleaning",
  "household & cleaning": "Household & Cleaning",
  "household and cleaning": "Household & Cleaning",
  "cleaning": "Household & Cleaning",
  "laundry": "Household & Cleaning",

  // Pet variants
  "pet": "Pets",
  "pets": "Pets",
  "pet care": "Pets",

  // Baby variants
  "baby & kids": "Baby & Kids",
  "baby": "Baby & Kids",

  // Frozen
  "frozen": "Frozen",
  "frozen foods": "Frozen",

  // Legacy non-grocery categories → Other
  "electronics": "Other",
  "electronics & tech": "Other",
  "tech": "Other",
  "clothing": "Other",
  "clothing & accessories": "Other",
  "garden & outdoor": "Other",
  "gardening": "Other",
  "office & stationery": "Other",
  "office": "Other",
  "stationery": "Other",

  // Legacy catch-alls
  "pantry staples": "Other",
  "pantry": "Other",
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
