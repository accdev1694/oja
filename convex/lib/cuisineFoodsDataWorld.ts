/**
 * Cuisine food data: Asian, European, Middle Eastern, and Latin American cuisines.
 * Units must be valid: ml, l, g, kg, pt, pint, pints, pack, pk, x, oz
 */

import type { CuisineSeedItem } from "./cuisineFoodsData";

export const CHINESE: CuisineSeedItem[] = [
  { name: "Soy Sauce (Light)", category: "Condiments & Sauces", estimatedPrice: 1.50, defaultSize: "150", defaultUnit: "ml" },
  { name: "Soy Sauce (Dark)", category: "Condiments & Sauces", estimatedPrice: 1.50, defaultSize: "150", defaultUnit: "ml" },
  { name: "Sesame Oil", category: "Cooking & Baking", estimatedPrice: 2.50, defaultSize: "250", defaultUnit: "ml" },
  { name: "Rice Vinegar", category: "Cooking & Baking", estimatedPrice: 1.50, defaultSize: "250", defaultUnit: "ml" },
  { name: "Oyster Sauce", category: "Condiments & Sauces", estimatedPrice: 2.00, defaultSize: "255", defaultUnit: "g" },
  { name: "Hoisin Sauce", category: "Condiments & Sauces", estimatedPrice: 2.00, defaultSize: "220", defaultUnit: "g" },
  { name: "Jasmine Rice", category: "Rice, Pasta & Grains", estimatedPrice: 3.00, defaultSize: "1", defaultUnit: "kg" },
  { name: "Egg Noodles", category: "Rice, Pasta & Grains", estimatedPrice: 1.50, defaultSize: "300", defaultUnit: "g" },
  { name: "Rice Noodles", category: "Rice, Pasta & Grains", estimatedPrice: 1.50, defaultSize: "250", defaultUnit: "g" },
  { name: "Firm Tofu", category: "Chilled & Deli", estimatedPrice: 1.80, defaultSize: "400", defaultUnit: "g" },
  { name: "Five Spice Powder", category: "Spices & Seasonings", estimatedPrice: 1.50, defaultSize: "40", defaultUnit: "g" },
  { name: "Chilli Bean Paste (Doubanjiang)", category: "Condiments & Sauces", estimatedPrice: 2.50, defaultSize: "250", defaultUnit: "g" },
  { name: "Pak Choi", category: "Fruits & Vegetables", estimatedPrice: 0.80, defaultSize: "200", defaultUnit: "g" },
  { name: "Cornflour", category: "Cooking & Baking", estimatedPrice: 0.80, defaultSize: "250", defaultUnit: "g" },
];

export const JAPANESE: CuisineSeedItem[] = [
  { name: "Sushi Rice", category: "Rice, Pasta & Grains", estimatedPrice: 3.50, defaultSize: "1", defaultUnit: "kg" },
  { name: "Miso Paste (White)", category: "Condiments & Sauces", estimatedPrice: 3.00, defaultSize: "300", defaultUnit: "g" },
  { name: "Mirin", category: "Condiments & Sauces", estimatedPrice: 2.50, defaultSize: "250", defaultUnit: "ml" },
  { name: "Soy Sauce (Japanese)", category: "Condiments & Sauces", estimatedPrice: 2.50, defaultSize: "250", defaultUnit: "ml" },
  { name: "Nori Seaweed Sheets", category: "World Foods", estimatedPrice: 2.50, defaultSize: "10", defaultUnit: "pack" },
  { name: "Dashi Stock Powder", category: "Spices & Seasonings", estimatedPrice: 2.00, defaultSize: "50", defaultUnit: "g" },
  { name: "Panko Breadcrumbs", category: "Cooking & Baking", estimatedPrice: 1.80, defaultSize: "200", defaultUnit: "g" },
  { name: "Udon Noodles", category: "Rice, Pasta & Grains", estimatedPrice: 2.00, defaultSize: "300", defaultUnit: "g" },
  { name: "Ramen Noodles", category: "Rice, Pasta & Grains", estimatedPrice: 1.50, defaultSize: "300", defaultUnit: "g" },
  { name: "Wasabi Paste", category: "Condiments & Sauces", estimatedPrice: 2.00, defaultSize: "43", defaultUnit: "g" },
  { name: "Pickled Ginger", category: "Condiments & Sauces", estimatedPrice: 1.80, defaultSize: "100", defaultUnit: "g" },
  { name: "Edamame Beans (Frozen)", category: "Frozen", estimatedPrice: 2.00, defaultSize: "300", defaultUnit: "g" },
  { name: "Japanese Curry Roux", category: "World Foods", estimatedPrice: 2.50, defaultSize: "200", defaultUnit: "g" },
];

export const KOREAN: CuisineSeedItem[] = [
  { name: "Gochujang (Red Pepper Paste)", category: "Condiments & Sauces", estimatedPrice: 3.50, defaultSize: "500", defaultUnit: "g" },
  { name: "Gochugaru (Red Pepper Flakes)", category: "Spices & Seasonings", estimatedPrice: 4.00, defaultSize: "200", defaultUnit: "g" },
  { name: "Doenjang (Soybean Paste)", category: "Condiments & Sauces", estimatedPrice: 3.00, defaultSize: "500", defaultUnit: "g" },
  { name: "Kimchi", category: "Chilled & Deli", estimatedPrice: 3.00, defaultSize: "400", defaultUnit: "g" },
  { name: "Korean Short Grain Rice", category: "Rice, Pasta & Grains", estimatedPrice: 4.00, defaultSize: "1", defaultUnit: "kg" },
  { name: "Korean Glass Noodles (Japchae)", category: "Rice, Pasta & Grains", estimatedPrice: 2.50, defaultSize: "300", defaultUnit: "g" },
  { name: "Sesame Seeds", category: "Spices & Seasonings", estimatedPrice: 1.50, defaultSize: "100", defaultUnit: "g" },
  { name: "Rice Cakes (Tteok)", category: "World Foods", estimatedPrice: 3.00, defaultSize: "500", defaultUnit: "g" },
  { name: "Korean Ramen Noodles", category: "Rice, Pasta & Grains", estimatedPrice: 1.50, defaultSize: "5", defaultUnit: "pack" },
];

export const SOUTHEAST_ASIAN: CuisineSeedItem[] = [
  { name: "Fish Sauce", category: "Condiments & Sauces", estimatedPrice: 1.50, defaultSize: "200", defaultUnit: "ml" },
  { name: "Coconut Milk", category: "Tinned & Canned", estimatedPrice: 1.00, defaultSize: "400", defaultUnit: "ml" },
  { name: "Thai Jasmine Rice", category: "Rice, Pasta & Grains", estimatedPrice: 3.00, defaultSize: "1", defaultUnit: "kg" },
  { name: "Rice Noodles (Pad Thai)", category: "Rice, Pasta & Grains", estimatedPrice: 1.50, defaultSize: "250", defaultUnit: "g" },
  { name: "Lemongrass", category: "Spices & Seasonings", estimatedPrice: 0.80, defaultSize: "30", defaultUnit: "g" },
  { name: "Thai Red Curry Paste", category: "Condiments & Sauces", estimatedPrice: 1.50, defaultSize: "200", defaultUnit: "g" },
  { name: "Thai Green Curry Paste", category: "Condiments & Sauces", estimatedPrice: 1.50, defaultSize: "200", defaultUnit: "g" },
  { name: "Sweet Chilli Sauce", category: "Condiments & Sauces", estimatedPrice: 1.50, defaultSize: "250", defaultUnit: "ml" },
  { name: "Sriracha Sauce", category: "Condiments & Sauces", estimatedPrice: 2.50, defaultSize: "455", defaultUnit: "ml" },
  { name: "Tamarind Paste", category: "Condiments & Sauces", estimatedPrice: 1.80, defaultSize: "200", defaultUnit: "g" },
  { name: "Firm Tofu", category: "Chilled & Deli", estimatedPrice: 1.80, defaultSize: "400", defaultUnit: "g" },
  { name: "Lime", category: "Fruits & Vegetables", estimatedPrice: 0.30, defaultSize: "4", defaultUnit: "pack" },
  { name: "Prawn Crackers", category: "Snacks & Sweets", estimatedPrice: 1.00, defaultSize: "100", defaultUnit: "g" },
];

export const MIDDLE_EASTERN: CuisineSeedItem[] = [
  { name: "Hummus", category: "Chilled & Deli", estimatedPrice: 1.50, defaultSize: "300", defaultUnit: "g" },
  { name: "Tahini", category: "Condiments & Sauces", estimatedPrice: 2.50, defaultSize: "300", defaultUnit: "g" },
  { name: "Pitta Bread", category: "Bread & Bakery", estimatedPrice: 0.80, defaultSize: "6", defaultUnit: "pack" },
  { name: "Chickpeas (Tinned)", category: "Tinned & Canned", estimatedPrice: 0.60, defaultSize: "400", defaultUnit: "g" },
  { name: "Feta Cheese", category: "Dairy & Eggs", estimatedPrice: 2.00, defaultSize: "200", defaultUnit: "g" },
  { name: "Halloumi", category: "Dairy & Eggs", estimatedPrice: 2.50, defaultSize: "250", defaultUnit: "g" },
  { name: "Sumac", category: "Spices & Seasonings", estimatedPrice: 2.00, defaultSize: "50", defaultUnit: "g" },
  { name: "Za'atar", category: "Spices & Seasonings", estimatedPrice: 2.50, defaultSize: "50", defaultUnit: "g" },
  { name: "Pomegranate Molasses", category: "Condiments & Sauces", estimatedPrice: 3.00, defaultSize: "250", defaultUnit: "ml" },
  { name: "Bulgur Wheat", category: "Rice, Pasta & Grains", estimatedPrice: 1.50, defaultSize: "500", defaultUnit: "g" },
  { name: "Dates (Medjool)", category: "Snacks & Sweets", estimatedPrice: 4.00, defaultSize: "250", defaultUnit: "g" },
  { name: "Pistachios", category: "Snacks & Sweets", estimatedPrice: 4.50, defaultSize: "200", defaultUnit: "g" },
  { name: "Lamb Mince", category: "Meat & Seafood", estimatedPrice: 4.50, defaultSize: "500", defaultUnit: "g" },
];

export const TURKISH: CuisineSeedItem[] = [
  { name: "Turkish Red Pepper Paste", category: "Condiments & Sauces", estimatedPrice: 2.50, defaultSize: "650", defaultUnit: "g" },
  { name: "Bulgur Wheat (Fine)", category: "Rice, Pasta & Grains", estimatedPrice: 1.50, defaultSize: "500", defaultUnit: "g" },
  { name: "Sucuk (Turkish Sausage)", category: "Meat & Seafood", estimatedPrice: 4.00, defaultSize: "250", defaultUnit: "g" },
  { name: "Dried Red Lentils", category: "Rice, Pasta & Grains", estimatedPrice: 1.50, defaultSize: "500", defaultUnit: "g" },
  { name: "Pul Biber (Chilli Flakes)", category: "Spices & Seasonings", estimatedPrice: 2.00, defaultSize: "100", defaultUnit: "g" },
  { name: "Turkish Bread (Pide)", category: "Bread & Bakery", estimatedPrice: 2.00, defaultSize: "1", defaultUnit: "pack" },
  { name: "Dried Apricots", category: "Snacks & Sweets", estimatedPrice: 2.50, defaultSize: "250", defaultUnit: "g" },
  { name: "Walnuts", category: "Snacks & Sweets", estimatedPrice: 3.50, defaultSize: "200", defaultUnit: "g" },
  { name: "Yoghurt (Natural)", category: "Dairy & Eggs", estimatedPrice: 0.85, defaultSize: "500", defaultUnit: "g" },
  { name: "Turkish Tea", category: "Drinks", estimatedPrice: 3.00, defaultSize: "500", defaultUnit: "g" },
  { name: "Aubergine", category: "Fruits & Vegetables", estimatedPrice: 0.70, defaultSize: "1", defaultUnit: "pack" },
];

export const MEDITERRANEAN: CuisineSeedItem[] = [
  { name: "Extra Virgin Olive Oil", category: "Cooking & Baking", estimatedPrice: 5.00, defaultSize: "500", defaultUnit: "ml" },
  { name: "Balsamic Vinegar", category: "Cooking & Baking", estimatedPrice: 2.50, defaultSize: "250", defaultUnit: "ml" },
  { name: "Passata", category: "Tinned & Canned", estimatedPrice: 0.80, defaultSize: "500", defaultUnit: "g" },
  { name: "Spaghetti", category: "Rice, Pasta & Grains", estimatedPrice: 0.70, defaultSize: "500", defaultUnit: "g" },
  { name: "Risotto Rice (Arborio)", category: "Rice, Pasta & Grains", estimatedPrice: 2.00, defaultSize: "500", defaultUnit: "g" },
  { name: "Parmesan Cheese", category: "Dairy & Eggs", estimatedPrice: 3.50, defaultSize: "200", defaultUnit: "g" },
  { name: "Mozzarella", category: "Dairy & Eggs", estimatedPrice: 0.75, defaultSize: "125", defaultUnit: "g" },
  { name: "Olives (Mixed)", category: "Tinned & Canned", estimatedPrice: 2.00, defaultSize: "280", defaultUnit: "g" },
  { name: "Pesto (Basil)", category: "Condiments & Sauces", estimatedPrice: 2.00, defaultSize: "190", defaultUnit: "g" },
  { name: "Dried Oregano", category: "Spices & Seasonings", estimatedPrice: 1.00, defaultSize: "30", defaultUnit: "g" },
  { name: "Red Peppers", category: "Fruits & Vegetables", estimatedPrice: 0.70, defaultSize: "3", defaultUnit: "pack" },
  { name: "Ciabatta Bread", category: "Bread & Bakery", estimatedPrice: 1.50, defaultSize: "1", defaultUnit: "pack" },
  { name: "Prosciutto", category: "Chilled & Deli", estimatedPrice: 3.00, defaultSize: "70", defaultUnit: "g" },
];

export const FRENCH: CuisineSeedItem[] = [
  { name: "Unsalted Butter", category: "Dairy & Eggs", estimatedPrice: 2.00, defaultSize: "250", defaultUnit: "g" },
  { name: "Crème Fraîche", category: "Dairy & Eggs", estimatedPrice: 1.20, defaultSize: "200", defaultUnit: "ml" },
  { name: "Brie Cheese", category: "Dairy & Eggs", estimatedPrice: 2.50, defaultSize: "200", defaultUnit: "g" },
  { name: "Dijon Mustard", category: "Condiments & Sauces", estimatedPrice: 1.80, defaultSize: "215", defaultUnit: "g" },
  { name: "Herbes de Provence", category: "Spices & Seasonings", estimatedPrice: 1.50, defaultSize: "30", defaultUnit: "g" },
  { name: "Baguette", category: "Bread & Bakery", estimatedPrice: 1.00, defaultSize: "1", defaultUnit: "pack" },
  { name: "Croissants", category: "Bread & Bakery", estimatedPrice: 1.50, defaultSize: "4", defaultUnit: "pack" },
  { name: "Lentils (Puy)", category: "Rice, Pasta & Grains", estimatedPrice: 2.00, defaultSize: "500", defaultUnit: "g" },
  { name: "Shallots", category: "Fruits & Vegetables", estimatedPrice: 1.00, defaultSize: "250", defaultUnit: "g" },
  { name: "Leeks", category: "Fruits & Vegetables", estimatedPrice: 0.80, defaultSize: "3", defaultUnit: "pack" },
];

export const EASTERN_EUROPEAN: CuisineSeedItem[] = [
  { name: "Sour Cream", category: "Dairy & Eggs", estimatedPrice: 0.85, defaultSize: "300", defaultUnit: "ml" },
  { name: "Kielbasa Sausage", category: "Meat & Seafood", estimatedPrice: 3.50, defaultSize: "400", defaultUnit: "g" },
  { name: "Sauerkraut", category: "Tinned & Canned", estimatedPrice: 1.50, defaultSize: "680", defaultUnit: "g" },
  { name: "Beetroot (Cooked)", category: "Tinned & Canned", estimatedPrice: 0.80, defaultSize: "300", defaultUnit: "g" },
  { name: "Buckwheat", category: "Rice, Pasta & Grains", estimatedPrice: 2.00, defaultSize: "500", defaultUnit: "g" },
  { name: "Rye Bread", category: "Bread & Bakery", estimatedPrice: 2.00, defaultSize: "500", defaultUnit: "g" },
  { name: "Pierogi (Frozen)", category: "Frozen", estimatedPrice: 2.50, defaultSize: "500", defaultUnit: "g" },
  { name: "Horseradish Sauce", category: "Condiments & Sauces", estimatedPrice: 1.50, defaultSize: "185", defaultUnit: "g" },
  { name: "Paprika (Sweet)", category: "Spices & Seasonings", estimatedPrice: 1.20, defaultSize: "50", defaultUnit: "g" },
  { name: "Pickled Cucumbers", category: "Tinned & Canned", estimatedPrice: 1.50, defaultSize: "670", defaultUnit: "g" },
];

export const LATIN_AMERICAN: CuisineSeedItem[] = [
  { name: "Corn Tortillas", category: "Bread & Bakery", estimatedPrice: 1.50, defaultSize: "8", defaultUnit: "pack" },
  { name: "Flour Tortillas", category: "Bread & Bakery", estimatedPrice: 1.50, defaultSize: "8", defaultUnit: "pack" },
  { name: "Black Beans (Tinned)", category: "Tinned & Canned", estimatedPrice: 0.70, defaultSize: "400", defaultUnit: "g" },
  { name: "Refried Beans", category: "Tinned & Canned", estimatedPrice: 1.00, defaultSize: "400", defaultUnit: "g" },
  { name: "Chipotle Paste", category: "Condiments & Sauces", estimatedPrice: 2.00, defaultSize: "120", defaultUnit: "g" },
  { name: "Jalapeños (Pickled)", category: "Condiments & Sauces", estimatedPrice: 1.50, defaultSize: "200", defaultUnit: "g" },
  { name: "Smoked Paprika", category: "Spices & Seasonings", estimatedPrice: 1.50, defaultSize: "50", defaultUnit: "g" },
  { name: "Avocados", category: "Fruits & Vegetables", estimatedPrice: 1.50, defaultSize: "2", defaultUnit: "pack" },
  { name: "Limes", category: "Fruits & Vegetables", estimatedPrice: 0.50, defaultSize: "4", defaultUnit: "pack" },
  { name: "Sweetcorn (Tinned)", category: "Tinned & Canned", estimatedPrice: 0.60, defaultSize: "340", defaultUnit: "g" },
  { name: "Masa Harina", category: "World Foods", estimatedPrice: 3.00, defaultSize: "1", defaultUnit: "kg" },
  { name: "Tortilla Chips", category: "Snacks & Sweets", estimatedPrice: 1.50, defaultSize: "200", defaultUnit: "g" },
];
