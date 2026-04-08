import { StyleSheet } from "react-native";
import {
  colors,
  typography,
  spacing,
  borderRadius,
} from "@/components/ui/glass";

export const styles = StyleSheet.create({
  addItemCard: {
    marginBottom: spacing.lg,
  },
  addItemHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  addItemTitle: {
    ...typography.labelLarge,
    color: colors.text.primary,
  },
  addItemForm: {
    gap: spacing.sm,
  },
  nameInput: {
    flex: 1,
  },
  smallInputRow: {
    flexDirection: "row",
    gap: spacing.sm,
    alignItems: "center",
  },
  smallInput: {
    flex: 1,
  },
  addButton: {
    width: 48,
    paddingHorizontal: 0,
  },
  priceHint: {
    ...typography.bodySmall,
    color: colors.accent.primary,
    marginTop: 4,
    opacity: 0.8,
  },
  variantPickerContainer: {
    marginTop: spacing.sm,
  },
  notSureButton: {
    alignSelf: "flex-start",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.glass.border,
    borderStyle: "dashed" as const,
    opacity: 0.7,
    marginTop: spacing.xs,
  },
  notSureText: {
    ...typography.labelSmall,
    color: colors.text.primary,
    fontWeight: "600",
  },
  estimatingContainer: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  estimatingText: {
    ...typography.labelSmall,
    color: colors.text.tertiary,
    fontStyle: "italic" as const,
  },
  inlineSuggestionsContainer: {
    marginTop: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.glass.border,
  },
  suggestionsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  suggestionsHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  suggestionsTitle: {
    ...typography.labelLarge,
    color: colors.text.primary,
  },
  suggestionsSubtitle: {
    ...typography.labelSmall,
    color: colors.text.tertiary,
  },
  suggestionsHeaderRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  refreshButton: {
    width: 32,
    height: 32,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.glass.background,
    justifyContent: "center",
    alignItems: "center",
  },
  toggleSuggestionsButton: {
    width: 32,
    height: 32,
    borderRadius: borderRadius.lg,
    justifyContent: "center",
    alignItems: "center",
  },
  suggestionsContent: {
    marginTop: spacing.md,
  },
  suggestionsLoading: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    paddingVertical: spacing.md,
  },
  suggestionsLoadingText: {
    ...typography.bodySmall,
    color: colors.text.tertiary,
  },
  suggestionsList: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  suggestionChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: `${colors.accent.secondary}15`,
    borderRadius: borderRadius.full,
    paddingLeft: spacing.md,
    paddingRight: spacing.xs,
    paddingVertical: spacing.xs,
    gap: spacing.xs,
  },
  suggestionText: {
    ...typography.bodyMedium,
    color: colors.text.primary,
  },
  suggestionActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  suggestionAddButton: {
    width: 26,
    height: 26,
    borderRadius: borderRadius.full,
    backgroundColor: `${colors.semantic.success}20`,
    justifyContent: "center",
    alignItems: "center",
  },
  suggestionDismissButton: {
    width: 22,
    height: 22,
    borderRadius: borderRadius.full,
    justifyContent: "center",
    alignItems: "center",
  },
  noSuggestionsText: {
    ...typography.bodySmall,
    color: colors.text.tertiary,
    textAlign: "center",
    paddingVertical: spacing.sm,
  },
});
