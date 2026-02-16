import { action } from "./_generated/server";
import { api } from "./_generated/api";
import { v } from "convex/values";
import { GoogleGenerativeAI } from "@google/generative-ai";
import OpenAI from "openai";
import {
  voiceFunctionDeclarations,
  buildSystemPrompt,
  executeVoiceTool,
} from "./lib/voiceTools";

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
          stockLevel: "low" as const, // Default all items to "low" - one swipe to adjust
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

      const receiptPrompt = `You are a receipt parser for a UK grocery shopping app. Analyse this receipt image and honestly assess what you can and cannot read.

FIRST: Assess image quality STRICTLY. Score "imageQuality" from 0-100:
- 90-100: Crystal clear, all text easily readable, sharp focus
- 70-89: Good quality, most text readable with only minor issues
- 50-69: Mediocre, some text readable but noticeable blur or obstruction — many items will be guesses
- 30-49: Poor quality, most text is blurry or unreadable — DO NOT attempt to parse items
- 0-29: Illegible, cannot make out meaningful text at all

BE STRICT: if you have to guess what most item names are, the image quality is below 50. A blurry, out-of-focus, or poorly lit receipt is POOR quality even if you can make out a few words.

If imageQuality < 50, you MUST return: {"imageQuality": <score>, "storeName": "Unknown Store", "items": [], "total": 0, "rejection": "Image too blurry or unclear to read reliably"}
Do NOT attempt to guess or fabricate items from a low-quality image.

Otherwise, extract:
1. Store name (if unclear, use "Unknown Store")
2. Store address (if visible, otherwise omit)
3. Purchase date (in ISO format YYYY-MM-DD, or use today's date if unclear)
4. All items with:
   - Item name: Meaningfully rephrased product name, MAX 30 CHARACTERS. SIZE/QUANTITY COMES FIRST, then the product. Never just truncate — rephrase to fit. If the receipt shows a size, include it first. If not printed, estimate the standard UK size for that product. Examples: "2pt Whole Milk", "4pt Semi-Skimmed Milk", "6pk Free Range Eggs", "800g Hovis Wholemeal", "2L Coke Zero", "500g Chicken Breast", "30 Conqueror A4 Sheets". Drop brand prefixes or redundant words to stay under 30 chars.
   - Size: The size/weight value separately (e.g., "2L", "500g", "6 pack"). Estimate standard UK size if not on receipt.
   - Unit: Unit of measurement (e.g., "L", "g", "pack", "pint"). Estimate from size.
   - Quantity: Number of units purchased (default to 1). Handle "2 x £2.19" as quantity: 2.
   - Unit price (price per single unit)
   - Total price for that line item
   - Confidence: 0-100 how confident you are this item name and price are correct. Be honest — if you're guessing from blurry text, use 20-40. If clearly readable, use 80-100.
5. Subtotal (if visible)
6. Tax amount (if visible)
7. Grand total (REQUIRED - extract this even if other fields are unclear)

Return ONLY valid JSON in this exact format:
{
  "imageQuality": 85,
  "storeName": "Store Name",
  "storeAddress": "123 Main St",
  "purchaseDate": "2026-01-29",
  "items": [
    {
      "name": "2pt Whole Milk",
      "size": "2pt",
      "unit": "pint",
      "quantity": 1,
      "unitPrice": 1.15,
      "totalPrice": 1.15,
      "confidence": 95
    },
    {
      "name": "Bananas Loose",
      "size": "each",
      "unit": "each",
      "quantity": 1,
      "unitPrice": 0.75,
      "totalPrice": 0.75,
      "confidence": 60
    }
  ],
  "subtotal": 10.00,
  "tax": 1.00,
  "total": 11.00
}

IMPORTANT RULES:
- DO NOT fabricate items you cannot read. If the image is too blurry to identify a product, skip it.
- DO expand abbreviations to clean readable names (e.g., "Mlk" → "Milk", "ORG BNS" → "Organic Bananas")
- DO extract size from the item description when it's printed on the receipt
- DO NOT guess sizes — if the receipt just says "MILK" with no size, set size and unit to null
- DO extract at least the total amount - this is the most important field
- If an item name is partially legible, do your best but set confidence low (20-50)
- If you can only read prices but not names, use "Unknown Item 1" etc. with low confidence
- All prices should be numbers (not strings)
- Quantities should be integers
- Date must be in YYYY-MM-DD format
- Ignore: loyalty discounts, bag charges, VAT codes (A/B/D), SKU numbers, promotional lines ("Price Crunch", "50p off")
- EXCLUDE non-product lines: "Balance Due", "Amount Tendered", "Change", "Cash", "Card Payment", "Subtotal", "Total", "Charity Donation", "Carrier Bag", "Price Cut", "Savings", "Clubcard", "Nectar", "Meal Deal Saving"
- EXCLUDE refund/return lines with negative prices or negative quantities — these are not purchased products
- Only include actual product items that the customer bought and took home
- Be HONEST about confidence — do not inflate scores. A fuzzy receipt should have low imageQuality and low item confidence.`;

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

      // Image quality score from AI (0-100)
      const imageQuality = typeof parsed.imageQuality === "number" ? parsed.imageQuality : 50;

      // GATE 1: If AI rejected the image or quality is below threshold
      if (parsed.rejection || imageQuality < 50) {
        return {
          storeName: parsed.storeName || "Unknown Store",
          storeAddress: "",
          purchaseDate: new Date().toISOString().split("T")[0],
          items: [],
          subtotal: 0,
          tax: 0,
          total: typeof parsed.total === "number" ? parsed.total : 0,
          imageQuality,
          rejection: parsed.rejection || "Image too blurry or unclear to read reliably",
        };
      }

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

      // Ensure each item has a confidence score
      for (const item of items) {
        if (typeof item.confidence !== "number") {
          item.confidence = imageQuality >= 70 ? 75 : 40;
        }
      }

      // GATE 2: If AI ignored the prompt and parsed anyway, check average confidence.
      // If most items are low-confidence guesses, reject the scan server-side.
      if (items.length > 0) {
        const avgItemConfidence =
          items.reduce((sum: number, item: any) => sum + (typeof item.confidence === "number" ? item.confidence : 50), 0) / items.length;
        if (avgItemConfidence < 45) {
          return {
            storeName,
            storeAddress: "",
            purchaseDate: new Date().toISOString().split("T")[0],
            items: [],
            subtotal: 0,
            tax: 0,
            total,
            imageQuality: Math.min(imageQuality, 40),
            rejection: "Most items could not be read confidently. Please retake with a clearer image.",
          };
        }
      }

      // If no items were parsed, create a generic placeholder
      if (items.length === 0 && total > 0) {
        return {
          storeName,
          storeAddress: "",
          purchaseDate: parsed.purchaseDate || new Date().toISOString().split("T")[0],
          items: [],
          subtotal: 0,
          tax: 0,
          total,
          imageQuality: Math.min(imageQuality, 40),
          rejection: "Could not identify any items. Please retake with a clearer image.",
        };
      }

      return {
        storeName,
        storeAddress: parsed.storeAddress || "",
        purchaseDate: parsed.purchaseDate || new Date().toISOString().split("T")[0],
        items,
        subtotal: typeof parsed.subtotal === "number" ? parsed.subtotal : total,
        tax: typeof parsed.tax === "number" ? parsed.tax : 0,
        total,
        imageQuality,
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
 * Scan a physical product photo and extract product details using AI vision.
 * Returns structured product info: name, category, size, unit, brand, estimated price.
 */
export const scanProduct = action({
  args: {
    storageId: v.string(),
  },
  handler: async (ctx, args) => {
    try {
      const imageUrl = await ctx.storage.getUrl(args.storageId);
      if (!imageUrl) {
        throw new Error("Failed to get image URL");
      }

      // Fetch image as base64 (chunked to avoid OOM)
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

      const productPrompt = `You are a UK grocery product identifier. Analyse this photo of a physical product and extract its details.

Read the text on the packaging — product name, brand, size/weight, and any other relevant info.

Return a JSON object with these fields:
- name: Product name, MAX 30 CHARACTERS. SIZE/QUANTITY COMES FIRST, then the product name. Meaningfully rephrase to fit — never just truncate. Drop unnecessary brand prefixes or filler words.
  Examples: "2pt Whole Milk", "500g Chicken Breast", "400g Heinz Baked Beans", "80pk PG Tips Tea Bags", "2L Coke Zero", "6pk Free Range Eggs"
- category: One of: "Dairy & Eggs", "Meat & Fish", "Fruits & Vegetables", "Bakery", "Drinks", "Snacks & Sweets", "Canned & Jarred", "Frozen", "Household", "Personal Care", "Condiments & Sauces", "Grains & Pasta", "Baking", "Baby & Kids", "Pet", "Other"
- size: The size/weight value (e.g., "2L", "500g", "6 pack", "2pt"). Read from packaging. If not visible, estimate the standard UK size.
- unit: Unit of measurement (e.g., "L", "g", "pack", "pint", "ml", "kg")
- brand: Brand name if visible (e.g., "Tesco", "Heinz", "PG Tips"). null if generic/unbranded.
- estimatedPrice: Your best estimate of the UK retail price in GBP (number). Use typical UK supermarket pricing.
- confidence: 0-100 how confident you are in the identification. Below 40 means the image is too unclear.

If the image does not show a recognisable product (e.g., blurry, not a product, random object), return:
{"confidence": 0, "rejection": "Could not identify a product in this image"}

Return ONLY valid JSON, no markdown code blocks.`;

      async function geminiParseProduct(): Promise<Record<string, unknown>> {
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
        const result = await model.generateContent([
          { text: productPrompt },
          { inlineData: { mimeType: "image/jpeg", data: base64Image } },
        ]);
        return JSON.parse(stripCodeBlocks(result.response.text().trim()));
      }

      async function openaiParseProduct(): Promise<Record<string, unknown>> {
        const completion = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [{
            role: "user",
            content: [
              { type: "text", text: productPrompt },
              { type: "image_url", image_url: { url: `data:image/jpeg;base64,${base64Image}` } },
            ],
          }],
          max_tokens: 1000,
        });
        const text = completion.choices[0]?.message?.content?.trim() || "";
        return JSON.parse(stripCodeBlocks(text));
      }

      const parsed = await withAIFallback(geminiParseProduct, openaiParseProduct, "scanProduct");

      const confidence = typeof parsed.confidence === "number" ? parsed.confidence : 0;

      if (parsed.rejection || confidence < 30) {
        return {
          success: false,
          rejection: (parsed.rejection as string) || "Could not identify a product in this image",
          confidence,
        };
      }

      return {
        success: true,
        name: typeof parsed.name === "string" ? parsed.name.slice(0, 30) : "Unknown Product",
        category: typeof parsed.category === "string" ? parsed.category : "Other",
        size: typeof parsed.size === "string" ? parsed.size : undefined,
        unit: typeof parsed.unit === "string" ? parsed.unit : undefined,
        brand: typeof parsed.brand === "string" ? parsed.brand : undefined,
        estimatedPrice: typeof parsed.estimatedPrice === "number" && isFinite(parsed.estimatedPrice) && parsed.estimatedPrice > 0 ? parsed.estimatedPrice : undefined,
        confidence,
      };
    } catch (error) {
      console.error("Product scanning failed:", error);
      if (error instanceof SyntaxError) {
        throw new Error("Failed to read product. Please try again with a clearer image.");
      }
      throw new Error(
        error instanceof Error
          ? error.message
          : "Failed to identify product. Please try again."
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
      variants: {
        variantName: string;
        size: string;
        unit: string;
        estimatedPrice: number;
      }[];
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
 * Parse a voice command transcript into a structured shopping intent.
 *
 * Uses Gemini (primary) + OpenAI (fallback) to understand natural language
 * commands like "Create a grocery list with milk and bread" or
 * "Add chicken and rice to my weekly shop".
 *
 * Returns structured JSON with action, list name, items, and confidence.
 */
export const parseVoiceCommand = action({
  args: {
    transcript: v.string(),
    currentScreen: v.string(),
    activeListId: v.optional(v.id("shoppingLists")),
    activeListName: v.optional(v.string()),
    recentLists: v.array(
      v.object({
        id: v.string(),
        name: v.string(),
      })
    ),
  },
  handler: async (ctx, args) => {
    if (!args.transcript.trim()) {
      return {
        action: "unsupported" as const,
        listName: null,
        matchedListId: null,
        items: [],
        confidence: 0,
        rawTranscript: args.transcript,
        error: "Empty transcript",
      };
    }

    const recentListsBlock =
      args.recentLists.length > 0
        ? args.recentLists
            .map((l) => `  - id: "${l.id}", name: "${l.name}"`)
            .join("\n")
        : "  (none)";

    const prompt = `You are a shopping list voice command parser for a UK grocery app called Oja.

Parse the user's spoken command into a structured JSON response.

## Rules
1. Identify the ACTION:
   - "create_list": user wants to make a NEW list (keywords: "create", "make", "new list", "start a list")
   - "add_to_list": user wants to add items to an EXISTING list (keywords: "add", "put", "get", or just item names)
   - "unsupported": any other intent (editing, deleting, navigating, questions)

2. Extract LIST NAME:
   - For "create_list": extract the list name from the command. If none given, use "Shopping List".
   - For "add_to_list": fuzzy-match against existing lists below. If user says a list name, match it.
     If no list name mentioned, use context rules:
     - If user is on a list detail screen, use that list's ID.
     - Otherwise use the most recently created list.
     - If no lists exist, switch action to "create_list" with name "Shopping List".

3. Extract ITEMS as an array:
   - Each item must have: name (string), quantity (number, default 1), unit (optional string)
   - "2 pints of milk" → { "name": "milk", "quantity": 2, "unit": "pint" }
   - "chicken thighs" → { "name": "chicken thighs", "quantity": 1 } (compound noun = ONE item)
   - "rice, chicken, and beans" → THREE separate items, each quantity 1
   - "a dozen eggs" → { "name": "eggs", "quantity": 12, "unit": "each" }
   - "half a kilo of mince" → { "name": "mince", "quantity": 0.5, "unit": "kg" }
   - UK grocery context: recognise brands (Weetabix, PG Tips, Warburtons) and cultural items (plantain, yam, scotch bonnet, jollof spice mix)

4. Set CONFIDENCE (0-1):
   - 1.0: clear intent, clear items
   - 0.7-0.9: intent clear but some ambiguity in items
   - 0.3-0.6: unclear intent or garbled speech
   - Below 0.3: likely nonsense or unrelated speech

## User Context
- Current screen: ${args.currentScreen}
- Active list: ${args.activeListId ? `id="${args.activeListId}", name="${args.activeListName}"` : "none"}
- Recent lists:
${recentListsBlock}

## User's spoken command
"${args.transcript}"

## Response Format
Respond with ONLY valid JSON, no markdown, no explanation:
{
  "action": "create_list" | "add_to_list" | "unsupported",
  "listName": "string or null",
  "matchedListId": "string or null",
  "items": [{ "name": "string", "quantity": number, "unit": "string or null" }],
  "confidence": number,
  "rawTranscript": "${args.transcript.replace(/"/g, '\\"')}",
  "error": "string or null"
}`;

    const parseResponse = (raw: string) => {
      const cleaned = stripCodeBlocks(raw);
      try {
        const parsed = JSON.parse(cleaned);
        // Validate required fields
        if (
          !parsed.action ||
          !["create_list", "add_to_list", "unsupported"].includes(
            parsed.action
          )
        ) {
          parsed.action = "unsupported";
          parsed.error = "Could not determine intent";
          parsed.confidence = 0.1;
        }
        // Ensure items is always an array
        if (!Array.isArray(parsed.items)) {
          parsed.items = [];
        }
        // Normalize items
        parsed.items = parsed.items.map(
          (item: { name?: string; quantity?: number; unit?: string | null }) => ({
            name: item.name || "unknown item",
            quantity:
              typeof item.quantity === "number" && item.quantity > 0
                ? item.quantity
                : 1,
            unit: item.unit || null,
          })
        );
        parsed.rawTranscript = args.transcript;
        return parsed;
      } catch {
        return {
          action: "unsupported",
          listName: null,
          matchedListId: null,
          items: [],
          confidence: 0.1,
          rawTranscript: args.transcript,
          error: "Failed to parse AI response",
        };
      }
    };

    return await withAIFallback(
      async () => {
        const raw = await geminiGenerate(prompt, {
          temperature: 0.2,
          maxTokens: 1000,
        });
        return parseResponse(raw);
      },
      async () => {
        const raw = await openaiGenerate(prompt, {
          temperature: 0.2,
          maxTokens: 1000,
        });
        return parseResponse(raw);
      },
      "parseVoiceCommand"
    );
  },
});

// ─── Voice Assistant (Function-Calling) ────────────────────────────────

/**
 * Context-aware voice assistant using Gemini function calling.
 *
 * Accepts a transcript and conversation history, lets Gemini decide which
 * Convex queries/mutations to call, feeds the results back, and returns a
 * natural language response. Write operations execute immediately — if
 * required info is missing, Gemini asks conversationally first.
 */
export const voiceAssistant = action({
  args: {
    transcript: v.string(),
    currentScreen: v.string(),
    activeListId: v.optional(v.id("shoppingLists")),
    activeListName: v.optional(v.string()),
    activeListBudget: v.optional(v.number()),
    activeListSpent: v.optional(v.number()),
    activeListsCount: v.optional(v.number()),
    lowStockCount: v.optional(v.number()),
    userName: v.optional(v.string()),
    conversationHistory: v.optional(
      v.array(
        v.object({
          role: v.union(v.literal("user"), v.literal("model")),
          text: v.string(),
        })
      )
    ),
  },
  handler: async (ctx, args) => {
    // Empty transcript guard
    if (!args.transcript.trim()) {
      return {
        type: "error" as const,
        text: "I didn't catch that. Try again?",
        pendingAction: null,
      };
    }

    // Check and increment voice usage
    const usageResult = await ctx.runMutation(api.aiUsage.incrementUsage, {
      feature: "voice",
      tokenCount: 500, // Estimated tokens per voice request
    }) as { allowed: boolean; usage: number; limit: number; percentage: number; message?: string };

    if (!usageResult.allowed) {
      return {
        type: "limit_reached" as const,
        text: usageResult.message || "You've reached your monthly voice limit. Upgrade for more!",
        pendingAction: null,
        usage: {
          current: usageResult.usage,
          limit: usageResult.limit,
          percentage: usageResult.percentage,
        },
      };
    }

    const systemPrompt = buildSystemPrompt({
      currentScreen: args.currentScreen,
      activeListId: args.activeListId,
      activeListName: args.activeListName,
      activeListBudget: args.activeListBudget,
      activeListSpent: args.activeListSpent,
      activeListsCount: args.activeListsCount,
      lowStockCount: args.lowStockCount,
      userName: args.userName,
    });

    try {
      // Build Gemini model with function declarations
      const model = genAI.getGenerativeModel({
        model: "gemini-2.0-flash",
        systemInstruction: systemPrompt,
        tools: [{ functionDeclarations: voiceFunctionDeclarations }],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 500,
        },
      });

      // Build conversation history for multi-turn
      const history = (args.conversationHistory || []).map((msg) => ({
        role: msg.role as "user" | "model",
        parts: [{ text: msg.text }],
      }));

      const chat = model.startChat({ history });
      let response = await chat.sendMessage(args.transcript);

       
      let pendingAction: {
        action: string;
         
        params: Record<string, any>;
        confirmLabel: string;
      } | null = null;

      // Function-call loop (max 3 iterations to prevent runaway)
      for (let i = 0; i < 3; i++) {
        const candidate = response.response.candidates?.[0];
        const functionCallPart = candidate?.content?.parts?.find(
          (p) => p.functionCall
        );

        if (!functionCallPart?.functionCall) break;

        const { name, args: fnArgs } = functionCallPart.functionCall;
        console.log(`[voiceAssistant] Tool call ${i + 1}: ${name}`, fnArgs);

        const toolResult = await executeVoiceTool(
          ctx,
          name,
          (fnArgs as Record<string, unknown>) || {}
        );

        if (toolResult.type === "confirm") {
          pendingAction = {
            action: toolResult.result.action,
            params: toolResult.result.params,
            confirmLabel: toolResult.result.description,
          };
        }

        // Send function response back to Gemini
        response = await chat.sendMessage([
          {
            functionResponse: {
              name,
              response: toolResult.result,
            },
          },
        ]);
      }

      const finalText =
        response.response.text() || "Sorry, I couldn't process that.";

      return {
        type: pendingAction ? ("confirm_action" as const) : ("answer" as const),
        text: finalText,
        pendingAction,
      };
    } catch (error) {
      console.error("[voiceAssistant] Gemini failed, trying OpenAI fallback:", error);

      // Degraded fallback: simple prompt without function calling
      try {
        const fallbackPrompt = `${buildSystemPrompt({
          currentScreen: args.currentScreen,
          activeListId: args.activeListId,
          activeListName: args.activeListName,
          userName: args.userName,
        })}

The user said: "${args.transcript}"

You cannot look up any data right now. If they asked a question about their data, apologise and suggest they check the app directly. If they want to create a list or add items, let them know you can't do that right now. Be warm and helpful.`;

        const fallbackResponse = await openaiGenerate(fallbackPrompt, {
          temperature: 0.3,
          maxTokens: 300,
        });

        return {
          type: "answer" as const,
          text: fallbackResponse || "I'm having a bit of trouble. Try again in a moment?",
          pendingAction: null,
        };
      } catch {
        return {
          type: "error" as const,
          text: "I'm having trouble right now. You can still use the app normally!",
          pendingAction: null,
        };
      }
    }
  },
});

/**
 * Execute a confirmed voice action (write operation).
 *
 * Called by the client after the user confirms a pendingAction
 * returned by voiceAssistant.
 */
export const executeVoiceAction = action({
  args: {
    actionName: v.string(),
    params: v.any(),
  },
  handler: async (ctx, args): Promise<{ success: boolean; message: string; listId?: string }> => {
    console.log(`[executeVoiceAction] ${args.actionName}`, args.params);

    switch (args.actionName) {
      case "create_shopping_list": {
        const listId = await ctx.runMutation(api.shoppingLists.create, {
          name: args.params.name,
          budget: args.params.budget,
          storeName: args.params.storeName,
        });
        return { success: true, listId, message: `Created "${args.params.name}"` };
      }

      case "add_items_to_list": {
        const items = args.params.items || [];
        const listId = args.params.listId;

        // If no listId, try to find by name
        let targetListId = listId;
        if (!targetListId && args.params.listName) {
          const lists = await ctx.runQuery(api.shoppingLists.getActive, {});
          const match = lists.find(
             
            (l: any) =>
              l.name.toLowerCase().includes(args.params.listName.toLowerCase())
          );
          if (match) targetListId = match._id;
        }

        if (!targetListId) {
          // Fall back to most recent active list
          const lists = await ctx.runQuery(api.shoppingLists.getActive, {});
          if (lists.length > 0) targetListId = lists[0]._id;
        }

        if (!targetListId) {
          return { success: false, message: "No shopping list found to add items to." };
        }

        for (const item of items) {
          await ctx.runMutation(api.listItems.create, {
            listId: targetListId,
            name: item.name,
            quantity: item.quantity || 1,
            unit: item.unit,
            priority: "should-have",
          });
        }

        return { success: true, message: `Added ${items.length} item(s)` };
      }

      case "update_stock_level": {
        // Find pantry item by name
        const pantryItems = await ctx.runQuery(api.pantryItems.getByUser, {});
        const match = pantryItems.find(
           
          (p: any) =>
            p.name.toLowerCase().includes(args.params.itemName.toLowerCase())
        );
        if (!match) {
          return { success: false, message: `Couldn't find "${args.params.itemName}" in your pantry.` };
        }
        await ctx.runMutation(api.pantryItems.updateStockLevel, {
          id: match._id,
          stockLevel: args.params.stockLevel,
        });
        return { success: true, message: `Marked ${match.name} as ${args.params.stockLevel}` };
      }

      case "check_off_item": {
        // Find list item by name
        const listId = args.params.listId;
        if (!listId) {
          return { success: false, message: "No list specified to check off from." };
        }
        const listItems = await ctx.runQuery(api.listItems.getByList, {
          listId,
        });
        const match = listItems.find(
           
          (i: any) =>
            i.name.toLowerCase().includes(args.params.itemName.toLowerCase())
        );
        if (!match) {
          return { success: false, message: `Couldn't find "${args.params.itemName}" on this list.` };
        }
        await ctx.runMutation(api.listItems.toggleChecked, { id: match._id });
        return { success: true, message: `Checked off ${match.name}` };
      }

      case "add_pantry_item": {
        await ctx.runMutation(api.pantryItems.create, {
          name: args.params.name,
          category: args.params.category || "Other",
          stockLevel: args.params.stockLevel || "stocked",
        });
        return { success: true, message: `Added ${args.params.name} to pantry` };
      }

      default:
        return { success: false, message: `Unknown action: ${args.actionName}` };
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

  // Normalize all items to "low" stock level - one swipe to adjust
  return allItems.map(item => ({ ...item, stockLevel: "low" as const }));
}

// ─── Text-to-Speech (Google Cloud → Azure → expo-speech fallback) ──────

/**
 * Convert text to speech with cascading providers:
 * 1. Azure Cognitive Services - RyanNeural (British English male, warm London-style)
 * 2. Google Cloud TTS Neural2 (British English fallback)
 * 3. Returns null → client falls back to expo-speech (device TTS)
 */
export const textToSpeech = action({
  args: {
    text: v.string(),
    voiceGender: v.optional(v.union(v.literal("FEMALE"), v.literal("MALE"))),
  },
  handler: async (_, args): Promise<{ audioBase64: string | null; provider: string | null; error: string | null }> => {
    const googleKey = process.env.GOOGLE_CLOUD_API_KEY;
    const azureKey = process.env.AZURE_SPEECH_KEY;
    const azureRegion = process.env.AZURE_SPEECH_REGION || "uksouth";

    // ── 1. Try Azure Cognitive Services (Primary - British English) ────
    if (azureKey) {
      try {
        // RyanNeural: British English male - warm, natural (London-style)
        // Fallback female: SoniaNeural (British)
        const voiceName = args.voiceGender === "FEMALE"
          ? "en-GB-SoniaNeural"
          : "en-GB-RyanNeural";

        const ssml = `
          <speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="en-GB">
            <voice name="${voiceName}">
              ${args.text}
            </voice>
          </speak>
        `;

        const response = await fetch(
          `https://${azureRegion}.tts.speech.microsoft.com/cognitiveservices/v1`,
          {
            method: "POST",
            headers: {
              "Ocp-Apim-Subscription-Key": azureKey,
              "Content-Type": "application/ssml+xml",
              "X-Microsoft-OutputFormat": "audio-16khz-128kbitrate-mono-mp3",
            },
            body: ssml,
          }
        );

        if (response.ok) {
          const arrayBuffer = await response.arrayBuffer();
          // Convert ArrayBuffer to base64 without Node's Buffer (Convex runtime compatible)
          const bytes = new Uint8Array(arrayBuffer);
          let binary = "";
          for (let i = 0; i < bytes.byteLength; i++) {
            binary += String.fromCharCode(bytes[i]);
          }
          const base64 = btoa(binary);
          return { audioBase64: base64, provider: "azure", error: null };
        }
        console.warn("[textToSpeech] Azure TTS failed:", response.status);
      } catch (error) {
        console.warn("[textToSpeech] Azure TTS error:", error);
      }
    }

    // ── 2. Try Google Cloud TTS (Fallback - British English) ─────────────
    if (googleKey) {
      try {
        const voiceName = args.voiceGender === "MALE"
          ? "en-GB-Neural2-D"
          : "en-GB-Neural2-C";

        const response = await fetch(
          `https://texttospeech.googleapis.com/v1/text:synthesize?key=${googleKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              input: { text: args.text },
              voice: {
                languageCode: "en-GB",
                name: voiceName,
                ssmlGender: args.voiceGender || "FEMALE",
              },
              audioConfig: {
                audioEncoding: "MP3",
                speakingRate: 1.0,
                pitch: 0,
                effectsProfileId: ["small-bluetooth-speaker-class-device"],
              },
            }),
          }
        );

        if (response.ok) {
          const data = await response.json();
          return { audioBase64: data.audioContent, provider: "google", error: null };
        }
        console.warn("[textToSpeech] Google TTS failed:", response.status);
      } catch (error) {
        console.warn("[textToSpeech] Google TTS error:", error);
      }
    }

    // ── 3. No cloud TTS available → client uses expo-speech ─────────────
    console.log("[textToSpeech] No cloud TTS configured, falling back to device TTS");
    return { audioBase64: null, provider: null, error: null };
  },
});
