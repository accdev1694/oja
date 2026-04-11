// Mock @expo/vector-icons and glass tokens so flashInsight.ts can import
// colors without the full RN runtime.
jest.mock("@expo/vector-icons", () => ({
  MaterialCommunityIcons: "MaterialCommunityIcons",
}));

jest.mock("@/components/ui/glass", () => ({
  colors: {
    accent: {
      success: "#10B981",
      warning: "#F59E0B",
      warm: "#FFB088",
      error: "#FF6B6B",
    },
    text: { tertiary: "rgba(255,255,255,0.65)" },
  },
}));

import {
  FLASH_TIMING,
  computeDwellDuration,
  flashTrendColor,
  resolveFlashTone,
  type FlashMessage,
} from "../../components/ui/flashInsight";

const baseMessage: FlashMessage = {
  id: "m",
  title: "Prices refreshed",
  body: "All good",
};

describe("flashInsight helpers", () => {
  describe("computeDwellDuration", () => {
    it("returns base dwell when no details are present", () => {
      expect(computeDwellDuration(baseMessage)).toBe(FLASH_TIMING.baseDwell);
    });

    it("adds per-detail dwell for each item", () => {
      const msg: FlashMessage = {
        ...baseMessage,
        details: [
          { label: "Milk", value: "£1.25 → £1.10" },
          { label: "Eggs", value: "£2.00 → £1.80" },
          { label: "Bread", value: "£1.50 → £1.40" },
        ],
      };
      expect(computeDwellDuration(msg)).toBe(
        FLASH_TIMING.baseDwell + 3 * FLASH_TIMING.perDetailDwell,
      );
    });

    it("caps dwell duration at maxDwell even for long lists", () => {
      const details = Array.from({ length: 50 }, (_, i) => ({
        label: `Item ${i}`,
        value: "£1.00 → £0.90",
      }));
      const msg: FlashMessage = { ...baseMessage, details };
      expect(computeDwellDuration(msg)).toBe(FLASH_TIMING.maxDwell);
    });

    it("honours an explicit dwellMs override", () => {
      const msg: FlashMessage = { ...baseMessage, dwellMs: 7000 };
      expect(computeDwellDuration(msg)).toBe(7000);
    });

    it("override wins even when details would scale higher", () => {
      const msg: FlashMessage = {
        ...baseMessage,
        dwellMs: 1000,
        details: Array.from({ length: 20 }, (_, i) => ({
          label: `Item ${i}`,
          value: "£1 → £0.90",
        })),
      };
      expect(computeDwellDuration(msg)).toBe(1000);
    });

    it("honours dwellMs: 0 as 'exit immediately' (not treated as falsy)", () => {
      // The typeof check guards against `0` being swallowed as a falsy
      // override and accidentally falling through to the base dwell.
      const msg: FlashMessage = { ...baseMessage, dwellMs: 0 };
      expect(computeDwellDuration(msg)).toBe(0);
    });
  });

  describe("flashTrendColor", () => {
    it("returns success color for cheaper (down)", () => {
      expect(flashTrendColor("down")).toBe("#10B981");
    });

    it("returns warning color for pricier (up)", () => {
      expect(flashTrendColor("up")).toBe("#F59E0B");
    });

    it("returns tertiary text for neutral / undefined", () => {
      expect(flashTrendColor("neutral")).toBe("rgba(255,255,255,0.65)");
      expect(flashTrendColor(undefined)).toBe("rgba(255,255,255,0.65)");
    });
  });

  describe("resolveFlashTone", () => {
    it("maps success tone to success color + check icon", () => {
      const { color, defaultIcon } = resolveFlashTone("success");
      expect(color).toBe("#10B981");
      expect(defaultIcon).toBe("check-circle-outline");
    });

    it("maps info tone to warm color + info icon", () => {
      const { color, defaultIcon } = resolveFlashTone("info");
      expect(color).toBe("#FFB088");
      expect(defaultIcon).toBe("information-outline");
    });

    it("maps error tone to the soft coral-red error color + alert icon", () => {
      const { color, defaultIcon } = resolveFlashTone("error");
      expect(color).toBe("#FF6B6B");
      expect(defaultIcon).toBe("alert-circle-outline");
    });
  });
});
