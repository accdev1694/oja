import { toGroceryTitleCase, normalizeDisplayName } from "../convex/lib/titleCase";

describe("toGroceryTitleCase", () => {
  // Basic capitalization
  it("capitalizes each word", () => {
    expect(toGroceryTitleCase("chin chin")).toBe("Chin Chin");
  });

  it("capitalizes a single word", () => {
    expect(toGroceryTitleCase("milk")).toBe("Milk");
  });

  // Prepositions and articles
  it("lowercases prepositions except first word", () => {
    expect(toGroceryTitleCase("bag of rice")).toBe("Bag of Rice");
  });

  it("capitalizes prepositions when first word", () => {
    expect(toGroceryTitleCase("of mice and men")).toBe("Of Mice and Men");
  });

  it("lowercases multiple prepositions", () => {
    expect(toGroceryTitleCase("salt and pepper in a bag")).toBe(
      "Salt and Pepper in a Bag"
    );
  });

  // ALL-CAPS (OCR receipts)
  it("converts ALL-CAPS to title case", () => {
    expect(toGroceryTitleCase("HEINZ BAKED BEANS")).toBe("Heinz Baked Beans");
  });

  it("handles all-caps with prepositions", () => {
    expect(toGroceryTitleCase("BAG OF RICE")).toBe("Bag of Rice");
  });

  // Known abbreviations
  it("preserves PG as uppercase", () => {
    expect(toGroceryTitleCase("PG TIPS TEA BAGS")).toBe("PG Tips Tea Bags");
  });

  it("preserves UHT as uppercase", () => {
    expect(toGroceryTitleCase("uht milk")).toBe("UHT Milk");
  });

  it("preserves BBQ as uppercase", () => {
    expect(toGroceryTitleCase("bbq sauce")).toBe("BBQ Sauce");
  });

  it("preserves HP as uppercase", () => {
    expect(toGroceryTitleCase("hp brown sauce")).toBe("HP Brown Sauce");
  });

  it("preserves XL as uppercase", () => {
    expect(toGroceryTitleCase("xl eggs free range")).toBe("XL Eggs Free Range");
  });

  // Measurement prefixes
  it("preserves measurement prefix 140g", () => {
    expect(toGroceryTitleCase("140g CHIN CHIN")).toBe("140g Chin Chin");
  });

  it("preserves measurement prefix 500ml", () => {
    expect(toGroceryTitleCase("500ml fresh orange juice")).toBe(
      "500ml Fresh Orange Juice"
    );
  });

  it("preserves measurement prefix 2L", () => {
    expect(toGroceryTitleCase("semi skimmed milk 2L")).toBe(
      "Semi Skimmed Milk 2L"
    );
  });

  it("preserves measurement prefix 1kg", () => {
    expect(toGroceryTitleCase("1kg basmati rice")).toBe("1kg Basmati Rice");
  });

  it("preserves decimal measurement 1.5L", () => {
    expect(toGroceryTitleCase("coca cola 1.5L")).toBe("Coca Cola 1.5L");
  });

  // Whitespace handling
  it("trims leading/trailing whitespace", () => {
    expect(toGroceryTitleCase("  milk  ")).toBe("Milk");
  });

  it("collapses multiple spaces", () => {
    expect(toGroceryTitleCase("whole   wheat   bread")).toBe(
      "Whole Wheat Bread"
    );
  });

  // Edge cases
  it("returns empty string for empty input", () => {
    expect(toGroceryTitleCase("")).toBe("");
  });

  it("returns empty string for whitespace-only input", () => {
    expect(toGroceryTitleCase("   ")).toBe("");
  });

  it("handles null/undefined gracefully", () => {
    expect(toGroceryTitleCase(null as unknown as string)).toBe(null);
    expect(toGroceryTitleCase(undefined as unknown as string)).toBe(undefined);
  });

  // Idempotency
  it("is idempotent", () => {
    const inputs = [
      "chin chin",
      "140g CHIN CHIN",
      "bag of rice",
      "PG TIPS TEA BAGS",
      "semi skimmed milk 2L",
      "HEINZ BAKED BEANS",
      "hp brown sauce",
    ];

    for (const input of inputs) {
      const first = toGroceryTitleCase(input);
      const second = toGroceryTitleCase(first);
      expect(second).toBe(first);
    }
  });

  // Mixed case input
  it("handles mixed case input", () => {
    expect(toGroceryTitleCase("sEMi sKiMmEd MiLk")).toBe("Semi Skimmed Milk");
  });

  // Real grocery examples
  it("handles typical UK grocery items", () => {
    expect(toGroceryTitleCase("warburtons toastie white bread")).toBe(
      "Warburtons Toastie White Bread"
    );
    expect(toGroceryTitleCase("cathedral city mature cheddar")).toBe(
      "Cathedral City Mature Cheddar"
    );
    expect(toGroceryTitleCase("birds eye fish fingers")).toBe(
      "Birds Eye Fish Fingers"
    );
  });
});

describe("normalizeDisplayName", () => {
  it("returns empty string for null", () => {
    expect(normalizeDisplayName(null)).toBe("");
  });

  it("returns empty string for undefined", () => {
    expect(normalizeDisplayName(undefined)).toBe("");
  });

  it("returns empty string for empty string", () => {
    expect(normalizeDisplayName("")).toBe("");
  });

  it("applies title case to valid string", () => {
    expect(normalizeDisplayName("brown bread")).toBe("Brown Bread");
  });
});
