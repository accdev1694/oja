import { action } from "../_generated/server";
import { api } from "../_generated/api";
import { v } from "convex/values";
import {
  smartGenerateInstrumented,
  stripCodeBlocks,
  enforceGeminiQuota,
  GeminiQuotaExhaustedError,
} from "./shared";

export const generateListSuggestions = action({
  args: {
    currentItems: v.array(v.string()),
    excludeItems: v.array(v.string()),
  },
  handler: async (ctx, args): Promise<string[]> => {
    const { currentItems, excludeItems } = args;
    if (currentItems.length === 0) return [];

    // Check per-user monthly cap — fall back to hardcoded pairings if exceeded
    const usageCheck = await ctx.runQuery(api.aiUsage.canUseFeature, { feature: "list_suggestions" });
    if (!usageCheck.allowed) return getFallbackSuggestions(currentItems);

    // Enforce Gemini free tier RPD quota — fall back to hardcoded pairings if exhausted
    try {
      await enforceGeminiQuota(ctx);
    } catch (e) {
      if (e instanceof GeminiQuotaExhaustedError) {
        return getFallbackSuggestions(currentItems);
      }
      throw e;
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
      const { result: response, metrics: aiMetrics } = await smartGenerateInstrumented(prompt, "generateListSuggestions", { maxTokens: 200 });

      // Track AI usage
      await ctx.runMutation(api.aiUsage.trackAICall, {
        feature: "list_suggestions",
        provider: aiMetrics.provider,
        inputTokens: aiMetrics.inputTokens,
        outputTokens: aiMetrics.outputTokens,
        estimatedCostUsd: aiMetrics.estimatedCostUsd,
        isVision: false,
        isFallback: aiMetrics.isFallback,
      });

      return parseSuggestions(response);
    } catch (error) {
      console.error("AI suggestion generation failed:", error);
      try { await ctx.runMutation(api.aiUsage.trackAICallError, { feature: "list_suggestions" }); } catch {}
      return getFallbackSuggestions(currentItems);
    }
  },
});

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
  return Array.from(suggestions).slice(0, 5);
}
