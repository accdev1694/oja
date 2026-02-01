import { action } from "./_generated/server";
import { v } from "convex/values";
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export interface SeedItem {
  name: string;
  category: string;
  stockLevel: "stocked" | "low" | "out";
  estimatedPrice?: number;    // Realistic UK grocery price in GBP
  hasVariants?: boolean;      // true if item has meaningful size variants (milk, rice, eggs)
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

STOCK LEVELS (assign realistically — only 3 levels):
- stocked: Items you have plenty of (flour, rice, pasta, batteries, milk, eggs, common spices)
- low: Items running low or that run out frequently (fresh produce, bread, toilet paper)
- out: Items you've run out of or might not have (specialty ingredients, replacement bulbs)

Return ONLY valid JSON array:
[
  {"name": "Whole Milk", "category": "Dairy", "stockLevel": "stocked", "estimatedPrice": 1.15, "hasVariants": true},
  {"name": "White Bread", "category": "Bakery", "stockLevel": "low", "estimatedPrice": 1.10, "hasVariants": false},
  {"name": "Toilet Paper", "category": "Household", "stockLevel": "low", "estimatedPrice": 3.50, "hasVariants": true},
  ...
]

IMPORTANT:
- Use local product names (e.g., UK: "Heinz Baked Beans", US: "Kraft Mac & Cheese")
- Be culturally accurate (e.g., Nigerian: egusi, palm oil, fufu; Indian: ghee, turmeric, basmati)
- Include 10-15 non-food household essentials (cleaning supplies, toiletries, paper goods, etc.)
- Include a realistic current grocery estimated price in GBP for each item (the most common size/variant price)
- Set hasVariants to true for items where size materially affects price (e.g., milk, rice, eggs, cooking oil, laundry detergent, shampoo) and false for standard-size items (e.g., bananas, butter, tinned beans, single spice jars)
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
          ["stocked", "low", "out"].includes(item.stockLevel)
        )
        .map((item) => ({
          ...item,
          estimatedPrice: typeof item.estimatedPrice === "number" ? item.estimatedPrice : undefined,
          hasVariants: typeof item.hasVariants === "boolean" ? item.hasVariants : undefined,
        }))
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

      const prompt = `You are a receipt parser for a UK grocery shopping app. Extract as much data as possible from this receipt image, even if some parts are unclear.

Extract the following information (use your best judgment if unclear):
1. Store name (if unclear, use "Unknown Store")
2. Store address (if visible, otherwise omit)
3. Purchase date (in ISO format YYYY-MM-DD, or use today's date if unclear)
4. All items with:
   - Item name: Clean, readable product name. Expand obvious abbreviations (e.g., "TS WHL MLK 2PT" → "Whole Milk 2 Pints", "BRIT S/MILK" → "British Semi-Skimmed Milk")
   - Size: Product size/weight if visible on the receipt line (e.g., "2L", "500g", "4 pack", "2 pints"). Use null if not on receipt — do NOT guess.
   - Unit: Unit of measurement if determinable from size (e.g., "L", "g", "pack", "pint"). Use null if size is null.
   - Quantity: Number of units purchased (default to 1). Handle "2 x £2.19" as quantity: 2.
   - Unit price (price per single unit)
   - Total price for that line item
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
      "name": "Whole Milk 2 Pints",
      "size": "2 pints",
      "unit": "pint",
      "quantity": 1,
      "unitPrice": 1.15,
      "totalPrice": 1.15
    },
    {
      "name": "Bananas",
      "size": null,
      "unit": null,
      "quantity": 1,
      "unitPrice": 0.75,
      "totalPrice": 0.75
    }
  ],
  "subtotal": 10.00,
  "tax": 1.00,
  "total": 11.00
}

IMPORTANT RULES:
- DO extract data even if the receipt is blurry, wrinkled, or partially obscured
- DO expand abbreviations to clean readable names (e.g., "Mlk" → "Milk", "ORG BNS" → "Organic Bananas")
- DO extract size from the item description when it's printed on the receipt
- DO NOT guess sizes — if the receipt just says "MILK" with no size, set size and unit to null
- DO extract at least the total amount - this is the most important field
- DO extract as many items as you can see, even if some text is unclear
- If an item name is completely illegible, use generic names like "Item 1", "Item 2"
- All prices should be numbers (not strings)
- Quantities should be integers
- Date must be in YYYY-MM-DD format
- Ignore: loyalty discounts, bag charges, VAT codes (A/B/D), SKU numbers, promotional lines ("Price Crunch", "50p off")
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
          size: null,
          unit: null,
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

/**
 * Generate size variants for items flagged as hasVariants during onboarding.
 * Called after pantry seeding to populate the itemVariants table.
 * Returns variant data for bulk insert via itemVariants.bulkUpsert.
 */
export const generateItemVariants = action({
  args: {
    items: v.array(
      v.object({
        name: v.string(),
        category: v.string(),
      })
    ),
  },
  handler: async (ctx, args) => {
    if (args.items.length === 0) return [];

    const itemList = args.items
      .map((i) => `- ${i.name} (${i.category})`)
      .join("\n");

    const prompt = `You are a UK grocery expert. For each item below, generate the 3-5 most common size variants that shoppers would find in UK supermarkets (Tesco, Sainsbury's, Asda, Aldi, Lidl, Morrisons).

Items:
${itemList}

For each item, return variants with realistic current GBP prices (the standard/common size price).

Return ONLY valid JSON array:
[
  {
    "baseItem": "whole milk",
    "variantName": "Whole Milk 1 Pint",
    "size": "1 pint",
    "unit": "pint",
    "category": "Dairy",
    "estimatedPrice": 0.65
  },
  {
    "baseItem": "whole milk",
    "variantName": "Whole Milk 2 Pints",
    "size": "2 pints",
    "unit": "pint",
    "category": "Dairy",
    "estimatedPrice": 1.15
  },
  {
    "baseItem": "whole milk",
    "variantName": "Whole Milk 4 Pints",
    "size": "4 pints",
    "unit": "pint",
    "category": "Dairy",
    "estimatedPrice": 1.55
  }
]

RULES:
- baseItem must be lowercase
- Include only sizes commonly available in UK supermarkets
- Prices should be realistic current UK supermarket prices
- For items like eggs: use 6-pack, 10-pack, 15-pack (not litres)
- For rice/pasta: use 500g, 1kg, 2kg
- For liquids: use pints or litres as commonly sold
- For household items like toilet paper: use roll counts (4-pack, 9-pack, etc.)
- No explanations, ONLY the JSON array`;

    try {
      const model = genAI.getGenerativeModel({
        model: "gemini-2.0-flash",
        generationConfig: {
          temperature: 0.5,
          maxOutputTokens: 4000,
        },
      });

      const result = await model.generateContent(prompt);
      const response = await result.response;
      let responseText = response.text().trim();

      // Remove markdown code blocks
      if (responseText.startsWith("```json")) {
        responseText = responseText.replace(/```json\n?/g, "").replace(/```\n?/g, "");
      } else if (responseText.startsWith("```")) {
        responseText = responseText.replace(/```\n?/g, "");
      }

      const variants = JSON.parse(responseText);

      if (!Array.isArray(variants)) {
        console.error("Invalid variants response format");
        return [];
      }

      // Validate and normalize
      return variants
        .filter(
          (v: any) =>
            v.baseItem &&
            v.variantName &&
            v.size &&
            v.unit &&
            v.category
        )
        .map((v: any) => ({
          baseItem: v.baseItem.toLowerCase().trim(),
          variantName: v.variantName,
          size: v.size,
          unit: v.unit,
          category: v.category,
          source: "ai_seeded" as const,
          estimatedPrice: typeof v.estimatedPrice === "number" ? v.estimatedPrice : undefined,
        }));
    } catch (error) {
      console.error("Variant generation failed:", error);
      return [];
    }
  },
});

function getFallbackItems(country: string, cuisines: string[]): SeedItem[] {
  const basicItems: SeedItem[] = [
    // Dairy (10)
    { name: "Whole Milk", category: "Dairy", stockLevel: "stocked", estimatedPrice: 1.15, hasVariants: true },
    { name: "Butter", category: "Dairy", stockLevel: "stocked", estimatedPrice: 1.85, hasVariants: false },
    { name: "Eggs", category: "Dairy", stockLevel: "stocked", estimatedPrice: 2.10, hasVariants: true },
    { name: "Cheddar Cheese", category: "Dairy", stockLevel: "stocked", estimatedPrice: 2.50, hasVariants: true },
    { name: "Plain Yogurt", category: "Dairy", stockLevel: "low", estimatedPrice: 0.80, hasVariants: true },
    { name: "Cream", category: "Dairy", stockLevel: "out", estimatedPrice: 1.00, hasVariants: true },
    { name: "Parmesan Cheese", category: "Dairy", stockLevel: "stocked", estimatedPrice: 2.80, hasVariants: false },
    { name: "Mozzarella Cheese", category: "Dairy", stockLevel: "out", estimatedPrice: 1.50, hasVariants: false },
    { name: "Sour Cream", category: "Dairy", stockLevel: "out", estimatedPrice: 0.90, hasVariants: false },
    { name: "Greek Yogurt", category: "Dairy", stockLevel: "low", estimatedPrice: 1.50, hasVariants: true },

    // Bakery (5)
    { name: "White Bread", category: "Bakery", stockLevel: "low", estimatedPrice: 1.10, hasVariants: false },
    { name: "Whole Wheat Bread", category: "Bakery", stockLevel: "low", estimatedPrice: 1.30, hasVariants: false },
    { name: "Bagels", category: "Bakery", stockLevel: "out", estimatedPrice: 1.50, hasVariants: false },
    { name: "Tortillas", category: "Bakery", stockLevel: "out", estimatedPrice: 1.20, hasVariants: false },
    { name: "Pita Bread", category: "Bakery", stockLevel: "out", estimatedPrice: 0.85, hasVariants: false },

    // Pantry Staples (15)
    { name: "All-Purpose Flour", category: "Pantry Staples", stockLevel: "stocked", estimatedPrice: 0.85, hasVariants: true },
    { name: "White Sugar", category: "Pantry Staples", stockLevel: "stocked", estimatedPrice: 0.75, hasVariants: true },
    { name: "Brown Sugar", category: "Pantry Staples", stockLevel: "stocked", estimatedPrice: 1.00, hasVariants: false },
    { name: "Salt", category: "Pantry Staples", stockLevel: "stocked", estimatedPrice: 0.65, hasVariants: false },
    { name: "Black Pepper", category: "Pantry Staples", stockLevel: "stocked", estimatedPrice: 1.20, hasVariants: false },
    { name: "White Rice", category: "Pantry Staples", stockLevel: "stocked", estimatedPrice: 1.50, hasVariants: true },
    { name: "Pasta", category: "Pantry Staples", stockLevel: "stocked", estimatedPrice: 0.70, hasVariants: true },
    { name: "Spaghetti", category: "Pantry Staples", stockLevel: "stocked", estimatedPrice: 0.70, hasVariants: false },
    { name: "Oats", category: "Pantry Staples", stockLevel: "stocked", estimatedPrice: 1.20, hasVariants: true },
    { name: "Baking Powder", category: "Pantry Staples", stockLevel: "stocked", estimatedPrice: 1.10, hasVariants: false },
    { name: "Baking Soda", category: "Pantry Staples", stockLevel: "stocked", estimatedPrice: 0.65, hasVariants: false },
    { name: "Honey", category: "Pantry Staples", stockLevel: "stocked", estimatedPrice: 2.50, hasVariants: true },
    { name: "Cornstarch", category: "Pantry Staples", stockLevel: "stocked", estimatedPrice: 0.80, hasVariants: false },
    { name: "Vanilla Extract", category: "Pantry Staples", stockLevel: "stocked", estimatedPrice: 2.00, hasVariants: false },
    { name: "Cocoa Powder", category: "Pantry Staples", stockLevel: "stocked", estimatedPrice: 1.50, hasVariants: false },

    // Oils & Condiments (10)
    { name: "Olive Oil", category: "Oils & Vinegars", stockLevel: "stocked", estimatedPrice: 3.50, hasVariants: true },
    { name: "Vegetable Oil", category: "Oils & Vinegars", stockLevel: "stocked", estimatedPrice: 1.80, hasVariants: true },
    { name: "Vinegar", category: "Oils & Vinegars", stockLevel: "stocked", estimatedPrice: 0.75, hasVariants: false },
    { name: "Soy Sauce", category: "Condiments", stockLevel: "stocked", estimatedPrice: 1.50, hasVariants: false },
    { name: "Ketchup", category: "Condiments", stockLevel: "stocked", estimatedPrice: 1.50, hasVariants: false },
    { name: "Mustard", category: "Condiments", stockLevel: "stocked", estimatedPrice: 1.00, hasVariants: false },
    { name: "Mayonnaise", category: "Condiments", stockLevel: "stocked", estimatedPrice: 1.80, hasVariants: false },
    { name: "Hot Sauce", category: "Condiments", stockLevel: "out", estimatedPrice: 1.50, hasVariants: false },
    { name: "Worcestershire Sauce", category: "Condiments", stockLevel: "out", estimatedPrice: 1.50, hasVariants: false },
    { name: "Balsamic Vinegar", category: "Oils & Vinegars", stockLevel: "stocked", estimatedPrice: 2.00, hasVariants: false },

    // Canned/Jarred (10)
    { name: "Canned Tomatoes", category: "Canned Goods", stockLevel: "stocked", estimatedPrice: 0.55, hasVariants: false },
    { name: "Tomato Paste", category: "Canned Goods", stockLevel: "stocked", estimatedPrice: 0.60, hasVariants: false },
    { name: "Chicken Broth", category: "Canned Goods", stockLevel: "stocked", estimatedPrice: 1.00, hasVariants: false },
    { name: "Vegetable Broth", category: "Canned Goods", stockLevel: "stocked", estimatedPrice: 1.00, hasVariants: false },
    { name: "Canned Beans", category: "Canned Goods", stockLevel: "stocked", estimatedPrice: 0.50, hasVariants: false },
    { name: "Chickpeas", category: "Canned Goods", stockLevel: "stocked", estimatedPrice: 0.55, hasVariants: false },
    { name: "Tuna", category: "Canned Goods", stockLevel: "out", estimatedPrice: 1.00, hasVariants: false },
    { name: "Coconut Milk", category: "Canned Goods", stockLevel: "out", estimatedPrice: 1.20, hasVariants: false },
    { name: "Peanut Butter", category: "Pantry Staples", stockLevel: "stocked", estimatedPrice: 1.80, hasVariants: true },
    { name: "Jam", category: "Condiments", stockLevel: "stocked", estimatedPrice: 1.50, hasVariants: false },

    // Household (8)
    { name: "Toilet Paper", category: "Household", stockLevel: "low", estimatedPrice: 3.50, hasVariants: true },
    { name: "Kitchen Roll", category: "Household", stockLevel: "low", estimatedPrice: 2.50, hasVariants: true },
    { name: "Bin Bags", category: "Household", stockLevel: "stocked", estimatedPrice: 1.50, hasVariants: true },
    { name: "Dish Soap", category: "Household", stockLevel: "stocked", estimatedPrice: 1.00, hasVariants: false },
    { name: "Laundry Detergent", category: "Household", stockLevel: "stocked", estimatedPrice: 4.50, hasVariants: true },
    { name: "All-Purpose Cleaner", category: "Household", stockLevel: "stocked", estimatedPrice: 1.50, hasVariants: false },
    { name: "Sponges", category: "Household", stockLevel: "low", estimatedPrice: 1.00, hasVariants: false },
    { name: "Aluminium Foil", category: "Household", stockLevel: "stocked", estimatedPrice: 1.50, hasVariants: false },

    // Personal Care (5)
    { name: "Hand Soap", category: "Personal Care", stockLevel: "stocked", estimatedPrice: 1.00, hasVariants: false },
    { name: "Toothpaste", category: "Personal Care", stockLevel: "stocked", estimatedPrice: 1.50, hasVariants: false },
    { name: "Shampoo", category: "Personal Care", stockLevel: "stocked", estimatedPrice: 2.50, hasVariants: true },
    { name: "Deodorant", category: "Personal Care", stockLevel: "low", estimatedPrice: 2.00, hasVariants: false },
    { name: "Body Wash", category: "Personal Care", stockLevel: "stocked", estimatedPrice: 2.00, hasVariants: false },
  ];

  return basicItems;
}
