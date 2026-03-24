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

    it("should sort variants by commonality desc then price asc", async () => {
      mockCtx.db.collect.mockResolvedValueOnce([
        {
          _id: "var1",
          baseItem: "milk",
          variantName: "Milk",
          size: "500ml",
          unit: "ml",
          commonality: 5,
          estimatedPrice: 2.0,
        },
        {
          _id: "var2",
          baseItem: "milk",
          variantName: "Milk",
          size: "1l",
          unit: "l",
          commonality: 10,
          estimatedPrice: 1.5,
        },
      ]);

      // No personal or crowdsourced data for either variant
      mockCtx.db.collect.mockResolvedValue([]);

      const result = await resolveVariantWithPrice(
        mockCtx as unknown as QueryCtx,
        "milk",
        "tesco",
        "user123" as unknown as Id<"users">
      );

      expect(result).toBeDefined();
      // var2 has higher commonality so should be selected
      expect(result?.variant._id).toBe("var2");
    });
  });

  describe("resolvePrice - no userId (anonymous)", () => {
    it("should skip personal layer when userId is undefined", async () => {
      // Fresh crowdsourced price
      mockCtx.db.collect.mockResolvedValueOnce([
        {
          unitPrice: 1.3,
          averagePrice: 1.3,
          variantName: "Milk",
          size: "500ml",
          storeName: "tesco",
          region: "UK",
          reportCount: 5,
          lastSeenDate: Date.now() - 1000,
        },
      ]);
      mockCtx.db.get.mockResolvedValueOnce(null); // No user

      const result = await resolvePrice(
        mockCtx as unknown as QueryCtx,
        "milk",
        "500ml",
        "ml",
        "Milk",
        "tesco",
        undefined,
        undefined
      );

      expect(result.price).toBe(1.3);
      expect(result.priceSource).toBe("crowdsourced");
    });
  });

  describe("resolvePrice - all layers empty", () => {
    it("should return null price when no data exists at any layer", async () => {
      mockCtx.db.collect.mockResolvedValue([]);

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

      expect(result.price).toBeNull();
      expect(result.priceSource).toBe("ai");
      expect(result.confidence).toBe(0);
      expect(result.reportCount).toBe(0);
    });
  });

  describe("resolvePrice - crowdsourced priority levels", () => {
    it("should prefer region-only match (Priority 3) when no store match", async () => {
      // No personal data
      mockCtx.db.collect.mockResolvedValueOnce([]);

      // Crowdsourced: no store match, but region match
      mockCtx.db.collect.mockResolvedValueOnce([
        {
          unitPrice: 1.4,
          averagePrice: 1.4,
          variantName: "Milk",
          size: "500ml",
          storeName: "sainsburys",
          normalizedStoreId: "sainsburys",
          region: "SE",
          reportCount: 3,
          lastSeenDate: Date.now() - 1000,
        },
      ]);
      mockCtx.db.get.mockResolvedValueOnce({ postcodePrefix: "SE" });

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

      expect(result.price).toBe(1.4);
      expect(result.priceSource).toBe("crowdsourced");
    });

    it("should fall back to global (Priority 4) when no store or region match", async () => {
      // No personal data
      mockCtx.db.collect.mockResolvedValueOnce([]);

      // Crowdsourced: no store match, no region match
      mockCtx.db.collect.mockResolvedValueOnce([
        {
          unitPrice: 1.5,
          averagePrice: 1.5,
          variantName: "Milk",
          size: "500ml",
          storeName: "aldi",
          normalizedStoreId: "aldi",
          region: "NW",
          reportCount: 8,
          lastSeenDate: Date.now() - 1000,
        },
      ]);
      mockCtx.db.get.mockResolvedValueOnce({ postcodePrefix: "SE" });

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

      expect(result.price).toBe(1.5);
      expect(result.priceSource).toBe("crowdsourced");
    });
  });

  describe("resolvePrice - stale crowdsourced vs personal", () => {
    it("should keep stale personal when crowdsourced confidence is low", async () => {
      // Stale personal price (5 days old)
      mockCtx.db.collect.mockResolvedValueOnce([
        {
          unitPrice: 1.0,
          size: "500ml",
          unit: "ml",
          storeName: "tesco",
          purchaseDate: Date.now() - 5 * 24 * 60 * 60 * 1000,
        },
      ]);

      // Old crowdsourced price with low report count (low confidence)
      mockCtx.db.collect.mockResolvedValueOnce([
        {
          unitPrice: 1.8,
          averagePrice: 1.8,
          variantName: "Milk",
          size: "500ml",
          storeName: "unknown_shop",
          normalizedStoreId: "unknown_shop",
          region: "NW",
          reportCount: 1,
          lastSeenDate: Date.now() - 80 * 24 * 60 * 60 * 1000, // 80 days old
        },
      ]);
      mockCtx.db.get.mockResolvedValueOnce({ country: "UK" });

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

      // Should fall back to personal because crowdsourced confidence is low
      expect(result.priceSource).toBe("personal");
      expect(result.price).toBe(1.0);
      expect(result.confidence).toBe(0.9);
    });
  });

  describe("resolvePrice - no storeName", () => {
    it("should resolve without store filtering", async () => {
      // No personal data
      mockCtx.db.collect.mockResolvedValueOnce([]);

      // Crowdsourced data
      mockCtx.db.collect.mockResolvedValueOnce([
        {
          unitPrice: 1.2,
          averagePrice: 1.2,
          variantName: "Milk",
          size: "500ml",
          storeName: "tesco",
          normalizedStoreId: "tesco",
          region: "UK",
          reportCount: 5,
          lastSeenDate: Date.now() - 1000,
        },
      ]);
      mockCtx.db.get.mockResolvedValueOnce({ country: "UK" });

      const result = await resolvePrice(
        mockCtx as unknown as QueryCtx,
        "milk",
        "500ml",
        "ml",
        "Milk",
        undefined, // No store
        "user123" as unknown as Id<"users">,
        undefined
      );

      // Should skip store-based priorities and go to region/global
      expect(result.price).toBe(1.2);
      expect(result.priceSource).toBe("crowdsourced");
    });
  });
});
