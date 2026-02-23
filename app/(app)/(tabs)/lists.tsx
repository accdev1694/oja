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
import {
  GlassScreen,
  GlassCard,
  SimpleHeader,
  SkeletonCard,
  EmptyLists,
  TrialNudgeBanner,
  GlassCapsuleSwitcher,
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


  const handleTabSwitch = useCallback((index: number) => {
    const mode: TabMode = index === 0 ? "active" : "history";
    if (mode === tabMode) return;
    setTabMode(mode);
  }, [tabMode]);

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
            {tabMode === "active" && (
              <Pressable
                style={[styles.addButton, isCreating && { opacity: 0.5 }]}
                onPress={handleCreateList}
                disabled={isCreating}
              >
                <MaterialCommunityIcons name="plus" size={18} color={colors.accent.primary} />
              </Pressable>
            )}
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
          </View>
        }
      />

      {/* Tab Toggle */}
      <GlassCapsuleSwitcher
        tabs={[
          {
            label: "Active",
            activeColor: colors.accent.primary,
            icon: "clipboard-list",
            badge: ((lists?.length ?? 0) + activeShared.length) > 0
              ? (lists?.length ?? 0) + activeShared.length
              : undefined,
          },
          {
            label: "History",
            activeColor: colors.accent.primary,
            icon: "history",
            badge: history && history.length > 0 ? history.length : undefined,
          },
        ]}
        activeIndex={tabMode === "active" ? 0 : 1}
        onTabChange={handleTabSwitch}
        style={styles.tabContainer}
      />

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
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
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

  // Header actions (add + bell)
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  addButton: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.full,
    backgroundColor: `${colors.accent.primary}20`,
    borderWidth: 1,
    borderColor: `${colors.accent.primary}40`,
    alignItems: "center",
    justifyContent: "center",
  },
  bellButton: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.full,
    backgroundColor: colors.glass.background,
    alignItems: "center",
    justifyContent: "center",
  },
  bellBadge: {
    position: "absolute",
    top: -2,
    right: -2,
    backgroundColor: colors.accent.error,
    borderRadius: borderRadius.sm,
    minWidth: 18,
    height: 18,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.xs,
  },
  bellBadgeText: {
    ...typography.labelSmall,
    color: colors.text.inverse,
    fontSize: 10,
  },
});
