import {
  isValidProductName,
  variantKey,
} from "../convex/lib/communityHelpers";

describe("isValidProductName", () => {
  test("accepts normal product names", () => {
    expect(isValidProductName("Semi-Skimmed Milk")).toBe(true);
    expect(isValidProductName("180g Cashews")).toBe(true);
    expect(isValidProductName("Eggs Free Range 6pk")).toBe(true);
  });

  test("accepts names at boundary length (3 chars)", () => {
    expect(isValidProductName("Jam")).toBe(true);
    expect(isValidProductName("Ham")).toBe(true);
  });

  test("accepts names at max length (50 chars)", () => {
    expect(isValidProductName("a".repeat(50))).toBe(true);
  });

  test("rejects empty string", () => {
    expect(isValidProductName("")).toBe(false);
  });

  test("rejects too-short names", () => {
    expect(isValidProductName("ab")).toBe(false);
  });

  test("rejects purely numeric strings", () => {
    expect(isValidProductName("12345")).toBe(false);
  });

  test("rejects known garbage patterns", () => {
    expect(isValidProductName("test item")).toBe(false);
    expect(isValidProductName("asdfgh")).toBe(false);
    expect(isValidProductName("xxx placeholder")).toBe(false);
    expect(isValidProductName("unknown item")).toBe(false);
    expect(isValidProductName("null value")).toBe(false);
    expect(isValidProductName("undefined")).toBe(false);
    expect(isValidProductName("n/a product")).toBe(false);
  });

  test("rejects purely symbolic strings", () => {
    expect(isValidProductName("$%^&*!@#")).toBe(false);
  });

  test("rejects names with less than 50% alphabetic characters", () => {
    // "123abc" = 6 chars, 3 alpha = 50% -- borderline pass
    expect(isValidProductName("123abc")).toBe(true);
    // "1234ab" = 6 chars, 2 alpha = 33% -- fail
    expect(isValidProductName("1234ab")).toBe(false);
  });

  test("rejects very long names (>50 chars)", () => {
    expect(isValidProductName("a".repeat(51))).toBe(false);
  });
});

describe("variantKey", () => {
  test("same product different spacing produces same key", () => {
    const key1 = variantKey("Roasted Cashews", "180g");
    const key2 = variantKey("Roasted Cashews", "180 g");
    // Both sizes normalize to "180g" after space removal
    expect(key1).toBe(key2);
  });

  test("different sizes produce different keys", () => {
    expect(variantKey("Cashews", "180g")).not.toBe(
      variantKey("Cashews", "500g")
    );
  });

  test("case-insensitive on name", () => {
    expect(variantKey("MILK", "2pt")).toBe(variantKey("milk", "2pt"));
  });

  test("case-insensitive on size", () => {
    expect(variantKey("Milk", "2PT")).toBe(variantKey("Milk", "2pt"));
  });

  test("normalizes item names (removes plurals, articles)", () => {
    // normalizeItemName strips "s" suffix and common prefixes
    const key1 = variantKey("cashews", "180g");
    const key2 = variantKey("cashew", "180g");
    expect(key1).toBe(key2);
  });
});

