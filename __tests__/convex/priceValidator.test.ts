import { computeConfidence, computeWeightedAverage, getEmergencyPriceEstimate } from "../../convex/lib/priceValidator";

describe("priceValidator", () => {
  describe("computeConfidence", () => {
    it("should return 0 for no reports and long time since last seen", () => {
      expect(computeConfidence(0, 100)).toBe(0);
    });

    it("should increase with more reports", () => {
      const lowCount = computeConfidence(1, 30);
      const highCount = computeConfidence(10, 30);
      expect(highCount).toBeGreaterThan(lowCount);
    });

    it("should decrease as days pass", () => {
      const recent = computeConfidence(5, 0);
      const stale = computeConfidence(5, 30);
      expect(recent).toBeGreaterThan(stale);
    });

    it("should cap at 1.0", () => {
      expect(computeConfidence(100, 0)).toBe(1.0);
    });
  });

  describe("computeWeightedAverage", () => {
    it("should give more weight to new prices if recent", () => {
      const existingAvg = 10.0;
      const newPrice = 20.0;
      // If purchase was today (0 days ago), new price should have strong impact
      const result = computeWeightedAverage(existingAvg, 5, newPrice, 0);
      expect(result).toBeGreaterThan(10.0);
      expect(result).toBeLessThan(20.0);
    });

    it("should give zero weight to very old new prices", () => {
      const existingAvg = 10.0;
      const newPrice = 20.0;
      // 60 days ago is too old
      const result = computeWeightedAverage(existingAvg, 5, newPrice, 60);
      expect(result).toBe(10.0);
    });

    // =========================================================================
    // existingWeight varies with existingCount (logarithmic inertia)
    // =========================================================================
    describe("existingWeight varies with existingCount", () => {
      it("should produce different results for existingCount=1 vs existingCount=100", () => {
        const existingAvg = 10.0;
        const newPrice = 15.0;
        const daysSincePurchase = 0; // fresh price

        const resultLowCount = computeWeightedAverage(existingAvg, 1, newPrice, daysSincePurchase);
        const resultHighCount = computeWeightedAverage(existingAvg, 100, newPrice, daysSincePurchase);

        // Both should move toward newPrice, but low count should move MORE
        expect(resultLowCount).toBeGreaterThan(resultHighCount);
        // Confirm they are meaningfully different (not just floating point noise)
        expect(resultLowCount - resultHighCount).toBeGreaterThan(0.1);
      });

      it("with existingCount=1, a fresh new price should have significant impact", () => {
        const existingAvg = 10.0;
        const newPrice = 20.0;
        const daysSincePurchase = 0;

        const result = computeWeightedAverage(existingAvg, 1, newPrice, daysSincePurchase);

        // With existingCount=1: existingWeight = min(0.8, 0.3 + log2(1)*0.15) = 0.3
        // newWeight = 1.0 (0 days old)
        // result = (10*0.3 + 20*1.0) / 1.3 ≈ 17.69
        // The new price should pull the result strongly toward 20
        expect(result).toBeGreaterThan(15.0);
        expect(result).toBeLessThan(20.0);
      });

      it("with existingCount=100, a fresh new price should have less impact (more inertia)", () => {
        const existingAvg = 10.0;
        const newPrice = 20.0;
        const daysSincePurchase = 0;

        const result = computeWeightedAverage(existingAvg, 100, newPrice, daysSincePurchase);

        // With existingCount=100: existingWeight = min(0.8, 0.3 + log2(100)*0.15)
        //   = min(0.8, 0.3 + 6.644*0.15) = min(0.8, 1.2966) = 0.8
        // newWeight = 1.0
        // result = (10*0.8 + 20*1.0) / 1.8 ≈ 15.56
        // The existing average retains more influence
        expect(result).toBeGreaterThan(10.0);
        expect(result).toBeLessThanOrEqual(16.0);
      });
    });

    // =========================================================================
    // Edge case: daysSincePurchase > 30 => newWeight should be 0
    // =========================================================================
    describe("newWeight when daysSincePurchase > 30", () => {
      it("should give zero newWeight when daysSincePurchase is exactly 31", () => {
        const existingAvg = 10.0;
        const newPrice = 50.0;
        // At 31 days, newWeight = max(0, 1 - 31/30) = max(0, -0.033) = 0
        const result = computeWeightedAverage(existingAvg, 5, newPrice, 31);
        expect(result).toBe(existingAvg);
      });

      it("should give zero newWeight when daysSincePurchase is 45", () => {
        const result = computeWeightedAverage(10.0, 3, 99.0, 45);
        expect(result).toBe(10.0);
      });

      it("should give zero newWeight at exactly 30 days (boundary)", () => {
        const existingAvg = 10.0;
        const newPrice = 20.0;
        // At exactly 30 days, newWeight = max(0, 1 - 30/30) = 0
        const result = computeWeightedAverage(existingAvg, 5, newPrice, 30);
        expect(result).toBe(existingAvg);
      });
    });
  });

  describe("getEmergencyPriceEstimate", () => {
    it("should provide specific estimates for known items", () => {
      const milk = getEmergencyPriceEstimate("Semi-skimmed Milk");
      expect(milk.price).toBe(1.15);
      expect(milk.unit).toBe("pint");
    });

    it("should provide category-based defaults", () => {
      const steak = getEmergencyPriceEstimate("Generic Steak", "Meat & Seafood");
      expect(steak.price).toBe(4.00);
    });

    it("should provide a global default for unknown items/categories", () => {
      const unknown = getEmergencyPriceEstimate("Something Weird");
      expect(unknown.price).toBe(1.50);
      expect(unknown.unit).toBe("each");
    });
  });
});
