import { StyleSheet, Dimensions } from "react-native";
import { colors, typography, spacing, borderRadius } from "@/components/ui/glass";

const SCREEN_WIDTH = Dimensions.get("window").width;
export const CHART_WIDTH = SCREEN_WIDTH - spacing.lg * 2 - spacing.md * 2;

export const styles = StyleSheet.create({
  loading: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    gap: spacing.md,
  },
  scrollView: { flex: 1 },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  section: { marginBottom: spacing.md },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    ...typography.headlineSmall,
    color: colors.text.primary,
    flex: 1,
  },

  // Weekly digest stats
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  statBox: {
    flex: 1,
    minWidth: "45%",
    alignItems: "center",
    backgroundColor: colors.glass.background,
    borderRadius: 12,
    padding: spacing.sm,
    gap: 3,
  },
  statValue: {
    fontSize: 18,
    fontWeight: "700",
  },
  statLabel: {
    ...typography.bodySmall,
    color: colors.text.tertiary,
    fontSize: 11,
  },

  // Discovery zone
  discoveryTip: {
    ...typography.bodyMedium,
    color: colors.text.secondary,
    lineHeight: 22,
    fontStyle: "italic",
  },
  healthTrendSummary: {
    ...typography.bodySmall,
    color: colors.text.secondary,
    textAlign: "center",
    marginTop: spacing.sm,
    lineHeight: 18,
  },

  // Weekly narrative
  weeklyNarrative: {
    ...typography.bodyMedium,
    color: colors.text.secondary,
    marginTop: spacing.md,
    lineHeight: 22,
  },

  // Sparkline
  sparklineContainer: {
    marginTop: spacing.md,
  },
  sparklineLabel: {
    ...typography.bodySmall,
    color: colors.text.tertiary,
    marginBottom: spacing.xs,
  },
  sparklineChart: {
    marginLeft: -16,
    borderRadius: 8,
  },

  // Challenge
  challengeCard: {
    backgroundColor: `${colors.accent.warning}08`,
    borderRadius: 12,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: `${colors.accent.warning}25`,
  },
  challengeTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  challengeIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: `${colors.accent.warning}20`,
    alignItems: "center",
    justifyContent: "center",
  },
  challengeInfo: {
    flex: 1,
  },
  challengeTitle: {
    ...typography.bodyLarge,
    color: colors.text.primary,
    fontWeight: "700",
  },
  challengeDesc: {
    ...typography.bodySmall,
    color: colors.text.secondary,
  },
  challengeReward: {
    alignItems: "center",
  },
  rewardPoints: {
    fontSize: 16,
    fontWeight: "800",
    color: colors.accent.warning,
  },
  rewardLabel: {
    ...typography.bodySmall,
    color: colors.text.tertiary,
    fontSize: 10,
  },
  challengeProgressRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  challengeProgressText: {
    ...typography.bodySmall,
    color: colors.text.secondary,
    fontWeight: "600",
    minWidth: 36,
    textAlign: "right",
  },
  challengeCompleteBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    marginTop: spacing.sm,
    paddingVertical: spacing.xs,
    backgroundColor: `${colors.accent.success}15`,
    borderRadius: 8,
  },
  challengeCompleteText: {
    ...typography.bodySmall,
    color: colors.accent.success,
    fontWeight: "700",
  },
  generateChallengeBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    paddingVertical: spacing.md,
    backgroundColor: `${colors.accent.warning}10`,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: `${colors.accent.warning}30`,
    borderStyle: "dashed",
  },
  generateChallengeText: {
    ...typography.bodyLarge,
    color: colors.accent.warning,
    fontWeight: "600",
  },

  // Savings jar
  savingsContent: {
    alignItems: "center",
    paddingVertical: spacing.sm,
  },
  savingsBigNumber: {
    fontSize: 40,
    fontWeight: "800",
    color: colors.accent.success,
  },
  savingsSubtext: {
    ...typography.bodyMedium,
    color: colors.text.tertiary,
    marginTop: spacing.xs,
    marginBottom: spacing.md,
  },
  milestoneRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    marginBottom: spacing.xs,
  },
  milestoneLabel: {
    ...typography.bodySmall,
    color: colors.text.secondary,
  },
  milestonePercent: {
    ...typography.bodySmall,
    color: colors.accent.success,
    fontWeight: "700",
  },

  // Monthly trends chart
  chart: {
    marginLeft: -16,
    borderRadius: 8,
    marginBottom: spacing.sm,
  },
  monthChanges: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.glass.border,
  },
  monthChangeItem: {
    alignItems: "center",
    gap: 2,
  },
  monthChangeLabel: {
    ...typography.bodySmall,
    color: colors.text.tertiary,
    fontSize: 11,
  },
  monthChangeAmount: {
    ...typography.bodyMedium,
    color: colors.text.primary,
    fontWeight: "700",
  },
  changeBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  changeText: {
    fontSize: 11,
    fontWeight: "700",
  },

  // Budget adherence
  budgetAdherenceRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  adherenceStatBox: {
    flex: 1,
    alignItems: "center",
    gap: 4,
  },
  adherenceNumber: {
    fontSize: 28,
    fontWeight: "800",
  },
  adherenceLabel: {
    ...typography.bodySmall,
    color: colors.text.tertiary,
    fontSize: 11,
  },
  adherenceDivider: {
    width: 1,
    height: 40,
    backgroundColor: colors.glass.border,
  },

  // Category breakdown
  categoryList: {
    gap: spacing.sm,
  },
  categoryRow: {
    gap: 4,
  },
  categoryLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  categoryDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  categoryName: {
    ...typography.bodyMedium,
    color: colors.text.primary,
    flex: 1,
  },
  categoryAmount: {
    ...typography.bodyMedium,
    color: colors.text.secondary,
    fontWeight: "600",
  },
  categoryBarTrack: {
    height: 4,
    backgroundColor: colors.glass.background,
    borderRadius: 2,
    marginLeft: 20,
    overflow: "hidden",
  },
  categoryBarFill: {
    height: "100%",
    borderRadius: 2,
  },

  // Streaks
  streakRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.glass.border,
  },
  streakLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  streakFlame: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.semantic.fireGlow,
    alignItems: "center",
    justifyContent: "center",
  },
  streakType: {
    ...typography.bodyMedium,
    color: colors.text.primary,
    fontWeight: "600",
    textTransform: "capitalize",
  },
  streakDays: {
    ...typography.bodySmall,
    color: colors.text.secondary,
  },
  streakBestBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: `${colors.accent.warning}15`,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: borderRadius.sm,
  },
  streakBestText: {
    ...typography.bodySmall,
    color: colors.accent.warning,
    fontWeight: "700",
    fontSize: 12,
  },

  // Personal bests
  bestsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  bestItem: {
    width: "47%",
    alignItems: "center",
    backgroundColor: colors.glass.background,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    gap: spacing.sm,
  },
  bestIconCircle: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  bestValue: {
    ...typography.bodyLarge,
    fontWeight: "700",
    color: colors.text.primary,
  },
  bestLabel: {
    ...typography.bodySmall,
    color: colors.text.tertiary,
    fontSize: 11,
  },

  // Achievements
  achievementCountBadge: {
    backgroundColor: `${colors.accent.secondary}30`,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  achievementCountText: {
    ...typography.bodySmall,
    color: colors.accent.secondary,
    fontWeight: "700",
    fontSize: 12,
  },
  achievementsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  achievementBadge: {
    width: "30%",
    alignItems: "center",
    gap: 6,
  },
  achievementIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: `${colors.accent.secondary}15`,
    alignItems: "center",
    justifyContent: "center",
  },
  achievementTitle: {
    ...typography.labelSmall,
    color: colors.text.primary,
    textAlign: "center",
  },
  achievementDesc: {
    ...typography.bodySmall,
    color: colors.text.tertiary,
    textAlign: "center",
    fontSize: 10,
  },
  emptyAchievements: {
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: spacing.md,
  },
  emptyText: {
    ...typography.bodyMedium,
    color: colors.text.tertiary,
    textAlign: "center",
    paddingVertical: spacing.sm,
  },

  // Store breakdown
  storeSpendingSection: {
    marginBottom: spacing.md,
  },
  storeSubheading: {
    ...typography.labelMedium,
    color: colors.text.secondary,
    marginBottom: spacing.sm,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    fontSize: 11,
  },
  storeSpendingList: {
    gap: spacing.sm,
  },
  storeSpendingRow: {
    gap: 4,
  },
  storeSpendingLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  storeDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  storeName: {
    ...typography.bodyMedium,
    color: colors.text.primary,
    flex: 1,
  },
  storeAmount: {
    ...typography.bodyMedium,
    color: colors.text.primary,
    fontWeight: "700",
  },
  storePercent: {
    ...typography.bodySmall,
    color: colors.text.tertiary,
    minWidth: 40,
  },
  storeBarTrack: {
    height: 6,
    backgroundColor: colors.glass.background,
    borderRadius: 3,
    marginLeft: 22,
    overflow: "hidden",
  },
  storeBarFill: {
    height: "100%",
    borderRadius: 3,
  },
  storeVisitsSection: {
    marginBottom: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.glass.border,
  },
  storeVisitsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  storeVisitItem: {
    width: "30%",
    alignItems: "center",
    paddingVertical: spacing.sm,
    gap: 4,
  },
  storeVisitIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  storeVisitCount: {
    ...typography.bodyLarge,
    color: colors.text.primary,
    fontWeight: "700",
  },
  storeVisitName: {
    ...typography.bodySmall,
    color: colors.text.tertiary,
    fontSize: 10,
    textAlign: "center",
  },
  storeTotalVisits: {
    ...typography.bodySmall,
    color: colors.text.tertiary,
    textAlign: "center",
    marginTop: spacing.sm,
  },
  savingsRecommendation: {
    backgroundColor: `${colors.accent.warning}08`,
    borderRadius: 12,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: `${colors.accent.warning}25`,
  },
  savingsRecommendationHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  savingsRecommendationTitle: {
    ...typography.labelMedium,
    color: colors.accent.warning,
    fontWeight: "700",
  },
  savingsRecommendationText: {
    ...typography.bodyMedium,
    color: colors.text.primary,
    lineHeight: 22,
  },
  alternativeStoresRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  alternativeStoresLabel: {
    ...typography.bodySmall,
    color: colors.text.tertiary,
  },
  alternativeStoreChip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    backgroundColor: "transparent",
  },
  alternativeStoreText: {
    ...typography.bodySmall,
    fontWeight: "600",
    fontSize: 11,
  },
});
