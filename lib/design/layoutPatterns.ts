/**
 * Layout Patterns — Reusable layout rules for consistent UI structure.
 *
 * Imported by components to enforce layout conventions app-wide.
 * Lives alongside glassTokens.ts in the design system.
 *
 * ═══════════════════════════════════════════════════════════════
 * HEADER 2-ROW RULE
 * ═══════════════════════════════════════════════════════════════
 *
 * All headers are limited to exactly 2 rows:
 *
 *  ┌─────────────────────────────────────────────────────────┐
 *  │ ROW 1: [Back?] [Title ────────────────────────────────] │
 *  ├─────────────────────────────────────────────────────────┤
 *  │ ROW 2: [Left Container] ← space-between → [Right Cont] │
 *  │         (subtitle info)                  (action icons) │
 *  └─────────────────────────────────────────────────────────┘
 *
 * Row 1 (Top):
 *  - Only contains: back button (optional) + title (flex: 1)
 *  - Title never shares this row with action buttons or icons
 *  - Title is left-aligned immediately after the back button
 *  - Consistent position whether back button is present or not
 *  - flex: 1 lets the title fill remaining width (never truncated)
 *
 * Row 2 (Bottom):
 *  - Outer container: space-between, holds two inner containers
 *  - Left container: subtitle metadata (flex row, shrinks if needed)
 *  - Right container: action icons/buttons (flex row)
 *  - Vertically centered for consistent cross-element alignment
 *  - Only rendered when there is content (subtitle or actions)
 *
 * ═══════════════════════════════════════════════════════════════
 */

import { StyleSheet } from "react-native";
import { spacing } from "./glassTokens";

// =============================================================================
// HEADER LAYOUT
// =============================================================================

export const headerLayout = StyleSheet.create({
  /** Row 1: back button (optional) + title (flex: 1, left-aligned) */
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },

  /** Row 2 outer: left and right containers pushed to opposite ends */
  bottomRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 2,
    gap: spacing.sm,
  },

  /** Row 2 left: subtitle metadata */
  bottomRowLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    flexShrink: 1,
  },

  /** Row 2 right: action icons/buttons */
  bottomRowRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
});
