import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
} from "react-native";
import { useRouter } from "expo-router";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { LineChart } from "react-native-chart-kit";
import ConfettiCannon from "react-native-confetti-cannon";
import Animated, {
  FadeInDown,
  FadeInUp,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  withDelay,
} from "react-native-reanimated";
import { impactAsync, ImpactFeedbackStyle } from "expo-haptics";
import {
  GlassScreen,
  GlassCard,
  GlassHeader,
  GlassProgressBar,
  GlassToast,
  SkeletonCard,
  colors,
  typography,
  spacing,
  borderRadius,
} from "@/components/ui/glass";
import { useDelightToast } from "@/hooks/useDelightToast";

const SCREEN_WIDTH = Dimensions.get("window").width;
const CHART_WIDTH = SCREEN_WIDTH - spacing.lg * 2 - spacing.md * 2;

const CATEGORY_COLORS = [
  "#00D4AA",
  "#6366F1",
  "#F59E0B",
  "#EF4444",
  "#3B82F6",
  "#10B981",
];

export default function InsightsScreen() {
  const router = useRouter();
  const confettiRef = useRef<any>(null);
  const prevAchievementCount = useRef<number | null>(null);
  const { toast, dismiss, onAchievementUnlock } = useDelightToast();

  const digest = useQuery(api.insights.getWeeklyDigest);
  const savingsJar = useQuery(api.insights.getSavingsJar);
  const streaks = useQuery(api.insights.getStreaks);
  const achievements = useQuery(api.insights.getAchievements);
  const personalBests = useQuery(api.insights.getPersonalBests);
  const monthlyTrends = useQuery(api.insights.getMonthlyTrends);
  const activeChallenge = useQuery(api.insights.getActiveChallenge);

  const generateChallenge = useMutation(api.insights.generateChallenge);

  const [challengeGenerating, setChallengeGenerating] = useState(false);

  // Achievement unlock detection: fire toast + confetti when new badge appears
  useEffect(() => {
    if (!achievements) return;
    const count = achievements.length;
    if (prevAchievementCount.current !== null && count > prevAchievementCount.current) {
      const newest = achievements[achievements.length - 1];
      onAchievementUnlock(newest?.type || "unknown");
      confettiRef.current?.start();
      impactAsync(ImpactFeedbackStyle.Heavy);
    }
    prevAchievementCount.current = count;
  }, [achievements]);

  const loading = digest === undefined;

  const handleGenerateChallenge = async () => {
    setChallengeGenerating(true);
    try {
      await generateChallenge();
      impactAsync(ImpactFeedbackStyle.Medium);
    } catch {
      // ignore
    } finally {
      setChallengeGenerating(false);
    }
  };

  if (loading) {
    return (
      <GlassScreen>
        <GlassHeader title="Insights" showBack onBack={() => router.back()} />
        <View style={styles.loading}>
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </View>
      </GlassScreen>
    );
  }

  return (
    <GlassScreen>
      <GlassHeader
        title="Insights"
        subtitle="Your shopping intelligence"
        showBack
        onBack={() => router.back()}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ============ WEEKLY DIGEST ============ */}
        <Animated.View entering={FadeInDown.delay(100).duration(400)}>
          <GlassCard style={styles.section}>
            <View style={styles.sectionHeader}>
              <MaterialCommunityIcons
                name="calendar-week"
                size={22}
                color={colors.accent.primary}
              />
              <Text style={styles.sectionTitle}>This Week</Text>
            </View>

            {digest && (
              <>
                <View style={styles.statsGrid}>
                  <StatBox
                    label="Spent"
                    value={`£${digest.thisWeekTotal.toFixed(2)}`}
                    icon="cash"
                    color={colors.accent.primary}
                  />
                  <StatBox
                    label="vs Last Week"
                    value={`${digest.percentChange > 0 ? "+" : ""}${digest.percentChange.toFixed(0)}%`}
                    icon={digest.percentChange > 0 ? "trending-up" : "trending-down"}
                    color={
                      digest.percentChange > 0
                        ? colors.accent.error
                        : colors.accent.success
                    }
                  />
                  <StatBox
                    label="Trips"
                    value={`${digest.tripsCount}`}
                    icon="shopping"
                    color={colors.accent.secondary}
                  />
                  <StatBox
                    label="Saved"
                    value={`£${digest.budgetSaved.toFixed(2)}`}
                    icon="piggy-bank"
                    color={colors.accent.success}
                  />
                </View>

                {/* Sparkline */}
                {digest.dailySparkline && digest.dailySparkline.some((v: number) => v > 0) && (
                  <View style={styles.sparklineContainer}>
                    <Text style={styles.sparklineLabel}>Daily spending</Text>
                    <LineChart
                      data={{
                        labels: ["M", "T", "W", "T", "F", "S", "S"],
                        datasets: [{ data: digest.dailySparkline.map((v: number) => v || 0.01) }],
                      }}
                      width={CHART_WIDTH}
                      height={80}
                      withDots={false}
                      withInnerLines={false}
                      withOuterLines={false}
                      withVerticalLabels={true}
                      withHorizontalLabels={false}
                      chartConfig={{
                        backgroundGradientFrom: "transparent",
                        backgroundGradientTo: "transparent",
                        color: () => colors.accent.primary,
                        labelColor: () => colors.text.tertiary,
                        propsForBackgroundLines: { stroke: "transparent" },
                        strokeWidth: 2,
                        fillShadowGradientFrom: colors.accent.primary,
                        fillShadowGradientTo: "transparent",
                        fillShadowGradientFromOpacity: 0.3,
                        fillShadowGradientToOpacity: 0,
                      }}
                      bezier
                      style={styles.sparklineChart}
                    />
                  </View>
                )}
              </>
            )}
          </GlassCard>
        </Animated.View>

        {/* ============ WEEKLY CHALLENGE ============ */}
        <Animated.View entering={FadeInDown.delay(200).duration(400)}>
          <GlassCard style={styles.section}>
            <View style={styles.sectionHeader}>
              <MaterialCommunityIcons
                name="flag-checkered"
                size={22}
                color={colors.accent.warning}
              />
              <Text style={styles.sectionTitle}>Weekly Challenge</Text>
            </View>

            {activeChallenge ? (
              <View style={styles.challengeCard}>
                <View style={styles.challengeTop}>
                  <View style={styles.challengeIconCircle}>
                    <MaterialCommunityIcons
                      name={(activeChallenge.icon as any) || "star"}
                      size={24}
                      color={colors.accent.warning}
                    />
                  </View>
                  <View style={styles.challengeInfo}>
                    <Text style={styles.challengeTitle}>{activeChallenge.title}</Text>
                    <Text style={styles.challengeDesc}>{activeChallenge.description}</Text>
                  </View>
                  <View style={styles.challengeReward}>
                    <Text style={styles.rewardPoints}>+{activeChallenge.reward}</Text>
                    <Text style={styles.rewardLabel}>pts</Text>
                  </View>
                </View>
                <View style={styles.challengeProgressRow}>
                  <GlassProgressBar
                    progress={Math.round(
                      (activeChallenge.progress / activeChallenge.target) * 100
                    )}
                    size="md"
                  />
                  <Text style={styles.challengeProgressText}>
                    {activeChallenge.progress}/{activeChallenge.target}
                  </Text>
                </View>
                {activeChallenge.completedAt && (
                  <View style={styles.challengeCompleteBanner}>
                    <MaterialCommunityIcons name="check-circle" size={16} color={colors.accent.success} />
                    <Text style={styles.challengeCompleteText}>Completed!</Text>
                  </View>
                )}
              </View>
            ) : (
              <TouchableOpacity
                style={styles.generateChallengeBtn}
                onPress={handleGenerateChallenge}
                disabled={challengeGenerating}
                activeOpacity={0.7}
              >
                <MaterialCommunityIcons
                  name="dice-multiple"
                  size={24}
                  color={colors.accent.warning}
                />
                <Text style={styles.generateChallengeText}>
                  {challengeGenerating ? "Generating..." : "Start a Challenge"}
                </Text>
              </TouchableOpacity>
            )}
          </GlassCard>
        </Animated.View>

        {/* ============ SAVINGS JAR ============ */}
        <Animated.View entering={FadeInDown.delay(300).duration(400)}>
          <GlassCard style={styles.section}>
            <View style={styles.sectionHeader}>
              <MaterialCommunityIcons
                name="piggy-bank"
                size={22}
                color={colors.accent.success}
              />
              <Text style={styles.sectionTitle}>Savings Jar</Text>
            </View>

            {savingsJar && (
              <View style={styles.savingsContent}>
                <Text style={styles.savingsBigNumber}>
                  £{savingsJar.totalSaved.toFixed(2)}
                </Text>
                <Text style={styles.savingsSubtext}>
                  Saved across {savingsJar.tripsCount} trip
                  {savingsJar.tripsCount !== 1 ? "s" : ""}
                  {savingsJar.averageSaved > 0 &&
                    ` · £${savingsJar.averageSaved.toFixed(2)} avg`}
                </Text>

                {/* Milestone progress */}
                <View style={styles.milestoneRow}>
                  <Text style={styles.milestoneLabel}>
                    Next milestone: £{savingsJar.nextMilestone}
                  </Text>
                  <Text style={styles.milestonePercent}>
                    {savingsJar.milestoneProgress}%
                  </Text>
                </View>
                <GlassProgressBar
                  progress={savingsJar.milestoneProgress}
                  size="sm"
                />
              </View>
            )}
          </GlassCard>
        </Animated.View>

        {/* ============ MONTHLY TRENDS (CHART) ============ */}
        {monthlyTrends && monthlyTrends.months.length > 1 && (
          <Animated.View entering={FadeInDown.delay(400).duration(400)}>
            <GlassCard style={styles.section}>
              <View style={styles.sectionHeader}>
                <MaterialCommunityIcons
                  name="chart-line"
                  size={22}
                  color={colors.accent.primary}
                />
                <Text style={styles.sectionTitle}>Monthly Trends</Text>
              </View>

              <LineChart
                data={{
                  labels: monthlyTrends.months.map((m: any) => m.label),
                  datasets: [
                    {
                      data: monthlyTrends.months.map((m: any) => m.total || 0.01),
                    },
                  ],
                }}
                width={CHART_WIDTH}
                height={180}
                yAxisLabel="£"
                yAxisSuffix=""
                withDots={true}
                withInnerLines={false}
                withOuterLines={false}
                chartConfig={{
                  backgroundGradientFrom: "transparent",
                  backgroundGradientTo: "transparent",
                  color: () => colors.accent.primary,
                  labelColor: () => colors.text.tertiary,
                  propsForBackgroundLines: { stroke: colors.glass.border },
                  propsForDots: {
                    r: "4",
                    strokeWidth: "2",
                    stroke: colors.accent.primary,
                    fill: colors.background.primary,
                  },
                  strokeWidth: 2,
                  fillShadowGradientFrom: colors.accent.primary,
                  fillShadowGradientTo: "transparent",
                  fillShadowGradientFromOpacity: 0.2,
                  fillShadowGradientToOpacity: 0,
                  decimalPlaces: 0,
                }}
                bezier
                style={styles.chart}
              />

              {/* Month-over-month changes */}
              <View style={styles.monthChanges}>
                {monthlyTrends.months.slice(-3).map((m: any) => (
                  <View key={m.month} style={styles.monthChangeItem}>
                    <Text style={styles.monthChangeLabel}>{m.label}</Text>
                    <Text style={styles.monthChangeAmount}>
                      £{m.total.toFixed(0)}
                    </Text>
                    {m.change !== 0 && (
                      <View
                        style={[
                          styles.changeBadge,
                          {
                            backgroundColor:
                              m.change > 0
                                ? `${colors.accent.error}20`
                                : `${colors.accent.success}20`,
                          },
                        ]}
                      >
                        <MaterialCommunityIcons
                          name={m.change > 0 ? "arrow-up" : "arrow-down"}
                          size={12}
                          color={
                            m.change > 0
                              ? colors.accent.error
                              : colors.accent.success
                          }
                        />
                        <Text
                          style={[
                            styles.changeText,
                            {
                              color:
                                m.change > 0
                                  ? colors.accent.error
                                  : colors.accent.success,
                            },
                          ]}
                        >
                          {Math.abs(m.change).toFixed(0)}%
                        </Text>
                      </View>
                    )}
                  </View>
                ))}
              </View>
            </GlassCard>
          </Animated.View>
        )}

        {/* ============ BUDGET ADHERENCE ============ */}
        {monthlyTrends && monthlyTrends.budgetAdherence.total > 0 && (
          <Animated.View entering={FadeInDown.delay(450).duration(400)}>
            <GlassCard style={styles.section}>
              <View style={styles.sectionHeader}>
                <MaterialCommunityIcons
                  name="target"
                  size={22}
                  color={colors.accent.info}
                />
                <Text style={styles.sectionTitle}>Budget Adherence</Text>
              </View>

              <View style={styles.budgetAdherenceRow}>
                <View style={styles.adherenceStatBox}>
                  <Text style={[styles.adherenceNumber, { color: colors.accent.success }]}>
                    {monthlyTrends.budgetAdherence.underBudget}
                  </Text>
                  <Text style={styles.adherenceLabel}>Under Budget</Text>
                </View>
                <View style={styles.adherenceDivider} />
                <View style={styles.adherenceStatBox}>
                  <Text style={[styles.adherenceNumber, { color: colors.accent.error }]}>
                    {monthlyTrends.budgetAdherence.overBudget}
                  </Text>
                  <Text style={styles.adherenceLabel}>Over Budget</Text>
                </View>
                <View style={styles.adherenceDivider} />
                <View style={styles.adherenceStatBox}>
                  <Text
                    style={[
                      styles.adherenceNumber,
                      { color: colors.accent.primary },
                    ]}
                  >
                    {monthlyTrends.budgetAdherence.total > 0
                      ? Math.round(
                          (monthlyTrends.budgetAdherence.underBudget /
                            monthlyTrends.budgetAdherence.total) *
                            100
                        )
                      : 0}
                    %
                  </Text>
                  <Text style={styles.adherenceLabel}>Success Rate</Text>
                </View>
              </View>
            </GlassCard>
          </Animated.View>
        )}

        {/* ============ CATEGORY BREAKDOWN ============ */}
        {monthlyTrends && monthlyTrends.categoryBreakdown.length > 0 && (
          <Animated.View entering={FadeInDown.delay(500).duration(400)}>
            <GlassCard style={styles.section}>
              <View style={styles.sectionHeader}>
                <MaterialCommunityIcons
                  name="chart-pie"
                  size={22}
                  color={colors.accent.secondary}
                />
                <Text style={styles.sectionTitle}>Top Categories</Text>
              </View>

              <View style={styles.categoryList}>
                {monthlyTrends.categoryBreakdown.map((cat: any, i: number) => {
                  const totalAll = monthlyTrends.categoryBreakdown.reduce(
                    (s: number, c: any) => s + c.total,
                    0
                  );
                  const pct = totalAll > 0 ? (cat.total / totalAll) * 100 : 0;
                  const barColor = CATEGORY_COLORS[i % CATEGORY_COLORS.length];
                  return (
                    <View key={cat.category} style={styles.categoryRow}>
                      <View style={styles.categoryLabelRow}>
                        <View
                          style={[
                            styles.categoryDot,
                            { backgroundColor: barColor },
                          ]}
                        />
                        <Text style={styles.categoryName} numberOfLines={1}>
                          {cat.category}
                        </Text>
                        <Text style={styles.categoryAmount}>
                          £{cat.total.toFixed(0)}
                        </Text>
                      </View>
                      <View style={styles.categoryBarTrack}>
                        <View
                          style={[
                            styles.categoryBarFill,
                            {
                              width: `${Math.max(pct, 2)}%`,
                              backgroundColor: barColor,
                            },
                          ]}
                        />
                      </View>
                    </View>
                  );
                })}
              </View>
            </GlassCard>
          </Animated.View>
        )}

        {/* ============ STREAKS ============ */}
        <Animated.View entering={FadeInDown.delay(550).duration(400)}>
          <GlassCard style={styles.section}>
            <View style={styles.sectionHeader}>
              <MaterialCommunityIcons
                name="fire"
                size={22}
                color="#FF6B35"
              />
              <Text style={styles.sectionTitle}>Streaks</Text>
            </View>

            {streaks && streaks.length > 0 ? (
              streaks.map((streak: any) => (
                <View key={streak._id} style={styles.streakRow}>
                  <View style={styles.streakLeft}>
                    <View style={styles.streakFlame}>
                      <MaterialCommunityIcons
                        name="fire"
                        size={20}
                        color={streak.currentCount >= 7 ? "#FF6B35" : colors.text.tertiary}
                      />
                    </View>
                    <View>
                      <Text style={styles.streakType}>
                        {streak.type.replace(/_/g, " ")}
                      </Text>
                      <Text style={styles.streakDays}>
                        {streak.currentCount} day
                        {streak.currentCount !== 1 ? "s" : ""}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.streakBestBadge}>
                    <MaterialCommunityIcons
                      name="trophy-outline"
                      size={12}
                      color={colors.accent.warning}
                    />
                    <Text style={styles.streakBestText}>
                      {streak.longestCount}
                    </Text>
                  </View>
                </View>
              ))
            ) : (
              <Text style={styles.emptyText}>
                Complete shopping trips to build streaks!
              </Text>
            )}
          </GlassCard>
        </Animated.View>

        {/* ============ PERSONAL BESTS ============ */}
        {personalBests && (
          <Animated.View entering={FadeInDown.delay(600).duration(400)}>
            <GlassCard style={styles.section}>
              <View style={styles.sectionHeader}>
                <MaterialCommunityIcons
                  name="trophy"
                  size={22}
                  color={colors.accent.warning}
                />
                <Text style={styles.sectionTitle}>Personal Bests</Text>
              </View>

              <View style={styles.bestsGrid}>
                <BestItem
                  icon="cash-minus"
                  label="Biggest Saving"
                  value={`£${personalBests.biggestSaving.toFixed(2)}`}
                  color={colors.accent.success}
                />
                <BestItem
                  icon="fire"
                  label="Longest Streak"
                  value={`${personalBests.longestStreak} days`}
                  color="#FF6B35"
                />
                <BestItem
                  icon="cart"
                  label="Most Items"
                  value={`${personalBests.mostItemsInTrip}`}
                  color={colors.accent.secondary}
                />
                <BestItem
                  icon="tag-outline"
                  label="Cheapest Trip"
                  value={`£${personalBests.cheapestTrip.toFixed(2)}`}
                  color={colors.accent.primary}
                />
              </View>
            </GlassCard>
          </Animated.View>
        )}

        {/* ============ ACHIEVEMENTS ============ */}
        <Animated.View entering={FadeInDown.delay(650).duration(400)}>
          <GlassCard style={styles.section}>
            <View style={styles.sectionHeader}>
              <MaterialCommunityIcons
                name="medal"
                size={22}
                color={colors.accent.secondary}
              />
              <Text style={styles.sectionTitle}>Achievements</Text>
              {achievements && achievements.length > 0 && (
                <View style={styles.achievementCountBadge}>
                  <Text style={styles.achievementCountText}>
                    {achievements.length}
                  </Text>
                </View>
              )}
            </View>

            {achievements && achievements.length > 0 ? (
              <View style={styles.achievementsGrid}>
                {achievements.map((a: any) => (
                  <View key={a._id} style={styles.achievementBadge}>
                    <View style={styles.achievementIconCircle}>
                      <MaterialCommunityIcons
                        name={(a.icon as any) || "star"}
                        size={24}
                        color={colors.accent.secondary}
                      />
                    </View>
                    <Text style={styles.achievementTitle} numberOfLines={1}>
                      {a.title}
                    </Text>
                    <Text style={styles.achievementDesc} numberOfLines={2}>
                      {a.description}
                    </Text>
                  </View>
                ))}
              </View>
            ) : (
              <View style={styles.emptyAchievements}>
                <MaterialCommunityIcons
                  name="lock-outline"
                  size={32}
                  color={colors.text.tertiary}
                />
                <Text style={styles.emptyText}>
                  Keep shopping to unlock achievements!
                </Text>
              </View>
            )}
          </GlassCard>
        </Animated.View>

        <View style={{ height: 140 }} />
      </ScrollView>

      {/* Achievement / delight toast */}
      <GlassToast
        message={toast.message}
        icon={toast.icon}
        iconColor={toast.iconColor}
        visible={toast.visible}
        onDismiss={dismiss}
      />

      {/* Confetti (hidden, triggered on milestone) */}
      <ConfettiCannon
        ref={confettiRef}
        count={80}
        origin={{ x: SCREEN_WIDTH / 2, y: -10 }}
        autoStart={false}
        fadeOut
        fallSpeed={2500}
        colors={[
          colors.accent.primary,
          colors.accent.secondary,
          colors.accent.warning,
          colors.accent.success,
        ]}
      />
    </GlassScreen>
  );
}

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

function StatBox({
  label,
  value,
  icon,
  color,
}: {
  label: string;
  value: string;
  icon: string;
  color: string;
}) {
  return (
    <View style={styles.statBox}>
      <MaterialCommunityIcons name={icon as any} size={18} color={color} />
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function BestItem({
  icon,
  label,
  value,
  color,
}: {
  icon: string;
  label: string;
  value: string;
  color: string;
}) {
  return (
    <View style={styles.bestItem}>
      <View style={[styles.bestIconCircle, { backgroundColor: `${color}20` }]}>
        <MaterialCommunityIcons name={icon as any} size={20} color={color} />
      </View>
      <Text style={styles.bestValue}>{value}</Text>
      <Text style={styles.bestLabel}>{label}</Text>
    </View>
  );
}

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
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
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
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
    backgroundColor: "rgba(255, 107, 53, 0.15)",
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
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
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
    borderRadius: 12,
    padding: spacing.md,
    gap: 6,
  },
  bestIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
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
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
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
});
