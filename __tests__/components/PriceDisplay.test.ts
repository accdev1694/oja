// Mock @expo/vector-icons before importing the component module
jest.mock("@expo/vector-icons", () => ({
  MaterialCommunityIcons: "MaterialCommunityIcons",
}));

import { formatPrice, calculatePricePerUnit } from "../../components/items/PriceDisplay";

describe("PriceDisplay", () => {
  // ===========================================================================
  // formatPrice
  // ===========================================================================
  describe("formatPrice", () => {
    it("should return '--' for NaN", () => {
      expect(formatPrice(NaN)).toBe("--");
    });

    it("should return '--' for null", () => {
      expect(formatPrice(null)).toBe("--");
    });

    it("should format a valid price with pound sign and 2 decimal places", () => {
      expect(formatPrice(1.5)).toBe("£1.50");
    });

    it("should format zero as £0.00", () => {
      expect(formatPrice(0)).toBe("£0.00");
    });

    it("should format whole numbers with two decimals", () => {
      expect(formatPrice(3)).toBe("£3.00");
    });

    it("should format large prices correctly", () => {
      expect(formatPrice(99.99)).toBe("£99.99");
    });
  });

  // ===========================================================================
  // calculatePricePerUnit — multipack handling
  // ===========================================================================
  describe("calculatePricePerUnit", () => {
    describe("multipack formats", () => {
      it("should calculate based on total weight for '4x400g' (1600g total)", () => {
        const result = calculatePricePerUnit(5.0, "4x400g", "g");
        expect(result).not.toBeNull();
        // Total weight = 4 * 400 = 1600g
        // Price per 100g = (5.00 / 1600) * 100 = 0.3125
        expect(result!.value).toBeCloseTo(0.3125, 4);
        expect(result!.label).toBe("£0.31/100g");
      });

      it("should calculate based on total volume for '6x330ml' (1980ml total)", () => {
        const result = calculatePricePerUnit(3.0, "6x330ml", "ml");
        expect(result).not.toBeNull();
        // Total volume = 6 * 330 = 1980ml
        // Price per 100ml = (3.00 / 1980) * 100 ≈ 0.15151...
        expect(result!.value).toBeCloseTo(0.15151515, 4);
        expect(result!.label).toBe("£0.15/100ml");
      });

      it("should handle multipack with decimal per-unit size like '4x1.5'", () => {
        const result = calculatePricePerUnit(6.0, "4x1.5", "L");
        expect(result).not.toBeNull();
        // Total = 4 * 1.5 = 6L, price per L = 6.00 / 6 = 1.00
        expect(result!.value).toBeCloseTo(1.0, 4);
        expect(result!.label).toBe("£1.00/L");
      });
    });

    describe("non-multipack formats", () => {
      it("should work normally with a plain numeric size", () => {
        const result = calculatePricePerUnit(1.5, "500", "ml");
        expect(result).not.toBeNull();
        // Price per 100ml = (1.50 / 500) * 100 = 0.30
        expect(result!.value).toBeCloseTo(0.3, 4);
        expect(result!.label).toBe("£0.30/100ml");
      });

      it("should handle gram sizes for per-100g pricing", () => {
        const result = calculatePricePerUnit(2.0, "250", "g");
        expect(result).not.toBeNull();
        // Price per 100g = (2.00 / 250) * 100 = 0.80
        expect(result!.value).toBeCloseTo(0.8, 4);
        expect(result!.label).toBe("£0.80/100g");
      });

      it("should calculate per-unit for pints", () => {
        const result = calculatePricePerUnit(2.0, "4", "pint");
        expect(result).not.toBeNull();
        // Price per pint = 2.00 / 4 = 0.50
        expect(result!.value).toBeCloseTo(0.5, 4);
        expect(result!.label).toBe("£0.50/pt");
      });
    });

    describe("invalid inputs", () => {
      it("should return null for non-numeric size", () => {
        const result = calculatePricePerUnit(1.0, "abc", "ml");
        expect(result).toBeNull();
      });

      it("should return null for zero size", () => {
        const result = calculatePricePerUnit(1.0, "0", "ml");
        expect(result).toBeNull();
      });

      it("should return null for negative size", () => {
        const result = calculatePricePerUnit(1.0, "-5", "ml");
        expect(result).toBeNull();
      });
    });
  });
});
