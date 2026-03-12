import { StyleSheet } from "react-native";
import { colors, typography, spacing, borderRadius } from "@/components/ui/glass";

export const styles = StyleSheet.create({
  header: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  title: {
    ...typography.displaySmall,
    color: colors.text.primary,
    marginBottom: 4,
  },
  subtitle: {
    ...typography.bodyMedium,
    color: colors.text.secondary,
    marginBottom: spacing.md,
  },
  chipRow: {
    flexDirection: "row",
    gap: spacing.sm,
    flexWrap: "wrap",
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderWidth: 1,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  chipText: {
    ...typography.labelSmall,
    fontWeight: "600",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  // -- Source section (Local / Cultural) --
  sourceSection: {
    marginBottom: spacing.xl,
  },
  sourceHeader: {
    flexDirection: "row",
    alignItems: "center",
    borderLeftWidth: 3,
    paddingLeft: spacing.md,
    paddingVertical: spacing.sm,
    marginBottom: spacing.md,
  },
  sourceIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginRight: spacing.sm,
  },
  sourceHeaderText: {
    flex: 1,
  },
  sourceTitle: {
    ...typography.headlineSmall,
    color: colors.text.primary,
  },
  sourceSubtitle: {
    ...typography.bodySmall,
    color: colors.text.tertiary,
    marginTop: 1,
  },
  selectAllBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.glass.background,
    borderWidth: 1,
    borderColor: colors.glass.border,
    justifyContent: "center",
    alignItems: "center",
  },
  // -- Category subsection --
  categorySection: {
    marginBottom: spacing.md,
    marginLeft: spacing.md,
  },
  categoryHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  categoryDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: spacing.sm,
  },
  categoryTitle: {
    ...typography.labelMedium,
    color: colors.text.secondary,
    flex: 1,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  categoryCount: {
    ...typography.labelSmall,
    color: colors.text.tertiary,
  },
  // -- Item grid --
  itemGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  itemCard: {
    width: "30%",
    minWidth: 100,
    backgroundColor: colors.glass.background,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    borderWidth: 2,
    borderColor: colors.glass.border,
  },
  itemCardDeselected: {
    borderColor: colors.glass.border,
    opacity: 0.4,
  },
  itemContent: {
    position: "relative",
  },
  itemName: {
    ...typography.labelSmall,
    fontWeight: "600",
    color: colors.text.primary,
    paddingRight: 20,
  },
  itemNameDeselected: {
    color: colors.text.tertiary,
  },
  itemPrice: {
    ...typography.bodySmall,
    color: colors.text.secondary,
    marginTop: 2,
  },
  itemPriceDeselected: {
    color: colors.text.tertiary,
  },
  checkmark: {
    position: "absolute",
    top: -6,
    right: -6,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.glass.border,
  },
});
