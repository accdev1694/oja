/**
 * Subscriptions - Tier Calculation Tests (Unified Rewards)
 * Tests tier thresholds based on lifetime scans as implemented in featureGating.ts
 */

import { 
  getTierFromScans, 
  getNextTierInfo, 
  getMaxEarningScans,
  getPointsPerScan,
  TIER_TABLE 
} from "../../convex/lib/featureGating";

describe("Unified Tier Calculation", () => {
  describe("getTierFromScans", () => {
    it("should return bronze for 0 scans", () => {
      const tier = getTierFromScans(0);
      expect(tier.tier).toBe("bronze");
      expect(tier.pointsPerScan).toBe(150);
    });

    it("should return bronze for 19 scans", () => {
      expect(getTierFromScans(19).tier).toBe("bronze");
    });

    it("should return silver for 20 scans", () => {
      const tier = getTierFromScans(20);
      expect(tier.tier).toBe("silver");
      expect(tier.pointsPerScan).toBe(175);
    });

    it("should return silver for 49 scans", () => {
      expect(getTierFromScans(49).tier).toBe("silver");
    });

    it("should return gold for 50 scans", () => {
      const tier = getTierFromScans(50);
      expect(tier.tier).toBe("gold");
      expect(tier.pointsPerScan).toBe(200);
    });

    it("should return platinum for 100 scans", () => {
      const tier = getTierFromScans(100);
      expect(tier.tier).toBe("platinum");
      expect(tier.pointsPerScan).toBe(225);
    });

    it("should return platinum for 1000 scans", () => {
      expect(getTierFromScans(1000).tier).toBe("platinum");
    });
  });

  describe("getNextTierInfo", () => {
    it("should calculate scans to silver correctly", () => {
      const info = getNextTierInfo(5);
      expect(info.nextTier).toBe("silver");
      expect(info.scansToNextTier).toBe(15);
    });

    it("should calculate scans to gold correctly", () => {
      const info = getNextTierInfo(40);
      expect(info.nextTier).toBe("gold");
      expect(info.scansToNextTier).toBe(10);
    });

    it("should return null when maxed at platinum", () => {
      const info = getNextTierInfo(150);
      expect(info.nextTier).toBeNull();
      expect(info.scansToNextTier).toBe(0);
    });
  });

  describe("Quota & Earning Rates", () => {
    const bronze = TIER_TABLE[0];
    const platinum = TIER_TABLE[3];

    it("should enforce 1-scan limit for free users", () => {
      expect(getMaxEarningScans(bronze, false)).toBe(1);
      expect(getMaxEarningScans(platinum, false)).toBe(1);
    });

    it("should allow tier-based limits for premium users", () => {
      expect(getMaxEarningScans(bronze, true)).toBe(4);
      expect(getMaxEarningScans(platinum, true)).toBe(6);
    });

    it("should return 100pts base for free users", () => {
      expect(getPointsPerScan(bronze, false)).toBe(100);
    });

    it("should return tier-based points for premium users", () => {
      expect(getPointsPerScan(bronze, true)).toBe(150);
      expect(getPointsPerScan(platinum, true)).toBe(225);
    });
  });
});
