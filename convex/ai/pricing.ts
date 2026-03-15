import { action } from "../_generated/server";
import { api } from "../_generated/api";
import { v } from "convex/values";
import {
  smartGenerate,
  stripCodeBlocks
} from "./shared";
import { toGroceryTitleCase } from "../lib/titleCase";

interface ParsedVariant {
  baseItem: string;
  variantName: string;
  size: string;
  unit: string;
  category: string;
  estimatedPrice?: number;
}

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

    const prompt = `You are a UK grocery expert. For each item below, generate the 3-5 most common size variants that shoppers would find in UK supermarkets.
Items:
${itemList}
For each item, return variants with realistic current GBP prices.
Return ONLY valid JSON array:
[{"baseItem": "...", "variantName": "...", "size": "...", "unit": "...", "category": "...", "estimatedPrice": 1.15}, ...]`;

    function parseVariantResponse(text: string) {
      const cleaned = stripCodeBlocks(text);
      const variants: ParsedVariant[] = JSON.parse(cleaned);
      if (!Array.isArray(variants)) throw new Error("Invalid variants response");
      return variants.map((variant) => ({
        baseItem: variant.baseItem.toLowerCase().trim(),
        variantName: variant.variantName,
        size: variant.size,
        unit: variant.unit,
        category: variant.category,
        source: "ai_seeded" as const,
        estimatedPrice: typeof variant.estimatedPrice === "number" ? variant.estimatedPrice : undefined,
      }));
    }

    try {
      const response = await smartGenerate(prompt, "generateItemVariants", { temperature: 0.5 });
      return parseVariantResponse(response);
    } catch (error) {
      console.error("Variant generation failed:", error);
      return [];
    }
  },
});

export const estimateItemPrice = action({
  args: {
    itemName: v.string(),
    userId: v.id("users"),
    storeName: v.optional(v.string()),
    postcodePrefix: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const rateLimit = await ctx.runMutation(api.aiUsage.checkRateLimit, { feature: "ai_estimation" });
    if (!rateLimit.allowed) return null;

    const normalizedName = args.itemName.toLowerCase().trim();

    // Fetch crowdsourced price context
    let contextBlock = "";
    let isAnchored = false;
    try {
      const crowdPrices = await ctx.runQuery(api.currentPrices.getByItemName, {
        normalizedName,
      });

      const variants = await ctx.runQuery(api.itemVariants.getByBaseItem, {
        baseItem: normalizedName,
      });

      // Filter to store-specific prices if store provided
      const relevant = args.storeName
        ? crowdPrices.filter(
            (p) =>
              p.storeName?.toLowerCase() === args.storeName?.toLowerCase() ||
              p.normalizedStoreId === args.storeName
          )
        : crowdPrices;

      const best = relevant.length > 0 ? relevant[0] : crowdPrices[0];

      if (best) {
        isAnchored = true;
        contextBlock += "\nCommunity price data:";
        if (args.storeName) contextBlock += `\n- Store: ${args.storeName}`;
        if (args.postcodePrefix) contextBlock += `\n- Region: ${args.postcodePrefix}`;
        if (best.averagePrice) contextBlock += `\n- Average price: \u00A3${best.averagePrice.toFixed(2)} (${best.reportCount} reports)`;
        if (best.minPrice !== undefined && best.maxPrice !== undefined)
          contextBlock += `\n- Price range: \u00A3${best.minPrice.toFixed(2)} - \u00A3${best.maxPrice.toFixed(2)}`;
      }

      if (variants.length > 0) {
        const topVariants = [...variants]
          .sort((a, b) => (b.scanCount || 0) - (a.scanCount || 0))
          .slice(0, 3);
        contextBlock += `\nCommon sizes: ${topVariants.map((v) => v.variantName).join(", ")}`;
      }
    } catch {
      // Ignore -- context is optional
    }

    const prompt = `Provide current UK supermarket price, category, and variants for "${args.itemName}".${
      contextBlock
        ? `\n${contextBlock}\nUse the community data to anchor your estimate. Stay within the reported range unless you have strong reason to disagree.\n`
        : ""
    }
Return ONLY valid JSON: {"name": "...", "normalizedName": "...", "category": "...", "estimatedPrice": 1.15, "hasVariants": true, "variants": [...]}`;

    try {
      const response = await smartGenerate(prompt, "estimateItemPrice", { temperature: 0.3 });
      const result = JSON.parse(stripCodeBlocks(response));

      await ctx.runMutation(api.currentPrices.upsertAIEstimate, {
        normalizedName: result.normalizedName || normalizedName,
        itemName: toGroceryTitleCase(result.name || args.itemName),
        unitPrice: result.estimatedPrice,
        userId: args.userId,
        size: result.defaultSize || undefined,
        unit: result.defaultUnit || undefined,
        confidence: isAnchored ? 0.3 : undefined,
      });

      if (result.hasVariants && result.variants?.length > 0) {
        await ctx.runMutation(api.itemVariants.bulkUpsert, {
          variants: result.variants.map((variant: ParsedVariant) => ({
            baseItem: result.normalizedName || normalizedName,
            variantName: variant.variantName,
            size: variant.size,
            unit: variant.unit,
            category: result.category,
            source: "ai_seeded",
            estimatedPrice: variant.estimatedPrice,
          })),
        });
      }

      return {
        estimatedPrice: result.estimatedPrice,
        category: result.category,
        hasVariants: result.hasVariants,
        defaultSize: result.defaultSize,
        defaultUnit: result.defaultUnit,
      };
    } catch (error) {
      console.error("estimateItemPrice failed:", error);
      return null;
    }
  },
});
