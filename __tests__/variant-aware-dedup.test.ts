import {
  normalizeSizeForDedup,
  isDuplicateItem,
  isDuplicateItemName,
} from "../convex/lib/fuzzyMatch";

describe("Variant-Aware Duplicate Detection", () => {
  // ---------------------------------------------------------------------------
  // Group 1: normalizeSizeForDedup
  // ---------------------------------------------------------------------------
  describe("normalizeSizeForDedup", () => {
    it("returns empty string for undefined", () => {
      expect(normalizeSizeForDedup(undefined)).toBe("");
    });

    it("returns empty string for null", () => {
      expect(normalizeSizeForDedup(null)).toBe("");
    });

    it("returns empty string for empty string", () => {
      expect(normalizeSizeForDedup("")).toBe("");
    });

    it("returns empty string for whitespace-only string", () => {
      expect(normalizeSizeForDedup("  ")).toBe("");
    });

    it("normalizes '2 pints' to same value as '2pt' (1136:volume)", () => {
      expect(normalizeSizeForDedup("2 pints")).toBe(
        normalizeSizeForDedup("2pt"),
      );
      expect(normalizeSizeForDedup("2 pints")).toBe("1136:volume");
    });

    it("normalizes '500ml' to same value as '500 ml'", () => {
      expect(normalizeSizeForDedup("500ml")).toBe(
        normalizeSizeForDedup("500 ml"),
      );
      expect(normalizeSizeForDedup("500ml")).toBe("500:volume");
    });

    it("normalizes '1.5kg' to same value as '1500g'", () => {
      expect(normalizeSizeForDedup("1.5kg")).toBe(
        normalizeSizeForDedup("1500g"),
      );
      expect(normalizeSizeForDedup("1.5kg")).toBe("1500:weight");
    });

    it("normalizes '4 Pints' to same value as '4pt' (2272:volume)", () => {
      expect(normalizeSizeForDedup("4 Pints")).toBe(
        normalizeSizeForDedup("4pt"),
      );
      expect(normalizeSizeForDedup("4 Pints")).toBe("2272:volume");
    });

    it("normalizes '1 litre' to same value as '1000ml' (cross-unit equivalence)", () => {
      expect(normalizeSizeForDedup("1 litre")).toBe(
        normalizeSizeForDedup("1000ml"),
      );
      expect(normalizeSizeForDedup("1 litre")).toBe("1000:volume");
    });

    it("falls back to lowercase+stripped for unparseable sizes", () => {
      expect(normalizeSizeForDedup("Large Tin")).toBe("largetin");
    });

    it("does NOT equate sizes from different categories (500ml vs 500g)", () => {
      expect(normalizeSizeForDedup("500ml")).not.toBe(
        normalizeSizeForDedup("500g"),
      );
    });
  });

  // ---------------------------------------------------------------------------
  // Group 2: isDuplicateItem (variant-aware: name + size)
  // ---------------------------------------------------------------------------
  describe("isDuplicateItem", () => {
    it("returns true for same name + same size", () => {
      expect(isDuplicateItem("Milk", "2pt", "Milk", "2pt")).toBe(true);
    });

    it("returns true for same name + equivalent size formats", () => {
      expect(isDuplicateItem("Milk", "2 pints", "Milk", "2pt")).toBe(true);
    });

    it("returns true for fuzzy name match + same size", () => {
      expect(isDuplicateItem("Milks", "2pt", "Milk", "2pt")).toBe(true);
    });

    it("returns false for same name + different size", () => {
      expect(isDuplicateItem("Milk", "2pt", "Milk", "4pt")).toBe(false);
    });

    it("returns false for same name + different size (weight units)", () => {
      expect(isDuplicateItem("Bread", "400g", "Bread", "800g")).toBe(false);
    });

    it("returns false for different name + same size", () => {
      expect(isDuplicateItem("Milk", "2pt", "Bread", "2pt")).toBe(false);
    });

    it("returns true when both have undefined size", () => {
      expect(
        isDuplicateItem(
          "Chicken Breast",
          undefined,
          "Chicken Breasts",
          undefined,
        ),
      ).toBe(true);
    });

    it("returns true when both have null size", () => {
      expect(isDuplicateItem("Rice", null, "Rice", null)).toBe(true);
    });

    it("returns true when both have empty string size", () => {
      expect(isDuplicateItem("Eggs", "", "Eggs", "")).toBe(true);
    });

    it("returns false when one has size and the other is undefined", () => {
      expect(isDuplicateItem("Milk", "2pt", "Milk", undefined)).toBe(false);
    });

    it("returns false when one is undefined and the other has size", () => {
      expect(isDuplicateItem("Milk", undefined, "Milk", "4pt")).toBe(false);
    });

    it("returns true for cross-unit equivalence (1 litre vs 1000ml)", () => {
      expect(isDuplicateItem("Juice", "1 litre", "Juice", "1000ml")).toBe(
        true,
      );
    });
  });

  // ---------------------------------------------------------------------------
  // Group 3: isDuplicateItemName backward compatibility
  // ---------------------------------------------------------------------------
  describe("isDuplicateItemName (backward compat)", () => {
    it("still matches plurals for longer names", () => {
      // "chicken" -> norm "chicken"; "chickens" -> strips "s" -> "chicken"
      expect(isDuplicateItemName("chicken", "chickens")).toBe(true);
    });

    it("handles short-word plural edge case (apple/apples)", () => {
      // "apple" stays "apple"; "apples" strips "es" -> "appl"
      // substring ratio 4/5 = 0.8 which is NOT > 0.8, so not a match
      // Levenshtein skipped because min length (4) < 5
      expect(isDuplicateItemName("apple", "apples")).toBe(false);
    });

    it("still matches case-insensitively", () => {
      expect(isDuplicateItemName("Milk", "milk")).toBe(true);
    });

    it("still rejects different items", () => {
      expect(isDuplicateItemName("Milk", "Bread")).toBe(false);
    });

    it("handles typos via Levenshtein (Chicken vs Chicen)", () => {
      // "chicken" (7 chars) vs "chicen" (6 chars) -> distance 1
      // similarity = (7-1)/7*100 = 85.7% >= 85% threshold
      expect(isDuplicateItemName("Chicken", "Chicen")).toBe(true);
    });
  });
});
