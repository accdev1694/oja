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
  });

  describe("getEmergencyPriceEstimate", () => {
    it("should provide specific estimates for known items", () => {
      const milk = getEmergencyPriceEstimate("Semi-skimmed Milk");
      expect(milk.price).toBe(1.15);
      expect(milk.unit).toBe("pint");
    });

    it("should provide category-based defaults", () => {
      const steak = getEmergencyPriceEstimate("Generic Steak", "Meat");
      expect(steak.price).toBe(4.00);
    });

    it("should provide a global default for unknown items/categories", () => {
      const unknown = getEmergencyPriceEstimate("Something Weird");
      expect(unknown.price).toBe(1.50);
      expect(unknown.unit).toBe("each");
    });
  });
});
