import React, { useCallback, useEffect } from "react";
import { View, Text, Pressable, StyleSheet, ViewStyle } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withRepeat,
  withTiming,
  Easing,
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

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ListStatus = "active" | "shopping" | "completed" | "archived";

export interface ListCardProps {
  list: {
    _id: Id<"shoppingLists">;
    name: string;
    status: string;
    budget?: number;
    createdAt: number;
    itemCount?: number;
    checkedCount?: number;
    totalEstimatedCost?: number;
    shoppingStartedAt?: number;
    pausedAt?: number;
    actualTotal?: number;
  };
  onPress: (id: Id<"shoppingLists">) => void;
  onDelete: (id: Id<"shoppingLists">, name: string) => void;
  formatDateTime: (timestamp: number) => string;
}

// ---------------------------------------------------------------------------
// Status configuration
// ---------------------------------------------------------------------------

interface StatusEntry {
  color: string;
  label: string;
  icon?: React.ComponentProps<typeof MaterialCommunityIcons>["name"];
}

function getStatusConfig(list: ListCardProps["list"]): StatusEntry {
  const status = list.status as ListStatus;

  if (status === "shopping") {
    return { color: colors.semantic.scan, label: "Shopping", icon: "cart-outline" };
  }

  if (status === "active" && list.shoppingStartedAt && list.pausedAt) {
    return { color: colors.accent.warning, label: "Paused", icon: "pause-circle-outline" };
  }

  if (status === "completed" || status === "archived") {
    return { color: colors.text.tertiary, label: "Completed", icon: "check-circle-outline" };
  }

  // Default: active without shoppingStartedAt = Planning
  return { color: colors.accent.primary, label: "Planning", icon: "clipboard-edit-outline" };
}

// ---------------------------------------------------------------------------
// Pulse dot for active shopping trips
// ---------------------------------------------------------------------------

const PulseDot = React.memo(function PulseDot({ color }: { color: string }) {
  const opacity = useSharedValue(1);

  useEffect(() => {
    opacity.value = withRepeat(
      withTiming(0.3, { duration: 800, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
  }, [opacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        {
          width: 6,
          height: 6,
          borderRadius: 3,
          backgroundColor: color,
        },
        animatedStyle,
      ]}
    />
  );
});

// ---------------------------------------------------------------------------
// Budget mini-bar
// ---------------------------------------------------------------------------

function BudgetMiniBar({
  budget,
  spent,
}: {
  budget: number;
  spent: number;
}) {
  const ratio = Math.min(spent / budget, 1);
  const isOver = spent > budget;

  return (
    <View style={miniBarStyles.track}>
      <View
        style={[
          miniBarStyles.fill,
          {
            width: `${ratio * 100}%` as ViewStyle["width"],
            backgroundColor: isOver ? colors.semantic.danger : colors.accent.primary,
          },
        ]}
      />
    </View>
  );
}

const miniBarStyles = StyleSheet.create({
  track: {
    height: 3,
    borderRadius: 1.5,
    backgroundColor: "rgba(255,255,255,0.1)",
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
    overflow: "hidden",
  },
  fill: {
    height: 3,
    borderRadius: 1.5,
  },
});

// ---------------------------------------------------------------------------
// Progress text helper
// ---------------------------------------------------------------------------

function getProgressText(list: ListCardProps["list"]): string | null {
  const status = list.status as ListStatus;
  const total = list.itemCount ?? 0;
  const checked = list.checkedCount ?? 0;

  if (status === "shopping") {
    return `${checked}/${total} items`;
  }

  if (status === "active" && list.shoppingStartedAt && list.pausedAt) {
    return `${checked}/${total} checked`;
  }

  if ((status === "completed" || status === "archived") && list.actualTotal != null) {
    return `\u00A3${list.actualTotal.toFixed(2)}`;
  }

  if (total > 0 && status === "active") {
    return `${total} item${total !== 1 ? "s" : ""}`;
  }

  return null;
}

// ---------------------------------------------------------------------------
// ListCard
// ---------------------------------------------------------------------------

export const ListCard = React.memo(function ListCard({
  list,
  onPress,
  onDelete,
  formatDateTime,
}: ListCardProps) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = useCallback(() => {
    scale.value = withSpring(0.98, animations.spring.stiff);
  }, [scale]);

  const handlePressOut = useCallback(() => {
    scale.value = withSpring(1, animations.spring.gentle);
  }, [scale]);

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

  const statusConfig = getStatusConfig(list);
  const progressText = getProgressText(list);
  const isShopping = (list.status as ListStatus) === "shopping";
  const isPaused =
    (list.status as ListStatus) === "active" &&
    !!list.shoppingStartedAt &&
    !!list.pausedAt;

  // Show budget mini-bar for active/shopping states that have a budget
  const showMiniBar =
    list.budget != null &&
    list.budget > 0 &&
    ((list.status as ListStatus) === "active" ||
      (list.status as ListStatus) === "shopping");

  const spent = list.totalEstimatedCost ?? 0;

  // Paused state gets a subtle amber left border
  const cardBorderStyle: ViewStyle | undefined = isPaused
    ? { borderLeftWidth: 3, borderLeftColor: colors.accent.warning }
    : undefined;

  return (
    <Animated.View style={animatedStyle}>
      <Pressable
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
      >
        <GlassCard
          variant="standard"
          style={[styles.listCard, cardBorderStyle]}
        >
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
          </View>

          {/* Budget mini-bar */}
          {showMiniBar && list.budget != null && (
            <BudgetMiniBar budget={list.budget} spent={spent} />
          )}

          {/* Budget info */}
          {list.budget != null && list.budget > 0 && (
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
                {"\u00A3"}{list.budget.toFixed(2)} budget
                {list.totalEstimatedCost
                  ? ` \u2022 \u00A3${list.totalEstimatedCost.toFixed(2)} estimated`
                  : ""}
              </Text>
            </View>
          )}

          {/* Meta row: date, progress, status badge, delete */}
          <View style={styles.metaRow}>
            <View style={styles.metaLeft}>
              <View style={styles.metaItem}>
                <MaterialCommunityIcons
                  name="clock-outline"
                  size={14}
                  color={colors.text.tertiary}
                />
                <Text style={styles.metaText}>
                  {formatDateTime(list.createdAt)}
                </Text>
              </View>
              {progressText && (
                <View style={styles.metaItem}>
                  <MaterialCommunityIcons
                    name={
                      isShopping || isPaused
                        ? "checkbox-marked-circle-outline"
                        : "format-list-bulleted"
                    }
                    size={14}
                    color={statusConfig.color}
                  />
                  <Text
                    style={[styles.metaText, { color: statusConfig.color }]}
                  >
                    {progressText}
                  </Text>
                </View>
              )}
            </View>

            {/* Status badge */}
            <View
              style={[
                styles.statusBadge,
                { backgroundColor: `${statusConfig.color}20` },
              ]}
            >
              {isShopping && <PulseDot color={statusConfig.color} />}
              <Text
                style={[styles.statusText, { color: statusConfig.color }]}
              >
                {statusConfig.label}
              </Text>
            </View>

            <View style={styles.metaRight}>
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
    prev.list.checkedCount === next.list.checkedCount &&
    prev.list.totalEstimatedCost === next.list.totalEstimatedCost &&
    prev.list.shoppingStartedAt === next.list.shoppingStartedAt &&
    prev.list.pausedAt === next.list.pausedAt &&
    prev.list.actualTotal === next.list.actualTotal &&
    prev.list.createdAt === next.list.createdAt &&
    prev.list.name === next.list.name &&
    prev.onPress === next.onPress &&
    prev.onDelete === next.onDelete &&
    prev.formatDateTime === next.formatDateTime
  );
});

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

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
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
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
  },
  metaLeft: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  metaRight: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
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
