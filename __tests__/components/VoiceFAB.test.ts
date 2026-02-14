/**
 * Tests for VoiceFAB drag bounds logic
 *
 * Validates that the floating Tobi button can be dragged freely across the
 * full vertical range — from just below the top status bar all the way down
 * to just above the bottom tab bar — on a variety of screen sizes.
 *
 * The component uses onLayout to measure its actual container rather than
 * relying on useWindowDimensions(). These tests mirror that clamping,
 * snapping, and position-restore logic as pure functions.
 */

// ---------------------------------------------------------------------------
// Constants (mirrored from VoiceFAB.tsx + GlassTabBar.tsx + glassTokens.ts)
// ---------------------------------------------------------------------------

const FAB_SIZE = 52;
const TAB_BAR_HEIGHT = 80;
const HEADER_HEIGHT = 56;
const SPACING_MD = 12;

// ---------------------------------------------------------------------------
// Logic mirrors — pure functions that replicate VoiceFAB's worklet math
// ---------------------------------------------------------------------------

interface LayoutConfig {
  /** Measured container width (from onLayout) */
  containerWidth: number;
  /** Measured container height (from onLayout) */
  containerHeight: number;
  /** Safe area inset at the top (status bar / notch) */
  insetsTop: number;
  /** Safe area inset at the bottom (navigation bar / gesture area) */
  insetsBottom: number;
}

/** Compute the draggable bounds from a measured layout + insets. */
function computeBounds(config: LayoutConfig) {
  const minX = 0;
  const maxX = config.containerWidth - FAB_SIZE;
  const minY = config.insetsTop + HEADER_HEIGHT;
  const maxY = config.containerHeight - TAB_BAR_HEIGHT - FAB_SIZE - config.insetsBottom;
  const midX = config.containerWidth / 2;
  const snapLeft = SPACING_MD;
  const snapRight = maxX - SPACING_MD;
  return { minX, maxX, minY, maxY, midX, snapLeft, snapRight };
}

/** Compute the default resting position (right edge, just above tab bar). */
function computeDefaultPosition(config: LayoutConfig) {
  const { maxX, maxY } = computeBounds(config);
  return {
    x: maxX - SPACING_MD,
    y: maxY - SPACING_MD,
  };
}

/**
 * Simulate an onUpdate callback from the pan gesture.
 * Takes the starting context position + finger translation → clamped result.
 */
function simulateDrag(
  config: LayoutConfig,
  contextX: number,
  contextY: number,
  translationX: number,
  translationY: number
) {
  const { minX, maxX, minY, maxY } = computeBounds(config);
  const newX = contextX + translationX;
  const newY = contextY + translationY;
  return {
    x: Math.max(minX, Math.min(newX, maxX)),
    y: Math.max(minY, Math.min(newY, maxY)),
  };
}

/** Simulate the edge-snap that fires in onEnd. */
function simulateSnap(config: LayoutConfig, currentX: number) {
  const { midX, snapLeft, snapRight } = computeBounds(config);
  return currentX < midX ? snapLeft : snapRight;
}

/** Simulate restoring a saved position (with clamping). */
function simulateRestore(
  config: LayoutConfig,
  savedX: number,
  savedY: number
) {
  const { minX, maxX, minY, maxY } = computeBounds(config);
  return {
    x: Math.max(minX, Math.min(savedX, maxX)),
    y: Math.max(minY, Math.min(savedY, maxY)),
  };
}

// ---------------------------------------------------------------------------
// Device presets — representative Android phones
// The container fills the parent <View style={{ flex: 1 }}> which is the
// full window. containerWidth/Height come from onLayout, not Dimensions API.
// ---------------------------------------------------------------------------

const DEVICES: Record<string, LayoutConfig> = {
  /** Pixel 7 — typical modern Android, gesture navigation */
  pixel7: { containerWidth: 412, containerHeight: 892, insetsTop: 48, insetsBottom: 34 },
  /** Samsung S24 — tall narrow display */
  samsungS24: { containerWidth: 384, containerHeight: 854, insetsTop: 40, insetsBottom: 30 },
  /** Small / budget phone, 3-button nav (no bottom inset) */
  smallPhone: { containerWidth: 360, containerHeight: 640, insetsTop: 24, insetsBottom: 0 },
  /** Tablet-ish phablet */
  phablet: { containerWidth: 480, containerHeight: 1024, insetsTop: 52, insetsBottom: 48 },
  /** Pixel Fold (outer) — wide with large insets */
  pixelFold: { containerWidth: 382, containerHeight: 708, insetsTop: 56, insetsBottom: 40 },
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("VoiceFAB drag bounds", () => {
  // =========================================================================
  // Vertical range — the critical fix under test
  // =========================================================================
  describe("Full vertical range", () => {
    it.each(Object.entries(DEVICES))(
      "%s — FAB can reach just below status bar (minY)",
      (_name, config) => {
        const start = computeDefaultPosition(config);
        // Drag a huge distance upward from default position
        const result = simulateDrag(config, start.x, start.y, 0, -2000);
        expect(result.y).toBe(config.insetsTop + HEADER_HEIGHT);
      }
    );

    it.each(Object.entries(DEVICES))(
      "%s — FAB can reach just above tab bar (maxY)",
      (_name, config) => {
        const { maxY } = computeBounds(config);
        // Start near top, drag a huge distance downward
        const result = simulateDrag(config, 0, config.insetsTop, 0, 2000);
        expect(result.y).toBe(maxY);
        // maxY must be well past the midpoint of the screen
        expect(maxY).toBeGreaterThan(config.containerHeight / 2);
      }
    );

    it.each(Object.entries(DEVICES))(
      "%s — FAB can reach the exact vertical midpoint",
      (_name, config) => {
        const midY = Math.round(config.containerHeight / 2);
        const start = computeDefaultPosition(config);
        const result = simulateDrag(config, start.x, start.y, 0, midY - start.y);
        expect(result.y).toBe(midY);
      }
    );

    it.each(Object.entries(DEVICES))(
      "%s — usable vertical range covers > 55%% of container height",
      (_name, config) => {
        const { minY, maxY } = computeBounds(config);
        const range = maxY - minY;
        const coverage = range / config.containerHeight;
        expect(coverage).toBeGreaterThan(0.55);
      }
    );
  });

  // =========================================================================
  // Horizontal range
  // =========================================================================
  describe("Full horizontal range", () => {
    it.each(Object.entries(DEVICES))(
      "%s — FAB can reach left edge (x = 0)",
      (_name, config) => {
        const start = computeDefaultPosition(config);
        const result = simulateDrag(config, start.x, start.y, -2000, 0);
        expect(result.x).toBe(0);
      }
    );

    it.each(Object.entries(DEVICES))(
      "%s — FAB can reach right edge (x = containerWidth - FAB_SIZE)",
      (_name, config) => {
        const { maxX } = computeBounds(config);
        const result = simulateDrag(config, 0, config.insetsTop, 2000, 0);
        expect(result.x).toBe(maxX);
      }
    );
  });

  // =========================================================================
  // Boundary clamping — cannot escape the valid area
  // =========================================================================
  describe("Boundary clamping", () => {
    const config = DEVICES.pixel7;

    it("cannot go above status bar", () => {
      const result = simulateDrag(config, 200, config.insetsTop, 0, -500);
      expect(result.y).toBe(config.insetsTop + HEADER_HEIGHT);
    });

    it("cannot go below tab bar", () => {
      const { maxY } = computeBounds(config);
      const result = simulateDrag(config, 200, maxY, 0, 500);
      expect(result.y).toBe(maxY);
    });

    it("cannot go past left edge", () => {
      const result = simulateDrag(config, 0, 400, -500, 0);
      expect(result.x).toBe(0);
    });

    it("cannot go past right edge", () => {
      const { maxX } = computeBounds(config);
      const result = simulateDrag(config, maxX, 400, 500, 0);
      expect(result.x).toBe(maxX);
    });

    it("diagonal drag to top-left corner clamps both axes", () => {
      const result = simulateDrag(config, 200, 400, -2000, -2000);
      expect(result.x).toBe(0);
      expect(result.y).toBe(config.insetsTop + HEADER_HEIGHT);
    });

    it("diagonal drag to bottom-right corner clamps both axes", () => {
      const { maxX, maxY } = computeBounds(config);
      const result = simulateDrag(config, 200, 400, 2000, 2000);
      expect(result.x).toBe(maxX);
      expect(result.y).toBe(maxY);
    });
  });

  // =========================================================================
  // Edge snapping
  // =========================================================================
  describe("Horizontal edge snapping", () => {
    const config = DEVICES.pixel7;

    it("snaps to left edge when released on left half", () => {
      const { snapLeft } = computeBounds(config);
      const snapped = simulateSnap(config, config.containerWidth / 2 - 1);
      expect(snapped).toBe(snapLeft);
    });

    it("snaps to right edge when released on right half", () => {
      const { snapRight } = computeBounds(config);
      const snapped = simulateSnap(config, config.containerWidth / 2);
      expect(snapped).toBe(snapRight);
    });

    it("snap positions have proper margin from screen edges", () => {
      const { snapLeft, snapRight, maxX } = computeBounds(config);
      expect(snapLeft).toBe(SPACING_MD);
      expect(snapRight).toBe(maxX - SPACING_MD);
    });
  });

  // =========================================================================
  // Default position
  // =========================================================================
  describe("Default position", () => {
    it.each(Object.entries(DEVICES))(
      "%s — default position is within valid bounds",
      (_name, config) => {
        const pos = computeDefaultPosition(config);
        const { minX, maxX, minY, maxY } = computeBounds(config);
        expect(pos.x).toBeGreaterThanOrEqual(minX);
        expect(pos.x).toBeLessThanOrEqual(maxX);
        expect(pos.y).toBeGreaterThanOrEqual(minY);
        expect(pos.y).toBeLessThanOrEqual(maxY);
      }
    );

    it.each(Object.entries(DEVICES))(
      "%s — default position is in bottom-right area",
      (_name, config) => {
        const pos = computeDefaultPosition(config);
        expect(pos.x).toBeGreaterThan(config.containerWidth / 2);
        expect(pos.y).toBeGreaterThan(config.containerHeight * 0.6);
      }
    );
  });

  // =========================================================================
  // Saved position restoration
  // =========================================================================
  describe("Saved position restoration", () => {
    const config = DEVICES.pixel7;

    it("restores a valid saved position unchanged", () => {
      const saved = { x: 100, y: 300 };
      const restored = simulateRestore(config, saved.x, saved.y);
      expect(restored).toEqual(saved);
    });

    it("clamps a saved position that is above the screen", () => {
      const restored = simulateRestore(config, 100, -50);
      expect(restored.y).toBe(config.insetsTop + HEADER_HEIGHT);
    });

    it("clamps a saved position that is below the screen", () => {
      const { maxY } = computeBounds(config);
      const restored = simulateRestore(config, 100, 9999);
      expect(restored.y).toBe(maxY);
    });

    it("clamps a saved position from a larger screen to a smaller one", () => {
      const small = DEVICES.smallPhone;
      const phablet = DEVICES.phablet;
      const savedOnPhablet = computeDefaultPosition(phablet);
      const restored = simulateRestore(small, savedOnPhablet.x, savedOnPhablet.y);
      const { maxX, maxY } = computeBounds(small);
      expect(restored.x).toBeLessThanOrEqual(maxX);
      expect(restored.y).toBeLessThanOrEqual(maxY);
    });

    it("clamps negative saved positions to zero / insetsTop", () => {
      const restored = simulateRestore(config, -100, -100);
      expect(restored.x).toBe(0);
      expect(restored.y).toBe(config.insetsTop + HEADER_HEIGHT);
    });
  });

  // =========================================================================
  // Multi-step drag simulation (drag journey from top to bottom and back)
  // =========================================================================
  describe("Multi-step drag journey", () => {
    const config = DEVICES.pixel7;

    it("can drag from default position to top, then back to bottom", () => {
      const { minY, maxY } = computeBounds(config);
      const start = computeDefaultPosition(config);

      // Step 1: drag from default to top
      const atTop = simulateDrag(config, start.x, start.y, 0, -2000);
      expect(atTop.y).toBe(minY);

      // Step 2: drag from top to bottom
      const atBottom = simulateDrag(config, atTop.x, atTop.y, 0, 2000);
      expect(atBottom.y).toBe(maxY);

      // Step 3: drag to exact midpoint
      const midY = Math.round((minY + maxY) / 2);
      const atMid = simulateDrag(config, atBottom.x, atBottom.y, 0, midY - atBottom.y);
      expect(atMid.y).toBe(midY);
    });

    it("can drag in a diagonal sweep across the entire screen", () => {
      const { minX, maxX, minY, maxY } = computeBounds(config);

      // Top-left corner
      const topLeft = simulateDrag(config, 200, 400, -2000, -2000);
      expect(topLeft).toEqual({ x: minX, y: minY });

      // Bottom-right corner
      const bottomRight = simulateDrag(config, topLeft.x, topLeft.y, 2000, 2000);
      expect(bottomRight).toEqual({ x: maxX, y: maxY });
    });
  });

  // =========================================================================
  // Regression: maxY must always be past screen midpoint
  // =========================================================================
  describe("Regression: maxY past midpoint", () => {
    it("on every device, maxY is at least 60% of container height", () => {
      for (const [_name, config] of Object.entries(DEVICES)) {
        const { maxY } = computeBounds(config);
        const ratio = maxY / config.containerHeight;
        expect(ratio).toBeGreaterThanOrEqual(0.6);
      }
    });

    it("bounds are derived from container size, not screen dimensions API", () => {
      // Simulate the scenario that caused the original bug:
      // useWindowDimensions() returned a small height, but the actual
      // container (measured via onLayout) is the full window.
      const wrongDimensions: LayoutConfig = {
        containerWidth: 412,
        containerHeight: 400, // hypothetical bad value from Dimensions API
        insetsTop: 48,
        insetsBottom: 34,
      };
      const realLayout: LayoutConfig = {
        containerWidth: 412,
        containerHeight: 892, // actual measured container
        insetsTop: 48,
        insetsBottom: 34,
      };

      const wrongMaxY = computeBounds(wrongDimensions).maxY;
      const realMaxY = computeBounds(realLayout).maxY;

      // With the wrong value, FAB can't reach the midpoint
      expect(wrongMaxY).toBeLessThan(400);
      // With the real layout, it can
      expect(realMaxY).toBeGreaterThan(892 / 2);
      // The difference is dramatic
      expect(realMaxY - wrongMaxY).toBeGreaterThan(400);
    });
  });
});
