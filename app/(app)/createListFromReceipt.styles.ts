import { StyleSheet } from "react-native";
import {
  colors,
  typography,
  spacing,
  borderRadius,
} from "@/components/ui/glass";

export const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  bottomSpacer: {
    height: 140,
  },

  scanCta: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: `${colors.accent.primary}08`,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: `${colors.accent.primary}30`,
    padding: spacing.lg,
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  scanCtaIcon: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.md,
    backgroundColor: `${colors.accent.primary}15`,
    justifyContent: "center",
    alignItems: "center",
  },
  scanCtaText: {
    flex: 1,
    gap: 2,
  },
  scanCtaTitle: {
    ...typography.bodyLarge,
    color: colors.accent.primary,
    fontWeight: "700",
  },
  scanCtaDesc: {
    ...typography.bodySmall,
    color: colors.text.tertiary,
  },

  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.glass.border,
  },
  dividerText: {
    ...typography.labelSmall,
    color: colors.text.tertiary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },

  receiptCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.glass.background,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.glass.border,
    padding: spacing.md,
    gap: spacing.md,
    marginBottom: spacing.sm,
  },
  storeDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  receiptCardInfo: {
    flex: 1,
    gap: 2,
  },
  receiptCardStore: {
    ...typography.bodyMedium,
    color: colors.text.primary,
    fontWeight: "600",
  },
  receiptCardMeta: {
    ...typography.bodySmall,
    color: colors.text.tertiary,
  },
  receiptCardTotal: {
    ...typography.bodyMedium,
    color: colors.text.primary,
    fontWeight: "700",
  },

  emptyState: {
    alignItems: "center",
    paddingVertical: spacing["3xl"],
    gap: spacing.sm,
  },
  emptyTitle: {
    ...typography.bodyLarge,
    color: colors.text.secondary,
    fontWeight: "600",
  },
  emptyDesc: {
    ...typography.bodySmall,
    color: colors.text.tertiary,
  },

  receiptHeader: {
    marginBottom: spacing.md,
  },
  receiptHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  receiptHeaderText: {
    flex: 1,
    gap: 2,
  },
  receiptStoreName: {
    ...typography.headlineSmall,
    color: colors.text.primary,
    fontWeight: "700",
  },
  receiptDate: {
    ...typography.bodySmall,
    color: colors.text.tertiary,
  },
  receiptTotal: {
    ...typography.headlineMedium,
    color: colors.accent.primary,
    fontWeight: "700",
  },

  section: {
    marginBottom: spacing.md,
  },
  sectionLabel: {
    ...typography.labelMedium,
    color: colors.text.secondary,
    marginBottom: spacing.sm,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  itemListCard: {
    paddingVertical: 0,
  },
  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
  },
  itemRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.glass.border,
  },
  itemInfo: {
    flex: 1,
    gap: 2,
    marginRight: spacing.md,
  },
  itemName: {
    ...typography.bodyMedium,
    color: colors.text.primary,
  },
  itemMeta: {
    ...typography.bodySmall,
    color: colors.text.tertiary,
  },
  itemPrice: {
    ...typography.bodyMedium,
    color: colors.text.primary,
    fontWeight: "600",
  },

  settingsCard: {
    paddingVertical: 0,
    paddingHorizontal: 0,
  },
  settingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.glass.border,
  },
  settingRowLast: {
    borderBottomWidth: 0,
  },
  settingLabel: {
    ...typography.bodyMedium,
    color: colors.text.secondary,
    marginRight: spacing.md,
  },
  nameInputWrap: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  nameInput: {
    flex: 1,
    ...typography.bodyMedium,
    color: colors.text.primary,
    textAlign: "right",
    paddingVertical: 0,
  },
  charCount: {
    ...typography.labelSmall,
    color: colors.text.tertiary,
    minWidth: 16,
    textAlign: "right",
  },
  charCountWarning: {
    color: colors.semantic.warning,
  },
  budgetValue: {
    ...typography.bodyMedium,
    color: colors.accent.primary,
    fontWeight: "700",
  },

  createCta: {
    marginTop: spacing.sm,
  },
});
