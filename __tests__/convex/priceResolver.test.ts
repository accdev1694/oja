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

      // Setup fresh crowdsourced price (must match size AND unit for variant filter)
      mockCtx.db.collect.mockResolvedValueOnce([
        {
          unitPrice: 1.3,
          averagePrice: 1.3,
          size: "500ml",
          unit: "ml",
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

  // ---------------------------------------------------------------------------
  // Bug fix: Personal history filter uses AND (not OR) for size+unit matching
  // ---------------------------------------------------------------------------
  describe("resolvePrice - personal history AND filter (size + unit)", () => {
    it("should return personal price when BOTH size AND unit match", async () => {
      mockCtx.db.collect.mockResolvedValueOnce([
        {
          unitPrice: 2.5,
          size: "2 pints",
          unit: "pint",
          storeName: "tesco",
          purchaseDate: Date.now() - 1000, // Fresh
        },
      ]);

      const result = await resolvePrice(
        mockCtx as unknown as QueryCtx,
        "milk",
        "2 pints",
        "pint",
        "Milk",
        "tesco",
        "user123" as unknown as Id<"users">,
        undefined
      );

      expect(result.price).toBe(2.5);
      expect(result.priceSource).toBe("personal");
      expect(result.confidence).toBe(1.0);
    });

    it("should NOT match personal history when only unit matches but size differs", async () => {
      // Personal history has size "1 pint" / unit "pint"
      // but we're resolving for size "2 pints" / unit "pint"
      // Old OR logic would incorrectly match on unit alone
      mockCtx.db.collect.mockResolvedValueOnce([
        {
          unitPrice: 1.0,
          size: "1 pint",
          unit: "pint",
          storeName: "tesco",
          purchaseDate: Date.now() - 1000, // Fresh
        },
      ]);

      // No crowdsourced data
      mockCtx.db.collect.mockResolvedValueOnce([]);

      const result = await resolvePrice(
        mockCtx as unknown as QueryCtx,
        "milk",
        "2 pints", // Different size than the "1 pint" in history
        "pint",    // Same unit
        "Milk",
        "tesco",
        "user123" as unknown as Id<"users">,
        3.0 // AI fallback
      );

      // Should NOT use personal price because size does not match
      expect(result.price).toBe(3.0);
      expect(result.priceSource).toBe("ai");
    });

    it("should NOT match personal history when only size matches but unit differs", async () => {
      // Personal history has size "500ml" / unit "ml"
      // but we're resolving for size "500ml" / unit "g"
      // Old OR logic would incorrectly match on size alone
      mockCtx.db.collect.mockResolvedValueOnce([
        {
          unitPrice: 1.5,
          size: "500ml",
          unit: "ml",
          storeName: "tesco",
          purchaseDate: Date.now() - 1000, // Fresh
        },
      ]);

      // No crowdsourced data
      mockCtx.db.collect.mockResolvedValueOnce([]);

      const result = await resolvePrice(
        mockCtx as unknown as QueryCtx,
        "flour",
        "500ml", // Same size string
        "g",     // Different unit than "ml" in history
        "Flour",
        "tesco",
        "user123" as unknown as Id<"users">,
        2.0 // AI fallback
      );

      // Should NOT use personal price because unit does not match
      expect(result.price).toBe(2.0);
      expect(result.priceSource).toBe("ai");
    });

    it("should correctly filter among multiple personal history entries with AND logic", async () => {
      // Multiple personal entries: only one matches both size AND unit
      mockCtx.db.collect.mockResolvedValueOnce([
        {
          unitPrice: 0.80,
          size: "1 pint",
          unit: "pint",
          storeName: "tesco",
          purchaseDate: Date.now() - 2000,
        },
        {
          unitPrice: 1.50,
          size: "2 pints",
          unit: "pint",
          storeName: "tesco",
          purchaseDate: Date.now() - 1000, // More recent
        },
        {
          unitPrice: 3.00,
          size: "2 pints",
          unit: "litre", // Same size string but different unit
          storeName: "tesco",
          purchaseDate: Date.now() - 500,
        },
      ]);

      const result = await resolvePrice(
        mockCtx as unknown as QueryCtx,
        "milk",
        "2 pints",
        "pint",
        "Milk",
        "tesco",
        "user123" as unknown as Id<"users">,
        undefined
      );

      // Should match only the entry with size="2 pints" AND unit="pint" (price 1.50)
      // NOT the entry with unit="litre" despite size="2 pints"
      expect(result.price).toBe(1.50);
      expect(result.priceSource).toBe("personal");
    });
  });

  // ---------------------------------------------------------------------------
  // Bug fix: Crowdsourced variant filter uses correct AND logic for size+unit
  // ---------------------------------------------------------------------------
  describe("resolvePrice - crowdsourced variant AND filter (size + unit)", () => {
    it("should match crowdsourced by variantName even if size+unit differ", async () => {
      // No personal data
      mockCtx.db.collect.mockResolvedValueOnce([]);

      // Crowdsourced: matches on variantName
      mockCtx.db.collect.mockResolvedValueOnce([
        {
          unitPrice: 1.8,
          averagePrice: 1.8,
          variantName: "Semi-Skimmed Milk",
          size: "4 pints",
          unit: "pint",
          storeName: "tesco",
          normalizedStoreId: "tesco",
          region: "UK",
          reportCount: 10,
          lastSeenDate: Date.now() - 1000,
        },
      ]);
      mockCtx.db.get.mockResolvedValueOnce({ country: "UK" });

      const result = await resolvePrice(
        mockCtx as unknown as QueryCtx,
        "milk",
        "2 pints",  // Different size
        "pint",     // Same unit but size differs
        "Semi-Skimmed Milk", // Matches variantName
        "tesco",
        "user123" as unknown as Id<"users">,
        undefined
      );

      // Should match because variantName matches (OR between name and size+unit)
      expect(result.price).toBe(1.8);
      expect(result.priceSource).toBe("crowdsourced");
    });

    it("should match crowdsourced by size+unit even if variantName differs", async () => {
      // No personal data
      mockCtx.db.collect.mockResolvedValueOnce([]);

      // Crowdsourced: matches on size+unit but not variantName
      mockCtx.db.collect.mockResolvedValueOnce([
        {
          unitPrice: 2.2,
          averagePrice: 2.2,
          variantName: "Whole Milk",
          size: "2 pints",
          unit: "pint",
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
        "2 pints",
        "pint",
        "Semi-Skimmed Milk", // Different variantName
        "tesco",
        "user123" as unknown as Id<"users">,
        undefined
      );

      // Should match because both size AND unit match
      expect(result.price).toBe(2.2);
      expect(result.priceSource).toBe("crowdsourced");
    });

    it("should NOT match crowdsourced when only size matches but unit differs and variantName differs", async () => {
      // No personal data
      mockCtx.db.collect.mockResolvedValueOnce([]);

      // Crowdsourced: size matches but unit does not, variantName also differs
      mockCtx.db.collect.mockResolvedValueOnce([
        {
          unitPrice: 4.0,
          averagePrice: 4.0,
          variantName: "Whole Milk",
          size: "500ml",
          unit: "ml",
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
        "flour",
        "500ml", // Same size string
        "g",     // Different unit
        "Self-Raising Flour", // Different variantName
        "tesco",
        "user123" as unknown as Id<"users">,
        5.0 // AI fallback
      );

      // Should NOT match crowdsourced: variantName differs AND unit differs
      // Even though size string "500ml" matches, the unit "g" != "ml"
      expect(result.price).toBe(5.0);
      expect(result.priceSource).toBe("ai");
    });
  });

  // ---------------------------------------------------------------------------
  // Bug fix: userRegion parameter avoids unnecessary user fetch
  // ---------------------------------------------------------------------------
  describe("resolvePrice - userRegion parameter", () => {
    it("should use provided userRegion without fetching the user", async () => {
      // No personal data
      mockCtx.db.collect.mockResolvedValueOnce([]);

      // Crowdsourced data with region match
      mockCtx.db.collect.mockResolvedValueOnce([
        {
          unitPrice: 1.6,
          averagePrice: 1.6,
          variantName: "Milk",
          size: "500ml",
          unit: "ml",
          storeName: "sainsburys",
          normalizedStoreId: "sainsburys",
          region: "SE",
          reportCount: 8,
          lastSeenDate: Date.now() - 1000,
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
        undefined,
        "SE" // userRegion passed directly
      );

      // Should match the region "SE" entry
      expect(result.price).toBe(1.6);
      expect(result.priceSource).toBe("crowdsourced");

      // db.get should NOT have been called because userRegion was provided
      // (personal history collect is the only db call, no user lookup needed)
      expect(mockCtx.db.get).not.toHaveBeenCalled();
    });

    it("should fetch user for region when userRegion is not provided", async () => {
      // No personal data
      mockCtx.db.collect.mockResolvedValueOnce([]);

      // Crowdsourced data
      mockCtx.db.collect.mockResolvedValueOnce([
        {
          unitPrice: 1.7,
          averagePrice: 1.7,
          variantName: "Milk",
          size: "500ml",
          unit: "ml",
          storeName: "aldi",
          normalizedStoreId: "aldi",
          region: "NW",
          reportCount: 4,
          lastSeenDate: Date.now() - 1000,
        },
      ]);

      // User lookup returns postcodePrefix
      mockCtx.db.get.mockResolvedValueOnce({ postcodePrefix: "NW" });

      const result = await resolvePrice(
        mockCtx as unknown as QueryCtx,
        "milk",
        "500ml",
        "ml",
        "Milk",
        "tesco",
        "user123" as unknown as Id<"users">,
        undefined
        // No userRegion (9th arg omitted)
      );

      // Should have fetched the user to get region
      expect(mockCtx.db.get).toHaveBeenCalledWith("user123");
      expect(result.price).toBe(1.7);
      expect(result.priceSource).toBe("crowdsourced");
    });

    it("should use userRegion for store+region priority matching", async () => {
      // No personal data
      mockCtx.db.collect.mockResolvedValueOnce([]);

      // Two crowdsourced entries: one for store+region "SE", one for store+region "NW"
      mockCtx.db.collect.mockResolvedValueOnce([
        {
          unitPrice: 2.0,
          averagePrice: 2.0,
          variantName: "Milk",
          size: "1l",
          unit: "l",
          storeName: "tesco",
          normalizedStoreId: "tesco",
          region: "NW",
          reportCount: 3,
          lastSeenDate: Date.now() - 1000,
        },
        {
          unitPrice: 1.9,
          averagePrice: 1.9,
          variantName: "Milk",
          size: "1l",
          unit: "l",
          storeName: "tesco",
          normalizedStoreId: "tesco",
          region: "SE",
          reportCount: 6,
          lastSeenDate: Date.now() - 1000,
        },
      ]);

      const result = await resolvePrice(
        mockCtx as unknown as QueryCtx,
        "milk",
        "1l",
        "l",
        "Milk",
        "tesco",
        "user123" as unknown as Id<"users">,
        undefined,
        "SE" // Explicitly pass userRegion
      );

      // Should match Priority 1 (store + region "SE") with price 1.9
      expect(result.price).toBe(1.9);
      expect(result.priceSource).toBe("crowdsourced");
      // db.get should NOT be called since userRegion was provided
      expect(mockCtx.db.get).not.toHaveBeenCalled();
    });

    it("should default to UK when no userRegion and no userId provided", async () => {
      // Crowdsourced data with UK region
      mockCtx.db.collect.mockResolvedValueOnce([
        {
          unitPrice: 1.4,
          averagePrice: 1.4,
          variantName: "Bread",
          size: "800g",
          unit: "g",
          storeName: "tesco",
          normalizedStoreId: "tesco",
          region: "UK",
          reportCount: 12,
          lastSeenDate: Date.now() - 1000,
        },
      ]);

      const result = await resolvePrice(
        mockCtx as unknown as QueryCtx,
        "bread",
        "800g",
        "g",
        "Bread",
        "tesco",
        undefined, // No userId
        undefined
        // No userRegion
      );

      // Should use "UK" as default region and match
      expect(result.price).toBe(1.4);
      expect(result.priceSource).toBe("crowdsourced");
      // db.get should not be called because there is no userId
      expect(mockCtx.db.get).not.toHaveBeenCalled();
    });
  });
});
