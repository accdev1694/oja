import { action } from "../_generated/server";
import { api, internal } from "../_generated/api";
import { v } from "convex/values";
import { 
  withAIFallback, 
  geminiGenerate, 
  openaiGenerate, 
  stripCodeBlocks 
} from "./shared";
import { toGroceryTitleCase } from "../lib/titleCase";

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

    const cuisineList = cuisines.join(", ");
    const existingNames = new Set(globalItems.map((i) => i.name.toLowerCase().trim()));
    const isFullGeneration = remainingSlots === totalItems;
    const itemCount = isFullGeneration ? totalItems : remainingSlots;

    let prompt: string;
    if (isFullGeneration) {
      const localItems = Math.floor(totalItems * 0.6);
      const culturalItems = totalItems - localItems;
      const itemsPerCuisine = Math.floor(culturalItems / cuisines.length);
      const cuisineBreakdown = cuisines.map((c) => `   - ${itemsPerCuisine} items for ${c} cuisine`).join("\n");

      prompt = `Generate a realistic stock starter list for a household in ${country} with cuisines: ${cuisineList}.
TASK: Generate exactly ${totalItems} household stock items in JSON format:
1. ${localItems} local staples (milk, bread, paper goods, etc.)
2. ${culturalItems} items for:
${cuisineBreakdown}

CATEGORIES: Dairy, Bakery, Produce, Meat, Pantry Staples, Spices & Seasonings, Condiments, Beverages, Snacks, Frozen, Canned Goods, Grains & Pasta, Oils & Vinegars, Baking, Ethnic Ingredients, Household, Personal Care, Health & Wellness, Baby & Kids, Pets, Electronics, Clothing, Garden & Outdoor, Office & Stationery

Return ONLY JSON array of items with name, category, stockLevel, source, estimatedPrice, hasVariants, defaultSize, defaultUnit.`;
    } else {
      prompt = `Generate exactly ${remainingSlots} additional household stock items for ${country} / ${cuisineList}.
DO NOT duplicate: ${globalItems.slice(0, 50).map(i => i.name).join(", ")}.
Return ONLY JSON array.`;
    }

    function parseSeedResponse(responseText: string): SeedItem[] {
      const cleaned = stripCodeBlocks(responseText);
      const items: SeedItem[] = JSON.parse(cleaned);
      return items
        .filter((item) => item.name && item.category)
        .filter((item) => !existingNames.has(item.name.toLowerCase().trim()))
        .map((item) => ({
          ...item,
          stockLevel: "low" as const,
          source: item.source === "cultural" ? "cultural" as const : "local" as const,
        }))
        .slice(0, itemCount);
    }

    try {
      const aiItems = await withAIFallback(
        isFullGeneration ? "generateHybridSeedItems" : "generateHybridSeedItems-gap",
        async () => parseSeedResponse(await geminiGenerate(prompt, { temperature: 0.8 })),
        async () => parseSeedResponse(await openaiGenerate(prompt, { temperature: 0.8 }))
      );
      return deduplicateItems([...globalItems, ...aiItems]).slice(0, totalItems);
    } catch (error) {
      console.error("AI generation failed:", error);
      const fallback = getFallbackItems(country, cuisines);
      return deduplicateItems([...globalItems, ...fallback]).slice(0, totalItems);
    }
  },
});

export function getFallbackItems(country: string, cuisines: string[]): SeedItem[] {
  const localItems: SeedItem[] = [
    { name: "Whole Milk", category: "Dairy", stockLevel: "low", estimatedPrice: 1.15, hasVariants: true },
    { name: "Butter", category: "Dairy", stockLevel: "low", estimatedPrice: 1.85, hasVariants: false, defaultSize: "250g", defaultUnit: "g" },
    { name: "Eggs", category: "Dairy", stockLevel: "low", estimatedPrice: 2.10, hasVariants: true },
    { name: "White Bread", category: "Bakery", stockLevel: "low", estimatedPrice: 1.10, hasVariants: false, defaultSize: "800g loaf", defaultUnit: "loaf" },
    { name: "Pasta", category: "Pantry Staples", stockLevel: "low", estimatedPrice: 0.70, hasVariants: true },
    { name: "Chopped Tomatoes", category: "Canned Goods", stockLevel: "low", estimatedPrice: 0.55, hasVariants: false, defaultSize: "400g tin", defaultUnit: "tin" },
    { name: "Toilet Roll", category: "Household", stockLevel: "low", estimatedPrice: 3.50, hasVariants: true },
  ];
  return localItems;
}
