import { useCallback, useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import {
  GlassScreen,
  GlassCard,
  GlassButton,
  GlassHeader,
  GlassSkeleton,
  GlassToast,
  colors,
  typography,
  spacing,
  useGlassAlert,
} from "@/components/ui/glass";
import { useDelightToast } from "@/hooks/useDelightToast";

export default function TripSummaryScreen() {
  const params = useLocalSearchParams();
  const listId = params.id as string as Id<"shoppingLists">;
  const router = useRouter();
  const { toast, dismiss, showToast, onNewRecord, onSavingsMilestone } = useDelightToast();
  const { alert } = useGlassAlert();
  const recordChecked = useRef(false);
  const milestoneChecked = useRef(false);

  const summary = useQuery(api.shoppingLists.getTripSummary, { id: listId });
  const personalBests = useQuery(api.insights.getPersonalBests);
  const savingsJar = useQuery(api.insights.getSavingsJar);
  const activeChallenge = useQuery(api.insights.getActiveChallenge);

  // Gamification mutations
  const updateStreak = useMutation(api.insights.updateStreak);
  const updateChallengeProgress = useMutation(api.insights.updateChallengeProgress);

  // Restock
  const bulkRestock = useMutation(api.pantryItems.bulkRestockFromTrip);
  const [restockState, setRestockState] = useState<"idle" | "loading" | "done">("idle");

  const doAutoRestock = useCallback(async () => {
    setRestockState("loading");
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const result = await bulkRestock({ listId });
      setRestockState("done");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      showToast(
        result.restockedCount > 0
          ? `${result.restockedCount} item${result.restockedCount === 1 ? "" : "s"} restocked`
          : "All items already stocked",
        "fridge",
        colors.accent.primary,
      );
    } catch {
      setRestockState("idle");
    }
  }, [bulkRestock, listId, showToast]);

  const handleAutoRestock = useCallback(() => {
    if (restockState !== "idle") return;

    const completedAt = summary?.list.completedAt;
    const daysSince = completedAt
      ? (Date.now() - completedAt) / (1000 * 60 * 60 * 24)
      : 0;

    if (daysSince > 1) {
      alert(
        "Still fully stocked?",
        "It\u2019s been a while since this trip. Have you used any of these items?",
        [
          {
            text: "No, update manually",
            style: "cancel",
            onPress: () => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.navigate("/(app)/(tabs)/" as never);
            },
          },
          {
            text: "Yes, restock all",
            style: "default",
            onPress: () => doAutoRestock(),
          },
        ],
      );
    } else {
      doAutoRestock();
    }
  }, [restockState, summary, alert, doAutoRestock, router]);

  // Check for new personal records once both data are loaded
  useEffect(() => {
    if (!summary || !personalBests || recordChecked.current) return;
    recordChecked.current = true;

    const saving = summary.savedMoney ? Math.abs(summary.difference) : 0;
    if (saving > 0 && saving >= personalBests.biggestSaving) {
      onNewRecord("biggestSaving", `£${saving.toFixed(2)}`);
    } else if (summary.actualTotal > 0 && summary.actualTotal <= personalBests.cheapestTrip && personalBests.cheapestTrip < 999999) {
      onNewRecord("cheapestTrip", `£${summary.actualTotal.toFixed(2)}`);
    } else if (summary.checkedCount > personalBests.mostItemsInTrip) {
      onNewRecord("mostItemsInTrip", `${summary.checkedCount} items`);
    }
  }, [summary, personalBests]);

  // Check for savings milestones (delayed so it doesn't clash with personal bests)
  useEffect(() => {
    if (!savingsJar || milestoneChecked.current || !summary) return;
    milestoneChecked.current = true;

    // Only show milestone if no personal best toast is showing
    if (recordChecked.current && savingsJar.totalSaved > 0) {
      const timer = setTimeout(() => {
        onSavingsMilestone(savingsJar.totalSaved);
      }, 3000); // Show 3s after load to not compete with personal best toast
      return () => clearTimeout(timer);
    }
  }, [savingsJar, summary]);

  // Gamification: update streak and challenge progress on trip completion
  const gamificationDone = useRef(false);
  useEffect(() => {
    if (!summary || gamificationDone.current) return;
    gamificationDone.current = true;

    (async () => {
      try {
        // Update shopping streak
        await updateStreak({ type: "shopping" });

        // Update challenge progress based on trip outcome
        if (activeChallenge && !activeChallenge.completedAt) {
          if (activeChallenge.type === "complete_lists") {
            await updateChallengeProgress({ challengeId: activeChallenge._id, increment: 1 });
          } else if (activeChallenge.type === "under_budget" && summary.savedMoney) {
            await updateChallengeProgress({ challengeId: activeChallenge._id, increment: 1 });
          } else if (activeChallenge.type === "save_money" && summary.savedMoney) {
            await updateChallengeProgress({ challengeId: activeChallenge._id, increment: Math.abs(summary.difference) });
          }
        }
      } catch (err) {
        console.warn("Gamification update failed:", err);
      }
    })();
  }, [summary, activeChallenge]);

  if (summary === undefined) {
    return (
      <GlassScreen>
        <GlassHeader title="Trip Summary" showBack onBack={() => router.back()} />
        <View style={styles.container}>
          <GlassSkeleton variant="card" />
          <GlassSkeleton variant="card" />
          <GlassSkeleton variant="card" />
        </View>
      </GlassScreen>
    );
  }

  if (!summary) {
    return (
      <GlassScreen>
        <GlassHeader title="Trip Summary" showBack onBack={() => router.back()} />
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Trip not found</Text>
          <GlassButton variant="primary" onPress={() => router.back()}>
            Go Back
          </GlassButton>
        </View>
      </GlassScreen>
    );
  }

  const {
    list,
    items,
    receipt,
    budget,
    actualTotal,
    difference,
    savedMoney,
    percentSaved,
    pointsEarned,
    itemCount,
    checkedCount,
  } = summary;

  const completedDate = list.completedAt
    ? new Date(list.completedAt).toLocaleDateString("en-GB", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : "Unknown";

  return (
    <GlassScreen>
      <GlassHeader
        title={list.name}
        showBack
        onBack={() => router.back()}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Outcome Card */}
        {budget > 0 ? (
          savedMoney ? (
            <GlassCard variant="bordered" accentColor={colors.semantic.success} style={styles.section}>
              <View style={styles.outcomeHeader}>
                <MaterialCommunityIcons
                  name="trophy"
                  size={48}
                  color={colors.semantic.success}
                />
                <Text style={styles.outcomeTitle}>
                  Saved £{Math.abs(difference).toFixed(2)}
                </Text>
                <Text style={styles.outcomeSubtitle}>
                  {percentSaved.toFixed(0)}% under budget
                </Text>
              </View>
            </GlassCard>
          ) : (
            <GlassCard variant="bordered" accentColor={colors.semantic.warning} style={styles.section}>
              <View style={styles.outcomeHeader}>
                <MaterialCommunityIcons
                  name="alert-circle-outline"
                  size={48}
                  color={colors.semantic.warning}
                />
                <Text style={[styles.outcomeTitle, { color: colors.semantic.warning }]}>
                  Over by £{Math.abs(difference).toFixed(2)}
                </Text>
                <Text style={styles.outcomeSubtitle}>
                  {Math.abs(percentSaved).toFixed(0)}% over budget
                </Text>
              </View>
            </GlassCard>
          )
        ) : (
          <GlassCard variant="bordered" accentColor={colors.accent.primary} style={styles.section}>
            <View style={styles.outcomeHeader}>
              <MaterialCommunityIcons
                name="check-circle"
                size={48}
                color={colors.accent.primary}
              />
              <Text style={[styles.outcomeTitle, { color: colors.accent.primary }]}>
                Trip Complete
              </Text>
              <Text style={styles.outcomeSubtitle}>{completedDate}</Text>
            </View>
          </GlassCard>
        )}

        {/* Budget Breakdown */}
        <GlassCard variant="standard" style={styles.section}>
          <View style={styles.sectionHeader}>
            <MaterialCommunityIcons name="wallet-outline" size={20} color={colors.accent.primary} />
            <Text style={styles.sectionTitle}>Budget Breakdown</Text>
          </View>

          {budget > 0 && (
            <View style={styles.row}>
              <Text style={styles.rowLabel}>Budget</Text>
              <Text style={styles.rowValue}>£{budget.toFixed(2)}</Text>
            </View>
          )}

          <View style={styles.row}>
            <Text style={styles.rowLabel}>Actual Spent</Text>
            <Text style={[styles.rowValue, actualTotal > budget && budget > 0 && { color: colors.semantic.danger }]}>
              £{actualTotal.toFixed(2)}
            </Text>
          </View>

          {budget > 0 && (
            <View style={[styles.row, styles.highlightRow]}>
              <Text style={styles.rowLabel}>Difference</Text>
              <Text style={[styles.rowValue, { color: savedMoney ? colors.semantic.success : colors.semantic.danger }]}>
                {savedMoney ? "+" : "-"}£{Math.abs(difference).toFixed(2)}
              </Text>
            </View>
          )}
        </GlassCard>

        {/* Items Summary */}
        <GlassCard variant="standard" style={styles.section}>
          <View style={styles.sectionHeader}>
            <MaterialCommunityIcons name="cart-outline" size={20} color={colors.accent.primary} />
            <Text style={styles.sectionTitle}>Items</Text>
          </View>

          <View style={styles.row}>
            <Text style={styles.rowLabel}>Total Items</Text>
            <Text style={styles.rowValue}>{itemCount}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Checked Off</Text>
            <Text style={styles.rowValue}>{checkedCount} / {itemCount}</Text>
          </View>

          {/* Item list */}
          <View style={styles.itemList}>
            {items.map((item) => (
              <View key={item._id} style={styles.itemRow}>
                <MaterialCommunityIcons
                  name={item.isChecked ? "checkbox-marked" : "checkbox-blank-outline"}
                  size={18}
                  color={item.isChecked ? colors.accent.primary : colors.text.tertiary}
                />
                <Text
                  style={[
                    styles.itemName,
                    item.isChecked && styles.itemChecked,
                  ]}
                  numberOfLines={1}
                >
                  {item.name}
                </Text>
                {item.actualPrice != null && (
                  <Text style={styles.itemPrice}>
                    £{item.actualPrice.toFixed(2)}
                  </Text>
                )}
              </View>
            ))}
          </View>
        </GlassCard>

        {/* Points Earned */}
        {pointsEarned > 0 && (
          <GlassCard variant="bordered" accentColor={colors.accent.secondary} style={styles.section}>
            <View style={styles.pointsRow}>
              <View style={styles.pointsIcon}>
                <MaterialCommunityIcons name="star-circle" size={32} color={colors.accent.secondary} />
              </View>
              <View style={styles.pointsText}>
                <Text style={styles.pointsTitle}>+{pointsEarned} Points Earned</Text>
                <Text style={styles.pointsSubtitle}>
                  From this shopping trip
                </Text>
              </View>
            </View>
          </GlassCard>
        )}

        {/* Receipt Link */}
        {receipt && (
          <GlassCard variant="standard" style={styles.section}>
            <View style={styles.sectionHeader}>
              <MaterialCommunityIcons name="receipt" size={20} color={colors.accent.primary} />
              <Text style={styles.sectionTitle}>Receipt</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.rowLabel}>Store</Text>
              <Text style={styles.rowValue}>{receipt.storeName}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.rowLabel}>Total</Text>
              <Text style={styles.rowValue}>£{receipt.total.toFixed(2)}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.rowLabel}>Items on Receipt</Text>
              <Text style={styles.rowValue}>{receipt.items.length}</Text>
            </View>
          </GlassCard>
        )}

        {/* Trip Details */}
        <GlassCard variant="standard" style={styles.section}>
          <View style={styles.sectionHeader}>
            <MaterialCommunityIcons name="clock-outline" size={20} color={colors.accent.primary} />
            <Text style={styles.sectionTitle}>Trip Details</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Completed</Text>
            <Text style={styles.rowValue}>{completedDate}</Text>
          </View>
          {(() => {
            const segments = (list as Record<string, unknown>).storeSegments as
              | Array<{ storeName: string }> | undefined;
            const names: string[] = [];
            if (segments && segments.length > 0) {
              for (const seg of segments) {
                if (!names.includes(seg.storeName)) names.push(seg.storeName);
              }
            } else if (list.storeName) {
              names.push(list.storeName);
            }
            return names.length > 0 ? (
              <View style={styles.row}>
                <Text style={styles.rowLabel}>{names.length > 1 ? "Stores" : "Store"}</Text>
                <Text style={styles.rowValue}>{names.join(" | ")}</Text>
              </View>
            ) : null;
          })()}
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Status</Text>
            <View style={[styles.statusBadge, { backgroundColor: "rgba(255, 255, 255, 0.13)" }]}>
              <Text style={[styles.statusText, { color: colors.text.tertiary }]}>
                {list.status === "archived" ? "Archived" : "Completed"}
              </Text>
            </View>
          </View>
        </GlassCard>

        {/* Scan Receipt prompt (only if no receipt linked yet) */}
        {!receipt && (
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push({ pathname: "/(app)/(tabs)/scan", params: { listId: listId } } as never);
            }}
          >
            <GlassCard variant="bordered" accentColor={colors.accent.primary} style={styles.section}>
              <View style={styles.scanReceiptRow}>
                <View style={styles.scanReceiptIcon}>
                  <MaterialCommunityIcons name="camera" size={24} color={colors.accent.primary} />
                </View>
                <View style={styles.scanReceiptText}>
                  <Text style={styles.scanReceiptTitle}>Scan Receipt</Text>
                  <Text style={styles.scanReceiptDesc}>
                    Capture your receipt to track exact prices
                  </Text>
                </View>
                <MaterialCommunityIcons name="chevron-right" size={20} color={colors.text.tertiary} />
              </View>
            </GlassCard>
          </Pressable>
        )}

        {/* Restock pantry */}
        <GlassCard variant="standard" style={styles.section}>
          <View style={styles.sectionHeader}>
            <MaterialCommunityIcons name="fridge-outline" size={20} color={colors.accent.primary} />
            <Text style={styles.sectionTitle}>Update Pantry</Text>
          </View>

          <View style={styles.restockOptions}>
            <Pressable
              style={[
                styles.restockOption,
                restockState === "done" && styles.restockOptionDone,
              ]}
              onPress={handleAutoRestock}
              disabled={restockState !== "idle"}
            >
              {restockState === "loading" ? (
                <ActivityIndicator size="small" color={colors.accent.primary} />
              ) : (
                <MaterialCommunityIcons
                  name={restockState === "done" ? "check-circle" : "auto-fix"}
                  size={24}
                  color={restockState === "done" ? colors.semantic.success : colors.accent.primary}
                />
              )}
              <Text style={[
                styles.restockLabel,
                restockState === "done" && { color: colors.semantic.success },
              ]}>
                {restockState === "done" ? "Restocked" : "Auto-restock"}
              </Text>
              <Text style={styles.restockDesc}>
                {restockState === "done"
                  ? "Pantry updated"
                  : "Mark all purchased items as stocked"}
              </Text>
            </Pressable>

            <View style={styles.restockDivider} />

            <Pressable
              style={styles.restockOption}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.navigate("/(app)/(tabs)/" as never);
              }}
            >
              <MaterialCommunityIcons
                name="pencil-outline"
                size={24}
                color={colors.text.secondary}
              />
              <Text style={styles.restockLabel}>Manual</Text>
              <Text style={styles.restockDesc}>
                Go to pantry and adjust individually
              </Text>
            </Pressable>
          </View>
        </GlassCard>

        <View style={styles.bottomSpacer} />
      </ScrollView>

      <GlassToast
        message={toast.message}
        icon={toast.icon}
        iconColor={toast.iconColor}
        visible={toast.visible}
        onDismiss={dismiss}
        duration={4000}
      />
    </GlassScreen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    gap: spacing.md,
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: spacing.lg,
  },
  errorText: {
    ...typography.headlineMedium,
    color: colors.semantic.danger,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  section: {
    marginBottom: spacing.md,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    ...typography.labelLarge,
    color: colors.text.primary,
  },

  // Outcome card
  outcomeHeader: {
    alignItems: "center",
    paddingVertical: spacing.lg,
  },
  outcomeTitle: {
    ...typography.displaySmall,
    color: colors.semantic.success,
    marginTop: spacing.md,
    textAlign: "center",
    fontWeight: "700",
  },
  outcomeSubtitle: {
    ...typography.bodyMedium,
    color: colors.text.secondary,
    marginTop: spacing.xs,
    textAlign: "center",
  },

  // Rows
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.glass.border,
  },
  highlightRow: {
    backgroundColor: colors.glass.background,
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    marginTop: spacing.xs,
    borderBottomWidth: 0,
  },
  rowLabel: {
    ...typography.bodyMedium,
    color: colors.text.secondary,
  },
  rowValue: {
    ...typography.labelMedium,
    color: colors.text.primary,
    fontWeight: "600",
  },

  // Items
  itemList: {
    marginTop: spacing.md,
    gap: spacing.xs,
  },
  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  itemName: {
    ...typography.bodyMedium,
    color: colors.text.primary,
    flex: 1,
  },
  itemChecked: {
    color: colors.text.tertiary,
    textDecorationLine: "line-through",
  },
  itemPrice: {
    ...typography.labelSmall,
    color: colors.text.secondary,
    fontWeight: "600",
  },

  // Points
  pointsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  pointsIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: `${colors.accent.secondary}15`,
    justifyContent: "center",
    alignItems: "center",
  },
  pointsText: {
    flex: 1,
  },
  pointsTitle: {
    ...typography.headlineSmall,
    color: colors.accent.secondary,
    fontWeight: "700",
  },
  pointsSubtitle: {
    ...typography.bodySmall,
    color: colors.text.secondary,
  },

  // Status badge
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 12,
  },
  statusText: {
    ...typography.labelSmall,
    fontWeight: "600",
  },

  // Scan receipt prompt
  scanReceiptRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  scanReceiptIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: `${colors.accent.primary}15`,
    justifyContent: "center",
    alignItems: "center",
  },
  scanReceiptText: {
    flex: 1,
  },
  scanReceiptTitle: {
    ...typography.labelLarge,
    color: colors.text.primary,
    fontWeight: "600",
  },
  scanReceiptDesc: {
    ...typography.bodySmall,
    color: colors.text.tertiary,
    marginTop: 2,
  },

  // Restock options
  restockOptions: {
    flexDirection: "row",
    gap: 0,
  },
  restockOption: {
    flex: 1,
    alignItems: "center",
    paddingVertical: spacing.md,
    gap: spacing.xs,
  },
  restockOptionDone: {
    opacity: 0.7,
  },
  restockLabel: {
    ...typography.labelMedium,
    color: colors.text.primary,
    fontWeight: "600",
  },
  restockDesc: {
    ...typography.bodySmall,
    color: colors.text.tertiary,
    textAlign: "center",
  },
  restockDivider: {
    width: 1,
    backgroundColor: colors.glass.border,
    marginVertical: spacing.sm,
  },

  bottomSpacer: {
    height: 140,
  },
});
