import {
  View,
  StyleSheet,
  ScrollView,
} from "react-native";
import React, { useRef, useMemo } from "react";

import {
  GlassScreen,
  SimpleHeader,
  GlassCapsuleSwitcher,
  TrialNudgeBanner,
  AnimatedSection,
  SkeletonCard,
  colors,
  spacing,
} from "@/components/ui/glass";
import { useCurrentUser } from "@/hooks";
import { ActiveListsContent } from "@/components/lists/ActiveListsContent";
import { HistoryListsContent } from "@/components/lists/HistoryListsContent";
import { ListsHeaderActions } from "@/components/lists/ListsHeaderActions";
import { ListsModals } from "@/components/lists/ListsModals";
import { ListsTutorialHints } from "@/components/lists/ListsTutorialHints";
import { HistoryStatsStrip } from "@/components/lists/HistoryStatsStrip";
import { ActiveStatsStrip } from "@/components/lists/ActiveStatsStrip";
import { HistoryFilters } from "@/components/lists/HistoryFilters";
import { TipBanner } from "@/components/ui/TipBanner";
import { SeasonalEventBanner } from "@/components/ui/SeasonalEventBanner";
import { NotificationDropdown } from "@/components/partners/NotificationDropdown";
import { useHint } from "@/hooks/useHint";
import { useHintSequence } from "@/hooks/useHintSequence";
import { useListsScreen } from "@/hooks/useListsScreen";

export default function ListsScreen() {
  const { firstName } = useCurrentUser();

  const {
    lists, history, activeShared, displayList, isLoaded, hasAnyActiveLists, unreadCount,
    tabMode, isCreating, animationKey, pageAnimationKey, showNotifications,
    historySearchQuery, historyStoreFilter, historyDateFilter, historyStores, hasActiveFilters,
    showCreateOptionsModal, showTemplatePickerModal, showTemplateModal,
    showEditNameModal, selectedTemplateId, selectedTemplateName, editingListName,
    handleTabSwitch,
    handleListPress, handleDeletePress, handleEditName, handleSaveListName,
    handleHistoryPress, handleSharedPress, handleUseAsTemplate, handleConfirmTemplate,
    stableFormatDateTime, handleCreateListFlow, handleCreateFromScratch,
    handleShowTemplatePicker, handlePickTemplate,
    handleShowNotifications, handleCloseTemplate, clearHistoryFilters,
    setHistorySearchQuery, setHistoryStoreFilter, setHistoryDateFilter,
    setShowNotifications, setShowCreateOptionsModal, setShowTemplatePickerModal,
    setShowEditNameModal,
  } = useListsScreen();

  // Hint targets
  const headerRef = useRef(null);
  const createCardRef = useRef(null);

  // Hints
  const welcomeHint = useHint("lists_welcome", "delayed");
  const createHint = useHint("lists_create", "manual");
  const templateHint = useHint("lists_templates", "manual");

  useHintSequence([
    { hint: welcomeHint, hintId: "lists_welcome" },
    { hint: createHint, hintId: "lists_create", condition: tabMode === "active" },
    {
      hint: templateHint,
      hintId: "lists_templates",
      condition: (lists?.length ?? 0) + activeShared.length >= 3,
    },
  ]);

  // Subtitle for header
  const subtitle = useMemo(() => {
    if (tabMode === "active") {
      const count = lists?.length ?? 0;
      return `${count} active list${count !== 1 ? "s" : ""}`;
    }
    const total = history?.length ?? 0;
    const filtered = displayList.length;
    if (hasActiveFilters) {
      return `${filtered} of ${total} trip${total !== 1 ? "s" : ""}`;
    }
    return `${total} trip${total !== 1 ? "s" : ""}`;
  }, [tabMode, lists, history, displayList, hasActiveFilters]);

  // Shared tab toggle + banners (used in both modes)
  const sharedBanners = useMemo(() => (
    <View key={`page-${pageAnimationKey}`}>
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

      {/* Trial Nudge Banner — owns its own enter/exit animation, so it's not
          wrapped in AnimatedSection (nested layout animations get swallowed). */}
      <TrialNudgeBanner />

      {/* Seasonal Event Banner */}
      <AnimatedSection key={`event-${pageAnimationKey}`} animation="fadeInDown" duration={400} delay={75}>
        <SeasonalEventBanner />
      </AnimatedSection>

      {/* Contextual Tips */}
      <AnimatedSection key={`tip-${pageAnimationKey}`} animation="fadeInDown" duration={400} delay={100}>
        <TipBanner context="lists" />
      </AnimatedSection>

      {/* Active Stats Strip (only in active mode — mirrors HistoryStatsStrip) */}
      {tabMode === "active" && (
        <ActiveStatsStrip key={`active-stats-${pageAnimationKey}`} animationDelay={125} />
      )}

      {/* History Stats Strip + Filters (only in history mode) */}
      {tabMode === "history" && (
        <View style={styles.historyHeaderContent}>
          <HistoryStatsStrip history={displayList} />
          <HistoryFilters
            searchQuery={historySearchQuery}
            storeFilter={historyStoreFilter}
            dateFilter={historyDateFilter}
            stores={historyStores}
            onSearchChange={setHistorySearchQuery}
            onStoreChange={setHistoryStoreFilter}
            onDateChange={setHistoryDateFilter}
          />
        </View>
      )}
    </View>
  ), [
    pageAnimationKey, lists, activeShared, history, tabMode, handleTabSwitch,
    displayList, historySearchQuery, historyStoreFilter, historyDateFilter, historyStores,
    setHistorySearchQuery, setHistoryStoreFilter, setHistoryDateFilter,
  ]);

  // Loading state with skeletons
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
      {/* Header with actions */}
      <View ref={headerRef}>
        <SimpleHeader
          title={firstName ? `${firstName}'s Lists` : "Shopping Lists"}
          accentColor={colors.semantic.lists}
          subtitle={subtitle}
          rightElement={
            <ListsHeaderActions
              tabMode={tabMode}
              isCreating={isCreating}
              unreadCount={unreadCount}
              onCreateListFlow={handleCreateListFlow}
              onShowNotifications={handleShowNotifications}
            />
          }
        />
      </View>

      {tabMode === "history" ? (
        /* History mode: FlashList handles its own scrolling */
        <View style={styles.flashListContainer}>
          <HistoryListsContent
            displayList={displayList}
            animationKey={animationKey}
            onHistoryPress={handleHistoryPress}
            onUseAsTemplate={handleUseAsTemplate}
            formatDateTime={stableFormatDateTime}
            headerContent={sharedBanners}
            hasActiveFilters={hasActiveFilters}
            onClearFilters={clearHistoryFilters}
          />
        </View>
      ) : (
        /* Active mode: keep existing ScrollView */
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {sharedBanners}

          {/* Active Content */}
          <View key={`active-${animationKey}`}>
            <ActiveListsContent
              displayList={displayList}
              activeShared={activeShared}
              hasAnyActiveLists={hasAnyActiveLists}
              isCreating={isCreating}
              animationKey={animationKey}
              createCardRef={createCardRef}
              onCreateListFlow={handleCreateListFlow}
              onListPress={handleListPress}
              onDeletePress={handleDeletePress}
              onEditName={handleEditName}
              onSharedPress={handleSharedPress}
              formatDateTime={stableFormatDateTime}
            />
          </View>

          <View style={styles.bottomSpacer} />
        </ScrollView>
      )}

      {/* Notifications Dropdown */}
      <NotificationDropdown
        visible={showNotifications}
        onClose={() => setShowNotifications(false)}
      />

      {/* All Modals */}
      <ListsModals
        showCreateOptionsModal={showCreateOptionsModal}
        showTemplatePickerModal={showTemplatePickerModal}
        showTemplateModal={showTemplateModal}
        showEditNameModal={showEditNameModal}
        selectedTemplateId={selectedTemplateId}
        selectedTemplateName={selectedTemplateName}
        editingListName={editingListName}
        historyLists={history || []}
        hasHistory={(history?.length ?? 0) > 0}
        onCloseCreateOptions={() => setShowCreateOptionsModal(false)}
        onCreateFromScratch={handleCreateFromScratch}
        onShowTemplatePicker={handleShowTemplatePicker}
        onCloseTemplatePicker={() => setShowTemplatePickerModal(false)}
        onPickTemplate={handlePickTemplate}
        onCloseTemplate={handleCloseTemplate}
        onConfirmTemplate={handleConfirmTemplate}
        onCloseEditName={() => setShowEditNameModal(false)}
        onSaveListName={handleSaveListName}
      />

      {/* Tutorial Hints */}
      <ListsTutorialHints
        welcomeHint={welcomeHint}
        createHint={createHint}
        templateHint={templateHint}
        headerRef={headerRef}
        createCardRef={createCardRef}
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
  flashListContainer: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 0,
  },
  bottomSpacer: {
    height: 140,
  },
  tabContainer: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
  },
  historyHeaderContent: {
    paddingHorizontal: spacing.lg,
  },
});
