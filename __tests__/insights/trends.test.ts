/**
 * Insights - Trends Tests
 * Tests monthly aggregation calculations and spending trends
 */

describe("Monthly Trends", () => {
  interface MonthlyData {
    month: string; // "2026-01"
    total: number;
    receiptCount: number;
    categories: Record<string, number>;
  }

  interface TrendResult {
    month: string;
    total: number;
    receiptCount: number;
    percentChange: number | null;
    topCategory: string | null;
  }

  function aggregateByMonth(
    receipts: { date: string; total: number; items: { category: string; totalPrice: number }[] }[]
  ): MonthlyData[] {
    const months: Record<string, MonthlyData> = {};

    for (const receipt of receipts) {
      const month = receipt.date.substring(0, 7); // "2026-01"
      if (!months[month]) {
        months[month] = { month, total: 0, receiptCount: 0, categories: {} };
      }
      months[month].total += receipt.total;
      months[month].receiptCount++;

      for (const item of receipt.items || []) {
        const cat = item.category || "Other";
        months[month].categories[cat] = (months[month].categories[cat] || 0) + item.totalPrice;
      }
    }

    return Object.values(months).sort((a, b) => a.month.localeCompare(b.month));
  }

  function calculateTrends(monthlyData: MonthlyData[]): TrendResult[] {
    return monthlyData.map((m, idx) => {
      const prev = idx > 0 ? monthlyData[idx - 1] : null;
      const percentChange =
        prev && prev.total > 0
          ? ((m.total - prev.total) / prev.total) * 100
          : null;

      const topCategory = Object.entries(m.categories).sort(
        ([, a], [, b]) => b - a
      )[0]?.[0] ?? null;

      return {
        month: m.month,
        total: Math.round(m.total * 100) / 100,
        receiptCount: m.receiptCount,
        percentChange: percentChange !== null ? Math.round(percentChange * 10) / 10 : null,
        topCategory,
      };
    });
  }

  function getBudgetAdherence(
    lists: { budget: number; actualTotal: number }[]
  ): { underBudget: number; overBudget: number; noBudget: number } {
    let underBudget = 0;
    let overBudget = 0;
    let noBudget = 0;

    for (const list of lists) {
      if (!list.budget || list.budget <= 0) {
        noBudget++;
      } else if (list.actualTotal <= list.budget) {
        underBudget++;
      } else {
        overBudget++;
      }
    }
    return { underBudget, overBudget, noBudget };
  }

  describe("aggregateByMonth", () => {
    it("should group receipts by month", () => {
      const receipts = [
        { date: "2026-01-05", total: 40, items: [] },
        { date: "2026-01-15", total: 60, items: [] },
        { date: "2026-02-01", total: 30, items: [] },
      ];

      const result = aggregateByMonth(receipts);
      expect(result).toHaveLength(2);
      expect(result[0].month).toBe("2026-01");
      expect(result[0].total).toBe(100);
      expect(result[0].receiptCount).toBe(2);
      expect(result[1].month).toBe("2026-02");
      expect(result[1].total).toBe(30);
    });

    it("should aggregate categories within each month", () => {
      const receipts = [
        {
          date: "2026-01-05",
          total: 10,
          items: [
            { category: "Dairy", totalPrice: 5 },
            { category: "Bakery", totalPrice: 5 },
          ],
        },
        {
          date: "2026-01-15",
          total: 8,
          items: [{ category: "Dairy", totalPrice: 8 }],
        },
      ];

      const result = aggregateByMonth(receipts);
      expect(result[0].categories["Dairy"]).toBe(13);
      expect(result[0].categories["Bakery"]).toBe(5);
    });

    it("should handle empty receipts array", () => {
      expect(aggregateByMonth([])).toEqual([]);
    });

    it("should sort months chronologically", () => {
      const receipts = [
        { date: "2026-03-01", total: 10, items: [] },
        { date: "2026-01-01", total: 20, items: [] },
        { date: "2026-02-01", total: 30, items: [] },
      ];

      const result = aggregateByMonth(receipts);
      expect(result.map((r) => r.month)).toEqual(["2026-01", "2026-02", "2026-03"]);
    });
  });

  describe("calculateTrends", () => {
    it("should calculate percent change month-over-month", () => {
      const data: MonthlyData[] = [
        { month: "2026-01", total: 100, receiptCount: 3, categories: { Dairy: 50 } },
        { month: "2026-02", total: 120, receiptCount: 4, categories: { Dairy: 60 } },
      ];

      const trends = calculateTrends(data);
      expect(trends[0].percentChange).toBeNull(); // First month has no previous
      expect(trends[1].percentChange).toBe(20); // 20% increase
    });

    it("should return null percent change for first month", () => {
      const data: MonthlyData[] = [
        { month: "2026-01", total: 100, receiptCount: 3, categories: {} },
      ];

      const trends = calculateTrends(data);
      expect(trends[0].percentChange).toBeNull();
    });

    it("should identify top category", () => {
      const data: MonthlyData[] = [
        {
          month: "2026-01",
          total: 100,
          receiptCount: 3,
          categories: { Dairy: 50, Bakery: 30, Meat: 20 },
        },
      ];

      const trends = calculateTrends(data);
      expect(trends[0].topCategory).toBe("Dairy");
    });

    it("should handle month with no categories", () => {
      const data: MonthlyData[] = [
        { month: "2026-01", total: 100, receiptCount: 3, categories: {} },
      ];

      const trends = calculateTrends(data);
      expect(trends[0].topCategory).toBeNull();
    });

    it("should handle negative percent change (spending decrease)", () => {
      const data: MonthlyData[] = [
        { month: "2026-01", total: 200, receiptCount: 5, categories: {} },
        { month: "2026-02", total: 150, receiptCount: 4, categories: {} },
      ];

      const trends = calculateTrends(data);
      expect(trends[1].percentChange).toBe(-25);
    });
  });

  describe("getBudgetAdherence", () => {
    it("should count under and over budget trips", () => {
      const lists = [
        { budget: 50, actualTotal: 45 },
        { budget: 50, actualTotal: 55 },
        { budget: 100, actualTotal: 80 },
      ];

      const result = getBudgetAdherence(lists);
      expect(result.underBudget).toBe(2);
      expect(result.overBudget).toBe(1);
      expect(result.noBudget).toBe(0);
    });

    it("should count no-budget trips", () => {
      const lists = [
        { budget: 0, actualTotal: 45 },
        { budget: 50, actualTotal: 40 },
      ];

      const result = getBudgetAdherence(lists);
      expect(result.noBudget).toBe(1);
      expect(result.underBudget).toBe(1);
    });

    it("should count exact budget as under budget", () => {
      const lists = [{ budget: 50, actualTotal: 50 }];
      const result = getBudgetAdherence(lists);
      expect(result.underBudget).toBe(1);
    });

    it("should handle empty lists", () => {
      const result = getBudgetAdherence([]);
      expect(result).toEqual({ underBudget: 0, overBudget: 0, noBudget: 0 });
    });
  });
});
