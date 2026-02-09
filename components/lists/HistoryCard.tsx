import React, { useCallback } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { Id } from "@/convex/_generated/dataModel";
import {
  GlassCard,
  colors,
  typography,
  spacing,
  borderRadius,
  animations,
} from "@/components/ui/glass";

export interface HistoryCardProps {
  list: {
    _id: Id<"shoppingLists">;
    name: string;
    status: string;
    budget?: number;
    actualTotal?: number;
    pointsEarned?: number;
    completedAt?: number;
    createdAt: number;
    storeName?: string;
  };
  onPress: (id: Id<"shoppingLists">) => void;
  formatDateTime: (timestamp: number) => string;
}

export const HistoryCard = React.memo(function HistoryCard({ list, onPress, formatDateTime }: HistoryCardProps) {
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
  const completedDate = list.completedAt
    ? new Date(list.completedAt).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : formatDateTime(list.createdAt);

  return (
    <Animated.View style={animatedStyle}>
      <Pressable
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
      >
        <GlassCard variant="standard" style={styles.listCard}>
          {/* Header row */}
          <View style={styles.listHeader}>
            <View style={styles.listTitleContainer}>
              <MaterialCommunityIcons
                name="clipboard-check"
                size={24}
                color={colors.text.tertiary}
              />
              <Text style={styles.listName} numberOfLines={1}>
                {list.name}
              </Text>
            </View>
            <View style={styles.headerActions}>
              <View style={[styles.statusBadge, { backgroundColor: `${colors.text.tertiary}20` }]}>
                <Text style={[styles.statusText, { color: colors.text.tertiary }]}>
                  {list.status === "archived" ? "Archived" : "Completed"}
                </Text>
              </View>
            </View>
          </View>

          {/* Savings or overspend */}
          {budget > 0 && actual > 0 && (
            <View style={styles.budgetRow}>
              <MaterialCommunityIcons
                name={savedMoney ? "trending-down" : "trending-up"}
                size={16}
                color={savedMoney ? colors.semantic.success : colors.semantic.danger}
              />
              <Text
                style={[
                  styles.budgetText,
                  { color: savedMoney ? colors.semantic.success : colors.semantic.danger },
                ]}
              >
                {savedMoney
                  ? `Saved £${Math.abs(diff).toFixed(2)}`
                  : `Over by £${Math.abs(diff).toFixed(2)}`}
                {` • £${actual.toFixed(2)} spent`}
              </Text>
            </View>
          )}

          {/* Meta row */}
          <View style={styles.metaRow}>
            <View style={styles.metaItem}>
              <MaterialCommunityIcons name="calendar" size={14} color={colors.text.tertiary} />
              <Text style={styles.metaText}>{completedDate}</Text>
            </View>
            {list.storeName && (
              <View style={styles.metaItem}>
                <MaterialCommunityIcons name="store" size={14} color={colors.text.tertiary} />
                <Text style={styles.metaText}>{list.storeName}</Text>
              </View>
            )}
            {(list.pointsEarned ?? 0) > 0 && (
              <View style={styles.metaItem}>
                <MaterialCommunityIcons name="star" size={14} color={colors.accent.secondary} />
                <Text style={[styles.metaText, { color: colors.accent.secondary }]}>
                  +{list.pointsEarned} pts
                </Text>
              </View>
            )}
          </View>
        </GlassCard>
      </Pressable>
    </Animated.View>
  );
}, (prev, next) => {
  return (
    prev.list._id === next.list._id &&
    prev.list.actualTotal === next.list.actualTotal &&
    prev.list.pointsEarned === next.list.pointsEarned &&
    prev.list.completedAt === next.list.completedAt &&
    prev.list.status === next.list.status &&
    prev.list.storeName === next.list.storeName &&
    prev.list.name === next.list.name &&
    prev.onPress === next.onPress &&
    prev.formatDateTime === next.formatDateTime
  );
});

const styles = StyleSheet.create({
  listCard: {
    marginBottom: spacing.md,
  },
  listHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  listTitleContainer: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: spacing.sm,
  },
  listName: {
    ...typography.headlineSmall,
    color: colors.text.primary,
    flex: 1,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.md,
  },
  statusText: {
    ...typography.labelSmall,
    fontWeight: "600",
  },
  budgetRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  budgetText: {
    ...typography.bodyMedium,
    fontWeight: "600",
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  metaText: {
    ...typography.bodySmall,
    color: colors.text.tertiary,
  },
});
