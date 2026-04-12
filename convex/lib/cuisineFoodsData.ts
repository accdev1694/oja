/**
 * Cuisine food data: African, Caribbean, and South Asian cuisines.
 * Units must be valid: ml, l, g, kg, pt, pint, pints, pack, pk, x, oz
 *
 * NOTE on the `defaultSize` format: entries here use *bare numbers* (e.g.
 * "250", "2") with the unit in `defaultUnit`. `cleanItemForStorage` canonicalises
 * these into the embedded form ("250g", "2pint") at ingest time — so the stored
 * pantry row is always in the canonical "{number}{unit}" shape. Keep the bare-
 * number style here because it's more readable at a glance; the parser handles
 * the conversion.
 */

export interface CuisineSeedItem {
  name: string;
  category: string;
  estimatedPrice: number;
  defaultSize?: string;
  defaultUnit?: string;
  hasVariants?: boolean;
}

export const BRITISH: CuisineSeedItem[] = [
  { name: "Whole Milk", category: "Dairy & Eggs", estimatedPrice: 1.15, defaultSize: "2", defaultUnit: "pint", hasVariants: true },
  { name: "Semi-Skimmed Milk", category: "Dairy & Eggs", estimatedPrice: 1.15, defaultSize: "2", defaultUnit: "pint", hasVariants: true },
  { name: "Butter", category: "Dairy & Eggs", estimatedPrice: 1.85, defaultSize: "250", defaultUnit: "g" },
  { name: "Free Range Eggs", category: "Dairy & Eggs", estimatedPrice: 2.10, defaultSize: "6", defaultUnit: "pack", hasVariants: true },
  { name: "Cheddar Cheese", category: "Dairy & Eggs", estimatedPrice: 2.75, defaultSize: "400", defaultUnit: "g", hasVariants: true },
  { name: "Double Cream", category: "Dairy & Eggs", estimatedPrice: 1.20, defaultSize: "300", defaultUnit: "ml" },
  { name: "Natural Yoghurt", category: "Dairy & Eggs", estimatedPrice: 0.85, defaultSize: "500", defaultUnit: "g" },
  { name: "White Bread", category: "Bread & Bakery", estimatedPrice: 1.10, defaultSize: "800", defaultUnit: "g", hasVariants: true },
  { name: "Wholemeal Bread", category: "Bread & Bakery", estimatedPrice: 1.20, defaultSize: "800", defaultUnit: "g" },
  { name: "Crumpets", category: "Bread & Bakery", estimatedPrice: 0.85, defaultSize: "6", defaultUnit: "pack" },
  { name: "Chicken Breast", category: "Meat & Seafood", estimatedPrice: 3.50, defaultSize: "500", defaultUnit: "g", hasVariants: true },
  { name: "Beef Mince", category: "Meat & Seafood", estimatedPrice: 3.00, defaultSize: "500", defaultUnit: "g", hasVariants: true },
  { name: "Pork Sausages", category: "Meat & Seafood", estimatedPrice: 2.50, defaultSize: "400", defaultUnit: "g", hasVariants: true },
  { name: "Back Bacon", category: "Meat & Seafood", estimatedPrice: 3.25, defaultSize: "300", defaultUnit: "g" },
  { name: "Fish Fingers", category: "Frozen", estimatedPrice: 2.00, defaultSize: "10", defaultUnit: "pack" },
  { name: "Potatoes", category: "Fruits & Vegetables", estimatedPrice: 1.50, defaultSize: "2.5", defaultUnit: "kg", hasVariants: true },
  { name: "Onions", category: "Fruits & Vegetables", estimatedPrice: 0.90, defaultSize: "1", defaultUnit: "kg" },
  { name: "Carrots", category: "Fruits & Vegetables", estimatedPrice: 0.60, defaultSize: "1", defaultUnit: "kg" },
  { name: "Bananas", category: "Fruits & Vegetables", estimatedPrice: 0.75, defaultSize: "5", defaultUnit: "pack" },
  { name: "Apples", category: "Fruits & Vegetables", estimatedPrice: 1.50, defaultSize: "6", defaultUnit: "pack", hasVariants: true },
  { name: "Tomatoes", category: "Fruits & Vegetables", estimatedPrice: 0.90, defaultSize: "6", defaultUnit: "pack" },
  { name: "Mushrooms", category: "Fruits & Vegetables", estimatedPrice: 0.80, defaultSize: "250", defaultUnit: "g" },
  { name: "Garlic", category: "Fruits & Vegetables", estimatedPrice: 0.40 },
  { name: "Pasta", category: "Rice, Pasta & Grains", estimatedPrice: 0.70, defaultSize: "500", defaultUnit: "g", hasVariants: true },
  { name: "White Rice", category: "Rice, Pasta & Grains", estimatedPrice: 1.50, defaultSize: "1", defaultUnit: "kg", hasVariants: true },
  { name: "Porridge Oats", category: "Cereals & Breakfast", estimatedPrice: 1.20, defaultSize: "1", defaultUnit: "kg" },
  { name: "Plain Flour", category: "Cooking & Baking", estimatedPrice: 0.65, defaultSize: "1.5", defaultUnit: "kg" },
  { name: "Granulated Sugar", category: "Cooking & Baking", estimatedPrice: 0.89, defaultSize: "1", defaultUnit: "kg" },
  { name: "Baked Beans", category: "Tinned & Canned", estimatedPrice: 0.55, defaultSize: "400", defaultUnit: "g", hasVariants: true },
  { name: "Chopped Tomatoes", category: "Tinned & Canned", estimatedPrice: 0.55, defaultSize: "400", defaultUnit: "g" },
  { name: "Tomato Purée", category: "Tinned & Canned", estimatedPrice: 0.55, defaultSize: "200", defaultUnit: "g" },
  { name: "Tuna Chunks", category: "Tinned & Canned", estimatedPrice: 1.10, defaultSize: "145", defaultUnit: "g" },
  { name: "Tomato Ketchup", category: "Condiments & Sauces", estimatedPrice: 2.00, defaultSize: "460", defaultUnit: "g" },
  { name: "Mayonnaise", category: "Condiments & Sauces", estimatedPrice: 1.75, defaultSize: "400", defaultUnit: "ml" },
  { name: "Tea Bags", category: "Drinks", estimatedPrice: 2.75, defaultSize: "80", defaultUnit: "pack", hasVariants: true },
  { name: "Instant Coffee", category: "Drinks", estimatedPrice: 3.50, defaultSize: "200", defaultUnit: "g", hasVariants: true },
  { name: "Orange Juice", category: "Drinks", estimatedPrice: 1.50, defaultSize: "1", defaultUnit: "l" },
  { name: "Vegetable Oil", category: "Cooking & Baking", estimatedPrice: 1.80, defaultSize: "1", defaultUnit: "l" },
  { name: "Olive Oil", category: "Cooking & Baking", estimatedPrice: 3.50, defaultSize: "500", defaultUnit: "ml" },
  { name: "Salt", category: "Spices & Seasonings", estimatedPrice: 0.65, defaultSize: "750", defaultUnit: "g" },
  { name: "Black Pepper", category: "Spices & Seasonings", estimatedPrice: 1.20, defaultSize: "100", defaultUnit: "g" },
  { name: "Toilet Roll", category: "Household & Cleaning", estimatedPrice: 3.50, defaultSize: "9", defaultUnit: "pack", hasVariants: true },
  { name: "Kitchen Roll", category: "Household & Cleaning", estimatedPrice: 1.75, defaultSize: "2", defaultUnit: "pack" },
  { name: "Washing Up Liquid", category: "Household & Cleaning", estimatedPrice: 1.00, defaultSize: "500", defaultUnit: "ml" },
  { name: "Laundry Detergent", category: "Household & Cleaning", estimatedPrice: 4.50, defaultSize: "1.5", defaultUnit: "l", hasVariants: true },
  { name: "Bin Bags", category: "Household & Cleaning", estimatedPrice: 1.50, defaultSize: "30", defaultUnit: "pack" },
  { name: "Digestive Biscuits", category: "Snacks & Sweets", estimatedPrice: 0.85, defaultSize: "400", defaultUnit: "g" },
  { name: "Crisps", category: "Snacks & Sweets", estimatedPrice: 1.75, defaultSize: "6", defaultUnit: "pack", hasVariants: true },
];

export const WEST_AFRICAN: CuisineSeedItem[] = [
  { name: "Plantain", category: "Fruits & Vegetables", estimatedPrice: 1.20, defaultSize: "3", defaultUnit: "pack" },
  { name: "Yam", category: "Fruits & Vegetables", estimatedPrice: 4.50, defaultSize: "1", defaultUnit: "kg" },
  { name: "Cassava", category: "Fruits & Vegetables", estimatedPrice: 3.00, defaultSize: "1", defaultUnit: "kg" },
  { name: "Garri", category: "World Foods", estimatedPrice: 3.50, defaultSize: "1.5", defaultUnit: "kg" },
  { name: "Fufu Flour", category: "World Foods", estimatedPrice: 3.00, defaultSize: "1", defaultUnit: "kg" },
  { name: "Pounded Yam Flour", category: "World Foods", estimatedPrice: 4.00, defaultSize: "1.5", defaultUnit: "kg" },
  { name: "Egusi (Ground Melon Seeds)", category: "World Foods", estimatedPrice: 5.50, defaultSize: "500", defaultUnit: "g" },
  { name: "Ogbono (Bush Mango Seeds)", category: "World Foods", estimatedPrice: 6.00, defaultSize: "250", defaultUnit: "g" },
  { name: "Stockfish", category: "Meat & Seafood", estimatedPrice: 8.00, defaultSize: "200", defaultUnit: "g" },
  { name: "Dried Crayfish", category: "World Foods", estimatedPrice: 4.50, defaultSize: "100", defaultUnit: "g" },
  { name: "Dried Prawns", category: "Meat & Seafood", estimatedPrice: 3.50, defaultSize: "100", defaultUnit: "g" },
  { name: "Locust Beans (Dawadawa)", category: "World Foods", estimatedPrice: 3.00, defaultSize: "100", defaultUnit: "g" },
  { name: "Palm Oil", category: "Cooking & Baking", estimatedPrice: 4.50, defaultSize: "1", defaultUnit: "l" },
  { name: "Groundnut Oil", category: "Cooking & Baking", estimatedPrice: 3.50, defaultSize: "1", defaultUnit: "l" },
  { name: "Scotch Bonnet Peppers", category: "Fruits & Vegetables", estimatedPrice: 1.00, defaultSize: "100", defaultUnit: "g" },
  { name: "Ground Cameroon Pepper", category: "Spices & Seasonings", estimatedPrice: 2.50, defaultSize: "100", defaultUnit: "g" },
  { name: "Suya Spice", category: "Spices & Seasonings", estimatedPrice: 2.00, defaultSize: "100", defaultUnit: "g" },
  { name: "Jollof Rice Seasoning", category: "Spices & Seasonings", estimatedPrice: 2.00, defaultSize: "100", defaultUnit: "g" },
  { name: "Maggi Cubes", category: "Spices & Seasonings", estimatedPrice: 1.50, defaultSize: "20", defaultUnit: "pack" },
  { name: "Knorr Seasoning Cubes", category: "Spices & Seasonings", estimatedPrice: 1.50, defaultSize: "20", defaultUnit: "pack" },
  { name: "Curry Powder", category: "Spices & Seasonings", estimatedPrice: 1.20, defaultSize: "100", defaultUnit: "g" },
  { name: "Long Grain Rice", category: "Rice, Pasta & Grains", estimatedPrice: 2.00, defaultSize: "1", defaultUnit: "kg", hasVariants: true },
  { name: "Ofada Rice", category: "Rice, Pasta & Grains", estimatedPrice: 3.50, defaultSize: "1", defaultUnit: "kg" },
  { name: "Golden Sella Basmati", category: "Rice, Pasta & Grains", estimatedPrice: 5.00, defaultSize: "2", defaultUnit: "kg" },
  { name: "Tomato Paste (Tin)", category: "Tinned & Canned", estimatedPrice: 0.80, defaultSize: "210", defaultUnit: "g" },
  { name: "Corned Beef", category: "Tinned & Canned", estimatedPrice: 2.50, defaultSize: "340", defaultUnit: "g" },
  { name: "Sardines in Tomato Sauce", category: "Tinned & Canned", estimatedPrice: 0.90, defaultSize: "120", defaultUnit: "g" },
  { name: "Okra", category: "Fruits & Vegetables", estimatedPrice: 1.50, defaultSize: "200", defaultUnit: "g" },
  { name: "Ugu (Pumpkin Leaves)", category: "Fruits & Vegetables", estimatedPrice: 2.50, defaultSize: "200", defaultUnit: "g" },
  { name: "Bitter Leaf", category: "Fruits & Vegetables", estimatedPrice: 2.00, defaultSize: "100", defaultUnit: "g" },
  { name: "Fresh Ginger", category: "Fruits & Vegetables", estimatedPrice: 0.80, defaultSize: "100", defaultUnit: "g" },
  { name: "Goat Meat", category: "Meat & Seafood", estimatedPrice: 8.00, defaultSize: "1", defaultUnit: "kg" },
  { name: "Smoked Fish", category: "Meat & Seafood", estimatedPrice: 6.00, defaultSize: "250", defaultUnit: "g" },
  { name: "Dried Fish (Panla)", category: "Meat & Seafood", estimatedPrice: 5.50, defaultSize: "200", defaultUnit: "g" },
  { name: "Ponmo (Cow Skin)", category: "Meat & Seafood", estimatedPrice: 4.00, defaultSize: "500", defaultUnit: "g" },
  { name: "Turkey Wings", category: "Meat & Seafood", estimatedPrice: 4.00, defaultSize: "1", defaultUnit: "kg" },
  { name: "Chin Chin", category: "Snacks & Sweets", estimatedPrice: 2.50, defaultSize: "250", defaultUnit: "g" },
  { name: "Plantain Chips", category: "Snacks & Sweets", estimatedPrice: 1.80, defaultSize: "150", defaultUnit: "g" },
  { name: "Malt Drink", category: "Drinks", estimatedPrice: 1.50, defaultSize: "330", defaultUnit: "ml", hasVariants: true },
  { name: "Zobo (Hibiscus) Leaves", category: "Drinks", estimatedPrice: 2.00, defaultSize: "200", defaultUnit: "g" },
];

export const EAST_AFRICAN: CuisineSeedItem[] = [
  { name: "Teff Flour", category: "World Foods", estimatedPrice: 5.50, defaultSize: "1", defaultUnit: "kg" },
  { name: "Berbere Spice", category: "Spices & Seasonings", estimatedPrice: 3.00, defaultSize: "100", defaultUnit: "g" },
  { name: "Red Lentils", category: "Rice, Pasta & Grains", estimatedPrice: 1.50, defaultSize: "500", defaultUnit: "g" },
  { name: "Yellow Split Peas", category: "Rice, Pasta & Grains", estimatedPrice: 1.30, defaultSize: "500", defaultUnit: "g" },
  { name: "Cardamom Pods", category: "Spices & Seasonings", estimatedPrice: 2.50, defaultSize: "50", defaultUnit: "g" },
  { name: "Fenugreek Seeds", category: "Spices & Seasonings", estimatedPrice: 1.50, defaultSize: "100", defaultUnit: "g" },
  { name: "Chapati Flour", category: "Rice, Pasta & Grains", estimatedPrice: 2.00, defaultSize: "1", defaultUnit: "kg" },
  { name: "Ugali Flour (Maize Meal)", category: "World Foods", estimatedPrice: 2.50, defaultSize: "1", defaultUnit: "kg" },
  { name: "Coconut Milk", category: "Tinned & Canned", estimatedPrice: 1.00, defaultSize: "400", defaultUnit: "ml" },
  { name: "Pilau Masala", category: "Spices & Seasonings", estimatedPrice: 2.00, defaultSize: "100", defaultUnit: "g" },
  { name: "Dried Kidney Beans", category: "Rice, Pasta & Grains", estimatedPrice: 1.50, defaultSize: "500", defaultUnit: "g" },
  { name: "Cassava Flour", category: "World Foods", estimatedPrice: 3.00, defaultSize: "1", defaultUnit: "kg" },
  { name: "Tamarind Paste", category: "Condiments & Sauces", estimatedPrice: 1.80, defaultSize: "200", defaultUnit: "g" },
  { name: "Tilapia (Whole)", category: "Meat & Seafood", estimatedPrice: 5.00, defaultSize: "500", defaultUnit: "g" },
];

export const SOUTHERN_AFRICAN: CuisineSeedItem[] = [
  { name: "Mealie Meal (Maize Flour)", category: "World Foods", estimatedPrice: 2.50, defaultSize: "2.5", defaultUnit: "kg" },
  { name: "Biltong", category: "Snacks & Sweets", estimatedPrice: 6.00, defaultSize: "100", defaultUnit: "g" },
  { name: "Boerewors Sausage", category: "Meat & Seafood", estimatedPrice: 5.00, defaultSize: "500", defaultUnit: "g" },
  { name: "Chakalaka Relish", category: "Condiments & Sauces", estimatedPrice: 2.50, defaultSize: "410", defaultUnit: "g" },
  { name: "Mrs Balls Chutney", category: "Condiments & Sauces", estimatedPrice: 3.50, defaultSize: "470", defaultUnit: "g" },
  { name: "Rooibos Tea", category: "Drinks", estimatedPrice: 2.50, defaultSize: "40", defaultUnit: "pack" },
  { name: "Peri-Peri Sauce", category: "Condiments & Sauces", estimatedPrice: 2.50, defaultSize: "250", defaultUnit: "ml" },
  { name: "Samp (Dried Corn Kernels)", category: "World Foods", estimatedPrice: 3.00, defaultSize: "1", defaultUnit: "kg" },
  { name: "Dried Sugar Beans", category: "Rice, Pasta & Grains", estimatedPrice: 2.00, defaultSize: "500", defaultUnit: "g" },
  { name: "Rusks", category: "Snacks & Sweets", estimatedPrice: 4.00, defaultSize: "450", defaultUnit: "g" },
];

export const NORTH_AFRICAN: CuisineSeedItem[] = [
  { name: "Couscous", category: "Rice, Pasta & Grains", estimatedPrice: 1.20, defaultSize: "500", defaultUnit: "g" },
  { name: "Harissa Paste", category: "Condiments & Sauces", estimatedPrice: 2.00, defaultSize: "200", defaultUnit: "g" },
  { name: "Ras El Hanout", category: "Spices & Seasonings", estimatedPrice: 2.50, defaultSize: "50", defaultUnit: "g" },
  { name: "Preserved Lemons", category: "Condiments & Sauces", estimatedPrice: 3.50, defaultSize: "200", defaultUnit: "g" },
  { name: "Dates (Medjool)", category: "Snacks & Sweets", estimatedPrice: 4.00, defaultSize: "250", defaultUnit: "g" },
  { name: "Chickpeas (Dried)", category: "Rice, Pasta & Grains", estimatedPrice: 1.20, defaultSize: "500", defaultUnit: "g" },
  { name: "Merguez Sausage", category: "Meat & Seafood", estimatedPrice: 4.50, defaultSize: "300", defaultUnit: "g" },
  { name: "Semolina (Fine)", category: "Rice, Pasta & Grains", estimatedPrice: 1.50, defaultSize: "500", defaultUnit: "g" },
  { name: "Cumin Seeds", category: "Spices & Seasonings", estimatedPrice: 1.20, defaultSize: "50", defaultUnit: "g" },
  { name: "Flat Bread", category: "Bread & Bakery", estimatedPrice: 1.50, defaultSize: "5", defaultUnit: "pack" },
  { name: "Lamb Shoulder", category: "Meat & Seafood", estimatedPrice: 7.00, defaultSize: "1", defaultUnit: "kg" },
  { name: "Almonds", category: "Snacks & Sweets", estimatedPrice: 3.00, defaultSize: "200", defaultUnit: "g" },
];

export const CARIBBEAN: CuisineSeedItem[] = [
  { name: "Ackee (Tinned)", category: "Tinned & Canned", estimatedPrice: 3.50, defaultSize: "280", defaultUnit: "g" },
  { name: "Saltfish (Dried Cod)", category: "Meat & Seafood", estimatedPrice: 6.00, defaultSize: "250", defaultUnit: "g" },
  { name: "Jerk Seasoning", category: "Spices & Seasonings", estimatedPrice: 2.50, defaultSize: "280", defaultUnit: "g" },
  { name: "Coconut Milk", category: "Tinned & Canned", estimatedPrice: 1.00, defaultSize: "400", defaultUnit: "ml" },
  { name: "Plantain", category: "Fruits & Vegetables", estimatedPrice: 1.20, defaultSize: "3", defaultUnit: "pack" },
  { name: "Yam", category: "Fruits & Vegetables", estimatedPrice: 4.50, defaultSize: "1", defaultUnit: "kg" },
  { name: "Callaloo (Tinned)", category: "Tinned & Canned", estimatedPrice: 2.00, defaultSize: "280", defaultUnit: "g" },
  { name: "Kidney Beans (Tinned)", category: "Tinned & Canned", estimatedPrice: 0.60, defaultSize: "400", defaultUnit: "g" },
  { name: "Grace Hot Pepper Sauce", category: "Condiments & Sauces", estimatedPrice: 2.00, defaultSize: "185", defaultUnit: "ml" },
  { name: "Browning Sauce", category: "Condiments & Sauces", estimatedPrice: 2.50, defaultSize: "300", defaultUnit: "ml" },
  { name: "Dumpling Flour", category: "Cooking & Baking", estimatedPrice: 1.50, defaultSize: "1", defaultUnit: "kg" },
  { name: "Cornmeal", category: "Rice, Pasta & Grains", estimatedPrice: 1.80, defaultSize: "1", defaultUnit: "kg" },
  { name: "Oxtail", category: "Meat & Seafood", estimatedPrice: 8.00, defaultSize: "1", defaultUnit: "kg" },
  { name: "Ginger Beer", category: "Drinks", estimatedPrice: 1.00, defaultSize: "330", defaultUnit: "ml" },
  { name: "Sweet Potato", category: "Fruits & Vegetables", estimatedPrice: 1.50, defaultSize: "1", defaultUnit: "kg" },
  { name: "Green Bananas", category: "Fruits & Vegetables", estimatedPrice: 1.80, defaultSize: "6", defaultUnit: "pack" },
];

export const SOUTH_ASIAN: CuisineSeedItem[] = [
  { name: "Basmati Rice", category: "Rice, Pasta & Grains", estimatedPrice: 4.00, defaultSize: "2", defaultUnit: "kg", hasVariants: true },
  { name: "Ghee", category: "Cooking & Baking", estimatedPrice: 3.50, defaultSize: "500", defaultUnit: "g" },
  { name: "Chapati Flour (Atta)", category: "Rice, Pasta & Grains", estimatedPrice: 2.00, defaultSize: "1.5", defaultUnit: "kg" },
  { name: "Gram Flour (Besan)", category: "Cooking & Baking", estimatedPrice: 1.50, defaultSize: "1", defaultUnit: "kg" },
  { name: "Red Lentils (Masoor Dal)", category: "Rice, Pasta & Grains", estimatedPrice: 1.50, defaultSize: "500", defaultUnit: "g" },
  { name: "Chana Dal", category: "Rice, Pasta & Grains", estimatedPrice: 1.80, defaultSize: "500", defaultUnit: "g" },
  { name: "Cumin Seeds", category: "Spices & Seasonings", estimatedPrice: 1.20, defaultSize: "100", defaultUnit: "g" },
  { name: "Turmeric Powder", category: "Spices & Seasonings", estimatedPrice: 1.00, defaultSize: "100", defaultUnit: "g" },
  { name: "Garam Masala", category: "Spices & Seasonings", estimatedPrice: 1.50, defaultSize: "100", defaultUnit: "g" },
  { name: "Chilli Powder", category: "Spices & Seasonings", estimatedPrice: 1.00, defaultSize: "100", defaultUnit: "g" },
  { name: "Mustard Seeds", category: "Spices & Seasonings", estimatedPrice: 1.00, defaultSize: "100", defaultUnit: "g" },
  { name: "Paneer", category: "Dairy & Eggs", estimatedPrice: 2.50, defaultSize: "250", defaultUnit: "g" },
  { name: "Naan Bread", category: "Bread & Bakery", estimatedPrice: 1.00, defaultSize: "2", defaultUnit: "pack" },
  { name: "Mango Chutney", category: "Condiments & Sauces", estimatedPrice: 1.80, defaultSize: "340", defaultUnit: "g" },
  { name: "Coconut Cream", category: "Tinned & Canned", estimatedPrice: 1.00, defaultSize: "400", defaultUnit: "ml" },
  { name: "Fresh Coriander", category: "Fruits & Vegetables", estimatedPrice: 0.60, defaultSize: "30", defaultUnit: "g" },
  { name: "Green Chillies", category: "Fruits & Vegetables", estimatedPrice: 0.60, defaultSize: "100", defaultUnit: "g" },
  { name: "Okra", category: "Fruits & Vegetables", estimatedPrice: 1.50, defaultSize: "200", defaultUnit: "g" },
  { name: "Chickpeas (Tinned)", category: "Tinned & Canned", estimatedPrice: 0.60, defaultSize: "400", defaultUnit: "g" },
];
