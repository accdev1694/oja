/**
 * Icon Mapping System - Hybrid Approach
 *
 * Uses ONLY validated MaterialCommunityIcons that are confirmed to exist.
 * Combines keyword matching with category fallbacks for 100% reliability.
 */

// VALIDATED ICONS - These are confirmed to exist in MaterialCommunityIcons
// DO NOT add icons without verifying they exist at https://icons.expo.fyi/
export const VALIDATED_ICONS = [
  // Food categories
  "food-apple",
  "food-drumstick",
  "food-steak",
  "food-variant",
  // Proteins
  "cow",
  "pig",
  "fish",
  "egg",
  "sausage",
  // Dairy
  "cheese",
  "cube-outline", // butter/tofu
  "cup", // milk/yogurt
  // Grains
  "bread-slice",
  "pasta",
  "rice",
  "corn",
  // Produce
  "carrot",
  "leaf",
  "mushroom",
  "chili-hot",
  "chili-mild",
  // Fruits
  "fruit-citrus",
  "fruit-grapes",
  "fruit-cherries",
  "fruit-watermelon",
  // Beverages
  "bottle-tonic",
  "bottle-soda",
  "coffee",
  "tea",
  "water",
  "glass-wine",
  "glass-mug-variant",
  // Snacks
  "cookie",
  "candy",
  "cake",
  "ice-cream",
  "popcorn",
  "peanut",
  // Packaged/Canned
  "package-variant",
  "bowl-mix",
  "pizza",
  // Frozen
  "snowflake",
  // Household & Cleaning
  "paper-roll",
  "trash-can",
  "washing-machine",
  "spray",
  "hand-wash",
  "shower-head",
  "toothbrush",
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
  // Generic
  "cart",
  "home",
  "circle-outline",
  "shaker-outline",
  "tag",
  "dots-horizontal",
] as const;

export type ValidIcon = typeof VALIDATED_ICONS[number];

// Category to icon mapping - guaranteed fallback
export const CATEGORY_ICONS: Record<string, ValidIcon> = {
  // Food categories
  "proteins": "food-drumstick",
  "meat": "food-drumstick",
  "dairy": "cheese",
  "grains": "bread-slice",
  "vegetables": "carrot",
  "produce": "carrot",
  "fruits": "food-apple",
  "beverages": "cup",
  "condiments": "bottle-tonic",
  "snacks": "cookie",
  "frozen": "snowflake",
  "canned": "package-variant",
  "bakery": "bread-slice",
  "pantry staples": "package-variant",
  "spices & seasonings": "shaker-outline",
  "canned goods": "package-variant",
  "grains & pasta": "pasta",
  "oils & vinegars": "bottle-tonic",
  "baking": "cookie",
  "ethnic ingredients": "food-variant",
  // Household & Cleaning
  "household": "spray",
  "household & cleaning": "spray",
  "cleaning": "spray",
  "laundry": "washing-machine",
  // Personal Care & Health
  "personal care": "lotion-outline",
  "toiletries": "shower-head",
  "health": "pill",
  "health & wellness": "pill",
  // Baby & Kids
  "baby & kids": "baby-bottle-outline",
  "baby": "baby-bottle-outline",
  // Pets
  "pets": "paw",
  "pet care": "paw",
  // Electronics & Tech
  "electronics": "cellphone",
  "electronics & tech": "cellphone",
  "tech": "cellphone",
  // Clothing & Accessories
  "clothing": "tshirt-crew",
  "clothing & accessories": "tshirt-crew",
  // Garden & Outdoor
  "garden & outdoor": "flower",
  "gardening": "flower",
  // Office & Stationery
  "office": "pencil",
  "office & stationery": "pencil",
  "stationery": "pencil",
  // Fallback
  "other": "cart",
};

// Keyword to icon mapping - for common item matching
// Each keyword maps to a VALIDATED icon
const KEYWORD_ICONS: Record<string, ValidIcon> = {
  // Proteins
  "chicken": "food-drumstick",
  "turkey": "food-drumstick",
  "duck": "food-drumstick",
  "beef": "cow",
  "steak": "food-steak",
  "mince": "cow",
  "pork": "pig",
  "ham": "pig",
  "bacon": "pig",
  "sausage": "sausage",
  "fish": "fish",
  "salmon": "fish",
  "tuna": "fish",
  "cod": "fish",
  "prawn": "fish",
  "shrimp": "fish",
  "seafood": "fish",
  "lamb": "food-steak",
  "egg": "egg",
  "tofu": "cube-outline",

  // Dairy
  "milk": "cup",
  "cheese": "cheese",
  "cheddar": "cheese",
  "mozzarella": "cheese",
  "parmesan": "cheese",
  "butter": "cube-outline",
  "ghee": "cube-outline",
  "yogurt": "cup",
  "yoghurt": "cup",
  "cream": "cup",

  // Grains & Bread
  "bread": "bread-slice",
  "loaf": "bread-slice",
  "bagel": "bread-slice",
  "pita": "bread-slice",
  "naan": "bread-slice",
  "tortilla": "bread-slice",
  "wrap": "bread-slice",
  "rice": "rice",
  "pasta": "pasta",
  "spaghetti": "pasta",
  "noodle": "pasta",
  "cereal": "corn",
  "oat": "corn",
  "flour": "package-variant",

  // Vegetables
  "potato": "food-variant",
  "carrot": "carrot",
  "onion": "circle-outline",
  "garlic": "circle-outline",
  "tomato": "food-apple",
  "lettuce": "leaf",
  "spinach": "leaf",
  "kale": "leaf",
  "cabbage": "leaf",
  "salad": "leaf",
  "broccoli": "leaf",
  "pepper": "chili-mild",
  "chili": "chili-hot",
  "chilli": "chili-hot",
  "cucumber": "food-variant",
  "courgette": "food-variant",
  "zucchini": "food-variant",
  "aubergine": "food-variant",
  "eggplant": "food-variant",
  "mushroom": "mushroom",
  "corn": "corn",
  "pea": "food-variant",
  "bean": "food-variant",
  "avocado": "food-variant",
  "ginger": "food-variant",

  // Fruits
  "apple": "food-apple",
  "banana": "fruit-watermelon",
  "orange": "fruit-citrus",
  "lemon": "fruit-citrus",
  "lime": "fruit-citrus",
  "citrus": "fruit-citrus",
  "grape": "fruit-grapes",
  "berry": "fruit-cherries",
  "strawberry": "fruit-cherries",
  "blueberry": "fruit-cherries",
  "raspberry": "fruit-cherries",
  "cherry": "fruit-cherries",
  "mango": "fruit-watermelon",
  "pineapple": "fruit-watermelon",
  "melon": "fruit-watermelon",
  "watermelon": "fruit-watermelon",
  "peach": "food-apple",
  "pear": "food-apple",
  "plum": "food-apple",
  "kiwi": "food-apple",

  // Beverages
  "water": "water",
  "juice": "cup",
  "tea": "tea",
  "coffee": "coffee",
  "soda": "bottle-soda",
  "coke": "bottle-soda",
  "cola": "bottle-soda",
  "beer": "glass-mug-variant",
  "wine": "glass-wine",

  // Condiments & Oils
  "oil": "bottle-tonic",
  "vinegar": "bottle-tonic",
  "sauce": "bottle-tonic",
  "ketchup": "bottle-tonic",
  "mayo": "bottle-tonic",
  "mustard": "bottle-tonic",
  "honey": "bottle-tonic",
  "jam": "bottle-tonic",
  "syrup": "bottle-tonic",
  "salt": "shaker-outline",
  "spice": "shaker-outline",
  "seasoning": "shaker-outline",
  "cumin": "shaker-outline",
  "paprika": "shaker-outline",
  "cinnamon": "shaker-outline",
  "black pepper": "shaker-outline",
  "ground pepper": "shaker-outline",
  "curry": "shaker-outline",

  // Snacks
  "crisp": "cookie",
  "chip": "cookie",
  "chocolate": "candy",
  "candy": "candy",
  "sweet": "candy",
  "biscuit": "cookie",
  "cookie": "cookie",
  "cracker": "cookie",
  "nut": "peanut",
  "peanut": "peanut",
  "almond": "peanut",
  "cashew": "peanut",
  "popcorn": "popcorn",
  "ice cream": "ice-cream",
  "cake": "cake",
  "muffin": "cake",

  // Frozen
  "frozen": "snowflake",
  "ice": "snowflake",
  "pizza": "pizza",

  // Canned & Packaged
  "canned": "package-variant",
  "tinned": "package-variant",
  "can": "package-variant",
  "soup": "bowl-mix",
  "broth": "bowl-mix",
  "stock": "bowl-mix",
  "lentil": "package-variant",
  "chickpea": "package-variant",

  // Household & Cleaning
  "toilet": "paper-roll",
  "paper towel": "paper-roll",
  "kitchen roll": "paper-roll",
  "tissue": "paper-roll",
  "detergent": "washing-machine",
  "laundry": "washing-machine",
  "washing": "washing-machine",
  "soap": "hand-wash",
  "dish": "dishwasher",
  "sponge": "dishwasher",
  "shampoo": "shower-head",
  "conditioner": "shower-head",
  "body wash": "shower-head",
  "toothpaste": "toothbrush",
  "toothbrush": "toothbrush",
  "cleaning": "spray",
  "cleaner": "spray",
  "disinfect": "spray",
  "bleach": "spray",
  "bin": "trash-can",
  "trash": "trash-can",
  "rubbish": "trash-can",
  "broom": "broom",
  "mop": "broom",
  "bulb": "lightbulb-outline",
  "foil": "package-variant",
  "cling": "package-variant",

  // Personal Care & Health
  "deodorant": "lotion-outline",
  "lotion": "lotion-outline",
  "sunscreen": "lotion-outline",
  "moisturiser": "lotion-outline",
  "razor": "face-woman",
  "vitamin": "pill",
  "medicine": "pill",
  "paracetamol": "pill",
  "ibuprofen": "pill",
  "plaster": "bandage",
  "bandage": "bandage",
  "first aid": "medical-bag",

  // Baby & Kids
  "nappy": "baby-bottle-outline",
  "diaper": "baby-bottle-outline",
  "baby": "baby-bottle-outline",
  "formula": "baby-bottle-outline",

  // Pets
  "pet food": "paw",
  "dog food": "dog",
  "cat food": "cat",
  "cat litter": "cat",
  "pet": "paw",

  // Electronics & Tech
  "charger": "power-plug",
  "cable": "usb",
  "phone": "cellphone",
  "headphone": "headphones",
  "battery": "battery",

  // Clothing
  "shirt": "tshirt-crew",
  "sock": "tshirt-crew",
  "shoe": "shoe-formal",

  // Garden & Outdoor
  "plant": "flower",
  "seed": "flower",
  "compost": "shovel",
  "garden": "flower",
};

/**
 * Get the best icon for an item using hybrid matching
 *
 * Strategy:
 * 1. Check for keyword matches in item name
 * 2. Fall back to category icon
 * 3. Ultimate fallback: cart icon
 *
 * This is guaranteed to return a valid icon.
 */
export function getIconForItem(itemName: string, category: string): ValidIcon {
  const nameLower = itemName.toLowerCase().trim();
  const categoryLower = category.toLowerCase().trim();

  // Strategy 1: Keyword matching
  // Check if any keyword is contained in the item name
  for (const [keyword, icon] of Object.entries(KEYWORD_ICONS)) {
    if (nameLower.includes(keyword)) {
      return icon;
    }
  }

  // Strategy 2: Category fallback
  if (CATEGORY_ICONS[categoryLower]) {
    return CATEGORY_ICONS[categoryLower];
  }

  // Strategy 3: Ultimate fallback
  return "cart";
}

/**
 * Validate that an icon exists in our validated list
 */
export function isValidIcon(icon: string): icon is ValidIcon {
  return VALIDATED_ICONS.includes(icon as ValidIcon);
}

/**
 * Get icon with validation - returns fallback if invalid
 */
export function getSafeIcon(icon: string | undefined, category: string): ValidIcon {
  if (icon && isValidIcon(icon)) {
    return icon;
  }
  return CATEGORY_ICONS[category.toLowerCase().trim()] || "cart";
}
