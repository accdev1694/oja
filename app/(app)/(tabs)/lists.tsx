import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  Pressable,
} from "react-native";
import { useRouter } from "expo-router";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useState } from "react";
import { Id } from "@/convex/_generated/dataModel";
import * as Haptics from "expo-haptics";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";

import {
  GlassScreen,
  GlassCard,
  GlassButton,
  SimpleHeader,
  SkeletonCard,
  EmptyLists,
  colors,
  typography,
  spacing,
  animations,
} from "@/components/ui/glass";

export default function ListsScreen() {
  const router = useRouter();
  const lists = useQuery(api.shoppingLists.getActive);
  const createList = useMutation(api.shoppingLists.create);
  const deleteList = useMutation(api.shoppingLists.remove);
  const [isCreating, setIsCreating] = useState(false);

  function formatDateTime(timestamp: number) {
    const date = new Date(timestamp);
    return `${date.toLocaleDateString()} at ${date.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    })}`;
  }

  function handleDeleteList(listId: Id<"shoppingLists">, listName: string) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert("Delete List", `Are you sure you want to delete "${listName}"?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteList({ id: listId });
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          } catch (error) {
            console.error("Failed to delete list:", error);
            Alert.alert("Error", "Failed to delete shopping list");
          }
        },
      },
    ]);
  }

  async function handleCreateList() {
    setIsCreating(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      const listName = `Shopping List ${new Date().toLocaleDateString()}`;
      const listId = await createList({
        name: listName,
        budget: 50, // Default budget of £50
        budgetLocked: false,
      });

      router.push(`/list/${listId}`);
    } catch (error) {
      console.error("Failed to create list:", error);
      Alert.alert("Error", "Failed to create shopping list");
    } finally {
      setIsCreating(false);
    }
  }

  // Loading state with skeletons
  if (lists === undefined) {
    return (
      <GlassScreen>
        <SimpleHeader title="Shopping Lists" subtitle="Loading..." />
        <View style={styles.skeletonContainer}>
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </View>
      </GlassScreen>
    );
  }

  return (
    <GlassScreen>
      {/* Header with New List button */}
      <SimpleHeader
        title="Shopping Lists"
        subtitle={lists.length > 0 ? `${lists.length} active list${lists.length !== 1 ? "s" : ""}` : undefined}
        rightElement={
          <GlassButton
            variant="primary"
            size="sm"
            icon="plus"
            onPress={handleCreateList}
            loading={isCreating}
            disabled={isCreating}
          >
            New List
          </GlassButton>
        }
      />

      {/* Empty state */}
      {lists.length === 0 ? (
        <View style={styles.emptyContainer}>
          <EmptyLists
            onAction={handleCreateList}
            actionText="Create Your First List"
          />
        </View>
      ) : (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {lists.map((list) => (
            <ListCard
              key={list._id}
              list={list}
              onPress={() => router.push(`/list/${list._id}`)}
              onDelete={() => handleDeleteList(list._id, list.name)}
              formatDateTime={formatDateTime}
            />
          ))}

          {/* Bottom spacing for tab bar */}
          <View style={styles.bottomSpacer} />
        </ScrollView>
      )}
    </GlassScreen>
  );
}

// =============================================================================
// LIST CARD COMPONENT
// =============================================================================

interface ListCardProps {
  list: {
    _id: Id<"shoppingLists">;
    name: string;
    status: string;
    budget?: number;
    createdAt: number;
    itemCount?: number;
    totalEstimatedCost?: number;
  };
  onPress: () => void;
  onDelete: () => void;
  formatDateTime: (timestamp: number) => string;
}

// Generate friendly relative time name for list display
function getRelativeListName(createdAt: number, customName?: string): string {
  // If user has set a custom name (not the default pattern), use it
  const defaultPattern = /^Shopping List\s+\d{1,2}\/\d{1,2}\/\d{2,4}$/;
  if (customName && !defaultPattern.test(customName)) {
    return customName;
  }

  const now = new Date();
  const created = new Date(createdAt);

  // Reset times to midnight for date comparison
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const createdDay = new Date(created.getFullYear(), created.getMonth(), created.getDate());

  const diffTime = today.getTime() - createdDay.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return "Today's Shop";
  }

  if (diffDays === 1) {
    return "Yesterday's Shop";
  }

  // Within this week (2-6 days ago)
  if (diffDays < 7) {
    const dayName = created.toLocaleDateString("en-GB", { weekday: "long" });
    return `${dayName}'s Shop`;
  }

  // Last week (7-13 days ago)
  if (diffDays < 14) {
    return "Last Week";
  }

  // Older - show short date like "Jan 15"
  return created.toLocaleDateString("en-GB", { month: "short", day: "numeric" });
}

function ListCard({ list, onPress, onDelete, formatDateTime }: ListCardProps) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.98, animations.spring.stiff);
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, animations.spring.gentle);
  };

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  };

  const handleDelete = () => {
    onDelete();
  };

  // Get friendly relative time name (e.g., "Today's Shop", "Yesterday's Shop")
  const displayName = getRelativeListName(list.createdAt, list.name);

  // Calculate budget status
  const budgetStatus =
    list.budget && list.totalEstimatedCost
      ? list.totalEstimatedCost > list.budget
        ? "exceeded"
        : list.totalEstimatedCost > list.budget * 0.8
          ? "caution"
          : "healthy"
      : "healthy";

  const statusConfig = {
    planning: { color: colors.accent.primary, label: "Planning" },
    shopping: { color: colors.semantic.warning, label: "Shopping" },
    completed: { color: colors.text.tertiary, label: "Completed" },
  };

  const status = statusConfig[list.status as keyof typeof statusConfig] || statusConfig.planning;

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
              {/* Status badge */}
              <View style={[styles.statusBadge, { backgroundColor: `${status.color}20` }]}>
                <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
              </View>

              {/* Delete button */}
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
}

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
  skeletonContainer: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    gap: spacing.md,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: spacing.xl,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  bottomSpacer: {
    height: 100, // Space for tab bar
  },
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
    borderRadius: 12,
  },
  statusText: {
    ...typography.labelSmall,
    fontWeight: "600",
  },
  deleteButton: {
    padding: spacing.xs,
    borderRadius: 8,
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
