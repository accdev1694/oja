import { getTierFromScans, getNextTierInfo, getMaxEarningScans, getPointsPerScan } from "../../convex/lib/featureGating";

describe("Points System Logic", () => {
  describe("Tier Calculation", () => {
    it("should return bronze for 0 scans", () => {
      expect(getTierFromScans(0).tier).toBe("bronze");
    });

    it("should return silver for 20 scans", () => {
      expect(getTierFromScans(20).tier).toBe("silver");
    });

    it("should return gold for 50 scans", () => {
      expect(getTierFromScans(50).tier).toBe("gold");
    });

    it("should return platinum for 100 scans", () => {
      expect(getTierFromScans(100).tier).toBe("platinum");
    });
  });

  describe("Next Tier Info", () => {
    it("should calculate scans to silver correctly", () => {
      const info = getNextTierInfo(5);
      expect(info.nextTier).toBe("silver");
      expect(info.scansToNextTier).toBe(15);
    });

    it("should return null for platinum", () => {
      const info = getNextTierInfo(100);
      expect(info.nextTier).toBeNull();
    });
  });

  describe("Earning Caps", () => {
    it("should limit free users to 1 earning scan", () => {
      const tier = getTierFromScans(0);
      expect(getMaxEarningScans(tier, false)).toBe(1);
    });

    it("should allow premium bronze users 4 earning scans", () => {
      const tier = getTierFromScans(0);
      expect(getMaxEarningScans(tier, true)).toBe(4);
    });

    it("should allow premium platinum users 6 earning scans", () => {
      const tier = getTierFromScans(100);
      expect(getMaxEarningScans(tier, true)).toBe(6);
    });
  });

  describe("Points Rates", () => {
    it("should give free users 100 points per scan", () => {
      const tier = getTierFromScans(0);
      expect(getPointsPerScan(tier, false)).toBe(100);
    });

    it("should give premium bronze users 150 points per scan", () => {
      const tier = getTierFromScans(0);
      expect(getPointsPerScan(tier, true)).toBe(150);
    });

    it("should give premium platinum users 225 points per scan", () => {
      const tier = getTierFromScans(100);
      expect(getPointsPerScan(tier, true)).toBe(225);
    });
  });
});
