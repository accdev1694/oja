import { action } from "../_generated/server";
import { api } from "../_generated/api";
import { v } from "convex/values";
import {
  withAIFallbackInstrumented,
  genAI,
  openaiVisionGenerateInstrumented,
  stripCodeBlocks,
  enforceGeminiQuota,
  GeminiQuotaExhaustedError,
} from "./shared";
import { metricsFromGemini } from "../lib/aiTracking";
import type { AICallMetrics } from "../lib/aiTracking";
import { toGroceryTitleCase } from "../lib/titleCase";
import { AI_CATEGORY_PROMPT, normalizeCategory } from "../lib/categoryNormalizer";

/**
 * Parse receipt using Gemini Vision API
 * Extracts store name, date, items, prices, totals
 */
export const parseReceipt = action({
  args: {
    storageId: v.string(), // Convex file storage ID
  },
  handler: async (ctx, args) => {
    // 1. Rate Limit (Phase 2.1)
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    
    const rateLimit = await ctx.runMutation(api.aiUsage.checkRateLimit, { feature: "receipt_scan" });
    if (!rateLimit.allowed) {
      throw new Error("Scan rate limit reached. Please wait a minute before scanning again.");
    }

    // Enforce Gemini free tier RPD quota
    await enforceGeminiQuota(ctx);

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

      // Generate SHA-256 hash for fraud prevention
      const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const imageHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

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
   - Item name: Concise but descriptive product name, MAX 30 CHARACTERS. FORMAT: "{size} {descriptor} {product type}". SIZE/QUANTITY COMES FIRST, then a key descriptor if useful, then WHAT THE PRODUCT IS. CRITICAL RULES: (a) NEVER use just a brand name — always describe what the product IS (e.g., "Merevale 12" MUST become "12pk Medium Eggs", "Yeo Valley" MUST become "500g Natural Yoghurt"). (b) DROP all brand/own-label names (Tesco, Asda, Aldi, Merevale, Hearty Food Co, etc.) UNLESS the brand IS the product identity (e.g., "Coke Zero", "PG Tips", "Marmite"). (c) KEEP useful descriptors: size (medium/large), type (whole/semi-skimmed), style (free-range/organic). (d) If the receipt shows a size, include it first. If not printed, estimate the standard UK size. Examples: "12pk Medium Eggs", "2pt Semi-Skimmed Milk", "500g Chicken Breast", "800g Wholemeal Bread", "400g Baked Beans", "2L Coke Zero", "80pk PG Tips Tea Bags", "6pk Free Range Eggs".
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
      "name": "Semi-Skimmed Milk",
      "size": "2pt",
      "unit": "pint",
      "quantity": 1,
      "unitPrice": 1.15,
      "totalPrice": 1.15,
      "confidence": 95
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

      const { result: parsed, metrics: aiMetrics } = await withAIFallbackInstrumented(
        "parseReceipt",
        async () => {
          const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite" });
          const result = await model.generateContent([
            { text: receiptPrompt },
            { inlineData: { mimeType: "image/jpeg", data: base64Image } },
          ]);
          const metrics = metricsFromGemini(result.response.usageMetadata, true);
          return { result: JSON.parse(stripCodeBlocks(result.response.text().trim())), metrics };
        },
        async () => {
          const { result: text, metrics } = await openaiVisionGenerateInstrumented(receiptPrompt, base64Image);
          return { result: JSON.parse(stripCodeBlocks(text)), metrics };
        }
      );

      // Track AI usage with actual metrics
      await ctx.runMutation(api.aiUsage.trackAICall, {
        feature: "receipt_scan",
        provider: aiMetrics.provider,
        inputTokens: aiMetrics.inputTokens,
        outputTokens: aiMetrics.outputTokens,
        estimatedCostUsd: aiMetrics.estimatedCostUsd,
        isVision: true,
        isFallback: aiMetrics.isFallback,
      });

      const imageQuality = typeof parsed.imageQuality === "number" ? parsed.imageQuality : 50;

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
          imageHash,
        };
      }

      const storeName = parsed.storeName || "Unknown Store";
      const rawItems = Array.isArray(parsed.items) ? parsed.items : [];
      const total = typeof parsed.total === "number" ? parsed.total : 0;

      const NON_PRODUCT_PATTERNS = /^(balance due|amount tendered|change|cash|card payment|subtotal|total|charity donation|carrier bag|price cut|savings|clubcard|nectar|meal deal saving|price crunch|bag charge|vat|receipt|thank you|points)/i;
      const items = rawItems.filter((item: { name: string; totalPrice?: number; unitPrice?: number; quantity?: number }) => {
        if (typeof item.name === "string" && NON_PRODUCT_PATTERNS.test(item.name.trim())) {
          return false;
        }
        if (typeof item.totalPrice === "number" && item.totalPrice < 0) return false;
        if (typeof item.unitPrice === "number" && item.unitPrice < 0) return false;
        if (typeof item.quantity === "number" && item.quantity < 0) return false;
        return true;
      });

      for (const item of items) {
        const itemWithConf = item as { confidence?: number; name: string };
        if (typeof itemWithConf.confidence !== "number") {
          itemWithConf.confidence = imageQuality >= 70 ? 75 : 40;
        }
        itemWithConf.name = toGroceryTitleCase(itemWithConf.name);
      }

      if (items.length > 0) {
        const avgItemConfidence =
          items.reduce((sum: number, item: { confidence?: number }) => sum + (typeof item.confidence === "number" ? item.confidence : 50), 0) / items.length;
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
            imageHash,
          };
        }
      }

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
          imageHash,
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
        imageHash,
      };
    } catch (error) {
      console.error("Receipt parsing failed:", error);
      try { await ctx.runMutation(api.aiUsage.trackAICallError, { feature: "receipt_scan" }); } catch {}
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
 */
export const scanProduct = action({
  args: {
    storageId: v.string(),
  },
  handler: async (ctx, args) => {
    // Check per-user monthly cap
    const usageCheck = await ctx.runQuery(api.aiUsage.canUseFeature, { feature: "product_scan" });
    if (!usageCheck.allowed) {
      return { success: false, rejection: "You've reached your monthly product scan limit. Upgrade for more.", confidence: 0 };
    }

    // Enforce Gemini free tier RPD quota
    try {
      await enforceGeminiQuota(ctx);
    } catch (e) {
      if (e instanceof GeminiQuotaExhaustedError) {
        return { success: false, rejection: "AI capacity reached for today. Please try again tomorrow.", confidence: 0 };
      }
      throw e;
    }

    try {
      const imageUrl = await ctx.storage.getUrl(args.storageId);
      if (!imageUrl) {
        throw new Error("Failed to get image URL");
      }

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

      const productPrompt = `You are a UK grocery product identifier. Analyse this photo and extract details.
The photo shows a physical product (front, back, or side) or loose items.

FIELDS:
- name: (string) Brand + product type ONLY. MAX 25 chars. No size, no weight, no marketing copy. If over 25 chars, summarize to brand + core product. e.g. "Cantu Leave-In Conditioner", "Tesco Semi-Skimmed Milk", "Walkers Crisps", "Chicken Breast".
- category: (string) One of: ${AI_CATEGORY_PROMPT}.
- quantity: (number) Usually 1. Only use > 1 if you see multiple distinct packages of the exact same product.
- size: (string or null) ONE measurement only. e.g. "500g", "2L", "4 pack", "2pt". null if not visible.
- unit: (string or null) Unit from the size. e.g. "g", "L", "pack", "pt". null if size is null.
- sizeSource: (string) One of "visible", "estimated", or "unknown".
- brand: (string or null)
- estimatedPrice: (number) Best estimate of UK retail price in GBP.
- confidence: (number 0-100)

RULES:
- "name" must contain ONLY brand + product type. Never include size, weight, or flavour descriptions.
- "size" must be ONE metric measurement. Prefer: ml, L, g, kg, pints, pack. If label shows both metric and imperial (e.g. "227g (8oz)"), use ONLY the metric value ("227g"). Never include both.
- Total display will be "{size} {name}" so keep both concise.

Return ONLY valid JSON.`;

      const { result: parsed, metrics: aiMetrics } = await withAIFallbackInstrumented(
        "scanProduct",
        async () => {
          const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite" });
          const result = await model.generateContent([
            { text: productPrompt },
            { inlineData: { mimeType: "image/jpeg", data: base64Image } },
          ]);
          const metrics = metricsFromGemini(result.response.usageMetadata, true);
          return { result: JSON.parse(stripCodeBlocks(result.response.text().trim())), metrics };
        },
        async () => {
          const { result: text, metrics } = await openaiVisionGenerateInstrumented(productPrompt, base64Image);
          return { result: JSON.parse(stripCodeBlocks(text)), metrics };
        }
      );

      // Track AI usage with actual metrics
      await ctx.runMutation(api.aiUsage.trackAICall, {
        feature: "product_scan",
        provider: aiMetrics.provider,
        inputTokens: aiMetrics.inputTokens,
        outputTokens: aiMetrics.outputTokens,
        estimatedCostUsd: aiMetrics.estimatedCostUsd,
        isVision: true,
        isFallback: aiMetrics.isFallback,
      });

      const confidence = typeof parsed.confidence === "number" ? parsed.confidence : 0;

      if (parsed.rejection || confidence < 30) {
        return {
          success: false,
          rejection: (parsed.rejection as string) || "Product not recognised. Snap the label showing name and size.",
          confidence,
        };
      }

      return {
        success: true,
        name: typeof parsed.name === "string" ? toGroceryTitleCase(parsed.name.slice(0, 30)) : "Unknown Product",
        category: typeof parsed.category === "string" ? normalizeCategory(parsed.category) : "Other",
        quantity: typeof parsed.quantity === "number" ? parsed.quantity : 1,
        size: typeof parsed.size === "string" ? parsed.size : undefined,
        unit: typeof parsed.unit === "string" ? parsed.unit : undefined,
        brand: typeof parsed.brand === "string" ? parsed.brand : undefined,
        estimatedPrice: typeof parsed.estimatedPrice === "number" && isFinite(parsed.estimatedPrice) && parsed.estimatedPrice > 0 ? parsed.estimatedPrice : undefined,
        confidence,
        sizeSource: typeof parsed.sizeSource === "string" ? parsed.sizeSource : "unknown",
      };
    } catch (error) {
      console.error("Product scanning failed:", error);
      try { await ctx.runMutation(api.aiUsage.trackAICallError, { feature: "product_scan" }); } catch {}
      return {
        success: false,
        rejection: "Failed to identify product. Please try again.",
        confidence: 0,
      };
    }
  },
});
