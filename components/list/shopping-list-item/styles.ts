import { StyleSheet } from "react-native";
import { colors, typography, spacing, borderRadius } from "@/components/ui/glass";

export const styles = StyleSheet.create({
  // Swipe Container
  swipeContainer: {
    position: "relative",
    marginBottom: spacing.xs,
  },
  swipeAction: {
    position: "absolute",
    top: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
  },
  swipeActionLeft: {
    left: 0,
    backgroundColor: colors.semantic.success,
    borderRadius: borderRadius.lg,
  },
  swipeActionRight: {
    right: 0,
    backgroundColor: colors.text.tertiary,
    borderRadius: borderRadius.lg,
  },
  swipeActionText: {
    ...typography.labelSmall,
    color: "#fff",
    fontWeight: "600",
  },

  // Item Card
  itemCard: {
    // No marginBottom here, handled by swipeContainer
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  itemCardChecked: {
    opacity: 0.7,
  },
  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  itemDetailsColumn: {
    flex: 1,
    gap: 0,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  itemName: {
    ...typography.bodyMedium,
    color: colors.text.primary,
    flex: 1,
  },
  itemNameChecked: {
    textDecorationLine: "line-through",
    color: colors.text.tertiary,
  },
  failedIndicator: {
    marginLeft: spacing.xs,
    opacity: 0.9,
  },
  priceRowWithActions: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  priceInfo: {
    flexDirection: "row",
    alignItems: "center",
  },
  iconButton: {
    padding: spacing.xs,
  },
  itemQty: {
    ...typography.bodySmall,
    color: colors.text.tertiary,
  },
  itemQtyLabel: {
    ...typography.bodySmall,
    color: colors.text.tertiary,
  },
  bulletSeparator: {
    ...typography.bodySmall,
    color: colors.text.tertiary,
    marginHorizontal: 6,
  },
  itemPrice: {
    ...typography.bodySmall,
    color: colors.accent.primary,
    fontWeight: "800",
    marginLeft: 4,
    fontSize: 13,
  },
  itemPriceChecked: {
    color: colors.accent.primary,
    opacity: 0.7,
  },
  commentBadge: {
    position: "absolute",
    top: -4,
    right: -6,
    backgroundColor: colors.accent.primary,
    borderRadius: 7,
    minWidth: 14,
    height: 14,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 2,
  },
  commentBadgeText: {
    fontSize: 9,
    fontWeight: "700",
    color: "#fff",
    textAlign: "center",
  },
});
