import { action } from "./_generated/server";
import { v } from "convex/values";
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export interface SeedItem {
  name: string;
  category: string;
  stockLevel: "stocked" | "good" | "low" | "out";
}

/**
 * Generate hybrid pantry seed items using AI
 *
 * Generates 200 items:
 * - 60% local/universal staples (based on country)
 * - 40% cultural items (split evenly across selected cuisines)
 */
export const generateHybridSeedItems = action({
  args: {
    country: v.string(),
    cuisines: v.array(v.string()),
  },
  handler: async (ctx, args): Promise<SeedItem[]> => {
    const { country, cuisines } = args;

    // Calculate item distribution
    const totalItems = 200;
    const localItems = Math.floor(totalItems * 0.6); // 120 items
    const culturalItems = totalItems - localItems; // 80 items
    const itemsPerCuisine = Math.floor(culturalItems / cuisines.length);

    const cuisineList = cuisines.join(", ");
    const cuisineBreakdown = cuisines.map((c, i) => `   - ${itemsPerCuisine} items for ${c} cuisine`).join("\n");

    const prompt = `You are a grocery inventory expert. Generate a realistic pantry starter list for a home cook.

USER PROFILE:
- Location: ${country}
- Cuisines they cook: ${cuisineList}

TASK: Generate exactly ${totalItems} pantry items in JSON format with this distribution:
1. ${localItems} local/universal staples common in ${country} (milk, bread, eggs, butter, tea, flour, sugar, etc.)
2. ${culturalItems} cultural items split across these cuisines:
${cuisineBreakdown}

CATEGORIES (assign each item to one):
Dairy, Bakery, Produce, Meat, Pantry Staples, Spices & Seasonings, Condiments, Beverages, Snacks, Frozen, Canned Goods, Grains & Pasta, Oils & Vinegars, Baking, Ethnic Ingredients

STOCK LEVELS (assign realistically):
- stocked: Items that last long and you'd have plenty (flour, rice, pasta)
- good: Items you likely have (milk, eggs, common spices)
- low: Items that run out frequently (fresh produce, bread)
- out: Items you might not have yet (specialty ingredients)

Return ONLY valid JSON array:
[
  {"name": "Whole Milk", "category": "Dairy", "stockLevel": "good"},
  {"name": "White Bread", "category": "Bakery", "stockLevel": "low"},
  ...
]

IMPORTANT:
- Use local product names (e.g., UK: "Heinz Baked Beans", US: "Kraft Mac & Cheese")
- Be culturally accurate (e.g., Nigerian: egusi, palm oil, fufu; Indian: ghee, turmeric, basmati)
- No explanations, ONLY the JSON array
- Exactly ${totalItems} items`;

    try {
      const model = genAI.getGenerativeModel({
        model: "gemini-1.5-flash",
        generationConfig: {
          temperature: 0.8, // Some creativity for variety
          maxOutputTokens: 4000,
        },
      });

      const fullPrompt = `You are a grocery inventory expert who generates realistic pantry lists. Always respond with valid JSON only.

${prompt}`;

      const result = await model.generateContent(fullPrompt);
      const response = await result.response;
      const responseText = response.text().trim();

      if (!responseText) {
        throw new Error("No response from AI");
      }

      // Parse JSON response
      const items: SeedItem[] = JSON.parse(responseText);

      // Validate response
      if (!Array.isArray(items) || items.length === 0) {
        throw new Error("Invalid response format");
      }

      // Ensure we have exactly 200 items (or close to it)
      const validItems = items
        .filter((item) =>
          item.name &&
          item.category &&
          ["stocked", "good", "low", "out"].includes(item.stockLevel)
        )
        .slice(0, totalItems); // Take first 200

      if (validItems.length < 50) {
        throw new Error("Not enough valid items generated");
      }

      return validItems;
    } catch (error) {
      console.error("AI generation failed:", error);

      // Return fallback items if AI fails
      return getFallbackItems(country, cuisines);
    }
  },
});

/**
 * Fallback items if AI generation fails
 * Returns a basic set of 50 common items
 */
/**
 * Generate smart shopping suggestions based on current list items
 * Uses AI to suggest commonly paired ingredients
 */
export const generateListSuggestions = action({
  args: {
    currentItems: v.array(v.string()),
    excludeItems: v.array(v.string()), // Items already in list or dismissed
  },
  handler: async (ctx, args): Promise<string[]> => {
    const { currentItems, excludeItems } = args;

    if (currentItems.length === 0) {
      return [];
    }

    const itemList = currentItems.join(", ");
    const excludeList = excludeItems.length > 0
      ? `\n\nDO NOT suggest these items (already in list or dismissed): ${excludeItems.join(", ")}`
      : "";

    const prompt = `You are a helpful shopping assistant. Based on these items in a shopping list:
${itemList}

Suggest 5 additional items that are commonly purchased together or complement these items.
${excludeList}

Rules:
- Only suggest common grocery items
- Consider meal planning (e.g., pasta → garlic, parmesan, olive oil)
- Consider complementary items (e.g., bread → butter, jam)
- Be practical and culturally neutral

Return ONLY a JSON array of item names, nothing else:
["item1", "item2", "item3", "item4", "item5"]`;

    try {
      const model = genAI.getGenerativeModel({
        model: "gemini-1.5-flash",
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 200,
        },
      });

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const responseText = response.text().trim();

      if (!responseText) {
        return getFallbackSuggestions(currentItems);
      }

      // Parse JSON response
      const suggestions: string[] = JSON.parse(responseText);

      if (!Array.isArray(suggestions)) {
        return getFallbackSuggestions(currentItems);
      }

      // Filter out excluded items and limit to 5
      return suggestions
        .filter((item) => !excludeItems.some(
          (excluded) => excluded.toLowerCase() === item.toLowerCase()
        ))
        .slice(0, 5);
    } catch (error) {
      console.error("AI suggestion generation failed:", error);
      return getFallbackSuggestions(currentItems);
    }
  },
});

/**
 * Fallback suggestions based on common pairings
 */
function getFallbackSuggestions(currentItems: string[]): string[] {
  const commonPairings: Record<string, string[]> = {
    pasta: ["garlic", "parmesan", "olive oil", "tomatoes", "basil"],
    bread: ["butter", "jam", "eggs", "milk", "cheese"],
    chicken: ["garlic", "lemon", "herbs", "onion", "rice"],
    rice: ["soy sauce", "vegetables", "chicken", "eggs", "onion"],
    eggs: ["bacon", "bread", "butter", "cheese", "milk"],
    milk: ["cereal", "coffee", "tea", "sugar", "eggs"],
    tomatoes: ["onion", "garlic", "basil", "mozzarella", "olive oil"],
    onion: ["garlic", "tomatoes", "peppers", "carrots", "celery"],
    garlic: ["onion", "olive oil", "herbs", "lemon", "ginger"],
  };

  const suggestions = new Set<string>();

  for (const item of currentItems) {
    const itemLower = item.toLowerCase();
    for (const [key, values] of Object.entries(commonPairings)) {
      if (itemLower.includes(key)) {
        values.forEach((v) => suggestions.add(v));
      }
    }
  }

  // Remove items already in list
  const currentLower = currentItems.map((i) => i.toLowerCase());
  const filtered = Array.from(suggestions).filter(
    (s) => !currentLower.some((c) => c.includes(s) || s.includes(c))
  );

  return filtered.slice(0, 5);
}

function getFallbackItems(country: string, cuisines: string[]): SeedItem[] {
  const basicItems: SeedItem[] = [
    // Dairy (10)
    { name: "Whole Milk", category: "Dairy", stockLevel: "good" },
    { name: "Butter", category: "Dairy", stockLevel: "good" },
    { name: "Eggs", category: "Dairy", stockLevel: "good" },
    { name: "Cheddar Cheese", category: "Dairy", stockLevel: "stocked" },
    { name: "Plain Yogurt", category: "Dairy", stockLevel: "low" },
    { name: "Cream", category: "Dairy", stockLevel: "out" },
    { name: "Parmesan Cheese", category: "Dairy", stockLevel: "stocked" },
    { name: "Mozzarella Cheese", category: "Dairy", stockLevel: "out" },
    { name: "Sour Cream", category: "Dairy", stockLevel: "out" },
    { name: "Greek Yogurt", category: "Dairy", stockLevel: "low" },

    // Bakery (5)
    { name: "White Bread", category: "Bakery", stockLevel: "low" },
    { name: "Whole Wheat Bread", category: "Bakery", stockLevel: "low" },
    { name: "Bagels", category: "Bakery", stockLevel: "out" },
    { name: "Tortillas", category: "Bakery", stockLevel: "out" },
    { name: "Pita Bread", category: "Bakery", stockLevel: "out" },

    // Pantry Staples (15)
    { name: "All-Purpose Flour", category: "Pantry Staples", stockLevel: "stocked" },
    { name: "White Sugar", category: "Pantry Staples", stockLevel: "stocked" },
    { name: "Brown Sugar", category: "Pantry Staples", stockLevel: "good" },
    { name: "Salt", category: "Pantry Staples", stockLevel: "stocked" },
    { name: "Black Pepper", category: "Pantry Staples", stockLevel: "stocked" },
    { name: "White Rice", category: "Pantry Staples", stockLevel: "stocked" },
    { name: "Pasta", category: "Pantry Staples", stockLevel: "stocked" },
    { name: "Spaghetti", category: "Pantry Staples", stockLevel: "good" },
    { name: "Oats", category: "Pantry Staples", stockLevel: "stocked" },
    { name: "Baking Powder", category: "Pantry Staples", stockLevel: "good" },
    { name: "Baking Soda", category: "Pantry Staples", stockLevel: "good" },
    { name: "Honey", category: "Pantry Staples", stockLevel: "stocked" },
    { name: "Cornstarch", category: "Pantry Staples", stockLevel: "good" },
    { name: "Vanilla Extract", category: "Pantry Staples", stockLevel: "good" },
    { name: "Cocoa Powder", category: "Pantry Staples", stockLevel: "stocked" },

    // Oils & Condiments (10)
    { name: "Olive Oil", category: "Oils & Vinegars", stockLevel: "stocked" },
    { name: "Vegetable Oil", category: "Oils & Vinegars", stockLevel: "stocked" },
    { name: "Vinegar", category: "Oils & Vinegars", stockLevel: "stocked" },
    { name: "Soy Sauce", category: "Condiments", stockLevel: "stocked" },
    { name: "Ketchup", category: "Condiments", stockLevel: "good" },
    { name: "Mustard", category: "Condiments", stockLevel: "good" },
    { name: "Mayonnaise", category: "Condiments", stockLevel: "good" },
    { name: "Hot Sauce", category: "Condiments", stockLevel: "out" },
    { name: "Worcestershire Sauce", category: "Condiments", stockLevel: "out" },
    { name: "Balsamic Vinegar", category: "Oils & Vinegars", stockLevel: "good" },

    // Canned/Jarred (10)
    { name: "Canned Tomatoes", category: "Canned Goods", stockLevel: "stocked" },
    { name: "Tomato Paste", category: "Canned Goods", stockLevel: "good" },
    { name: "Chicken Broth", category: "Canned Goods", stockLevel: "stocked" },
    { name: "Vegetable Broth", category: "Canned Goods", stockLevel: "good" },
    { name: "Canned Beans", category: "Canned Goods", stockLevel: "stocked" },
    { name: "Chickpeas", category: "Canned Goods", stockLevel: "good" },
    { name: "Tuna", category: "Canned Goods", stockLevel: "out" },
    { name: "Coconut Milk", category: "Canned Goods", stockLevel: "out" },
    { name: "Peanut Butter", category: "Pantry Staples", stockLevel: "good" },
    { name: "Jam", category: "Condiments", stockLevel: "good" },
  ];

  return basicItems;
}
