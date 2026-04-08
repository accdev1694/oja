import { create } from "../../convex/listItems";

// Mock the dependencies
jest.mock("../../convex/_generated/server", () => ({
  mutation: (args: { handler: unknown }) => args.handler,
  query: (args: { handler: unknown }) => args.handler,
}));

jest.mock("../../convex/_generated/api", () => ({
  api: {
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

const mockRateLimitCheck = jest.fn();
jest.mock("../../convex/lib/rateLimit", () => ({
  checkRateLimit: (...args: unknown[]) => mockRateLimitCheck(...args),
}));

interface MockListItemDb {
  get: jest.Mock;
  query: jest.Mock;
  withIndex: jest.Mock;
  filter: jest.Mock;
  order: jest.Mock;
  unique: jest.Mock;
  collect: jest.Mock;
  first: jest.Mock;
  insert: jest.Mock;
  patch: jest.Mock;
  delete: jest.Mock;
}

interface MockListItemCtx {
  auth: { getUserIdentity: jest.Mock };
  db: MockListItemDb;
  runMutation: jest.Mock;
  scheduler: { runAfter: jest.Mock };
}

describe("listItems mutations", () => {
  let mockCtx: MockListItemCtx;

  beforeEach(() => {
    mockRateLimitCheck.mockReset();
    mockCtx = {
      auth: {
        getUserIdentity: jest.fn().mockResolvedValue({ subject: "user_123" }),
      },
      db: {
        get: jest.fn(),
        query: jest.fn().mockReturnThis(),
        withIndex: jest.fn().mockReturnThis(),
        filter: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        unique: jest.fn(),
        collect: jest.fn(),
        first: jest.fn(),
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
      mockRateLimitCheck.mockResolvedValueOnce({ allowed: true, remaining: 99 }); // Rate limit
      mockCtx.db.collect.mockResolvedValueOnce([]); // No existing duplicate list items
      mockCtx.db.collect.mockResolvedValueOnce([]); // No existing duplicate pantry items (active)
      mockCtx.db.collect.mockResolvedValueOnce([]); // No existing duplicate pantry items (archived)

      mockCtx.db.insert.mockResolvedValueOnce("item1"); // New list item

      // No prices returned
      mockCtx.db.collect.mockResolvedValue([]);

      const result = await (create as unknown as (ctx: MockListItemCtx, args: Record<string, unknown>) => Promise<{ status: string; itemId: string }>)(mockCtx, {
        listId: "list1",
        name: "Milk",
        quantity: 1,
      });

      expect(result).toEqual({ status: "added", itemId: "item1" });
      expect(mockCtx.db.insert).toHaveBeenCalled();
      expect(mockRateLimitCheck).toHaveBeenCalledWith(mockCtx, "user1", "list_items", 100);
    });

    it("should reject if rate limit exceeded", async () => {
      mockCtx.db.get.mockResolvedValueOnce({ _id: "list1" }); // List
      mockCtx.db.unique.mockResolvedValueOnce({ _id: "user1" }); // User
      mockRateLimitCheck.mockResolvedValueOnce({ allowed: false, remaining: 0 }); // Rate limit fails

      await expect((create as unknown as (ctx: MockListItemCtx, args: Record<string, unknown>) => Promise<{ status: string; itemId: string }>)(mockCtx, {
        listId: "list1",
        name: "Milk",
        quantity: 1,
      })).rejects.toThrow("Rate limit exceeded");
    });

    it("should bump existing item if duplicate and forced", async () => {
      mockCtx.db.get.mockResolvedValueOnce({ _id: "list1" }); // List
      mockCtx.db.unique.mockResolvedValueOnce({ _id: "user1" }); // User
      mockRateLimitCheck.mockResolvedValueOnce({ allowed: true, remaining: 99 }); // Rate limit

      // Pantry lookup (no match)
      mockCtx.db.collect.mockResolvedValueOnce([]);

      // Existing duplicate in list
      mockCtx.db.collect.mockResolvedValueOnce([
        { _id: "existing_item1", name: "Milk", quantity: 1, isChecked: false }
      ]);

      const result = await (create as unknown as (ctx: MockListItemCtx, args: Record<string, unknown>) => Promise<{ status: string; itemId: string }>)(mockCtx, {
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

    it("should return duplicate status when item exists and force is false", async () => {
      mockCtx.db.get.mockResolvedValueOnce({ _id: "list1" });
      mockCtx.db.unique.mockResolvedValueOnce({ _id: "user1" });
      mockRateLimitCheck.mockResolvedValueOnce({ allowed: true, remaining: 99 });

      // Pantry lookup (no match)
      mockCtx.db.collect.mockResolvedValueOnce([]);

      // Mock item must have no size so isDuplicateItem matches (both sizes undefined)
      mockCtx.db.collect.mockResolvedValueOnce([
        { _id: "existing_item1", name: "Milk", quantity: 1, isChecked: false }
      ]);

      const result = await (create as unknown as (ctx: MockListItemCtx, args: Record<string, unknown>) => Promise<{ status: string; existingItemId?: string }>)(mockCtx, {
        listId: "list1",
        name: "Milk",
        quantity: 1,
      });

      expect(result.status).toBe("duplicate");
      expect(result.existingItemId).toBe("existing_item1");
      expect(mockCtx.db.insert).not.toHaveBeenCalled();
    });

    it("should verify insert arguments contain cleaned data", async () => {
      mockCtx.db.get.mockResolvedValueOnce({ _id: "list1" });
      mockCtx.db.unique.mockResolvedValueOnce({ _id: "user1" });
      mockRateLimitCheck.mockResolvedValueOnce({ allowed: true, remaining: 99 });
      mockCtx.db.collect.mockResolvedValueOnce([]); // No duplicate list items
      mockCtx.db.collect.mockResolvedValueOnce([]); // No duplicate pantry (active)
      mockCtx.db.collect.mockResolvedValueOnce([]); // No duplicate pantry (archived)
      mockCtx.db.insert.mockResolvedValueOnce("item1");
      mockCtx.db.collect.mockResolvedValue([]);

      await (create as unknown as (ctx: MockListItemCtx, args: Record<string, unknown>) => Promise<{ status: string; itemId: string }>)(mockCtx, {
        listId: "list1",
        name: "500ml Milk",
        quantity: 1,
        size: "500ml",
        unit: "ml",
      });

      expect(mockCtx.db.insert).toHaveBeenCalledWith(
        "listItems",
        expect.objectContaining({
          name: expect.any(String),
          size: "500ml",
          unit: "ml",
          isChecked: false,
        })
      );
    });
  });
});
