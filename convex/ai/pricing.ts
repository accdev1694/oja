import { action } from "../_generated/server";
import { api } from "../_generated/api";
import { v } from "convex/values";
import { 
  smartGenerate, 
  stripCodeBlocks 
} from "./shared";
import { toGroceryTitleCase } from "../lib/titleCase";

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
      const variants = JSON.parse(cleaned);
      if (!Array.isArray(variants)) throw new Error("Invalid variants response");
      return variants.map(v => ({
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
  },
  handler: async (ctx, args) => {
    const rateLimit = await ctx.runMutation(api.aiUsage.checkRateLimit, { feature: "ai_estimation" });
    if (!rateLimit.allowed) return null;

    const normalizedName = args.itemName.toLowerCase().trim();
    const prompt = `Provide current UK supermarket price, category, and variants for "${args.itemName}".
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
      });

      if (result.hasVariants && result.variants?.length > 0) {
        await ctx.runMutation(api.itemVariants.bulkUpsert, {
          variants: result.variants.map(v => ({
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
      };
    } catch (error) {
      console.error("estimateItemPrice failed:", error);
      return null;
    }
  },
});
