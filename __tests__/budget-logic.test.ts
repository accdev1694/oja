describe("Budget & Impulse Fund Logic", () => {
  // Replicate the budget calculation logic from listItems.ts
  function calculateBudgetStatus(
    budget: number,
    items: { estimatedPrice?: number; quantity: number; isImpulse?: boolean }[]
  ) {
    const currentTotal = items.reduce(
      (sum, item) => sum + (item.estimatedPrice || 0) * item.quantity,
      0
    );

    const impulseFund = budget * 0.1;
    const impulseUsed = items
      .filter((item) => item.isImpulse)
      .reduce((sum, item) => sum + (item.estimatedPrice || 0) * item.quantity, 0);

    const impulseRemaining = impulseFund - impulseUsed;
    const totalLimit = budget + impulseFund;

    return {
      currentTotal,
      budget,
      impulseFund,
      impulseUsed,
      impulseRemaining,
      totalLimit,
      isOverBudget: currentTotal > budget,
      isOverTotalLimit: currentTotal > totalLimit,
      budgetRemaining: budget - currentTotal,
      percentUsed: budget > 0 ? (currentTotal / budget) * 100 : 0,
    };
  }

  describe("calculateBudgetStatus", () => {
    it("should calculate basic totals", () => {
      const items = [
        { estimatedPrice: 5, quantity: 2 },
        { estimatedPrice: 3, quantity: 1 },
      ];
      const result = calculateBudgetStatus(50, items);
      expect(result.currentTotal).toBe(13);
      expect(result.budgetRemaining).toBe(37);
    });

    it("should calculate impulse fund as 10% of budget", () => {
      const result = calculateBudgetStatus(100, []);
      expect(result.impulseFund).toBe(10);
    });

    it("should track impulse spending", () => {
      const items = [
        { estimatedPrice: 5, quantity: 1, isImpulse: true },
        { estimatedPrice: 10, quantity: 1, isImpulse: false },
      ];
      const result = calculateBudgetStatus(100, items);
      expect(result.impulseUsed).toBe(5);
      expect(result.impulseRemaining).toBe(5);
    });

    it("should detect over budget", () => {
      const items = [{ estimatedPrice: 60, quantity: 1 }];
      const result = calculateBudgetStatus(50, items);
      expect(result.isOverBudget).toBe(true);
      expect(result.budgetRemaining).toBe(-10);
    });

    it("should detect over total limit", () => {
      const items = [{ estimatedPrice: 56, quantity: 1 }];
      const result = calculateBudgetStatus(50, items);
      expect(result.isOverTotalLimit).toBe(true);
    });

    it("should handle zero budget", () => {
      const result = calculateBudgetStatus(0, []);
      expect(result.percentUsed).toBe(0);
      expect(result.impulseFund).toBe(0);
    });

    it("should calculate percent used", () => {
      const items = [{ estimatedPrice: 25, quantity: 1 }];
      const result = calculateBudgetStatus(50, items);
      expect(result.percentUsed).toBe(50);
    });

    it("should handle items with no price", () => {
      const items = [{ quantity: 3 }];
      const result = calculateBudgetStatus(50, items);
      expect(result.currentTotal).toBe(0);
    });

    it("should multiply price by quantity", () => {
      const items = [{ estimatedPrice: 2.5, quantity: 4 }];
      const result = calculateBudgetStatus(50, items);
      expect(result.currentTotal).toBe(10);
    });
  });

  // Levenshtein distance for fuzzy matching (used in pantry auto-restock)
  describe("Fuzzy Matching", () => {
    function levenshteinDistance(a: string, b: string): number {
      const matrix: number[][] = [];
      for (let i = 0; i <= a.length; i++) {
        matrix[i] = [i];
      }
      for (let j = 0; j <= b.length; j++) {
        matrix[0][j] = j;
      }
      for (let i = 1; i <= a.length; i++) {
        for (let j = 1; j <= b.length; j++) {
          const cost = a[i - 1] === b[j - 1] ? 0 : 1;
          matrix[i][j] = Math.min(
            matrix[i - 1][j] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j - 1] + cost
          );
        }
      }
      return matrix[a.length][b.length];
    }

    function similarityPercent(a: string, b: string): number {
      const distance = levenshteinDistance(a.toLowerCase(), b.toLowerCase());
      const maxLen = Math.max(a.length, b.length);
      return maxLen === 0 ? 100 : ((maxLen - distance) / maxLen) * 100;
    }

    it("should return 100% for identical strings", () => {
      expect(similarityPercent("milk", "milk")).toBe(100);
    });

    it("should return high similarity for close strings", () => {
      expect(similarityPercent("milk", "milks")).toBeGreaterThan(75);
    });

    it("should return low similarity for different strings", () => {
      expect(similarityPercent("milk", "bread")).toBeLessThan(50);
    });

    it("should be case insensitive", () => {
      expect(similarityPercent("MILK", "milk")).toBe(100);
    });

    it("should handle empty strings", () => {
      expect(similarityPercent("", "")).toBe(100);
    });

    it("should handle one empty string", () => {
      expect(similarityPercent("test", "")).toBe(0);
    });

    it("should match 'Semi Skimmed Milk' and 'milk' with moderate similarity", () => {
      const sim = similarityPercent("semi skimmed milk", "milk");
      expect(sim).toBeGreaterThan(20);
      expect(sim).toBeLessThan(50);
    });
  });
});
