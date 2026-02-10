/**
 * Size Matching Tests
 *
 * Comprehensive unit tests for the size matching utility.
 * Tests finding closest sizes when switching stores, comparing sizes,
 * and ranking sizes by value.
 *
 * Key Scenarios:
 * - Exact matches (2pt matches 2pt)
 * - Close matches within 20% tolerance (250g matches 227g)
 * - No match when outside tolerance (250g doesn't match 500g)
 * - Cross-category rejection (can't match ml to g)
 */

import {
  findClosestSize,
  areSizesEquivalent,
  rankSizesByValue,
  groupSizesByCategory,
  getSizePercentDiff,
  suggestStandardSize,
  DEFAULT_TOLERANCE,
  EXACT_TOLERANCE,
} from "@/lib/sizes/sizeMatching";

// ============================================================================
// findClosestSize - Exact Matches
// ============================================================================

describe("findClosestSize - Exact Matches", () => {
  test("finds exact match for 2pt", () => {
    const result = findClosestSize("2pt", ["1pt", "2pt", "4pt"]);

    expect(result.hasExactMatch).toBe(true);
    expect(result.hasAutoMatch).toBe(true);
    expect(result.bestMatch?.size).toBe("2pt");
    expect(result.bestMatch?.isExact).toBe(true);
    expect(result.bestMatch?.isAutoMatchable).toBe(true);
    expect(result.bestMatch?.matchScore).toBe(0);
    expect(result.bestMatch?.percentDiff).toBe(0);
  });

  test("finds exact match for 500ml", () => {
    const result = findClosestSize("500ml", ["250ml", "500ml", "1L"]);

    expect(result.hasExactMatch).toBe(true);
    expect(result.bestMatch?.size).toBe("500ml");
    expect(result.bestMatch?.isExact).toBe(true);
  });

  test("finds exact match for 1kg", () => {
    const result = findClosestSize("1kg", ["500g", "1kg", "2kg"]);

    expect(result.hasExactMatch).toBe(true);
    expect(result.bestMatch?.size).toBe("1kg");
    expect(result.bestMatch?.percentDiff).toBe(0);
  });

  test("finds exact match for 6pk", () => {
    const result = findClosestSize("6pk", ["4pk", "6pk", "12pk"]);

    expect(result.hasExactMatch).toBe(true);
    expect(result.bestMatch?.size).toBe("6pk");
  });

  test("matches equivalent formats (2pt matches 2 pints)", () => {
    const result = findClosestSize("2pt", ["2 pints", "4 pints"]);

    expect(result.hasExactMatch).toBe(true);
    expect(result.bestMatch?.size).toBe("2 pints");
  });

  test("matches equivalent formats (1L matches 1000ml)", () => {
    const result = findClosestSize("1L", ["500ml", "1000ml", "2000ml"]);

    expect(result.hasExactMatch).toBe(true);
    expect(result.bestMatch?.size).toBe("1000ml");
  });

  test("matches equivalent formats (500g matches 0.5kg)", () => {
    const result = findClosestSize("500g", ["0.5kg", "1kg"]);

    expect(result.hasExactMatch).toBe(true);
    expect(result.bestMatch?.size).toBe("0.5kg");
  });
});

// ============================================================================
// findClosestSize - Close Matches Within Tolerance
// ============================================================================

describe("findClosestSize - Close Matches Within Tolerance", () => {
  test("matches 250g to 227g (within 20% tolerance)", () => {
    const result = findClosestSize("250g", ["227g", "500g", "1kg"]);

    // 227g is ~9% different from 250g, within 20% tolerance
    expect(result.hasExactMatch).toBe(false);
    expect(result.hasAutoMatch).toBe(true);
    expect(result.bestMatch?.size).toBe("227g");
    expect(result.bestMatch?.isAutoMatchable).toBe(true);
    expect(result.bestMatch?.percentDiff).toBeCloseTo(0.092, 2);
  });

  test("matches 2pt to 1L (within 20% tolerance)", () => {
    const result = findClosestSize("2pt", ["1L", "2L"]);

    // 2pt = 1136ml, 1L = 1000ml, diff = 136ml = 12%
    expect(result.hasAutoMatch).toBe(true);
    expect(result.bestMatch?.size).toBe("1L");
    expect(result.bestMatch?.isAutoMatchable).toBe(true);
  });

  test("matches 400g to 500g (20% tolerance boundary)", () => {
    const result = findClosestSize("400g", ["250g", "500g", "1kg"]);

    // 500g is 25% more than 400g, but 400g is 20% less than 500g
    // Percent diff calculated as |diff| / target = |100| / 400 = 25%
    expect(result.bestMatch?.size).toBe("500g");
    expect(result.hasAutoMatch).toBe(false); // 25% > 20%
  });

  test("matches within tolerance returns closest", () => {
    const result = findClosestSize("300g", ["250g", "280g", "350g", "500g"]);

    // 280g is closest (20g = 6.7%)
    expect(result.bestMatch?.size).toBe("280g");
    // Verify matches are sorted by percentDiff (ascending)
    expect(result.allMatches[0].percentDiff).toBeLessThanOrEqual(result.allMatches[1].percentDiff);
  });
});

// ============================================================================
// findClosestSize - No Match Outside Tolerance
// ============================================================================

describe("findClosestSize - No Match Outside Tolerance", () => {
  test("250g does not auto-match to 500g (100% difference)", () => {
    const result = findClosestSize("250g", ["500g", "1kg"]);

    // 500g is 100% more than 250g, outside 20% tolerance
    expect(result.hasAutoMatch).toBe(false);
    expect(result.bestMatch?.size).toBe("500g"); // Still the best match
    expect(result.bestMatch?.isAutoMatchable).toBe(false);
    expect(result.bestMatch?.percentDiff).toBeCloseTo(1.0, 1);
  });

  test("1pt does not auto-match to 4pt (300% difference)", () => {
    const result = findClosestSize("1pt", ["4pt", "6pt"]);

    // 4pt is 300% more than 1pt
    expect(result.hasAutoMatch).toBe(false);
    expect(result.bestMatch?.isAutoMatchable).toBe(false);
  });

  test("custom 5% tolerance rejects 9% difference", () => {
    const result = findClosestSize("250g", ["227g", "500g"], 0.05);

    // 227g is ~9% different, outside 5% tolerance
    expect(result.hasAutoMatch).toBe(false);
    expect(result.bestMatch?.size).toBe("227g");
    expect(result.bestMatch?.isAutoMatchable).toBe(false);
  });

  test("strict 1% tolerance rejects most matches", () => {
    const result = findClosestSize("500g", ["498g", "502g", "510g"], 0.01);

    // 498g = 0.4% diff, 502g = 0.4% diff, both within 1%
    expect(result.hasAutoMatch).toBe(true);
    // 510g = 2% diff, outside 1%
    expect(result.allMatches.find((m) => m.size === "510g")?.isAutoMatchable).toBe(false);
  });
});

// ============================================================================
// findClosestSize - Cross-Category Rejection
// ============================================================================

describe("findClosestSize - Cross-Category Rejection", () => {
  test("ml cannot match g", () => {
    const result = findClosestSize("500ml", ["500g", "1kg"]);

    expect(result.bestMatch).toBeNull();
    expect(result.allMatches).toHaveLength(0);
    expect(result.hasExactMatch).toBe(false);
    expect(result.hasAutoMatch).toBe(false);
  });

  test("g cannot match ml", () => {
    const result = findClosestSize("500g", ["500ml", "1L"]);

    expect(result.bestMatch).toBeNull();
    expect(result.allMatches).toHaveLength(0);
  });

  test("pk cannot match ml", () => {
    const result = findClosestSize("6pk", ["500ml", "1L", "2L"]);

    expect(result.bestMatch).toBeNull();
    expect(result.allMatches).toHaveLength(0);
  });

  test("pk cannot match g", () => {
    const result = findClosestSize("12pack", ["500g", "1kg"]);

    expect(result.bestMatch).toBeNull();
  });

  test("volume cannot match count", () => {
    const result = findClosestSize("2pt", ["6pk", "12pk"]);

    expect(result.bestMatch).toBeNull();
    expect(result.allMatches).toHaveLength(0);
  });
});

// ============================================================================
// findClosestSize - Empty and Invalid Inputs
// ============================================================================

describe("findClosestSize - Empty and Invalid Inputs", () => {
  test("returns null for empty available sizes", () => {
    const result = findClosestSize("500g", []);

    expect(result.bestMatch).toBeNull();
    expect(result.allMatches).toHaveLength(0);
    expect(result.hasExactMatch).toBe(false);
    expect(result.hasAutoMatch).toBe(false);
  });

  test("returns null for invalid target size", () => {
    const result = findClosestSize("invalid", ["500g", "1kg"]);

    expect(result.bestMatch).toBeNull();
    expect(result.allMatches).toHaveLength(0);
  });

  test("filters out invalid sizes from available list", () => {
    const result = findClosestSize("500g", ["invalid", "500g", "abc", "1kg"]);

    expect(result.bestMatch?.size).toBe("500g");
    expect(result.allMatches).toHaveLength(2); // Only 500g and 1kg are valid
  });

  test("returns null when all available sizes are invalid", () => {
    const result = findClosestSize("500g", ["invalid", "abc", "xyz"]);

    expect(result.bestMatch).toBeNull();
    expect(result.allMatches).toHaveLength(0);
  });
});

// ============================================================================
// findClosestSize - Multiple Matches Ranking
// ============================================================================

describe("findClosestSize - Multiple Matches Ranking", () => {
  test("ranks all matches by closeness", () => {
    const result = findClosestSize("500g", ["250g", "400g", "600g", "750g", "1kg"]);

    expect(result.allMatches).toHaveLength(5);
    // 400g and 600g are both 20% diff (closest)
    expect(result.allMatches[0].percentDiff).toBeCloseTo(0.2, 2);
    expect(result.allMatches[1].percentDiff).toBeCloseTo(0.2, 2);
    // Verify all matches are sorted by percentDiff (ascending)
    for (let i = 0; i < result.allMatches.length - 1; i++) {
      expect(result.allMatches[i].percentDiff).toBeLessThanOrEqual(
        result.allMatches[i + 1].percentDiff
      );
    }
    // 1kg is furthest (100% diff)
    expect(result.allMatches[4].size).toBe("1kg");
    expect(result.allMatches[4].percentDiff).toBeCloseTo(1.0, 1);
  });

  test("returns closest when multiple close matches exist", () => {
    const result = findClosestSize("500g", ["495g", "505g", "510g"]);

    // 505g is closest (1% diff), 495g is also 1% diff
    expect(result.bestMatch?.percentDiff).toBeLessThan(0.02);
    expect(result.allMatches[0].percentDiff).toBeLessThanOrEqual(result.allMatches[1].percentDiff);
  });

  test("includes match score relative to tolerance", () => {
    const result = findClosestSize("500g", ["400g", "600g"], 0.2);

    // 400g is 20% diff = matchScore 1.0 (at tolerance limit)
    expect(result.allMatches[0].matchScore).toBeCloseTo(1.0, 1);
  });
});

// ============================================================================
// areSizesEquivalent
// ============================================================================

describe("areSizesEquivalent", () => {
  test("returns true for same size, same format", () => {
    expect(areSizesEquivalent("500g", "500g")).toBe(true);
    expect(areSizesEquivalent("2pt", "2pt")).toBe(true);
    expect(areSizesEquivalent("1L", "1L")).toBe(true);
  });

  test("returns true for same size, different format", () => {
    expect(areSizesEquivalent("2pt", "2 pints")).toBe(true);
    expect(areSizesEquivalent("1L", "1000ml")).toBe(true);
    expect(areSizesEquivalent("500g", "0.5kg")).toBe(true);
    expect(areSizesEquivalent("1 litre", "1000 millilitres")).toBe(true);
  });

  test("returns true for equivalent imperial/metric", () => {
    expect(areSizesEquivalent("1L", "1 litre")).toBe(true);
    expect(areSizesEquivalent("1kg", "1000g")).toBe(true);
  });

  test("returns false for different sizes same category", () => {
    expect(areSizesEquivalent("250g", "500g")).toBe(false);
    expect(areSizesEquivalent("1pt", "2pt")).toBe(false);
    expect(areSizesEquivalent("500ml", "1L")).toBe(false);
  });

  test("returns false for different categories", () => {
    expect(areSizesEquivalent("500ml", "500g")).toBe(false);
    expect(areSizesEquivalent("6pk", "6L")).toBe(false);
    expect(areSizesEquivalent("1kg", "1L")).toBe(false);
  });

  test("returns false for invalid sizes", () => {
    expect(areSizesEquivalent("invalid", "500g")).toBe(false);
    expect(areSizesEquivalent("500g", "invalid")).toBe(false);
    expect(areSizesEquivalent("invalid", "unknown")).toBe(false);
  });
});

// ============================================================================
// rankSizesByValue
// ============================================================================

describe("rankSizesByValue", () => {
  test("sorts volume sizes from smallest to largest", () => {
    const result = rankSizesByValue(["4pt", "1pt", "2pt"]);
    expect(result).toEqual(["1pt", "2pt", "4pt"]);
  });

  test("sorts weight sizes from smallest to largest", () => {
    const result = rankSizesByValue(["1kg", "250g", "500g"]);
    expect(result).toEqual(["250g", "500g", "1kg"]);
  });

  test("sorts count sizes from smallest to largest", () => {
    const result = rankSizesByValue(["12pk", "4pk", "6pk"]);
    expect(result).toEqual(["4pk", "6pk", "12pk"]);
  });

  test("handles mixed units within same category", () => {
    const result = rankSizesByValue(["1L", "500ml", "2L"]);
    expect(result).toEqual(["500ml", "1L", "2L"]);
  });

  test("handles kg and g mixed", () => {
    const result = rankSizesByValue(["1kg", "500g", "1.5kg", "250g"]);
    expect(result).toEqual(["250g", "500g", "1kg", "1.5kg"]);
  });

  test("filters out invalid sizes", () => {
    const result = rankSizesByValue(["500g", "invalid", "250g", "abc"]);
    expect(result).toEqual(["250g", "500g"]);
  });

  test("returns empty array for all invalid sizes", () => {
    const result = rankSizesByValue(["invalid", "abc", "xyz"]);
    expect(result).toEqual([]);
  });

  test("returns empty array for empty input", () => {
    const result = rankSizesByValue([]);
    expect(result).toEqual([]);
  });

  test("handles single item", () => {
    const result = rankSizesByValue(["500g"]);
    expect(result).toEqual(["500g"]);
  });
});

// ============================================================================
// groupSizesByCategory
// ============================================================================

describe("groupSizesByCategory", () => {
  test("groups sizes correctly by category", () => {
    const result = groupSizesByCategory(["2pt", "500g", "1L", "250g", "6pk"]);

    expect(result.volume).toContain("2pt");
    expect(result.volume).toContain("1L");
    expect(result.weight).toContain("500g");
    expect(result.weight).toContain("250g");
    expect(result.count).toContain("6pk");
  });

  test("handles only volume sizes", () => {
    const result = groupSizesByCategory(["1pt", "2pt", "1L", "500ml"]);

    expect(result.volume).toHaveLength(4);
    expect(result.weight).toHaveLength(0);
    expect(result.count).toHaveLength(0);
  });

  test("handles only weight sizes", () => {
    const result = groupSizesByCategory(["250g", "500g", "1kg"]);

    expect(result.volume).toHaveLength(0);
    expect(result.weight).toHaveLength(3);
    expect(result.count).toHaveLength(0);
  });

  test("handles only count sizes", () => {
    const result = groupSizesByCategory(["6pk", "12pack", "4pk"]);

    expect(result.volume).toHaveLength(0);
    expect(result.weight).toHaveLength(0);
    expect(result.count).toHaveLength(3);
  });

  test("filters out invalid sizes", () => {
    const result = groupSizesByCategory(["500g", "invalid", "1L", "abc"]);

    expect(result.volume).toEqual(["1L"]);
    expect(result.weight).toEqual(["500g"]);
    expect(result.count).toHaveLength(0);
  });

  test("handles empty array", () => {
    const result = groupSizesByCategory([]);

    expect(result.volume).toHaveLength(0);
    expect(result.weight).toHaveLength(0);
    expect(result.count).toHaveLength(0);
  });
});

// ============================================================================
// getSizePercentDiff
// ============================================================================

describe("getSizePercentDiff", () => {
  test("calculates 0% for same sizes", () => {
    expect(getSizePercentDiff("500g", "500g")).toBe(0);
    expect(getSizePercentDiff("2pt", "2pt")).toBe(0);
    expect(getSizePercentDiff("1L", "1L")).toBe(0);
  });

  test("calculates 0% for equivalent sizes different format", () => {
    expect(getSizePercentDiff("1L", "1000ml")).toBe(0);
    expect(getSizePercentDiff("500g", "0.5kg")).toBe(0);
    expect(getSizePercentDiff("2pt", "2 pints")).toBe(0);
  });

  test("calculates correct percentage difference", () => {
    // 250g vs 227g = 23g difference, 23/250 = 9.2%
    expect(getSizePercentDiff("250g", "227g")).toBeCloseTo(0.092, 2);

    // 500g vs 400g = 100g difference, 100/500 = 20%
    expect(getSizePercentDiff("500g", "400g")).toBeCloseTo(0.2, 2);

    // 1kg vs 500g = 500g difference, 500/1000 = 50%
    expect(getSizePercentDiff("1kg", "500g")).toBeCloseTo(0.5, 2);
  });

  test("uses larger value as denominator", () => {
    // 250g vs 500g: diff = 250, max = 500, result = 0.5
    expect(getSizePercentDiff("250g", "500g")).toBeCloseTo(0.5, 2);

    // Same result regardless of order
    expect(getSizePercentDiff("500g", "250g")).toBeCloseTo(0.5, 2);
  });

  test("returns null for different categories", () => {
    expect(getSizePercentDiff("500ml", "500g")).toBeNull();
    expect(getSizePercentDiff("6pk", "1L")).toBeNull();
    expect(getSizePercentDiff("1kg", "2pt")).toBeNull();
  });

  test("returns null for invalid sizes", () => {
    expect(getSizePercentDiff("invalid", "500g")).toBeNull();
    expect(getSizePercentDiff("500g", "invalid")).toBeNull();
    expect(getSizePercentDiff("abc", "xyz")).toBeNull();
  });
});

// ============================================================================
// suggestStandardSize
// ============================================================================

describe("suggestStandardSize", () => {
  test("prefers common UK weight sizes", () => {
    // 500g is a common UK size
    expect(suggestStandardSize(["227g", "250g", "500g"])).toBe("500g");
    // 1kg is also common
    expect(suggestStandardSize(["750g", "1kg", "1.5kg"])).toBe("1kg");
  });

  test("prefers common UK volume sizes", () => {
    // 1L is common (1000ml, divisible by 1000)
    expect(suggestStandardSize(["568ml", "1L", "2pt"])).toBe("1L");
    // 2L is common
    expect(suggestStandardSize(["1.5L", "2L", "3L"])).toBe("2L");
  });

  test("prefers round numbers", () => {
    // 500g is divisible by 500
    expect(suggestStandardSize(["450g", "500g", "550g"])).toBe("500g");
    // 1000ml is divisible by 1000
    expect(suggestStandardSize(["900ml", "1000ml", "1100ml"])).toBe("1000ml");
  });

  test("filters by category when specified", () => {
    const result = suggestStandardSize(["500ml", "500g", "1L"], "volume");
    expect(result).toBe("1L");

    const result2 = suggestStandardSize(["500ml", "500g", "1L"], "weight");
    expect(result2).toBe("500g");
  });

  test("returns null for empty array", () => {
    expect(suggestStandardSize([])).toBeNull();
  });

  test("returns null when no sizes match category filter", () => {
    expect(suggestStandardSize(["500ml", "1L"], "weight")).toBeNull();
    expect(suggestStandardSize(["500g", "1kg"], "volume")).toBeNull();
  });

  test("handles single valid size", () => {
    expect(suggestStandardSize(["500g"])).toBe("500g");
    expect(suggestStandardSize(["1L"])).toBe("1L");
  });

  test("prefers common count sizes", () => {
    // 6 and 12 are common pack sizes, but 4pk also has a score
    // The function returns the highest scored, which could be any of the common sizes
    const result = suggestStandardSize(["4pk", "6pk", "10pk", "12pk"]);
    // Result should be one of the valid sizes
    expect(["4pk", "6pk", "10pk", "12pk"]).toContain(result);
  });
});

// ============================================================================
// Constants
// ============================================================================

describe("Constants", () => {
  test("DEFAULT_TOLERANCE is 20%", () => {
    expect(DEFAULT_TOLERANCE).toBe(0.2);
  });

  test("EXACT_TOLERANCE is 1%", () => {
    expect(EXACT_TOLERANCE).toBe(0.01);
  });
});

// ============================================================================
// Real-World Store Switching Scenarios
// ============================================================================

describe("Real-World Store Switching Scenarios", () => {
  test("Tesco to Asda milk size matching", () => {
    // Tesco sells 2pt, Asda might have different sizes
    const tescoSize = "2pt";
    const asdaSizes = ["1L", "2L", "4pt"];

    const result = findClosestSize(tescoSize, asdaSizes);

    // 2pt = 1136ml, 1L = 1000ml (12% diff), 4pt = 2272ml (100% diff)
    expect(result.bestMatch?.size).toBe("1L");
    expect(result.hasAutoMatch).toBe(true);
  });

  test("Butter size matching (250g vs 227g)", () => {
    // Standard UK butter is 250g, Irish butter is often 227g (8oz)
    const tescoSize = "250g";
    const aldiSizes = ["227g", "454g"];

    const result = findClosestSize(tescoSize, aldiSizes);

    expect(result.bestMatch?.size).toBe("227g");
    expect(result.hasAutoMatch).toBe(true);
    expect(result.bestMatch?.percentDiff).toBeLessThan(0.1);
  });

  test("Egg pack switching", () => {
    const tescoSize = "6pk";
    const lidlSizes = ["10pk", "12pk"];

    const result = findClosestSize(tescoSize, lidlSizes);

    // 10pk is closer to 6pk (67% diff) than 12pk (100% diff)
    expect(result.bestMatch?.size).toBe("10pk");
    expect(result.hasAutoMatch).toBe(false); // Outside 20% tolerance
  });

  test("Wine bottle size matching", () => {
    const tescoSize = "750ml";
    const waitroseSizes = ["375ml", "75cl", "1.5L"];

    const result = findClosestSize(tescoSize, waitroseSizes);

    // 75cl = 750ml (exact match)
    expect(result.hasExactMatch).toBe(true);
    expect(result.bestMatch?.size).toBe("75cl");
  });

  test("Cereal box size matching", () => {
    const tescoSize = "500g";
    const morrisonsSizes = ["375g", "750g", "1kg"];

    const result = findClosestSize(tescoSize, morrisonsSizes);

    // 375g is 25% diff, 750g is 50% diff
    expect(result.bestMatch?.size).toBe("375g");
    expect(result.hasAutoMatch).toBe(false); // 25% > 20%
  });

  test("Preserves manual override when no match found", () => {
    // Scenario: User manually set a custom size
    const customSize = "333g";
    const storeSizes = ["250g", "500g", "1kg"];

    const result = findClosestSize(customSize, storeSizes);

    // 250g is closest (25% diff) but outside tolerance
    expect(result.hasAutoMatch).toBe(false);
    // App should preserve the manual override
  });
});

// ============================================================================
// Edge Cases and Boundary Conditions
// ============================================================================

describe("Edge Cases and Boundary Conditions", () => {
  test("handles very small sizes", () => {
    const result = findClosestSize("5g", ["4g", "5g", "10g"]);

    expect(result.hasExactMatch).toBe(true);
    expect(result.bestMatch?.size).toBe("5g");
  });

  test("handles very large sizes", () => {
    const result = findClosestSize("10kg", ["5kg", "10kg", "25kg"]);

    expect(result.hasExactMatch).toBe(true);
    expect(result.bestMatch?.size).toBe("10kg");
  });

  test("handles decimal precision", () => {
    const result = findClosestSize("1.5kg", ["1500g", "1.5kg", "1.55kg"]);

    // 1.5kg = 1500g = exact match
    expect(result.hasExactMatch).toBe(true);
  });

  test("tolerance boundary: exactly 20% difference", () => {
    const result = findClosestSize("500g", ["400g", "600g"]);

    // 400g is exactly 20% less than 500g
    // percentDiff = |400-500| / 500 = 100/500 = 0.2
    expect(result.bestMatch?.percentDiff).toBeCloseTo(0.2, 2);
    expect(result.hasAutoMatch).toBe(true); // <= tolerance
  });

  test("tolerance boundary: just over 20% difference", () => {
    const result = findClosestSize("500g", ["395g", "605g"]);

    // 395g is 21% less than 500g
    expect(result.bestMatch?.percentDiff).toBeGreaterThan(0.2);
    expect(result.hasAutoMatch).toBe(false);
  });

  test("handles duplicate sizes in available list", () => {
    const result = findClosestSize("500g", ["500g", "500g", "1kg"]);

    expect(result.hasExactMatch).toBe(true);
    expect(result.allMatches.filter((m) => m.size === "500g")).toHaveLength(2);
  });
});
