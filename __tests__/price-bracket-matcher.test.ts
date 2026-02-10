/**
 * Price-Bracket Matcher Tests
 *
 * Tests for the price-bracket matching algorithm that infers item variants
 * from receipt prices when size/unit information is missing.
 *
 * UK Grocery Price Reference (2025/2026):
 * - Milk 1pt: ~£0.65
 * - Milk 2pt: ~£1.15
 * - Milk 4pt: ~£1.55
 * - Milk 1L: ~£1.10
 * - Milk 2L: ~£1.65
 * - Bread 400g: ~£1.10
 * - Bread 800g: ~£1.50
 * - Butter 250g: ~£1.85
 * - Butter 500g: ~£3.20
 */

import {
  extractBaseItem,
  matchPriceBracket,
  findClosestVariant,
  calculatePriceDiff,
  DEFAULT_TOLERANCE,
  ItemVariant,
} from "../convex/lib/priceBracketMatcher";

// ============================================================================
// Test Data: Realistic UK Grocery Variants
// ============================================================================

const milkVariants: ItemVariant[] = [
  { variantName: "Whole Milk 1 Pint", size: "1", unit: "pt", estimatedPrice: 0.65, baseItem: "whole milk" },
  { variantName: "Whole Milk 2 Pints", size: "2", unit: "pt", estimatedPrice: 1.15, baseItem: "whole milk" },
  { variantName: "Whole Milk 4 Pints", size: "4", unit: "pt", estimatedPrice: 1.55, baseItem: "whole milk" },
  { variantName: "Whole Milk 1 Litre", size: "1", unit: "L", estimatedPrice: 1.10, baseItem: "whole milk" },
  { variantName: "Whole Milk 2 Litres", size: "2", unit: "L", estimatedPrice: 1.65, baseItem: "whole milk" },
];

const breadVariants: ItemVariant[] = [
  { variantName: "White Bread 400g", size: "400", unit: "g", estimatedPrice: 1.10, baseItem: "white bread" },
  { variantName: "White Bread 800g", size: "800", unit: "g", estimatedPrice: 1.50, baseItem: "white bread" },
];

const butterVariants: ItemVariant[] = [
  { variantName: "Butter 250g", size: "250", unit: "g", estimatedPrice: 1.85, baseItem: "butter" },
  { variantName: "Butter 500g", size: "500", unit: "g", estimatedPrice: 3.20, baseItem: "butter" },
];

const eggsVariants: ItemVariant[] = [
  { variantName: "Free Range Eggs 6 pack", size: "6", unit: "pack", estimatedPrice: 2.00, baseItem: "free range eggs" },
  { variantName: "Free Range Eggs 10 pack", size: "10", unit: "pack", estimatedPrice: 2.80, baseItem: "free range eggs" },
  { variantName: "Free Range Eggs 12 pack", size: "12", unit: "pack", estimatedPrice: 3.20, baseItem: "free range eggs" },
];

const colaVariants: ItemVariant[] = [
  { variantName: "Coca Cola 330ml", size: "330", unit: "ml", estimatedPrice: 1.25, baseItem: "coca cola" },
  { variantName: "Coca Cola 500ml", size: "500", unit: "ml", estimatedPrice: 1.75, baseItem: "coca cola" },
  { variantName: "Coca Cola 1L", size: "1", unit: "L", estimatedPrice: 2.00, baseItem: "coca cola" },
  { variantName: "Coca Cola 2L", size: "2", unit: "L", estimatedPrice: 2.50, baseItem: "coca cola" },
];

// ============================================================================
// extractBaseItem Tests
// ============================================================================

describe("extractBaseItem", () => {
  it("should strip pint sizes", () => {
    expect(extractBaseItem("Whole Milk 2 Pints")).toBe("whole milk");
    expect(extractBaseItem("Semi Skimmed Milk 4 pints")).toBe("semi skimmed milk");
    expect(extractBaseItem("MILK 1 PT")).toBe("milk");
  });

  it("should strip litre/liter sizes", () => {
    expect(extractBaseItem("Milk 1L")).toBe("milk");
    expect(extractBaseItem("Coca Cola 2 Litres")).toBe("coca cola");
    expect(extractBaseItem("Orange Juice 1 Litre")).toBe("orange juice");
    expect(extractBaseItem("Water 500ml")).toBe("water");
  });

  it("should strip gram/kilogram sizes", () => {
    expect(extractBaseItem("White Bread 800g")).toBe("white bread");
    expect(extractBaseItem("Butter 250g")).toBe("butter");
    expect(extractBaseItem("Rice 1kg")).toBe("rice");
    expect(extractBaseItem("Pasta 500 g")).toBe("pasta");
  });

  it("should strip pack sizes", () => {
    expect(extractBaseItem("Eggs 6 pack")).toBe("eggs");
    expect(extractBaseItem("Toilet Roll 9 Pack")).toBe("toilet roll");
  });

  it("should handle multiple spaces", () => {
    expect(extractBaseItem("Whole   Milk   2   Pints")).toBe("whole milk");
  });

  it("should lowercase the result", () => {
    expect(extractBaseItem("WHOLE MILK 2 PINTS")).toBe("whole milk");
    expect(extractBaseItem("TESCO BUTTER 250G")).toBe("tesco butter");
  });

  it("should handle items without sizes", () => {
    expect(extractBaseItem("Milk")).toBe("milk");
    expect(extractBaseItem("Butter")).toBe("butter");
  });

  it("should handle oz/lb imperial sizes", () => {
    expect(extractBaseItem("Cheese 8oz")).toBe("cheese");
    expect(extractBaseItem("Flour 2lb")).toBe("flour");
  });
});

// ============================================================================
// matchPriceBracket - Basic Functionality Tests
// ============================================================================

describe("matchPriceBracket - Basic Functionality", () => {
  it("should return no_match for empty variants array", () => {
    const result = matchPriceBracket(1.15, []);
    expect(result.matched).toBe(false);
    expect(result.matchType).toBe("no_match");
    expect(result.candidates).toHaveLength(0);
  });

  it("should use DEFAULT_TOLERANCE of 20%", () => {
    expect(DEFAULT_TOLERANCE).toBe(0.20);
  });

  it("should detect exact match (within 1%)", () => {
    const result = matchPriceBracket(1.15, milkVariants);
    expect(result.matched).toBe(true);
    expect(result.matchType).toBe("exact");
    expect(result.variant?.variantName).toBe("Whole Milk 2 Pints");
  });

  it("should match within tolerance range", () => {
    // £1.20 is 4.3% above £1.15 - within 20% tolerance
    // However, £1.20 is also within 20% of £1.10 (1L milk), so it's ambiguous
    const result = matchPriceBracket(1.20, milkVariants);
    // Multiple variants match: 2pt (£1.15) and 1L (£1.10)
    expect(result.matchType).toBe("ambiguous");
    expect(result.candidates.length).toBeGreaterThan(1);
  });

  it("should return no_match when price is far outside all ranges", () => {
    const result = matchPriceBracket(5.00, milkVariants);
    expect(result.matched).toBe(false);
    expect(result.matchType).toBe("no_match");
  });

  it("should return ambiguous when multiple variants match", () => {
    // Milk 1L (£1.10) and Milk 2pt (£1.15) are close - both within tolerance of £1.12
    const result = matchPriceBracket(1.12, milkVariants);
    // Both £1.10 and £1.15 should be within 20% tolerance of £1.12
    expect(result.matched).toBe(false);
    expect(result.matchType).toBe("ambiguous");
    expect(result.candidates.length).toBeGreaterThan(1);
  });

  it("should include tolerance in result", () => {
    const result = matchPriceBracket(1.15, milkVariants, 0.15);
    expect(result.tolerance).toBe(0.15);
  });
});

// ============================================================================
// matchPriceBracket - UK Milk Variants Tests
// ============================================================================

describe("matchPriceBracket - Milk Variants", () => {
  it("should match 1 pint milk at £0.65", () => {
    const result = matchPriceBracket(0.65, milkVariants);
    expect(result.matched).toBe(true);
    expect(result.variant?.size).toBe("1");
    expect(result.variant?.unit).toBe("pt");
  });

  it("should match 2 pint milk at £1.15", () => {
    const result = matchPriceBracket(1.15, milkVariants);
    expect(result.matched).toBe(true);
    expect(result.variant?.size).toBe("2");
    expect(result.variant?.unit).toBe("pt");
  });

  it("should match 4 pint milk at £1.55", () => {
    const result = matchPriceBracket(1.55, milkVariants);
    expect(result.matched).toBe(true);
    expect(result.variant?.size).toBe("4");
    expect(result.variant?.unit).toBe("pt");
  });

  it("should match 2L milk at £1.65", () => {
    const result = matchPriceBracket(1.65, milkVariants);
    expect(result.matched).toBe(true);
    expect(result.variant?.size).toBe("2");
    expect(result.variant?.unit).toBe("L");
  });

  it("should handle slight price variations (Tesco vs Aldi)", () => {
    // Aldi might sell 2pt milk at £0.99 instead of £1.15
    // But £0.99 is also within tolerance of 1L (£1.10) - 10% difference
    // And within tolerance of 2pt (£1.15) - 13.9% difference
    const result = matchPriceBracket(0.99, milkVariants);
    // This creates ambiguity between 1L and 2pt
    expect(result.matchType).toBe("ambiguous");
    expect(result.candidates.length).toBeGreaterThan(1);
  });
});

// ============================================================================
// matchPriceBracket - Bread Variants Tests
// ============================================================================

describe("matchPriceBracket - Bread Variants", () => {
  it("should match 400g bread at £1.10", () => {
    const result = matchPriceBracket(1.10, breadVariants);
    expect(result.matched).toBe(true);
    expect(result.variant?.size).toBe("400");
    expect(result.variant?.unit).toBe("g");
  });

  it("should match 800g bread at £1.50", () => {
    const result = matchPriceBracket(1.50, breadVariants);
    expect(result.matched).toBe(true);
    expect(result.variant?.size).toBe("800");
    expect(result.variant?.unit).toBe("g");
  });

  it("should handle ambiguous price between 400g and 800g", () => {
    // £1.30 is exactly between £1.10 and £1.50
    // £1.10 * 1.20 = £1.32 (upper bound for 400g)
    // £1.50 * 0.80 = £1.20 (lower bound for 800g)
    // So £1.30 could match both
    const result = matchPriceBracket(1.30, breadVariants);
    // This might be ambiguous or match one depending on exact tolerance calc
    // £1.30 is 18.2% above £1.10 and 13.3% below £1.50 - both within tolerance
    expect(result.matchType).toBe("ambiguous");
  });
});

// ============================================================================
// matchPriceBracket - Butter Variants Tests
// ============================================================================

describe("matchPriceBracket - Butter Variants", () => {
  it("should match 250g butter at £1.85", () => {
    const result = matchPriceBracket(1.85, butterVariants);
    expect(result.matched).toBe(true);
    expect(result.variant?.size).toBe("250");
  });

  it("should match 500g butter at £3.20", () => {
    const result = matchPriceBracket(3.20, butterVariants);
    expect(result.matched).toBe(true);
    expect(result.variant?.size).toBe("500");
  });

  it("should unambiguously match variants with large price gaps", () => {
    // £2.50 is between £1.85 and £3.20
    // The tolerance is calculated as: |receiptPrice - variantPrice| / variantPrice
    // For 250g: |2.50 - 1.85| / 1.85 = 0.35 = 35% - outside 20% tolerance
    // For 500g: |2.50 - 3.20| / 3.20 = 0.22 = 22% - outside 20% tolerance
    // So £2.50 matches NEITHER variant
    const result = matchPriceBracket(2.50, butterVariants);
    expect(result.matched).toBe(false);
    expect(result.matchType).toBe("no_match");
  });

  it("should not match price far below smallest variant", () => {
    const result = matchPriceBracket(1.00, butterVariants);
    expect(result.matched).toBe(false);
    expect(result.matchType).toBe("no_match");
  });
});

// ============================================================================
// matchPriceBracket - Edge Cases
// ============================================================================

describe("matchPriceBracket - Edge Cases", () => {
  it("should handle variants with null prices", () => {
    const variantsWithNull: ItemVariant[] = [
      { variantName: "Item A", size: "1", unit: "unit", estimatedPrice: null, baseItem: "item" },
      { variantName: "Item B", size: "2", unit: "unit", estimatedPrice: 2.00, baseItem: "item" },
    ];
    const result = matchPriceBracket(2.00, variantsWithNull);
    expect(result.matched).toBe(true);
    expect(result.variant?.variantName).toBe("Item B");
  });

  it("should return no_match when all variants have null prices", () => {
    const nullVariants: ItemVariant[] = [
      { variantName: "Item A", size: "1", unit: "unit", estimatedPrice: null, baseItem: "item" },
      { variantName: "Item B", size: "2", unit: "unit", estimatedPrice: null, baseItem: "item" },
    ];
    const result = matchPriceBracket(1.50, nullVariants);
    expect(result.matched).toBe(false);
    expect(result.matchType).toBe("no_match");
  });

  it("should handle custom tolerance", () => {
    // With 10% tolerance, fewer matches
    const result = matchPriceBracket(1.25, milkVariants, 0.10);
    // £1.25 is 8.7% above £1.15 - within 10% tolerance
    expect(result.matched).toBe(true);
    expect(result.variant?.size).toBe("2");
  });

  it("should handle very small tolerance (5%)", () => {
    // With 5% tolerance, need near-exact match
    const result = matchPriceBracket(1.18, milkVariants, 0.05);
    // £1.18 is 2.6% above £1.15 - within 5% tolerance
    expect(result.matched).toBe(true);
    expect(result.variant?.size).toBe("2");
  });

  it("should handle zero price receipt (error case)", () => {
    const result = matchPriceBracket(0, milkVariants);
    expect(result.matched).toBe(false);
  });

  it("should handle very high prices", () => {
    const premiumMilk: ItemVariant[] = [
      { variantName: "Organic Milk 2L", size: "2", unit: "L", estimatedPrice: 3.50, baseItem: "organic milk" },
    ];
    const result = matchPriceBracket(3.60, premiumMilk);
    expect(result.matched).toBe(true);
  });

  it("should prefer exact match over bracket match", () => {
    const overlappingVariants: ItemVariant[] = [
      { variantName: "Item Small", size: "S", unit: "unit", estimatedPrice: 1.00, baseItem: "item" },
      { variantName: "Item Medium", size: "M", unit: "unit", estimatedPrice: 1.15, baseItem: "item" },
    ];
    // £1.15 is exact match for Medium, also within 20% of Small (£1.00)
    const result = matchPriceBracket(1.15, overlappingVariants);
    expect(result.matchType).toBe("exact");
    expect(result.variant?.size).toBe("M");
  });
});

// ============================================================================
// matchPriceBracket - Eggs Variants Tests
// ============================================================================

describe("matchPriceBracket - Eggs Variants", () => {
  it("should match 6-pack eggs at £2.00", () => {
    const result = matchPriceBracket(2.00, eggsVariants);
    expect(result.matched).toBe(true);
    expect(result.variant?.size).toBe("6");
  });

  it("should handle ambiguous 10-pack vs 12-pack pricing", () => {
    // 10-pack at £2.80 and 12-pack at £3.20 are close
    // £3.00 is 7.1% above £2.80 and 6.25% below £3.20
    const result = matchPriceBracket(3.00, eggsVariants);
    expect(result.matchType).toBe("ambiguous");
    expect(result.candidates.length).toBe(2);
  });

  it("should match 12-pack at exact price", () => {
    const result = matchPriceBracket(3.20, eggsVariants);
    expect(result.matched).toBe(true);
    expect(result.variant?.size).toBe("12");
  });
});

// ============================================================================
// matchPriceBracket - Cola Variants Tests
// ============================================================================

describe("matchPriceBracket - Cola Variants", () => {
  it("should match 330ml can", () => {
    const result = matchPriceBracket(1.25, colaVariants);
    expect(result.matched).toBe(true);
    expect(result.variant?.size).toBe("330");
    expect(result.variant?.unit).toBe("ml");
  });

  it("should match 2L bottle", () => {
    const result = matchPriceBracket(2.50, colaVariants);
    expect(result.matched).toBe(true);
    expect(result.variant?.size).toBe("2");
    expect(result.variant?.unit).toBe("L");
  });

  it("should handle price that falls between variants", () => {
    // £1.50 is between 330ml (£1.25) and 500ml (£1.75)
    // Tolerance calc: |receiptPrice - variantPrice| / variantPrice
    // For 330ml: |1.50 - 1.25| / 1.25 = 0.20 = 20% - exactly at tolerance boundary
    // For 500ml: |1.50 - 1.75| / 1.75 = 0.14 = 14% - within tolerance
    // The 330ml is at exactly 20% which is <= 0.20 so it matches too
    // Result is ambiguous (both match)
    const result = matchPriceBracket(1.50, colaVariants);
    expect(result.matchType).toBe("ambiguous");
    expect(result.candidates.length).toBe(2);
  });
});

// ============================================================================
// findClosestVariant Tests
// ============================================================================

describe("findClosestVariant", () => {
  it("should return null for empty variants", () => {
    const result = findClosestVariant(1.15, []);
    expect(result).toBeNull();
  });

  it("should return closest variant by price", () => {
    const result = findClosestVariant(1.20, milkVariants);
    expect(result).not.toBeNull();
    // £1.20 is closest to £1.15 (2pt) - difference of £0.05
    expect(result?.size).toBe("2");
    expect(result?.unit).toBe("pt");
  });

  it("should find closest when price is between variants", () => {
    // £1.35 is between 2pt (£1.15) and 4pt (£1.55)
    const result = findClosestVariant(1.35, milkVariants);
    expect(result).not.toBeNull();
    // Closer to £1.55 (difference £0.20) than £1.15 (difference £0.20) - could be either
    // Actually both are equal distance, so implementation returns first found
  });

  it("should skip variants with null prices", () => {
    const mixedVariants: ItemVariant[] = [
      { variantName: "Item A", size: "1", unit: "unit", estimatedPrice: null, baseItem: "item" },
      { variantName: "Item B", size: "2", unit: "unit", estimatedPrice: 2.00, baseItem: "item" },
    ];
    const result = findClosestVariant(1.50, mixedVariants);
    expect(result?.variantName).toBe("Item B");
  });

  it("should return null when all prices are null", () => {
    const nullVariants: ItemVariant[] = [
      { variantName: "Item A", size: "1", unit: "unit", estimatedPrice: null, baseItem: "item" },
    ];
    const result = findClosestVariant(1.50, nullVariants);
    expect(result).toBeNull();
  });

  it("should handle exact price match", () => {
    const result = findClosestVariant(1.15, milkVariants);
    expect(result?.variantName).toBe("Whole Milk 2 Pints");
  });
});

// ============================================================================
// calculatePriceDiff Tests
// ============================================================================

describe("calculatePriceDiff", () => {
  it("should calculate 0% difference for same prices", () => {
    expect(calculatePriceDiff(1.15, 1.15)).toBe(0);
  });

  it("should calculate difference as percentage of variant price", () => {
    // £1.20 vs £1.00 = 20% difference
    expect(calculatePriceDiff(1.20, 1.00)).toBeCloseTo(0.20);
  });

  it("should return absolute difference", () => {
    // Whether receipt is higher or lower, difference should be positive
    expect(calculatePriceDiff(0.80, 1.00)).toBeCloseTo(0.20);
    expect(calculatePriceDiff(1.20, 1.00)).toBeCloseTo(0.20);
  });

  it("should handle small price differences", () => {
    // £1.16 vs £1.15 = ~0.87% difference
    const diff = calculatePriceDiff(1.16, 1.15);
    expect(diff).toBeLessThan(0.01);
  });

  it("should handle large price differences", () => {
    // £2.00 vs £1.00 = 100% difference
    expect(calculatePriceDiff(2.00, 1.00)).toBe(1.00);
  });
});

// ============================================================================
// Real-World Receipt Scenarios
// ============================================================================

describe("Real-World Receipt Scenarios", () => {
  it("Scenario: TESCO receipt - MILK £1.15 (no size)", () => {
    // Common UK receipt format: just "MILK" with price
    const receiptPrice = 1.15;
    const result = matchPriceBracket(receiptPrice, milkVariants);
    expect(result.matched).toBe(true);
    expect(result.variant?.size).toBe("2");
    expect(result.variant?.unit).toBe("pt");
    // Result: Milk | 2pt | £1.15
  });

  it("Scenario: ALDI receipt - BREAD £1.09 (discounted)", () => {
    // Aldi often has slightly lower prices
    const receiptPrice = 1.09;
    const result = matchPriceBracket(receiptPrice, breadVariants);
    expect(result.matched).toBe(true);
    expect(result.variant?.size).toBe("400");
    // Result: Bread | 400g | £1.09
  });

  it("Scenario: SAINSBURYS receipt - BUTTER £1.95 (price increase)", () => {
    // Prices fluctuate - still should match 250g
    const receiptPrice = 1.95;
    const result = matchPriceBracket(receiptPrice, butterVariants);
    expect(result.matched).toBe(true);
    expect(result.variant?.size).toBe("250");
    // Result: Butter | 250g | £1.95
  });

  it("Scenario: LIDL receipt - Unknown item with no variants", () => {
    const singleVariant: ItemVariant[] = [
      { variantName: "Hummus 200g", size: "200", unit: "g", estimatedPrice: 1.29, baseItem: "hummus" },
    ];
    const result = matchPriceBracket(1.29, singleVariant);
    expect(result.matched).toBe(true);
    expect(result.matchType).toBe("exact");
  });

  it("Scenario: WAITROSE receipt - Premium milk £1.80", () => {
    // Waitrose is more expensive - might not match standard variants
    const receiptPrice = 1.80;
    const result = matchPriceBracket(receiptPrice, milkVariants);
    // £1.80 is 9% above £1.65 (2L) - within tolerance, should match
    // Also check 4pt (£1.55): |1.80 - 1.55| / 1.55 = 16% - also within tolerance
    // This creates ambiguity between 2L and 4pt
    expect(result.matchType).toBe("ambiguous");
    expect(result.candidates.length).toBe(2);
  });

  it("Scenario: Clubcard/Nectar discount - EGGS £2.40 (was £2.80)", () => {
    // Loyalty discounts can cause ambiguity
    const receiptPrice = 2.40;
    const result = matchPriceBracket(receiptPrice, eggsVariants);
    // £2.40 is 20% above £2.00 (6-pack, at tolerance limit)
    // £2.40 is 14.3% below £2.80 (10-pack)
    // Might be ambiguous
    expect(result.candidates.length).toBeGreaterThanOrEqual(1);
  });

  it("Scenario: Multi-buy offer - 2 for £3 (£1.50 each)", () => {
    const receiptPrice = 1.50;
    const result = matchPriceBracket(receiptPrice, breadVariants);
    expect(result.matched).toBe(true);
    expect(result.variant?.size).toBe("800");
    // Result: Bread | 800g | £1.50 (multi-buy price matched)
  });
});

// ============================================================================
// Accuracy Analysis
// ============================================================================

describe("Accuracy Analysis", () => {
  // Test cases representing real receipt data
  const testCases = [
    { item: "Milk", price: 0.65, expectedSize: "1", expectedUnit: "pt", variants: milkVariants },
    { item: "Milk", price: 1.15, expectedSize: "2", expectedUnit: "pt", variants: milkVariants },
    { item: "Milk", price: 1.55, expectedSize: "4", expectedUnit: "pt", variants: milkVariants },
    { item: "Milk", price: 1.10, expectedSize: "1", expectedUnit: "L", variants: milkVariants },
    { item: "Milk", price: 1.65, expectedSize: "2", expectedUnit: "L", variants: milkVariants },
    { item: "Bread", price: 1.10, expectedSize: "400", expectedUnit: "g", variants: breadVariants },
    { item: "Bread", price: 1.50, expectedSize: "800", expectedUnit: "g", variants: breadVariants },
    { item: "Butter", price: 1.85, expectedSize: "250", expectedUnit: "g", variants: butterVariants },
    { item: "Butter", price: 3.20, expectedSize: "500", expectedUnit: "g", variants: butterVariants },
    { item: "Eggs", price: 2.00, expectedSize: "6", expectedUnit: "pack", variants: eggsVariants },
    { item: "Cola", price: 1.25, expectedSize: "330", expectedUnit: "ml", variants: colaVariants },
    { item: "Cola", price: 2.50, expectedSize: "2", expectedUnit: "L", variants: colaVariants },
  ];

  it("should achieve >80% accuracy on exact price matches", () => {
    let correct = 0;
    let total = testCases.length;

    for (const tc of testCases) {
      const result = matchPriceBracket(tc.price, tc.variants);
      if (result.matched && result.variant?.size === tc.expectedSize && result.variant?.unit === tc.expectedUnit) {
        correct++;
      }
    }

    const accuracy = (correct / total) * 100;
    console.log(`Exact price accuracy: ${correct}/${total} = ${accuracy.toFixed(1)}%`);
    expect(accuracy).toBeGreaterThanOrEqual(80);
  });

  it("should achieve reasonable accuracy with price variations (+-10%)", () => {
    let correct = 0;
    let ambiguous = 0;
    let noMatch = 0;
    let total = 0;

    for (const tc of testCases) {
      // Test with +10%, -10%, and exact price
      const priceVariations = [
        tc.price,
        tc.price * 0.90,
        tc.price * 1.10,
      ];

      for (const price of priceVariations) {
        total++;
        const result = matchPriceBracket(price, tc.variants);
        if (result.matched && result.variant?.size === tc.expectedSize && result.variant?.unit === tc.expectedUnit) {
          correct++;
        } else if (result.matchType === "ambiguous") {
          // Check if expected variant is among candidates
          const inCandidates = result.candidates.some(
            (c) => c.size === tc.expectedSize && c.unit === tc.expectedUnit
          );
          if (inCandidates) ambiguous++;
        } else {
          noMatch++;
        }
      }
    }

    const accuracy = (correct / total) * 100;
    const ambiguousRate = (ambiguous / total) * 100;
    const noMatchRate = (noMatch / total) * 100;
    console.log(`Price variation accuracy: ${correct}/${total} = ${accuracy.toFixed(1)}%`);
    console.log(`Ambiguous (expected in candidates): ${ambiguous}/${total} = ${ambiguousRate.toFixed(1)}%`);
    console.log(`No match: ${noMatch}/${total} = ${noMatchRate.toFixed(1)}%`);

    // When including "ambiguous but correct candidate" results, we should hit >80%
    const effectiveAccuracy = ((correct + ambiguous) / total) * 100;
    console.log(`Effective accuracy (correct + ambiguous with expected): ${effectiveAccuracy.toFixed(1)}%`);
    expect(effectiveAccuracy).toBeGreaterThanOrEqual(80);
  });
});

// ============================================================================
// Edge Case Documentation
// ============================================================================

describe("Edge Case Documentation", () => {
  /**
   * EDGE CASE 1: Overlapping Price Ranges
   *
   * When variants have similar prices (e.g., Milk 1L at £1.10 and 2pt at £1.15),
   * the 20% tolerance can cause ambiguity. A price of £1.12 falls within both ranges.
   *
   * Solution: Return "ambiguous" and let user choose, or use additional context
   * (e.g., user's purchase history to infer preferred size).
   */
  it("documents overlapping price range issue", () => {
    const result = matchPriceBracket(1.12, milkVariants);
    expect(result.matchType).toBe("ambiguous");
    // Both 1L (£1.10) and 2pt (£1.15) are within tolerance
  });

  /**
   * EDGE CASE 2: No Size on Receipt
   *
   * When receipt just says "MILK £1.15" without any size info, the price-bracket
   * matcher is the primary mechanism for inferring the variant.
   *
   * This is the main use case for this module.
   */
  it("documents no-size receipt handling", () => {
    const receiptItem = "MILK"; // No size info
    const receiptPrice = 1.15;
    const baseItem = extractBaseItem(receiptItem);
    expect(baseItem).toBe("milk");

    const result = matchPriceBracket(receiptPrice, milkVariants);
    expect(result.matched).toBe(true);
    expect(result.variant?.size).toBe("2");
  });

  /**
   * EDGE CASE 3: All Variants Same Price
   *
   * Rare case where all size variants are priced the same (e.g., promotional pricing).
   * Matcher will return "ambiguous" since it can't differentiate.
   */
  it("documents same-price variants issue", () => {
    const samePriceVariants: ItemVariant[] = [
      { variantName: "Item S", size: "S", unit: "unit", estimatedPrice: 1.50, baseItem: "item" },
      { variantName: "Item M", size: "M", unit: "unit", estimatedPrice: 1.50, baseItem: "item" },
      { variantName: "Item L", size: "L", unit: "unit", estimatedPrice: 1.50, baseItem: "item" },
    ];
    const result = matchPriceBracket(1.50, samePriceVariants);
    // All three have exact same price - returns first exact match
    expect(result.matchType).toBe("exact");
    expect(result.variant?.size).toBe("S"); // First match
  });

  /**
   * EDGE CASE 4: Price Exactly Between Two Variants
   *
   * When receipt price is exactly equidistant from two variant prices,
   * both fall within tolerance, causing ambiguity.
   */
  it("documents equidistant price issue", () => {
    // £1.325 is exactly between £1.10 (400g bread) and £1.50 (800g bread)
    const result = matchPriceBracket(1.325, breadVariants);
    // Likely ambiguous as both are within 20% tolerance
    // £1.10 * 1.20 = £1.32, so £1.325 is just outside 400g tolerance
    // £1.50 * 0.80 = £1.20, so £1.325 is within 800g tolerance
    expect(result.matched).toBe(true);
    expect(result.variant?.size).toBe("800");
  });

  /**
   * EDGE CASE 5: No Variants Exist
   *
   * For items without any variants in the database, matcher returns no_match.
   * The calling code should fall back to AI estimation.
   */
  it("documents no-variants-exist handling", () => {
    const result = matchPriceBracket(2.50, []);
    expect(result.matchType).toBe("no_match");
    expect(result.candidates).toHaveLength(0);
  });

  /**
   * EDGE CASE 6: Promotional/Sale Prices
   *
   * Deep discounts (e.g., BOGOF, 50% off) can put prices far outside normal ranges.
   * A £3.20 item at 50% off (£1.60) might match the wrong variant.
   */
  it("documents promotional pricing issue", () => {
    // Butter 500g (normally £3.20) on sale at 50% off = £1.60
    // This is close to 250g butter (£1.85) - might mismatch
    const salePrice = 1.60;
    const result = matchPriceBracket(salePrice, butterVariants);
    // £1.60 is 13.5% below £1.85 (250g) - within tolerance
    // £1.60 is 50% below £3.20 (500g) - outside tolerance
    expect(result.matched).toBe(true);
    expect(result.variant?.size).toBe("250"); // Wrong! It's actually 500g on sale
    // This is a known limitation - sales prices can cause mismatches
  });

  /**
   * EDGE CASE 7: Store-Specific Pricing
   *
   * Waitrose prices are typically 10-20% higher than Aldi.
   * The same item at different stores may create ambiguity due to
   * overlapping price ranges between variants.
   *
   * This is a fundamental limitation: items with similar variant prices
   * (like Milk 1L at £1.10 and Milk 2pt at £1.15) will often be ambiguous
   * when prices vary by store.
   */
  it("documents store-specific pricing variations", () => {
    // Aldi milk 2pt: ~£0.99
    // Waitrose milk 2pt: ~£1.35
    // Due to close variant prices (1L=£1.10, 2pt=£1.15), both create ambiguity

    const aldiResult = matchPriceBracket(0.99, milkVariants);
    const waitroseResult = matchPriceBracket(1.35, milkVariants);

    // £0.99 is close to both 1L (£1.10) and 2pt (£1.15) - ambiguous
    expect(aldiResult.matchType).toBe("ambiguous");
    // But the expected variant should be in candidates
    expect(aldiResult.candidates.some((c) => c.size === "2" && c.unit === "pt")).toBe(true);

    // £1.35 is also ambiguous - close to 2pt (£1.15), 4pt (£1.55), 1L (£1.10)
    expect(waitroseResult.matchType).toBe("ambiguous");
    expect(waitroseResult.candidates.some((c) => c.size === "2" && c.unit === "pt")).toBe(true);
  });
});
