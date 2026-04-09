import { action } from "../_generated/server";
import { api, internal } from "../_generated/api";
import { v } from "convex/values";
import {
  withAIFallbackInstrumented,
  geminiGenerateInstrumented,
  openaiGenerateInstrumented,
  stripCodeBlocks,
  enforceGeminiQuota,
  GeminiQuotaExhaustedError,
} from "./shared";
import { toGroceryTitleCase } from "../lib/titleCase";
import { cleanItemForStorage } from "../lib/itemNameParser";
import { AI_CATEGORY_PROMPT } from "../lib/categoryNormalizer";
import { getCuisineFoods } from "../lib/cuisineFoods";

export interface SeedItem {
  name: string;
  category: string;
  stockLevel: "stocked" | "low" | "out";
  source?: "local" | "cultural";
  estimatedPrice?: number;
  hasVariants?: boolean;
  defaultSize?: string;
  defaultUnit?: string;
}

interface PopularVariant {
  name: string;
  category: string;
  size: string;
  unit: string;
  brand?: string;
  estimatedPrice?: number;
  source: string;
  scanCount: number;
  userCount: number;
}

function deduplicateItems(items: SeedItem[]): SeedItem[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    if (!item.name) return false;
    const key = item.name.toLowerCase().trim();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export const generateHybridSeedItems = action({
  args: {
    country: v.string(),
    cuisines: v.array(v.string()),
  },
  handler: async (ctx, args): Promise<SeedItem[]> => {
    const { country, cuisines } = args;
    const totalItems = 200;

    // Check per-user monthly cap — fall back to hardcoded items if exceeded
    const usageCheck = await ctx.runQuery(api.aiUsage.canUseFeature, { feature: "pantry_seed" });
    if (!usageCheck.allowed) return getFallbackItems(country, cuisines);

    // Enforce Gemini free tier RPD quota — fall back to hardcoded items if exhausted
    try {
      await enforceGeminiQuota(ctx);
    } catch (e) {
      if (e instanceof GeminiQuotaExhaustedError) {
        return getFallbackItems(country, cuisines);
      }
      throw e;
    }

    let globalItems: SeedItem[] = [];
    try {
      const popularVariants = await ctx.runQuery(
        internal.itemVariants.getPopularForSeeding,
        { limit: totalItems }
      );

      if (popularVariants.length > 0) {
        const variants = popularVariants as PopularVariant[];
        const normalizedNames = variants.map((variant) =>
          (variant.name ?? "").toLowerCase().trim()
        );
        const crowdPrices = await ctx.runQuery(
          internal.currentPrices.getBatchPrices,
          { normalizedNames }
        );

        globalItems = variants.map((variant) => {
          const normName = (variant.name ?? "").toLowerCase().trim();
          const crowdPrice = crowdPrices[normName];
          return {
            name: variant.name,
            category: variant.category,
            stockLevel: "low" as const,
            source: "local" as const,
            estimatedPrice: crowdPrice?.price ?? variant.estimatedPrice,
            hasVariants: true,
            defaultSize: variant.size,
            defaultUnit: variant.unit,
          };
        });
      }
    } catch (error) {
      console.warn("[generateHybridSeedItems] Global DB query failed:", error);
    }

    const remainingSlots = totalItems - globalItems.length;
    if (remainingSlots <= 0) {
      return deduplicateItems(globalItems).slice(0, totalItems);
    }

    // H1 fix: Sanitize user inputs before injecting into AI prompt
    const sanitize = (s: string) => s.replace(/[^\w\s,'-]/g, "").slice(0, 50);
    const safeCountry = sanitize(country);
    const safeCuisines = cuisines.map(sanitize).filter(Boolean);
    if (safeCuisines.length === 0) {
      return deduplicateItems([...globalItems, ...getFallbackItems(country, cuisines)]).slice(0, totalItems);
    }
    const cuisineList = safeCuisines.join(", ");
    const existingNames = new Set(globalItems.map((i) => i.name.toLowerCase().trim()));
    const isFullGeneration = remainingSlots === totalItems;
    const itemCount = isFullGeneration ? totalItems : remainingSlots;

    let prompt: string;
    if (isFullGeneration) {
      const localItems = Math.floor(totalItems * 0.6);
      const culturalItems = totalItems - localItems;
      const itemsPerCuisine = Math.floor(culturalItems / safeCuisines.length);
      const cuisineBreakdown = safeCuisines.map((c) => `   - ${itemsPerCuisine} items for ${c} cuisine`).join("\n");

      prompt = `Generate a realistic stock starter list for a household in ${safeCountry} with cuisines: ${cuisineList}.
TASK: Generate exactly ${totalItems} household stock items in JSON format:
1. ${localItems} local staples (milk, bread, paper goods, etc.)
2. ${culturalItems} items for:
${cuisineBreakdown}

CATEGORIES: ${AI_CATEGORY_PROMPT}

Return ONLY JSON array of items with name, category, stockLevel, source, estimatedPrice, hasVariants, defaultSize, defaultUnit.`;
    } else {
      prompt = `Generate exactly ${remainingSlots} additional household stock items for ${safeCountry} / ${cuisineList}.
DO NOT duplicate: ${globalItems.slice(0, 50).map(i => i.name).join(", ")}.
Return ONLY JSON array.`;
    }

    function parseSeedResponse(responseText: string): SeedItem[] {
      const cleaned = stripCodeBlocks(responseText);
      const parsed = JSON.parse(cleaned);
      // M4 fix: Validate parsed response is an array of objects with required fields
      if (!Array.isArray(parsed)) {
        console.warn("[parseSeedResponse] AI response is not an array");
        return [];
      }
      const items = parsed as Record<string, unknown>[];
      return items
        .filter((item): item is SeedItem & Record<string, unknown> =>
          typeof item.name === "string" && typeof item.category === "string" && item.name.length > 0
        )
        .filter((item) => !existingNames.has(item.name.toLowerCase().trim()))
        .map((item) => {
          const size = typeof item.defaultSize === "string" ? item.defaultSize : undefined;
          const unit = typeof item.defaultUnit === "string" ? item.defaultUnit : undefined;
          const cleanedItem = cleanItemForStorage(item.name, size, unit);
          return {
            ...item,
            name: cleanedItem.name,
            defaultSize: cleanedItem.size,
            defaultUnit: cleanedItem.unit,
            stockLevel: "low" as const,
            source: item.source === "cultural" ? "cultural" as const : "local" as const,
          };
        })
        .slice(0, itemCount);
    }

    try {
      const { result: aiItems, metrics: aiMetrics } = await withAIFallbackInstrumented(
        isFullGeneration ? "generateHybridSeedItems" : "generateHybridSeedItems-gap",
        async () => {
          const { result, metrics } = await geminiGenerateInstrumented(prompt, { temperature: 0.8, maxTokens: 16000 });
          return { result: parseSeedResponse(result), metrics };
        },
        async () => {
          const { result, metrics } = await openaiGenerateInstrumented(prompt, { temperature: 0.8, maxTokens: 16000 });
          return { result: parseSeedResponse(result), metrics };
        }
      );

      // Track AI usage
      await ctx.runMutation(api.aiUsage.trackAICall, {
        feature: "pantry_seed",
        provider: aiMetrics.provider,
        inputTokens: aiMetrics.inputTokens,
        outputTokens: aiMetrics.outputTokens,
        estimatedCostUsd: aiMetrics.estimatedCostUsd,
        isVision: false,
        isFallback: aiMetrics.isFallback,
      });
      // Supplement with cuisine-specific items to fill any gaps
      const cuisineFallback = getFallbackItems(country, cuisines);
      return deduplicateItems([...globalItems, ...aiItems, ...cuisineFallback]).slice(0, totalItems);
    } catch (error) {
      console.error("AI generation failed:", error);
      try { await ctx.runMutation(api.aiUsage.trackAICallError, { feature: "pantry_seed" }); } catch (trackErr) { console.error("[pantry seed] Failed to track AI error:", trackErr); }
      const fallback = getFallbackItems(country, cuisines);
      return deduplicateItems([...globalItems, ...fallback]).slice(0, totalItems);
    }
  },
});

export function getFallbackItems(_country: string, cuisines: string[]): SeedItem[] {
  const cuisineItems = getCuisineFoods(cuisines, 200);
  return cuisineItems.map((item) => ({
    name: item.name,
    category: item.category,
    stockLevel: "low" as const,
    source: item.source,
    estimatedPrice: item.estimatedPrice,
    hasVariants: item.hasVariants,
    defaultSize: item.defaultSize,
    defaultUnit: item.defaultUnit,
  }));
}
