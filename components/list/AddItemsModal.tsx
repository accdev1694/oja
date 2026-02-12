import React, { useState, useCallback, useRef, useMemo, memo } from "react";
import {
  View,
  Text,
  FlatList,
  Pressable,
  ActivityIndicator,
  StyleSheet,
  type ListRenderItemInfo,
} from "react-native";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  interpolateColor,
} from "react-native-reanimated";

import {
  GlassModal,
  GlassSearchInput,
  GlassButton,
  colors,
  typography,
  spacing,
  borderRadius,
} from "@/components/ui/glass";
import { haptic } from "@/lib/haptics/safeHaptics";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface AddItemsModalProps {
  visible: boolean;
  onClose: () => void;
  listId: Id<"shoppingLists">;
  listStoreName?: string;
  listNormalizedStoreId?: string;
  existingItems?: { name: string }[];
}

interface SelectedItem {
  name: string;
  category?: string;
  size?: string;
  unit?: string;
  estimatedPrice?: number;
  quantity: number;
  source: "search" | "pantry";
  pantryItemId?: Id<"pantryItems">;
}

type ActiveTab = "search" | "pantry";

interface PantryItemData {
  _id: Id<"pantryItems">;
  name: string;
  category: string;
  icon?: string;
  stockLevel: string;
  lastPrice?: number;
  defaultSize?: string;
  defaultUnit?: string;
}

interface SearchSuggestion {
  name: string;
  source: "pantry" | "known" | "variant";
  similarity: number;
  isExactMatch: boolean;
  pantryItemId?: string;
  stockLevel?: string;
  estimatedPrice?: number;
  priceSource?: string;
  storeName?: string;
  size?: string;
  unit?: string;
  category?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Row Components (memoized)
// ─────────────────────────────────────────────────────────────────────────────

interface SearchRowProps {
  item: SearchSuggestion;
  isSelected: boolean;
  isOnList: boolean;
  onToggle: (item: SearchSuggestion) => void;
}

const SearchRow = memo(function SearchRow({
  item,
  isSelected,
  isOnList,
  onToggle,
}: SearchRowProps) {
  const priceText =
    item.estimatedPrice != null ? `£${item.estimatedPrice.toFixed(2)}` : null;

  const confidenceDots = useMemo(() => {
    if (!item.priceSource) return null;
    const filled =
      item.priceSource === "personal"
        ? 3
        : item.priceSource === "crowdsourced"
          ? 2
          : 1;
    return (
      <View style={styles.confidenceDots}>
        {[1, 2, 3].map((dot) => (
          <View
            key={dot}
            style={[
              styles.dot,
              dot <= filled ? styles.dotFilled : styles.dotEmpty,
            ]}
          />
        ))}
      </View>
    );
  }, [item.priceSource]);

  const subtitle = useMemo(() => {
    const parts: string[] = [];
    if (item.size) parts.push(item.size);
    if (item.storeName) parts.push(item.storeName);
    return parts.join(" \u00B7 ");
  }, [item.size, item.storeName]);

  return (
    <Pressable
      style={[styles.row, isSelected && styles.rowSelected]}
      onPress={() => {
        if (!isOnList) onToggle(item);
      }}
      disabled={isOnList}
    >
      <View style={styles.rowLeft}>
        {isOnList ? (
          <View style={styles.onListBadge}>
            <MaterialCommunityIcons
              name="check"
              size={14}
              color={colors.text.tertiary}
            />
          </View>
        ) : isSelected ? (
          <Pressable
            style={styles.checkButton}
            onPress={() => onToggle(item)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <MaterialCommunityIcons
              name="check-circle"
              size={22}
              color={colors.accent.primary}
            />
          </Pressable>
        ) : (
          <Pressable
            style={styles.addButton}
            onPress={() => onToggle(item)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <MaterialCommunityIcons
              name="plus-circle-outline"
              size={22}
              color={colors.text.secondary}
            />
          </Pressable>
        )}
        <View style={styles.rowTextContainer}>
          <Text
            style={[
              styles.rowName,
              isOnList && styles.rowNameOnList,
            ]}
            numberOfLines={1}
          >
            {item.name}
          </Text>
          {(subtitle || isOnList) && (
            <View style={styles.subtitleRow}>
              {isOnList && (
                <Text style={styles.onListText}>(on list)</Text>
              )}
              {subtitle ? (
                <Text style={styles.rowSubtitle} numberOfLines={1}>
                  {subtitle}
                </Text>
              ) : null}
              {confidenceDots}
            </View>
          )}
        </View>
      </View>
      {priceText && (
        <Text style={[styles.rowPrice, isOnList && styles.rowPriceOnList]}>
          {priceText}
        </Text>
      )}
    </Pressable>
  );
});

interface PantryRowProps {
  item: PantryItemData;
  isSelected: boolean;
  isOnList: boolean;
  onToggle: (item: PantryItemData) => void;
}

const PantryRow = memo(function PantryRow({
  item,
  isSelected,
  isOnList,
  onToggle,
}: PantryRowProps) {
  const iconName = (item.icon ?? "food-variant") as keyof typeof MaterialCommunityIcons.glyphMap;

  return (
    <Pressable
      style={[styles.row, isSelected && styles.rowSelected]}
      onPress={() => {
        if (!isOnList) onToggle(item);
      }}
      disabled={isOnList}
    >
      <View style={styles.rowLeft}>
        {isOnList ? (
          <View style={styles.onListBadge}>
            <MaterialCommunityIcons
              name="check"
              size={14}
              color={colors.text.tertiary}
            />
          </View>
        ) : isSelected ? (
          <Pressable
            style={styles.checkButton}
            onPress={() => onToggle(item)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <MaterialCommunityIcons
              name="check-circle"
              size={22}
              color={colors.accent.primary}
            />
          </Pressable>
        ) : (
          <Pressable
            style={styles.addButton}
            onPress={() => onToggle(item)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <MaterialCommunityIcons
              name="plus-circle-outline"
              size={22}
              color={colors.text.secondary}
            />
          </Pressable>
        )}
        <View style={styles.pantryIconContainer}>
          <MaterialCommunityIcons
            name={iconName}
            size={18}
            color={
              item.stockLevel === "out"
                ? colors.accent.error
                : item.stockLevel === "low"
                  ? colors.accent.warning
                  : colors.text.secondary
            }
          />
        </View>
        <View style={styles.rowTextContainer}>
          <Text
            style={[
              styles.rowName,
              isOnList && styles.rowNameOnList,
            ]}
            numberOfLines={1}
          >
            {item.name}
          </Text>
          <View style={styles.subtitleRow}>
            {isOnList && (
              <Text style={styles.onListText}>(on list)</Text>
            )}
            <Text style={styles.rowSubtitle} numberOfLines={1}>
              {item.category}
              {item.lastPrice != null ? ` \u00B7 £${item.lastPrice.toFixed(2)}` : ""}
            </Text>
          </View>
        </View>
      </View>
      {item.lastPrice != null && !isOnList && (
        <Text style={styles.rowPrice}>£{item.lastPrice.toFixed(2)}</Text>
      )}
    </Pressable>
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────

export function AddItemsModal({
  visible,
  onClose,
  listId,
  listStoreName,
  listNormalizedStoreId,
  existingItems,
}: AddItemsModalProps) {
  // ── State ───────────────────────────────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [activeTab, setActiveTab] = useState<ActiveTab>("search");
  const [selectedItems, setSelectedItems] = useState<Map<string, SelectedItem>>(
    new Map()
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Tab animation ───────────────────────────────────────────────────────────
  const tabProgress = useSharedValue(0);
  const tabPillWidth = useSharedValue(0);

  const onTabContainerLayout = useCallback(
    (e: { nativeEvent: { layout: { width: number } } }) => {
      tabPillWidth.value = (e.nativeEvent.layout.width - 8) / 2;
    },
    [tabPillWidth]
  );

  const slidingPillStyle = useAnimatedStyle(() => ({
    width: tabPillWidth.value,
    transform: [{ translateX: tabProgress.value * tabPillWidth.value }],
    backgroundColor: interpolateColor(
      tabProgress.value,
      [0, 1],
      [`${colors.accent.primary}25`, `${colors.accent.primary}25`]
    ),
  }));

  // ── Convex queries ──────────────────────────────────────────────────────────
  const searchArgs = useMemo(() => {
    if (debouncedQuery.trim().length < 2) return "skip" as const;
    return {
      searchTerm: debouncedQuery.trim(),
      ...(listStoreName ? { storeName: listStoreName } : {}),
      limit: 20,
    };
  }, [debouncedQuery, listStoreName]);

  const searchResults = useQuery(api.itemSearch.searchItems, searchArgs);
  const pantryItems = useQuery(api.pantryItems.getByUser);

  // ── Convex mutations ────────────────────────────────────────────────────────
  const addFromPantryBulk = useMutation(api.listItems.addFromPantryBulk);
  const createItem = useMutation(api.listItems.create);
  const addAndSeedPantry = useMutation(api.listItems.addAndSeedPantry);

  // ── Derived data ────────────────────────────────────────────────────────────
  const existingItemNames = useMemo(() => {
    const names = new Set<string>();
    if (existingItems) {
      for (const item of existingItems) {
        names.add(item.name.toLowerCase().trim());
      }
    }
    return names;
  }, [existingItems]);

  const isItemOnList = useCallback(
    (name: string) => existingItemNames.has(name.toLowerCase().trim()),
    [existingItemNames]
  );

  // Pantry items split into sections
  const { outOfStock, runningLow } = useMemo(() => {
    if (!pantryItems) return { outOfStock: [], runningLow: [] };

    const out: PantryItemData[] = [];
    const low: PantryItemData[] = [];

    for (const item of pantryItems) {
      const data: PantryItemData = {
        _id: item._id,
        name: item.name,
        category: item.category,
        icon: item.icon,
        stockLevel: item.stockLevel,
        lastPrice: item.lastPrice,
        defaultSize: item.defaultSize,
        defaultUnit: item.defaultUnit,
      };
      if (item.stockLevel === "out") out.push(data);
      else if (item.stockLevel === "low") low.push(data);
    }

    return { outOfStock: out, runningLow: low };
  }, [pantryItems]);

  // Combined pantry list with section headers
  const pantryListData = useMemo(() => {
    type SectionHeader = { type: "header"; title: string; count: number };
    type PantryEntry = { type: "item"; data: PantryItemData };
    const entries: (SectionHeader | PantryEntry)[] = [];

    if (outOfStock.length > 0) {
      entries.push({ type: "header", title: "Out of Stock", count: outOfStock.length });
      for (const item of outOfStock) {
        entries.push({ type: "item", data: item });
      }
    }
    if (runningLow.length > 0) {
      entries.push({ type: "header", title: "Running Low", count: runningLow.length });
      for (const item of runningLow) {
        entries.push({ type: "item", data: item });
      }
    }

    return entries;
  }, [outOfStock, runningLow]);

  const searchSuggestions: SearchSuggestion[] = searchResults?.suggestions ?? [];
  const isSearchLoading = searchArgs !== "skip" && searchResults === undefined;
  const isPantryLoading = pantryItems === undefined;

  // ── Handlers ────────────────────────────────────────────────────────────────

  const handleSearchChange = useCallback(
    (text: string) => {
      setSearchQuery(text);

      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      if (text.trim().length < 2) {
        setDebouncedQuery("");
        return;
      }

      debounceTimerRef.current = setTimeout(() => {
        setDebouncedQuery(text);
      }, 300);
    },
    []
  );

  const handleTabSwitch = useCallback(
    (tab: ActiveTab) => {
      if (tab === activeTab) return;
      haptic("selection");
      setActiveTab(tab);
      tabProgress.value = withSpring(tab === "pantry" ? 1 : 0, {
        damping: 18,
        stiffness: 180,
      });
    },
    [activeTab, tabProgress]
  );

  const toggleSearchItem = useCallback(
    (item: SearchSuggestion) => {
      haptic("light");
      setSelectedItems((prev) => {
        const next = new Map(prev);
        const key = item.name.toLowerCase().trim();

        if (next.has(key)) {
          next.delete(key);
        } else {
          next.set(key, {
            name: item.name,
            category: item.category,
            size: item.size,
            unit: item.unit,
            estimatedPrice: item.estimatedPrice,
            quantity: 1,
            source: "search",
            pantryItemId: item.pantryItemId
              ? (item.pantryItemId as Id<"pantryItems">)
              : undefined,
          });
        }
        return next;
      });
    },
    []
  );

  const togglePantryItem = useCallback(
    (item: PantryItemData) => {
      haptic("light");
      setSelectedItems((prev) => {
        const next = new Map(prev);
        const key = item.name.toLowerCase().trim();

        if (next.has(key)) {
          next.delete(key);
        } else {
          next.set(key, {
            name: item.name,
            category: item.category,
            size: item.defaultSize,
            unit: item.defaultUnit,
            estimatedPrice: item.lastPrice,
            quantity: 1,
            source: "pantry",
            pantryItemId: item._id,
          });
        }
        return next;
      });
    },
    []
  );

  const handleAddCustomItem = useCallback(() => {
    const trimmed = searchQuery.trim();
    if (!trimmed) return;

    haptic("light");
    const key = trimmed.toLowerCase();

    setSelectedItems((prev) => {
      const next = new Map(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.set(key, {
          name: trimmed,
          quantity: 1,
          source: "search",
        });
      }
      return next;
    });
  }, [searchQuery]);

  const handleClose = useCallback(() => {
    setSearchQuery("");
    setDebouncedQuery("");
    setSelectedItems(new Map());
    setActiveTab("search");
    tabProgress.value = 0;
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    onClose();
  }, [onClose, tabProgress]);

  const handleSubmit = useCallback(async () => {
    if (selectedItems.size === 0) return;

    setIsSubmitting(true);
    haptic("medium");

    try {
      // Separate items by type
      const pantryItemIds: Id<"pantryItems">[] = [];
      const searchItemsToCreate: SelectedItem[] = [];
      const customItemsToSeed: SelectedItem[] = [];

      for (const [, item] of selectedItems) {
        if (item.pantryItemId) {
          // Item has a pantry link -- use bulk pantry add
          pantryItemIds.push(item.pantryItemId);
        } else if (item.source === "search" && !item.category) {
          // Custom item typed by user (no category = new item) -- seed pantry
          customItemsToSeed.push(item);
        } else {
          // Known search result without pantry link -- use create
          searchItemsToCreate.push(item);
        }
      }

      // 1. Bulk add pantry items
      if (pantryItemIds.length > 0) {
        await addFromPantryBulk({
          listId,
          pantryItemIds,
        });
      }

      // 2. Add search-result items one by one
      for (const item of searchItemsToCreate) {
        await createItem({
          listId,
          name: item.name,
          quantity: item.quantity,
          category: item.category,
          size: item.size,
          unit: item.unit,
          estimatedPrice: item.estimatedPrice,
        });
      }

      // 3. Add and seed pantry for brand-new custom items
      for (const item of customItemsToSeed) {
        await addAndSeedPantry({
          listId,
          name: item.name,
          category: item.category ?? "Uncategorized",
          size: item.size,
          unit: item.unit,
          estimatedPrice: item.estimatedPrice,
          quantity: item.quantity,
        });
      }

      haptic("success");
      handleClose();
    } catch (error) {
      console.error("Failed to add items:", error);
      haptic("error");
    } finally {
      setIsSubmitting(false);
    }
  }, [
    selectedItems,
    listId,
    addFromPantryBulk,
    createItem,
    addAndSeedPantry,
    handleClose,
  ]);

  // ── Render helpers ──────────────────────────────────────────────────────────

  const renderSearchItem = useCallback(
    ({ item }: ListRenderItemInfo<SearchSuggestion>) => {
      const key = item.name.toLowerCase().trim();
      return (
        <SearchRow
          item={item}
          isSelected={selectedItems.has(key)}
          isOnList={isItemOnList(item.name)}
          onToggle={toggleSearchItem}
        />
      );
    },
    [selectedItems, isItemOnList, toggleSearchItem]
  );

  const renderPantryEntry = useCallback(
    ({
      item,
    }: ListRenderItemInfo<
      | { type: "header"; title: string; count: number }
      | { type: "item"; data: PantryItemData }
    >) => {
      if (item.type === "header") {
        return (
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionHeaderText}>{item.title}</Text>
            <View style={styles.sectionBadge}>
              <Text style={styles.sectionBadgeText}>{item.count}</Text>
            </View>
          </View>
        );
      }

      const key = item.data.name.toLowerCase().trim();
      return (
        <PantryRow
          item={item.data}
          isSelected={selectedItems.has(key)}
          isOnList={isItemOnList(item.data.name)}
          onToggle={togglePantryItem}
        />
      );
    },
    [selectedItems, isItemOnList, togglePantryItem]
  );

  const searchKeyExtractor = useCallback(
    (item: SearchSuggestion, index: number) =>
      `search-${item.name}-${item.source}-${index}`,
    []
  );

  const pantryKeyExtractor = useCallback(
    (
      item:
        | { type: "header"; title: string; count: number }
        | { type: "item"; data: PantryItemData },
      index: number
    ) =>
      item.type === "header"
        ? `header-${item.title}`
        : `pantry-${item.data._id}-${index}`,
    []
  );

  const selectedCount = selectedItems.size;
  const hasCustomQuery =
    searchQuery.trim().length > 0 &&
    !searchSuggestions.some(
      (s) => s.name.toLowerCase().trim() === searchQuery.toLowerCase().trim()
    );
  const customQueryKey = searchQuery.trim().toLowerCase();
  const isCustomSelected = selectedItems.has(customQueryKey);

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <GlassModal
      visible={visible}
      onClose={handleClose}
      animationType="slide"
      position="bottom"
      maxWidth="full"
      avoidKeyboard
      statusBarTranslucent
      overlayOpacity={0.7}
      contentStyle={styles.modalContent}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Add Items</Text>
        <Pressable
          style={styles.closeButton}
          onPress={handleClose}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <MaterialCommunityIcons
            name="close"
            size={22}
            color={colors.text.secondary}
          />
        </Pressable>
      </View>

      {/* Search Input */}
      <View style={styles.searchContainer}>
        <GlassSearchInput
          placeholder="Search items..."
          value={searchQuery}
          onChangeText={handleSearchChange}
          autoFocus
        />
      </View>

      {/* Tab Toggle */}
      <View style={styles.tabContainer} onLayout={onTabContainerLayout}>
        <Animated.View style={[styles.slidingPill, slidingPillStyle]} />
        <Pressable
          style={styles.tab}
          onPress={() => handleTabSwitch("search")}
        >
          <MaterialCommunityIcons
            name="magnify"
            size={16}
            color={
              activeTab === "search"
                ? colors.accent.primary
                : colors.text.tertiary
            }
          />
          <Text
            style={[
              styles.tabText,
              activeTab === "search" && styles.tabTextActive,
            ]}
          >
            Search
          </Text>
        </Pressable>
        <Pressable
          style={styles.tab}
          onPress={() => handleTabSwitch("pantry")}
        >
          <MaterialCommunityIcons
            name="fridge-outline"
            size={16}
            color={
              activeTab === "pantry"
                ? colors.accent.primary
                : colors.text.tertiary
            }
          />
          <Text
            style={[
              styles.tabText,
              activeTab === "pantry" && styles.tabTextActive,
            ]}
          >
            Pantry
          </Text>
          {outOfStock.length + runningLow.length > 0 && (
            <View style={styles.tabBadge}>
              <Text style={styles.tabBadgeText}>
                {outOfStock.length + runningLow.length}
              </Text>
            </View>
          )}
        </Pressable>
      </View>

      {/* Content Area */}
      <View style={styles.contentArea}>
        {activeTab === "search" ? (
          <>
            {isSearchLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator
                  size="small"
                  color={colors.accent.primary}
                />
                <Text style={styles.loadingText}>Searching...</Text>
              </View>
            ) : debouncedQuery.trim().length < 2 ? (
              <View style={styles.emptyContainer}>
                <MaterialCommunityIcons
                  name="magnify"
                  size={48}
                  color={colors.text.disabled}
                />
                <Text style={styles.emptyText}>
                  Type at least 2 characters to search
                </Text>
              </View>
            ) : searchSuggestions.length === 0 && !hasCustomQuery ? (
              <View style={styles.emptyContainer}>
                <MaterialCommunityIcons
                  name="magnify-close"
                  size={48}
                  color={colors.text.disabled}
                />
                <Text style={styles.emptyText}>No results found</Text>
              </View>
            ) : (
              <FlatList
                data={searchSuggestions}
                renderItem={renderSearchItem}
                keyExtractor={searchKeyExtractor}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                ListFooterComponent={
                  hasCustomQuery ? (
                    <Pressable
                      style={[
                        styles.row,
                        styles.customItemRow,
                        isCustomSelected && styles.rowSelected,
                      ]}
                      onPress={handleAddCustomItem}
                    >
                      <View style={styles.rowLeft}>
                        <View style={styles.customItemIcon}>
                          <MaterialCommunityIcons
                            name={isCustomSelected ? "check" : "plus"}
                            size={16}
                            color={
                              isCustomSelected
                                ? colors.accent.primary
                                : colors.text.primary
                            }
                          />
                        </View>
                        <View style={styles.rowTextContainer}>
                          <Text style={styles.rowName}>
                            {`Add "${searchQuery.trim()}"`}
                          </Text>
                          <Text style={styles.rowSubtitle}>
                            Not found? Add as new item
                          </Text>
                        </View>
                      </View>
                    </Pressable>
                  ) : null
                }
              />
            )}
          </>
        ) : (
          <>
            {isPantryLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator
                  size="small"
                  color={colors.accent.primary}
                />
                <Text style={styles.loadingText}>Loading pantry...</Text>
              </View>
            ) : pantryListData.length === 0 ? (
              <View style={styles.emptyContainer}>
                <MaterialCommunityIcons
                  name="fridge-off-outline"
                  size={48}
                  color={colors.text.disabled}
                />
                <Text style={styles.emptyText}>
                  No items need restocking
                </Text>
                <Text style={styles.emptySubtext}>
                  Items marked as &quot;Out&quot; or &quot;Low&quot; in your pantry will appear
                  here
                </Text>
              </View>
            ) : (
              <FlatList
                data={pantryListData}
                renderItem={renderPantryEntry}
                keyExtractor={pantryKeyExtractor}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
              />
            )}
          </>
        )}
      </View>

      {/* Sticky Bottom Button */}
      <View style={styles.bottomBar}>
        <GlassButton
          variant="primary"
          size="lg"
          onPress={handleSubmit}
          disabled={selectedCount === 0 || isSubmitting}
          loading={isSubmitting}
          style={styles.submitButton}
        >
          {selectedCount === 0
            ? "Select items to add"
            : `Add ${selectedCount} Item${selectedCount !== 1 ? "s" : ""}`}
        </GlassButton>
      </View>
    </GlassModal>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  // Modal
  modalContent: {
    height: "85%",
    paddingBottom: 0,
    paddingHorizontal: 0,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
  },

  // Header
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  headerTitle: {
    ...typography.headlineMedium,
    color: colors.text.primary,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.full,
    backgroundColor: colors.glass.background,
    justifyContent: "center",
    alignItems: "center",
  },

  // Search
  searchContainer: {
    paddingHorizontal: spacing.xl,
    marginBottom: spacing.md,
  },

  // Tab toggle (matches lists.tsx pattern)
  tabContainer: {
    flexDirection: "row",
    marginHorizontal: spacing.xl,
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

  // Content area
  contentArea: {
    flex: 1,
    minHeight: 0,
  },
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
  },

  // Loading
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing["3xl"],
  },
  loadingText: {
    ...typography.bodyMedium,
    color: colors.text.tertiary,
  },

  // Empty
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing["3xl"],
    paddingHorizontal: spacing.xl,
  },
  emptyText: {
    ...typography.bodyLarge,
    color: colors.text.secondary,
    textAlign: "center",
  },
  emptySubtext: {
    ...typography.bodySmall,
    color: colors.text.tertiary,
    textAlign: "center",
    lineHeight: 18,
  },

  // Section headers (pantry)
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xs,
  },
  sectionHeaderText: {
    ...typography.labelLarge,
    color: colors.text.secondary,
  },
  sectionBadge: {
    backgroundColor: colors.glass.backgroundActive,
    borderRadius: borderRadius.full,
    minWidth: 22,
    height: 22,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: spacing.sm,
  },
  sectionBadgeText: {
    ...typography.labelSmall,
    color: colors.text.secondary,
    fontWeight: "600",
    fontSize: 11,
  },

  // Row items
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.xs,
    backgroundColor: colors.glass.background,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.glass.border,
  },
  rowSelected: {
    borderColor: colors.accent.primary,
    backgroundColor: "rgba(0, 212, 170, 0.08)",
  },
  rowLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: spacing.sm,
    marginRight: spacing.sm,
  },
  rowTextContainer: {
    flex: 1,
  },
  rowName: {
    ...typography.bodyLarge,
    color: colors.text.primary,
    fontWeight: "500",
  },
  rowNameOnList: {
    color: colors.text.tertiary,
  },
  rowPrice: {
    ...typography.labelMedium,
    color: colors.accent.primary,
    fontWeight: "700",
  },
  rowPriceOnList: {
    color: colors.text.disabled,
  },
  rowSubtitle: {
    ...typography.bodySmall,
    color: colors.text.tertiary,
  },
  subtitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    marginTop: 2,
  },

  // Buttons in rows
  addButton: {
    width: 28,
    height: 28,
    justifyContent: "center",
    alignItems: "center",
  },
  checkButton: {
    width: 28,
    height: 28,
    justifyContent: "center",
    alignItems: "center",
  },

  // On-list badge
  onListBadge: {
    width: 28,
    height: 28,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: borderRadius.full,
    backgroundColor: colors.glass.backgroundActive,
  },
  onListText: {
    ...typography.labelSmall,
    color: colors.text.disabled,
    fontStyle: "italic",
  },

  // Pantry icon
  pantryIconContainer: {
    width: 28,
    height: 28,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: borderRadius.sm,
    backgroundColor: colors.glass.backgroundActive,
  },

  // Confidence dots
  confidenceDots: {
    flexDirection: "row",
    gap: 3,
    marginLeft: spacing.xs,
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  dotFilled: {
    backgroundColor: colors.accent.primary,
  },
  dotEmpty: {
    backgroundColor: colors.glass.backgroundActive,
  },

  // Custom item (add new) row
  customItemRow: {
    borderStyle: "dashed" as unknown as undefined,
    opacity: 0.9,
  },
  customItemIcon: {
    width: 28,
    height: 28,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: borderRadius.full,
    backgroundColor: `${colors.accent.primary}20`,
  },

  // Bottom bar
  bottomBar: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.glass.border,
    backgroundColor: colors.background.primary,
  },
  submitButton: {
    width: "100%",
  },
});
