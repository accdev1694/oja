import React, { useCallback } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { Swipeable } from "react-native-gesture-handler";
import {
  GlassCard,
  colors,
  typography,
  spacing,
  borderRadius,
  animations,
} from "@/components/ui/glass";

const formatShortDate = (ts: number) => {
  const d = new Date(ts);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yy = String(d.getFullYear()).slice(-2);
  return `${dd}/${mm}/${yy}`;
};

const getHealthColor = (score: number) => {
  if (score >= 70) return colors.semantic.success;
  if (score >= 40) return colors.semantic.warning;
  return colors.semantic.danger;
};

export const HistoryCard = React.memo(function HistoryCard({
  list,
  onPress,
  formatDateTime,
  onUseAsTemplate,
}: any) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = useCallback(() => {
    scale.value = withSpring(0.98, animations.spring.stiff);
  }, []);

  const handlePressOut = useCallback(() => {
    scale.value = withSpring(1, animations.spring.gentle);
  }, []);

  const handlePress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress(list._id);
  }, [onPress, list._id]);

  const budget = list.budget ?? 0;
  const actual = list.actualTotal ?? 0;
  const diff = budget - actual;
  const savedMoney = diff > 0 && budget > 0;
  const hasSpendData = budget > 0 && actual > 0;

  const completedDate = list.completedAt
    ? formatShortDate(list.completedAt)
    : formatShortDate(list.createdAt);

  // Collect unique store names from segments, falling back to the list's storeName
  const storeNames: string[] = [];
  if (list.storeSegments && list.storeSegments.length > 0) {
    for (const seg of list.storeSegments) {
      if (!storeNames.includes(seg.storeName)) {
        storeNames.push(seg.storeName);
      }
    }
  } else if (list.storeName) {
    storeNames.push(list.storeName);
  }
  const storeLabel = storeNames.length <= 2
    ? storeNames.join(" | ")
    : `${storeNames[0]} | ${storeNames[1]} | more...`;

  const hasReceipt = !!(list.receiptId || (list.receiptIds && list.receiptIds.length > 0));

  const renderRightActions = useCallback(() => {
    if (!onUseAsTemplate) return null;
    return (
      <View style={styles.swipeAction}>
        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            onUseAsTemplate(list._id, list.name);
          }}
          style={styles.swipeButton}
        >
          <MaterialCommunityIcons name="cart-arrow-right" size={20} color="#fff" />
          <Text style={styles.swipeText}>Shop Again</Text>
        </Pressable>
      </View>
    );
  }, [list._id, list.name, onUseAsTemplate]);

  return (
    <Swipeable
      renderRightActions={renderRightActions}
      overshootRight={false}
      friction={2}
      enabled={!!onUseAsTemplate}
    >
      <Animated.View style={animatedStyle}>
        <Pressable
          onPress={handlePress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
        >
          <GlassCard variant="standard" style={styles.listCard}>
            {/* Header row: icon + name + list number */}
            <View style={styles.listHeader}>
              <View style={styles.listTitleContainer}>
                <MaterialCommunityIcons name="clipboard-check" size={24} color={colors.text.tertiary} />
                <Text style={styles.listName} numberOfLines={1}>
                  {list.name}
                </Text>
              </View>
              {list.listNumber != null && (
                <Text style={styles.listNumberText}>#{list.listNumber}</Text>
              )}
            </View>

            {/* Middle row: compact spending + item count/health dot + points */}
            <View style={styles.middleRow}>
              <View style={styles.middleLeft}>
                {hasSpendData && (
                  <View style={styles.spendRow}>
                    <View style={styles.spendItem}>
                      <MaterialCommunityIcons
                        name={savedMoney ? "arrow-down-circle" : "arrow-up-circle"}
                        size={16}
                        color={savedMoney ? colors.semantic.success : colors.semantic.danger}
                      />
                      <Text style={[styles.spendAmount, { color: savedMoney ? colors.semantic.success : colors.semantic.danger }]}>
                        £{Math.abs(diff).toFixed(2)}
                      </Text>
                    </View>
                    <View style={styles.spendItem}>
                      <MaterialCommunityIcons name="wallet-outline" size={16} color={colors.text.tertiary} />
                      <Text style={styles.spendAmountMuted}>£{actual.toFixed(2)}</Text>
                    </View>
                  </View>
                )}
              </View>

              <View style={styles.middleRight}>
                {/* Points pill (always visible if earned) */}
                {(list.pointsEarned ?? 0) > 0 && (
                  <View style={styles.pointsPill}>
                    <MaterialCommunityIcons name="star" size={12} color={colors.accent.secondary} />
                    <Text style={styles.pointsText}>+{list.pointsEarned}</Text>
                  </View>
                )}

                {/* Item count + health dot */}
                <View style={styles.itemCountContainer}>
                  <Text style={styles.itemCountText}>
                    {list.checkedCount ?? 0}/{list.itemCount ?? 0} items
                  </Text>
                  {list.healthAnalysis?.score != null && (
                    <View style={[styles.healthDot, { backgroundColor: getHealthColor(list.healthAnalysis.score) }]} />
                  )}
                </View>
              </View>
            </View>

            {/* Bottom row: date, store, receipt indicator */}
            <View style={styles.bottomRow}>
              <View style={styles.metaItem}>
                <MaterialCommunityIcons name="calendar" size={14} color={colors.text.tertiary} />
                <Text style={styles.metaText}>{completedDate}</Text>
              </View>
              {storeNames.length > 0 && (
                <View style={styles.metaItem}>
                  <MaterialCommunityIcons name="store" size={14} color={colors.text.tertiary} />
                  <Text style={styles.metaText} numberOfLines={1}>
                    {storeLabel}
                  </Text>
                </View>
              )}
              {hasReceipt && (
                <View style={styles.metaItem}>
                  <MaterialCommunityIcons name="receipt" size={14} color={colors.text.tertiary} />
                </View>
              )}
            </View>
          </GlassCard>
        </Pressable>
      </Animated.View>
    </Swipeable>
  );
}, (prev: any, next: any) => {
  return (
    prev.list._id === next.list._id &&
    prev.list.actualTotal === next.list.actualTotal &&
    prev.list.pointsEarned === next.list.pointsEarned &&
    prev.list.completedAt === next.list.completedAt &&
    prev.list.status === next.list.status &&
    prev.list.storeName === next.list.storeName &&
    prev.list.storeSegments?.length === next.list.storeSegments?.length &&
    prev.list.name === next.list.name &&
    prev.list.listNumber === next.list.listNumber &&
    prev.list.itemCount === next.list.itemCount &&
    prev.list.checkedCount === next.list.checkedCount &&
    prev.onPress === next.onPress &&
    prev.formatDateTime === next.formatDateTime &&
    prev.onUseAsTemplate === next.onUseAsTemplate
  );
});

const styles = StyleSheet.create({
  listCard: { marginBottom: spacing.md },
  listHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  listTitleContainer: { flexDirection: "row", alignItems: "center", flex: 1, gap: spacing.sm },
  listName: { ...typography.headlineSmall, color: colors.text.primary, flex: 1 },
  listNumberText: { ...typography.bodySmall, color: colors.text.tertiary, marginLeft: spacing.sm },
  middleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.sm,
  },
  middleLeft: { flexDirection: "row", alignItems: "center", flex: 1 },
  middleRight: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  spendRow: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  spendItem: { flexDirection: "row", alignItems: "center", gap: 3 },
  spendAmount: { ...typography.bodySmall, fontWeight: "700" },
  spendAmountMuted: { ...typography.bodySmall, color: colors.text.secondary, fontWeight: "600" },
  pointsPill: {
    flexDirection: "row", alignItems: "center", gap: 2,
    paddingHorizontal: spacing.xs, paddingVertical: 2,
    backgroundColor: `${colors.accent.secondary}15`, borderRadius: borderRadius.full,
  },
  pointsText: { ...typography.labelSmall, color: colors.accent.secondary, fontWeight: "600", fontSize: 11 },
  itemCountContainer: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
  itemCountText: { ...typography.bodySmall, color: colors.text.secondary },
  healthDot: { width: 8, height: 8, borderRadius: 4 },
  bottomRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  metaItem: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
  metaText: { ...typography.bodySmall, color: colors.text.tertiary },
  swipeAction: {
    backgroundColor: colors.semantic.success, justifyContent: "center", alignItems: "center",
    width: 120, borderRadius: borderRadius.lg, marginBottom: spacing.md,
  },
  swipeButton: { flex: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: spacing.md },
  swipeText: { ...typography.labelSmall, color: "#fff", fontWeight: "600", marginTop: spacing.xs, textAlign: "center" },
});
