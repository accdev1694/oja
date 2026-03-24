/**
 * Tests for Tobi voice assistant context injection.
 *
 * Verifies that buildSystemPrompt correctly renders user-specific context
 * (low stock items, active lists, subscription, preferred stores, budget)
 * into the system prompt, and that data shaping logic produces correct output.
 */

import { buildSystemPrompt } from "../../convex/lib/voice/prompts";
import type { VoiceContext } from "../../convex/lib/voice/prompts";

// ---------------------------------------------------------------------------
// buildSystemPrompt — context rendering
// ---------------------------------------------------------------------------

describe("buildSystemPrompt", () => {
  const baseContext: VoiceContext = {
    currentScreen: "/list/abc123",
    userName: "Sarah",
  };

  describe("low stock items", () => {
    it("renders low stock items when provided", () => {
      const prompt = buildSystemPrompt({
        ...baseContext,
        lowStockItems: ["Milk (low)", "Eggs (out)", "Bread (low)"],
      });
      expect(prompt).toContain("Low/out items: Milk (low), Eggs (out), Bread (low)");
    });

    it("omits low stock section when array is empty", () => {
      const prompt = buildSystemPrompt({
        ...baseContext,
        lowStockItems: [],
      });
      expect(prompt).not.toContain("Low/out items:");
    });

    it("omits low stock section when undefined", () => {
      const prompt = buildSystemPrompt(baseContext);
      expect(prompt).not.toContain("Low/out items:");
    });
  });

  describe("active list names", () => {
    it("renders active list names when provided", () => {
      const prompt = buildSystemPrompt({
        ...baseContext,
        activeListNames: [
          "Weekly Shop (£50 budget, £23 spent, 8 items)",
          "Party Prep (£30 budget, 3 items)",
        ],
      });
      expect(prompt).toContain("Your lists: Weekly Shop (£50 budget, £23 spent, 8 items); Party Prep (£30 budget, 3 items)");
    });

    it("omits lists section when array is empty", () => {
      const prompt = buildSystemPrompt({
        ...baseContext,
        activeListNames: [],
      });
      expect(prompt).not.toContain("Your lists:");
    });

    it("omits lists section when undefined", () => {
      const prompt = buildSystemPrompt(baseContext);
      expect(prompt).not.toContain("Your lists:");
    });
  });

  describe("subscription tier", () => {
    it("renders free plan with limit info", () => {
      const prompt = buildSystemPrompt({
        ...baseContext,
        subscriptionTier: "free",
      });
      expect(prompt).toContain("Subscription: Free plan (limited features)");
    });

    it("renders premium plan with formatted name", () => {
      const prompt = buildSystemPrompt({
        ...baseContext,
        subscriptionTier: "premium_monthly",
      });
      expect(prompt).toContain("Subscription: premium monthly");
    });

    it("renders annual plan correctly", () => {
      const prompt = buildSystemPrompt({
        ...baseContext,
        subscriptionTier: "premium_annual",
      });
      expect(prompt).toContain("Subscription: premium annual");
    });

    it("omits subscription section when undefined", () => {
      const prompt = buildSystemPrompt(baseContext);
      expect(prompt).not.toContain("Subscription:");
    });
  });

  describe("preferred stores", () => {
    it("renders preferred stores when provided", () => {
      const prompt = buildSystemPrompt({
        ...baseContext,
        preferredStores: ["Tesco", "Aldi", "Lidl"],
      });
      expect(prompt).toContain("Preferred stores: Tesco, Aldi, Lidl");
    });

    it("omits stores section when array is empty", () => {
      const prompt = buildSystemPrompt({
        ...baseContext,
        preferredStores: [],
      });
      expect(prompt).not.toContain("Preferred stores:");
    });

    it("omits stores section when undefined", () => {
      const prompt = buildSystemPrompt(baseContext);
      expect(prompt).not.toContain("Preferred stores:");
    });
  });

  describe("budget context", () => {
    it("renders budget info when activeListBudget is set", () => {
      const prompt = buildSystemPrompt({
        ...baseContext,
        activeListId: "abc123",
        activeListName: "Weekly Shop",
        activeListBudget: 50,
        activeListSpent: 23,
      });
      expect(prompt).toContain("Budget: £50");
      expect(prompt).toContain("Spent: £23");
      expect(prompt).toContain("Remaining: £27");
    });

    it("shows 'No budget set' when budget is undefined", () => {
      const prompt = buildSystemPrompt({
        ...baseContext,
        activeListId: "abc123",
        activeListName: "Weekly Shop",
      });
      expect(prompt).toContain("No budget set");
    });

    it("clamps remaining to 0 when overspent", () => {
      const prompt = buildSystemPrompt({
        ...baseContext,
        activeListBudget: 30,
        activeListSpent: 45,
      });
      expect(prompt).toContain("Remaining: £0");
    });

    it("defaults spent to 0 when only budget is set", () => {
      const prompt = buildSystemPrompt({
        ...baseContext,
        activeListBudget: 50,
      });
      expect(prompt).toContain("Spent: £0");
      expect(prompt).toContain("Remaining: £50");
    });
  });

  describe("active list info", () => {
    it("renders active list name and id", () => {
      const prompt = buildSystemPrompt({
        ...baseContext,
        activeListId: "abc123",
        activeListName: "Weekly Shop",
      });
      expect(prompt).toContain('"Weekly Shop" (id: abc123)');
    });

    it("shows 'none' when no active list", () => {
      const prompt = buildSystemPrompt(baseContext);
      expect(prompt).toContain("Active list: none");
    });
  });

  describe("user name", () => {
    it("includes user name instruction when provided", () => {
      const prompt = buildSystemPrompt({
        ...baseContext,
        userName: "Sarah",
      });
      expect(prompt).toContain("The user's name is Sarah");
    });

    it("asks for name when not provided", () => {
      const prompt = buildSystemPrompt({
        currentScreen: "/",
      });
      expect(prompt).toContain("You don't know this user's name yet");
    });
  });

  describe("prompt sections", () => {
    it("includes SUBSCRIPTION AWARENESS section", () => {
      const prompt = buildSystemPrompt(baseContext);
      expect(prompt).toContain("SUBSCRIPTION AWARENESS:");
      expect(prompt).toContain("Free plan");
      expect(prompt).toContain("unlimited lists");
    });

    it("includes STORE AWARENESS section", () => {
      const prompt = buildSystemPrompt(baseContext);
      expect(prompt).toContain("STORE AWARENESS:");
      expect(prompt).toContain("preferred stores");
    });

    it("includes all capability sections", () => {
      const prompt = buildSystemPrompt(baseContext);
      expect(prompt).toContain("PERSONALITY:");
      expect(prompt).toContain("FULL CAPABILITIES");
      expect(prompt).toContain("READ Operations:");
      expect(prompt).toContain("WRITE Operations:");
      expect(prompt).toContain("CONTEXT AWARENESS:");
      expect(prompt).toContain("GENERAL RULES:");
      expect(prompt).toContain("CURRENT CONTEXT:");
    });

    it("includes Tobi identity", () => {
      const prompt = buildSystemPrompt(baseContext);
      expect(prompt).toContain("You are Tobi");
      expect(prompt).toContain("Oja");
      expect(prompt).toContain("UK grocery");
    });
  });

  describe("full context rendering", () => {
    it("renders all context fields together without errors", () => {
      const prompt = buildSystemPrompt({
        currentScreen: "/list/xyz",
        activeListId: "list123",
        activeListName: "Big Shop",
        activeListBudget: 100,
        activeListSpent: 67,
        activeListsCount: 2,
        lowStockCount: 5,
        lowStockItems: ["Milk (out)", "Rice (low)", "Pasta (low)"],
        activeListNames: [
          "Big Shop (£100 budget, £67 spent, 12 items)",
          "Quick Grab (no budget, 3 items)",
        ],
        userName: "James",
        subscriptionTier: "premium_monthly",
        preferredStores: ["Tesco", "Sainsburys"],
      });

      // Verify all sections present
      expect(prompt).toContain("Screen: /list/xyz");
      expect(prompt).toContain('"Big Shop" (id: list123)');
      expect(prompt).toContain("Budget: £100");
      expect(prompt).toContain("Remaining: £33");
      expect(prompt).toContain("Active lists count: 2");
      expect(prompt).toContain("Items running low: 5");
      expect(prompt).toContain("Low/out items: Milk (out), Rice (low), Pasta (low)");
      expect(prompt).toContain("Your lists: Big Shop (£100 budget, £67 spent, 12 items); Quick Grab (no budget, 3 items)");
      expect(prompt).toContain("The user's name is James");
      expect(prompt).toContain("Subscription: premium monthly");
      expect(prompt).toContain("Preferred stores: Tesco, Sainsburys");
    });
  });
});

// ---------------------------------------------------------------------------
// getUserVoiceContext data shaping — pure function equivalents
// ---------------------------------------------------------------------------

describe("getUserVoiceContext data shaping", () => {
  describe("low stock item formatting", () => {
    // Mirrors the filter + map logic in getUserVoiceContext
    function formatLowStockItems(
      items: { name: string; stockLevel: string }[]
    ) {
      return items
        .filter((i) => i.stockLevel === "low" || i.stockLevel === "out")
        .slice(0, 10)
        .map((i) => `${i.name} (${i.stockLevel})`);
    }

    it("filters only low and out items", () => {
      const items = [
        { name: "Milk", stockLevel: "low" },
        { name: "Bread", stockLevel: "stocked" },
        { name: "Eggs", stockLevel: "out" },
        { name: "Butter", stockLevel: "stocked" },
        { name: "Rice", stockLevel: "low" },
      ];
      const result = formatLowStockItems(items);
      expect(result).toEqual(["Milk (low)", "Eggs (out)", "Rice (low)"]);
    });

    it("caps at 10 items to limit prompt size", () => {
      const items = Array.from({ length: 20 }, (_, i) => ({
        name: `Item ${i}`,
        stockLevel: "low",
      }));
      const result = formatLowStockItems(items);
      expect(result).toHaveLength(10);
    });

    it("returns empty array when no low stock items", () => {
      const items = [
        { name: "Milk", stockLevel: "stocked" },
        { name: "Bread", stockLevel: "stocked" },
      ];
      expect(formatLowStockItems(items)).toEqual([]);
    });

    it("returns empty array for empty pantry", () => {
      expect(formatLowStockItems([])).toEqual([]);
    });
  });

  describe("active list name formatting", () => {
    // Mirrors the map logic in getUserVoiceContext
    function formatActiveListNames(
      lists: { name: string; budget?: number; totalEstimatedCost?: number; itemCount: number }[]
    ) {
      return lists.map((l) => {
        const budget = l.budget ? `£${l.budget} budget` : "no budget";
        const spent = l.totalEstimatedCost
          ? `, £${Math.round(l.totalEstimatedCost)} spent`
          : "";
        return `${l.name} (${budget}${spent}, ${l.itemCount} items)`;
      });
    }

    it("formats list with budget and spent", () => {
      const result = formatActiveListNames([
        { name: "Weekly Shop", budget: 50, totalEstimatedCost: 23.45, itemCount: 8 },
      ]);
      expect(result).toEqual(["Weekly Shop (£50 budget, £23 spent, 8 items)"]);
    });

    it("formats list without budget", () => {
      const result = formatActiveListNames([
        { name: "Quick List", itemCount: 3 },
      ]);
      expect(result).toEqual(["Quick List (no budget, 3 items)"]);
    });

    it("formats list with budget but no spending", () => {
      const result = formatActiveListNames([
        { name: "New List", budget: 100, itemCount: 0 },
      ]);
      expect(result).toEqual(["New List (£100 budget, 0 items)"]);
    });

    it("rounds spent to nearest pound", () => {
      const result = formatActiveListNames([
        { name: "Shop", budget: 50, totalEstimatedCost: 23.87, itemCount: 5 },
      ]);
      expect(result[0]).toContain("£24 spent");
    });

    it("handles multiple lists", () => {
      const result = formatActiveListNames([
        { name: "List A", budget: 50, totalEstimatedCost: 10, itemCount: 3 },
        { name: "List B", itemCount: 1 },
      ]);
      expect(result).toHaveLength(2);
      expect(result[0]).toContain("List A");
      expect(result[1]).toContain("List B");
    });

    it("returns empty array for no lists", () => {
      expect(formatActiveListNames([])).toEqual([]);
    });
  });

  describe("store name capitalization", () => {
    // Mirrors the capitalization logic in getUserVoiceContext
    function capitalizeStoreIds(storeIds: string[]) {
      return storeIds.map(
        (s) => s.charAt(0).toUpperCase() + s.slice(1)
      );
    }

    it("capitalizes store IDs", () => {
      expect(capitalizeStoreIds(["tesco", "aldi", "lidl"])).toEqual([
        "Tesco", "Aldi", "Lidl",
      ]);
    });

    it("handles already capitalized names", () => {
      expect(capitalizeStoreIds(["Tesco"])).toEqual(["Tesco"]);
    });

    it("handles single-char store IDs", () => {
      expect(capitalizeStoreIds(["m"])).toEqual(["M"]);
    });

    it("returns empty array for no stores", () => {
      expect(capitalizeStoreIds([])).toEqual([]);
    });
  });

  describe("subscription tier extraction", () => {
    // Helper that mirrors the nullish coalescing pattern in getUserVoiceContext
    function extractTier(subscription: { plan?: string } | null) {
      return subscription?.plan ?? "free";
    }

    it("defaults to 'free' when subscription is null", () => {
      expect(extractTier(null)).toBe("free");
    });

    it("extracts plan from subscription object", () => {
      expect(extractTier({ plan: "premium_monthly" })).toBe("premium_monthly");
    });

    it("defaults to 'free' when plan is undefined", () => {
      expect(extractTier({})).toBe("free");
    });
  });
});
