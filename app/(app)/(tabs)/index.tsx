import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
} from "react-native";
import { useRouter } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import React, { useState, useMemo, useCallback } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import * as Haptics from "expo-haptics";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import {
  GlassScreen,
  GlassCard,
  SimpleHeader,
  GlassCapsuleSwitcher,
  TrialNudgeBanner,
  AnimatedSection,
  SkeletonCard,
  colors,
  typography,
  spacing,
  borderRadius,
  useGlassAlert,
} from "@/components/ui/glass";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useIsSwitchingUsers } from "@/hooks/useIsSwitchingUsers";
import { EmptyLists } from "@/components/ui/glass/GlassErrorState";
import { ListCard } from "@/components/lists/ListCard";
import { SharedListCard } from "@/components/lists/SharedListCard";
import { HistoryCard } from "@/components/lists/HistoryCard";
import { CreateFromTemplateModal } from "@/components/lists/CreateFromTemplateModal";
import { defaultListName } from "@/lib/list/helpers";
import { TipBanner } from "@/components/ui/TipBanner";
import { useNotifications } from "@/hooks/useNotifications";
import { NotificationDropdown } from "@/components/partners/NotificationDropdown";

type TabMode = "active" | "history";

export default function ListsScreen() {
  const router = useRouter();
  const { alert } = useGlassAlert();
  const { firstName } = useCurrentUser();
  const isSwitchingUsers = useIsSwitchingUsers();
  const [tabMode, setTabMode] = useState<TabMode>("active");

  // Data Hooks
  const lists = useQuery(api.shoppingLists.getActive, !isSwitchingUsers ? {} : "skip");
  const history = useQuery(api.shoppingLists.getHistory, !isSwitchingUsers ? {} : "skip");
  const sharedLists = useQuery(api.partners.getSharedLists, !isSwitchingUsers ? {} : "skip");
  const createList = useMutation(api.shoppingLists.create);
  const deleteList = useMutation(api.shoppingLists.remove);
  const createFromTemplate = useMutation(api.shoppingLists.createFromTemplate);

  const [isCreating, setIsCreating] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const { unreadCount } = useNotifications();
  const [animationKey, setAnimationKey] = useState(0);
  const [pageAnimationKey, setPageAnimationKey] = useState(0);

  // Template Modal State
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<Id<"shoppingLists"> | null>(null);
  const [selectedTemplateName, setSelectedTemplateName] = useState("");

  // Trigger animations every time this tab gains focus
  useFocusEffect(
    useCallback(() => {
      setAnimationKey((prev) => prev + 1);
      setPageAnimationKey((prev) => prev + 1);
    }, [])
  );

  const handleTabSwitch = useCallback((index: number) => {
    const mode: TabMode = index === 0 ? "active" : "history";
    if (mode === tabMode) return;
    setTabMode(mode);
    setAnimationKey((prev) => prev + 1);
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

  const handleUseAsTemplate = useCallback((listId: Id<"shoppingLists">, listName: string) => {
    setSelectedTemplateId(listId);
    setSelectedTemplateName(listName);
    setShowTemplateModal(true);
  }, []);

  const handleConfirmTemplate = useCallback(async (newName: string) => {
    if (!selectedTemplateId) return;

    try {
      const result = await createFromTemplate({
        sourceListId: selectedTemplateId,
        newListName: newName,
      });

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setShowTemplateModal(false);

      // Navigate to new list
      router.push(`/list/${result.listId}`);
    } catch (error: unknown) {
      console.error("Failed to create from template:", error);
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
        alert("Error", "Failed to create list from template");
      }
    }
  }, [selectedTemplateId, createFromTemplate, router, alert]);

  const stableFormatDateTime = useCallback((timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
    });
  }, []);

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
  const activeShared = sharedLists?.filter((l: any) => l && l.status !== "archived" && l.status !== "completed") ?? [];
  const hasAnyActiveLists = displayList.length > 0 || activeShared.length > 0;

  // Loading state with skeletons (Smooth transition pattern)
  if (!isLoaded) {
    return (
      <GlassScreen>
        <SimpleHeader
          title={firstName ? `${firstName}'s Lists` : "Shopping Lists"}
          accentColor={colors.semantic.lists}
          subtitle="Loading your lists..."
        />
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
        title={firstName ? `${firstName}'s Lists` : "Shopping Lists"}
        accentColor={colors.semantic.lists}
        subtitle={
          tabMode === "active"
            ? `${lists?.length ?? 0} active list${(lists?.length ?? 0) !== 1 ? "s" : ""}`
            : `${history?.length ?? 0} archived list${(history?.length ?? 0) !== 1 ? "s" : ""}`
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

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View key={pageAnimationKey}>
          {/* Tab Toggle */}
          <AnimatedSection key={`toggle-${pageAnimationKey}`} animation="fadeInDown" duration={400} delay={0}>
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
          </AnimatedSection>

          {/* Trial Nudge Banner */}
          <AnimatedSection key={`nudge-${pageAnimationKey}`} animation="fadeInDown" duration={400} delay={50}>
            <TrialNudgeBanner />
          </AnimatedSection>

          {/* Contextual Tips */}
          <AnimatedSection key={`tip-${pageAnimationKey}`} animation="fadeInDown" duration={400} delay={100}>
            <TipBanner context="lists" />
          </AnimatedSection>

          {/* Content */}
          <View key={animationKey}>
            {tabMode === "active" && !hasAnyActiveLists ? (
              <AnimatedSection key={`empty-${animationKey}`} animation="fadeInDown" duration={400} delay={150}>
                <View style={styles.emptyScrollContentInner}>
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
                </View>
              </AnimatedSection>
            ) : tabMode === "history" && displayList.length === 0 ? (
              <AnimatedSection key={`empty-history-${animationKey}`} animation="fadeInDown" duration={400} delay={150}>
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
              </AnimatedSection>
            ) : tabMode === "active" ? (
              <View>
                {/* Inline create-list card — always visible as first item */}
                <AnimatedSection key={`create-${animationKey}`} animation="fadeInDown" duration={400} delay={150}>
                  <Pressable
                    onPress={handleCreateList}
                    disabled={isCreating}
                    style={({ pressed }) => [
                      styles.createCard,
                      isCreating && { opacity: 0.5 },
                      pressed && { opacity: 0.7 },
                    ]}
                  >
                    <View style={styles.createCardInner}>
                      <View style={styles.createCardIcon}>
                        <MaterialCommunityIcons name="plus" size={24} color={colors.accent.primary} />
                      </View>
                      <View style={styles.createCardText}>
                        <Text style={styles.createCardTitle}>Create a new list</Text>
                        <Text style={styles.createCardSubtitle}>Set a budget and start adding items</Text>
                      </View>
                      <MaterialCommunityIcons name="chevron-right" size={20} color={colors.text.tertiary} />
                    </View>
                  </Pressable>
                </AnimatedSection>

                {displayList.map((list, index) => (
                  <AnimatedSection key={`${list._id}-${animationKey}`} animation="fadeInDown" duration={400} delay={200 + (index * 50)}>
                    <View style={styles.cardWrapper}>
                      <ListCard
                        list={list}
                        onPress={handleListPress}
                        onDelete={handleDeletePress}
                      />
                    </View>
                  </AnimatedSection>
                ))}

                {/* Shared With Me section */}
                {activeShared.length > 0 && (
                  <View>
                    <AnimatedSection key={`shared-title-${animationKey}`} animation="fadeInDown" duration={400} delay={200 + (displayList.length * 50)}>
                      <View style={styles.sharedSectionHeader}>
                        <MaterialCommunityIcons
                          name="account-group"
                          size={18}
                          color={colors.text.secondary}
                        />
                        <Text style={styles.sharedSectionTitle}>Shared With Me</Text>
                      </View>
                    </AnimatedSection>
                    {activeShared.map((list: any, index: number) =>
                      list ? (
                        <AnimatedSection key={`${list._id}-${animationKey}`} animation="fadeInDown" duration={400} delay={250 + (displayList.length * 50) + (index * 50)}>
                          <View style={styles.cardWrapper}>
                            <SharedListCard
                              list={list}
                              onPress={handleSharedPress}
                              formatDateTime={stableFormatDateTime}
                            />
                          </View>
                        </AnimatedSection>
                      ) : null
                    )}
                  </View>
                )}

                {/* Join a shared list — inline card */}
                <AnimatedSection key={`join-${animationKey}`} animation="fadeInDown" duration={400} delay={200 + ((displayList.length + activeShared.length) * 50)}>
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
                </AnimatedSection>
              </View>
            ) : (
              <View>
                {displayList.map((list, index) => (
                  <AnimatedSection key={`${list._id}-${animationKey}`} animation="fadeInDown" duration={400} delay={150 + (index * 50)}>
                    <View style={styles.cardWrapper}>
                      <HistoryCard
                        list={list}
                        onPress={handleHistoryPress}
                        formatDateTime={stableFormatDateTime}
                        onUseAsTemplate={handleUseAsTemplate}
                      />
                    </View>
                  </AnimatedSection>
                ))}
              </View>
            )}
          </View>
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* Notifications Dropdown */}
      <NotificationDropdown
        visible={showNotifications}
        onClose={() => setShowNotifications(false)}
      />

      {/* Template Modal */}
      <CreateFromTemplateModal
        visible={showTemplateModal}
        sourceListId={selectedTemplateId}
        sourceListName={selectedTemplateName}
        onClose={() => setShowTemplateModal(false)}
        onConfirm={handleConfirmTemplate}
      />

    </GlassScreen>
  );
}

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
    paddingTop: spacing.xl,
  },
  emptyScrollContentInner: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: spacing.xl,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: spacing.sm,
  },
  cardWrapper: {
    marginHorizontal: spacing.lg,
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

  // Inline create-list card
  createCard: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: `${colors.accent.primary}50`,
    borderRadius: borderRadius.lg,
    backgroundColor: `${colors.accent.primary}08`,
    padding: spacing.md,
  },
  createCardInner: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  createCardIcon: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.full,
    backgroundColor: `${colors.accent.primary}20`,
    alignItems: "center",
    justifyContent: "center",
  },
  createCardText: {
    flex: 1,
  },
  createCardTitle: {
    ...typography.bodyLarge,
    color: colors.accent.primary,
    fontWeight: "600",
  },
  createCardSubtitle: {
    ...typography.bodySmall,
    color: colors.text.tertiary,
    marginTop: 2,
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
    marginHorizontal: spacing.lg,
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
    borderRadius: 18,
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
