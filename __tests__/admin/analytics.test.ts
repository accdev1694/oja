/**
 * Admin - Analytics Tests
 * Tests DAU/WAU/MAU calculations and system health metrics
 */

describe("Admin Analytics", () => {
  interface UserActivity {
    userId: string;
    lastActiveAt: number;
  }

  function calculateDAU(users: UserActivity[], now: number): number {
    const oneDayAgo = now - 24 * 60 * 60 * 1000;
    return users.filter((u) => u.lastActiveAt >= oneDayAgo).length;
  }

  function calculateWAU(users: UserActivity[], now: number): number {
    const oneWeekAgo = now - 7 * 24 * 60 * 60 * 1000;
    return users.filter((u) => u.lastActiveAt >= oneWeekAgo).length;
  }

  function calculateMAU(users: UserActivity[], now: number): number {
    const oneMonthAgo = now - 30 * 24 * 60 * 60 * 1000;
    return users.filter((u) => u.lastActiveAt >= oneMonthAgo).length;
  }

  function calculateRetentionRate(mau: number, totalUsers: number): number {
    if (totalUsers === 0) return 0;
    return Math.round((mau / totalUsers) * 100);
  }

  function getSystemHealth(
    errorRate: number,
    avgResponseTime: number,
    activeUsers: number
  ): { status: "healthy" | "degraded" | "critical"; score: number } {
    let score = 100;

    // Error rate impact (> 5% = critical)
    if (errorRate > 5) score -= 50;
    else if (errorRate > 1) score -= 20;

    // Response time impact (> 2000ms = degraded)
    if (avgResponseTime > 5000) score -= 30;
    else if (avgResponseTime > 2000) score -= 15;

    // Active users (0 = concerning)
    if (activeUsers === 0) score -= 10;

    const status = score >= 80 ? "healthy" : score >= 50 ? "degraded" : "critical";
    return { status, score };
  }

  function calculateRevenueMetrics(
    subscriptions: Array<{ plan: string; status: string }>
  ): { mrr: number; activeCount: number; churnCount: number } {
    const PRICES: Record<string, number> = {
      premium_monthly: 2.99,
      premium_annual: 1.83, // £21.99/12
    };

    let mrr = 0;
    let activeCount = 0;
    let churnCount = 0;

    for (const sub of subscriptions) {
      if (sub.status === "active" || sub.status === "trial") {
        mrr += PRICES[sub.plan] || 0;
        activeCount++;
      }
      if (sub.status === "cancelled" || sub.status === "expired") {
        churnCount++;
      }
    }

    return { mrr: Math.round(mrr * 100) / 100, activeCount, churnCount };
  }

  const now = Date.now();

  describe("DAU/WAU/MAU calculations", () => {
    const users: UserActivity[] = [
      { userId: "u1", lastActiveAt: now - 1000 }, // Active now
      { userId: "u2", lastActiveAt: now - 12 * 60 * 60 * 1000 }, // 12 hours ago
      { userId: "u3", lastActiveAt: now - 3 * 24 * 60 * 60 * 1000 }, // 3 days ago
      { userId: "u4", lastActiveAt: now - 15 * 24 * 60 * 60 * 1000 }, // 15 days ago
      { userId: "u5", lastActiveAt: now - 60 * 24 * 60 * 60 * 1000 }, // 60 days ago
    ];

    it("should calculate DAU correctly", () => {
      expect(calculateDAU(users, now)).toBe(2); // u1, u2
    });

    it("should calculate WAU correctly", () => {
      expect(calculateWAU(users, now)).toBe(3); // u1, u2, u3
    });

    it("should calculate MAU correctly", () => {
      expect(calculateMAU(users, now)).toBe(4); // u1, u2, u3, u4
    });

    it("should handle empty users", () => {
      expect(calculateDAU([], now)).toBe(0);
      expect(calculateWAU([], now)).toBe(0);
      expect(calculateMAU([], now)).toBe(0);
    });
  });

  describe("calculateRetentionRate", () => {
    it("should calculate percentage correctly", () => {
      expect(calculateRetentionRate(80, 100)).toBe(80);
    });

    it("should handle zero total users", () => {
      expect(calculateRetentionRate(0, 0)).toBe(0);
    });

    it("should handle 100% retention", () => {
      expect(calculateRetentionRate(50, 50)).toBe(100);
    });

    it("should round to nearest integer", () => {
      expect(calculateRetentionRate(33, 100)).toBe(33);
    });
  });

  describe("getSystemHealth", () => {
    it("should be healthy with low error rate and fast response", () => {
      const result = getSystemHealth(0.5, 200, 100);
      expect(result.status).toBe("healthy");
      expect(result.score).toBeGreaterThanOrEqual(80);
    });

    it("should be degraded with moderate error rate and slow response", () => {
      const result = getSystemHealth(3, 3000, 50);
      expect(result.status).toBe("degraded");
    });

    it("should be critical with high error rate and slow response", () => {
      const result = getSystemHealth(10, 6000, 0);
      expect(result.status).toBe("critical");
    });

    it("should degrade with slow response times", () => {
      const result = getSystemHealth(0, 6000, 100);
      expect(result.score).toBeLessThan(80);
    });

    it("should handle zero active users", () => {
      const result = getSystemHealth(0, 200, 0);
      expect(result.score).toBe(90);
    });
  });

  describe("calculateRevenueMetrics", () => {
    it("should calculate MRR from active subscriptions", () => {
      const subs = [
        { plan: "premium_monthly", status: "active" },
        { plan: "premium_monthly", status: "active" },
        { plan: "premium_annual", status: "active" },
      ];

      const result = calculateRevenueMetrics(subs);
      expect(result.mrr).toBe(7.81); // 2.99 + 2.99 + 1.83
      expect(result.activeCount).toBe(3);
    });

    it("should count churned subscriptions", () => {
      const subs = [
        { plan: "premium_monthly", status: "active" },
        { plan: "premium_monthly", status: "cancelled" },
        { plan: "premium_annual", status: "expired" },
      ];

      const result = calculateRevenueMetrics(subs);
      expect(result.activeCount).toBe(1);
      expect(result.churnCount).toBe(2);
    });

    it("should include trial in MRR", () => {
      const subs = [{ plan: "premium_monthly", status: "trial" }];
      const result = calculateRevenueMetrics(subs);
      expect(result.mrr).toBe(2.99);
      expect(result.activeCount).toBe(1);
    });

    it("should handle empty subscriptions", () => {
      const result = calculateRevenueMetrics([]);
      expect(result.mrr).toBe(0);
      expect(result.activeCount).toBe(0);
      expect(result.churnCount).toBe(0);
    });
  });
});
