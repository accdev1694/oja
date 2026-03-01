import { deduplicateItems } from "../../convex/lib/itemDeduplicator";

// Mock the fuzzy matcher to just use lower case exact match for tests
jest.mock("../../convex/lib/fuzzyMatch", () => ({
  isDuplicateItemName: (a: string, b: string) => a.toLowerCase().trim() === b.toLowerCase().trim(),
}));

describe("itemDeduplicator", () => {
  it("should merge identical items from different lists and sum their quantities", () => {
    const input = new Map();
    input.set("list1", {
      listName: "List 1",
      items: [
        { name: "Milk", quantity: 1, estimatedPrice: 1.5 },
        { name: "Bread", quantity: 1, estimatedPrice: 1.0 },
      ],
    });
    input.set("list2", {
      listName: "List 2",
      items: [
        { name: "milk", quantity: 2, estimatedPrice: 1.4 },
        { name: "Eggs", quantity: 1 },
      ],
    });

    const result = deduplicateItems(input);

    expect(result.items).toHaveLength(3); // Milk, Bread, Eggs

    const milk = result.items.find(i => i.name.toLowerCase() === "milk");
    expect(milk).toBeDefined();
    expect(milk?.quantity).toBe(3); // 1 + 2
    expect(milk?.estimatedPrice).toBe(1.4); // Took the best price

    const bread = result.items.find(i => i.name.toLowerCase() === "bread");
    expect(bread).toBeDefined();
    expect(bread?.quantity).toBe(1);

    expect(result.duplicates).toHaveLength(1);
    expect(result.duplicates[0].name.toLowerCase()).toBe("milk");
  });

  it("should keep distinct items without merging", () => {
    const input = new Map();
    input.set("list1", {
      listName: "List 1",
      items: [{ name: "Apples", quantity: 5 }],
    });
    input.set("list2", {
      listName: "List 2",
      items: [{ name: "Bananas", quantity: 3 }],
    });

    const result = deduplicateItems(input);

    expect(result.items).toHaveLength(2);
    expect(result.duplicates).toHaveLength(0);
  });
});
