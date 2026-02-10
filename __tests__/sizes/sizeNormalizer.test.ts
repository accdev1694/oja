/**
 * Size Normalizer Tests
 *
 * Comprehensive unit tests for the size normalizer utility.
 * Tests parsing, normalization, and conversion of UK grocery size strings.
 *
 * UK Size Reference:
 * - Pints: 1pt = 568ml (UK milk sizes: 1pt, 2pt, 4pt, 6pt)
 * - Litres: 1L = 1000ml
 * - Weight: 1kg = 1000g, 1lb = 453.6g, 1oz = 28.35g
 * - Count: pk, pack, each
 */

import {
  parseSize,
  normalizeSize,
  calculatePricePerUnit,
  formatPricePerUnit,
  areSizesComparable,
  convertSize,
  UNIT_CONVERSIONS,
} from "@/lib/sizes/sizeNormalizer";

// ============================================================================
// parseSize - UK Pint Conversions
// ============================================================================

describe("parseSize - UK Pint Conversions", () => {
  test("parses 1pt correctly (568ml)", () => {
    const result = parseSize("1pt");
    expect(result).toMatchObject({
      value: 1,
      unit: "ml",
      category: "volume",
      normalizedValue: 568,
      display: "1pt",
    });
  });

  test("parses 2pt correctly (1136ml)", () => {
    const result = parseSize("2pt");
    expect(result).toMatchObject({
      value: 2,
      unit: "ml",
      category: "volume",
      normalizedValue: 1136,
      display: "2pt",
    });
  });

  test("parses 4pt correctly (2272ml)", () => {
    const result = parseSize("4pt");
    expect(result).toMatchObject({
      value: 4,
      unit: "ml",
      category: "volume",
      normalizedValue: 2272,
      display: "4pt",
    });
  });

  test("parses 6pt correctly (3408ml)", () => {
    const result = parseSize("6pt");
    expect(result).toMatchObject({
      value: 6,
      unit: "ml",
      category: "volume",
      normalizedValue: 3408,
      display: "6pt",
    });
  });

  test("parses '2 pints' correctly", () => {
    const result = parseSize("2 pints");
    expect(result).toMatchObject({
      normalizedValue: 1136,
      display: "2pt",
      original: "2 pints",
    });
  });

  test("parses 'pint' singular correctly", () => {
    const result = parseSize("1pint");
    expect(result).toMatchObject({
      normalizedValue: 568,
      display: "1pt",
    });
  });
});

// ============================================================================
// parseSize - Litre/ml Variations
// ============================================================================

describe("parseSize - Litre/ml Variations", () => {
  test("parses '1L' correctly", () => {
    const result = parseSize("1L");
    expect(result).toMatchObject({
      value: 1,
      unit: "ml",
      category: "volume",
      normalizedValue: 1000,
      display: "1L",
    });
  });

  test("parses '1 litre' correctly", () => {
    const result = parseSize("1 litre");
    expect(result).toMatchObject({
      normalizedValue: 1000,
      display: "1L",
    });
  });

  test("parses '1 liter' (US spelling) correctly", () => {
    const result = parseSize("1 liter");
    expect(result).toMatchObject({
      normalizedValue: 1000,
    });
  });

  test("parses '2 litres' correctly", () => {
    const result = parseSize("2 litres");
    expect(result).toMatchObject({
      normalizedValue: 2000,
      display: "2L",
    });
  });

  test("parses '1.5l' correctly", () => {
    const result = parseSize("1.5l");
    expect(result).toMatchObject({
      normalizedValue: 1500,
      display: "1.5L",
    });
  });

  test("parses '500ml' correctly", () => {
    const result = parseSize("500ml");
    expect(result).toMatchObject({
      value: 500,
      unit: "ml",
      category: "volume",
      normalizedValue: 500,
      display: "500ml",
    });
  });

  test("parses '330 ml' with space correctly", () => {
    const result = parseSize("330 ml");
    expect(result).toMatchObject({
      value: 330,
      unit: "ml",
      normalizedValue: 330,
      display: "330ml",
    });
  });

  test("parses '1000ml' and displays as 1L", () => {
    const result = parseSize("1000ml");
    expect(result).toMatchObject({
      normalizedValue: 1000,
      display: "1L",
    });
  });

  test("parses 'millilitre' correctly", () => {
    const result = parseSize("500millilitre");
    expect(result).toMatchObject({
      normalizedValue: 500,
    });
  });

  test("parses 'millilitres' correctly", () => {
    const result = parseSize("250millilitres");
    expect(result).toMatchObject({
      normalizedValue: 250,
    });
  });

  test("parses centilitres correctly (75cl)", () => {
    const result = parseSize("75cl");
    expect(result).toMatchObject({
      normalizedValue: 750,
    });
  });
});

// ============================================================================
// parseSize - Weight Variations
// ============================================================================

describe("parseSize - Weight Variations", () => {
  test("parses '500g' correctly", () => {
    const result = parseSize("500g");
    expect(result).toMatchObject({
      value: 500,
      unit: "g",
      category: "weight",
      normalizedValue: 500,
      display: "500g",
    });
  });

  test("parses '0.5kg' correctly", () => {
    const result = parseSize("0.5kg");
    expect(result).toMatchObject({
      value: 0.5,
      unit: "g",
      category: "weight",
      normalizedValue: 500,
      display: "500g",
    });
  });

  test("parses '1kg' correctly", () => {
    const result = parseSize("1kg");
    expect(result).toMatchObject({
      value: 1,
      unit: "g",
      category: "weight",
      normalizedValue: 1000,
      display: "1kg",
    });
  });

  test("parses '1.5kg' correctly", () => {
    const result = parseSize("1.5kg");
    expect(result).toMatchObject({
      normalizedValue: 1500,
      display: "1.5kg",
    });
  });

  test("parses '250g' correctly", () => {
    const result = parseSize("250g");
    expect(result).toMatchObject({
      value: 250,
      normalizedValue: 250,
      display: "250g",
    });
  });

  test("parses 'grams' correctly", () => {
    const result = parseSize("500grams");
    expect(result).toMatchObject({
      normalizedValue: 500,
    });
  });

  test("parses 'kilogram' correctly", () => {
    const result = parseSize("1kilogram");
    expect(result).toMatchObject({
      normalizedValue: 1000,
    });
  });

  test("parses 'kilograms' correctly", () => {
    const result = parseSize("2kilograms");
    expect(result).toMatchObject({
      normalizedValue: 2000,
    });
  });

  test("parses 'kilo' correctly", () => {
    const result = parseSize("1kilo");
    expect(result).toMatchObject({
      normalizedValue: 1000,
    });
  });
});

// ============================================================================
// parseSize - Imperial Weight (lb/oz)
// ============================================================================

describe("parseSize - Imperial Weight (lb/oz)", () => {
  test("parses '1lb' correctly (453.6g)", () => {
    const result = parseSize("1lb");
    expect(result).toMatchObject({
      value: 1,
      unit: "g",
      category: "weight",
      normalizedValue: 453.6,
    });
  });

  test("parses '16oz' correctly (453.6g)", () => {
    const result = parseSize("16oz");
    expect(result).toMatchObject({
      value: 16,
      unit: "g",
      category: "weight",
      normalizedValue: 453.6,
    });
  });

  test("parses '8oz' correctly (226.8g)", () => {
    const result = parseSize("8oz");
    expect(result).toMatchObject({
      normalizedValue: 226.8,
    });
  });

  test("parses 'ounces' correctly", () => {
    const result = parseSize("4ounces");
    expect(result).toMatchObject({
      normalizedValue: 113.4,
    });
  });

  test("parses 'pound' correctly", () => {
    const result = parseSize("1pound");
    expect(result).toMatchObject({
      normalizedValue: 453.6,
    });
  });

  test("parses 'pounds' correctly", () => {
    const result = parseSize("2pounds");
    expect(result).toMatchObject({
      normalizedValue: 907.2,
    });
  });

  test("parses 'lbs' correctly", () => {
    const result = parseSize("2lbs");
    expect(result).toMatchObject({
      normalizedValue: 907.2,
    });
  });
});

// ============================================================================
// parseSize - Count/Pack Units
// ============================================================================

describe("parseSize - Count/Pack Units", () => {
  test("parses '6pk' correctly", () => {
    const result = parseSize("6pk");
    expect(result).toMatchObject({
      value: 6,
      unit: "pk",
      category: "count",
      normalizedValue: 6,
      display: "6pk",
    });
  });

  test("parses '12 pack' correctly", () => {
    const result = parseSize("12 pack");
    expect(result).toMatchObject({
      value: 12,
      unit: "pk",
      category: "count",
    });
  });

  test("parses '6-pack' correctly", () => {
    const result = parseSize("6-pack");
    expect(result).toMatchObject({
      value: 6,
      unit: "pk",
      category: "count",
    });
  });

  test("parses 'each' correctly", () => {
    const result = parseSize("1each");
    expect(result).toMatchObject({
      value: 1,
      unit: "each",
      category: "count",
    });
  });

  test("parses 'ea' correctly", () => {
    const result = parseSize("1ea");
    expect(result).toMatchObject({
      value: 1,
      unit: "each",
      category: "count",
    });
  });

  test("parses 'pcs' correctly", () => {
    const result = parseSize("4pcs");
    expect(result).toMatchObject({
      value: 4,
      unit: "each",
      category: "count",
    });
  });

  test("parses 'pieces' correctly", () => {
    const result = parseSize("6pieces");
    expect(result).toMatchObject({
      value: 6,
      unit: "each",
      category: "count",
    });
  });

  test("parses 'x' format (4x100g style) correctly", () => {
    const result = parseSize("4x100g");
    expect(result).toMatchObject({
      value: 400,
      unit: "g",
      category: "weight",
      normalizedValue: 400,
    });
  });

  test("parses '6 x 500ml' correctly", () => {
    const result = parseSize("6x500ml");
    expect(result).toMatchObject({
      value: 3000,
      unit: "ml",
      category: "volume",
      normalizedValue: 3000,
    });
  });
});

// ============================================================================
// parseSize - Edge Cases
// ============================================================================

describe("parseSize - Edge Cases", () => {
  test("handles extra whitespace", () => {
    const result = parseSize("  500ml  ");
    expect(result).toMatchObject({
      normalizedValue: 500,
      original: "500ml",
    });
  });

  test("handles mixed case", () => {
    const result = parseSize("500ML");
    expect(result).toMatchObject({
      normalizedValue: 500,
    });
  });

  test("handles UPPERCASE", () => {
    const result = parseSize("2PT");
    expect(result).toMatchObject({
      normalizedValue: 1136,
    });
  });

  test("returns null for empty string", () => {
    expect(parseSize("")).toBeNull();
  });

  test("returns null for null input", () => {
    // @ts-expect-error Testing invalid input
    expect(parseSize(null)).toBeNull();
  });

  test("returns null for undefined input", () => {
    // @ts-expect-error Testing invalid input
    expect(parseSize(undefined)).toBeNull();
  });

  test("returns null for number input", () => {
    // @ts-expect-error Testing invalid input
    expect(parseSize(123)).toBeNull();
  });

  test("returns null for invalid size string", () => {
    expect(parseSize("invalid")).toBeNull();
  });

  test("returns null for text without numbers", () => {
    expect(parseSize("abc")).toBeNull();
  });

  test("returns null for unknown unit", () => {
    expect(parseSize("500xyz")).toBeNull();
  });

  test("returns null for number only", () => {
    expect(parseSize("500")).toBeNull();
  });

  test("preserves original string in result", () => {
    const result = parseSize("2 pints");
    expect(result?.original).toBe("2 pints");
  });
});

// ============================================================================
// normalizeSize
// ============================================================================

describe("normalizeSize", () => {
  test("normalizes '2 pints' to '2pt'", () => {
    expect(normalizeSize("2 pints")).toBe("2pt");
  });

  test("normalizes '500 ml' to '500ml'", () => {
    expect(normalizeSize("500 ml")).toBe("500ml");
  });

  test("normalizes '1.5 kg' to '1.5kg'", () => {
    expect(normalizeSize("1.5 kg")).toBe("1.5kg");
  });

  test("normalizes '6-pack' to '6pk'", () => {
    expect(normalizeSize("6-pack")).toBe("6pk");
  });

  test("normalizes '1 litre' to '1L'", () => {
    expect(normalizeSize("1 litre")).toBe("1L");
  });

  test("normalizes '1000ml' to '1L'", () => {
    expect(normalizeSize("1000ml")).toBe("1L");
  });

  test("normalizes '2000g' to '2kg'", () => {
    expect(normalizeSize("2000g")).toBe("2kg");
  });

  test("returns original for unparseable sizes", () => {
    expect(normalizeSize("unknown")).toBe("unknown");
  });

  test("returns original for empty string", () => {
    expect(normalizeSize("")).toBe("");
  });

  test("handles pre-formatted sizes", () => {
    // Already formatted sizes should return similar display
    expect(normalizeSize("500ml")).toBe("500ml");
    expect(normalizeSize("2pt")).toBe("2pt");
    expect(normalizeSize("1kg")).toBe("1kg");
  });
});

// ============================================================================
// calculatePricePerUnit
// ============================================================================

describe("calculatePricePerUnit", () => {
  test("calculates price per 100ml for pints", () => {
    // 2pt milk = 1136ml, £1.45
    // £1.45 / 1136ml * 100 = £0.1276/100ml
    const ppu = calculatePricePerUnit(1.45, "2pt");
    expect(ppu).toBeCloseTo(0.1276, 3);
  });

  test("calculates price per 100ml for litres", () => {
    // 1L = 1000ml, £1.00
    // £1.00 / 1000ml * 100 = £0.10/100ml
    const ppu = calculatePricePerUnit(1.0, "1L");
    expect(ppu).toBeCloseTo(0.1, 3);
  });

  test("calculates price per 100g for weight", () => {
    // 250g butter = £2.50
    // £2.50 / 250g * 100 = £1.00/100g
    const ppu = calculatePricePerUnit(2.5, "250g");
    expect(ppu).toBe(1.0);
  });

  test("calculates price per 100g for kg", () => {
    // 1kg = 1000g, £5.00
    // £5.00 / 1000g * 100 = £0.50/100g
    const ppu = calculatePricePerUnit(5.0, "1kg");
    expect(ppu).toBeCloseTo(0.5, 3);
  });

  test("calculates price per item for count units", () => {
    // 6pk eggs = £2.10
    // £2.10 / 6 = £0.35/each
    const ppu = calculatePricePerUnit(2.1, "6pk");
    expect(ppu).toBeCloseTo(0.35, 2);
  });

  test("calculates price per item for 12-pack", () => {
    // 12pk = £3.60
    // £3.60 / 12 = £0.30/each
    const ppu = calculatePricePerUnit(3.6, "12pack");
    expect(ppu).toBeCloseTo(0.3, 2);
  });

  test("returns null for invalid sizes", () => {
    expect(calculatePricePerUnit(1.0, "invalid")).toBeNull();
  });

  test("returns null for empty size string", () => {
    expect(calculatePricePerUnit(1.0, "")).toBeNull();
  });
});

// ============================================================================
// formatPricePerUnit
// ============================================================================

describe("formatPricePerUnit", () => {
  test("formats volume prices correctly", () => {
    expect(formatPricePerUnit(0.73, "volume")).toBe("£0.73/100ml");
  });

  test("formats weight prices correctly", () => {
    expect(formatPricePerUnit(1.0, "weight")).toBe("£1.00/100g");
  });

  test("formats count prices correctly", () => {
    expect(formatPricePerUnit(0.35, "count")).toBe("£0.35/each");
  });

  test("handles very small prices (sub-penny)", () => {
    expect(formatPricePerUnit(0.005, "volume")).toBe("£0.005/100ml");
  });

  test("handles large prices", () => {
    expect(formatPricePerUnit(10.5, "weight")).toBe("£10.50/100g");
  });

  test("rounds to 2 decimal places for normal prices", () => {
    expect(formatPricePerUnit(0.999, "volume")).toBe("£1.00/100ml");
  });
});

// ============================================================================
// areSizesComparable
// ============================================================================

describe("areSizesComparable", () => {
  test("returns true for same volume category", () => {
    expect(areSizesComparable("2pt", "1L")).toBe(true);
    expect(areSizesComparable("500ml", "2pt")).toBe(true);
    expect(areSizesComparable("1L", "750ml")).toBe(true);
  });

  test("returns true for same weight category", () => {
    expect(areSizesComparable("250g", "1kg")).toBe(true);
    expect(areSizesComparable("500g", "1lb")).toBe(true);
    expect(areSizesComparable("8oz", "227g")).toBe(true);
  });

  test("returns true for same count category", () => {
    expect(areSizesComparable("6pk", "12pack")).toBe(true);
    expect(areSizesComparable("4pk", "8pk")).toBe(true);
  });

  test("returns false for volume vs weight", () => {
    expect(areSizesComparable("500ml", "500g")).toBe(false);
  });

  test("returns false for volume vs count", () => {
    expect(areSizesComparable("2pt", "6pk")).toBe(false);
  });

  test("returns false for weight vs count", () => {
    expect(areSizesComparable("500g", "6pk")).toBe(false);
  });

  test("returns false for invalid first size", () => {
    expect(areSizesComparable("invalid", "500ml")).toBe(false);
  });

  test("returns false for invalid second size", () => {
    expect(areSizesComparable("500ml", "invalid")).toBe(false);
  });

  test("returns false for both invalid", () => {
    expect(areSizesComparable("invalid", "unknown")).toBe(false);
  });
});

// ============================================================================
// convertSize
// ============================================================================

describe("convertSize", () => {
  test("converts 2pt to ml", () => {
    expect(convertSize("2pt", "ml")).toBe("1136ml");
  });

  test("converts 1000ml to l", () => {
    expect(convertSize("1000ml", "l")).toBe("1L");
  });

  test("converts 1.5L to ml", () => {
    expect(convertSize("1.5L", "ml")).toBe("1500ml");
  });

  test("converts 1kg to g", () => {
    expect(convertSize("1kg", "g")).toBe("1000g");
  });

  test("converts 500g to kg", () => {
    expect(convertSize("500g", "kg")).toBe("0.5kg");
  });

  test("converts 1lb to g", () => {
    expect(convertSize("1lb", "g")).toBe("453.6g");
  });

  test("returns null for cross-category conversion", () => {
    expect(convertSize("500ml", "g")).toBeNull();
    expect(convertSize("1kg", "ml")).toBeNull();
    expect(convertSize("6pk", "ml")).toBeNull();
  });

  test("returns null for invalid source", () => {
    expect(convertSize("invalid", "ml")).toBeNull();
  });

  test("returns null for unknown target unit", () => {
    // @ts-expect-error Testing invalid input
    expect(convertSize("500ml", "xyz")).toBeNull();
  });
});

// ============================================================================
// UNIT_CONVERSIONS constant
// ============================================================================

describe("UNIT_CONVERSIONS constant", () => {
  test("has correct pint conversion", () => {
    expect(UNIT_CONVERSIONS.pt.factor).toBe(568);
    expect(UNIT_CONVERSIONS.pt.baseUnit).toBe("ml");
    expect(UNIT_CONVERSIONS.pt.category).toBe("volume");
  });

  test("has correct litre conversion", () => {
    expect(UNIT_CONVERSIONS.l.factor).toBe(1000);
    expect(UNIT_CONVERSIONS.L.factor).toBe(1000);
  });

  test("has correct kg conversion", () => {
    expect(UNIT_CONVERSIONS.kg.factor).toBe(1000);
    expect(UNIT_CONVERSIONS.kg.baseUnit).toBe("g");
    expect(UNIT_CONVERSIONS.kg.category).toBe("weight");
  });

  test("has correct lb conversion", () => {
    expect(UNIT_CONVERSIONS.lb.factor).toBe(453.6);
  });

  test("has correct oz conversion", () => {
    expect(UNIT_CONVERSIONS.oz.factor).toBe(28.35);
  });

  test("has all expected volume units", () => {
    const volumeUnits = [
      "pt",
      "pint",
      "pints",
      "l",
      "L",
      "litre",
      "liter",
      "litres",
      "liters",
      "ml",
      "millilitre",
      "milliliter",
      "millilitres",
      "milliliters",
      "cl",
      "centilitre",
      "centiliter",
    ];
    for (const unit of volumeUnits) {
      expect(UNIT_CONVERSIONS[unit]).toBeDefined();
      expect(UNIT_CONVERSIONS[unit].category).toBe("volume");
    }
  });

  test("has all expected weight units", () => {
    const weightUnits = [
      "kg",
      "kilogram",
      "kilograms",
      "kilo",
      "kilos",
      "g",
      "gram",
      "grams",
      "oz",
      "ounce",
      "ounces",
      "lb",
      "lbs",
      "pound",
      "pounds",
    ];
    for (const unit of weightUnits) {
      expect(UNIT_CONVERSIONS[unit]).toBeDefined();
      expect(UNIT_CONVERSIONS[unit].category).toBe("weight");
    }
  });

  test("has all expected count units", () => {
    const countUnits = ["pk", "pack", "packs", "each", "ea", "pcs", "pieces", "x"];
    for (const unit of countUnits) {
      expect(UNIT_CONVERSIONS[unit]).toBeDefined();
      expect(UNIT_CONVERSIONS[unit].category).toBe("count");
    }
  });
});

// ============================================================================
// Real-World Scenarios
// ============================================================================

describe("Real-World Scenarios", () => {
  test("UK milk sizes parse correctly", () => {
    const milkSizes = [
      { input: "1pt", expectedMl: 568 },
      { input: "2pt", expectedMl: 1136 },
      { input: "4pt", expectedMl: 2272 },
      { input: "6pt", expectedMl: 3408 },
      { input: "2 pints", expectedMl: 1136 },
    ];

    for (const { input, expectedMl } of milkSizes) {
      const result = parseSize(input);
      expect(result?.normalizedValue).toBe(expectedMl);
    }
  });

  test("common butter sizes parse correctly", () => {
    const butterSizes = [
      { input: "250g", expectedG: 250 },
      { input: "500g", expectedG: 500 },
      { input: "227g", expectedG: 227 }, // Common UK butter size
      { input: "8oz", expectedG: 226.8 }, // Imperial equivalent
    ];

    for (const { input, expectedG } of butterSizes) {
      const result = parseSize(input);
      expect(result?.normalizedValue).toBeCloseTo(expectedG, 1);
    }
  });

  test("egg pack sizes parse correctly", () => {
    const eggSizes = [
      { input: "6pk", expectedCount: 6 },
      { input: "10pk", expectedCount: 10 },
      { input: "12 pack", expectedCount: 12 },
      { input: "15pack", expectedCount: 15 },
    ];

    for (const { input, expectedCount } of eggSizes) {
      const result = parseSize(input);
      expect(result?.value).toBe(expectedCount);
      expect(result?.category).toBe("count");
    }
  });

  test("multipack items parse correctly", () => {
    // 4 x 100g yogurt
    const result = parseSize("4x100g");
    expect(result?.normalizedValue).toBe(400);
    expect(result?.category).toBe("weight");

    // 6 x 330ml cans
    const result2 = parseSize("6x330ml");
    expect(result2?.normalizedValue).toBe(1980);
    expect(result2?.category).toBe("volume");
  });

  test("wine bottle sizes parse correctly", () => {
    expect(parseSize("75cl")?.normalizedValue).toBe(750);
    expect(parseSize("1.5L")?.normalizedValue).toBe(1500);
    expect(parseSize("375ml")?.normalizedValue).toBe(375);
  });
});
