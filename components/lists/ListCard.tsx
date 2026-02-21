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
    listNumber?: number;
    storeName?: string;
    storeSegments?: Array<{ storeId: string; storeName: string; switchedAt: number }>;
  };
  onPress: (id: Id<"shoppingLists">) => void;
  onDelete: (id: Id<"shoppingLists">, name: string) => void;
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

  // Collect unique store names
  const storeNames: string[] = [];
  if (list.storeSegments && list.storeSegments.length > 0) {
    for (const seg of list.storeSegments) {
      if (!storeNames.includes(seg.storeName)) storeNames.push(seg.storeName);
    }
  } else if (list.storeName) {
    storeNames.push(list.storeName);
  }

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
            <Text style={styles.listName} numberOfLines={1}>
              {displayName}
            </Text>
            {list.listNumber != null && (
              <Text style={styles.listNumberText}>#{list.listNumber}</Text>
            )}
          </View>

          {/* Budget + store row */}
          {list.budget != null && list.budget > 0 ? (
            <View style={styles.budgetRow}>
              <View style={styles.budgetLeft}>
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
                    ? ` \u2022 \u00A3${list.totalEstimatedCost.toFixed(2)} est.`
                    : ""}
                </Text>
              </View>
              {storeNames.length > 0 && (
                <View style={styles.storeInfo}>
                  <MaterialCommunityIcons name="store" size={14} color={colors.text.tertiary} />
                  <Text style={styles.metaText} numberOfLines={1}>
                    {storeNames.join(" \u2022 ")}
                  </Text>
                </View>
              )}
            </View>
          ) : storeNames.length > 0 ? (
            <View style={styles.storeRow}>
              <MaterialCommunityIcons name="store" size={14} color={colors.text.tertiary} />
              <Text style={styles.metaText} numberOfLines={1}>
                {storeNames.join(" \u2022 ")}
              </Text>
            </View>
          ) : null}

          {/* Meta row: progress, status badge, delete */}
          <View style={styles.metaRow}>
            <View style={styles.metaLeft}>
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
    prev.list.listNumber === next.list.listNumber &&
    prev.list.storeName === next.list.storeName &&
    prev.list.storeSegments?.length === next.list.storeSegments?.length &&
    prev.onPress === next.onPress &&
    prev.onDelete === next.onDelete
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
  listName: {
    ...typography.headlineSmall,
    color: colors.text.primary,
    flex: 1,
  },
  listNumberText: {
    ...typography.bodySmall,
    color: colors.text.tertiary,
    marginLeft: spacing.sm,
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
    justifyContent: "space-between",
    marginBottom: spacing.sm,
  },
  budgetLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    flex: 1,
  },
  budgetText: {
    ...typography.bodyMedium,
    fontWeight: "600",
  },
  storeInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    flexShrink: 1,
  },
  storeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  metaLeft: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  metaRight: {
    flexDirection: "row",
    alignItems: "center",
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
