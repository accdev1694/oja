/**
 * Icon Matcher - Client-side icon mapping for pantry items
 *
 * Uses ONLY validated MaterialCommunityIcons that are confirmed to exist.
 * This mirrors the server-side iconMapping.ts for consistency.
 */

// VALIDATED ICONS - These are confirmed to exist in MaterialCommunityIcons
// DO NOT add icons without verifying they exist at https://icons.expo.fyi/
export const VALIDATED_ICONS = [
  "food-apple",
  "food-drumstick",
  "food-steak",
  "food-variant",
  "cow",
  "pig",
  "fish",
  "egg",
  "bacon",
  "sausage",
  "cheese",
  "cube-outline",
  "cup",
  "bread-slice",
  "pasta",
  "rice",
  "corn",
  "carrot",
  "leaf",
  "mushroom",
  "chili-hot",
  "chili-mild",
  "fruit-citrus",
  "fruit-grapes",
  "fruit-cherries",
  "fruit-watermelon",
  "bottle-tonic",
  "bottle-soda",
  "coffee",
  "tea",
  "water",
  "glass-wine",
  "glass-mug-variant",
  "cookie",
  "candy",
  "cake",
  "ice-cream",
  "popcorn",
  "peanut",
  "package-variant",
  "bowl-mix",
  "pizza",
  "snowflake",
  "paper-roll",
  "trash-can",
  "washing-machine",
  "spray",
  "hand-wash",
  "shower-head",
  "toothbrush",
  "cart",
  "home",
  "circle-outline",
  "shaker-outline",
] as const;

export type ValidIcon = (typeof VALIDATED_ICONS)[number];

// Category fallback icons
export const CATEGORY_ICON_MAP: Record<string, ValidIcon> = {
  proteins: "food-drumstick",
  meat: "food-drumstick",
  dairy: "cheese",
  grains: "bread-slice",
  vegetables: "carrot",
  produce: "carrot",
  fruits: "food-apple",
  beverages: "cup",
  condiments: "bottle-tonic",
  snacks: "cookie",
  frozen: "snowflake",
  canned: "package-variant",
  household: "home",
  bakery: "bread-slice",
  "pantry staples": "package-variant",
  "spices & seasonings": "shaker-outline",
  "canned goods": "package-variant",
  "grains & pasta": "pasta",
  "oils & vinegars": "bottle-tonic",
  baking: "cookie",
  "ethnic ingredients": "food-variant",
  other: "cart",
};

/**
 * Get icon for an item - guaranteed to return a valid icon
 */
export function getIconForItem(
  itemName: string,
  category?: string
): { icon: ValidIcon; isExactMatch: boolean } {
  const name = itemName.toLowerCase().trim();
  const cat = (category || "other").toLowerCase().trim();

  // Simple keyword matching for common items
  const keywordMatches: Array<[string, ValidIcon]> = [
    ["chicken", "food-drumstick"],
    ["turkey", "food-drumstick"],
    ["beef", "cow"],
    ["steak", "food-steak"],
    ["pork", "pig"],
    ["bacon", "bacon"],
    ["sausage", "sausage"],
    ["fish", "fish"],
    ["salmon", "fish"],
    ["tuna", "fish"],
    ["egg", "egg"],
    ["milk", "cup"],
    ["cheese", "cheese"],
    ["butter", "cube-outline"],
    ["yogurt", "cup"],
    ["bread", "bread-slice"],
    ["rice", "rice"],
    ["pasta", "pasta"],
    ["noodle", "pasta"],
    ["flour", "package-variant"],
    ["carrot", "carrot"],
    ["tomato", "food-apple"],
    ["lettuce", "leaf"],
    ["spinach", "leaf"],
    ["mushroom", "mushroom"],
    ["corn", "corn"],
    ["pepper", "chili-mild"],
    ["chili", "chili-hot"],
    ["apple", "food-apple"],
    ["banana", "fruit-watermelon"],
    ["orange", "fruit-citrus"],
    ["lemon", "fruit-citrus"],
    ["grape", "fruit-grapes"],
    ["berry", "fruit-cherries"],
    ["water", "water"],
    ["juice", "cup"],
    ["tea", "tea"],
    ["coffee", "coffee"],
    ["soda", "bottle-soda"],
    ["beer", "glass-mug-variant"],
    ["wine", "glass-wine"],
    ["oil", "bottle-tonic"],
    ["sauce", "bottle-tonic"],
    ["honey", "bottle-tonic"],
    ["jam", "bottle-tonic"],
    ["salt", "shaker-outline"],
    ["spice", "shaker-outline"],
    ["chocolate", "candy"],
    ["cookie", "cookie"],
    ["biscuit", "cookie"],
    ["nut", "peanut"],
    ["popcorn", "popcorn"],
    ["cake", "cake"],
    ["ice cream", "ice-cream"],
    ["frozen", "snowflake"],
    ["pizza", "pizza"],
    ["canned", "package-variant"],
    ["soup", "bowl-mix"],
    ["toilet", "paper-roll"],
    ["paper", "paper-roll"],
    ["detergent", "washing-machine"],
    ["soap", "hand-wash"],
    ["shampoo", "shower-head"],
    ["toothpaste", "toothbrush"],
  ];

  // Check keyword matches
  for (const [keyword, icon] of keywordMatches) {
    if (name.includes(keyword)) {
      return { icon, isExactMatch: true };
    }
  }

  // Category fallback
  if (CATEGORY_ICON_MAP[cat]) {
    return { icon: CATEGORY_ICON_MAP[cat], isExactMatch: false };
  }

  // Ultimate fallback
  return { icon: "cart", isExactMatch: false };
}

/**
 * Check if an icon is valid
 */
export function isValidIcon(icon: string): icon is ValidIcon {
  return VALIDATED_ICONS.includes(icon as ValidIcon);
}

/**
 * Get a safe icon - returns fallback if invalid
 */
export function getSafeIcon(
  icon: string | undefined,
  category: string
): ValidIcon {
  if (icon && isValidIcon(icon)) {
    return icon;
  }
  return CATEGORY_ICON_MAP[category.toLowerCase().trim()] || "cart";
}
