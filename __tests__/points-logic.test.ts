
import { getTierFromScans, getPointsPerScan, getMaxEarningScans } from "../convex/lib/featureGating";

describe("Points System Logic", () => {
  
  describe("Tier Progression", () => {
    it("should start at Bronze (0 scans)", () => {
      const tier = getTierFromScans(0);
      expect(tier.tier).toBe("bronze");
    });

    it("should reach Silver at 20 scans", () => {
      const tier = getTierFromScans(20);
      expect(tier.tier).toBe("silver");
    });

    it("should reach Gold at 50 scans", () => {
      const tier = getTierFromScans(50);
      expect(tier.tier).toBe("gold");
    });

    it("should reach Platinum at 100 scans", () => {
      const tier = getTierFromScans(100);
      expect(tier.tier).toBe("platinum");
    });
  });

  describe("Earning Rates (Points Per Scan)", () => {
    it("should award 100 pts to free users regardless of tier", () => {
      const bronze = getTierFromScans(0);
      const plat = getTierFromScans(100);
      expect(getPointsPerScan(bronze, false)).toBe(100);
      expect(getPointsPerScan(plat, false)).toBe(100);
    });

    it("should award tiered points to premium users", () => {
      const bronze = getTierFromScans(0);
      const silver = getTierFromScans(20);
      const gold = getTierFromScans(50);
      const plat = getTierFromScans(100);
      
      expect(getPointsPerScan(bronze, true)).toBe(150);
      expect(getPointsPerScan(silver, true)).toBe(175);
      expect(getPointsPerScan(gold, true)).toBe(200);
      expect(getPointsPerScan(plat, true)).toBe(225);
    });
  });

  describe("Monthly Earning Limits", () => {
    it("should limit free users to 1 scan per month", () => {
      const bronze = getTierFromScans(0);
      const plat = getTierFromScans(100);
      expect(getMaxEarningScans(bronze, false)).toBe(1);
      expect(getMaxEarningScans(plat, false)).toBe(1);
    });

    it("should allow premium users more scans based on tier", () => {
      const bronze = getTierFromScans(0);
      const plat = getTierFromScans(100);
      expect(getMaxEarningScans(bronze, true)).toBe(4);
      expect(getMaxEarningScans(plat, true)).toBe(6);
    });
  });
});
