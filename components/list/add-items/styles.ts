import { StyleSheet, StatusBar } from "react-native";
import { colors, typography, spacing, borderRadius } from "@/components/ui/glass";

export const styles = StyleSheet.create({
  // Modal
  modalContent: {
    marginTop: (StatusBar.currentHeight ?? 0) + 12,
    paddingTop: spacing.xs,
    paddingHorizontal: 0,
    paddingBottom: 0,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
  },

  // Header
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  headerTextContainer: {
    flex: 1,
    marginRight: spacing.sm,
  },
  headerTitle: {
    ...typography.headlineMedium,
    color: colors.text.primary,
  },
  headerSubtitle: {
    ...typography.bodySmall,
    color: colors.text.tertiary,
    marginTop: 2,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.glass.background,
    justifyContent: "center",
    alignItems: "center",
  },

  // Unified input bar
  inputSection: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.glass.border,
    gap: spacing.xs,
  },
  unifiedInputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  inputBarIcon: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.md,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.glass.background,
    borderWidth: 1,
    borderColor: colors.glass.border,
    gap: 1,
    paddingTop: 8,
    paddingBottom: 0,
  },
  inputBarIconActive: {
    borderColor: colors.accent.primary,
    backgroundColor: "rgba(0, 212, 170, 0.08)",
  },
  inputBarFieldWrapper: {
    flex: 1,
  },
  inputBarIconLabel: {
    ...typography.bodySmall,
    color: colors.text.tertiary,
    textAlign: "center",
    fontSize: 9,
  },
  inputBarIconLabelActive: {
    color: colors.accent.primary,
  },

  // Field buttons row (Size / Qty / Price)
  fieldButtonRow: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  fieldButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    backgroundColor: colors.glass.background,
    borderWidth: 1,
    borderColor: colors.glass.border,
    borderRadius: borderRadius.md,
  },
  fieldButtonActive: {
    borderColor: colors.accent.primary,
    backgroundColor: "rgba(0, 212, 170, 0.08)",
  },
  fieldButtonFilled: {
    borderColor: "rgba(0, 212, 170, 0.3)",
  },
  fieldButtonText: {
    ...typography.labelMedium,
    color: colors.text.secondary,
  },
  fieldButtonTextFilled: {
    color: colors.accent.primary,
    fontWeight: "600",
  },

  // Inline field editor
  fieldEditorRow: {
    flexDirection: "row",
  },
  fieldEditorInput: {
    flex: 1,
    ...typography.bodyMedium,
    color: colors.text.primary,
    backgroundColor: colors.glass.background,
    borderWidth: 1,
    borderColor: colors.glass.border,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  priceHint: {
    ...typography.bodySmall,
    color: colors.accent.primary,
    marginTop: 4,
    opacity: 0.8,
    paddingHorizontal: spacing.xl,
  },

  // Feedback pills
  feedbackContainer: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xs,
    gap: spacing.xs,
  },
  feedbackPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    backgroundColor: "rgba(0, 212, 170, 0.1)",
    borderRadius: borderRadius.full,
    alignSelf: "flex-start",
  },
  feedbackText: {
    ...typography.bodySmall,
    color: colors.accent.primary,
    fontWeight: "500",
    flexShrink: 1,
  },

  // Content area
  contentArea: {
    flex: 1,
    minHeight: 0,
  },
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
  },

  // Variant picker
  variantScrollView: {
    flex: 1,
  },
  variantScrollContent: {
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
  },

  // Matched item row (single line: name + badge)
  matchedItemRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.xl,
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  matchedItemLabel: {
    ...typography.labelLarge,
    color: colors.text.primary,
    fontWeight: "600",
    flex: 1,
  },
  matchedItemBadge: {
    ...typography.labelSmall,
    color: colors.accent.primary,
    fontWeight: "500",
  },
  noVariantsHint: {
    ...typography.bodySmall,
    color: colors.text.tertiary,
    paddingHorizontal: spacing.xl,
    marginTop: spacing.sm,
  },

  // Alt suggestions (disambiguation)
  altSuggestionsSection: {
    marginTop: spacing.xl,
    paddingHorizontal: spacing.xl,
  },
  altSuggestionsLabel: {
    ...typography.labelSmall,
    color: colors.text.tertiary,
    marginBottom: spacing.sm,
  },
  altSuggestionsRow: {
    paddingRight: spacing.xl,
  },
  altSuggestionChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.glass.background,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.glass.border,
    marginRight: spacing.sm,
  },
  altSuggestionText: {
    ...typography.bodySmall,
    color: colors.text.secondary,
    fontWeight: "500",
  },
  stockDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  // Loading
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing["3xl"],
  },
  loadingText: {
    ...typography.bodyMedium,
    color: colors.text.tertiary,
  },

  // Empty
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing["3xl"],
    paddingHorizontal: spacing.xl,
  },
  emptyText: {
    ...typography.bodyLarge,
    color: colors.text.primary,
    textAlign: "center",
    width: "100%",
  },
  emptyHint: {
    ...typography.bodySmall,
    color: colors.text.tertiary,
    textAlign: "center",
  },
  emptySubtext: {
    ...typography.bodySmall,
    color: colors.text.secondary,
    textAlign: "center",
    lineHeight: 18,
    width: "100%",
  },

  // Capsule switcher (pantry filter) — margins only, component handles internals
  pantryCapsuleSwitcher: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.sm,
    marginBottom: spacing.md,
  },
  capsuleAddButton: {
    width: 28,
    height: 28,
    justifyContent: "center",
    alignItems: "center",
  },

  // Section headers (pantry)
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xs,
  },
  sectionHeaderText: {
    ...typography.labelLarge,
    color: colors.text.primary,
  },
  sectionBadge: {
    backgroundColor: colors.glass.backgroundActive,
    borderRadius: borderRadius.full,
    minWidth: 22,
    height: 22,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: spacing.sm,
  },
  sectionBadgeText: {
    ...typography.labelSmall,
    color: colors.text.secondary,
    fontWeight: "600",
    fontSize: 11,
  },

  // Row items
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.xs,
    backgroundColor: colors.glass.background,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.glass.border,
  },
  rowLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: spacing.sm,
    marginRight: spacing.sm,
  },
  rowTextContainer: {
    flex: 1,
  },
  rowName: {
    ...typography.bodyLarge,
    color: colors.text.primary,
    fontWeight: "500",
  },
  rowNameOnList: {
    color: colors.text.tertiary,
  },
  rowPrice: {
    ...typography.labelMedium,
    color: colors.accent.primary,
    fontWeight: "700",
  },
  rowSubtitle: {
    ...typography.bodySmall,
    color: colors.text.tertiary,
  },
  subtitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    marginTop: 2,
  },

  // Selection circle (multi-select)
  selectCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.text.disabled,
    justifyContent: "center",
    alignItems: "center",
  },
  selectCircleActive: {
    borderColor: colors.accent.primary,
    backgroundColor: colors.accent.primary,
  },
  rowSelected: {
    borderColor: "rgba(0, 212, 170, 0.4)",
    backgroundColor: "rgba(0, 212, 170, 0.06)",
  },
  // On-list badge
  onListBadge: {
    width: 28,
    height: 28,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: borderRadius.full,
    backgroundColor: colors.glass.backgroundActive,
  },
  onListText: {
    ...typography.labelSmall,
    color: colors.text.disabled,
    fontStyle: "italic",
  },

  // Pantry icon
  pantryIconContainer: {
    width: 28,
    height: 28,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: borderRadius.sm,
    backgroundColor: colors.glass.backgroundActive,
  },

  // Bottom bar
  bottomBar: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.glass.border,
    backgroundColor: colors.background.primary,
  },
  subtotalText: {
    ...typography.bodySmall,
    color: colors.text.secondary,
    textAlign: "center",
    marginBottom: spacing.sm,
  },
  submitButton: {
    width: "100%",
  },
});
