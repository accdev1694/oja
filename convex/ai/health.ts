import { action } from "../_generated/server";
import { api, internal } from "../_generated/api";
import { v } from "convex/values";
import { Id, Doc } from "../_generated/dataModel";
import { smartGenerate, stripCodeBlocks } from "./shared";
import { calculateSimilarity } from "../lib/fuzzyMatch";
import { cleanItemForStorage } from "../lib/itemNameParser";

export interface HealthAnalysis {
  score: number;
  summary: string;
  strengths: string[];
  weaknesses: string[];
  swaps: {
    originalName: string;
    originalId?: Id<"listItems">;
    suggestedName: string;
    suggestedCategory?: string;
    suggestedSize?: string;
    suggestedUnit?: string;
    priceDelta?: number;
    scoreImpact?: number;
    reason: string;
  }[];
  itemCountAtAnalysis: number;
  updatedAt: number;
}

export const analyzeListHealth = action({
  args: {
    listId: v.id("shoppingLists"),
  },
  handler: async (ctx, args): Promise<HealthAnalysis> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.runQuery(api.users.getByClerkId, {
      clerkId: identity.subject,
    });
    if (!user) throw new Error("User not found");

    const items = (await ctx.runQuery(api.listItems.getByList, { listId: args.listId })) as Doc<"listItems">[];
    if (!items || items.length === 0) {
      throw new Error("Your list is empty! Add some items first so our AI nutritionist can analyze them.");
    }

    const list = await ctx.runQuery(api.shoppingLists.getById, { id: args.listId });
    const budgetInfo = list?.budget ? `Budget: £${list.budget}` : "No budget set";
    const userPrefs = user.cuisinePreferences?.length ? `User Cuisines: ${user.cuisinePreferences.join(", ")}` : "";
    const dietaryRestrictions = user.dietaryRestrictions?.length ? `Dietary Restrictions: ${user.dietaryRestrictions.join(", ")} (CRITICAL: Only suggest items that follow these)` : "";

    const itemsText = items.map((i) => `- ${i.name} (Qty: ${i.quantity}, Category: ${i.category || "Uncategorized"}, Est. Price: £${i.estimatedPrice || '?'})`).join("\n");

    const prompt = `You are an enthusiastic, modern AI nutritionist evaluating a grocery list.

USER PROFILE:
${userPrefs}
${dietaryRestrictions}
${budgetInfo}

Rate the healthiness of this list on a scale of 0 to 100. Provide an exciting, highly engaging summary (2-3 sentences max).
Identify 1-2 strengths and 1-2 weaknesses.
Suggest up to 3 healthy swaps for specific items on the list.

REQUIREMENTS FOR SWAPS:
1. Practical & Budget-Conscious.
2. Price Delta (estimate GBP difference).
3. Budget Limit: If price increases > 50% or exceeds total budget, skip.
4. Dietary Compliance: Ensure swaps comply with restrictions.
5. Score Impact (estimate 0-100 total increase).
6. Size & Unit: Provide a specific UK supermarket package size (e.g. "800g", "500ml").

Grocery List:
${itemsText}

Return ONLY valid JSON in this exact format:
{
  "score": 85,
  "summary": "...",
  "strengths": ["..."],
  "weaknesses": ["..."],
  "swaps": [
    {
      "originalName": "...",
      "suggestedName": "...",
      "suggestedCategory": "...",
      "suggestedSize": "...",
      "suggestedUnit": "...",
      "priceDelta": 0.30,
      "scoreImpact": 5,
      "reason": "..."
    }
  ]
}`;

    const response = await smartGenerate(prompt, "analyzeListHealth", { temperature: 0.7 });
    const cleaned = stripCodeBlocks(response);
    
    let parsed: any;
    try {
      parsed = JSON.parse(cleaned);
    } catch (e) {
      console.error("Failed to parse health analysis:", cleaned);
      throw new Error("Failed to analyze health. Please try again.");
    }

    const swapsWithIds = (parsed.swaps || []).map((swap: any) => {
      if (swap.originalName === "Bonus") {
        const cleaned = cleanItemForStorage(swap.suggestedName, swap.suggestedSize, swap.suggestedUnit);
        return {
          ...swap,
          suggestedName: cleaned.name,
          originalId: undefined,
          suggestedCategory: swap.suggestedCategory || "Produce",
          suggestedSize: cleaned.size,
          suggestedUnit: cleaned.unit,
          priceDelta: swap.priceDelta ? parseFloat(String(swap.priceDelta).replace(/^\+/, '')) : undefined,
          scoreImpact: typeof swap.scoreImpact === 'number' ? swap.scoreImpact : 2
        };
      }

      let bestMatch: Doc<"listItems"> | null = null;
      let highestSimilarity = 0;

      for (const item of items) {
        const sim = calculateSimilarity(item.name, swap.originalName);
        const includes = item.name.toLowerCase().includes(swap.originalName.toLowerCase()) ||
                         swap.originalName.toLowerCase().includes(item.name.toLowerCase());
        const effectiveSim = includes ? Math.max(sim, 80) : sim;

        if (effectiveSim > highestSimilarity) {
          highestSimilarity = effectiveSim;
          bestMatch = item;
        }
      }

      const cleaned = cleanItemForStorage(swap.suggestedName, swap.suggestedSize || bestMatch?.size, swap.suggestedUnit || bestMatch?.unit);

      return {
        ...swap,
        suggestedName: cleaned.name,
        originalId: highestSimilarity > 60 ? bestMatch?._id : undefined,
        suggestedCategory: swap.suggestedCategory || bestMatch?.category || "Pantry Staples",
        suggestedSize: cleaned.size,
        suggestedUnit: cleaned.unit,
        priceDelta: swap.priceDelta ? parseFloat(String(swap.priceDelta).replace(/^\+/, '')) : undefined,
        scoreImpact: typeof swap.scoreImpact === 'number' ? swap.scoreImpact : 5
      };
    }).filter(s => s.originalId !== undefined || s.originalName === "Bonus");

    const healthAnalysis: HealthAnalysis = {
      score: typeof parsed.score === 'number' ? parsed.score : 50,
      summary: parsed.summary || "Keep adding fresh items!",
      strengths: Array.isArray(parsed.strengths) ? parsed.strengths : [],
      weaknesses: Array.isArray(parsed.weaknesses) ? parsed.weaknesses : [],
      swaps: swapsWithIds,
      itemCountAtAnalysis: items.length,
      updatedAt: Date.now()
    };

    await ctx.runMutation(internal.shoppingLists.updateHealthAnalysis, {
      listId: args.listId,
      healthAnalysis
    });

    await ctx.runMutation(internal.users.recordHealthAnalysis, {
      userId: user._id,
      listId: args.listId,
      score: healthAnalysis.score,
    });

    return healthAnalysis;
  }
});
