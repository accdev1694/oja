import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  ScrollView,
  Dimensions,
} from "react-native";
import { useRouter } from "expo-router";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { getStoreInfoSafe } from "@/convex/lib/storeNormalizer";
import ConfettiCannon from "react-native-confetti-cannon";
import { impactAsync, ImpactFeedbackStyle } from "expo-haptics";
import {
  GlassScreen,
  SimpleHeader,
  SkeletonCard,
  AnimatedSection,
  colors,
  spacing,
} from "@/components/ui/glass";
import { useDelightToast } from "@/hooks/useDelightToast";
import { useCurrentUser } from "@/hooks/useCurrentUser";

import { useHint } from "@/hooks/useHint";
import { useHintSequence } from "@/hooks/useHintSequence";
import { HintOverlay } from "@/components/tutorial/HintOverlay";

// Modular Components
import { styles } from "@/components/insights/styles";
import { WeeklyDigestCard } from "@/components/insights/WeeklyDigestCard";
import { WeeklyChallengeCard } from "@/components/insights/WeeklyChallengeCard";
import { SavingsJarCard } from "@/components/insights/SavingsJarCard";
import { HealthTrendsCard } from "@/components/insights/HealthTrendsCard";
import { MonthlyTrendsCard } from "@/components/insights/MonthlyTrendsCard";
import { BudgetAdherenceCard } from "@/components/insights/BudgetAdherenceCard";
import { CategoryBreakdownCard } from "@/components/insights/CategoryBreakdownCard";
import { StoreBreakdownCard } from "@/components/insights/StoreBreakdownCard";
import { StreaksCard } from "@/components/insights/StreaksCard";
import { PersonalBestsCard } from "@/components/insights/PersonalBestsCard";
import { AchievementsCard } from "@/components/insights/AchievementsCard";
import { DiscoveryZoneCard } from "@/components/insights/DiscoveryZoneCard";

const SCREEN_WIDTH = Dimensions.get("window").width;

export default function InsightsScreen() {
  const router = useRouter();
  const confettiRef = useRef<any>(null);
  const prevAchievementCount = useRef<number | null>(null);
  const { toast, dismiss, onAchievementUnlock } = useDelightToast();
  const { firstName, user } = useCurrentUser();

  // Hint targets
  const challengeRef = useRef<View>(null);
  const spendingRef = useRef<View>(null);
  const bestsRef = useRef<View>(null);

  // Hints
  const challengeHint = useHint("insights_challenges", "delayed");
  const spendingHint = useHint("insights_spending", "manual");
  const milestonesHint = useHint("insights_milestones", "manual");

  // Sequence: challenge -> spending -> milestones
  useHintSequence([
    { hint: challengeHint, hintId: "insights_challenges" },
    { hint: spendingHint, hintId: "insights_spending" },
    { hint: milestonesHint, hintId: "insights_milestones" },
  ]);

  const digest = useQuery(api.insights.getWeeklyDigest);
  const savingsJar = useQuery(api.insights.getSavingsJar);
  const streaks = useQuery(api.insights.getStreaks);
  const achievements = useQuery(api.insights.getAchievements);
  const personalBests = useQuery(api.insights.getPersonalBests);
  const monthlyTrends = useQuery(api.insights.getMonthlyTrends);
  const activeChallenge = useQuery(api.insights.getActiveChallenge);

  // Store analytics queries
  const storeSpending = useQuery(api.stores.getSpendingByStore);
  const storeVisits = useQuery(api.stores.getReceiptCountByStore);
  const storeRecommendation = useQuery(api.stores.getStoreRecommendation);

  const generateChallenge = useMutation(api.insights.generateChallenge);

  const [challengeGenerating, setChallengeGenerating] = useState(false);

  // Achievement unlock detection
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
  }, [achievements, onAchievementUnlock]);

  const categoryTotal = useMemo(
    () =>
      monthlyTrends?.categoryBreakdown.reduce(
        (s: number, c) => s + c.total,
        0
      ) ?? 0,
    [monthlyTrends]
  );

  const weeklyNarrative = useMemo(
    () => (digest ? generateWeeklyNarrative(digest) : ""),
    [digest]
  );

  const storeBreakdownData = useMemo(() => {
    if (!storeSpending || !storeVisits) return null;

    const storeIds = Object.keys(storeSpending);
    if (storeIds.length === 0) return null;

    const totalSpending = Object.values(storeSpending).reduce((a: number, b) => a + (b as number), 0) as number;
    const totalVisits = Object.values(storeVisits).reduce((a: number, b) => a + (b as number), 0) as number;

    const stores = storeIds
      .map((storeId) => {
        const info = getStoreInfoSafe(storeId);
        const spending = storeSpending[storeId] ?? 0;
        const visits = storeVisits[storeId] ?? 0;
        return {
          storeId,
          displayName: info?.displayName ?? storeId,
          color: info?.color ?? "#6B7280",
          spending,
          spendingPercent: totalSpending > 0 ? (spending / totalSpending) * 100 : 0,
          visits,
        };
      })
      .sort((a, b) => b.spending - a.spending);

    return { stores, totalSpending, totalVisits };
  }, [storeSpending, storeVisits]);

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
        <SimpleHeader title="Insights" showBack onBack={() => router.back()} />
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
      <SimpleHeader
        title={firstName ? `${firstName}&apos;s Insights` : "Insights"}
        subtitle={
          savingsJar && savingsJar.totalSaved > 0
            ? `You've saved £${savingsJar.totalSaved.toFixed(2)} so far!`
            : digest && digest.tripsCount > 0
              ? `${digest.tripsCount} trip${digest.tripsCount !== 1 ? "s" : ""} this week`
              : "Your shopping intelligence"
        }
        showBack
        onBack={() => router.back()}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <AnimatedSection animation="fadeInDown" duration={400} delay={100}>
          {digest && (
            <WeeklyDigestCard 
              digest={digest} 
              narrative={weeklyNarrative} 
              spendingRef={spendingRef} 
            />
          )}
        </AnimatedSection>

        <AnimatedSection animation="fadeInDown" duration={400} delay={200}>
          <WeeklyChallengeCard 
            activeChallenge={activeChallenge} 
            challengeRef={challengeRef} 
            challengeGenerating={challengeGenerating} 
            onGenerate={handleGenerateChallenge} 
          />
        </AnimatedSection>

        <AnimatedSection animation="fadeInDown" duration={400} delay={300}>
          {savingsJar && <SavingsJarCard savingsJar={savingsJar} />}
        </AnimatedSection>

        <AnimatedSection animation="fadeInDown" duration={400} delay={350}>
          <HealthTrendsCard healthHistory={user?.healthHistory || []} />
        </AnimatedSection>

        <AnimatedSection animation="fadeInDown" duration={400} delay={400}>
          {monthlyTrends && <MonthlyTrendsCard monthlyTrends={monthlyTrends} />}
        </AnimatedSection>

        <AnimatedSection animation="fadeInDown" duration={400} delay={450}>
          {monthlyTrends && <BudgetAdherenceCard budgetAdherence={monthlyTrends.budgetAdherence} />}
        </AnimatedSection>

        <AnimatedSection animation="fadeInDown" duration={400} delay={500}>
          {monthlyTrends && (
            <CategoryBreakdownCard 
              categoryBreakdown={monthlyTrends.categoryBreakdown} 
              categoryTotal={categoryTotal} 
            />
          )}
        </AnimatedSection>

        <AnimatedSection animation="fadeInDown" duration={400} delay={525}>
          <StoreBreakdownCard 
            storeBreakdownData={storeBreakdownData} 
            storeRecommendation={storeRecommendation} 
          />
        </AnimatedSection>

        <AnimatedSection animation="fadeInDown" duration={400} delay={550}>
          <StreaksCard streaks={streaks} />
        </AnimatedSection>

        <AnimatedSection animation="fadeInDown" duration={400} delay={600}>
          <PersonalBestsCard personalBests={personalBests} bestsRef={bestsRef} />
        </AnimatedSection>

        <AnimatedSection animation="fadeInDown" duration={400} delay={650}>
          <AchievementsCard achievements={achievements} />
        </AnimatedSection>

        <AnimatedSection animation="fadeInDown" duration={400} delay={700}>
          <DiscoveryZoneCard />
        </AnimatedSection>

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

      {/* Confetti */}
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

      {/* Tutorial Hints */}
      <HintOverlay
        visible={challengeHint.shouldShow}
        targetRef={challengeRef}
        title="AI Challenges"
        content="Complete challenges to earn bonus points. Oja AI picks these based on your shopping habits."
        onDismiss={challengeHint.dismiss}
        position="below"
      />

      <HintOverlay
        visible={spendingHint.shouldShow}
        targetRef={spendingRef}
        title="Spending Insights"
        content="See exactly where your money goes. We compare your spending to community averages."
        onDismiss={spendingHint.dismiss}
        position="below"
      />

      <HintOverlay
        visible={milestonesHint.shouldShow}
        targetRef={bestsRef}
        title="Track Records"
        content="Track your personal records! We celebrate your biggest savings and longest streaks."
        onDismiss={milestonesHint.dismiss}
        position="below"
      />
    </GlassScreen>
  );
}

// ─── Weekly Narrative Generator ──────────────────────────────────────────────

function generateWeeklyNarrative(digest: {
  thisWeekTotal: number;
  lastWeekTotal: number;
  percentChange: number;
  tripsCount: number;
  budgetSaved: number;
}): string {
  const parts: string[] = [];

  if (digest.tripsCount === 0) {
    parts.push("No shopping trips this week — your wallet is having a rest.");
  } else {
    parts.push(
      `You made ${digest.tripsCount} trip${digest.tripsCount !== 1 ? "s" : ""} this week, spending £${digest.thisWeekTotal.toFixed(2)} total.`
    );
  }

  if (digest.lastWeekTotal > 0 && digest.tripsCount > 0) {
    if (digest.percentChange < -10) {
      parts.push(`That&apos;s ${Math.abs(digest.percentChange).toFixed(0)}% less than last week — nice restraint.`);
    } else if (digest.percentChange > 10) {
      parts.push(`That&apos;s ${digest.percentChange.toFixed(0)}% more than last week.`);
    } else if (digest.tripsCount > 0) {
      parts.push("Pretty consistent with last week.");
    }
  }

  if (digest.budgetSaved > 0) {
    parts.push(`You saved £${digest.budgetSaved.toFixed(2)} against your budgets. Keep it up!`);
  }

  return parts.join(" ");
}

// Inline GlassToast for backward compatibility with existing insights logic
function GlassToast({ message, icon, iconColor, visible, onDismiss }) {
  const { GlassToast: UIStoreToast } = require("@/components/ui/glass");
  return <UIStoreToast message={message} icon={icon} iconColor={iconColor} visible={visible} onDismiss={onDismiss} />;
}
