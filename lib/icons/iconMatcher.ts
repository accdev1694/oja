/**
 * Icon Matcher - Client-side icon mapping for pantry items
 *
 * Uses ONLY validated MaterialCommunityIcons that are confirmed to exist.
 * This mirrors the server-side iconMapping.ts for consistency.
 */

// VALIDATED ICONS - These are confirmed to exist in MaterialCommunityIcons
// DO NOT add icons without verifying they exist at https://icons.expo.fyi/
export const VALIDATED_ICONS = [
  // Food & Drink
  "food-apple",
  "food-drumstick",
  "food-steak",
  "food-variant",
  "cow",
  "pig",
  "fish",
  "egg",
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
  "bowl-mix",
  "pizza",
  "snowflake",
  "shaker-outline",
  // Household & Cleaning
  "package-variant",
  "paper-roll",
  "trash-can",
  "washing-machine",
  "spray",
  "hand-wash",
  "shower-head",
  "toothbrush",
  "home",
  "lightbulb-outline",
  "flash",
  "broom",
  "dishwasher",
  // Personal Care & Health
  "face-woman",
  "lotion-outline",
  "pill",
  "medical-bag",
  "bandage",
  // Baby & Kids
  "baby-bottle-outline",
  "teddy-bear",
  "human-child",
  // Pets
  "paw",
  "dog",
  "cat",
  // Electronics & Tech
  "cellphone",
  "laptop",
  "headphones",
  "battery",
  "usb",
  "power-plug",
  // Clothing & Accessories
  "tshirt-crew",
  "shoe-formal",
  "hanger",
  // Office & Stationery
  "pencil",
  "notebook",
  "printer",
  // Garden & Outdoor
  "flower",
  "tree",
  "shovel",
  // General
  "cart",
  "circle-outline",
  "tag",
  "dots-horizontal",
] as const;

export type ValidIcon = (typeof VALIDATED_ICONS)[number];

// Category fallback icons
export const CATEGORY_ICON_MAP: Record<string, ValidIcon> = {
  // Food categories
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
  bakery: "bread-slice",
  "pantry staples": "package-variant",
  "spices & seasonings": "shaker-outline",
  "canned goods": "package-variant",
  "grains & pasta": "pasta",
  "oils & vinegars": "bottle-tonic",
  baking: "cookie",
  "ethnic ingredients": "food-variant",
  // Non-food categories
  household: "spray",
  cleaning: "spray",
  "household & cleaning": "spray",
  laundry: "washing-machine",
  "personal care": "lotion-outline",
  toiletries: "shower-head",
  health: "pill",
  "health & wellness": "pill",
  "baby & kids": "baby-bottle-outline",
  baby: "baby-bottle-outline",
  pets: "paw",
  "pet care": "paw",
  electronics: "cellphone",
  "electronics & tech": "cellphone",
  tech: "cellphone",
  clothing: "tshirt-crew",
  "clothing & accessories": "tshirt-crew",
  office: "pencil",
  "office & stationery": "pencil",
  stationery: "pencil",
  "garden & outdoor": "flower",
  gardening: "flower",
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
    ["bacon", "pig"],
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
    // Household & Cleaning
    ["toilet", "paper-roll"],
    ["paper towel", "paper-roll"],
    ["kitchen roll", "paper-roll"],
    ["bin bag", "trash-can"],
    ["trash bag", "trash-can"],
    ["detergent", "washing-machine"],
    ["washing", "washing-machine"],
    ["laundry", "washing-machine"],
    ["bleach", "spray"],
    ["cleaner", "spray"],
    ["disinfect", "spray"],
    ["dish", "dishwasher"],
    ["sponge", "dishwasher"],
    ["broom", "broom"],
    ["mop", "broom"],
    ["bulb", "lightbulb-outline"],
    ["battery", "battery"],
    // Personal Care
    ["soap", "hand-wash"],
    ["shampoo", "shower-head"],
    ["conditioner", "shower-head"],
    ["body wash", "shower-head"],
    ["toothpaste", "toothbrush"],
    ["toothbrush", "toothbrush"],
    ["deodorant", "lotion-outline"],
    ["lotion", "lotion-outline"],
    ["cream", "lotion-outline"],
    ["sunscreen", "lotion-outline"],
    ["razor", "face-woman"],
    // Health
    ["vitamin", "pill"],
    ["medicine", "pill"],
    ["paracetamol", "pill"],
    ["ibuprofen", "pill"],
    ["plaster", "bandage"],
    ["bandage", "bandage"],
    ["first aid", "medical-bag"],
    // Baby & Kids
    ["nappy", "baby-bottle-outline"],
    ["diaper", "baby-bottle-outline"],
    ["baby", "baby-bottle-outline"],
    ["formula", "baby-bottle-outline"],
    // Pets
    ["pet food", "paw"],
    ["dog food", "dog"],
    ["cat food", "cat"],
    ["cat litter", "cat"],
    ["pet", "paw"],
    // Electronics
    ["charger", "power-plug"],
    ["cable", "usb"],
    ["phone", "cellphone"],
    ["headphone", "headphones"],
    // Clothing
    ["shirt", "tshirt-crew"],
    ["sock", "tshirt-crew"],
    ["shoe", "shoe-formal"],
    // Garden & Outdoor
    ["plant", "flower"],
    ["seed", "flower"],
    ["compost", "shovel"],
    ["garden", "flower"],
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
