/**
 * Seeded Products for UK Users
 *
 * Pre-populated pantry items shown during onboarding.
 * Users can deselect items they don't typically buy.
 */

export interface SeededProduct {
  id: string;
  name: string;
  category: ProductCategory;
  defaultUnit?: string;
}

export type ProductCategory =
  | 'dairy'
  | 'bakery'
  | 'eggs'
  | 'pantry'
  | 'tinned'
  | 'beverages'
  | 'produce'
  | 'meat'
  | 'frozen'
  | 'household'
  | 'personal-care';

export interface CategoryInfo {
  id: ProductCategory;
  name: string;
  emoji: string;
}

export const PRODUCT_CATEGORIES: CategoryInfo[] = [
  { id: 'dairy', name: 'Dairy', emoji: '🥛' },
  { id: 'bakery', name: 'Bakery', emoji: '🍞' },
  { id: 'eggs', name: 'Eggs', emoji: '🥚' },
  { id: 'pantry', name: 'Pantry', emoji: '🥫' },
  { id: 'tinned', name: 'Tinned', emoji: '🥫' },
  { id: 'beverages', name: 'Beverages', emoji: '☕' },
  { id: 'produce', name: 'Produce', emoji: '🥬' },
  { id: 'meat', name: 'Meat', emoji: '🥩' },
  { id: 'frozen', name: 'Frozen', emoji: '❄️' },
  { id: 'household', name: 'Household', emoji: '🧹' },
  { id: 'personal-care', name: 'Personal Care', emoji: '🧴' },
];

/**
 * UK staple items pre-selected by default
 */
export const SEEDED_PRODUCTS: SeededProduct[] = [
  // Dairy
  { id: 'milk', name: 'Milk', category: 'dairy', defaultUnit: 'pint' },
  { id: 'butter', name: 'Butter', category: 'dairy' },
  { id: 'cheese', name: 'Cheese', category: 'dairy' },
  { id: 'yogurt', name: 'Yogurt', category: 'dairy' },

  // Bakery
  { id: 'bread', name: 'Bread', category: 'bakery', defaultUnit: 'loaf' },
  { id: 'rolls', name: 'Rolls', category: 'bakery', defaultUnit: 'pack' },

  // Eggs
  { id: 'eggs', name: 'Eggs', category: 'eggs', defaultUnit: 'box' },

  // Pantry
  { id: 'rice', name: 'Rice', category: 'pantry', defaultUnit: 'kg' },
  { id: 'pasta', name: 'Pasta', category: 'pantry', defaultUnit: 'pack' },
  { id: 'flour', name: 'Flour', category: 'pantry', defaultUnit: 'kg' },
  { id: 'sugar', name: 'Sugar', category: 'pantry', defaultUnit: 'kg' },
  { id: 'salt', name: 'Salt', category: 'pantry' },
  { id: 'cooking-oil', name: 'Cooking Oil', category: 'pantry' },
  { id: 'olive-oil', name: 'Olive Oil', category: 'pantry' },

  // Tinned
  {
    id: 'baked-beans',
    name: 'Baked Beans',
    category: 'tinned',
    defaultUnit: 'tin',
  },
  {
    id: 'chopped-tomatoes',
    name: 'Chopped Tomatoes',
    category: 'tinned',
    defaultUnit: 'tin',
  },
  { id: 'tuna', name: 'Tuna', category: 'tinned', defaultUnit: 'tin' },
  {
    id: 'sweetcorn',
    name: 'Sweetcorn',
    category: 'tinned',
    defaultUnit: 'tin',
  },

  // Beverages
  { id: 'tea', name: 'Tea', category: 'beverages', defaultUnit: 'box' },
  { id: 'coffee', name: 'Coffee', category: 'beverages', defaultUnit: 'jar' },
  {
    id: 'orange-juice',
    name: 'Orange Juice',
    category: 'beverages',
    defaultUnit: 'carton',
  },

  // Produce
  { id: 'potatoes', name: 'Potatoes', category: 'produce', defaultUnit: 'kg' },
  { id: 'onions', name: 'Onions', category: 'produce' },
  { id: 'bananas', name: 'Bananas', category: 'produce' },
  { id: 'apples', name: 'Apples', category: 'produce' },
  { id: 'carrots', name: 'Carrots', category: 'produce' },
  { id: 'tomatoes', name: 'Tomatoes', category: 'produce' },

  // Meat
  { id: 'chicken', name: 'Chicken', category: 'meat' },
  { id: 'mince', name: 'Mince', category: 'meat' },

  // Frozen
  {
    id: 'frozen-peas',
    name: 'Frozen Peas',
    category: 'frozen',
    defaultUnit: 'bag',
  },
  {
    id: 'fish-fingers',
    name: 'Fish Fingers',
    category: 'frozen',
    defaultUnit: 'box',
  },
];

/**
 * Get products grouped by category
 */
export function getProductsByCategory(): Map<ProductCategory, SeededProduct[]> {
  const grouped = new Map<ProductCategory, SeededProduct[]>();

  for (const category of PRODUCT_CATEGORIES) {
    grouped.set(category.id, []);
  }

  for (const product of SEEDED_PRODUCTS) {
    const categoryProducts = grouped.get(product.category) || [];
    categoryProducts.push(product);
    grouped.set(product.category, categoryProducts);
  }

  return grouped;
}

/**
 * Filter products by search query
 */
export function filterProducts(
  products: SeededProduct[],
  query: string
): SeededProduct[] {
  const normalizedQuery = query.toLowerCase().trim();
  if (!normalizedQuery) return products;

  return products.filter(
    (product) =>
      product.name.toLowerCase().includes(normalizedQuery) ||
      product.category.toLowerCase().includes(normalizedQuery)
  );
}
