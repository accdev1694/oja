/**
 * Subscriptions - Tier Calculation Tests
 * Tests tier thresholds, discount mapping, and tier transitions
 */

describe("Tier Calculation", () => {
  type Tier = "bronze" | "silver" | "gold" | "platinum";

  interface TierInfo {
    tier: Tier;
    discount: number;
    minPoints: number;
    maxPoints: number | null;
    perks: string[];
  }

  const TIER_CONFIG: TierInfo[] = [
    { tier: "bronze", discount: 0, minPoints: 0, maxPoints: 499, perks: ["Basic features"] },
    { tier: "silver", discount: 5, minPoints: 500, maxPoints: 1999, perks: ["5% discount", "Priority support"] },
    { tier: "gold", discount: 7, minPoints: 2000, maxPoints: 4999, perks: ["7% discount", "Early access"] },
    { tier: "platinum", discount: 10, minPoints: 5000, maxPoints: null, perks: ["10% discount", "VIP support", "Exclusive features"] },
  ];

  function getTierForPoints(points: number): TierInfo {
    for (let i = TIER_CONFIG.length - 1; i >= 0; i--) {
      if (points >= TIER_CONFIG[i].minPoints) {
        return TIER_CONFIG[i];
      }
    }
    return TIER_CONFIG[0];
  }

  function checkTierUpgrade(currentTier: Tier, newPoints: number): { upgraded: boolean; newTier: Tier } {
    const newTierInfo = getTierForPoints(newPoints);
    const tierOrder: Tier[] = ["bronze", "silver", "gold", "platinum"];
    const currentIdx = tierOrder.indexOf(currentTier);
    const newIdx = tierOrder.indexOf(newTierInfo.tier);
    return {
      upgraded: newIdx > currentIdx,
      newTier: newTierInfo.tier,
    };
  }

  function getProgressToNextTier(points: number): { percent: number; pointsNeeded: number } {
    const currentTier = getTierForPoints(points);
    if (currentTier.tier === "platinum") {
      return { percent: 100, pointsNeeded: 0 };
    }
    const nextTierIdx = TIER_CONFIG.findIndex((t) => t.tier === currentTier.tier) + 1;
    const nextTier = TIER_CONFIG[nextTierIdx];
    const pointsInTier = points - currentTier.minPoints;
    const tierRange = nextTier.minPoints - currentTier.minPoints;
    return {
      percent: Math.round((pointsInTier / tierRange) * 100),
      pointsNeeded: nextTier.minPoints - points,
    };
  }

  describe("getTierForPoints", () => {
    it("should return bronze for 0 points", () => {
      expect(getTierForPoints(0).tier).toBe("bronze");
    });

    it("should return bronze for 499 points", () => {
      expect(getTierForPoints(499).tier).toBe("bronze");
    });

    it("should return silver for 500 points", () => {
      expect(getTierForPoints(500).tier).toBe("silver");
    });

    it("should return silver for 1999 points", () => {
      expect(getTierForPoints(1999).tier).toBe("silver");
    });

    it("should return gold for 2000 points", () => {
      expect(getTierForPoints(2000).tier).toBe("gold");
    });

    it("should return gold for 4999 points", () => {
      expect(getTierForPoints(4999).tier).toBe("gold");
    });

    it("should return platinum for 5000 points", () => {
      expect(getTierForPoints(5000).tier).toBe("platinum");
    });

    it("should return platinum for very high points", () => {
      expect(getTierForPoints(999999).tier).toBe("platinum");
    });
  });

  describe("Tier discounts", () => {
    it("bronze has 0% discount", () => {
      expect(getTierForPoints(0).discount).toBe(0);
    });

    it("silver has 5% discount", () => {
      expect(getTierForPoints(500).discount).toBe(5);
    });

    it("gold has 7% discount", () => {
      expect(getTierForPoints(2000).discount).toBe(7);
    });

    it("platinum has 10% discount", () => {
      expect(getTierForPoints(5000).discount).toBe(10);
    });
  });

  describe("checkTierUpgrade", () => {
    it("should detect upgrade from bronze to silver", () => {
      const result = checkTierUpgrade("bronze", 500);
      expect(result.upgraded).toBe(true);
      expect(result.newTier).toBe("silver");
    });

    it("should detect upgrade from silver to gold", () => {
      const result = checkTierUpgrade("silver", 2000);
      expect(result.upgraded).toBe(true);
      expect(result.newTier).toBe("gold");
    });

    it("should detect no upgrade when staying in same tier", () => {
      const result = checkTierUpgrade("silver", 1500);
      expect(result.upgraded).toBe(false);
      expect(result.newTier).toBe("silver");
    });

    it("should detect skip-tier upgrade", () => {
      const result = checkTierUpgrade("bronze", 5000);
      expect(result.upgraded).toBe(true);
      expect(result.newTier).toBe("platinum");
    });
  });

  describe("getProgressToNextTier", () => {
    it("should show 0% progress at tier start", () => {
      const result = getProgressToNextTier(0);
      expect(result.percent).toBe(0);
      expect(result.pointsNeeded).toBe(500);
    });

    it("should show 50% progress at midpoint", () => {
      const result = getProgressToNextTier(250);
      expect(result.percent).toBe(50);
      expect(result.pointsNeeded).toBe(250);
    });

    it("should show 100% for platinum", () => {
      const result = getProgressToNextTier(5000);
      expect(result.percent).toBe(100);
      expect(result.pointsNeeded).toBe(0);
    });

    it("should calculate correctly within silver tier", () => {
      const result = getProgressToNextTier(1250);
      // Silver range: 500-2000 (1500 range), 750 into tier
      expect(result.percent).toBe(50);
      expect(result.pointsNeeded).toBe(750);
    });
  });
});
