import { action } from "./_generated/server";
import { api } from "./_generated/api";
import { v } from "convex/values";
import { GoogleGenerativeAI } from "@google/generative-ai";
import OpenAI from "openai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || "" });

/**
 * AI fallback wrapper: tries primary (Gemini) first, falls back to secondary (OpenAI).
 * Both providers fail → throws the fallback error.
 */
async function withAIFallback<T>(
  primary: () => Promise<T>,
  fallback: () => Promise<T>,
  operationName: string
): Promise<T> {
  try {
    return await primary();
  } catch (primaryError) {
    console.warn(`[${operationName}] Primary AI (Gemini) failed, trying fallback (OpenAI):`, primaryError);
    try {
      return await fallback();
    } catch (fallbackError) {
      console.error(`[${operationName}] Both AI providers failed:`, { primaryError, fallbackError });
      throw fallbackError;
    }
  }
}

/**
 * Run a prompt through OpenAI GPT-4o-mini and return the text response.
 * Used as fallback when Gemini is unavailable.
 */
async function openaiGenerate(prompt: string, options?: { temperature?: number; maxTokens?: number }): Promise<string> {
  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: prompt }],
    temperature: options?.temperature ?? 0.7,
    max_tokens: options?.maxTokens ?? 4000,
  });
  return completion.choices[0]?.message?.content?.trim() || "";
}

/**
 * Run a prompt through Gemini and return the text response.
 */
async function geminiGenerate(prompt: string, options?: { temperature?: number; maxTokens?: number }): Promise<string> {
  const model = genAI.getGenerativeModel({
    model: "gemini-2.0-flash",
    generationConfig: {
      temperature: options?.temperature ?? 0.7,
      maxOutputTokens: options?.maxTokens ?? 4000,
    },
  });
  const result = await model.generateContent(prompt);
  const response = await result.response;
  return response.text().trim();
}

/** Strip markdown code blocks from AI response */
function stripCodeBlocks(text: string): string {
  if (text.startsWith("```json")) {
    return text.replace(/```json\n?/g, "").replace(/```\n?/g, "");
  }
  if (text.startsWith("```")) {
    return text.replace(/```\n?/g, "");
  }
  return text;
}

export interface SeedItem {
  name: string;
  category: string;
  stockLevel: "stocked" | "low" | "out";
  source?: "local" | "cultural";  // Whether item is a local staple or cultural ingredient
  estimatedPrice?: number;    // Realistic UK grocery price in GBP
  hasVariants?: boolean;      // true if item has meaningful size variants (milk, rice, eggs)
  defaultSize?: string;       // For hasVariants=false: "250g", "400g tin", "per item"
  defaultUnit?: string;       // For hasVariants=false: "g", "tin", "each"
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
  {"name": "Whole Milk", "category": "Dairy", "stockLevel": "stocked", "source": "local", "estimatedPrice": 1.15, "hasVariants": true},
  {"name": "White Bread", "category": "Bakery", "stockLevel": "low", "source": "local", "estimatedPrice": 1.10, "hasVariants": false, "defaultSize": "800g loaf", "defaultUnit": "loaf"},
  {"name": "Egusi Seeds", "category": "Ethnic Ingredients", "stockLevel": "stocked", "source": "cultural", "estimatedPrice": 3.50, "hasVariants": true},
  {"name": "Butter", "category": "Dairy", "stockLevel": "stocked", "source": "local", "estimatedPrice": 1.85, "hasVariants": false, "defaultSize": "250g", "defaultUnit": "g"},
  ...
]

IMPORTANT:
- Use local product names (e.g., UK: "Heinz Baked Beans", US: "Kraft Mac & Cheese")
- Be culturally accurate (e.g., Nigerian: egusi, palm oil, fufu; Indian: ghee, turmeric, basmati)
- Include 10-15 non-food household essentials (cleaning supplies, toiletries, paper goods, etc.)
- Include a realistic current grocery estimated price in GBP for each item (the most common size/variant price)
- Set hasVariants to true for items where size materially affects price (e.g., milk, rice, eggs, cooking oil, laundry detergent, shampoo) and false for standard-size items (e.g., bananas, butter, tinned beans, single spice jars)
- For items where hasVariants is false, include defaultSize (e.g., "250g", "400g tin", "per item", "bunch") and defaultUnit (e.g., "g", "tin", "each"). Every non-variant item must have defaultSize and defaultUnit.
- Every item MUST have "source": "local" (for universal staples) or "source": "cultural" (for cuisine-specific items)
- No explanations, ONLY the JSON array
- Exactly ${totalItems} items`;

    const fullPrompt = `You are a household inventory expert who generates realistic stock lists covering groceries and household essentials. Always respond with valid JSON only.

${prompt}`;

    function parseSeedResponse(responseText: string): SeedItem[] {
      if (!responseText) throw new Error("No response from AI");
      const cleaned = stripCodeBlocks(responseText);
      const items: SeedItem[] = JSON.parse(cleaned);
      if (!Array.isArray(items) || items.length === 0) throw new Error("Invalid response format");

      // Deduplicate by normalized name (case-insensitive)
      const seen = new Set<string>();
      const validItems = items
        .filter((item) =>
          item.name &&
          item.category &&
          ["stocked", "low", "out"].includes(item.stockLevel)
        )
        .filter((item) => {
          const key = item.name.toLowerCase().trim();
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        })
        .map((item) => ({
          ...item,
          source: item.source === "cultural" ? "cultural" as const : "local" as const,
          estimatedPrice: typeof item.estimatedPrice === "number" ? item.estimatedPrice : undefined,
          hasVariants: typeof item.hasVariants === "boolean" ? item.hasVariants : undefined,
          defaultSize: typeof item.defaultSize === "string" ? item.defaultSize : undefined,
          defaultUnit: typeof item.defaultUnit === "string" ? item.defaultUnit : undefined,
        }))
        .slice(0, totalItems);

      if (validItems.length < 50) throw new Error("Not enough valid items generated");
      return validItems;
    }

    try {
      return await withAIFallback(
        async () => parseSeedResponse(await geminiGenerate(fullPrompt, { temperature: 0.8 })),
        async () => parseSeedResponse(await openaiGenerate(fullPrompt, { temperature: 0.8 })),
        "generateHybridSeedItems"
      );
    } catch (error) {
      console.error("AI generation failed:", error);
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

    function parseSuggestions(text: string): string[] {
      if (!text) throw new Error("Empty response");
      const cleaned = stripCodeBlocks(text);
      const suggestions: string[] = JSON.parse(cleaned);
      if (!Array.isArray(suggestions)) throw new Error("Not an array");
      return suggestions
        .filter((item) => !excludeItems.some(
          (excluded) => excluded.toLowerCase() === item.toLowerCase()
        ))
        .slice(0, 5);
    }

    try {
      return await withAIFallback(
        async () => parseSuggestions(await geminiGenerate(prompt, { maxTokens: 200 })),
        async () => parseSuggestions(await openaiGenerate(prompt, { maxTokens: 200 })),
        "generateListSuggestions"
      );
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

      // Fetch the image as base64 (chunked to avoid OOM on large images)
      const response = await fetch(imageUrl);
      const arrayBuffer = await response.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);
      const CHUNK = 8192;
      const chunks: string[] = [];
      for (let i = 0; i < bytes.byteLength; i += CHUNK) {
        const slice = bytes.subarray(i, Math.min(i + CHUNK, bytes.byteLength));
        chunks.push(String.fromCharCode(...slice));
      }
      const base64Image = btoa(chunks.join(""));

      const receiptPrompt = `You are a receipt parser for a UK grocery shopping app. Extract as much data as possible from this receipt image, even if some parts are unclear.

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
- EXCLUDE non-product lines: "Balance Due", "Amount Tendered", "Change", "Cash", "Card Payment", "Subtotal", "Total", "Charity Donation", "Carrier Bag", "Price Cut", "Savings", "Clubcard", "Nectar", "Meal Deal Saving"
- EXCLUDE refund/return lines with negative prices or negative quantities — these are not purchased products
- Only include actual product items that the customer bought and took home
- Be lenient and helpful - users need their receipts parsed even if quality isn't perfect`;

      async function geminiParseReceipt(): Promise<any> {
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
        const result = await model.generateContent([
          { text: receiptPrompt },
          { inlineData: { mimeType: "image/jpeg", data: base64Image } },
        ]);
        return JSON.parse(stripCodeBlocks(result.response.text().trim()));
      }

      async function openaiParseReceipt(): Promise<any> {
        const completion = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [{
            role: "user",
            content: [
              { type: "text", text: receiptPrompt },
              { type: "image_url", image_url: { url: `data:image/jpeg;base64,${base64Image}` } },
            ],
          }],
          max_tokens: 4000,
        });
        const text = completion.choices[0]?.message?.content?.trim() || "";
        return JSON.parse(stripCodeBlocks(text));
      }

      const parsed = await withAIFallback(geminiParseReceipt, openaiParseReceipt, "parseReceipt");

      // Provide fallback values for missing fields
      const storeName = parsed.storeName || "Unknown Store";
      const rawItems = Array.isArray(parsed.items) ? parsed.items : [];
      const total = typeof parsed.total === "number" ? parsed.total : 0;

      // Post-parse filter: strip non-product lines the AI may have included
      const NON_PRODUCT_PATTERNS = /^(balance due|amount tendered|change|cash|card payment|subtotal|total|charity donation|carrier bag|price cut|savings|clubcard|nectar|meal deal saving|price crunch|bag charge|vat|receipt|thank you|points)/i;
      const items = rawItems.filter((item: any) => {
        // Exclude items matching known non-product patterns
        if (typeof item.name === "string" && NON_PRODUCT_PATTERNS.test(item.name.trim())) {
          return false;
        }
        // Exclude items with negative prices or quantities (returns/refunds)
        if (typeof item.totalPrice === "number" && item.totalPrice < 0) return false;
        if (typeof item.unitPrice === "number" && item.unitPrice < 0) return false;
        if (typeof item.quantity === "number" && item.quantity < 0) return false;
        return true;
      });

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

    function parseVariantResponse(text: string) {
      const cleaned = stripCodeBlocks(text);
      const variants = JSON.parse(cleaned);

      if (!Array.isArray(variants)) {
        throw new Error("Invalid variants response format — expected array");
      }

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
    }

    try {
      return await withAIFallback(
        async () => parseVariantResponse(await geminiGenerate(prompt, { temperature: 0.5, maxTokens: 4000 })),
        async () => parseVariantResponse(await openaiGenerate(prompt, { temperature: 0.5, maxTokens: 4000 })),
        "generateItemVariants"
      );
    } catch (error) {
      console.error("Variant generation failed (both providers):", error);
      return [];
    }
  },
});

/**
 * Real-time AI price estimation for unknown items.
 * Called when a user adds an item that has no existing price data anywhere.
 * Returns estimated price + category + size info, and writes to currentPrices + itemVariants.
 */
export const estimateItemPrice = action({
  args: {
    itemName: v.string(),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const normalizedName = args.itemName.toLowerCase().trim();

    const prompt = `You are a UK grocery pricing expert. For the item "${args.itemName}", provide:
1. A realistic current UK supermarket price in GBP
2. The grocery category
3. Whether this item has common size variants (like milk has 1pt, 2pt, 4pt)
4. If it has variants: list the 3-5 most common UK supermarket size variants with prices
5. If no variants: provide the standard size and unit

Return ONLY valid JSON:
{
  "name": "${args.itemName}",
  "normalizedName": "${normalizedName}",
  "category": "Dairy",
  "estimatedPrice": 1.15,
  "hasVariants": true,
  "defaultSize": null,
  "defaultUnit": null,
  "variants": [
    { "variantName": "Whole Milk 1 Pint", "size": "1 pint", "unit": "pint", "estimatedPrice": 0.65 },
    { "variantName": "Whole Milk 2 Pints", "size": "2 pints", "unit": "pint", "estimatedPrice": 1.15 }
  ]
}

For items WITHOUT variants (e.g., ketchup), set hasVariants=false, variants=[], and provide defaultSize/defaultUnit:
{
  "name": "Ketchup",
  "normalizedName": "ketchup",
  "category": "Condiments",
  "estimatedPrice": 1.50,
  "hasVariants": false,
  "defaultSize": "460g",
  "defaultUnit": "g",
  "variants": []
}

RULES:
- Prices must be realistic current UK supermarket prices in GBP
- Category should match common grocery categories
- No explanations, ONLY the JSON object`;

    interface EstimateResult {
      name: string;
      normalizedName: string;
      category: string;
      estimatedPrice: number;
      hasVariants: boolean;
      defaultSize?: string | null;
      defaultUnit?: string | null;
      variants: Array<{
        variantName: string;
        size: string;
        unit: string;
        estimatedPrice: number;
      }>;
    }

    function parseEstimateResponse(text: string): EstimateResult {
      const cleaned = stripCodeBlocks(text);
      const parsed = JSON.parse(cleaned);
      if (!parsed.name || typeof parsed.estimatedPrice !== "number") {
        throw new Error("Invalid estimate response format");
      }
      return parsed;
    }

    try {
      const result = await withAIFallback(
        async () => parseEstimateResponse(await geminiGenerate(prompt, { temperature: 0.3, maxTokens: 2000 })),
        async () => parseEstimateResponse(await openaiGenerate(prompt, { temperature: 0.3, maxTokens: 2000 })),
        "estimateItemPrice"
      );

      // Write to currentPrices as AI Estimate with reportCount: 0
      await ctx.runMutation(api.currentPrices.upsertAIEstimate, {
        normalizedName: result.normalizedName || normalizedName,
        itemName: result.name || args.itemName,
        unitPrice: result.estimatedPrice,
        userId: args.userId,
        ...(result.defaultSize ? { size: result.defaultSize } : {}),
        ...(result.defaultUnit ? { unit: result.defaultUnit } : {}),
      });

      // Write variants if any
      if (result.hasVariants && result.variants?.length > 0) {
        await ctx.runMutation(api.itemVariants.bulkUpsert, {
          variants: result.variants.map((v) => ({
            baseItem: result.normalizedName || normalizedName,
            variantName: v.variantName,
            size: v.size,
            unit: v.unit,
            category: result.category,
            source: "ai_seeded",
            estimatedPrice: v.estimatedPrice,
          })),
        });
      }

      return {
        estimatedPrice: result.estimatedPrice,
        category: result.category,
        hasVariants: result.hasVariants,
        defaultSize: result.defaultSize,
        defaultUnit: result.defaultUnit,
        variantCount: result.variants?.length || 0,
      };
    } catch (error) {
      console.error("estimateItemPrice failed:", error);
      return null;
    }
  },
});

/**
 * Cuisine-specific fallback items when AI generation fails
 * Returns 120 local items + cultural items based on selected cuisines
 */
function getFallbackItems(country: string, cuisines: string[]): SeedItem[] {
  console.log(`[getFallbackItems] Using hardcoded fallback for cuisines: ${cuisines.join(", ")}`);

  // Base local items (60% = ~120 items for UK)
  const localItems: SeedItem[] = [
    // Dairy (10)
    { name: "Whole Milk", category: "Dairy", stockLevel: "stocked", estimatedPrice: 1.15, hasVariants: true },
    { name: "Butter", category: "Dairy", stockLevel: "stocked", estimatedPrice: 1.85, hasVariants: false, defaultSize: "250g", defaultUnit: "g" },
    { name: "Eggs", category: "Dairy", stockLevel: "stocked", estimatedPrice: 2.10, hasVariants: true },
    { name: "Cheddar Cheese", category: "Dairy", stockLevel: "stocked", estimatedPrice: 2.50, hasVariants: true },
    { name: "Plain Yogurt", category: "Dairy", stockLevel: "low", estimatedPrice: 0.80, hasVariants: true },
    { name: "Cream", category: "Dairy", stockLevel: "out", estimatedPrice: 1.00, hasVariants: true },
    { name: "Greek Yogurt", category: "Dairy", stockLevel: "low", estimatedPrice: 1.50, hasVariants: true },
    { name: "Semi-Skimmed Milk", category: "Dairy", stockLevel: "stocked", estimatedPrice: 1.10, hasVariants: true },
    { name: "Double Cream", category: "Dairy", stockLevel: "out", estimatedPrice: 1.50, hasVariants: false, defaultSize: "300ml", defaultUnit: "ml" },
    { name: "Mature Cheddar", category: "Dairy", stockLevel: "stocked", estimatedPrice: 3.00, hasVariants: true },

    // Bakery (5)
    { name: "White Bread", category: "Bakery", stockLevel: "low", estimatedPrice: 1.10, hasVariants: false, defaultSize: "800g loaf", defaultUnit: "loaf" },
    { name: "Whole Wheat Bread", category: "Bakery", stockLevel: "low", estimatedPrice: 1.30, hasVariants: false, defaultSize: "800g loaf", defaultUnit: "loaf" },
    { name: "Bread Rolls", category: "Bakery", stockLevel: "out", estimatedPrice: 0.85, hasVariants: false, defaultSize: "6 pack", defaultUnit: "pack" },
    { name: "Croissants", category: "Bakery", stockLevel: "out", estimatedPrice: 1.50, hasVariants: false, defaultSize: "4 pack", defaultUnit: "pack" },
    { name: "Wraps", category: "Bakery", stockLevel: "stocked", estimatedPrice: 1.20, hasVariants: false, defaultSize: "8 pack", defaultUnit: "pack" },

    // Pantry Staples (15)
    { name: "Plain Flour", category: "Pantry Staples", stockLevel: "stocked", estimatedPrice: 0.85, hasVariants: true },
    { name: "Caster Sugar", category: "Pantry Staples", stockLevel: "stocked", estimatedPrice: 0.75, hasVariants: true },
    { name: "Salt", category: "Pantry Staples", stockLevel: "stocked", estimatedPrice: 0.65, hasVariants: false, defaultSize: "750g", defaultUnit: "g" },
    { name: "Black Pepper", category: "Pantry Staples", stockLevel: "stocked", estimatedPrice: 1.20, hasVariants: false, defaultSize: "100g", defaultUnit: "g" },
    { name: "Long Grain Rice", category: "Pantry Staples", stockLevel: "stocked", estimatedPrice: 1.50, hasVariants: true },
    { name: "Pasta", category: "Pantry Staples", stockLevel: "stocked", estimatedPrice: 0.70, hasVariants: true },
    { name: "Porridge Oats", category: "Pantry Staples", stockLevel: "stocked", estimatedPrice: 1.20, hasVariants: true },
    { name: "Baking Powder", category: "Pantry Staples", stockLevel: "stocked", estimatedPrice: 1.10, hasVariants: false, defaultSize: "170g", defaultUnit: "g" },
    { name: "Honey", category: "Pantry Staples", stockLevel: "stocked", estimatedPrice: 2.50, hasVariants: true },
    { name: "Cornflour", category: "Pantry Staples", stockLevel: "stocked", estimatedPrice: 0.80, hasVariants: false, defaultSize: "250g", defaultUnit: "g" },

    // Oils & Vinegars (5)
    { name: "Olive Oil", category: "Oils & Vinegars", stockLevel: "stocked", estimatedPrice: 3.50, hasVariants: true },
    { name: "Vegetable Oil", category: "Oils & Vinegars", stockLevel: "stocked", estimatedPrice: 1.80, hasVariants: true },
    { name: "Sunflower Oil", category: "Oils & Vinegars", stockLevel: "stocked", estimatedPrice: 2.00, hasVariants: true },
    { name: "White Wine Vinegar", category: "Oils & Vinegars", stockLevel: "stocked", estimatedPrice: 1.00, hasVariants: false, defaultSize: "500ml", defaultUnit: "ml" },
    { name: "Balsamic Vinegar", category: "Oils & Vinegars", stockLevel: "stocked", estimatedPrice: 2.00, hasVariants: false, defaultSize: "250ml", defaultUnit: "ml" },

    // Condiments (8)
    { name: "Tomato Ketchup", category: "Condiments", stockLevel: "stocked", estimatedPrice: 1.50, hasVariants: false, defaultSize: "460g", defaultUnit: "g" },
    { name: "Brown Sauce", category: "Condiments", stockLevel: "stocked", estimatedPrice: 1.50, hasVariants: false, defaultSize: "425g", defaultUnit: "g" },
    { name: "English Mustard", category: "Condiments", stockLevel: "stocked", estimatedPrice: 1.20, hasVariants: false, defaultSize: "180g", defaultUnit: "g" },
    { name: "Mayonnaise", category: "Condiments", stockLevel: "stocked", estimatedPrice: 1.80, hasVariants: false, defaultSize: "400g", defaultUnit: "g" },
    { name: "Mango Chutney", category: "Condiments", stockLevel: "stocked", estimatedPrice: 1.50, hasVariants: false, defaultSize: "340g", defaultUnit: "g" },
    { name: "Pickle", category: "Condiments", stockLevel: "stocked", estimatedPrice: 1.20, hasVariants: false, defaultSize: "280g", defaultUnit: "g" },
    { name: "Mint Sauce", category: "Condiments", stockLevel: "out", estimatedPrice: 1.00, hasVariants: false, defaultSize: "165g", defaultUnit: "g" },
    { name: "Worcestershire Sauce", category: "Condiments", stockLevel: "stocked", estimatedPrice: 1.50, hasVariants: false, defaultSize: "150ml", defaultUnit: "ml" },

    // Canned Goods (10)
    { name: "Chopped Tomatoes", category: "Canned Goods", stockLevel: "stocked", estimatedPrice: 0.55, hasVariants: false, defaultSize: "400g tin", defaultUnit: "tin" },
    { name: "Baked Beans", category: "Canned Goods", stockLevel: "stocked", estimatedPrice: 0.65, hasVariants: false, defaultSize: "415g tin", defaultUnit: "tin" },
    { name: "Tomato Puree", category: "Canned Goods", stockLevel: "stocked", estimatedPrice: 0.60, hasVariants: false, defaultSize: "200g tube", defaultUnit: "tube" },
    { name: "Chicken Stock", category: "Canned Goods", stockLevel: "stocked", estimatedPrice: 1.00, hasVariants: false, defaultSize: "500ml", defaultUnit: "ml" },
    { name: "Tuna Chunks", category: "Canned Goods", stockLevel: "out", estimatedPrice: 1.20, hasVariants: false, defaultSize: "145g tin", defaultUnit: "tin" },
    { name: "Sweetcorn", category: "Canned Goods", stockLevel: "stocked", estimatedPrice: 0.70, hasVariants: false, defaultSize: "340g tin", defaultUnit: "tin" },
    { name: "Red Kidney Beans", category: "Canned Goods", stockLevel: "stocked", estimatedPrice: 0.60, hasVariants: false, defaultSize: "400g tin", defaultUnit: "tin" },
    { name: "Chickpeas", category: "Canned Goods", stockLevel: "stocked", estimatedPrice: 0.55, hasVariants: false, defaultSize: "400g tin", defaultUnit: "tin" },
    { name: "Coconut Milk", category: "Canned Goods", stockLevel: "low", estimatedPrice: 1.20, hasVariants: false, defaultSize: "400ml tin", defaultUnit: "tin" },
    { name: "Garden Peas", category: "Canned Goods", stockLevel: "stocked", estimatedPrice: 0.55, hasVariants: false, defaultSize: "300g tin", defaultUnit: "tin" },

    // Household (8)
    { name: "Toilet Roll", category: "Household", stockLevel: "low", estimatedPrice: 3.50, hasVariants: true },
    { name: "Kitchen Roll", category: "Household", stockLevel: "low", estimatedPrice: 2.50, hasVariants: true },
    { name: "Bin Liners", category: "Household", stockLevel: "stocked", estimatedPrice: 1.50, hasVariants: true },
    { name: "Washing Up Liquid", category: "Household", stockLevel: "stocked", estimatedPrice: 1.00, hasVariants: false, defaultSize: "500ml", defaultUnit: "ml" },
    { name: "Laundry Detergent", category: "Household", stockLevel: "stocked", estimatedPrice: 4.50, hasVariants: true },
    { name: "Surface Cleaner", category: "Household", stockLevel: "stocked", estimatedPrice: 1.50, hasVariants: false, defaultSize: "750ml", defaultUnit: "ml" },
    { name: "Sponges", category: "Household", stockLevel: "low", estimatedPrice: 1.00, hasVariants: false, defaultSize: "3 pack", defaultUnit: "pack" },
    { name: "Cling Film", category: "Household", stockLevel: "stocked", estimatedPrice: 1.50, hasVariants: false, defaultSize: "30m roll", defaultUnit: "roll" },

    // Personal Care (5)
    { name: "Hand Soap", category: "Personal Care", stockLevel: "stocked", estimatedPrice: 1.00, hasVariants: false, defaultSize: "250ml", defaultUnit: "ml" },
    { name: "Toothpaste", category: "Personal Care", stockLevel: "stocked", estimatedPrice: 1.50, hasVariants: false, defaultSize: "100ml", defaultUnit: "ml" },
    { name: "Shampoo", category: "Personal Care", stockLevel: "stocked", estimatedPrice: 2.50, hasVariants: true },
    { name: "Deodorant", category: "Personal Care", stockLevel: "low", estimatedPrice: 2.00, hasVariants: false, defaultSize: "250ml", defaultUnit: "ml" },
    { name: "Body Wash", category: "Personal Care", stockLevel: "stocked", estimatedPrice: 2.00, hasVariants: false, defaultSize: "250ml", defaultUnit: "ml" },
  ];

  // Cuisine-specific items (40% split across selected cuisines)
  const cuisineItems: Record<string, SeedItem[]> = {
    nigerian: [
      // Nigerian Staples
      { name: "Palm Oil", category: "Ethnic Ingredients", stockLevel: "stocked", estimatedPrice: 4.50, hasVariants: true },
      { name: "Egusi (Melon Seeds)", category: "Ethnic Ingredients", stockLevel: "stocked", estimatedPrice: 5.00, hasVariants: false, defaultSize: "500g", defaultUnit: "g" },
      { name: "Ogbono Seeds", category: "Ethnic Ingredients", stockLevel: "low", estimatedPrice: 6.00, hasVariants: false, defaultSize: "200g", defaultUnit: "g" },
      { name: "Crayfish (Ground)", category: "Ethnic Ingredients", stockLevel: "stocked", estimatedPrice: 4.00, hasVariants: false, defaultSize: "100g", defaultUnit: "g" },
      { name: "Stockfish", category: "Ethnic Ingredients", stockLevel: "out", estimatedPrice: 8.00, hasVariants: false, defaultSize: "200g", defaultUnit: "g" },
      { name: "Locust Beans (Iru)", category: "Ethnic Ingredients", stockLevel: "stocked", estimatedPrice: 3.50, hasVariants: false, defaultSize: "100g", defaultUnit: "g" },
      { name: "Dried Prawns", category: "Ethnic Ingredients", stockLevel: "low", estimatedPrice: 5.00, hasVariants: false, defaultSize: "100g", defaultUnit: "g" },
      { name: "Garri", category: "Ethnic Ingredients", stockLevel: "stocked", estimatedPrice: 3.00, hasVariants: true },
      { name: "Pounded Yam Flour", category: "Ethnic Ingredients", stockLevel: "stocked", estimatedPrice: 4.50, hasVariants: true },
      { name: "Semovita", category: "Ethnic Ingredients", stockLevel: "stocked", estimatedPrice: 3.50, hasVariants: true },
      { name: "Plantains", category: "Produce", stockLevel: "low", estimatedPrice: 1.50, hasVariants: false, defaultSize: "per item", defaultUnit: "each" },
      { name: "Scotch Bonnet Peppers", category: "Produce", stockLevel: "stocked", estimatedPrice: 1.00, hasVariants: false, defaultSize: "100g", defaultUnit: "g" },
      { name: "Yam", category: "Produce", stockLevel: "low", estimatedPrice: 4.00, hasVariants: false, defaultSize: "per kg", defaultUnit: "kg" },
      { name: "Maggi Cubes", category: "Spices & Seasonings", stockLevel: "stocked", estimatedPrice: 1.50, hasVariants: false, defaultSize: "box of 24", defaultUnit: "box" },
      { name: "Suya Spice", category: "Spices & Seasonings", stockLevel: "stocked", estimatedPrice: 2.50, hasVariants: false, defaultSize: "100g", defaultUnit: "g" },
      { name: "Curry Powder (Nigerian)", category: "Spices & Seasonings", stockLevel: "stocked", estimatedPrice: 1.50, hasVariants: false, defaultSize: "100g", defaultUnit: "g" },
      { name: "Thyme (Dried)", category: "Spices & Seasonings", stockLevel: "stocked", estimatedPrice: 1.00, hasVariants: false, defaultSize: "30g", defaultUnit: "g" },
      { name: "Uziza Seeds", category: "Ethnic Ingredients", stockLevel: "out", estimatedPrice: 4.00, hasVariants: false, defaultSize: "50g", defaultUnit: "g" },
      { name: "Bitter Leaf (Dried)", category: "Ethnic Ingredients", stockLevel: "out", estimatedPrice: 3.50, hasVariants: false, defaultSize: "100g", defaultUnit: "g" },
      { name: "Ugu (Fluted Pumpkin Leaves)", category: "Produce", stockLevel: "out", estimatedPrice: 2.50, hasVariants: false, defaultSize: "bunch", defaultUnit: "bunch" },
      { name: "Jollof Rice Spice Mix", category: "Spices & Seasonings", stockLevel: "stocked", estimatedPrice: 2.00, hasVariants: false, defaultSize: "50g", defaultUnit: "g" },
      { name: "Red Palm Fruit Oil", category: "Oils & Vinegars", stockLevel: "low", estimatedPrice: 5.00, hasVariants: false, defaultSize: "500ml", defaultUnit: "ml" },
      { name: "Groundnut (Peanut) Oil", category: "Oils & Vinegars", stockLevel: "stocked", estimatedPrice: 3.00, hasVariants: true },
      { name: "Nigerian Beans (Honey Beans)", category: "Grains & Pasta", stockLevel: "stocked", estimatedPrice: 3.50, hasVariants: true },
      { name: "Black-Eyed Peas", category: "Grains & Pasta", stockLevel: "stocked", estimatedPrice: 2.50, hasVariants: true },
    ],
    indian: [
      { name: "Basmati Rice", category: "Grains & Pasta", stockLevel: "stocked", estimatedPrice: 3.50, hasVariants: true },
      { name: "Ghee", category: "Dairy", stockLevel: "stocked", estimatedPrice: 4.00, hasVariants: true },
      { name: "Turmeric Powder", category: "Spices & Seasonings", stockLevel: "stocked", estimatedPrice: 1.50, hasVariants: false, defaultSize: "100g", defaultUnit: "g" },
      { name: "Cumin Seeds", category: "Spices & Seasonings", stockLevel: "stocked", estimatedPrice: 1.50, hasVariants: false, defaultSize: "100g", defaultUnit: "g" },
      { name: "Coriander Powder", category: "Spices & Seasonings", stockLevel: "stocked", estimatedPrice: 1.50, hasVariants: false, defaultSize: "100g", defaultUnit: "g" },
      { name: "Garam Masala", category: "Spices & Seasonings", stockLevel: "stocked", estimatedPrice: 2.00, hasVariants: false, defaultSize: "100g", defaultUnit: "g" },
      { name: "Red Chilli Powder", category: "Spices & Seasonings", stockLevel: "stocked", estimatedPrice: 1.50, hasVariants: false, defaultSize: "100g", defaultUnit: "g" },
      { name: "Mustard Seeds", category: "Spices & Seasonings", stockLevel: "stocked", estimatedPrice: 1.20, hasVariants: false, defaultSize: "100g", defaultUnit: "g" },
      { name: "Cardamom Pods", category: "Spices & Seasonings", stockLevel: "low", estimatedPrice: 3.00, hasVariants: false, defaultSize: "50g", defaultUnit: "g" },
      { name: "Curry Leaves", category: "Spices & Seasonings", stockLevel: "out", estimatedPrice: 1.00, hasVariants: false, defaultSize: "bunch", defaultUnit: "bunch" },
      { name: "Chapati Flour (Atta)", category: "Pantry Staples", stockLevel: "stocked", estimatedPrice: 2.50, hasVariants: true },
      { name: "Red Lentils (Masoor Dal)", category: "Grains & Pasta", stockLevel: "stocked", estimatedPrice: 2.00, hasVariants: true },
      { name: "Yellow Lentils (Toor Dal)", category: "Grains & Pasta", stockLevel: "stocked", estimatedPrice: 2.50, hasVariants: true },
      { name: "Chickpea Flour (Besan)", category: "Pantry Staples", stockLevel: "stocked", estimatedPrice: 2.00, hasVariants: false, defaultSize: "1kg", defaultUnit: "kg" },
      { name: "Paneer", category: "Dairy", stockLevel: "low", estimatedPrice: 3.00, hasVariants: false, defaultSize: "226g", defaultUnit: "g" },
      { name: "Tamarind Paste", category: "Condiments", stockLevel: "stocked", estimatedPrice: 1.50, hasVariants: false, defaultSize: "200g", defaultUnit: "g" },
      { name: "Fresh Coriander", category: "Produce", stockLevel: "low", estimatedPrice: 0.80, hasVariants: false, defaultSize: "bunch", defaultUnit: "bunch" },
      { name: "Fresh Ginger", category: "Produce", stockLevel: "stocked", estimatedPrice: 1.00, hasVariants: false, defaultSize: "100g", defaultUnit: "g" },
      { name: "Naan Bread", category: "Bakery", stockLevel: "stocked", estimatedPrice: 1.50, hasVariants: false, defaultSize: "2 pack", defaultUnit: "pack" },
      { name: "Papadums", category: "Snacks", stockLevel: "stocked", estimatedPrice: 1.00, hasVariants: false, defaultSize: "200g", defaultUnit: "g" },
    ],
    caribbean: [
      { name: "Scotch Bonnet Peppers", category: "Produce", stockLevel: "stocked", estimatedPrice: 1.00, hasVariants: false, defaultSize: "100g", defaultUnit: "g" },
      { name: "Plantains", category: "Produce", stockLevel: "low", estimatedPrice: 1.50, hasVariants: false, defaultSize: "per item", defaultUnit: "each" },
      { name: "Jerk Seasoning", category: "Spices & Seasonings", stockLevel: "stocked", estimatedPrice: 2.50, hasVariants: false, defaultSize: "150g", defaultUnit: "g" },
      { name: "Allspice (Pimento)", category: "Spices & Seasonings", stockLevel: "stocked", estimatedPrice: 2.00, hasVariants: false, defaultSize: "50g", defaultUnit: "g" },
      { name: "Coconut Cream", category: "Canned Goods", stockLevel: "stocked", estimatedPrice: 1.50, hasVariants: false, defaultSize: "400ml", defaultUnit: "ml" },
      { name: "Rice and Peas Seasoning", category: "Spices & Seasonings", stockLevel: "stocked", estimatedPrice: 2.00, hasVariants: false, defaultSize: "100g", defaultUnit: "g" },
      { name: "Ackee (Tinned)", category: "Canned Goods", stockLevel: "low", estimatedPrice: 4.50, hasVariants: false, defaultSize: "280g tin", defaultUnit: "tin" },
      { name: "Saltfish (Dried)", category: "Ethnic Ingredients", stockLevel: "out", estimatedPrice: 6.00, hasVariants: false, defaultSize: "200g", defaultUnit: "g" },
      { name: "Callaloo (Tinned)", category: "Canned Goods", stockLevel: "stocked", estimatedPrice: 2.00, hasVariants: false, defaultSize: "540g tin", defaultUnit: "tin" },
      { name: "Gungo Peas", category: "Canned Goods", stockLevel: "stocked", estimatedPrice: 1.50, hasVariants: false, defaultSize: "400g tin", defaultUnit: "tin" },
      { name: "Grace Cock Soup", category: "Ethnic Ingredients", stockLevel: "stocked", estimatedPrice: 1.00, hasVariants: false, defaultSize: "50g", defaultUnit: "g" },
      { name: "Browning Sauce", category: "Condiments", stockLevel: "stocked", estimatedPrice: 2.00, hasVariants: false, defaultSize: "150ml", defaultUnit: "ml" },
      { name: "Jamaican Curry Powder", category: "Spices & Seasonings", stockLevel: "stocked", estimatedPrice: 2.50, hasVariants: false, defaultSize: "100g", defaultUnit: "g" },
      { name: "Thyme (Fresh)", category: "Produce", stockLevel: "low", estimatedPrice: 1.00, hasVariants: false, defaultSize: "bunch", defaultUnit: "bunch" },
      { name: "Sweet Potato", category: "Produce", stockLevel: "low", estimatedPrice: 1.50, hasVariants: false, defaultSize: "per kg", defaultUnit: "kg" },
    ],
    chinese: [
      { name: "Jasmine Rice", category: "Grains & Pasta", stockLevel: "stocked", estimatedPrice: 2.50, hasVariants: true },
      { name: "Light Soy Sauce", category: "Condiments", stockLevel: "stocked", estimatedPrice: 1.50, hasVariants: false, defaultSize: "150ml", defaultUnit: "ml" },
      { name: "Dark Soy Sauce", category: "Condiments", stockLevel: "stocked", estimatedPrice: 1.80, hasVariants: false, defaultSize: "150ml", defaultUnit: "ml" },
      { name: "Oyster Sauce", category: "Condiments", stockLevel: "stocked", estimatedPrice: 2.00, hasVariants: false, defaultSize: "255g", defaultUnit: "g" },
      { name: "Sesame Oil", category: "Oils & Vinegars", stockLevel: "stocked", estimatedPrice: 2.50, hasVariants: false, defaultSize: "250ml", defaultUnit: "ml" },
      { name: "Rice Vinegar", category: "Oils & Vinegars", stockLevel: "stocked", estimatedPrice: 1.50, hasVariants: false, defaultSize: "250ml", defaultUnit: "ml" },
      { name: "Hoisin Sauce", category: "Condiments", stockLevel: "stocked", estimatedPrice: 2.00, hasVariants: false, defaultSize: "270g", defaultUnit: "g" },
      { name: "Five Spice Powder", category: "Spices & Seasonings", stockLevel: "stocked", estimatedPrice: 1.50, hasVariants: false, defaultSize: "40g", defaultUnit: "g" },
      { name: "Shaoxing Wine", category: "Ethnic Ingredients", stockLevel: "low", estimatedPrice: 3.00, hasVariants: false, defaultSize: "500ml", defaultUnit: "ml" },
      { name: "Tofu (Firm)", category: "Ethnic Ingredients", stockLevel: "low", estimatedPrice: 2.00, hasVariants: false, defaultSize: "400g", defaultUnit: "g" },
      { name: "Egg Noodles", category: "Grains & Pasta", stockLevel: "stocked", estimatedPrice: 1.50, hasVariants: false, defaultSize: "250g", defaultUnit: "g" },
      { name: "Rice Noodles", category: "Grains & Pasta", stockLevel: "stocked", estimatedPrice: 1.50, hasVariants: false, defaultSize: "250g", defaultUnit: "g" },
      { name: "Pak Choi", category: "Produce", stockLevel: "low", estimatedPrice: 1.00, hasVariants: false, defaultSize: "200g", defaultUnit: "g" },
      { name: "Bean Sprouts", category: "Produce", stockLevel: "out", estimatedPrice: 0.80, hasVariants: false, defaultSize: "300g", defaultUnit: "g" },
      { name: "Spring Onions", category: "Produce", stockLevel: "stocked", estimatedPrice: 0.60, hasVariants: false, defaultSize: "bunch", defaultUnit: "bunch" },
    ],
    italian: [
      { name: "Arborio Rice", category: "Grains & Pasta", stockLevel: "stocked", estimatedPrice: 2.50, hasVariants: false, defaultSize: "500g", defaultUnit: "g" },
      { name: "Parmesan Cheese", category: "Dairy", stockLevel: "stocked", estimatedPrice: 3.50, hasVariants: true },
      { name: "Mozzarella", category: "Dairy", stockLevel: "low", estimatedPrice: 1.80, hasVariants: false, defaultSize: "125g", defaultUnit: "g" },
      { name: "Passata", category: "Canned Goods", stockLevel: "stocked", estimatedPrice: 0.80, hasVariants: false, defaultSize: "500g", defaultUnit: "g" },
      { name: "Pesto", category: "Condiments", stockLevel: "stocked", estimatedPrice: 2.50, hasVariants: false, defaultSize: "190g", defaultUnit: "g" },
      { name: "Dried Oregano", category: "Spices & Seasonings", stockLevel: "stocked", estimatedPrice: 1.00, hasVariants: false, defaultSize: "25g", defaultUnit: "g" },
      { name: "Fresh Basil", category: "Produce", stockLevel: "low", estimatedPrice: 1.00, hasVariants: false, defaultSize: "pot", defaultUnit: "pot" },
      { name: "San Marzano Tomatoes", category: "Canned Goods", stockLevel: "stocked", estimatedPrice: 1.80, hasVariants: false, defaultSize: "400g tin", defaultUnit: "tin" },
      { name: "Mascarpone", category: "Dairy", stockLevel: "out", estimatedPrice: 2.00, hasVariants: false, defaultSize: "250g", defaultUnit: "g" },
      { name: "Prosciutto", category: "Meat", stockLevel: "out", estimatedPrice: 3.50, hasVariants: false, defaultSize: "80g", defaultUnit: "g" },
      { name: "Ciabatta", category: "Bakery", stockLevel: "low", estimatedPrice: 1.50, hasVariants: false, defaultSize: "per loaf", defaultUnit: "loaf" },
      { name: "Spaghetti", category: "Grains & Pasta", stockLevel: "stocked", estimatedPrice: 0.70, hasVariants: false, defaultSize: "500g", defaultUnit: "g" },
      { name: "Penne", category: "Grains & Pasta", stockLevel: "stocked", estimatedPrice: 0.70, hasVariants: false, defaultSize: "500g", defaultUnit: "g" },
      { name: "Lasagne Sheets", category: "Grains & Pasta", stockLevel: "stocked", estimatedPrice: 1.20, hasVariants: false, defaultSize: "250g", defaultUnit: "g" },
      { name: "Pecorino Romano", category: "Dairy", stockLevel: "out", estimatedPrice: 4.00, hasVariants: false, defaultSize: "150g", defaultUnit: "g" },
    ],
    mexican: [
      { name: "Tortillas (Corn)", category: "Bakery", stockLevel: "stocked", estimatedPrice: 1.50, hasVariants: false, defaultSize: "8 pack", defaultUnit: "pack" },
      { name: "Tortillas (Flour)", category: "Bakery", stockLevel: "stocked", estimatedPrice: 1.50, hasVariants: false, defaultSize: "8 pack", defaultUnit: "pack" },
      { name: "Refried Beans", category: "Canned Goods", stockLevel: "stocked", estimatedPrice: 1.20, hasVariants: false, defaultSize: "400g tin", defaultUnit: "tin" },
      { name: "Jalapeños (Pickled)", category: "Condiments", stockLevel: "stocked", estimatedPrice: 1.50, hasVariants: false, defaultSize: "215g jar", defaultUnit: "jar" },
      { name: "Chipotle Paste", category: "Condiments", stockLevel: "stocked", estimatedPrice: 2.00, hasVariants: false, defaultSize: "100g", defaultUnit: "g" },
      { name: "Taco Seasoning", category: "Spices & Seasonings", stockLevel: "stocked", estimatedPrice: 1.00, hasVariants: false, defaultSize: "35g", defaultUnit: "g" },
      { name: "Cumin", category: "Spices & Seasonings", stockLevel: "stocked", estimatedPrice: 1.20, hasVariants: false, defaultSize: "40g", defaultUnit: "g" },
      { name: "Smoked Paprika", category: "Spices & Seasonings", stockLevel: "stocked", estimatedPrice: 1.50, hasVariants: false, defaultSize: "40g", defaultUnit: "g" },
      { name: "Salsa", category: "Condiments", stockLevel: "stocked", estimatedPrice: 1.80, hasVariants: false, defaultSize: "300g", defaultUnit: "g" },
      { name: "Guacamole", category: "Condiments", stockLevel: "out", estimatedPrice: 2.50, hasVariants: false, defaultSize: "200g", defaultUnit: "g" },
      { name: "Sour Cream", category: "Dairy", stockLevel: "stocked", estimatedPrice: 1.00, hasVariants: false, defaultSize: "300ml", defaultUnit: "ml" },
      { name: "Fresh Limes", category: "Produce", stockLevel: "low", estimatedPrice: 0.80, hasVariants: false, defaultSize: "3 pack", defaultUnit: "pack" },
      { name: "Fresh Coriander", category: "Produce", stockLevel: "low", estimatedPrice: 0.80, hasVariants: false, defaultSize: "bunch", defaultUnit: "bunch" },
      { name: "Nachos/Tortilla Chips", category: "Snacks", stockLevel: "stocked", estimatedPrice: 1.50, hasVariants: false, defaultSize: "200g", defaultUnit: "g" },
      { name: "Black Beans", category: "Canned Goods", stockLevel: "stocked", estimatedPrice: 0.80, hasVariants: false, defaultSize: "400g tin", defaultUnit: "tin" },
    ],
    british: [
      { name: "HP Sauce", category: "Condiments", stockLevel: "stocked", estimatedPrice: 1.50, hasVariants: false, defaultSize: "425g", defaultUnit: "g" },
      { name: "Marmite", category: "Condiments", stockLevel: "stocked", estimatedPrice: 3.00, hasVariants: false, defaultSize: "250g", defaultUnit: "g" },
      { name: "Baked Beans", category: "Canned Goods", stockLevel: "stocked", estimatedPrice: 0.65, hasVariants: false, defaultSize: "415g tin", defaultUnit: "tin" },
      { name: "Cumberland Sausages", category: "Meat", stockLevel: "low", estimatedPrice: 3.00, hasVariants: false, defaultSize: "400g", defaultUnit: "g" },
      { name: "Bacon Rashers", category: "Meat", stockLevel: "low", estimatedPrice: 3.50, hasVariants: false, defaultSize: "300g", defaultUnit: "g" },
      { name: "Crumpets", category: "Bakery", stockLevel: "stocked", estimatedPrice: 1.00, hasVariants: false, defaultSize: "6 pack", defaultUnit: "pack" },
      { name: "English Muffins", category: "Bakery", stockLevel: "stocked", estimatedPrice: 1.00, hasVariants: false, defaultSize: "4 pack", defaultUnit: "pack" },
      { name: "Tea Bags", category: "Beverages", stockLevel: "stocked", estimatedPrice: 3.50, hasVariants: true },
      { name: "Digestive Biscuits", category: "Snacks", stockLevel: "stocked", estimatedPrice: 1.00, hasVariants: false, defaultSize: "400g", defaultUnit: "g" },
      { name: "Branston Pickle", category: "Condiments", stockLevel: "stocked", estimatedPrice: 1.80, hasVariants: false, defaultSize: "360g", defaultUnit: "g" },
      { name: "Custard Powder", category: "Baking", stockLevel: "stocked", estimatedPrice: 1.50, hasVariants: false, defaultSize: "300g", defaultUnit: "g" },
      { name: "Self-Raising Flour", category: "Pantry Staples", stockLevel: "stocked", estimatedPrice: 0.85, hasVariants: true },
      { name: "Golden Syrup", category: "Baking", stockLevel: "stocked", estimatedPrice: 2.00, hasVariants: false, defaultSize: "454g", defaultUnit: "g" },
      { name: "Mincemeat", category: "Baking", stockLevel: "out", estimatedPrice: 1.50, hasVariants: false, defaultSize: "411g", defaultUnit: "g" },
      { name: "Gravy Granules", category: "Condiments", stockLevel: "stocked", estimatedPrice: 1.50, hasVariants: false, defaultSize: "200g", defaultUnit: "g" },
    ],
    pakistani: [
      { name: "Basmati Rice", category: "Grains & Pasta", stockLevel: "stocked", estimatedPrice: 3.50, hasVariants: true },
      { name: "Ghee", category: "Dairy", stockLevel: "stocked", estimatedPrice: 4.00, hasVariants: true },
      { name: "Chapati Flour (Atta)", category: "Pantry Staples", stockLevel: "stocked", estimatedPrice: 2.50, hasVariants: true },
      { name: "Biryani Masala", category: "Spices & Seasonings", stockLevel: "stocked", estimatedPrice: 2.50, hasVariants: false, defaultSize: "100g", defaultUnit: "g" },
      { name: "Turmeric Powder", category: "Spices & Seasonings", stockLevel: "stocked", estimatedPrice: 1.50, hasVariants: false, defaultSize: "100g", defaultUnit: "g" },
      { name: "Red Chilli Powder", category: "Spices & Seasonings", stockLevel: "stocked", estimatedPrice: 1.50, hasVariants: false, defaultSize: "100g", defaultUnit: "g" },
      { name: "Cumin Seeds", category: "Spices & Seasonings", stockLevel: "stocked", estimatedPrice: 1.50, hasVariants: false, defaultSize: "100g", defaultUnit: "g" },
      { name: "Coriander Powder", category: "Spices & Seasonings", stockLevel: "stocked", estimatedPrice: 1.50, hasVariants: false, defaultSize: "100g", defaultUnit: "g" },
      { name: "Garam Masala", category: "Spices & Seasonings", stockLevel: "stocked", estimatedPrice: 2.00, hasVariants: false, defaultSize: "100g", defaultUnit: "g" },
      { name: "Chana Dal", category: "Grains & Pasta", stockLevel: "stocked", estimatedPrice: 2.00, hasVariants: true },
      { name: "Moong Dal", category: "Grains & Pasta", stockLevel: "stocked", estimatedPrice: 2.50, hasVariants: true },
      { name: "Karahi Masala", category: "Spices & Seasonings", stockLevel: "stocked", estimatedPrice: 2.50, hasVariants: false, defaultSize: "100g", defaultUnit: "g" },
      { name: "Nihari Masala", category: "Spices & Seasonings", stockLevel: "low", estimatedPrice: 3.00, hasVariants: false, defaultSize: "50g", defaultUnit: "g" },
      { name: "Haleem Mix", category: "Ethnic Ingredients", stockLevel: "out", estimatedPrice: 4.00, hasVariants: false, defaultSize: "300g", defaultUnit: "g" },
      { name: "Seekh Kebab Spice Mix", category: "Spices & Seasonings", stockLevel: "stocked", estimatedPrice: 2.00, hasVariants: false, defaultSize: "100g", defaultUnit: "g" },
    ],
    "middle-eastern": [
      { name: "Tahini", category: "Condiments", stockLevel: "stocked", estimatedPrice: 3.00, hasVariants: false, defaultSize: "300g", defaultUnit: "g" },
      { name: "Hummus", category: "Condiments", stockLevel: "low", estimatedPrice: 1.80, hasVariants: false, defaultSize: "200g", defaultUnit: "g" },
      { name: "Falafel Mix", category: "Ethnic Ingredients", stockLevel: "stocked", estimatedPrice: 2.00, hasVariants: false, defaultSize: "200g", defaultUnit: "g" },
      { name: "Couscous", category: "Grains & Pasta", stockLevel: "stocked", estimatedPrice: 1.50, hasVariants: true },
      { name: "Bulgur Wheat", category: "Grains & Pasta", stockLevel: "stocked", estimatedPrice: 2.00, hasVariants: true },
      { name: "Sumac", category: "Spices & Seasonings", stockLevel: "stocked", estimatedPrice: 2.50, hasVariants: false, defaultSize: "50g", defaultUnit: "g" },
      { name: "Za'atar", category: "Spices & Seasonings", stockLevel: "stocked", estimatedPrice: 3.00, hasVariants: false, defaultSize: "100g", defaultUnit: "g" },
      { name: "Baharat Spice", category: "Spices & Seasonings", stockLevel: "low", estimatedPrice: 2.50, hasVariants: false, defaultSize: "50g", defaultUnit: "g" },
      { name: "Rose Water", category: "Baking", stockLevel: "stocked", estimatedPrice: 2.00, hasVariants: false, defaultSize: "300ml", defaultUnit: "ml" },
      { name: "Pomegranate Molasses", category: "Condiments", stockLevel: "stocked", estimatedPrice: 3.50, hasVariants: false, defaultSize: "250ml", defaultUnit: "ml" },
      { name: "Preserved Lemons", category: "Condiments", stockLevel: "out", estimatedPrice: 3.00, hasVariants: false, defaultSize: "350g jar", defaultUnit: "jar" },
      { name: "Harissa Paste", category: "Condiments", stockLevel: "stocked", estimatedPrice: 2.50, hasVariants: false, defaultSize: "100g", defaultUnit: "g" },
      { name: "Pitta Bread", category: "Bakery", stockLevel: "low", estimatedPrice: 1.00, hasVariants: false, defaultSize: "6 pack", defaultUnit: "pack" },
      { name: "Halloumi", category: "Dairy", stockLevel: "low", estimatedPrice: 3.00, hasVariants: false, defaultSize: "225g", defaultUnit: "g" },
      { name: "Feta Cheese", category: "Dairy", stockLevel: "stocked", estimatedPrice: 2.50, hasVariants: false, defaultSize: "200g", defaultUnit: "g" },
    ],
    japanese: [
      { name: "Sushi Rice", category: "Grains & Pasta", stockLevel: "stocked", estimatedPrice: 3.50, hasVariants: true },
      { name: "Soy Sauce (Japanese)", category: "Condiments", stockLevel: "stocked", estimatedPrice: 2.50, hasVariants: false, defaultSize: "150ml", defaultUnit: "ml" },
      { name: "Mirin", category: "Condiments", stockLevel: "stocked", estimatedPrice: 3.00, hasVariants: false, defaultSize: "250ml", defaultUnit: "ml" },
      { name: "Sake (Cooking)", category: "Ethnic Ingredients", stockLevel: "low", estimatedPrice: 5.00, hasVariants: false, defaultSize: "300ml", defaultUnit: "ml" },
      { name: "Rice Vinegar", category: "Oils & Vinegars", stockLevel: "stocked", estimatedPrice: 1.50, hasVariants: false, defaultSize: "250ml", defaultUnit: "ml" },
      { name: "Miso Paste", category: "Condiments", stockLevel: "stocked", estimatedPrice: 3.50, hasVariants: false, defaultSize: "300g", defaultUnit: "g" },
      { name: "Dashi Stock", category: "Ethnic Ingredients", stockLevel: "stocked", estimatedPrice: 2.50, hasVariants: false, defaultSize: "50g", defaultUnit: "g" },
      { name: "Nori Seaweed", category: "Ethnic Ingredients", stockLevel: "stocked", estimatedPrice: 3.00, hasVariants: false, defaultSize: "10 sheets", defaultUnit: "pack" },
      { name: "Wakame Seaweed", category: "Ethnic Ingredients", stockLevel: "low", estimatedPrice: 2.50, hasVariants: false, defaultSize: "50g", defaultUnit: "g" },
      { name: "Panko Breadcrumbs", category: "Pantry Staples", stockLevel: "stocked", estimatedPrice: 2.00, hasVariants: false, defaultSize: "200g", defaultUnit: "g" },
      { name: "Wasabi Paste", category: "Condiments", stockLevel: "stocked", estimatedPrice: 2.00, hasVariants: false, defaultSize: "43g", defaultUnit: "g" },
      { name: "Pickled Ginger", category: "Condiments", stockLevel: "stocked", estimatedPrice: 2.00, hasVariants: false, defaultSize: "110g", defaultUnit: "g" },
      { name: "Udon Noodles", category: "Grains & Pasta", stockLevel: "stocked", estimatedPrice: 2.00, hasVariants: false, defaultSize: "300g", defaultUnit: "g" },
      { name: "Soba Noodles", category: "Grains & Pasta", stockLevel: "low", estimatedPrice: 2.50, hasVariants: false, defaultSize: "250g", defaultUnit: "g" },
      { name: "Tofu (Silken)", category: "Ethnic Ingredients", stockLevel: "low", estimatedPrice: 1.80, hasVariants: false, defaultSize: "300g", defaultUnit: "g" },
    ],
    korean: [
      { name: "Gochujang (Red Pepper Paste)", category: "Condiments", stockLevel: "stocked", estimatedPrice: 4.00, hasVariants: false, defaultSize: "500g", defaultUnit: "g" },
      { name: "Gochugaru (Red Pepper Flakes)", category: "Spices & Seasonings", stockLevel: "stocked", estimatedPrice: 5.00, hasVariants: false, defaultSize: "200g", defaultUnit: "g" },
      { name: "Doenjang (Soybean Paste)", category: "Condiments", stockLevel: "stocked", estimatedPrice: 3.50, hasVariants: false, defaultSize: "500g", defaultUnit: "g" },
      { name: "Sesame Oil (Korean)", category: "Oils & Vinegars", stockLevel: "stocked", estimatedPrice: 4.00, hasVariants: false, defaultSize: "320ml", defaultUnit: "ml" },
      { name: "Kimchi", category: "Ethnic Ingredients", stockLevel: "low", estimatedPrice: 4.00, hasVariants: false, defaultSize: "400g", defaultUnit: "g" },
      { name: "Korean Rice Cakes (Tteok)", category: "Ethnic Ingredients", stockLevel: "out", estimatedPrice: 3.50, hasVariants: false, defaultSize: "500g", defaultUnit: "g" },
      { name: "Korean Glass Noodles (Dangmyeon)", category: "Grains & Pasta", stockLevel: "stocked", estimatedPrice: 3.00, hasVariants: false, defaultSize: "500g", defaultUnit: "g" },
      { name: "Ssamjang", category: "Condiments", stockLevel: "stocked", estimatedPrice: 3.50, hasVariants: false, defaultSize: "250g", defaultUnit: "g" },
      { name: "Korean BBQ Sauce", category: "Condiments", stockLevel: "stocked", estimatedPrice: 3.00, hasVariants: false, defaultSize: "280g", defaultUnit: "g" },
      { name: "Dried Anchovies", category: "Ethnic Ingredients", stockLevel: "low", estimatedPrice: 5.00, hasVariants: false, defaultSize: "200g", defaultUnit: "g" },
      { name: "Roasted Sesame Seeds", category: "Spices & Seasonings", stockLevel: "stocked", estimatedPrice: 2.00, hasVariants: false, defaultSize: "100g", defaultUnit: "g" },
      { name: "Korean Soy Sauce", category: "Condiments", stockLevel: "stocked", estimatedPrice: 3.00, hasVariants: false, defaultSize: "500ml", defaultUnit: "ml" },
      { name: "Perilla Leaves", category: "Produce", stockLevel: "out", estimatedPrice: 2.50, hasVariants: false, defaultSize: "bunch", defaultUnit: "bunch" },
      { name: "Korean Radish (Mu)", category: "Produce", stockLevel: "low", estimatedPrice: 2.00, hasVariants: false, defaultSize: "per item", defaultUnit: "each" },
      { name: "Short Grain Rice", category: "Grains & Pasta", stockLevel: "stocked", estimatedPrice: 3.00, hasVariants: true },
    ],
    thai: [
      { name: "Thai Jasmine Rice", category: "Grains & Pasta", stockLevel: "stocked", estimatedPrice: 3.00, hasVariants: true },
      { name: "Fish Sauce", category: "Condiments", stockLevel: "stocked", estimatedPrice: 2.00, hasVariants: false, defaultSize: "200ml", defaultUnit: "ml" },
      { name: "Thai Red Curry Paste", category: "Condiments", stockLevel: "stocked", estimatedPrice: 2.00, hasVariants: false, defaultSize: "200g", defaultUnit: "g" },
      { name: "Thai Green Curry Paste", category: "Condiments", stockLevel: "stocked", estimatedPrice: 2.00, hasVariants: false, defaultSize: "200g", defaultUnit: "g" },
      { name: "Coconut Milk", category: "Canned Goods", stockLevel: "stocked", estimatedPrice: 1.20, hasVariants: false, defaultSize: "400ml tin", defaultUnit: "tin" },
      { name: "Palm Sugar", category: "Baking", stockLevel: "stocked", estimatedPrice: 2.50, hasVariants: false, defaultSize: "200g", defaultUnit: "g" },
      { name: "Tamarind Paste", category: "Condiments", stockLevel: "stocked", estimatedPrice: 1.50, hasVariants: false, defaultSize: "200g", defaultUnit: "g" },
      { name: "Lemongrass", category: "Produce", stockLevel: "low", estimatedPrice: 1.00, hasVariants: false, defaultSize: "2 stalks", defaultUnit: "pack" },
      { name: "Galangal", category: "Produce", stockLevel: "out", estimatedPrice: 2.00, hasVariants: false, defaultSize: "100g", defaultUnit: "g" },
      { name: "Kaffir Lime Leaves", category: "Produce", stockLevel: "low", estimatedPrice: 1.50, hasVariants: false, defaultSize: "10g", defaultUnit: "g" },
      { name: "Thai Basil", category: "Produce", stockLevel: "out", estimatedPrice: 1.50, hasVariants: false, defaultSize: "bunch", defaultUnit: "bunch" },
      { name: "Thai Chillies (Bird's Eye)", category: "Produce", stockLevel: "stocked", estimatedPrice: 1.00, hasVariants: false, defaultSize: "50g", defaultUnit: "g" },
      { name: "Rice Noodles (Pad Thai)", category: "Grains & Pasta", stockLevel: "stocked", estimatedPrice: 1.50, hasVariants: false, defaultSize: "250g", defaultUnit: "g" },
      { name: "Sticky Rice", category: "Grains & Pasta", stockLevel: "stocked", estimatedPrice: 3.00, hasVariants: true },
      { name: "Sriracha Sauce", category: "Condiments", stockLevel: "stocked", estimatedPrice: 2.50, hasVariants: false, defaultSize: "200ml", defaultUnit: "ml" },
    ],
    vietnamese: [
      { name: "Fish Sauce (Nuoc Mam)", category: "Condiments", stockLevel: "stocked", estimatedPrice: 2.50, hasVariants: false, defaultSize: "200ml", defaultUnit: "ml" },
      { name: "Rice Paper Wrappers", category: "Ethnic Ingredients", stockLevel: "stocked", estimatedPrice: 2.00, hasVariants: false, defaultSize: "200g", defaultUnit: "g" },
      { name: "Pho Noodles", category: "Grains & Pasta", stockLevel: "stocked", estimatedPrice: 2.00, hasVariants: false, defaultSize: "400g", defaultUnit: "g" },
      { name: "Pho Spice Mix", category: "Spices & Seasonings", stockLevel: "stocked", estimatedPrice: 2.00, hasVariants: false, defaultSize: "50g", defaultUnit: "g" },
      { name: "Hoisin Sauce", category: "Condiments", stockLevel: "stocked", estimatedPrice: 2.00, hasVariants: false, defaultSize: "270g", defaultUnit: "g" },
      { name: "Sriracha", category: "Condiments", stockLevel: "stocked", estimatedPrice: 2.50, hasVariants: false, defaultSize: "200ml", defaultUnit: "ml" },
      { name: "Bean Sprouts", category: "Produce", stockLevel: "low", estimatedPrice: 0.80, hasVariants: false, defaultSize: "300g", defaultUnit: "g" },
      { name: "Fresh Mint", category: "Produce", stockLevel: "low", estimatedPrice: 1.00, hasVariants: false, defaultSize: "bunch", defaultUnit: "bunch" },
      { name: "Fresh Coriander", category: "Produce", stockLevel: "low", estimatedPrice: 0.80, hasVariants: false, defaultSize: "bunch", defaultUnit: "bunch" },
      { name: "Thai Basil", category: "Produce", stockLevel: "out", estimatedPrice: 1.50, hasVariants: false, defaultSize: "bunch", defaultUnit: "bunch" },
      { name: "Lemongrass", category: "Produce", stockLevel: "low", estimatedPrice: 1.00, hasVariants: false, defaultSize: "2 stalks", defaultUnit: "pack" },
      { name: "Vermicelli Noodles", category: "Grains & Pasta", stockLevel: "stocked", estimatedPrice: 1.50, hasVariants: false, defaultSize: "200g", defaultUnit: "g" },
      { name: "Annatto Seeds", category: "Spices & Seasonings", stockLevel: "out", estimatedPrice: 2.00, hasVariants: false, defaultSize: "50g", defaultUnit: "g" },
      { name: "Pickled Vegetables", category: "Condiments", stockLevel: "stocked", estimatedPrice: 2.00, hasVariants: false, defaultSize: "340g jar", defaultUnit: "jar" },
      { name: "Coconut Cream", category: "Canned Goods", stockLevel: "stocked", estimatedPrice: 1.50, hasVariants: false, defaultSize: "400ml", defaultUnit: "ml" },
    ],
    ethiopian: [
      { name: "Teff Flour", category: "Pantry Staples", stockLevel: "stocked", estimatedPrice: 5.00, hasVariants: true },
      { name: "Berbere Spice", category: "Spices & Seasonings", stockLevel: "stocked", estimatedPrice: 4.00, hasVariants: false, defaultSize: "100g", defaultUnit: "g" },
      { name: "Mitmita Spice", category: "Spices & Seasonings", stockLevel: "low", estimatedPrice: 4.00, hasVariants: false, defaultSize: "50g", defaultUnit: "g" },
      { name: "Niter Kibbeh (Spiced Butter)", category: "Dairy", stockLevel: "out", estimatedPrice: 6.00, hasVariants: false, defaultSize: "200g", defaultUnit: "g" },
      { name: "Injera Bread", category: "Bakery", stockLevel: "low", estimatedPrice: 4.00, hasVariants: false, defaultSize: "pack", defaultUnit: "pack" },
      { name: "Red Lentils", category: "Grains & Pasta", stockLevel: "stocked", estimatedPrice: 2.00, hasVariants: true },
      { name: "Yellow Split Peas", category: "Grains & Pasta", stockLevel: "stocked", estimatedPrice: 2.00, hasVariants: true },
      { name: "Fenugreek Seeds", category: "Spices & Seasonings", stockLevel: "stocked", estimatedPrice: 1.50, hasVariants: false, defaultSize: "50g", defaultUnit: "g" },
      { name: "Black Cardamom", category: "Spices & Seasonings", stockLevel: "low", estimatedPrice: 3.00, hasVariants: false, defaultSize: "30g", defaultUnit: "g" },
      { name: "Nigella Seeds (Black Cumin)", category: "Spices & Seasonings", stockLevel: "stocked", estimatedPrice: 2.00, hasVariants: false, defaultSize: "50g", defaultUnit: "g" },
      { name: "Korarima (Ethiopian Cardamom)", category: "Spices & Seasonings", stockLevel: "out", estimatedPrice: 5.00, hasVariants: false, defaultSize: "30g", defaultUnit: "g" },
      { name: "Ajwain Seeds", category: "Spices & Seasonings", stockLevel: "stocked", estimatedPrice: 2.00, hasVariants: false, defaultSize: "50g", defaultUnit: "g" },
      { name: "Long Pepper", category: "Spices & Seasonings", stockLevel: "out", estimatedPrice: 4.00, hasVariants: false, defaultSize: "30g", defaultUnit: "g" },
      { name: "Ethiopian Honey", category: "Condiments", stockLevel: "stocked", estimatedPrice: 6.00, hasVariants: false, defaultSize: "250g", defaultUnit: "g" },
      { name: "Shiro Powder", category: "Ethnic Ingredients", stockLevel: "stocked", estimatedPrice: 4.00, hasVariants: false, defaultSize: "500g", defaultUnit: "g" },
    ],
  };

  // Collect cultural items based on selected cuisines
  const selectedCulturalItems: SeedItem[] = [];
  const itemsPerCuisine = Math.floor(80 / Math.max(cuisines.length, 1));

  for (const cuisine of cuisines) {
    const cuisineLower = cuisine.toLowerCase();
    const items = cuisineItems[cuisineLower] || [];
    // Take up to itemsPerCuisine items from this cuisine
    selectedCulturalItems.push(...items.slice(0, itemsPerCuisine));
  }

  // Combine local + cultural items
  const allItems = [...localItems, ...selectedCulturalItems];

  console.log(`[getFallbackItems] Returning ${localItems.length} local + ${selectedCulturalItems.length} cultural = ${allItems.length} total items`);

  return allItems;
}
