import { create } from "../../convex/listItems";

// Mock the dependencies
jest.mock("../../convex/_generated/server", () => ({
  mutation: (args: any) => args.handler,
  query: (args: any) => args.handler,
}));

jest.mock("../../convex/_generated/api", () => ({
  api: {
    aiUsage: {
      checkRateLimit: "checkRateLimit",
    },
    ai: {
      estimateItemPrice: "estimateItemPrice",
    }
  },
}));

jest.mock("../../convex/partners", () => ({
  getUserListPermissions: jest.fn().mockResolvedValue({ canEdit: true }),
}));

jest.mock("../../convex/lib/priceResolver", () => ({
  resolveVariantWithPrice: jest.fn().mockResolvedValue(null),
}));

describe("listItems mutations", () => {
  let mockCtx: any;

  beforeEach(() => {
    mockCtx = {
      auth: {
        getUserIdentity: jest.fn().mockResolvedValue({ subject: "user_123" }),
      },
      db: {
        get: jest.fn(),
        query: jest.fn().mockReturnThis(),
        withIndex: jest.fn().mockReturnThis(),
        filter: jest.fn().mockReturnThis(),
        unique: jest.fn(),
        collect: jest.fn(),
        insert: jest.fn(),
        patch: jest.fn(),
        delete: jest.fn(),
      },
      runMutation: jest.fn(),
      scheduler: {
        runAfter: jest.fn(),
      },
    };
  });

  describe("create", () => {
    it("should create a list item successfully", async () => {
      // Setup mocks
      mockCtx.db.get.mockResolvedValueOnce({ _id: "list1" }); // List
      mockCtx.db.unique.mockResolvedValueOnce({ _id: "user1" }); // User
      mockCtx.runMutation.mockResolvedValueOnce({ allowed: true }); // Rate limit
      mockCtx.db.collect.mockResolvedValueOnce([]); // No existing duplicate list items
      mockCtx.db.collect.mockResolvedValueOnce([]); // No existing duplicate pantry items (active)
      mockCtx.db.collect.mockResolvedValueOnce([]); // No existing duplicate pantry items (archived)
      
      mockCtx.db.insert.mockResolvedValueOnce("pantry1"); // New pantry item
      mockCtx.db.insert.mockResolvedValueOnce("item1"); // New list item

      // No prices returned
      mockCtx.db.collect.mockResolvedValue([]); 

      const result = await (create as any)(mockCtx, {
        listId: "list1",
        name: "Milk",
        quantity: 1,
      });

      expect(result).toEqual({ status: "added", itemId: "item1" });
      expect(mockCtx.db.insert).toHaveBeenCalledTimes(2);
      expect(mockCtx.runMutation).toHaveBeenCalled();
    });

    it("should reject if rate limit exceeded", async () => {
      mockCtx.db.get.mockResolvedValueOnce({ _id: "list1" }); // List
      mockCtx.db.unique.mockResolvedValueOnce({ _id: "user1" }); // User
      mockCtx.runMutation.mockResolvedValueOnce({ allowed: false }); // Rate limit fails

      await expect((create as any)(mockCtx, {
        listId: "list1",
        name: "Milk",
        quantity: 1,
      })).rejects.toThrow("Rate limit exceeded");
    });

    it("should bump existing item if duplicate and forced", async () => {
      mockCtx.db.get.mockResolvedValueOnce({ _id: "list1" }); // List
      mockCtx.db.unique.mockResolvedValueOnce({ _id: "user1" }); // User
      mockCtx.runMutation.mockResolvedValueOnce({ allowed: true }); // Rate limit
      
      // Existing duplicate
      mockCtx.db.collect.mockResolvedValueOnce([
        { _id: "existing_item1", name: "Milk", quantity: 1, isChecked: false }
      ]); 

      const result = await (create as any)(mockCtx, {
        listId: "list1",
        name: "Milk",
        quantity: 1,
        force: true
      });

      expect(result.status).toBe("bumped");
      expect(result.itemId).toBe("existing_item1");
      expect(mockCtx.db.patch).toHaveBeenCalledWith("existing_item1", expect.objectContaining({
        quantity: 2
      }));
    });
  });
});
