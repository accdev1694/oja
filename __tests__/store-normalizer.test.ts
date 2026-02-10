/**
 * Store Normalizer Tests
 *
 * Comprehensive unit tests for the UK store normalizer utility.
 * Tests all alias variations, store lookups, and edge cases.
 *
 * UK Store Market Reference:
 * - Tesco: 27% market share (largest)
 * - Sainsbury's: 15%
 * - Asda: 14%
 * - Aldi: 10% (discounter)
 * - Morrisons: 9%
 * - Lidl: 7% (discounter)
 * - Co-op: 5%
 * - Waitrose: 5% (premium)
 * - M&S: 3% (premium)
 * - Iceland: 2% (frozen)
 */

import {
  normalizeStoreName,
  getStoreInfo,
  getStoreInfoSafe,
  getAllStores,
  getStoresByType,
  isValidStoreId,
  getAllStoreIds,
  type UKStoreId,
  type StoreInfo,
  type StoreType,
} from "../convex/lib/storeNormalizer";

// ============================================================================
// normalizeStoreName - Basic Store Names
// ============================================================================

describe("normalizeStoreName - Basic Store Names", () => {
  // Tesco
  test("normalizes 'Tesco' to 'tesco'", () => {
    expect(normalizeStoreName("Tesco")).toBe("tesco");
  });

  test("normalizes 'TESCO' to 'tesco'", () => {
    expect(normalizeStoreName("TESCO")).toBe("tesco");
  });

  test("normalizes 'tesco' to 'tesco'", () => {
    expect(normalizeStoreName("tesco")).toBe("tesco");
  });

  // Sainsbury's
  test("normalizes 'Sainsburys' to 'sainsburys'", () => {
    expect(normalizeStoreName("Sainsburys")).toBe("sainsburys");
  });

  test("normalizes 'SAINSBURYS' to 'sainsburys'", () => {
    expect(normalizeStoreName("SAINSBURYS")).toBe("sainsburys");
  });

  // Asda
  test("normalizes 'Asda' to 'asda'", () => {
    expect(normalizeStoreName("Asda")).toBe("asda");
  });

  test("normalizes 'ASDA' to 'asda'", () => {
    expect(normalizeStoreName("ASDA")).toBe("asda");
  });

  // Aldi
  test("normalizes 'Aldi' to 'aldi'", () => {
    expect(normalizeStoreName("Aldi")).toBe("aldi");
  });

  // Morrisons
  test("normalizes 'Morrisons' to 'morrisons'", () => {
    expect(normalizeStoreName("Morrisons")).toBe("morrisons");
  });

  // Lidl
  test("normalizes 'Lidl' to 'lidl'", () => {
    expect(normalizeStoreName("Lidl")).toBe("lidl");
  });

  // Co-op
  test("normalizes 'Co-op' to 'coop'", () => {
    expect(normalizeStoreName("Co-op")).toBe("coop");
  });

  // Waitrose
  test("normalizes 'Waitrose' to 'waitrose'", () => {
    expect(normalizeStoreName("Waitrose")).toBe("waitrose");
  });

  // Iceland
  test("normalizes 'Iceland' to 'iceland'", () => {
    expect(normalizeStoreName("Iceland")).toBe("iceland");
  });
});

// ============================================================================
// normalizeStoreName - Store Suffixes (Express, Metro, Local, etc.)
// ============================================================================

describe("normalizeStoreName - Store Suffixes", () => {
  // Tesco variants
  test("normalizes 'Tesco Express' to 'tesco'", () => {
    expect(normalizeStoreName("Tesco Express")).toBe("tesco");
  });

  test("normalizes 'TESCO EXTRA' to 'tesco'", () => {
    expect(normalizeStoreName("TESCO EXTRA")).toBe("tesco");
  });

  test("normalizes 'Tesco Metro' to 'tesco'", () => {
    expect(normalizeStoreName("Tesco Metro")).toBe("tesco");
  });

  test("normalizes 'Tesco Superstore' to 'tesco'", () => {
    expect(normalizeStoreName("Tesco Superstore")).toBe("tesco");
  });

  test("normalizes 'Tesco Stores' to 'tesco'", () => {
    expect(normalizeStoreName("Tesco Stores")).toBe("tesco");
  });

  test("normalizes 'Tesco Stores Ltd' to 'tesco'", () => {
    expect(normalizeStoreName("Tesco Stores Ltd")).toBe("tesco");
  });

  test("normalizes 'Tesco PLC' to 'tesco'", () => {
    expect(normalizeStoreName("Tesco PLC")).toBe("tesco");
  });

  // Sainsbury's variants
  test("normalizes 'Sainsbury's Local' to 'sainsburys'", () => {
    expect(normalizeStoreName("Sainsbury's Local")).toBe("sainsburys");
  });

  test("normalizes 'Sainsburys Local' to 'sainsburys'", () => {
    expect(normalizeStoreName("Sainsburys Local")).toBe("sainsburys");
  });

  test("normalizes 'J Sainsbury' to 'sainsburys'", () => {
    expect(normalizeStoreName("J Sainsbury")).toBe("sainsburys");
  });

  test("normalizes 'J Sainsbury PLC' to 'sainsburys'", () => {
    expect(normalizeStoreName("J Sainsbury PLC")).toBe("sainsburys");
  });

  // Asda variants
  test("normalizes 'Asda Express' to 'asda'", () => {
    expect(normalizeStoreName("Asda Express")).toBe("asda");
  });

  test("normalizes 'Asda Superstore' to 'asda'", () => {
    expect(normalizeStoreName("Asda Superstore")).toBe("asda");
  });

  test("normalizes 'Asda Living' to 'asda'", () => {
    expect(normalizeStoreName("Asda Living")).toBe("asda");
  });

  // Morrisons variants
  test("normalizes 'Morrisons Daily' to 'morrisons'", () => {
    expect(normalizeStoreName("Morrisons Daily")).toBe("morrisons");
  });

  test("normalizes 'WM Morrisons' to 'morrisons'", () => {
    expect(normalizeStoreName("WM Morrisons")).toBe("morrisons");
  });

  // Co-op variants
  test("normalizes 'Co-op Food' to 'coop'", () => {
    expect(normalizeStoreName("Co-op Food")).toBe("coop");
  });

  test("normalizes 'Midcounties Co-op' to 'coop'", () => {
    expect(normalizeStoreName("Midcounties Co-op")).toBe("coop");
  });

  // Waitrose variants
  test("normalizes 'Little Waitrose' to 'waitrose'", () => {
    expect(normalizeStoreName("Little Waitrose")).toBe("waitrose");
  });

  test("normalizes 'Waitrose & Partners' to 'waitrose'", () => {
    expect(normalizeStoreName("Waitrose & Partners")).toBe("waitrose");
  });

  // Spar variants
  test("normalizes 'Spar Express' to 'spar'", () => {
    expect(normalizeStoreName("Spar Express")).toBe("spar");
  });

  test("normalizes 'Eurospar' to 'spar'", () => {
    expect(normalizeStoreName("Eurospar")).toBe("spar");
  });

  // Iceland variants
  test("normalizes 'Iceland Foods' to 'iceland'", () => {
    expect(normalizeStoreName("Iceland Foods")).toBe("iceland");
  });

  test("normalizes 'The Food Warehouse' to 'iceland'", () => {
    expect(normalizeStoreName("The Food Warehouse")).toBe("iceland");
  });
});

// ============================================================================
// normalizeStoreName - Sainsbury's Variations (apostrophe handling)
// ============================================================================

describe("normalizeStoreName - Sainsbury's Variations", () => {
  test("normalizes 'Sainsbury's' to 'sainsburys'", () => {
    expect(normalizeStoreName("Sainsbury's")).toBe("sainsburys");
  });

  test("normalizes 'Sainsburys' (no apostrophe) to 'sainsburys'", () => {
    expect(normalizeStoreName("Sainsburys")).toBe("sainsburys");
  });

  test("normalizes 'SAINSBURY'S' to 'sainsburys'", () => {
    expect(normalizeStoreName("SAINSBURY'S")).toBe("sainsburys");
  });

  test("normalizes 'SAINSBURY'S LOCAL' to 'sainsburys'", () => {
    expect(normalizeStoreName("SAINSBURY'S LOCAL")).toBe("sainsburys");
  });

  test("normalizes 'Sainsbury' (no 's') to 'sainsburys'", () => {
    expect(normalizeStoreName("Sainsbury")).toBe("sainsburys");
  });

  test("normalizes 'Sainsbury's Supermarket' to 'sainsburys'", () => {
    expect(normalizeStoreName("Sainsbury's Supermarket")).toBe("sainsburys");
  });
});

// ============================================================================
// normalizeStoreName - M&S Variations
// ============================================================================

describe("normalizeStoreName - M&S Variations", () => {
  test("normalizes 'M&S' to 'marks'", () => {
    expect(normalizeStoreName("M&S")).toBe("marks");
  });

  test("normalizes 'Marks & Spencer' to 'marks'", () => {
    expect(normalizeStoreName("Marks & Spencer")).toBe("marks");
  });

  test("normalizes 'Marks and Spencer' to 'marks'", () => {
    expect(normalizeStoreName("Marks and Spencer")).toBe("marks");
  });

  test("normalizes 'M&S Food' to 'marks'", () => {
    expect(normalizeStoreName("M&S Food")).toBe("marks");
  });

  test("normalizes 'M&S Simply Food' to 'marks'", () => {
    expect(normalizeStoreName("M&S Simply Food")).toBe("marks");
  });

  test("normalizes 'M & S' (with spaces) to 'marks'", () => {
    expect(normalizeStoreName("M & S")).toBe("marks");
  });

  test("normalizes 'M&S Foodhall' to 'marks'", () => {
    expect(normalizeStoreName("M&S Foodhall")).toBe("marks");
  });

  test("normalizes 'Marks Spencer' to 'marks'", () => {
    expect(normalizeStoreName("Marks Spencer")).toBe("marks");
  });

  test("normalizes 'Marks & Spencer Food' to 'marks'", () => {
    expect(normalizeStoreName("Marks & Spencer Food")).toBe("marks");
  });

  test("normalizes 'M and S' to 'marks'", () => {
    expect(normalizeStoreName("M and S")).toBe("marks");
  });
});

// ============================================================================
// normalizeStoreName - Co-op Variations
// ============================================================================

describe("normalizeStoreName - Co-op Variations", () => {
  test("normalizes 'Co-op' to 'coop'", () => {
    expect(normalizeStoreName("Co-op")).toBe("coop");
  });

  test("normalizes 'Coop' to 'coop'", () => {
    expect(normalizeStoreName("Coop")).toBe("coop");
  });

  test("normalizes 'Co op' (space) to 'coop'", () => {
    expect(normalizeStoreName("Co op")).toBe("coop");
  });

  test("normalizes 'THE CO-OPERATIVE' to 'coop'", () => {
    expect(normalizeStoreName("THE CO-OPERATIVE")).toBe("coop");
  });

  test("normalizes 'The Cooperative' to 'coop'", () => {
    expect(normalizeStoreName("The Cooperative")).toBe("coop");
  });

  test("normalizes 'Cooperative Food' to 'coop'", () => {
    expect(normalizeStoreName("Cooperative Food")).toBe("coop");
  });

  test("normalizes 'Co-operative Food' to 'coop'", () => {
    expect(normalizeStoreName("Co-operative Food")).toBe("coop");
  });

  test("normalizes 'The Co-op' to 'coop'", () => {
    expect(normalizeStoreName("The Co-op")).toBe("coop");
  });

  test("normalizes 'Central Co-op' to 'coop'", () => {
    expect(normalizeStoreName("Central Co-op")).toBe("coop");
  });

  test("normalizes 'Southern Co-op' to 'coop'", () => {
    expect(normalizeStoreName("Southern Co-op")).toBe("coop");
  });
});

// ============================================================================
// normalizeStoreName - Morrisons Variations
// ============================================================================

describe("normalizeStoreName - Morrisons Variations", () => {
  test("normalizes 'Morrisons' to 'morrisons'", () => {
    expect(normalizeStoreName("Morrisons")).toBe("morrisons");
  });

  test("normalizes 'Morrison's' (with apostrophe) to 'morrisons'", () => {
    expect(normalizeStoreName("Morrison's")).toBe("morrisons");
  });

  test("normalizes 'WM Morrison' to 'morrisons'", () => {
    expect(normalizeStoreName("WM Morrison")).toBe("morrisons");
  });

  test("normalizes 'WM Morrison Supermarkets' to 'morrisons'", () => {
    expect(normalizeStoreName("WM Morrison Supermarkets")).toBe("morrisons");
  });

  test("normalizes 'Morrisons Supermarket' to 'morrisons'", () => {
    expect(normalizeStoreName("Morrisons Supermarket")).toBe("morrisons");
  });
});

// ============================================================================
// normalizeStoreName - Discounters (Aldi, Lidl)
// ============================================================================

describe("normalizeStoreName - Discounters", () => {
  // Aldi variations
  test("normalizes 'Aldi UK' to 'aldi'", () => {
    expect(normalizeStoreName("Aldi UK")).toBe("aldi");
  });

  test("normalizes 'Aldi Stores' to 'aldi'", () => {
    expect(normalizeStoreName("Aldi Stores")).toBe("aldi");
  });

  test("normalizes 'Aldi Stores Ltd' to 'aldi'", () => {
    expect(normalizeStoreName("Aldi Stores Ltd")).toBe("aldi");
  });

  test("normalizes 'Aldi Sud' to 'aldi'", () => {
    expect(normalizeStoreName("Aldi Sud")).toBe("aldi");
  });

  // Lidl variations
  test("normalizes 'Lidl UK' to 'lidl'", () => {
    expect(normalizeStoreName("Lidl UK")).toBe("lidl");
  });

  test("normalizes 'Lidl GB' to 'lidl'", () => {
    expect(normalizeStoreName("Lidl GB")).toBe("lidl");
  });

  test("normalizes 'Lidl Great Britain' to 'lidl'", () => {
    expect(normalizeStoreName("Lidl Great Britain")).toBe("lidl");
  });

  test("normalizes 'Lidl Ltd' to 'lidl'", () => {
    expect(normalizeStoreName("Lidl Ltd")).toBe("lidl");
  });
});

// ============================================================================
// normalizeStoreName - Convenience Stores
// ============================================================================

describe("normalizeStoreName - Convenience Stores", () => {
  // Nisa
  test("normalizes 'Nisa' to 'nisa'", () => {
    expect(normalizeStoreName("Nisa")).toBe("nisa");
  });

  test("normalizes 'Nisa Local' to 'nisa'", () => {
    expect(normalizeStoreName("Nisa Local")).toBe("nisa");
  });

  test("normalizes 'Nisa Extra' to 'nisa'", () => {
    expect(normalizeStoreName("Nisa Extra")).toBe("nisa");
  });

  // Spar
  test("normalizes 'Spar' to 'spar'", () => {
    expect(normalizeStoreName("Spar")).toBe("spar");
  });

  test("normalizes 'Spar UK' to 'spar'", () => {
    expect(normalizeStoreName("Spar UK")).toBe("spar");
  });

  // Londis
  test("normalizes 'Londis' to 'londis'", () => {
    expect(normalizeStoreName("Londis")).toBe("londis");
  });

  test("normalizes 'Londis Store' to 'londis'", () => {
    expect(normalizeStoreName("Londis Store")).toBe("londis");
  });

  // Costcutter
  test("normalizes 'Costcutter' to 'costcutter'", () => {
    expect(normalizeStoreName("Costcutter")).toBe("costcutter");
  });

  test("normalizes 'Cost Cutter' (space) to 'costcutter'", () => {
    expect(normalizeStoreName("Cost Cutter")).toBe("costcutter");
  });

  // Premier
  test("normalizes 'Premier' to 'premier'", () => {
    expect(normalizeStoreName("Premier")).toBe("premier");
  });

  test("normalizes 'Premier Stores' to 'premier'", () => {
    expect(normalizeStoreName("Premier Stores")).toBe("premier");
  });

  // One Stop
  test("normalizes 'One Stop' to 'onestop'", () => {
    expect(normalizeStoreName("One Stop")).toBe("onestop");
  });

  test("normalizes 'Onestop' to 'onestop'", () => {
    expect(normalizeStoreName("Onestop")).toBe("onestop");
  });

  test("normalizes 'One-Stop' (hyphen) to 'onestop'", () => {
    expect(normalizeStoreName("One-Stop")).toBe("onestop");
  });

  // Budgens
  test("normalizes 'Budgens' to 'budgens'", () => {
    expect(normalizeStoreName("Budgens")).toBe("budgens");
  });

  test("normalizes 'Budgen' to 'budgens'", () => {
    expect(normalizeStoreName("Budgen")).toBe("budgens");
  });
});

// ============================================================================
// normalizeStoreName - Frozen Specialists
// ============================================================================

describe("normalizeStoreName - Frozen Specialists", () => {
  // Farmfoods
  test("normalizes 'Farmfoods' to 'farmfoods'", () => {
    expect(normalizeStoreName("Farmfoods")).toBe("farmfoods");
  });

  test("normalizes 'Farm Foods' (space) to 'farmfoods'", () => {
    expect(normalizeStoreName("Farm Foods")).toBe("farmfoods");
  });

  test("normalizes 'Farmfoods Ltd' to 'farmfoods'", () => {
    expect(normalizeStoreName("Farmfoods Ltd")).toBe("farmfoods");
  });
});

// ============================================================================
// normalizeStoreName - Wholesale
// ============================================================================

describe("normalizeStoreName - Wholesale", () => {
  // Costco
  test("normalizes 'Costco' to 'costco'", () => {
    expect(normalizeStoreName("Costco")).toBe("costco");
  });

  test("normalizes 'Costco Wholesale' to 'costco'", () => {
    expect(normalizeStoreName("Costco Wholesale")).toBe("costco");
  });

  test("normalizes 'Costco UK' to 'costco'", () => {
    expect(normalizeStoreName("Costco UK")).toBe("costco");
  });

  // Booker
  test("normalizes 'Booker' to 'booker'", () => {
    expect(normalizeStoreName("Booker")).toBe("booker");
  });

  test("normalizes 'Booker Wholesale' to 'booker'", () => {
    expect(normalizeStoreName("Booker Wholesale")).toBe("booker");
  });

  test("normalizes 'Booker Cash & Carry' to 'booker'", () => {
    expect(normalizeStoreName("Booker Cash & Carry")).toBe("booker");
  });

  test("normalizes 'Makro' to 'booker'", () => {
    expect(normalizeStoreName("Makro")).toBe("booker");
  });
});

// ============================================================================
// normalizeStoreName - Unknown Stores
// ============================================================================

describe("normalizeStoreName - Unknown Stores", () => {
  test("returns null for unknown store", () => {
    expect(normalizeStoreName("Unknown Shop")).toBeNull();
  });

  test("returns null for empty string", () => {
    expect(normalizeStoreName("")).toBeNull();
  });

  test("returns null for whitespace only", () => {
    expect(normalizeStoreName("   ")).toBeNull();
  });

  test("returns null for random text", () => {
    expect(normalizeStoreName("Random Corner Shop")).toBeNull();
  });

  test("returns null for foreign supermarket", () => {
    expect(normalizeStoreName("Carrefour")).toBeNull();
  });

  test("returns null for US supermarket", () => {
    expect(normalizeStoreName("Walmart")).toBeNull();
  });

  test("returns null for undefined (handled gracefully)", () => {
    // @ts-expect-error Testing invalid input
    expect(normalizeStoreName(undefined)).toBeNull();
  });

  test("returns null for null (handled gracefully)", () => {
    // @ts-expect-error Testing invalid input
    expect(normalizeStoreName(null)).toBeNull();
  });

  test("returns null for number (handled gracefully)", () => {
    // @ts-expect-error Testing invalid input
    expect(normalizeStoreName(123)).toBeNull();
  });
});

// ============================================================================
// normalizeStoreName - Edge Cases
// ============================================================================

describe("normalizeStoreName - Edge Cases", () => {
  test("handles extra whitespace", () => {
    expect(normalizeStoreName("  Tesco  ")).toBe("tesco");
  });

  test("handles multiple spaces between words", () => {
    expect(normalizeStoreName("Tesco   Express")).toBe("tesco");
  });

  test("handles mixed case", () => {
    expect(normalizeStoreName("tEsCo ExPrEsS")).toBe("tesco");
  });

  test("handles tabs and newlines", () => {
    expect(normalizeStoreName("Tesco\t")).toBe("tesco");
  });

  test("handles punctuation", () => {
    expect(normalizeStoreName("Tesco!")).toBe("tesco");
    expect(normalizeStoreName("Tesco.")).toBe("tesco");
    expect(normalizeStoreName("Tesco,")).toBe("tesco");
  });

  test("handles store names with quotes", () => {
    expect(normalizeStoreName("'Tesco'")).toBe("tesco");
    expect(normalizeStoreName('"Tesco"')).toBe("tesco");
  });

  test("handles receipt artifacts", () => {
    // Common receipt artifacts
    expect(normalizeStoreName("TESCO STORES;")).toBe("tesco");
  });

  test("handles store with location suffix (should strip)", () => {
    // This tests the suffix stripping logic
    expect(normalizeStoreName("Tesco Store")).toBe("tesco");
    expect(normalizeStoreName("Asda Stores")).toBe("asda");
  });
});

// ============================================================================
// getStoreInfo - Valid Store IDs
// ============================================================================

describe("getStoreInfo - Valid Store IDs", () => {
  test("returns correct info for tesco", () => {
    const info = getStoreInfo("tesco");
    expect(info.id).toBe("tesco");
    expect(info.displayName).toBe("Tesco");
    expect(info.color).toBe("#00539F");
    expect(info.type).toBe("supermarket");
    expect(info.marketShare).toBe(27);
    expect(info.aliases).toContain("tesco");
    expect(info.aliases).toContain("tesco express");
  });

  test("returns correct info for sainsburys", () => {
    const info = getStoreInfo("sainsburys");
    expect(info.id).toBe("sainsburys");
    expect(info.displayName).toBe("Sainsbury's");
    expect(info.color).toBe("#F06C00");
    expect(info.type).toBe("supermarket");
    expect(info.marketShare).toBe(15);
  });

  test("returns correct info for asda", () => {
    const info = getStoreInfo("asda");
    expect(info.id).toBe("asda");
    expect(info.displayName).toBe("Asda");
    expect(info.color).toBe("#7AB51D");
    expect(info.type).toBe("supermarket");
  });

  test("returns correct info for aldi", () => {
    const info = getStoreInfo("aldi");
    expect(info.id).toBe("aldi");
    expect(info.displayName).toBe("Aldi");
    expect(info.color).toBe("#0056A4");
    expect(info.type).toBe("discounter");
  });

  test("returns correct info for morrisons", () => {
    const info = getStoreInfo("morrisons");
    expect(info.displayName).toBe("Morrisons");
    expect(info.color).toBe("#007A3C");
  });

  test("returns correct info for lidl", () => {
    const info = getStoreInfo("lidl");
    expect(info.displayName).toBe("Lidl");
    expect(info.type).toBe("discounter");
  });

  test("returns correct info for coop", () => {
    const info = getStoreInfo("coop");
    expect(info.displayName).toBe("Co-op");
    expect(info.type).toBe("convenience");
    expect(info.color).toBe("#00B2A9");
  });

  test("returns correct info for waitrose", () => {
    const info = getStoreInfo("waitrose");
    expect(info.displayName).toBe("Waitrose");
    expect(info.type).toBe("premium");
    expect(info.color).toBe("#006C4C");
  });

  test("returns correct info for marks", () => {
    const info = getStoreInfo("marks");
    expect(info.displayName).toBe("M&S Food");
    expect(info.type).toBe("premium");
    expect(info.color).toBe("#000000");
  });

  test("returns correct info for iceland", () => {
    const info = getStoreInfo("iceland");
    expect(info.displayName).toBe("Iceland");
    expect(info.type).toBe("frozen");
  });

  test("returns correct info for costco", () => {
    const info = getStoreInfo("costco");
    expect(info.displayName).toBe("Costco");
    expect(info.type).toBe("wholesale");
  });
});

// ============================================================================
// getStoreInfo - Invalid Store IDs
// ============================================================================

describe("getStoreInfo - Invalid Store IDs", () => {
  test("throws error for unknown store ID", () => {
    expect(() => getStoreInfo("unknown" as UKStoreId)).toThrow(
      "Unknown store ID: unknown"
    );
  });

  test("throws error for empty string", () => {
    expect(() => getStoreInfo("" as UKStoreId)).toThrow("Unknown store ID:");
  });
});

// ============================================================================
// getStoreInfoSafe - Safe Lookup
// ============================================================================

describe("getStoreInfoSafe", () => {
  test("returns store info for valid ID", () => {
    const info = getStoreInfoSafe("tesco");
    expect(info).not.toBeNull();
    expect(info?.displayName).toBe("Tesco");
  });

  test("returns null for unknown store ID", () => {
    expect(getStoreInfoSafe("unknown")).toBeNull();
  });

  test("returns null for empty string", () => {
    expect(getStoreInfoSafe("")).toBeNull();
  });

  test("returns null for undefined-like string", () => {
    expect(getStoreInfoSafe("undefined")).toBeNull();
  });
});

// ============================================================================
// getAllStores
// ============================================================================

describe("getAllStores", () => {
  test("returns 20 stores", () => {
    const stores = getAllStores();
    expect(stores).toHaveLength(20);
  });

  test("stores are sorted by market share (descending)", () => {
    const stores = getAllStores();

    // First should be Tesco (27%)
    expect(stores[0].id).toBe("tesco");
    expect(stores[0].marketShare).toBe(27);

    // Second should be Sainsbury's (15%)
    expect(stores[1].id).toBe("sainsburys");
    expect(stores[1].marketShare).toBe(15);

    // Third should be Asda (14%)
    expect(stores[2].id).toBe("asda");

    // Fourth should be Aldi (10%)
    expect(stores[3].id).toBe("aldi");

    // Fifth should be Morrisons (9%)
    expect(stores[4].id).toBe("morrisons");
  });

  test("all stores have required fields", () => {
    const stores = getAllStores();
    for (const store of stores) {
      expect(store.id).toBeDefined();
      expect(store.displayName).toBeDefined();
      expect(store.color).toMatch(/^#[0-9A-Fa-f]{6}$/);
      expect(store.type).toBeDefined();
      expect(store.aliases).toBeInstanceOf(Array);
      expect(store.aliases.length).toBeGreaterThan(0);
      expect(typeof store.marketShare).toBe("number");
    }
  });

  test("returns a copy (not the original array)", () => {
    const stores1 = getAllStores();
    const stores2 = getAllStores();
    expect(stores1).not.toBe(stores2);
    expect(stores1).toEqual(stores2);
  });

  test("includes all expected store types", () => {
    const stores = getAllStores();
    const types = new Set(stores.map((s) => s.type));

    expect(types.has("supermarket")).toBe(true);
    expect(types.has("discounter")).toBe(true);
    expect(types.has("convenience")).toBe(true);
    expect(types.has("premium")).toBe(true);
    expect(types.has("frozen")).toBe(true);
    expect(types.has("wholesale")).toBe(true);
  });
});

// ============================================================================
// getStoresByType
// ============================================================================

describe("getStoresByType", () => {
  test("returns supermarkets", () => {
    const supermarkets = getStoresByType("supermarket");
    expect(supermarkets.length).toBeGreaterThan(0);
    expect(supermarkets.every((s) => s.type === "supermarket")).toBe(true);
    expect(supermarkets.map((s) => s.id)).toContain("tesco");
    expect(supermarkets.map((s) => s.id)).toContain("sainsburys");
    expect(supermarkets.map((s) => s.id)).toContain("asda");
  });

  test("returns discounters", () => {
    const discounters = getStoresByType("discounter");
    expect(discounters).toHaveLength(2);
    expect(discounters.map((s) => s.id)).toContain("aldi");
    expect(discounters.map((s) => s.id)).toContain("lidl");
  });

  test("returns premium stores", () => {
    const premium = getStoresByType("premium");
    expect(premium).toHaveLength(2);
    expect(premium.map((s) => s.id)).toContain("waitrose");
    expect(premium.map((s) => s.id)).toContain("marks");
  });

  test("returns frozen specialists", () => {
    const frozen = getStoresByType("frozen");
    expect(frozen.length).toBeGreaterThan(0);
    expect(frozen.map((s) => s.id)).toContain("iceland");
    expect(frozen.map((s) => s.id)).toContain("farmfoods");
  });

  test("returns convenience stores", () => {
    const convenience = getStoresByType("convenience");
    expect(convenience.length).toBeGreaterThan(0);
    expect(convenience.map((s) => s.id)).toContain("coop");
    expect(convenience.map((s) => s.id)).toContain("spar");
    expect(convenience.map((s) => s.id)).toContain("londis");
  });

  test("returns wholesale stores", () => {
    const wholesale = getStoresByType("wholesale");
    expect(wholesale).toHaveLength(2);
    expect(wholesale.map((s) => s.id)).toContain("costco");
    expect(wholesale.map((s) => s.id)).toContain("booker");
  });
});

// ============================================================================
// isValidStoreId
// ============================================================================

describe("isValidStoreId", () => {
  test("returns true for valid store IDs", () => {
    expect(isValidStoreId("tesco")).toBe(true);
    expect(isValidStoreId("sainsburys")).toBe(true);
    expect(isValidStoreId("asda")).toBe(true);
    expect(isValidStoreId("aldi")).toBe(true);
    expect(isValidStoreId("marks")).toBe(true);
    expect(isValidStoreId("coop")).toBe(true);
  });

  test("returns false for invalid store IDs", () => {
    expect(isValidStoreId("unknown")).toBe(false);
    expect(isValidStoreId("walmart")).toBe(false);
    expect(isValidStoreId("")).toBe(false);
    expect(isValidStoreId("TESCO")).toBe(false); // Case-sensitive
  });
});

// ============================================================================
// getAllStoreIds
// ============================================================================

describe("getAllStoreIds", () => {
  test("returns array of 20 store IDs", () => {
    const ids = getAllStoreIds();
    expect(ids).toHaveLength(20);
  });

  test("includes all major stores", () => {
    const ids = getAllStoreIds();
    expect(ids).toContain("tesco");
    expect(ids).toContain("sainsburys");
    expect(ids).toContain("asda");
    expect(ids).toContain("aldi");
    expect(ids).toContain("morrisons");
    expect(ids).toContain("lidl");
    expect(ids).toContain("coop");
    expect(ids).toContain("waitrose");
    expect(ids).toContain("marks");
    expect(ids).toContain("iceland");
  });

  test("all IDs are valid", () => {
    const ids = getAllStoreIds();
    for (const id of ids) {
      expect(isValidStoreId(id)).toBe(true);
    }
  });
});

// ============================================================================
// Integration: normalizeStoreName -> getStoreInfo
// ============================================================================

describe("Integration: normalizeStoreName -> getStoreInfo", () => {
  test("can normalize and then get info", () => {
    const rawName = "TESCO EXPRESS";
    const storeId = normalizeStoreName(rawName);
    expect(storeId).toBe("tesco");

    const info = getStoreInfo(storeId!);
    expect(info.displayName).toBe("Tesco");
    expect(info.color).toBe("#00539F");
  });

  test("handles receipt-style store names", () => {
    const receiptNames = [
      { raw: "TESCO STORES LTD", expected: "Tesco" },
      { raw: "J SAINSBURY PLC", expected: "Sainsbury's" },
      { raw: "ASDA STORES", expected: "Asda" },
      { raw: "ALDI STORES LTD", expected: "Aldi" },
      { raw: "WM MORRISON SUPERMARKETS", expected: "Morrisons" },
      { raw: "LIDL GB LTD", expected: "Lidl" },
      { raw: "THE CO-OPERATIVE FOOD", expected: "Co-op" },
      { raw: "WAITROSE & PARTNERS", expected: "Waitrose" },
      { raw: "MARKS & SPENCER", expected: "M&S Food" },
    ];

    for (const { raw, expected } of receiptNames) {
      const storeId = normalizeStoreName(raw);
      expect(storeId).not.toBeNull();
      const info = getStoreInfo(storeId!);
      expect(info.displayName).toBe(expected);
    }
  });
});

// ============================================================================
// Real-World Receipt Scenarios
// ============================================================================

describe("Real-World Receipt Scenarios", () => {
  test("Scenario: Tesco Express receipt header", () => {
    // Real receipt header might look like: "TESCO STORES LTD"
    const storeId = normalizeStoreName("TESCO STORES LTD");
    expect(storeId).toBe("tesco");
  });

  test("Scenario: Sainsbury's receipt with apostrophe variants", () => {
    // Different receipts format Sainsbury's differently
    expect(normalizeStoreName("SAINSBURY'S")).toBe("sainsburys");
    expect(normalizeStoreName("J SAINSBURY")).toBe("sainsburys");
    expect(normalizeStoreName("SAINSBURY'S SUPERMARKETS LTD")).toBe(
      "sainsburys"
    );
  });

  test("Scenario: Aldi receipt - simple format", () => {
    expect(normalizeStoreName("ALDI")).toBe("aldi");
    expect(normalizeStoreName("ALDI STORES LTD")).toBe("aldi");
  });

  test("Scenario: M&S receipt variations", () => {
    expect(normalizeStoreName("M&S SIMPLY FOOD")).toBe("marks");
    expect(normalizeStoreName("MARKS AND SPENCER")).toBe("marks");
    expect(normalizeStoreName("M & S FOOD")).toBe("marks");
  });

  test("Scenario: Co-op regional variations", () => {
    expect(normalizeStoreName("MIDCOUNTIES CO-OP")).toBe("coop");
    expect(normalizeStoreName("CENTRAL CO-OPERATIVE")).toBe("coop");
    expect(normalizeStoreName("THE CO-OPERATIVE FOOD")).toBe("coop");
  });

  test("Scenario: Iceland's The Food Warehouse brand", () => {
    expect(normalizeStoreName("THE FOOD WAREHOUSE")).toBe("iceland");
    expect(normalizeStoreName("ICELAND FOOD WAREHOUSE")).toBe("iceland");
  });

  test("Scenario: Booker/Makro wholesale", () => {
    expect(normalizeStoreName("BOOKER CASH & CARRY")).toBe("booker");
    expect(normalizeStoreName("MAKRO")).toBe("booker");
    expect(normalizeStoreName("BOOKER MAKRO")).toBe("booker");
  });
});
