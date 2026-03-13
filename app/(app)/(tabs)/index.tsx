import {
  View,
  StyleSheet,
  ScrollView,
} from "react-native";
import React, { useRef } from "react";

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
import { CombineActionBar } from "@/components/lists/CombineActionBar";
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
    tabMode, isCreating, isMultiSelectMode, animationKey, pageAnimationKey, showNotifications,
    showCreateOptionsModal, showTemplatePickerModal, showTemplateModal,
    showCombineModal, showEditNameModal, selectedTemplateId, selectedTemplateName,
    editingListName, selectedHistoryLists,
    handleTabSwitch, handleToggleSelect, handleConfirmCombine,
    handleListPress, handleDeletePress, handleEditName, handleSaveListName,
    handleHistoryPress, handleSharedPress, handleUseAsTemplate, handleConfirmTemplate,
    stableFormatDateTime, handleCreateListFlow, handleCreateFromScratch,
    handleShowTemplatePicker, handlePickTemplate, handleToggleMultiSelect,
    handleShowNotifications, handleCloseTemplate,
    setShowNotifications, setShowCreateOptionsModal, setShowTemplatePickerModal,
    setShowCombineModal, setShowEditNameModal,
  } = useListsScreen();

  // Hint targets
  const headerRef = useRef<View>(null);
  const createCardRef = useRef<View>(null);

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
          subtitle={
            tabMode === "active"
              ? `${lists?.length ?? 0} active list${(lists?.length ?? 0) !== 1 ? "s" : ""}`
              : `${history?.length ?? 0} archived list${(history?.length ?? 0) !== 1 ? "s" : ""}`
          }
          rightElement={
            <ListsHeaderActions
              tabMode={tabMode}
              isCreating={isCreating}
              isMultiSelectMode={isMultiSelectMode}
              hasHistory={(history?.length ?? 0) > 0}
              unreadCount={unreadCount}
              onCreateListFlow={handleCreateListFlow}
              onToggleMultiSelect={handleToggleMultiSelect}
              onShowNotifications={handleShowNotifications}
            />
          }
        />
      </View>

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

          {/* Seasonal Event Banner */}
          <AnimatedSection key={`event-${pageAnimationKey}`} animation="fadeInDown" duration={400} delay={75}>
            <SeasonalEventBanner />
          </AnimatedSection>

          {/* Contextual Tips */}
          <AnimatedSection key={`tip-${pageAnimationKey}`} animation="fadeInDown" duration={400} delay={100}>
            <TipBanner context="lists" />
          </AnimatedSection>

          {/* Content */}
          <View key={animationKey}>
            {tabMode === "active" ? (
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
            ) : (
              <HistoryListsContent
                displayList={displayList}
                animationKey={animationKey}
                isMultiSelectMode={isMultiSelectMode}
                selectedHistoryLists={selectedHistoryLists}
                onHistoryPress={handleHistoryPress}
                onUseAsTemplate={handleUseAsTemplate}
                onToggleSelect={handleToggleSelect}
                formatDateTime={stableFormatDateTime}
              />
            )}
          </View>
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* Multi-Select Combine Action */}
      {isMultiSelectMode && (
        <CombineActionBar
          selectedCount={selectedHistoryLists.size}
          onCombine={() => setShowCombineModal(true)}
        />
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
        showCombineModal={showCombineModal}
        showEditNameModal={showEditNameModal}
        selectedTemplateId={selectedTemplateId}
        selectedTemplateName={selectedTemplateName}
        editingListName={editingListName}
        selectedHistoryLists={selectedHistoryLists}
        historyLists={history || []}
        hasHistory={(history?.length ?? 0) > 0}
        onCloseCreateOptions={() => setShowCreateOptionsModal(false)}
        onCreateFromScratch={handleCreateFromScratch}
        onShowTemplatePicker={handleShowTemplatePicker}
        onCloseTemplatePicker={() => setShowTemplatePickerModal(false)}
        onPickTemplate={handlePickTemplate}
        onCloseTemplate={handleCloseTemplate}
        onConfirmTemplate={handleConfirmTemplate}
        onCloseCombine={() => setShowCombineModal(false)}
        onConfirmCombine={handleConfirmCombine}
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: spacing.sm,
  },
  bottomSpacer: {
    height: 140,
  },
  tabContainer: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
});
