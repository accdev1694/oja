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

    it("should return name only if no size is at the beginning", () => {
      const result = parseItemNameAndSize("Milk 500ml");
      // Pattern only matches at the beginning
      expect(result.name).toBe("Milk 500ml");
      expect(result.size).toBeUndefined();
      expect(result.unit).toBeUndefined();
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
  });
});
