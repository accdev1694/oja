/**
 * Tests for `refreshListPrices` — specifically the new `changes` payload
 * that feeds the FlashInsightBanner details list.
 *
 * The mutation is imported and executed as a plain handler with a mocked
 * Convex context, the same pattern as `__tests__/convex/listItems.test.ts`.
 */

import { refreshListPrices } from "../../convex/listItems/pricing";

// ─────────────────────────────────────────────────────────────────────────────
// Mocks
// ─────────────────────────────────────────────────────────────────────────────

jest.mock("../../convex/_generated/server", () => ({
  mutation: (args: { handler: unknown }) => args.handler,
  query: (args: { handler: unknown }) => args.handler,
}));

jest.mock("../../convex/_generated/api", () => ({
  api: {},
}));

jest.mock("../../convex/partners", () => ({
  getUserListPermissions: jest.fn().mockResolvedValue({ canEdit: true }),
}));

jest.mock("../../convex/lib/priceResolver", () => ({
  resolveVariantWithPrice: jest.fn().mockResolvedValue(null),
}));

jest.mock("../../convex/lib/priceValidator", () => ({
  getEmergencyPriceEstimate: jest.fn(() => ({ price: 0.99, size: "per item", unit: "each" })),
}));

// ─────────────────────────────────────────────────────────────────────────────
// Helpers — build a mock Convex ctx around a fixed set of rows
// ─────────────────────────────────────────────────────────────────────────────

interface Row {
  _id: string;
  [key: string]: unknown;
}

interface QueryScope {
  table: string;
  rows: Row[];
}

function makeCtx(opts: {
  user: Row;
  list: Row;
  items: Row[];
  priceHistory?: Row[];
  currentPrices?: Row[];
}) {
  const patches: Record<string, Record<string, unknown>> = {};

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db: any = {
    get: jest.fn(async (id: string) => {
      if (id === opts.list._id) return opts.list;
      if (id === opts.user._id) return opts.user;
      const item = opts.items.find((i) => i._id === id);
      return item ?? null;
    }),
    patch: jest.fn(async (id: string, delta: Record<string, unknown>) => {
      patches[id] = { ...(patches[id] ?? {}), ...delta };
    }),
    // Chainable query builder — enough to support `.query().withIndex().collect()`
    // and the identity-lookup `.query("users").withIndex().unique()`.
    query: jest.fn((table: string) => {
      const scope: QueryScope = { table, rows: [] };
      if (table === "listItems") scope.rows = opts.items;
      else if (table === "priceHistory") scope.rows = opts.priceHistory ?? [];
      else if (table === "currentPrices") scope.rows = opts.currentPrices ?? [];
      else if (table === "users") scope.rows = [opts.user];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const builder: any = {
        withIndex: jest.fn(() => builder),
        filter: jest.fn(() => builder),
        order: jest.fn(() => builder),
        collect: jest.fn(async () => scope.rows),
        unique: jest.fn(async () => scope.rows[0] ?? null),
        first: jest.fn(async () => scope.rows[0] ?? null),
      };
      return builder;
    }),
  };

  const ctx = {
    auth: { getUserIdentity: jest.fn().mockResolvedValue({ subject: "clerk|user_1" }) },
    db,
    runMutation: jest.fn(),
    scheduler: { runAfter: jest.fn() },
  };

  return { ctx, patches };
}

// ─────────────────────────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Handler = (ctx: any, args: { listId: string }) => Promise<{
  updated: number;
  total: number;
  changes: { name: string; oldPrice?: number; newPrice: number }[];
}>;

const handler = refreshListPrices as unknown as Handler;

const listId = "list_1";
const user: Row = {
  _id: "user_1",
  postcodePrefix: "E1",
  country: "UK",
};

describe("refreshListPrices — changes payload", () => {
  it("returns an empty changes array when no items exist", async () => {
    const { ctx } = makeCtx({
      user,
      list: { _id: listId, storeName: "Tesco", normalizedStoreId: "tesco" },
      items: [],
    });
    const res = await handler(ctx, { listId });
    expect(res.updated).toBe(0);
    expect(res.total).toBe(0);
    expect(res.changes).toEqual([]);
  });

  it("returns an empty changes array when every item is checked or priceOverride", async () => {
    const { ctx } = makeCtx({
      user,
      list: { _id: listId, storeName: "Tesco", normalizedStoreId: "tesco" },
      items: [
        { _id: "i1", name: "Milk", isChecked: true, estimatedPrice: 1.5 },
        { _id: "i2", name: "Eggs", isChecked: false, priceOverride: true, estimatedPrice: 2.0 },
      ],
    });
    const res = await handler(ctx, { listId });
    expect(res.updated).toBe(0);
    expect(res.total).toBe(2);
    expect(res.changes).toEqual([]);
  });

  it("collects {name, oldPrice, newPrice} for every item whose price actually changed", async () => {
    // priceHistory has a newer personal price for Milk → triggers an update.
    // Eggs has matching personal price → no update.
    const priceHistory: Row[] = [
      {
        _id: "ph1",
        userId: "user_1",
        normalizedName: "milk",
        unitPrice: 1.1,
        purchaseDate: Date.now(),
      },
      {
        _id: "ph2",
        userId: "user_1",
        normalizedName: "eggs",
        unitPrice: 2.0,
        purchaseDate: Date.now(),
      },
    ];

    const { ctx } = makeCtx({
      user,
      list: { _id: listId, storeName: "Tesco", normalizedStoreId: "tesco" },
      items: [
        { _id: "i1", name: "Milk", isChecked: false, estimatedPrice: 1.5, category: "Dairy" },
        { _id: "i2", name: "Eggs", isChecked: false, estimatedPrice: 2.0, category: "Dairy" },
      ],
      priceHistory,
    });

    const res = await handler(ctx, { listId });

    expect(res.total).toBe(2);
    expect(res.updated).toBe(1);
    expect(res.changes).toHaveLength(1);
    expect(res.changes[0]).toEqual({ name: "Milk", oldPrice: 1.5, newPrice: 1.1 });
  });

  it("uses layer-2 crowdsourced prices when personal history misses", async () => {
    // Personal history is empty. currentPrices contains a Tesco match for
    // "Milk" at £1.05 — Layer 2 should fire and produce a change row.
    const currentPrices: Row[] = [
      {
        _id: "cp1",
        normalizedName: "milk",
        storeName: "Tesco",
        unitPrice: 1.05,
        region: "E1",
        confidence: 0.75,
      },
    ];

    const { ctx } = makeCtx({
      user,
      list: { _id: listId, storeName: "Tesco", normalizedStoreId: "tesco" },
      items: [
        { _id: "i1", name: "Milk", isChecked: false, estimatedPrice: 1.5, category: "Dairy" },
      ],
      currentPrices,
    });

    const res = await handler(ctx, { listId });

    expect(res.updated).toBe(1);
    expect(res.changes).toEqual([
      { name: "Milk", oldPrice: 1.5, newPrice: 1.05 },
    ]);
  });

  it("falls back to layer-3 emergency estimate when layers 1+2 miss and price is stale AI", async () => {
    // No personal history, no crowdsourced price. Existing price is AI
    // (priceSource === "ai"), so the zero-blank-price policy fires Layer 3
    // and the emergency estimate mock returns 0.99.
    const { ctx } = makeCtx({
      user,
      list: { _id: listId, storeName: "Tesco", normalizedStoreId: "tesco" },
      items: [
        {
          _id: "i1",
          name: "Something",
          isChecked: false,
          estimatedPrice: 2.5,
          priceSource: "ai",
          category: "Other",
        },
      ],
    });

    const res = await handler(ctx, { listId });

    expect(res.updated).toBe(1);
    expect(res.changes).toEqual([
      { name: "Something", oldPrice: 2.5, newPrice: 0.99 },
    ]);
  });

  it("skips items whose new price equals the existing one (no-op)", async () => {
    // Personal history matches existing estimatedPrice → no change row.
    const priceHistory: Row[] = [
      {
        _id: "ph1",
        userId: "user_1",
        normalizedName: "tea",
        unitPrice: 2.5,
        purchaseDate: Date.now(),
      },
    ];

    const { ctx } = makeCtx({
      user,
      list: { _id: listId, storeName: "Tesco", normalizedStoreId: "tesco" },
      items: [
        { _id: "i1", name: "Tea", isChecked: false, estimatedPrice: 2.5, category: "Drinks" },
      ],
      priceHistory,
    });

    const res = await handler(ctx, { listId });

    expect(res.updated).toBe(0);
    expect(res.changes).toEqual([]);
  });

  it("records undefined oldPrice when an item had no prior estimate", async () => {
    const priceHistory: Row[] = [
      {
        _id: "ph1",
        userId: "user_1",
        normalizedName: "bread",
        unitPrice: 1.2,
        purchaseDate: Date.now(),
      },
    ];

    const { ctx } = makeCtx({
      user,
      list: { _id: listId, storeName: "Tesco", normalizedStoreId: "tesco" },
      items: [
        // estimatedPrice omitted → undefined
        { _id: "i1", name: "Bread", isChecked: false, category: "Bakery" },
      ],
      priceHistory,
    });

    const res = await handler(ctx, { listId });

    expect(res.updated).toBe(1);
    expect(res.changes).toHaveLength(1);
    expect(res.changes[0]).toEqual({
      name: "Bread",
      oldPrice: undefined,
      newPrice: 1.2,
    });
  });
});
