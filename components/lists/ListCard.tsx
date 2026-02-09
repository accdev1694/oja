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
import { getRelativeListName } from "@/lib/list/helpers";

export interface ListCardProps {
  list: {
    _id: Id<"shoppingLists">;
    name: string;
    status: string;
    budget?: number;
    createdAt: number;
    itemCount?: number;
    totalEstimatedCost?: number;
  };
  onPress: (id: Id<"shoppingLists">) => void;
  onDelete: (id: Id<"shoppingLists">, name: string) => void;
  formatDateTime: (timestamp: number) => string;
}

const STATUS_CONFIG = {
  planning: { color: colors.accent.primary, label: "Planning" },
  shopping: { color: colors.semantic.warning, label: "Shopping" },
  completed: { color: colors.text.tertiary, label: "Completed" },
} as const;

export const ListCard = React.memo(function ListCard({ list, onPress, onDelete, formatDateTime }: ListCardProps) {
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

  const handleDelete = useCallback(() => {
    onDelete(list._id, list.name);
  }, [onDelete, list._id, list.name]);

  const displayName = getRelativeListName(list.createdAt, list.name);

  const budgetStatus =
    list.budget && list.totalEstimatedCost
      ? list.totalEstimatedCost > list.budget
        ? "exceeded"
        : list.totalEstimatedCost > list.budget * 0.8
          ? "caution"
          : "healthy"
      : "healthy";

  const status = STATUS_CONFIG[list.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.planning;

  return (
    <Animated.View style={animatedStyle}>
      <Pressable onPress={handlePress} onPressIn={handlePressIn} onPressOut={handlePressOut}>
        <GlassCard variant="standard" style={styles.listCard}>
          {/* Header row */}
          <View style={styles.listHeader}>
            <View style={styles.listTitleContainer}>
              <MaterialCommunityIcons
                name="clipboard-list"
                size={24}
                color={colors.semantic.lists}
              />
              <Text style={styles.listName} numberOfLines={1}>
                {displayName}
              </Text>
            </View>

            <View style={styles.headerActions}>
              <View style={[styles.statusBadge, { backgroundColor: `${status.color}20` }]}>
                <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
              </View>

              <Pressable
                style={styles.deleteButton}
                onPress={handleDelete}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <MaterialCommunityIcons
                  name="trash-can-outline"
                  size={20}
                  color={colors.semantic.danger}
                />
              </Pressable>
            </View>
          </View>

          {/* Budget info */}
          {list.budget && (
            <View style={styles.budgetRow}>
              <MaterialCommunityIcons
                name="wallet-outline"
                size={16}
                color={
                  budgetStatus === "exceeded"
                    ? colors.semantic.danger
                    : budgetStatus === "caution"
                      ? colors.semantic.warning
                      : colors.accent.primary
                }
              />
              <Text
                style={[
                  styles.budgetText,
                  {
                    color:
                      budgetStatus === "exceeded"
                        ? colors.semantic.danger
                        : budgetStatus === "caution"
                          ? colors.semantic.warning
                          : colors.accent.primary,
                  },
                ]}
              >
                £{list.budget.toFixed(2)} budget
                {list.totalEstimatedCost
                  ? ` • £${list.totalEstimatedCost.toFixed(2)} estimated`
                  : ""}
              </Text>
            </View>
          )}

          {/* Item count and date */}
          <View style={styles.metaRow}>
            {list.itemCount !== undefined && (
              <View style={styles.metaItem}>
                <MaterialCommunityIcons
                  name="format-list-checks"
                  size={14}
                  color={colors.text.tertiary}
                />
                <Text style={styles.metaText}>
                  {list.itemCount} item{list.itemCount !== 1 ? "s" : ""}
                </Text>
              </View>
            )}
            <View style={styles.metaItem}>
              <MaterialCommunityIcons name="clock-outline" size={14} color={colors.text.tertiary} />
              <Text style={styles.metaText}>{formatDateTime(list.createdAt)}</Text>
            </View>
          </View>
        </GlassCard>
      </Pressable>
    </Animated.View>
  );
}, (prev, next) => {
  return (
    prev.list._id === next.list._id &&
    prev.list.status === next.list.status &&
    prev.list.budget === next.list.budget &&
    prev.list.itemCount === next.list.itemCount &&
    prev.list.totalEstimatedCost === next.list.totalEstimatedCost &&
    prev.list.createdAt === next.list.createdAt &&
    prev.list.name === next.list.name &&
    prev.onPress === next.onPress &&
    prev.onDelete === next.onDelete &&
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
  deleteButton: {
    padding: spacing.xs,
    borderRadius: borderRadius.sm,
    backgroundColor: `${colors.semantic.danger}15`,
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
