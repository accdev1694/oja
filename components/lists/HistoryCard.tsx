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
    storeSegments?: Array<{ storeId: string; storeName: string; switchedAt: number }>;
    listNumber?: number;
  };
  onPress: (id: Id<"shoppingLists">) => void;
  formatDateTime: (timestamp: number) => string;
  onUseAsTemplate?: (id: Id<"shoppingLists">, name: string) => void;
  onEditName?: (id: Id<"shoppingLists">, currentName: string) => void;
  selectable?: boolean;
  selected?: boolean;
  onToggleSelect?: (id: Id<"shoppingLists">) => void;
}

export const HistoryCard = React.memo(function HistoryCard({
  list,
  onPress,
  formatDateTime,
  onUseAsTemplate,
  onEditName,
  selectable,
  selected,
  onToggleSelect,
}: HistoryCardProps) {
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
    if (selectable && onToggleSelect) {
      onToggleSelect(list._id);
    } else {
      onPress(list._id);
    }
  }, [onPress, list._id, selectable, onToggleSelect]);

  const handleEditName = useCallback(() => {
    if (onEditName) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onEditName(list._id, list.name);
    }
  }, [onEditName, list._id, list.name]);

  const budget = list.budget ?? 0;
  const actual = list.actualTotal ?? 0;
  const diff = budget - actual;
  const savedMoney = diff > 0 && budget > 0;

  const formatShortDate = (ts: number) => {
    const d = new Date(ts);
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const yy = String(d.getFullYear()).slice(-2);
    return `${dd}/${mm}/${yy}`;
  };

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
          <MaterialCommunityIcons
            name="content-copy"
            size={20}
            color="#fff"
          />
          <Text style={styles.swipeText}>Use as Template</Text>
        </Pressable>
      </View>
    );
  }, [list._id, list.name, onUseAsTemplate]);

  return (
    <Swipeable
      renderRightActions={renderRightActions}
      overshootRight={false}
      friction={2}
      enabled={!!onUseAsTemplate && !selectable}
    >
      <Animated.View style={animatedStyle}>
        <Pressable
          onPress={handlePress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
        >
          <GlassCard variant="standard" style={[styles.listCard, selected && styles.selectedCard]}>
            {/* Header row */}
            <View style={styles.listHeader}>
              <View style={styles.listTitleContainer}>
                {selectable ? (
                  <MaterialCommunityIcons
                    name={selected ? "check-circle" : "checkbox-blank-circle-outline"}
                    size={24}
                    color={selected ? colors.accent.primary : colors.text.tertiary}
                  />
                ) : (
                  <MaterialCommunityIcons
                    name="clipboard-check"
                    size={24}
                    color={colors.text.tertiary}
                  />
                )}
                <Text style={styles.listName} numberOfLines={1}>
                  {list.name}
                </Text>
              </View>
              {list.listNumber != null && (
                <Text style={styles.listNumberText}>#{list.listNumber}</Text>
              )}
            </View>

            {/* Middle row: savings/spend + status badge */}
            <View style={styles.middleRow}>
              <View style={styles.middleLeft}>
                {budget > 0 && actual > 0 ? (
                  <View style={styles.budgetInfo}>
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
                ) : (list.pointsEarned ?? 0) > 0 ? (
                  <View style={styles.budgetInfo}>
                    <MaterialCommunityIcons name="star" size={14} color={colors.accent.secondary} />
                    <Text style={[styles.metaText, { color: colors.accent.secondary }]}>
                      +{list.pointsEarned} pts
                    </Text>
                  </View>
                ) : null}
              </View>
              <View style={[styles.statusBadge, { backgroundColor: "rgba(255, 255, 255, 0.13)" }]}>
                <Text style={[styles.statusText, { color: colors.text.tertiary }]}>
                  {list.status === "archived" ? "Archived" : "Completed"}
                </Text>
              </View>
            </View>

            {/* Bottom row: number + stores + date */}
            <View style={styles.bottomRow}>
              <View style={styles.bottomLeft}>
                {storeNames.length > 0 && (
                  <View style={styles.metaItem}>
                    <MaterialCommunityIcons name="store" size={14} color={colors.text.tertiary} />
                    <Text style={styles.metaText} numberOfLines={1}>
                      {storeNames.join(" • ")}
                    </Text>
                  </View>
                )}
              </View>
              <View style={styles.metaItem}>
                <MaterialCommunityIcons name="calendar" size={14} color={colors.text.tertiary} />
                <Text style={styles.metaText}>{completedDate}</Text>
              </View>
            </View>
          </GlassCard>
        </Pressable>

        {/* Floating edit badge */}
        {onEditName && !selectable && (
          <Pressable
            onPress={handleEditName}
            style={styles.editBadge}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <MaterialCommunityIcons
              name="pencil"
              size={14}
              color={colors.text.secondary}
            />
          </Pressable>
        )}
      </Animated.View>
    </Swipeable>
  );
}, (prev, next) => {
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
    prev.onPress === next.onPress &&
    prev.formatDateTime === next.formatDateTime &&
    prev.onUseAsTemplate === next.onUseAsTemplate &&
    prev.onEditName === next.onEditName &&
    prev.selectable === next.selectable &&
    prev.selected === next.selected &&
    prev.onToggleSelect === next.onToggleSelect
  );
});

const styles = StyleSheet.create({
  listCard: {
    marginBottom: spacing.md,
  },
  selectedCard: {
    borderColor: colors.accent.primary,
    borderWidth: 1.5,
    backgroundColor: `${colors.accent.primary}10`,
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
  listNumberText: {
    ...typography.bodySmall,
    color: colors.text.tertiary,
    marginLeft: spacing.sm,
  },
  middleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.sm,
  },
  middleLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  budgetInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
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
  budgetText: {
    ...typography.bodyMedium,
    fontWeight: "600",
  },
  bottomRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  bottomLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: spacing.sm,
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
  swipeAction: {
    backgroundColor: colors.semantic.success,
    justifyContent: "center",
    alignItems: "center",
    width: 120,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.md,
  },
  swipeButton: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: spacing.md,
  },
  swipeText: {
    ...typography.labelSmall,
    color: "#fff",
    fontWeight: "600",
    marginTop: spacing.xs,
    textAlign: "center",
  },
  editBadge: {
    position: "absolute",
    top: -8,
    right: -8,
    backgroundColor: "rgba(255, 255, 255, 0.12)",
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.25)",
  },
});
