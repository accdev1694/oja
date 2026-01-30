describe("Insights Helpers", () => {
  function getTopCategories(receipts: any[]) {
    const categoryTotals: Record<string, number> = {};
    for (const receipt of receipts) {
      for (const item of receipt.items || []) {
        const cat = item.category || "Uncategorized";
        categoryTotals[cat] = (categoryTotals[cat] || 0) + item.totalPrice;
      }
    }
    return Object.entries(categoryTotals)
      .sort(([, a], [, b]) => (b as number) - (a as number))
      .slice(0, 5)
      .map(([category, total]) => ({ category, total }));
  }

  describe("getTopCategories", () => {
    it("should return empty array for no receipts", () => {
      expect(getTopCategories([])).toEqual([]);
    });

    it("should aggregate items by category", () => {
      const receipts = [
        {
          items: [
            { name: "Milk", category: "Dairy", totalPrice: 1.5 },
            { name: "Cheese", category: "Dairy", totalPrice: 3.0 },
            { name: "Bread", category: "Bakery", totalPrice: 1.2 },
          ],
        },
      ];

      const result = getTopCategories(receipts);
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({ category: "Dairy", total: 4.5 });
      expect(result[1]).toEqual({ category: "Bakery", total: 1.2 });
    });

    it("should handle items without category", () => {
      const receipts = [
        {
          items: [{ name: "Mystery Item", totalPrice: 5.0 }],
        },
      ];

      const result = getTopCategories(receipts);
      expect(result[0].category).toBe("Uncategorized");
    });

    it("should return max 5 categories", () => {
      const receipts = [
        {
          items: [
            { name: "A", category: "Cat1", totalPrice: 10 },
            { name: "B", category: "Cat2", totalPrice: 9 },
            { name: "C", category: "Cat3", totalPrice: 8 },
            { name: "D", category: "Cat4", totalPrice: 7 },
            { name: "E", category: "Cat5", totalPrice: 6 },
            { name: "F", category: "Cat6", totalPrice: 5 },
            { name: "G", category: "Cat7", totalPrice: 4 },
          ],
        },
      ];

      const result = getTopCategories(receipts);
      expect(result).toHaveLength(5);
    });

    it("should sort by total descending", () => {
      const receipts = [
        {
          items: [
            { name: "A", category: "Low", totalPrice: 1 },
            { name: "B", category: "High", totalPrice: 100 },
            { name: "C", category: "Mid", totalPrice: 50 },
          ],
        },
      ];

      const result = getTopCategories(receipts);
      expect(result[0].category).toBe("High");
      expect(result[1].category).toBe("Mid");
      expect(result[2].category).toBe("Low");
    });

    it("should aggregate across multiple receipts", () => {
      const receipts = [
        { items: [{ name: "Milk", category: "Dairy", totalPrice: 2 }] },
        { items: [{ name: "Yogurt", category: "Dairy", totalPrice: 3 }] },
      ];

      const result = getTopCategories(receipts);
      expect(result[0]).toEqual({ category: "Dairy", total: 5 });
    });

    it("should handle receipts with no items", () => {
      const receipts = [{ items: [] }, {}];
      expect(getTopCategories(receipts)).toEqual([]);
    });
  });

  // Streak calculation tests
  describe("Streak Calculations", () => {
    function calculateStreak(lastDate: string, today: string, currentCount: number): number {
      const yesterday = new Date(new Date(today).getTime() - 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0];

      if (lastDate === today) return currentCount; // Already updated today
      if (lastDate === yesterday) return currentCount + 1; // Continue streak
      return 1; // Reset
    }

    it("should keep count if already updated today", () => {
      expect(calculateStreak("2026-01-30", "2026-01-30", 5)).toBe(5);
    });

    it("should increment if last activity was yesterday", () => {
      expect(calculateStreak("2026-01-29", "2026-01-30", 5)).toBe(6);
    });

    it("should reset to 1 if gap is more than 1 day", () => {
      expect(calculateStreak("2026-01-27", "2026-01-30", 10)).toBe(1);
    });

    it("should reset for very old dates", () => {
      expect(calculateStreak("2025-06-01", "2026-01-30", 100)).toBe(1);
    });
  });
});
