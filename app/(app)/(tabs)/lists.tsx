import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  FlatList,
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
  useGlassAlert,
} from "@/components/ui/glass";
import { NotificationDropdown } from "@/components/partners";
import { TipBanner } from "@/components/ui/TipBanner";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useNotifications } from "@/hooks/useNotifications";
import { ListCard } from "@/components/lists/ListCard";
import { HistoryCard } from "@/components/lists/HistoryCard";
import { SharedListCard } from "@/components/lists/SharedListCard";

type TabMode = "active" | "history";

const MAX_LIST_NAME_LENGTH = 30;

export default function ListsScreen() {
  const router = useRouter();
  const { alert } = useGlassAlert();
  const { firstName } = useCurrentUser();
  const [tabMode, setTabMode] = useState<TabMode>("active");
  const lists = useQuery(api.shoppingLists.getActive);
  const history = useQuery(api.shoppingLists.getHistory);
  const sharedLists = useQuery(api.partners.getSharedLists);
  const createList = useMutation(api.shoppingLists.create);
  const deleteList = useMutation(api.shoppingLists.remove);
  const [isCreating, setIsCreating] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const { unreadCount } = useNotifications();

  // Create list modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newListName, setNewListName] = useState("");
  const [modalMode, setModalMode] = useState<"choice" | "manual">("choice");

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

  const handleDeleteList = useCallback((listId: Id<"shoppingLists">, listName: string) => {
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
  }, [alert, deleteList]);

  // Stable callbacks for cards — avoids inline closures that defeat React.memo
  const handleListPress = useCallback((id: Id<"shoppingLists">) => {
    router.push(`/list/${id}`);
  }, [router]);

  const handleDeletePress = useCallback((id: Id<"shoppingLists">, name: string) => {
    handleDeleteList(id, name);
  }, [handleDeleteList]);

  const handleHistoryPress = useCallback((id: Id<"shoppingLists">) => {
    router.push(`/trip-summary?id=${id}`);
  }, [router]);

  const handleSharedPress = useCallback((id: Id<"shoppingLists">) => {
    router.push(`/list/${id}`);
  }, [router]);

  const historyKeyExtractor = useCallback((item: { _id: string }) => item._id, []);

  const stableFormatDateTime = useCallback((timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
    });
  }, []);

  const renderHistoryCard = useCallback(({ item }: { item: typeof displayList[number] }) => (
    <HistoryCard
      list={item}
      onPress={handleHistoryPress}
      formatDateTime={stableFormatDateTime}
    />
  ), [handleHistoryPress, stableFormatDateTime]);

  function handleOpenCreateModal() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setModalMode("choice");
    setNewListName("");
    setShowCreateModal(true);
  }

  function handleStartManualCreate() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const now = new Date();
    const day = now.getDate();
    const ordinal =
      day % 10 === 1 && day !== 11 ? "st" :
      day % 10 === 2 && day !== 12 ? "nd" :
      day % 10 === 3 && day !== 13 ? "rd" : "th";
    const month = now.toLocaleDateString("en-GB", { month: "long" });
    const year = now.getFullYear();
    setNewListName(`${day}${ordinal} ${month} ${year} Shopping`);
    setModalMode("manual");
  }

  function handleFromReceipt() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setShowCreateModal(false);
    setModalMode("choice");
    router.push("/(app)/create-list-from-receipt" as never);
  }

  function handleCloseCreateModal() {
    setShowCreateModal(false);
    setNewListName("");
    setModalMode("choice");
  }

  async function handleCreateList() {
    if (!newListName.trim()) {
      alert("Error", "Please enter a list name");
      return;
    }

    setIsCreating(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const listId = await createList({
        name: newListName.trim(),
        budget: 50,
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
        title={firstName ? `${firstName}'s Lists` : "Shopping Lists"}
        accentColor={colors.semantic.lists}
        subtitle={
          tabMode === "active"
            ? lists !== undefined
              ? `${lists.length} active list${lists.length !== 1 ? "s" : ""}`
              : undefined
            : history !== undefined
              ? `${history.length} archived list${history.length !== 1 ? "s" : ""}`
              : undefined
        }
        rightElement={
          <View style={styles.headerActions}>
            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setShowNotifications(true);
              }}
              style={styles.bellButton}
              hitSlop={8}
            >
              <MaterialCommunityIcons
                name="bell-outline"
                size={22}
                color={colors.text.secondary}
              />
              {unreadCount > 0 && (
                <View style={styles.bellBadge}>
                  <Text style={styles.bellBadgeText}>
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </Text>
                </View>
              )}
            </Pressable>
            {tabMode === "active" && (
              <GlassButton
                variant="primary"
                size="sm"
                icon="plus"
                onPress={handleOpenCreateModal}
              >
                New List
              </GlassButton>
            )}
          </View>
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

      {/* Contextual Tips */}
      <TipBanner context="lists" />

      {/* Content */}
      {!isLoaded ? (
        <View style={styles.skeletonContainer}>
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </View>
      ) : tabMode === "active" && !hasAnyActiveLists ? (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.emptyScrollContent}
          showsVerticalScrollIndicator={false}
        >
          <EmptyLists
            onAction={handleOpenCreateModal}
            actionText="Create a New List"
          />
          {/* Join a shared list — always visible even with no lists */}
          <View style={styles.joinCardEmpty}>
            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push("/join-list");
              }}
            >
              <GlassCard variant="bordered" style={styles.joinCard}>
                <View style={styles.joinCardContent}>
                  <MaterialCommunityIcons
                    name="link-variant"
                    size={18}
                    color={colors.text.tertiary}
                  />
                  <Text style={styles.joinCardText}>Accept Invite</Text>
                  <MaterialCommunityIcons
                    name="chevron-right"
                    size={18}
                    color={colors.text.tertiary}
                  />
                </View>
              </GlassCard>
            </Pressable>
          </View>
          <View style={styles.bottomSpacer} />
        </ScrollView>
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
              Complete a shopping trip and it&apos;ll show up here — great for tracking your spending over time.
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
              onPress={handleListPress}
              onDelete={handleDeletePress}
              formatDateTime={stableFormatDateTime}
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
                    onPress={handleSharedPress}
                    formatDateTime={stableFormatDateTime}
                  />
                ) : null
              )}
            </>
          )}

          {/* Join a shared list — inline card */}
          <View style={styles.joinCardWrapper}>
            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push("/join-list");
              }}
            >
              <GlassCard variant="bordered" style={styles.joinCard}>
                <View style={styles.joinCardContent}>
                  <MaterialCommunityIcons
                    name="link-variant"
                    size={18}
                    color={colors.text.tertiary}
                  />
                  <Text style={styles.joinCardText}>Accept Invite</Text>
                  <MaterialCommunityIcons
                    name="chevron-right"
                    size={18}
                    color={colors.text.tertiary}
                  />
                </View>
              </GlassCard>
            </Pressable>
          </View>

          <View style={styles.bottomSpacer} />
        </ScrollView>
      ) : (
        <FlatList
          data={displayList}
          keyExtractor={historyKeyExtractor}
          renderItem={renderHistoryCard}
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          ListFooterComponent={<View style={styles.bottomSpacer} />}
        />
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
        {modalMode === "choice" ? (
          <>
            {/* Choice View — pick how to create */}
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderLeft}>
                <MaterialCommunityIcons
                  name="clipboard-plus-outline"
                  size={24}
                  color={colors.accent.primary}
                />
                <Text style={styles.modalTitle}>New List</Text>
              </View>
            </View>

            <View style={styles.choiceOptions}>
              <Pressable
                style={styles.choiceOption}
                onPress={handleFromReceipt}
              >
                <View style={styles.choiceIconWrap}>
                  <MaterialCommunityIcons
                    name="receipt"
                    size={24}
                    color={colors.accent.primary}
                  />
                </View>
                <View style={styles.choiceTextWrap}>
                  <Text style={styles.choiceLabel}>From a Receipt</Text>
                  <Text style={styles.choiceDesc}>
                    Pick or scan a receipt to auto-fill items and prices
                  </Text>
                </View>
                <MaterialCommunityIcons
                  name="chevron-right"
                  size={20}
                  color={colors.text.tertiary}
                />
              </Pressable>

              <Pressable
                style={styles.choiceOption}
                onPress={handleStartManualCreate}
              >
                <View style={styles.choiceIconWrap}>
                  <MaterialCommunityIcons
                    name="pencil-outline"
                    size={24}
                    color={colors.text.secondary}
                  />
                </View>
                <View style={styles.choiceTextWrap}>
                  <Text style={styles.choiceLabel}>Create Manually</Text>
                  <Text style={styles.choiceDesc}>
                    Start with an empty list and add items yourself
                  </Text>
                </View>
                <MaterialCommunityIcons
                  name="chevron-right"
                  size={20}
                  color={colors.text.tertiary}
                />
              </Pressable>
            </View>
          </>
        ) : (
          <>
            {/* Manual Create View — existing flow */}
            <View style={styles.modalHeader}>
              <Pressable
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setModalMode("choice");
                }}
                hitSlop={8}
                style={styles.modalBackButton}
              >
                <MaterialCommunityIcons
                  name="chevron-left"
                  size={28}
                  color={colors.text.primary}
                />
              </Pressable>
              <View style={styles.modalHeaderLeft}>
                <Text style={styles.modalTitle}>Create Manually</Text>
              </View>
            </View>

            {/* List Name Input */}
            <View style={styles.inputGroup}>
              <View style={styles.inputLabelRow}>
                <Text style={styles.inputLabel}>List Name</Text>
                <Text
                  style={[
                    styles.charCount,
                    newListName.length > MAX_LIST_NAME_LENGTH - 5 && styles.charCountWarning,
                    newListName.length >= MAX_LIST_NAME_LENGTH && styles.charCountLimit,
                  ]}
                >
                  {MAX_LIST_NAME_LENGTH - newListName.length}
                </Text>
              </View>
              <View style={styles.inputContainer}>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  keyboardShouldPersistTaps="always"
                  contentContainerStyle={{ flexGrow: 1 }}
                >
                  <TextInput
                    style={[styles.textInput, { minWidth: "100%" }]}
                    value={newListName}
                    onChangeText={(text) => setNewListName(text.slice(0, MAX_LIST_NAME_LENGTH))}
                    placeholder="e.g., Weekly Shop"
                    placeholderTextColor={colors.text.tertiary}
                    maxLength={MAX_LIST_NAME_LENGTH}
                    autoFocus
                  />
                </ScrollView>
              </View>
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
          </>
        )}
      </GlassModal>
    </GlassScreen>
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
  emptyScrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
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
  joinCardWrapper: {
    alignItems: "center",
    marginTop: spacing.lg,
  },
  joinCard: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  joinCardContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  joinCardText: {
    ...typography.bodyMedium,
    color: colors.text.secondary,
  },
  joinCardEmpty: {
    alignItems: "center",
    marginTop: spacing.lg,
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
    borderRadius: borderRadius.sm,
    minWidth: 20,
    height: 20,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: spacing.sm,
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

  // Modal styles
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.xl,
  },
  modalBackButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.glass.background,
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
  inputLabelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.xs,
  },
  inputLabel: {
    ...typography.labelMedium,
    color: colors.text.primary,
  },
  charCount: {
    ...typography.labelSmall,
    color: colors.text.tertiary,
  },
  charCountWarning: {
    color: colors.semantic.warning,
  },
  charCountLimit: {
    color: colors.semantic.danger,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.glass.background,
    borderRadius: borderRadius.md,
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
  modalActions: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  modalButton: {
    flex: 1,
  },

  // Choice modal styles
  choiceOptions: {
    gap: spacing.sm,
  },
  choiceOption: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.glass.background,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.glass.border,
    padding: spacing.md,
    gap: spacing.md,
  },
  choiceIconWrap: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    backgroundColor: `${colors.accent.primary}10`,
    justifyContent: "center",
    alignItems: "center",
  },
  choiceTextWrap: {
    flex: 1,
    gap: 2,
  },
  choiceLabel: {
    ...typography.bodyLarge,
    color: colors.text.primary,
    fontWeight: "600",
  },
  choiceDesc: {
    ...typography.bodySmall,
    color: colors.text.tertiary,
  },

  // Header actions (bell + New List)
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  bellButton: {
    position: "relative",
    padding: spacing.xs,
  },
  bellBadge: {
    position: "absolute",
    top: 0,
    right: 0,
    backgroundColor: colors.accent.error,
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 3,
  },
  bellBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#fff",
  },
});
