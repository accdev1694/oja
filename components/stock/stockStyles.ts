import { StyleSheet } from "react-native";
import {
  colors,
  typography,
  spacing,
  borderRadius,
} from "@/components/ui/glass";

/** Sentinel value for the Essentials section title */
export const ESSENTIALS_SECTION_TITLE = "\u2605 Essentials";

/** Simple greeting with optional name */
export function getGreeting(firstName?: string) {
  return firstName ? `Hello, ${firstName}` : "Hello";
}

/** Determine which lifecycle tier an item belongs to */
export function getItemTier(item: { pinned?: boolean; purchaseCount?: number; status?: string }): 1 | 2 | 3 {
  if (item.status === "archived") return 3;
  if (item.pinned) return 1;
  if ((item.purchaseCount ?? 0) >= 3) return 1;
  return 2;
}

export const stockStyles = StyleSheet.create({
  container: {
    flex: 1,
  },
  animationWrapper: {
    flex: 1,
  },
  skeletonContainer: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  skeletonSection: {
    marginBottom: spacing.xl,
    gap: spacing.md,
  },
  skeletonSectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  skeletonTitle: {
    width: 100,
    height: 20,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.glass.backgroundStrong,
  },
  skeletonBadge: {
    width: 30,
    height: 20,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.glass.backgroundStrong,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: spacing["2xl"],
  },
  viewModeTabs: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
  },
  attentionEmptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: spacing["5xl"],
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  attentionEmptyTitle: {
    ...typography.headlineMedium,
    color: colors.accent.success,
    textAlign: "center",
  },
  attentionEmptySubtitle: {
    ...typography.bodyMedium,
    color: colors.text.secondary,
    textAlign: "center",
    lineHeight: 22,
  },
  listWrapper: {
    flex: 1,
  },
  filterButton: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.full,
    backgroundColor: colors.glass.background,
    alignItems: "center",
    justifyContent: "center",
  },
  filterButtonActive: {
    backgroundColor: colors.semantic.pantryGlow,
  },
  filterBadge: {
    position: "absolute",
    top: -2,
    right: -2,
    backgroundColor: colors.accent.primary,
    borderRadius: borderRadius.sm,
    minWidth: 18,
    height: 18,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.xs,
  },
  filterBadgeText: {
    ...typography.labelSmall,
    color: colors.text.inverse,
    fontSize: 10,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xs,
  },
  categoryHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: spacing.xs,
    marginBottom: spacing.sm,
  },
  categoryTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  categoryTitle: {
    ...typography.headlineSmall,
    color: colors.text.primary,
  },
  categoryCountBadge: {
    backgroundColor: colors.glass.backgroundHover,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  categoryCount: {
    ...typography.labelSmall,
    color: colors.text.secondary,
  },
  headerButtons: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  addButton: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.full,
    backgroundColor: `${colors.accent.primary}20`,
    borderWidth: 1,
    borderColor: `${colors.accent.primary}40`,
    alignItems: "center",
    justifyContent: "center",
  },
  refreshPriceIcon: {
    width: 22,
    height: 22,
  },
  essentialsSectionTitle: {
    color: colors.accent.primary,
  },
  essentialsCountBadge: {
    backgroundColor: `${colors.accent.primary}20`,
  },
  essentialsCount: {
    color: colors.accent.primary,
  },
  archivedFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
    marginTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.glass.border,
  },
  archivedFooterText: {
    ...typography.bodySmall,
    color: colors.text.tertiary,
    fontSize: 13,
  },
  dedupBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: `${colors.accent.warning}15`,
    borderWidth: 1,
    borderColor: `${colors.accent.warning}30`,
  },
  dedupBannerText: {
    ...typography.bodySmall,
    color: colors.accent.warning,
    fontWeight: "600",
    flex: 1,
  },
  dedupBannerAction: {
    ...typography.labelSmall,
    color: colors.accent.warning,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
});
