import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  FlatList,
  Pressable,
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
import { defaultListName } from "@/lib/list/helpers";

type TabMode = "active" | "history";

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

  async function handleCreateList() {
    if (isCreating) return;
    setIsCreating(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const name = defaultListName();

    try {
      const listId = await createList({ name, budget: 50 });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.push(`/list/${listId}`);
    } catch (error: unknown) {
      console.error("Failed to create list:", error);
      const msg = error instanceof Error ? error.message : String(error);
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
                onPress={handleCreateList}
                loading={isCreating}
                disabled={isCreating}
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
            onAction={handleCreateList}
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
    paddingTop: spacing.sm,
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
    gap: 6,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
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
    fontSize: 13,
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
