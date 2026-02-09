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

export interface SharedListCardProps {
  list: {
    _id: Id<"shoppingLists">;
    name: string;
    status: string;
    budget?: number;
    createdAt: number;
    role: string;
    ownerName: string;
    itemCount?: number;
    totalEstimatedCost?: number;
  };
  onPress: (id: Id<"shoppingLists">) => void;
  formatDateTime: (timestamp: number) => string;
}

const ROLE_CONFIG: Record<string, { label: string; color: string }> = {
  viewer: { label: "Viewer", color: colors.text.tertiary },
  editor: { label: "Editor", color: colors.accent.primary },
  approver: { label: "Approver", color: colors.accent.secondary },
};

export const SharedListCard = React.memo(function SharedListCard({ list, onPress, formatDateTime }: SharedListCardProps) {
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

  const role = ROLE_CONFIG[list.role] ?? ROLE_CONFIG.viewer;

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
                name="clipboard-account-outline"
                size={24}
                color={colors.accent.info}
              />
              <Text style={styles.listName} numberOfLines={1}>
                {list.name}
              </Text>
            </View>
            <View style={styles.headerActions}>
              <View style={[styles.statusBadge, { backgroundColor: `${role.color}20` }]}>
                <Text style={[styles.statusText, { color: role.color }]}>{role.label}</Text>
              </View>
            </View>
          </View>

          {/* Owner info */}
          <View style={styles.sharedOwnerRow}>
            <MaterialCommunityIcons
              name="account"
              size={14}
              color={colors.text.tertiary}
            />
            <Text style={styles.sharedOwnerText}>
              by {list.ownerName}
            </Text>
          </View>

          {/* Meta row */}
          <View style={styles.metaRow}>
            {list.budget && (
              <View style={styles.metaItem}>
                <MaterialCommunityIcons name="wallet-outline" size={14} color={colors.text.tertiary} />
                <Text style={styles.metaText}>£{list.budget.toFixed(2)}</Text>
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
    prev.list.role === next.list.role &&
    prev.list.ownerName === next.list.ownerName &&
    prev.list.budget === next.list.budget &&
    prev.list.createdAt === next.list.createdAt &&
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
  sharedOwnerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  sharedOwnerText: {
    ...typography.bodySmall,
    color: colors.text.tertiary,
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
