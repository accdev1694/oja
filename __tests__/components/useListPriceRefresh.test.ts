/**
 * Unit tests for the pure formatting helpers AND the branching logic in
 * `useListPriceRefresh`. The hook is exercised by calling the returned
 * `handleRefreshPrices` callback directly with a mocked mutation and flash
 * sink — React state transitions are not under test here.
 */

// safeHaptics pulls in AsyncStorage + expo-haptics at import time — stub it.
jest.mock("@/lib/haptics/safeHaptics", () => ({
  haptic: jest.fn(),
}));

jest.mock("@/components/ui/FlashInsightBanner", () => ({}));

import { act, renderHook } from "@testing-library/react-native";
import type { Id } from "@/convex/_generated/dataModel";
import {
  formatGBP,
  priceChangeToDetail,
  useListPriceRefresh,
} from "../../hooks/useListPriceRefresh";
import type { FlashMessage } from "@/components/ui/flashInsight";

describe("useListPriceRefresh helpers", () => {
  describe("formatGBP", () => {
    it("formats whole pounds with two decimals", () => {
      expect(formatGBP(1)).toBe("£1.00");
      expect(formatGBP(10)).toBe("£10.00");
    });

    it("rounds to two decimals", () => {
      expect(formatGBP(1.259)).toBe("£1.26");
      expect(formatGBP(0.005)).toMatch(/£0\.0[01]/); // rounding edge
    });

    it("renders an em-dash for undefined / null / NaN", () => {
      expect(formatGBP(undefined)).toBe("—");
      // @ts-expect-error — intentional null runtime check
      expect(formatGBP(null)).toBe("—");
      expect(formatGBP(NaN)).toBe("—");
    });

    it("handles zero as £0.00 (not dash)", () => {
      expect(formatGBP(0)).toBe("£0.00");
    });
  });

  describe("priceChangeToDetail", () => {
    it("marks a price drop as 'down' (cheaper)", () => {
      const d = priceChangeToDetail({ name: "Milk", oldPrice: 1.5, newPrice: 1.1 });
      expect(d).toEqual({
        label: "Milk",
        value: "£1.50 → £1.10",
        trend: "down",
      });
    });

    it("marks a price rise as 'up' (pricier)", () => {
      const d = priceChangeToDetail({ name: "Eggs", oldPrice: 2.0, newPrice: 2.3 });
      expect(d.trend).toBe("up");
      expect(d.value).toBe("£2.00 → £2.30");
    });

    it("treats a missing old price as neutral fill", () => {
      const d = priceChangeToDetail({ name: "Bread", newPrice: 1.2 });
      expect(d.trend).toBe("neutral");
      expect(d.value).toBe("— → £1.20");
    });

    it("treats an identical old and new price as neutral", () => {
      const d = priceChangeToDetail({ name: "Tea", oldPrice: 2.5, newPrice: 2.5 });
      expect(d.trend).toBe("neutral");
    });

    it("preserves the item name verbatim in the label", () => {
      const d = priceChangeToDetail({
        name: "500ml Semi-skimmed Milk",
        oldPrice: 1.25,
        newPrice: 1.15,
      });
      expect(d.label).toBe("500ml Semi-skimmed Milk");
    });
  });

  // ───────────────────────────────────────────────────────────────────────
  // Hook — handleRefreshPrices branching
  // ───────────────────────────────────────────────────────────────────────
  describe("handleRefreshPrices branching", () => {
    const listId = "list_1" as Id<"shoppingLists">;

    function setup(result: {
      updated: number;
      total: number;
      changes: { name: string; oldPrice?: number; newPrice: number }[];
    }) {
      const refreshPrices = jest.fn().mockResolvedValue(result);
      const onFlash = jest.fn();
      const { result: hook } = renderHook(() =>
        useListPriceRefresh(refreshPrices, listId, onFlash),
      );
      return { hook, refreshPrices, onFlash };
    }

    it("emits a 'Nothing to refresh' info flash when the list is empty", async () => {
      const { hook, onFlash } = setup({ updated: 0, total: 0, changes: [] });
      await act(async () => {
        await hook.current.handleRefreshPrices();
      });

      expect(onFlash).toHaveBeenCalledTimes(1);
      const msg = onFlash.mock.calls[0][0] as FlashMessage;
      expect(msg.tone).toBe("info");
      expect(msg.title).toBe("Nothing to refresh");
      expect(msg.details).toBeUndefined();
    });

    it("emits a 'Prices already up to date' info flash when nothing changed", async () => {
      const { hook, onFlash } = setup({ updated: 0, total: 5, changes: [] });
      await act(async () => {
        await hook.current.handleRefreshPrices();
      });

      expect(onFlash).toHaveBeenCalledTimes(1);
      const msg = onFlash.mock.calls[0][0] as FlashMessage;
      expect(msg.tone).toBe("info");
      expect(msg.title).toBe("Prices already up to date");
      expect(msg.body).toContain("5 items");
      expect(msg.details).toBeUndefined();
    });

    it("emits a success flash with details[] when prices change", async () => {
      const { hook, onFlash } = setup({
        updated: 2,
        total: 3,
        changes: [
          { name: "Milk", oldPrice: 1.5, newPrice: 1.1 },
          { name: "Bread", newPrice: 1.2 }, // no prior price
        ],
      });
      await act(async () => {
        await hook.current.handleRefreshPrices();
      });

      expect(onFlash).toHaveBeenCalledTimes(1);
      const msg = onFlash.mock.calls[0][0] as FlashMessage;
      expect(msg.tone).toBe("success");
      expect(msg.title).toBe("Prices refreshed");
      expect(msg.body).toContain("2 of 3");
      expect(msg.details).toEqual([
        { label: "Milk", value: "£1.50 → £1.10", trend: "down" },
        { label: "Bread", value: "— → £1.20", trend: "neutral" },
      ]);
    });

    it("emits an error flash if the mutation throws", async () => {
      const refreshPrices = jest.fn().mockRejectedValue(new Error("boom"));
      const onFlash = jest.fn();
      const { result: hook } = renderHook(() =>
        useListPriceRefresh(refreshPrices, listId, onFlash),
      );

      // console.error is called on failure — silence it for clean output
      const errSpy = jest.spyOn(console, "error").mockImplementation(() => {});

      await act(async () => {
        await hook.current.handleRefreshPrices();
      });

      expect(onFlash).toHaveBeenCalledTimes(1);
      const msg = onFlash.mock.calls[0][0] as FlashMessage;
      expect(msg.tone).toBe("error");
      expect(msg.title).toBe("Couldn't refresh prices");

      errSpy.mockRestore();
    });

    it("generates a unique id for every flash (monotonic counter)", async () => {
      const { hook, onFlash } = setup({
        updated: 1,
        total: 1,
        changes: [{ name: "Tea", oldPrice: 2.5, newPrice: 2.0 }],
      });
      await act(async () => {
        await hook.current.handleRefreshPrices();
      });
      await act(async () => {
        await hook.current.handleRefreshPrices();
      });

      expect(onFlash).toHaveBeenCalledTimes(2);
      const id1 = (onFlash.mock.calls[0][0] as FlashMessage).id;
      const id2 = (onFlash.mock.calls[1][0] as FlashMessage).id;
      expect(id1).not.toBe(id2);
    });
  });
});
