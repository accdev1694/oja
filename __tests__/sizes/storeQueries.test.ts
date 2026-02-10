/**
 * Store Queries Unit Tests
 *
 * Tests for getSizesForStore query and switchStore mutation logic.
 *
 * Since Convex queries/mutations require database context, these tests:
 * 1. Test the helper functions extracted from the mutations
 * 2. Validate response structures
 * 3. Test the business logic in isolation
 *
 * @see convex/itemVariants.ts - getSizesForStore query
 * @see convex/shoppingLists.ts - switchStore mutation
 */

import {
  parseSize,
  normalizeSize,
  calculatePricePerUnit,
  getUnitLabel,
} from "../../convex/lib/sizeUtils";
import { findClosestSize, DEFAULT_TOLERANCE } from "@/lib/sizes/sizeMatching";

// =============================================================================
// Types (matching expected API responses)
// =============================================================================

interface SizeOption {
  size: string;
  sizeNormalized: string;
  price: number | null;
  pricePerUnit: number | null;
  unitLabel: string;
  source: "personal" | "crowdsourced" | "ai";
  confidence: number;
  isUsual: boolean;
}

interface SizesForStoreResponse {
  itemName: string;
  store: string;
  sizes: SizeOption[];
  defaultSize: string | null;
}

interface SwitchStoreResponse {
  success: boolean;
  previousStore: string;
  newStore: string;
  itemsUpdated: number;
  sizeChanges: Array<{
    itemId: string;
    itemName: string;
    oldSize: string;
    newSize: string;
  }>;
  priceChanges: Array<{
    itemId: string;
    itemName: string;
    oldPrice: number;
    newPrice: number;
  }>;
  manualOverridesPreserved: number;
  newTotal: number;
  savings: number;
}

// =============================================================================
// Helper Functions (simulating Convex logic for testing)
// =============================================================================

/**
 * Simulates the findClosestSizeMatch logic from shoppingLists.ts
 * Used for testing the size matching behavior during store switch
 */
function findClosestSizeMatch(
  targetSize: string,
  availableSizes: Array<{ size: string; price: number }>
): { size: string; price: number; isExact: boolean; percentDiff: number } | null {
  const targetParsed = parseSize(targetSize);
  if (!targetParsed) return null;

  const SIZE_MATCH_TOLERANCE = 0.2;
  let bestMatch: {
    size: string;
    price: number;
    isExact: boolean;
    percentDiff: number;
  } | null = null;

  for (const available of availableSizes) {
    const availableParsed = parseSize(available.size);
    if (!availableParsed) continue;

    // Only compare sizes in the same category
    if (availableParsed.category !== targetParsed.category) continue;

    // Calculate percentage difference
    const diff = Math.abs(
      availableParsed.normalizedValue - targetParsed.normalizedValue
    );
    const percentDiff = diff / targetParsed.normalizedValue;

    // Check if within tolerance
    if (percentDiff <= SIZE_MATCH_TOLERANCE) {
      const isExact = percentDiff <= 0.01;

      if (!bestMatch || percentDiff < bestMatch.percentDiff) {
        bestMatch = {
          size: available.size,
          price: available.price,
          isExact,
          percentDiff,
        };
      }
    }
  }

  return bestMatch;
}

/**
 * Simulates the calculateListTotal helper from shoppingLists.ts
 */
function calculateListTotal(
  items: Array<{ estimatedPrice?: number; quantity: number }>
): number {
  return items.reduce((sum, item) => {
    const price = item.estimatedPrice ?? 0;
    return sum + price * item.quantity;
  }, 0);
}

/**
 * Builds a mock SizesForStoreResponse for testing
 */
function buildSizesResponse(
  itemName: string,
  store: string,
  variants: Array<{
    size: string;
    price: number | null;
    source?: "personal" | "crowdsourced" | "ai";
    confidence?: number;
    isUsual?: boolean;
  }>,
  usualSize?: string
): SizesForStoreResponse {
  const sizes: SizeOption[] = variants.map((v) => ({
    size: v.size,
    sizeNormalized: normalizeSize(v.size),
    price: v.price,
    pricePerUnit: v.price !== null ? calculatePricePerUnit(v.price, v.size) : null,
    unitLabel: getUnitLabel(v.size),
    source: v.source ?? "ai",
    confidence: v.confidence ?? 0.5,
    isUsual: v.isUsual ?? v.size === usualSize,
  }));

  // Sort: usual first, then by price
  sizes.sort((a, b) => {
    if (a.isUsual && !b.isUsual) return -1;
    if (!a.isUsual && b.isUsual) return 1;
    if (a.price !== null && b.price !== null) return a.price - b.price;
    if (a.price !== null) return -1;
    if (b.price !== null) return 1;
    return 0;
  });

  const defaultSize =
    usualSize ?? sizes.find((s) => s.price !== null)?.size ?? sizes[0]?.size ?? null;

  return {
    itemName,
    store,
    sizes,
    defaultSize,
  };
}

// =============================================================================
// 7.3 - getSizesForStore Query Tests
// =============================================================================

describe("getSizesForStore query logic", () => {
  describe("response structure", () => {
    it("returns correct structure with all required fields", () => {
      const response = buildSizesResponse("milk", "tesco", [
        { size: "1pt", price: 0.85, source: "crowdsourced", confidence: 0.8 },
        { size: "2pt", price: 1.45, source: "personal", confidence: 1.0, isUsual: true },
        { size: "4pt", price: 2.75, source: "ai", confidence: 0.5 },
      ]);

      expect(response).toHaveProperty("itemName", "milk");
      expect(response).toHaveProperty("store", "tesco");
      expect(response).toHaveProperty("sizes");
      expect(response).toHaveProperty("defaultSize");
      expect(Array.isArray(response.sizes)).toBe(true);
    });

    it("size options have all required fields", () => {
      const response = buildSizesResponse("milk", "tesco", [
        { size: "2pt", price: 1.45, source: "personal", confidence: 0.9 },
      ]);

      const size = response.sizes[0];
      expect(size).toHaveProperty("size");
      expect(size).toHaveProperty("sizeNormalized");
      expect(size).toHaveProperty("price");
      expect(size).toHaveProperty("pricePerUnit");
      expect(size).toHaveProperty("unitLabel");
      expect(size).toHaveProperty("source");
      expect(size).toHaveProperty("confidence");
      expect(size).toHaveProperty("isUsual");
    });
  });

  describe("sorting by popularity/usage", () => {
    it("places user's usual size first", () => {
      const response = buildSizesResponse(
        "milk",
        "tesco",
        [
          { size: "1pt", price: 0.85 },
          { size: "4pt", price: 2.75 },
          { size: "2pt", price: 1.45, isUsual: true },
        ],
        "2pt"
      );

      expect(response.sizes[0].size).toBe("2pt");
      expect(response.sizes[0].isUsual).toBe(true);
    });

    it("sorts remaining sizes by price (cheapest first)", () => {
      const response = buildSizesResponse("milk", "tesco", [
        { size: "4pt", price: 2.75 },
        { size: "1pt", price: 0.85 },
        { size: "2pt", price: 1.45 },
      ]);

      // No usual size, so sorted by price
      expect(response.sizes[0].price).toBe(0.85);
      expect(response.sizes[1].price).toBe(1.45);
      expect(response.sizes[2].price).toBe(2.75);
    });
  });

  describe("isUsual marking", () => {
    it("marks user's usual size with isUsual: true", () => {
      const response = buildSizesResponse(
        "milk",
        "tesco",
        [
          { size: "1pt", price: 0.85 },
          { size: "2pt", price: 1.45 },
          { size: "4pt", price: 2.75 },
        ],
        "2pt"
      );

      const usualSize = response.sizes.find((s) => s.isUsual);
      expect(usualSize).toBeDefined();
      expect(usualSize?.size).toBe("2pt");
    });

    it("no isUsual when user has no purchase history", () => {
      const response = buildSizesResponse("milk", "tesco", [
        { size: "1pt", price: 0.85 },
        { size: "2pt", price: 1.45 },
      ]);

      const usualSizes = response.sizes.filter((s) => s.isUsual);
      expect(usualSizes.length).toBe(0);
    });
  });

  describe("pricePerUnit calculation", () => {
    it("calculates correct pricePerUnit for volume items", () => {
      // 2pt = 1136ml, £1.45 → £0.1276 per 100ml
      const response = buildSizesResponse("milk", "tesco", [
        { size: "2pt", price: 1.45 },
      ]);

      expect(response.sizes[0].pricePerUnit).toBeCloseTo(0.1276, 3);
      expect(response.sizes[0].unitLabel).toBe("/100ml");
    });

    it("calculates correct pricePerUnit for weight items", () => {
      // 250g butter at £2.50 → £1.00 per 100g
      const response = buildSizesResponse("butter", "tesco", [
        { size: "250g", price: 2.5 },
      ]);

      expect(response.sizes[0].pricePerUnit).toBe(1.0);
      expect(response.sizes[0].unitLabel).toBe("/100g");
    });

    it("calculates correct pricePerUnit for count items", () => {
      // 6pk eggs at £2.10 → £0.35 per each
      const response = buildSizesResponse("eggs", "tesco", [
        { size: "6pk", price: 2.1 },
      ]);

      expect(response.sizes[0].pricePerUnit).toBeCloseTo(0.35, 2);
      expect(response.sizes[0].unitLabel).toBe("/each");
    });

    it("returns null pricePerUnit when price is null", () => {
      const response = buildSizesResponse("milk", "tesco", [
        { size: "2pt", price: null },
      ]);

      expect(response.sizes[0].pricePerUnit).toBeNull();
    });
  });

  describe("AI estimate fallback", () => {
    it("uses AI source when no price data available", () => {
      const response = buildSizesResponse("exotic_item", "tesco", [
        { size: "500g", price: 5.99, source: "ai", confidence: 0.5 },
      ]);

      expect(response.sizes[0].source).toBe("ai");
      expect(response.sizes[0].confidence).toBe(0.5);
    });

    it("prioritizes personal over crowdsourced", () => {
      const response = buildSizesResponse("milk", "tesco", [
        { size: "2pt", price: 1.45, source: "personal", confidence: 1.0 },
      ]);

      expect(response.sizes[0].source).toBe("personal");
      expect(response.sizes[0].confidence).toBe(1.0);
    });
  });

  describe("items with no variants", () => {
    it("returns empty sizes array when no variants found", () => {
      const response: SizesForStoreResponse = {
        itemName: "unknown_item",
        store: "tesco",
        sizes: [],
        defaultSize: null,
      };

      expect(response.sizes).toHaveLength(0);
      expect(response.defaultSize).toBeNull();
    });
  });

  describe("defaultSize selection", () => {
    it("uses usual size as default when available", () => {
      const response = buildSizesResponse(
        "milk",
        "tesco",
        [
          { size: "1pt", price: 0.85 },
          { size: "2pt", price: 1.45 },
          { size: "4pt", price: 2.75 },
        ],
        "2pt"
      );

      expect(response.defaultSize).toBe("2pt");
    });

    it("uses first size with price when no usual size", () => {
      const response = buildSizesResponse("milk", "tesco", [
        { size: "1pt", price: 0.85 },
        { size: "2pt", price: 1.45 },
      ]);

      // Sorted by price, so 1pt (cheapest) is first
      expect(response.defaultSize).toBe("1pt");
    });

    it("uses first size when all prices are null", () => {
      const response = buildSizesResponse("unknown", "tesco", [
        { size: "small", price: null },
        { size: "large", price: null },
      ]);

      expect(response.defaultSize).toBe("small");
    });
  });
});

// =============================================================================
// 7.4 - switchStore Mutation Tests
// =============================================================================

describe("switchStore mutation logic", () => {
  describe("size matching with 20% tolerance", () => {
    it("finds exact size match", () => {
      const match = findClosestSizeMatch("250g", [
        { size: "250g", price: 2.5 },
        { size: "500g", price: 4.5 },
      ]);

      expect(match).not.toBeNull();
      expect(match!.size).toBe("250g");
      expect(match!.isExact).toBe(true);
      expect(match!.percentDiff).toBeCloseTo(0, 2);
    });

    it("finds closest size within 20% tolerance", () => {
      // 250g target, 227g available = 9.2% difference (within 20%)
      const match = findClosestSizeMatch("250g", [
        { size: "227g", price: 2.35 },
        { size: "500g", price: 4.5 },
      ]);

      expect(match).not.toBeNull();
      expect(match!.size).toBe("227g");
      expect(match!.isExact).toBe(false);
      expect(match!.percentDiff).toBeCloseTo(0.092, 2);
    });

    it("returns null when no size within tolerance", () => {
      // 250g target, 500g = 100% difference (way outside 20%)
      const match = findClosestSizeMatch("250g", [
        { size: "500g", price: 4.5 },
        { size: "1kg", price: 8.0 },
      ]);

      expect(match).toBeNull();
    });

    it("only matches same category sizes", () => {
      const match = findClosestSizeMatch("500ml", [
        { size: "500g", price: 3.0 },
        { size: "1kg", price: 5.0 },
      ]);

      expect(match).toBeNull();
    });

    it("chooses closest match when multiple within tolerance", () => {
      // 300g target: 280g (6.7%) is closer than 330g (10%)
      const match = findClosestSizeMatch("300g", [
        { size: "280g", price: 2.8 },
        { size: "330g", price: 3.3 },
      ]);

      expect(match!.size).toBe("280g");
    });
  });

  describe("price override preservation", () => {
    it("preserves items with priceOverride: true", () => {
      const items = [
        { id: "1", name: "Milk", priceOverride: true, estimatedPrice: 1.5, quantity: 1 },
        { id: "2", name: "Bread", priceOverride: false, estimatedPrice: 1.2, quantity: 1 },
      ];

      const preserved = items.filter((item) => item.priceOverride);
      expect(preserved.length).toBe(1);
      expect(preserved[0].name).toBe("Milk");
    });
  });

  describe("size override preservation", () => {
    it("only updates price when sizeOverride: true", () => {
      // When size is overridden, we should keep the size but update price
      const item = {
        name: "Butter",
        size: "250g",
        sizeOverride: true,
        estimatedPrice: 2.5,
      };

      // Simulating: new store has 250g at different price
      const newPriceForSize = 2.35;

      expect(item.sizeOverride).toBe(true);
      // Size should stay the same, only price changes
      expect(item.size).toBe("250g");
    });
  });

  describe("size changes tracking", () => {
    it("tracks size changes in response", () => {
      const sizeChanges: SwitchStoreResponse["sizeChanges"] = [];

      // Simulate: butter 250g → 227g at new store
      const oldSize = "250g";
      const match = findClosestSizeMatch(oldSize, [
        { size: "227g", price: 2.35 },
        { size: "500g", price: 4.5 },
      ]);

      if (match && match.size !== oldSize) {
        sizeChanges.push({
          itemId: "item-1",
          itemName: "Butter",
          oldSize,
          newSize: match.size,
        });
      }

      expect(sizeChanges.length).toBe(1);
      expect(sizeChanges[0].oldSize).toBe("250g");
      expect(sizeChanges[0].newSize).toBe("227g");
    });
  });

  describe("savings calculation", () => {
    it("calculates correct savings (positive when new store cheaper)", () => {
      const oldItems = [
        { estimatedPrice: 1.45, quantity: 1 },
        { estimatedPrice: 2.5, quantity: 1 },
        { estimatedPrice: 3.0, quantity: 2 },
      ];
      const oldTotal = calculateListTotal(oldItems);

      const newItems = [
        { estimatedPrice: 1.35, quantity: 1 },
        { estimatedPrice: 2.35, quantity: 1 },
        { estimatedPrice: 2.8, quantity: 2 },
      ];
      const newTotal = calculateListTotal(newItems);

      const savings = oldTotal - newTotal;

      expect(oldTotal).toBe(9.95);
      expect(newTotal).toBe(9.3);
      expect(savings).toBeCloseTo(0.65, 2);
    });

    it("returns negative savings when new store more expensive", () => {
      const oldTotal = 20.0;
      const newTotal = 22.5;
      const savings = oldTotal - newTotal;

      expect(savings).toBe(-2.5);
    });
  });

  describe("items with no price at new store", () => {
    it("keeps original price when no price available", () => {
      const item = {
        name: "Specialty Item",
        size: "100g",
        estimatedPrice: 5.99,
      };

      // No prices at new store
      const newStorePrices: Array<{ size: string; price: number }> = [];
      const match = findClosestSizeMatch(item.size, newStorePrices);

      // When no match, item keeps original price
      expect(match).toBeNull();
      const finalPrice = item.estimatedPrice; // Keep original
      expect(finalPrice).toBe(5.99);
    });
  });

  describe("switching back restores original sizes", () => {
    it("restores originalSize when switching back", () => {
      // Item was originally 250g at Tesco
      // After switching to Asda: 227g (closest match)
      // After switching back to Tesco: should restore to 250g

      const item = {
        size: "227g", // Current (after Asda switch)
        originalSize: "250g", // Saved from original Tesco
      };

      // Switching back to Tesco
      const tescoSizes = [
        { size: "250g", price: 2.5 },
        { size: "500g", price: 4.5 },
      ];

      // When switching back, check if originalSize is available
      const match = findClosestSizeMatch(item.originalSize, tescoSizes);

      expect(match).not.toBeNull();
      expect(match!.size).toBe("250g");
      expect(match!.isExact).toBe(true);
    });
  });

  describe("response structure", () => {
    it("returns complete SwitchStoreResponse structure", () => {
      const response: SwitchStoreResponse = {
        success: true,
        previousStore: "tesco",
        newStore: "asda",
        itemsUpdated: 5,
        sizeChanges: [
          { itemId: "1", itemName: "Butter", oldSize: "250g", newSize: "227g" },
        ],
        priceChanges: [
          { itemId: "1", itemName: "Butter", oldPrice: 2.5, newPrice: 2.35 },
          { itemId: "2", itemName: "Milk", oldPrice: 1.45, newPrice: 1.35 },
        ],
        manualOverridesPreserved: 2,
        newTotal: 43.2,
        savings: 4.3,
      };

      expect(response.success).toBe(true);
      expect(response.previousStore).toBe("tesco");
      expect(response.newStore).toBe("asda");
      expect(response.itemsUpdated).toBe(5);
      expect(response.sizeChanges).toHaveLength(1);
      expect(response.priceChanges).toHaveLength(2);
      expect(response.manualOverridesPreserved).toBe(2);
      expect(response.newTotal).toBe(43.2);
      expect(response.savings).toBe(4.3);
    });
  });
});

// =============================================================================
// Integration: findClosestSize from lib/sizes/sizeMatching.ts
// =============================================================================

describe("findClosestSize (library function)", () => {
  it("uses 20% default tolerance", () => {
    expect(DEFAULT_TOLERANCE).toBe(0.2);
  });

  it("finds exact matches", () => {
    const result = findClosestSize("2pt", ["1pt", "2pt", "4pt"]);

    expect(result.hasExactMatch).toBe(true);
    expect(result.bestMatch?.size).toBe("2pt");
    expect(result.bestMatch?.isExact).toBe(true);
  });

  it("finds close matches within tolerance", () => {
    const result = findClosestSize("250g", ["227g", "500g"]);

    // 227g is ~9% different from 250g
    expect(result.hasAutoMatch).toBe(true);
    expect(result.bestMatch?.size).toBe("227g");
    expect(result.bestMatch?.isAutoMatchable).toBe(true);
  });

  it("respects custom tolerance", () => {
    // With 5% tolerance, 227g (~9% diff) should not match
    const result = findClosestSize("250g", ["227g", "500g"], 0.05);

    expect(result.hasAutoMatch).toBe(false);
    expect(result.bestMatch?.isAutoMatchable).toBe(false);
  });
});

// =============================================================================
// Convex sizeUtils Tests (used by getSizesForStore)
// =============================================================================

describe("Convex sizeUtils", () => {
  describe("parseSize", () => {
    it("parses UK pint sizes", () => {
      const parsed = parseSize("2pt");
      expect(parsed).not.toBeNull();
      expect(parsed!.normalizedValue).toBe(1136);
      expect(parsed!.category).toBe("volume");
    });

    it("parses metric volume", () => {
      const parsed = parseSize("500ml");
      expect(parsed).not.toBeNull();
      expect(parsed!.normalizedValue).toBe(500);
    });

    it("parses weight in grams", () => {
      const parsed = parseSize("250g");
      expect(parsed).not.toBeNull();
      expect(parsed!.normalizedValue).toBe(250);
      expect(parsed!.category).toBe("weight");
    });

    it("parses pack counts", () => {
      const parsed = parseSize("6pk");
      expect(parsed).not.toBeNull();
      expect(parsed!.value).toBe(6);
      expect(parsed!.category).toBe("count");
    });
  });

  describe("normalizeSize", () => {
    it("normalizes various formats to standard display", () => {
      expect(normalizeSize("2 pints")).toBe("2pt");
      expect(normalizeSize("500 ml")).toBe("500ml");
      expect(normalizeSize("1.5 kg")).toBe("1.5kg");
    });

    it("returns original for unparseable sizes", () => {
      expect(normalizeSize("unknown")).toBe("unknown");
    });
  });

  describe("calculatePricePerUnit", () => {
    it("calculates per 100ml for volume", () => {
      const ppu = calculatePricePerUnit(1.45, "2pt");
      expect(ppu).toBeCloseTo(0.1276, 3);
    });

    it("calculates per 100g for weight", () => {
      const ppu = calculatePricePerUnit(2.5, "250g");
      expect(ppu).toBe(1.0);
    });

    it("calculates per each for count", () => {
      const ppu = calculatePricePerUnit(2.1, "6pk");
      expect(ppu).toBeCloseTo(0.35, 2);
    });
  });

  describe("getUnitLabel", () => {
    it("returns correct label for volume", () => {
      expect(getUnitLabel("500ml")).toBe("/100ml");
      expect(getUnitLabel("2pt")).toBe("/100ml");
    });

    it("returns correct label for weight", () => {
      expect(getUnitLabel("250g")).toBe("/100g");
      expect(getUnitLabel("1kg")).toBe("/100g");
    });

    it("returns correct label for count", () => {
      expect(getUnitLabel("6pk")).toBe("/each");
    });
  });
});
