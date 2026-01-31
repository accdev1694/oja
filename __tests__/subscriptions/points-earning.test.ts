/**
 * Subscriptions - Points Earning Tests
 * Tests point award rules, daily caps, and bonus logic
 */

describe("Points Earning", () => {
  const DAILY_RECEIPT_CAP = 5;
  const POINTS_PER_RECEIPT = 10;
  const FIRST_RECEIPT_BONUS = 20;
  const WEEKLY_STREAK_BONUS = 10;
  const WEEKLY_STREAK_THRESHOLD = 3;

  function calculateReceiptPoints(
    receiptsToday: number,
    totalReceipts: number,
    receiptsThisWeek: number
  ): { points: number; breakdown: string[] } {
    const breakdown: string[] = [];
    let points = 0;

    // Check daily cap
    if (receiptsToday >= DAILY_RECEIPT_CAP) {
      return { points: 0, breakdown: ["Daily cap reached (5 receipts/day)"] };
    }

    // Base points
    points += POINTS_PER_RECEIPT;
    breakdown.push(`+${POINTS_PER_RECEIPT} base points`);

    // First receipt bonus
    if (totalReceipts === 0) {
      points += FIRST_RECEIPT_BONUS;
      breakdown.push(`+${FIRST_RECEIPT_BONUS} first receipt bonus`);
    }

    // Weekly streak bonus
    if (receiptsThisWeek + 1 >= WEEKLY_STREAK_THRESHOLD && receiptsThisWeek < WEEKLY_STREAK_THRESHOLD) {
      points += WEEKLY_STREAK_BONUS;
      breakdown.push(`+${WEEKLY_STREAK_BONUS} weekly streak bonus`);
    }

    return { points, breakdown };
  }

  function calculateTier(
    lifetimePoints: number
  ): { tier: string; discount: number; nextTier: string | null; pointsToNext: number } {
    if (lifetimePoints >= 5000) {
      return { tier: "platinum", discount: 10, nextTier: null, pointsToNext: 0 };
    }
    if (lifetimePoints >= 2000) {
      return { tier: "gold", discount: 7, nextTier: "platinum", pointsToNext: 5000 - lifetimePoints };
    }
    if (lifetimePoints >= 500) {
      return { tier: "silver", discount: 5, nextTier: "gold", pointsToNext: 2000 - lifetimePoints };
    }
    return { tier: "bronze", discount: 0, nextTier: "silver", pointsToNext: 500 - lifetimePoints };
  }

  function canRedeemPoints(balance: number, cost: number): boolean {
    return balance >= cost;
  }

  describe("calculateReceiptPoints", () => {
    it("should award base points for a receipt", () => {
      const result = calculateReceiptPoints(0, 5, 0);
      expect(result.points).toBe(10);
      expect(result.breakdown).toContain("+10 base points");
    });

    it("should award first receipt bonus", () => {
      const result = calculateReceiptPoints(0, 0, 0);
      expect(result.points).toBe(30); // 10 + 20
      expect(result.breakdown).toContain("+20 first receipt bonus");
    });

    it("should enforce daily cap", () => {
      const result = calculateReceiptPoints(5, 10, 2);
      expect(result.points).toBe(0);
      expect(result.breakdown[0]).toContain("Daily cap");
    });

    it("should award weekly streak bonus at threshold", () => {
      const result = calculateReceiptPoints(0, 5, 2);
      expect(result.points).toBe(20); // 10 + 10
      expect(result.breakdown).toContain("+10 weekly streak bonus");
    });

    it("should not award weekly bonus after threshold already met", () => {
      const result = calculateReceiptPoints(0, 5, 3);
      expect(result.points).toBe(10);
      expect(result.breakdown).not.toContain("+10 weekly streak bonus");
    });

    it("should not award first receipt bonus if already scanned before", () => {
      const result = calculateReceiptPoints(0, 1, 0);
      expect(result.points).toBe(10);
      expect(result.breakdown).not.toContain("+20 first receipt bonus");
    });
  });

  describe("calculateTier", () => {
    it("should return bronze for 0 points", () => {
      expect(calculateTier(0).tier).toBe("bronze");
    });

    it("should return bronze for 499 points", () => {
      expect(calculateTier(499).tier).toBe("bronze");
      expect(calculateTier(499).pointsToNext).toBe(1);
    });

    it("should return silver at 500 points", () => {
      expect(calculateTier(500).tier).toBe("silver");
      expect(calculateTier(500).discount).toBe(5);
    });

    it("should return gold at 2000 points", () => {
      expect(calculateTier(2000).tier).toBe("gold");
      expect(calculateTier(2000).discount).toBe(7);
    });

    it("should return platinum at 5000 points", () => {
      expect(calculateTier(5000).tier).toBe("platinum");
      expect(calculateTier(5000).discount).toBe(10);
      expect(calculateTier(5000).nextTier).toBeNull();
    });

    it("should calculate points to next tier correctly", () => {
      expect(calculateTier(100).pointsToNext).toBe(400);
      expect(calculateTier(1000).pointsToNext).toBe(1000);
      expect(calculateTier(3000).pointsToNext).toBe(2000);
    });
  });

  describe("canRedeemPoints", () => {
    it("should allow redemption when balance is sufficient", () => {
      expect(canRedeemPoints(100, 50)).toBe(true);
    });

    it("should allow exact balance redemption", () => {
      expect(canRedeemPoints(50, 50)).toBe(true);
    });

    it("should reject when balance is insufficient", () => {
      expect(canRedeemPoints(30, 50)).toBe(false);
    });

    it("should reject with zero balance", () => {
      expect(canRedeemPoints(0, 10)).toBe(false);
    });
  });
});
