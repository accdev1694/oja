import {
  levenshteinDistance,
  calculateSimilarity,
  normalizeItemName,
  findFuzzyMatches,
} from "../../lib/text/fuzzyMatch";

describe("normalizeItemName", () => {
  it("lowercases and trims", () => {
    expect(normalizeItemName("  Milk  ")).toBe("milk");
  });

  it("strips common prefixes", () => {
    expect(normalizeItemName("a banana")).toBe("banana");
    expect(normalizeItemName("the bread")).toBe("bread");
    expect(normalizeItemName("some rice")).toBe("rice");
    expect(normalizeItemName("fresh salmon")).toBe("salmon");
    expect(normalizeItemName("organic eggs")).toBe("egg");
  });

  it("handles plural forms", () => {
    expect(normalizeItemName("yams")).toBe("yam");
    expect(normalizeItemName("tomatoes")).toBe("tomato");
    expect(normalizeItemName("berries")).toBe("berry");
    expect(normalizeItemName("loaves")).toBe("loaf");
  });

  it("does not strip s from short words or double-s", () => {
    expect(normalizeItemName("ss")).toBe("ss");
    expect(normalizeItemName("bass")).toBe("bass");
  });
});

describe("levenshteinDistance", () => {
  it("returns 0 for identical strings", () => {
    expect(levenshteinDistance("milk", "milk")).toBe(0);
  });

  it("returns correct distance for single substitution", () => {
    expect(levenshteinDistance("milk", "silk")).toBe(1);
  });

  it("returns correct distance for insertion", () => {
    expect(levenshteinDistance("milk", "milkk")).toBe(1);
  });

  it("returns correct distance for deletion", () => {
    expect(levenshteinDistance("milk", "mlk")).toBe(1);
  });

  it("returns correct distance for transposition (2 ops)", () => {
    // Levenshtein treats transposition as 2 operations
    expect(levenshteinDistance("milk", "mikl")).toBe(2);
  });

  it("handles empty strings", () => {
    expect(levenshteinDistance("", "abc")).toBe(3);
    expect(levenshteinDistance("abc", "")).toBe(3);
    expect(levenshteinDistance("", "")).toBe(0);
  });
});

describe("calculateSimilarity", () => {
  it("returns 100 for identical strings", () => {
    expect(calculateSimilarity("milk", "milk")).toBe(100);
  });

  it("returns 100 for identical strings with different casing", () => {
    expect(calculateSimilarity("Milk", "milk")).toBe(100);
  });

  it("yaams matches yam with reasonable similarity", () => {
    const sim = calculateSimilarity("yaams", "yam");
    expect(sim).toBeGreaterThanOrEqual(60);
  });

  it("milkk matches milk with high similarity", () => {
    expect(calculateSimilarity("milkk", "milk")).toBeGreaterThan(75);
  });

  it("completely different words have low similarity", () => {
    expect(calculateSimilarity("apple", "zebra")).toBeLessThan(40);
  });
});

describe("findFuzzyMatches", () => {
  const candidates = ["milk", "bread", "eggs", "butter", "cheese", "yam", "jam"];

  it("finds exact matches first", () => {
    const matches = findFuzzyMatches("milk", candidates);
    expect(matches[0].name).toBe("milk");
    expect(matches[0].similarity).toBe(100);
    expect(matches[0].isExact).toBe(true);
  });

  it("finds close matches for typos", () => {
    const matches = findFuzzyMatches("millk", candidates);
    expect(matches.length).toBeGreaterThan(0);
    expect(matches[0].name).toBe("milk");
    expect(matches[0].similarity).toBeGreaterThan(75);
  });

  it("finds yam when typing yaams", () => {
    const matches = findFuzzyMatches("yaams", candidates);
    const yamMatch = matches.find((m) => m.name === "yam");
    expect(yamMatch).toBeDefined();
    expect(yamMatch!.similarity).toBeGreaterThanOrEqual(55);
  });

  it("handles plural normalization - yams matches yam", () => {
    const matches = findFuzzyMatches("yams", candidates);
    expect(matches[0].name).toBe("yam");
    expect(matches[0].isExact).toBe(true);
  });

  it("respects minSimilarity threshold", () => {
    const matches = findFuzzyMatches("xyzabc", candidates, {
      minSimilarity: 70,
    });
    expect(matches.length).toBe(0);
  });

  it("respects maxResults", () => {
    const matches = findFuzzyMatches("m", ["m1", "m2", "m3", "m4", "m5"], {
      maxResults: 3,
      minSimilarity: 50,
    });
    expect(matches.length).toBeLessThanOrEqual(3);
  });

  it("returns empty array for empty input", () => {
    expect(findFuzzyMatches("", candidates)).toEqual([]);
  });

  it("deduplicates normalized matches", () => {
    const matches = findFuzzyMatches("egg", ["eggs", "Eggs", "EGGS"]);
    // All normalize to the same thing so only one match returned
    expect(matches.length).toBe(1);
  });

  it("sorts results by similarity descending", () => {
    const matches = findFuzzyMatches("brea", candidates, {
      minSimilarity: 50,
    });
    for (let i = 1; i < matches.length; i++) {
      expect(matches[i].similarity).toBeLessThanOrEqual(
        matches[i - 1].similarity
      );
    }
  });
});
