import React, { useCallback } from "react";
import { View, Text, SectionList } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Id, Doc } from "@/convex/_generated/dataModel";
import { PantryItemRow } from "@/components/pantry";
import { AnimatedSection, colors } from "@/components/ui/glass";
import { EssentialsSectionHeader, CategoryHeader } from "./StockSectionHeaders";
import { StockListHeader } from "./StockEmptyStates";
import { stockStyles as styles, ESSENTIALS_SECTION_TITLE } from "./stockStyles";

// =============================================================================
// STOCK SECTION LIST
// =============================================================================

interface StockSection {
  title: string;
  data: Doc<"pantryItems">[];
  sectionDelay: number;
}

interface StockSectionListProps {
  sections: StockSection[];
  filteredItems: Doc<"pantryItems">[];
  collapsedCategories: Set<string>;
  animationKey: number;
  viewMode: "attention" | "all";
  searchQuery: string;
  hasExpandedCategory: boolean;
  archivedCount: number;
  bottomInset: number;
  expandingCategory: string | null;
  itemRef: React.RefObject<View | null>;
  onSwipeDecrease: (itemId: Id<"pantryItems">) => void;
  onSwipeIncrease: (itemId: Id<"pantryItems">) => void;
  onRemove: (itemId: Id<"pantryItems">) => void;
  onAddToList: (itemId: Id<"pantryItems">) => void;
  onLongPress: (itemId: Id<"pantryItems">) => void;
  onToggleCategory: (category: string) => void;
  onToggleEssentials: () => void;
}

export const StockSectionList = React.memo(function StockSectionList({
  sections,
  filteredItems,
  collapsedCategories,
  animationKey,
  viewMode,
  searchQuery,
  hasExpandedCategory,
  archivedCount,
  bottomInset,
  expandingCategory,
  itemRef,
  onSwipeDecrease,
  onSwipeIncrease,
  onRemove,
  onAddToList,
  onLongPress,
  onToggleCategory,
  onToggleEssentials,
}: StockSectionListProps) {
  const ListHeaderComponent = (
    <AnimatedSection key={`listheader-${animationKey}`} animation="fadeInDown" duration={400} delay={220}>
      <StockListHeader
        filteredCount={filteredItems.length}
        viewMode={viewMode}
        hasExpandedCategory={hasExpandedCategory}
        searchQuery={searchQuery}
      />
    </AnimatedSection>
  );

  const ListFooterComponent = (
    <View>
      {/* Archived items footer (only in "all" mode, not during search) */}
      {viewMode === "all" && !searchQuery.trim() && archivedCount > 0 && (
        <View style={styles.archivedFooter}>
          <MaterialCommunityIcons
            name="archive-outline"
            size={16}
            color={colors.text.tertiary}
          />
          <Text style={styles.archivedFooterText}>
            {archivedCount} archived item{archivedCount !== 1 ? "s" : ""} (search to find them)
          </Text>
        </View>
      )}
      <View style={{ height: 140 + bottomInset }} />
    </View>
  );

  return (
    <View key={`list-${animationKey}`} style={styles.listWrapper}>
      <SectionList<Doc<"pantryItems">, StockSection>
        sections={sections}
        keyExtractor={(item) => item._id}
        renderItem={(info) => {
          const item = info.item;
          const section = info.section;
          const index = info.index;

          // If category is collapsed, render nothing
          if (collapsedCategories.has(section.title)) return null;
          const isArchivedResult = item.status === "archived";

          // Fast animation when user just toggled this category open;
          // full stagger delay on initial page load
          const isQuickExpand = expandingCategory === section.title;
          const delay = isQuickExpand
            ? index * 30            // immediate cascade, no base delay
            : section.sectionDelay + (index * 20);

          const isFirstItem = index === 0 && section.title === sections[0]?.title;

          return (
            <AnimatedSection key={`${item._id}-${animationKey}`} animation="fadeInDown" duration={400} delay={delay}>
              <View ref={isFirstItem ? itemRef : undefined}>
                <PantryItemRow
                  item={item}
                  onSwipeDecrease={onSwipeDecrease}
                  onSwipeIncrease={onSwipeIncrease}
                  onRemove={onRemove}
                  onAddToList={onAddToList}
                  onLongPress={onLongPress}
                  isArchivedResult={isArchivedResult}
                />
              </View>
            </AnimatedSection>
          );
        }}
        renderSectionHeader={(info) => {
          const section = info.section;
          const isQuickExpandHeader = expandingCategory === section.title;
          const headerDelay = isQuickExpandHeader ? 0 : section.sectionDelay - 50;

          return (
            <AnimatedSection key={`header-${section.title}-${animationKey}`} animation="fadeInDown" duration={400} delay={headerDelay}>
              {section.title === ESSENTIALS_SECTION_TITLE ? (
                <EssentialsSectionHeader
                  count={section.data.length}
                  isCollapsed={collapsedCategories.has(ESSENTIALS_SECTION_TITLE)}
                  onToggle={onToggleEssentials}
                />
              ) : (
                <CategoryHeader
                  category={section.title}
                  count={section.data.length}
                  isCollapsed={collapsedCategories.has(section.title)}
                  onToggle={onToggleCategory}
                />
              )}
            </AnimatedSection>
          );
        }}
        ListHeaderComponent={ListHeaderComponent}
        ListFooterComponent={ListFooterComponent}
        stickySectionHeadersEnabled={false}
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        initialNumToRender={15}
        maxToRenderPerBatch={10}
        windowSize={5}
      />
    </View>
  );
});
