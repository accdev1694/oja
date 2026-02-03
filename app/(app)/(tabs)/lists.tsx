import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
} from "react-native";
import { useRouter } from "expo-router";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useState, useCallback } from "react";
import { Id } from "@/convex/_generated/dataModel";
import * as Haptics from "expo-haptics";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  interpolateColor,
} from "react-native-reanimated";

import {
  GlassScreen,
  GlassCard,
  GlassButton,
  SimpleHeader,
  SkeletonCard,
  EmptyLists,
  GlassModal,
  TrialNudgeBanner,
  colors,
  typography,
  spacing,
  borderRadius,
  animations,
  useGlassAlert,
} from "@/components/ui/glass";
import { NotificationDropdown } from "@/components/partners";

type TabMode = "active" | "history";

export default function ListsScreen() {
  const router = useRouter();
  const { alert } = useGlassAlert();
  const [tabMode, setTabMode] = useState<TabMode>("active");
  const lists = useQuery(api.shoppingLists.getActive);
  const history = useQuery(api.shoppingLists.getHistory);
  const sharedLists = useQuery(api.partners.getSharedLists);
  const createList = useMutation(api.shoppingLists.create);
  const deleteList = useMutation(api.shoppingLists.remove);
  const [isCreating, setIsCreating] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  // Create list modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newListName, setNewListName] = useState("");
  const [newListBudget, setNewListBudget] = useState("50");

  // Sliding pill animation: 0 = active (left), 1 = history (right)
  const tabProgress = useSharedValue(0);
  const tabPillWidth = useSharedValue(0);

  const onTabContainerLayout = useCallback((e: { nativeEvent: { layout: { width: number } } }) => {
    tabPillWidth.value = (e.nativeEvent.layout.width - 8) / 2;
  }, []);

  const slidingPillStyle = useAnimatedStyle(() => {
    return {
      width: tabPillWidth.value,
      transform: [{ translateX: tabProgress.value * tabPillWidth.value }],
      backgroundColor: interpolateColor(
        tabProgress.value,
        [0, 1],
        [`${colors.accent.primary}25`, `${colors.accent.primary}25`]
      ),
    };
  });

  const handleTabSwitch = (mode: TabMode) => {
    if (mode === tabMode) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setTabMode(mode);
    tabProgress.value = withSpring(mode === "history" ? 1 : 0, {
      damping: 18,
      stiffness: 180,
    });
  };

  function formatDateTime(timestamp: number) {
    const date = new Date(timestamp);
    return `${date.toLocaleDateString()} at ${date.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    })}`;
  }

  function handleDeleteList(listId: Id<"shoppingLists">, listName: string) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    alert("Delete List", `Are you sure you want to delete "${listName}"?`, [
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
            alert("Error", "Failed to delete shopping list");
          }
        },
      },
    ]);
  }

  function handleOpenCreateModal() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    // Set default name based on date
    setNewListName(`Shopping List ${new Date().toLocaleDateString()}`);
    setNewListBudget("50");
    setShowCreateModal(true);
  }

  function handleCloseCreateModal() {
    setShowCreateModal(false);
    setNewListName("");
    setNewListBudget("50");
  }

  async function handleCreateList() {
    if (!newListName.trim()) {
      alert("Error", "Please enter a list name");
      return;
    }

    const budget = parseFloat(newListBudget) || 0;
    if (budget < 0) {
      alert("Error", "Budget cannot be negative");
      return;
    }

    setIsCreating(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const listId = await createList({
        name: newListName.trim(),
        budget: budget > 0 ? budget : undefined,
      });

      handleCloseCreateModal();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.push(`/list/${listId}`);
    } catch (error: any) {
      console.error("Failed to create list:", error);
      const msg = error?.message ?? error?.data ?? "";
      if (msg.includes("limit") || msg.includes("Upgrade") || msg.includes("Premium")) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        alert(
          "List Limit Reached",
          "Free plan allows up to 3 active lists. Upgrade to Premium for unlimited lists.",
          [
            { text: "Maybe Later", style: "cancel" },
            { text: "Upgrade", onPress: () => router.push("/(app)/subscription") },
          ]
        );
      } else {
        alert("Error", "Failed to create shopping list");
      }
    } finally {
      setIsCreating(false);
    }
  }

  const currentData = tabMode === "active" ? lists : history;
  const isLoaded = currentData !== undefined;
  const displayList = currentData ?? [];
  const activeShared = sharedLists?.filter((l) => l && l.status !== "archived" && l.status !== "completed") ?? [];
  const hasAnyActiveLists = displayList.length > 0 || activeShared.length > 0;

  return (
    <GlassScreen>
      {/* Header with New List button */}
      <SimpleHeader
        title="Shopping Lists"
        accentColor={colors.semantic.lists}
        subtitle={
          tabMode === "active"
            ? lists && lists.length > 0
              ? `${lists.length} active list${lists.length !== 1 ? "s" : ""}`
              : undefined
            : history && history.length > 0
              ? `${history.length} past trip${history.length !== 1 ? "s" : ""}`
              : undefined
        }
        rightElement={
          tabMode === "active" ? (
            <GlassButton
              variant="primary"
              size="sm"
              icon="plus"
              onPress={handleOpenCreateModal}
            >
              New List
            </GlassButton>
          ) : undefined
        }
      />

      {/* Tab Toggle */}
      <View style={styles.tabContainer} onLayout={onTabContainerLayout}>
        <Animated.View style={[styles.slidingPill, slidingPillStyle]} />
        <Pressable
          style={styles.tab}
          onPress={() => handleTabSwitch("active")}
        >
          <MaterialCommunityIcons
            name="clipboard-list"
            size={16}
            color={tabMode === "active" ? colors.accent.primary : colors.text.tertiary}
          />
          <Text style={[styles.tabText, tabMode === "active" && styles.tabTextActive]}>
            Active
          </Text>
        </Pressable>
        <Pressable
          style={styles.tab}
          onPress={() => handleTabSwitch("history")}
        >
          <MaterialCommunityIcons
            name="history"
            size={16}
            color={tabMode === "history" ? colors.accent.primary : colors.text.tertiary}
          />
          <Text style={[styles.tabText, tabMode === "history" && styles.tabTextActive]}>
            History
          </Text>
          {history && history.length > 0 && (
            <View style={styles.tabBadge}>
              <Text style={styles.tabBadgeText}>{history.length}</Text>
            </View>
          )}
        </Pressable>
      </View>

      {/* Trial Nudge Banner */}
      <TrialNudgeBanner />

      {/* Content */}
      {!isLoaded ? (
        <View style={styles.skeletonContainer}>
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </View>
      ) : tabMode === "active" && !hasAnyActiveLists ? (
        <View style={styles.emptyContainer}>
          <EmptyLists
            onAction={handleOpenCreateModal}
            actionText="Create Your First List"
          />
        </View>
      ) : tabMode === "history" && displayList.length === 0 ? (
        <View style={styles.emptyContainer}>
          <View style={styles.emptyHistoryContainer}>
            <MaterialCommunityIcons
              name="clipboard-check-outline"
              size={64}
              color={colors.text.tertiary}
            />
            <Text style={styles.emptyHistoryTitle}>No trips yet</Text>
            <Text style={styles.emptyHistorySubtitle}>
              Complete a shopping trip and it'll show up here — great for tracking your spending over time.
            </Text>
          </View>
        </View>
      ) : tabMode === "active" ? (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {displayList.map((list) => (
            <ListCard
              key={list._id}
              list={list}
              onPress={() => router.push(`/list/${list._id}`)}
              onDelete={() => handleDeleteList(list._id, list.name)}
              formatDateTime={formatDateTime}
            />
          ))}

          {/* Shared With Me section */}
          {activeShared.length > 0 && (
            <>
              <View style={styles.sharedSectionHeader}>
                <MaterialCommunityIcons
                  name="account-group"
                  size={18}
                  color={colors.text.secondary}
                />
                <Text style={styles.sharedSectionTitle}>Shared With Me</Text>
              </View>
              {activeShared.map((list) =>
                list ? (
                  <SharedListCard
                    key={list._id}
                    list={list}
                    onPress={() => router.push(`/list/${list._id}`)}
                    formatDateTime={formatDateTime}
                  />
                ) : null
              )}
            </>
          )}

          {/* Join a shared list — inline card */}
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push("/join-list");
            }}
          >
            <GlassCard variant="bordered" style={styles.joinCard}>
              <View style={styles.joinCardContent}>
                <MaterialCommunityIcons
                  name="account-group-outline"
                  size={22}
                  color={colors.text.tertiary}
                />
                <Text style={styles.joinCardText}>Join a shared list</Text>
                <MaterialCommunityIcons
                  name="chevron-right"
                  size={20}
                  color={colors.text.tertiary}
                />
              </View>
            </GlassCard>
          </Pressable>

          <View style={styles.bottomSpacer} />
        </ScrollView>
      ) : (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {displayList.map((list) => (
            <HistoryCard
              key={list._id}
              list={list}
              onPress={() => router.push(`/trip-summary?id=${list._id}`)}
              formatDateTime={formatDateTime}
            />
          ))}
          <View style={styles.bottomSpacer} />
        </ScrollView>
      )}

      {/* Notifications Dropdown */}
      <NotificationDropdown
        visible={showNotifications}
        onClose={() => setShowNotifications(false)}
      />

      {/* Create List Modal */}
      <GlassModal
        visible={showCreateModal}
        onClose={handleCloseCreateModal}
        overlayOpacity={0.75}
        maxWidth={360}
        avoidKeyboard
      >
        {/* Modal Header */}
        <View style={styles.modalHeader}>
          <View style={styles.modalHeaderLeft}>
            <MaterialCommunityIcons
              name="clipboard-plus-outline"
              size={24}
              color={colors.accent.primary}
            />
            <Text style={styles.modalTitle}>Create New List</Text>
          </View>
        </View>

        {/* List Name Input */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>List Name</Text>
          <View style={styles.inputContainer}>
            <MaterialCommunityIcons name="clipboard-list" size={20} color={colors.text.tertiary} />
            <TextInput
              style={styles.textInput}
              value={newListName}
              onChangeText={setNewListName}
              placeholder="e.g., Weekly Shop"
              placeholderTextColor={colors.text.tertiary}
              autoFocus
            />
          </View>
        </View>

        {/* Budget Input */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Budget (£)</Text>
          <View style={styles.inputContainer}>
            <MaterialCommunityIcons name="wallet-outline" size={20} color={colors.text.tertiary} />
            <TextInput
              style={styles.textInput}
              value={newListBudget}
              onChangeText={setNewListBudget}
              placeholder="50"
              placeholderTextColor={colors.text.tertiary}
              keyboardType="decimal-pad"
            />
          </View>
          <Text style={styles.inputHint}>
            Set to 0 for no budget tracking
          </Text>
        </View>

        {/* Action Buttons */}
        <View style={styles.modalActions}>
          <GlassButton
            variant="secondary"
            size="md"
            onPress={handleCloseCreateModal}
            style={styles.modalButton}
          >
            Cancel
          </GlassButton>
          <GlassButton
            variant="primary"
            size="md"
            icon="plus"
            onPress={handleCreateList}
            loading={isCreating}
            disabled={isCreating}
            style={styles.modalButton}
          >
            Create List
          </GlassButton>
        </View>
      </GlassModal>
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
// HISTORY CARD COMPONENT
// =============================================================================

interface HistoryCardProps {
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
  onPress: () => void;
  formatDateTime: (timestamp: number) => string;
}

function HistoryCard({ list, onPress, formatDateTime }: HistoryCardProps) {
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
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onPress();
        }}
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
}

// =============================================================================
// SHARED LIST CARD COMPONENT
// =============================================================================

interface SharedListCardProps {
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
  onPress: () => void;
  formatDateTime: (timestamp: number) => string;
}

function SharedListCard({ list, onPress, formatDateTime }: SharedListCardProps) {
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

  const roleConfig: Record<string, { label: string; color: string }> = {
    viewer: { label: "Viewer", color: colors.text.tertiary },
    editor: { label: "Editor", color: colors.accent.primary },
    approver: { label: "Approver", color: colors.accent.secondary },
  };

  const role = roleConfig[list.role] ?? roleConfig.viewer;

  return (
    <Animated.View style={animatedStyle}>
      <Pressable
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onPress();
        }}
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
    height: 140,
  },
  joinCard: {
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  joinCardContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  joinCardText: {
    ...typography.bodyMedium,
    color: colors.text.secondary,
    flex: 1,
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

  // Tab toggle
  tabContainer: {
    flexDirection: "row",
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    backgroundColor: colors.glass.background,
    borderRadius: borderRadius.lg,
    padding: 4,
    borderWidth: 1,
    borderColor: colors.glass.border,
    overflow: "hidden",
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
  },
  slidingPill: {
    position: "absolute",
    top: 4,
    bottom: 4,
    left: 4,
    borderRadius: borderRadius.md,
  },
  tabText: {
    ...typography.labelMedium,
    color: colors.text.tertiary,
  },
  tabTextActive: {
    color: colors.accent.primary,
    fontWeight: "600",
  },
  tabBadge: {
    backgroundColor: colors.accent.primary,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 6,
  },
  tabBadgeText: {
    ...typography.labelSmall,
    color: colors.text.primary,
    fontWeight: "700",
    fontSize: 11,
  },

  // Empty history
  emptyHistoryContainer: {
    alignItems: "center",
    gap: spacing.md,
  },
  emptyHistoryTitle: {
    ...typography.headlineMedium,
    color: colors.text.secondary,
  },
  emptyHistorySubtitle: {
    ...typography.bodyMedium,
    color: colors.text.tertiary,
    textAlign: "center",
    lineHeight: 22,
  },

  // Shared lists section
  sharedSectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.glass.border,
  },
  sharedSectionTitle: {
    ...typography.labelMedium,
    color: colors.text.secondary,
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

  // Modal styles
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.xl,
  },
  modalHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  modalTitle: {
    ...typography.headlineMedium,
    color: colors.text.primary,
  },
  inputGroup: {
    marginBottom: spacing.md,
  },
  inputLabel: {
    ...typography.labelMedium,
    color: colors.text.secondary,
    marginBottom: spacing.xs,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.glass.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.glass.border,
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  textInput: {
    flex: 1,
    ...typography.bodyLarge,
    color: colors.text.primary,
    paddingVertical: spacing.md,
  },
  inputHint: {
    ...typography.bodySmall,
    color: colors.text.tertiary,
    marginTop: spacing.xs,
  },
  modalActions: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  modalButton: {
    flex: 1,
  },
});
