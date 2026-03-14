import { resolvePrice, resolveVariantWithPrice } from "../../convex/lib/priceResolver";
import type { Id } from "../../convex/_generated/dataModel";
import type { QueryCtx } from "../../convex/_generated/server";

interface MockDb {
  get: jest.Mock;
  query: jest.Mock;
  withIndex: jest.Mock;
  collect: jest.Mock;
}

interface MockCtx {
  db: MockDb;
}

describe("Price Resolver", () => {
  let mockCtx: MockCtx;

  beforeEach(() => {
    mockCtx = {
      db: {
        get: jest.fn(),
        query: jest.fn().mockReturnThis(),
        withIndex: jest.fn().mockReturnThis(),
        collect: jest.fn(),
      },
    };
  });

  describe("resolvePrice cascade", () => {
    it("should return fresh personal price (Layer 1)", async () => {
      // Setup fresh personal price
      mockCtx.db.collect.mockResolvedValueOnce([
        {
          unitPrice: 1.2,
          size: "500ml",
          unit: "ml",
          storeName: "tesco",
          purchaseDate: Date.now() - 1000, // Very fresh
        },
      ]);

      const result = await resolvePrice(
        mockCtx as unknown as QueryCtx,
        "milk",
        "500ml",
        "ml",
        "Milk",
        "tesco",
        "user123" as unknown as Id<"users">,
        undefined
      );

      expect(result.price).toBe(1.2);
      expect(result.priceSource).toBe("personal");
      expect(result.confidence).toBe(1.0);
    });

    it("should fall back to crowdsourced if personal price is stale (Layer 2)", async () => {
      // Setup stale personal price
      mockCtx.db.collect.mockResolvedValueOnce([
        {
          unitPrice: 1.0,
          size: "500ml",
          unit: "ml",
          storeName: "tesco",
          purchaseDate: Date.now() - 5 * 24 * 60 * 60 * 1000, // 5 days old (stale > 3 days)
        },
      ]);

      // Setup fresh crowdsourced price
      mockCtx.db.collect.mockResolvedValueOnce([
        {
          unitPrice: 1.3,
          averagePrice: 1.3,
          size: "500ml",
          storeName: "tesco",
          region: "UK",
          reportCount: 5,
          lastSeenDate: Date.now() - 1000, // Very fresh
        },
      ]);
      mockCtx.db.get.mockResolvedValueOnce({ country: "UK" }); // User region

      const result = await resolvePrice(
        mockCtx as unknown as QueryCtx,
        "milk",
        "500ml",
        "ml",
        "Milk",
        "tesco",
        "user123" as unknown as Id<"users">,
        undefined
      );

      expect(result.price).toBe(1.3);
      expect(result.priceSource).toBe("crowdsourced");
      expect(result.confidence).toBeGreaterThan(0.6);
    });

    it("should use stale personal price if no crowdsourced data exists", async () => {
      // Setup stale personal price
      mockCtx.db.collect.mockResolvedValueOnce([
        {
          unitPrice: 1.0,
          size: "500ml",
          unit: "ml",
          storeName: "tesco",
          purchaseDate: Date.now() - 5 * 24 * 60 * 60 * 1000, // 5 days old
        },
      ]);

      // No crowdsourced prices
      mockCtx.db.collect.mockResolvedValueOnce([]);

      const result = await resolvePrice(
        mockCtx as unknown as QueryCtx,
        "milk",
        "500ml",
        "ml",
        "Milk",
        "tesco",
        "user123" as unknown as Id<"users">,
        undefined
      );

      expect(result.price).toBe(1.0);
      expect(result.priceSource).toBe("personal");
      expect(result.confidence).toBe(0.9);
    });

    it("should fall back to AI estimate if no history exists (Layer 3)", async () => {
      // No personal or crowdsourced prices
      mockCtx.db.collect.mockResolvedValue([]);

      const result = await resolvePrice(
        mockCtx as unknown as QueryCtx,
        "milk",
        "500ml",
        "ml",
        "Milk",
        "tesco",
        "user123" as unknown as Id<"users">,
        1.5
      );

      expect(result.price).toBe(1.5);
      expect(result.priceSource).toBe("ai");
      expect(result.confidence).toBe(0.5);
    });
  });

  describe("resolveVariantWithPrice", () => {
    it("should resolve the best variant and its price", async () => {
      // Setup item variants
      mockCtx.db.collect.mockResolvedValueOnce([
        {
          _id: "var1",
          baseItem: "milk",
          variantName: "Milk",
          size: "500ml",
          unit: "ml",
          commonality: 10,
          estimatedPrice: 1.5,
        },
      ]);

      // No personal or crowdsourced data
      mockCtx.db.collect.mockResolvedValue([]);

      const result = await resolveVariantWithPrice(
        mockCtx as unknown as QueryCtx,
        "milk",
        "tesco",
        "user123" as unknown as Id<"users">
      );

      expect(result).toBeDefined();
      expect(result?.variant._id).toBe("var1");
      expect(result?.price).toBe(1.5);
      expect(result?.priceSource).toBe("ai");
    });

    it("should return null if no variants exist", async () => {
      mockCtx.db.collect.mockResolvedValueOnce([]); // No variants

      const result = await resolveVariantWithPrice(
        mockCtx as unknown as QueryCtx,
        "unknown",
        "tesco",
        "user123" as unknown as Id<"users">
      );

      expect(result).toBeNull();
    });
  });
});
