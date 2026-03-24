import {
  isValidSize,
  parseItemNameAndSize,
  formatItemDisplay,
  cleanItemForStorage,
} from "../../convex/lib/itemNameParser";

describe("Item Name Parser", () => {
  describe("isValidSize", () => {
    it("should return false for missing size or unit", () => {
      expect(isValidSize()).toBe(false);
      expect(isValidSize("500ml", undefined)).toBe(false);
      expect(isValidSize(undefined, "ml")).toBe(false);
    });

    it("should return false for vague sizes", () => {
      expect(isValidSize("per item", "each")).toBe(false);
      expect(isValidSize("item", "each")).toBe(false);
      expect(isValidSize("each", "each")).toBe(false);
    });

    it("should return false for invalid units", () => {
      expect(isValidSize("500foo", "foo")).toBe(false);
    });

    it("should return false if size has no numbers", () => {
      expect(isValidSize("large", "large")).toBe(false);
    });

    it("should return false on unit mismatch", () => {
      expect(isValidSize("500ml", "l")).toBe(false);
    });

    it("should return true for valid size and unit", () => {
      expect(isValidSize("500ml", "ml")).toBe(true);
      expect(isValidSize("2kg", "kg")).toBe(true);
      expect(isValidSize("1.5 l", "l")).toBe(true);
      expect(isValidSize("6 pack", "pack")).toBe(true);
    });
  });

  describe("parseItemNameAndSize", () => {
    it("should extract size and unit from the beginning of the name", () => {
      const result = parseItemNameAndSize("500ml Milk");
      expect(result.name).toBe("Milk");
      expect(result.size).toBe("500ml");
      expect(result.unit).toBe("ml");
    });

    it("should extract size from end of name as fallback", () => {
      const result = parseItemNameAndSize("Milk 500ml");
      // Extracts size from end when not at beginning
      expect(result.name).toBe("Milk");
      expect(result.size).toBe("500ml");
      expect(result.unit).toBe("ml");
    });

    it("should use existing valid size/unit", () => {
      const result = parseItemNameAndSize("Rice", "2kg", "kg");
      expect(result.name).toBe("Rice");
      expect(result.size).toBe("2kg");
      expect(result.unit).toBe("kg");
    });

    it("should extract unit if missing but implicit in existing size", () => {
      const result = parseItemNameAndSize("Rice", "2kg");
      expect(result.name).toBe("Rice");
      expect(result.size).toBe("2kg");
      expect(result.unit).toBe("kg");
    });

    it("should clean imperial-first dual-unit size field", () => {
      const result = parseItemNameAndSize("Cantu Leave-In Conditioner", "8 FL OZ / 237 mL");
      expect(result.name).toBe("Cantu Leave-In Conditioner");
      expect(result.size).toBe("237 ml");
      expect(result.unit).toBe("ml");
    });

    it("should clean metric-first dual-unit size field", () => {
      const result = parseItemNameAndSize("Milk", "347ml/12 fl oz");
      expect(result.name).toBe("Milk");
      expect(result.size).toBe("347ml");
      expect(result.unit).toBe("ml");
    });

    it("should strip dual-unit prefix from name when AI embeds everything", () => {
      const result = parseItemNameAndSize("8 FL OZ / 237 mL Leave-in Conditioning Treatment");
      expect(result.name).toBe("Leave-in Conditioning Treatment");
      expect(result.size).toBe("237 ml");
      expect(result.unit).toBe("ml");
    });

    it("should clean parenthetical duplicate from size", () => {
      const result = parseItemNameAndSize("Butter", "227g (8oz)", "g");
      expect(result.name).toBe("Butter");
      expect(result.size).toBe("227g");
      expect(result.unit).toBe("g");
    });
  });

  describe("formatItemDisplay", () => {
    it("should format correctly with size at the beginning", () => {
      expect(formatItemDisplay("Milk", "500ml", "ml")).toBe("500ml Milk");
    });

    it("should deduplicate size from name", () => {
      expect(formatItemDisplay("500ml Milk", "500ml", "ml")).toBe("500ml Milk");
      expect(formatItemDisplay("Milk 500ml", "500ml", "ml")).toBe("500ml Milk");
      expect(formatItemDisplay("Milk (500ml)", "500ml", "ml")).toBe("500ml Milk");
    });

    it("should ignore invalid/vague sizes", () => {
      expect(formatItemDisplay("Milk", "per item", "each")).toBe("Milk");
    });

    it("should clean dual-unit size before display", () => {
      expect(formatItemDisplay("Conditioner", "8 FL OZ / 237 mL", "ml")).toBe("237 ml Conditioner");
    });

    it("should strip dual-unit prefix from name for old DB data", () => {
      expect(formatItemDisplay("8 FL OZ / 237 mL Leave-in Conditioner", "237ml", "ml")).toBe("237ml Leave-in Conditioner");
    });

    it("should truncate long names to fit 40 char cap", () => {
      const result = formatItemDisplay("Cantu Shea Butter Leave-in Conditioning Treatment For Hair", "237ml", "ml");
      expect(result.length).toBeLessThanOrEqual(40);
      expect(result).toMatch(/^237ml /);
      expect(result).toMatch(/\u2026$/);
    });
  });

  describe("cleanItemForStorage", () => {
    it("should clean and extract size", () => {
      const result = cleanItemForStorage("500ml Milk");
      expect(result.name).toBe("Milk");
      expect(result.size).toBe("500ml");
      expect(result.unit).toBe("ml");
    });

    it("should reject size if unit is not available/valid", () => {
      const result = cleanItemForStorage("Milk", "large");
      expect(result.name).toBe("Milk");
      expect(result.size).toBeUndefined();
      expect(result.unit).toBeUndefined();
    });

    it("should pass valid explicit sizes", () => {
      const result = cleanItemForStorage("Rice", "2kg", "kg");
      expect(result.name).toBe("Rice");
      expect(result.size).toBe("2kg");
      expect(result.unit).toBe("kg");
    });

    it("should reject size without unit (number only)", () => {
      const result = cleanItemForStorage("Milk", "500");
      expect(result.name).toBe("Milk");
      expect(result.size).toBeUndefined();
      expect(result.unit).toBeUndefined();
    });

    it("should handle empty string name", () => {
      const result = cleanItemForStorage("");
      expect(result.name).toBe("");
      expect(result.size).toBeUndefined();
      expect(result.unit).toBeUndefined();
    });

    it("should handle whitespace-only name", () => {
      const result = cleanItemForStorage("   ");
      expect(result.name).toBe("");
      expect(result.size).toBeUndefined();
      expect(result.unit).toBeUndefined();
    });

    it("should handle null size and unit", () => {
      const result = cleanItemForStorage("Milk", null, null);
      expect(result.name).toBe("Milk");
      expect(result.size).toBeUndefined();
      expect(result.unit).toBeUndefined();
    });

    it("should handle unicode/accented item names", () => {
      const result = cleanItemForStorage("500ml Crème Fraîche");
      expect(result.name).toBe("Crème Fraîche");
      expect(result.size).toBe("500ml");
      expect(result.unit).toBe("ml");
    });

    it("should handle accented name without size", () => {
      const result = cleanItemForStorage("Açaí Bowl", "250g", "g");
      expect(result.name).toBe("Açaí Bowl");
      expect(result.size).toBe("250g");
      expect(result.unit).toBe("g");
    });

    it("should reject all vague size strings", () => {
      const vagueSizes = ["per item", "item", "each", "unit", "piece"];
      for (const vague of vagueSizes) {
        const result = cleanItemForStorage("Milk", vague, "each");
        expect(result.size).toBeUndefined();
        expect(result.unit).toBeUndefined();
      }
    });

    it("should handle size with valid decimal values", () => {
      const result = cleanItemForStorage("Olive Oil", "1.5l", "l");
      expect(result.name).toBe("Olive Oil");
      expect(result.size).toBe("1.5l");
      expect(result.unit).toBe("l");
    });

    it("should handle all valid UK units", () => {
      const cases = [
        { size: "500ml", unit: "ml" },
        { size: "2l", unit: "l" },
        { size: "250g", unit: "g" },
        { size: "1kg", unit: "kg" },
        { size: "2pt", unit: "pt" },
        { size: "1pint", unit: "pint" },
        { size: "6pack", unit: "pack" },
        { size: "4pk", unit: "pk" },
        { size: "6x", unit: "x" },
        { size: "8oz", unit: "oz" },
      ];
      for (const { size, unit } of cases) {
        const result = cleanItemForStorage("Test Item", size, unit);
        expect(result.size).toBe(size);
        expect(result.unit).toBe(unit);
      }
    });
  });

  describe("isValidSize - additional edge cases", () => {
    it("should reject empty string size", () => {
      expect(isValidSize("", "ml")).toBe(false);
    });

    it("should reject empty string unit", () => {
      expect(isValidSize("500ml", "")).toBe(false);
    });

    it("should reject null size", () => {
      expect(isValidSize(null, "ml")).toBe(false);
    });

    it("should reject null unit", () => {
      expect(isValidSize("500ml", null)).toBe(false);
    });

    it("should handle size with spaces between number and unit", () => {
      expect(isValidSize("500 ml", "ml")).toBe(true);
    });

    it("should reject size with unknown unit", () => {
      expect(isValidSize("500cups", "cups")).toBe(false);
    });
  });

  describe("parseItemNameAndSize - additional edge cases", () => {
    it("should handle name with only numbers and no unit", () => {
      const result = parseItemNameAndSize("500");
      expect(result.name).toBe("500");
      expect(result.size).toBeUndefined();
    });

    it("should handle name-embedded size with existing different size", () => {
      const result = parseItemNameAndSize("500ml Milk", "1l", "l");
      // Existing size takes priority, name gets cleaned
      expect(result.name).toBe("Milk");
      expect(result.size).toBe("1l");
      expect(result.unit).toBe("l");
    });

    it("should handle empty existing size string", () => {
      const result = parseItemNameAndSize("500ml Milk", "");
      expect(result.name).toBe("Milk");
      expect(result.size).toBe("500ml");
      expect(result.unit).toBe("ml");
    });
  });

  describe("formatItemDisplay - additional edge cases", () => {
    it("should return name only when size and unit are undefined", () => {
      expect(formatItemDisplay("Milk")).toBe("Milk");
    });

    it("should return name only when size is null", () => {
      expect(formatItemDisplay("Milk", null, null)).toBe("Milk");
    });

    it("should handle name at exactly 40 chars without size", () => {
      const name = "A".repeat(40);
      expect(formatItemDisplay(name)).toBe(name);
    });

    it("should truncate at exact boundary when size + name = 41 chars", () => {
      // "500ml " = 6 chars, so name must be capped at 34 chars
      const name = "A".repeat(35); // 6 + 35 = 41, should truncate
      const result = formatItemDisplay(name, "500ml", "ml");
      expect(result.length).toBeLessThanOrEqual(40);
      expect(result).toMatch(/^500ml /);
      expect(result).toMatch(/\u2026$/);
    });

    it("should not truncate when size + name = exactly 40 chars", () => {
      // "500ml " = 6 chars, name = 34 chars -> total 40
      const name = "A".repeat(34);
      const result = formatItemDisplay(name, "500ml", "ml");
      expect(result.length).toBe(40);
      expect(result).not.toMatch(/\u2026$/);
    });

    it("should return original name if dedup empties it", () => {
      // Name is just the size itself
      const result = formatItemDisplay("500ml", "500ml", "ml");
      expect(result).toBe("500ml");
    });
  });
});
