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

    const prompt = `You are a household inventory expert. Generate a realistic stock starter list for a household.

USER PROFILE:
- Location: ${country}
- Cuisines they cook: ${cuisineList}

TASK: Generate exactly ${totalItems} household stock items in JSON format with this distribution:
1. ${localItems} local/universal staples common in ${country} — mostly groceries (milk, bread, eggs, butter, tea, flour, sugar, etc.) but also include common household supplies (toilet paper, bin bags, dish soap, laundry detergent, hand soap, toothpaste, batteries, light bulbs, etc.)
2. ${culturalItems} cultural food items split across these cuisines:
${cuisineBreakdown}

CATEGORIES (assign each item to one):
Dairy, Bakery, Produce, Meat, Pantry Staples, Spices & Seasonings, Condiments, Beverages, Snacks, Frozen, Canned Goods, Grains & Pasta, Oils & Vinegars, Baking, Ethnic Ingredients, Household, Personal Care, Health & Wellness, Baby & Kids, Pets, Electronics, Clothing, Garden & Outdoor, Office & Stationery

STOCK LEVELS (assign realistically):
- stocked: Items that last long and you'd have plenty (flour, rice, pasta, batteries)
- good: Items you likely have (milk, eggs, common spices, soap)
- low: Items that run out frequently (fresh produce, bread, toilet paper)
- out: Items you might not have yet (specialty ingredients, replacement bulbs)

Return ONLY valid JSON array:
[
  {"name": "Whole Milk", "category": "Dairy", "stockLevel": "good"},
  {"name": "White Bread", "category": "Bakery", "stockLevel": "low"},
  {"name": "Toilet Paper", "category": "Household", "stockLevel": "low"},
  ...
]

IMPORTANT:
- Use local product names (e.g., UK: "Heinz Baked Beans", US: "Kraft Mac & Cheese")
- Be culturally accurate (e.g., Nigerian: egusi, palm oil, fufu; Indian: ghee, turmeric, basmati)
- Include 10-15 non-food household essentials (cleaning supplies, toiletries, paper goods, etc.)
- No explanations, ONLY the JSON array
- Exactly ${totalItems} items`;

    try {
      const model = genAI.getGenerativeModel({
        model: "gemini-2.0-flash",
        generationConfig: {
          temperature: 0.8, // Some creativity for variety
          maxOutputTokens: 4000,
        },
      });

      const fullPrompt = `You are a household inventory expert who generates realistic stock lists covering groceries and household essentials. Always respond with valid JSON only.

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
        model: "gemini-2.0-flash",
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

/**
 * Parse receipt using Gemini Vision API
 * Extracts store name, date, items, prices, totals
 */
export const parseReceipt = action({
  args: {
    storageId: v.string(), // Convex file storage ID
  },
  handler: async (ctx, args) => {
    try {
      // Get the image URL from Convex storage
      const imageUrl = await ctx.storage.getUrl(args.storageId);

      if (!imageUrl) {
        throw new Error("Failed to get image URL");
      }

      // Fetch the image as base64 (web-standard, no Node Buffer)
      const response = await fetch(imageUrl);
      const arrayBuffer = await response.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);
      let binary = "";
      for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      const base64Image = btoa(binary);

      const model = genAI.getGenerativeModel({
        model: "gemini-2.0-flash",
      });

      const prompt = `You are a receipt parser. Extract as much data as possible from this receipt image, even if some parts are unclear.

Extract the following information (use your best judgment if unclear):
1. Store name (if unclear, use "Unknown Store")
2. Store address (if visible, otherwise omit)
3. Purchase date (in ISO format YYYY-MM-DD, or use today's date if unclear)
4. All items with:
   - Item name (be lenient with partial/blurry text)
   - Quantity (default to 1 if not shown)
   - Unit price (best estimate)
   - Total price for that item
5. Subtotal (if visible)
6. Tax amount (if visible)
7. Grand total (REQUIRED - extract this even if other fields are unclear)

Return ONLY valid JSON in this exact format:
{
  "storeName": "Store Name",
  "storeAddress": "123 Main St",
  "purchaseDate": "2026-01-29",
  "items": [
    {
      "name": "Milk",
      "quantity": 1,
      "unitPrice": 2.50,
      "totalPrice": 2.50
    }
  ],
  "subtotal": 10.00,
  "tax": 1.00,
  "total": 11.00
}

IMPORTANT RULES:
- DO extract data even if the receipt is blurry, wrinkled, or partially obscured
- DO make reasonable guesses for unclear text (e.g., "Mlk" → "Milk")
- DO extract at least the total amount - this is the most important field
- DO extract as many items as you can see, even if some text is unclear
- If an item name is completely illegible, use generic names like "Item 1", "Item 2"
- All prices should be numbers (not strings)
- Quantities should be integers
- Date must be in YYYY-MM-DD format
- Be lenient and helpful - users need their receipts parsed even if quality isn't perfect`;

      const result = await model.generateContent([
        { text: prompt },
        {
          inlineData: {
            mimeType: "image/jpeg",
            data: base64Image,
          },
        },
      ]);

      const responseText = result.response.text().trim();

      // Remove markdown code blocks if present
      let jsonText = responseText;
      if (jsonText.startsWith("```json")) {
        jsonText = jsonText.replace(/```json\n?/g, "").replace(/```\n?/g, "");
      } else if (jsonText.startsWith("```")) {
        jsonText = jsonText.replace(/```\n?/g, "");
      }

      const parsed = JSON.parse(jsonText);

      // Provide fallback values for missing fields
      const storeName = parsed.storeName || "Unknown Store";
      const items = Array.isArray(parsed.items) ? parsed.items : [];
      const total = typeof parsed.total === "number" ? parsed.total : 0;

      // If no items were parsed, try to create at least one generic item from the total
      if (items.length === 0 && total > 0) {
        items.push({
          name: "Receipt Items",
          quantity: 1,
          unitPrice: total,
          totalPrice: total,
          confidence: 50,
        });
      }

      // Calculate average confidence
      const avgConfidence =
        Object.values(parsed.confidence || {}).reduce(
          (sum: number, val: any) => sum + (typeof val === "number" ? val : 0),
          0
        ) / Math.max(Object.keys(parsed.confidence || {}).length, 1);

      return {
        storeName,
        storeAddress: parsed.storeAddress || "",
        purchaseDate: parsed.purchaseDate || new Date().toISOString().split("T")[0],
        items,
        subtotal: typeof parsed.subtotal === "number" ? parsed.subtotal : total,
        tax: typeof parsed.tax === "number" ? parsed.tax : 0,
        total,
        confidence: parsed.confidence || {},
        overallConfidence: avgConfidence || 50,
      };
    } catch (error) {
      console.error("Receipt parsing failed:", error);

      // Provide more specific error messages
      if (error instanceof SyntaxError) {
        throw new Error("Failed to read receipt format. Please try again with a clearer image.");
      }

      throw new Error(
        error instanceof Error
          ? error.message
          : "Failed to parse receipt. Please try taking the photo again."
      );
    }
  },
});

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

    // Household (8)
    { name: "Toilet Paper", category: "Household", stockLevel: "low" },
    { name: "Kitchen Roll", category: "Household", stockLevel: "low" },
    { name: "Bin Bags", category: "Household", stockLevel: "good" },
    { name: "Dish Soap", category: "Household", stockLevel: "good" },
    { name: "Laundry Detergent", category: "Household", stockLevel: "good" },
    { name: "All-Purpose Cleaner", category: "Household", stockLevel: "good" },
    { name: "Sponges", category: "Household", stockLevel: "low" },
    { name: "Aluminium Foil", category: "Household", stockLevel: "good" },

    // Personal Care (5)
    { name: "Hand Soap", category: "Personal Care", stockLevel: "good" },
    { name: "Toothpaste", category: "Personal Care", stockLevel: "good" },
    { name: "Shampoo", category: "Personal Care", stockLevel: "good" },
    { name: "Deodorant", category: "Personal Care", stockLevel: "low" },
    { name: "Body Wash", category: "Personal Care", stockLevel: "good" },
  ];

  return basicItems;
}
