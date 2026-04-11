/**
 * FlashInsightBanner — pure helpers and shared types.
 *
 * Kept in a sibling module so the component file stays under the 400-line
 * project budget and so the dwell-duration math is easy to unit-test
 * without pulling in react-native / reanimated.
 */

import type { MaterialCommunityIcons } from "@expo/vector-icons";

import { colors } from "@/components/ui/glass";

// ─────────────────────────────────────────────────────────────────────────────
// Timing
// ─────────────────────────────────────────────────────────────────────────────

export const FLASH_TIMING = {
  enter: 520,
  contentFadeDuration: 360,
  contentFadeDelay: 180,
  baseDwell: 3800,
  perDetailDwell: 800,
  maxDwell: 14000,
  exit: 320,
  replaceFadeOut: 200,
} as const;

// Initial shared-value state — referenced from the component to reset
// transforms between flashes so replacements feel like a fresh entry.
// Typed as plain `number` (not `as const`) so these values can be assigned
// back onto shared values which expect `number`, not the literal type.
export const FLASH_INITIAL: {
  cardOpacity: number;
  cardTranslateY: number;
  cardScale: number;
  contentOpacity: number;
  iconScale: number;
} = {
  cardOpacity: 0,
  cardTranslateY: -12,
  cardScale: 0.96,
  contentOpacity: 0,
  iconScale: 0.4,
};

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type FlashTone = "success" | "info" | "error";

/**
 * Optional per-row detail rendered below the body text. Pre-formatted strings
 * keep the banner agnostic of currency/units — the caller formats values.
 * `trend` colors the value:
 *   - "down" → success (cheaper)
 *   - "up"   → warning (pricier)
 *   - undefined/"neutral" → tertiary text
 */
export interface FlashDetail {
  label: string;
  value: string;
  trend?: "up" | "down" | "neutral";
}

export interface FlashMessage {
  /** Stable identifier — changing the id resets the animation cycle. */
  id: string;
  title: string;
  body: string;
  /** MaterialCommunityIcons glyph. Defaults to tone-appropriate icon. */
  icon?: keyof typeof MaterialCommunityIcons.glyphMap;
  /** Visual tone. Defaults to "success". */
  tone?: FlashTone;
  /** Optional itemised rows shown below the body. */
  details?: FlashDetail[];
  /** Override auto-computed dwell duration (ms). */
  dwellMs?: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

export function resolveFlashTone(
  tone: FlashTone,
): { color: string; defaultIcon: keyof typeof MaterialCommunityIcons.glyphMap } {
  switch (tone) {
    case "error":
      // Soft coral-red (#FF6B6B) — readable on dark bg. The previous
      // version mapped error → warning amber, which was semantically
      // wrong and confused the test description.
      return { color: colors.accent.error, defaultIcon: "alert-circle-outline" };
    case "info":
      return { color: colors.accent.warm, defaultIcon: "information-outline" };
    case "success":
    default:
      return { color: colors.accent.success, defaultIcon: "check-circle-outline" };
  }
}

/**
 * Dwell duration scales with content volume so users have time to read
 * every detail row. An explicit `dwellMs` on the message always wins.
 */
export function computeDwellDuration(message: FlashMessage): number {
  if (typeof message.dwellMs === "number") return message.dwellMs;
  const details = message.details?.length ?? 0;
  if (details === 0) return FLASH_TIMING.baseDwell;
  return Math.min(
    FLASH_TIMING.baseDwell + details * FLASH_TIMING.perDetailDwell,
    FLASH_TIMING.maxDwell,
  );
}

export function flashTrendColor(trend: FlashDetail["trend"]): string {
  if (trend === "down") return colors.accent.success;
  if (trend === "up") return colors.accent.warning;
  return colors.text.tertiary;
}
