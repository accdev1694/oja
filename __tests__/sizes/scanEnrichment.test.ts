/**
 * Scan Enrichment Pipeline Tests
 *
 * Tests for the enrichFromScan mutation logic:
 * 1. Fuzzy baseItem matching (suffix fallback)
 * 2. Size matching against existing variants
 * 3. Display label generation and overwrite
 * 4. Variant deduplication in getSizesForStore
 * 5. VariantPicker displayLabel rendering logic
 *
 * Since Convex mutations require database context, these tests
 * replicate the business logic in isolation.
 *
 * @see convex/itemVariants.ts - enrichFromScan mutation
 * @see components/items/VariantPicker.tsx - displayLabel on chips
 */

import { normalizeSize } from "../../convex/lib/sizeUtils";

// =============================================================================
// Types (matching DB / API shapes)
// =============================================================================

interface VariantRow {
  baseItem: string;
  variantName: string;
  size: string;
  unit: string;
  category: string;
  source: string;
  brand?: string;
  productName?: string;
  displayLabel?: string;
  estimatedPrice?: number;
  scanCount?: number;
}

interface EnrichArgs {
  baseItem: string;
  size: string;
  unit: string;
  category: string;
  brand?: string;
  productName?: string;
  displayLabel?: string;
  estimatedPrice?: number;
}

interface SizeResult {
  size: string;
  sizeNormalized: string;
  price: number | null;
  isUsual: boolean;
  displayLabel?: string;
  brand?: string;
  productName?: string;
}

// =============================================================================
// Simulated business logic (mirrors convex/itemVariants.ts)
// =============================================================================

/**
 * Simulates the fuzzy baseItem lookup from enrichFromScan.
 * Exact match first, then suffix fallback.
 */
function findVariantsByBaseItem(
  db: VariantRow[],
  baseItem: string
): VariantRow[] {
  const normalized = baseItem.toLowerCase().trim();

  // Exact match
  const exact = db.filter((v) => v.baseItem === normalized);
  if (exact.length > 0) return exact;

  // Fuzzy: try suffix words
  const words = normalized.split(/\s+/);
  for (let i = 1; i < words.length; i++) {
    const suffix = words.slice(i).join(" ");
    const fallback = db.filter((v) => v.baseItem === suffix);
    if (fallback.length > 0) return fallback;
  }

  return [];
}

/**
 * Simulates size matching within found variants.
 */
function findBySize(
  variants: VariantRow[],
  size: string
): VariantRow | undefined {
  const normalized = size.toLowerCase().trim();
  return variants.find((v) => v.size.toLowerCase().trim() === normalized);
}

/**
 * Simulates the enrichment update logic.
 * Returns the updated variant (newer scans overwrite fields).
 */
function applyEnrichment(
  existing: VariantRow,
  args: EnrichArgs
): VariantRow {
  return {
    ...existing,
    scanCount: (existing.scanCount ?? 0) + 1,
    brand: args.brand ?? existing.brand,
    productName: args.productName ?? existing.productName,
    displayLabel: args.displayLabel ?? existing.displayLabel,
    estimatedPrice: args.estimatedPrice ?? existing.estimatedPrice,
    source: existing.source === "ai_seeded" ? "scan_enriched" : existing.source,
  };
}

/**
 * Simulates creating a new variant from scan data.
 * Uses existing baseItem if fuzzy match found, else scanned name.
 */
function createFromScan(
  existingVariants: VariantRow[],
  args: EnrichArgs
): VariantRow {
  const targetBase =
    existingVariants.length > 0
      ? existingVariants[0].baseItem
      : args.baseItem.toLowerCase().trim();

  const variantName = args.productName
    ? `${args.productName} ${args.size}`
    : `${args.baseItem} ${args.size}`;

  return {
    baseItem: targetBase,
    variantName,
    size: args.size,
    unit: args.unit,
    category: args.category,
    source: "scan_enriched",
    brand: args.brand,
    productName: args.productName,
    displayLabel: args.displayLabel,
    estimatedPrice: args.estimatedPrice,
    scanCount: 1,
  };
}

/**
 * Full enrichFromScan simulation.
 */
function simulateEnrichFromScan(
  db: VariantRow[],
  args: EnrichArgs
): { action: "enriched" | "created"; variant: VariantRow } {
  const found = findVariantsByBaseItem(db, args.baseItem);
  const match = found.length > 0 ? findBySize(found, args.size) : undefined;

  if (match) {
    return { action: "enriched", variant: applyEnrichment(match, args) };
  }

  return { action: "created", variant: createFromScan(found, args) };
}

/**
 * Simulates getSizesForStore deduplication.
 */
function deduplicateSizes(sizes: SizeResult[]): SizeResult[] {
  const seen = new Set<string>();
  return sizes.filter((s) => {
    const key = s.sizeNormalized || s.size;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/**
 * Simulates VariantPicker chip label logic.
 */
function getChipLabel(variant: { displayLabel?: string; size: string }): string {
  return variant.displayLabel || variant.size;
}

/**
 * Simulates baseItem derivation from scanned product name (client side).
 */
function deriveBaseItem(
  productName: string,
  suggestionName?: string
): string {
  if (suggestionName) return suggestionName;
  return (
    productName
      .replace(/^\d+\s*(pk|pack|g|kg|ml|l|pt|pint)s?\s*/i, "")
      .replace(/\s+\d+\s*(pk|pack|g|kg|ml|l|pt|pint)s?\s*$/i, "")
      .trim() || productName
  );
}

// =============================================================================
// Test Data
// =============================================================================

function buildEggsDb(): VariantRow[] {
  return [
    {
      baseItem: "eggs",
      variantName: "eggs 6pk",
      size: "6pk",
      unit: "each",
      category: "Dairy & Eggs",
      source: "ai_seeded",
    },
    {
      baseItem: "eggs",
      variantName: "eggs 12pk",
      size: "12pk",
      unit: "each",
      category: "Dairy & Eggs",
      source: "ai_seeded",
    },
    {
      baseItem: "eggs",
      variantName: "eggs 15pk",
      size: "15pk",
      unit: "each",
      category: "Dairy & Eggs",
      source: "ai_seeded",
    },
  ];
}

function buildMilkDb(): VariantRow[] {
  return [
    {
      baseItem: "milk",
      variantName: "milk 1pt",
      size: "1pt",
      unit: "pint",
      category: "Dairy & Eggs",
      source: "ai_seeded",
    },
    {
      baseItem: "milk",
      variantName: "milk 2pt",
      size: "2pt",
      unit: "pint",
      category: "Dairy & Eggs",
      source: "ai_seeded",
    },
  ];
}

// =============================================================================
// Tests
// =============================================================================

describe("Scan enrichment pipeline", () => {
  // ── Fuzzy baseItem matching ─────────────────────────────────────────────

  describe("fuzzy baseItem matching", () => {
    it("finds exact baseItem match", () => {
      const db = buildEggsDb();
      const found = findVariantsByBaseItem(db, "eggs");
      expect(found).toHaveLength(3);
      expect(found[0].baseItem).toBe("eggs");
    });

    it("finds match via suffix fallback: 'free range eggs' → 'eggs'", () => {
      const db = buildEggsDb();
      const found = findVariantsByBaseItem(db, "free range eggs");
      expect(found).toHaveLength(3);
      expect(found[0].baseItem).toBe("eggs");
    });

    it("finds match via suffix: 'organic whole milk' → 'milk'", () => {
      const db = buildMilkDb();
      const found = findVariantsByBaseItem(db, "organic whole milk");
      expect(found).toHaveLength(2);
      expect(found[0].baseItem).toBe("milk");
    });

    it("finds match via intermediate suffix: 'large free range eggs' → 'eggs'", () => {
      const db = buildEggsDb();
      // Words: large, free, range, eggs
      // Tries: "free range eggs" → no, "range eggs" → no, "eggs" → yes
      const found = findVariantsByBaseItem(db, "large free range eggs");
      expect(found).toHaveLength(3);
    });

    it("returns empty when no match at all", () => {
      const db = buildEggsDb();
      const found = findVariantsByBaseItem(db, "chocolate cake");
      expect(found).toHaveLength(0);
    });

    it("is case-insensitive", () => {
      const db = buildEggsDb();
      const found = findVariantsByBaseItem(db, "Free Range EGGS");
      expect(found).toHaveLength(3);
    });

    it("trims whitespace", () => {
      const db = buildEggsDb();
      const found = findVariantsByBaseItem(db, "  eggs  ");
      expect(found).toHaveLength(3);
    });
  });

  // ── Size matching ───────────────────────────────────────────────────────

  describe("size matching", () => {
    it("matches exact size", () => {
      const db = buildEggsDb();
      const match = findBySize(db, "6pk");
      expect(match).toBeDefined();
      expect(match!.size).toBe("6pk");
    });

    it("matches case-insensitively", () => {
      const db = buildEggsDb();
      const match = findBySize(db, "6PK");
      expect(match).toBeDefined();
    });

    it("returns undefined for non-existent size", () => {
      const db = buildEggsDb();
      const match = findBySize(db, "24pk");
      expect(match).toBeUndefined();
    });
  });

  // ── Enrichment (overwrite behavior) ─────────────────────────────────────

  describe("enrichment updates", () => {
    it("increments scanCount on each enrichment", () => {
      const variant = buildEggsDb()[0];
      const enriched = applyEnrichment(variant, {
        baseItem: "eggs",
        size: "6pk",
        unit: "each",
        category: "Dairy & Eggs",
        brand: "Sainsbury's",
        displayLabel: "Sainsbury's 6pk",
      });

      expect(enriched.scanCount).toBe(1);

      const enrichedAgain = applyEnrichment(enriched, {
        baseItem: "eggs",
        size: "6pk",
        unit: "each",
        category: "Dairy & Eggs",
        brand: "Tesco",
        displayLabel: "Tesco 6pk",
      });

      expect(enrichedAgain.scanCount).toBe(2);
    });

    it("overwrites brand with newer scan data", () => {
      const variant: VariantRow = {
        ...buildEggsDb()[0],
        brand: "Sainsbury's",
        displayLabel: "Sainsbury's 6pk",
      };

      const enriched = applyEnrichment(variant, {
        baseItem: "eggs",
        size: "6pk",
        unit: "each",
        category: "Dairy & Eggs",
        brand: "Tesco",
        displayLabel: "Tesco 6pk",
      });

      expect(enriched.brand).toBe("Tesco");
      expect(enriched.displayLabel).toBe("Tesco 6pk");
    });

    it("keeps existing field when scan provides undefined", () => {
      const variant: VariantRow = {
        ...buildEggsDb()[0],
        brand: "Sainsbury's",
        displayLabel: "Sainsbury's 6pk",
      };

      const enriched = applyEnrichment(variant, {
        baseItem: "eggs",
        size: "6pk",
        unit: "each",
        category: "Dairy & Eggs",
        // no brand or displayLabel provided
      });

      expect(enriched.brand).toBe("Sainsbury's");
      expect(enriched.displayLabel).toBe("Sainsbury's 6pk");
    });

    it("changes source from ai_seeded to scan_enriched", () => {
      const variant = buildEggsDb()[0]; // source: "ai_seeded"
      const enriched = applyEnrichment(variant, {
        baseItem: "eggs",
        size: "6pk",
        unit: "each",
        category: "Dairy & Eggs",
      });

      expect(enriched.source).toBe("scan_enriched");
    });

    it("does not change source if already scan_enriched", () => {
      const variant: VariantRow = { ...buildEggsDb()[0], source: "scan_enriched" };
      const enriched = applyEnrichment(variant, {
        baseItem: "eggs",
        size: "6pk",
        unit: "each",
        category: "Dairy & Eggs",
      });

      expect(enriched.source).toBe("scan_enriched");
    });
  });

  // ── Full enrichFromScan simulation ──────────────────────────────────────

  describe("full enrichFromScan flow", () => {
    it("enriches existing variant when baseItem + size match", () => {
      const db = buildEggsDb();
      const result = simulateEnrichFromScan(db, {
        baseItem: "eggs",
        size: "6pk",
        unit: "each",
        category: "Dairy & Eggs",
        brand: "Tesco",
        displayLabel: "Tesco Free Range 6pk",
      });

      expect(result.action).toBe("enriched");
      expect(result.variant.brand).toBe("Tesco");
      expect(result.variant.displayLabel).toBe("Tesco Free Range 6pk");
      expect(result.variant.scanCount).toBe(1);
    });

    it("enriches via fuzzy match: 'free range eggs' finds 'eggs' variants", () => {
      const db = buildEggsDb();
      const result = simulateEnrichFromScan(db, {
        baseItem: "free range eggs",
        size: "6pk",
        unit: "each",
        category: "Dairy & Eggs",
        brand: "Sainsbury's",
        displayLabel: "Sainsbury's 6pk",
      });

      expect(result.action).toBe("enriched");
      expect(result.variant.baseItem).toBe("eggs");
      expect(result.variant.brand).toBe("Sainsbury's");
    });

    it("creates new variant under existing baseItem when size not found", () => {
      const db = buildEggsDb();
      const result = simulateEnrichFromScan(db, {
        baseItem: "eggs",
        size: "24pk",
        unit: "each",
        category: "Dairy & Eggs",
        brand: "Happy Egg Co",
        productName: "Happy Egg Large",
        displayLabel: "Happy Egg 24pk",
      });

      expect(result.action).toBe("created");
      expect(result.variant.baseItem).toBe("eggs"); // grouped under existing
      expect(result.variant.size).toBe("24pk");
      expect(result.variant.displayLabel).toBe("Happy Egg 24pk");
      expect(result.variant.scanCount).toBe(1);
    });

    it("creates variant under scanned name when no DB match at all", () => {
      const db = buildEggsDb();
      const result = simulateEnrichFromScan(db, {
        baseItem: "quinoa",
        size: "500g",
        unit: "gram",
        category: "Grains",
      });

      expect(result.action).toBe("created");
      expect(result.variant.baseItem).toBe("quinoa");
    });

    it("uses fuzzy match for new size creation too", () => {
      const db = buildMilkDb();
      const result = simulateEnrichFromScan(db, {
        baseItem: "semi skimmed milk",
        size: "4pt",
        unit: "pint",
        category: "Dairy & Eggs",
        brand: "Tesco",
        displayLabel: "Tesco 4pt",
      });

      expect(result.action).toBe("created");
      // Should be grouped under "milk" not "semi skimmed milk"
      expect(result.variant.baseItem).toBe("milk");
    });
  });

  // ── Client-side baseItem derivation ─────────────────────────────────────

  describe("baseItem derivation (client side)", () => {
    it("uses suggestion name when available", () => {
      expect(deriveBaseItem("Free Range Eggs 6pk", "eggs")).toBe("eggs");
    });

    it("strips trailing size from product name", () => {
      expect(deriveBaseItem("Free Range Eggs 6pk")).toBe("Free Range Eggs");
    });

    it("strips leading size from product name", () => {
      expect(deriveBaseItem("6pk Free Range Eggs")).toBe("Free Range Eggs");
    });

    it("handles product name with no size suffix", () => {
      expect(deriveBaseItem("Organic Butter")).toBe("Organic Butter");
    });

    it("falls back to full name if stripping leaves empty", () => {
      expect(deriveBaseItem("6pk")).toBe("6pk");
    });

    it("strips various unit formats", () => {
      expect(deriveBaseItem("Whole Milk 2pt")).toBe("Whole Milk");
      expect(deriveBaseItem("Cheddar Cheese 500g")).toBe("Cheddar Cheese");
      expect(deriveBaseItem("Orange Juice 1l")).toBe("Orange Juice");
      expect(deriveBaseItem("Flour 1kg")).toBe("Flour");
    });
  });

  // ── Deduplication ───────────────────────────────────────────────────────

  describe("variant deduplication", () => {
    it("removes duplicate sizes keeping first (best) entry", () => {
      const sizes: SizeResult[] = [
        { size: "6pk", sizeNormalized: "6pk", price: 1.8, isUsual: true, displayLabel: "Tesco 6pk" },
        { size: "6pk", sizeNormalized: "6pk", price: 2.1, isUsual: false, displayLabel: "Sainsbury's 6pk" },
        { size: "12pk", sizeNormalized: "12pk", price: 3.5, isUsual: false },
        { size: "12pk", sizeNormalized: "12pk", price: 3.8, isUsual: false },
      ];

      const deduped = deduplicateSizes(sizes);
      expect(deduped).toHaveLength(2);
      expect(deduped[0].displayLabel).toBe("Tesco 6pk");
      expect(deduped[1].size).toBe("12pk");
    });

    it("keeps all entries when sizes are unique", () => {
      const sizes: SizeResult[] = [
        { size: "6pk", sizeNormalized: "6pk", price: 1.8, isUsual: false },
        { size: "12pk", sizeNormalized: "12pk", price: 3.5, isUsual: false },
        { size: "15pk", sizeNormalized: "15pk", price: 4.2, isUsual: false },
      ];

      expect(deduplicateSizes(sizes)).toHaveLength(3);
    });

    it("uses sizeNormalized for dedup key", () => {
      const sizes: SizeResult[] = [
        { size: "6 pack", sizeNormalized: "6pk", price: 1.8, isUsual: false },
        { size: "6pk", sizeNormalized: "6pk", price: 2.0, isUsual: false },
      ];

      const deduped = deduplicateSizes(sizes);
      expect(deduped).toHaveLength(1);
      expect(deduped[0].size).toBe("6 pack"); // first one kept
    });

    it("falls back to size when sizeNormalized is empty", () => {
      const sizes: SizeResult[] = [
        { size: "small", sizeNormalized: "", price: 1.0, isUsual: false },
        { size: "small", sizeNormalized: "", price: 1.5, isUsual: false },
      ];

      const deduped = deduplicateSizes(sizes);
      expect(deduped).toHaveLength(1);
    });
  });

  // ── VariantPicker displayLabel ──────────────────────────────────────────

  describe("VariantPicker chip label", () => {
    it("shows displayLabel when available", () => {
      expect(getChipLabel({ displayLabel: "Tesco 6pk", size: "6pk" })).toBe("Tesco 6pk");
    });

    it("falls back to size when no displayLabel", () => {
      expect(getChipLabel({ size: "6pk" })).toBe("6pk");
    });

    it("falls back to size when displayLabel is empty string", () => {
      expect(getChipLabel({ displayLabel: "", size: "12pk" })).toBe("12pk");
    });

    it("shows enriched label after scan enrichment", () => {
      // Simulate: variant before enrichment shows raw size
      const before = { size: "6pk" };
      expect(getChipLabel(before)).toBe("6pk");

      // After enrichment: displayLabel is set
      const after = { displayLabel: "Sainsbury's Free Range 6pk", size: "6pk" };
      expect(getChipLabel(after)).toBe("Sainsbury's Free Range 6pk");
    });
  });

  // ── Display label generation ────────────────────────────────────────────

  describe("displayLabel generation", () => {
    it("combines brand + size when brand available", () => {
      const brand = "Tesco";
      const size = "6pk";
      const label = brand ? `${brand} ${size}` : size;
      expect(label).toBe("Tesco 6pk");
    });

    it("uses just size when no brand", () => {
      const brand = undefined;
      const size = "500ml";
      const label = brand ? `${brand} ${size}` : size;
      expect(label).toBe("500ml");
    });
  });
});
