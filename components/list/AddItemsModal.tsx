import React, { useState, useCallback, useRef, useMemo, memo } from "react";
import {
  View,
  Text,
  TextInput,
  FlatList,
  Pressable,
  ActivityIndicator,
  StyleSheet,
  ScrollView,
  type ListRenderItemInfo,
} from "react-native";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import {
  GlassModal,
  GlassInput,
  GlassButton,
  colors,
  typography,
  spacing,
  borderRadius,
} from "@/components/ui/glass";
import { haptic } from "@/lib/haptics/safeHaptics";
import { useItemSuggestions } from "@/hooks/useItemSuggestions";
import type { ItemSuggestion } from "@/hooks/useItemSuggestions";
import { ItemSuggestionsDropdown } from "@/components/list/ItemSuggestionsDropdown";
import { VariantPicker } from "@/components/items/VariantPicker";
import type { VariantOption } from "@/components/items/VariantPicker";
import { useVariantPrefetch } from "@/hooks/useVariantPrefetch";

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
  source: "search" | "pantry" | "manual";
  pantryItemId?: Id<"pantryItems">;
}

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

type ActiveView = "suggestions" | "variants" | "pantry";

// ─────────────────────────────────────────────────────────────────────────────
// Pantry Row Component (memoized)
// ─────────────────────────────────────────────────────────────────────────────

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
  const [itemName, setItemName] = useState("");
  const [manualSize, setManualSize] = useState("");
  const [manualQty, setManualQty] = useState("1");
  const [manualPrice, setManualPrice] = useState("");
  const [editingField, setEditingField] = useState<"size" | "qty" | "price" | null>(null);
  const [activeView, setActiveView] = useState<ActiveView>("suggestions");
  const [selectedSuggestion, setSelectedSuggestion] = useState<ItemSuggestion | null>(null);
  const [selectedVariantName, setSelectedVariantName] = useState<string | undefined>(undefined);
  const [selectedItems, setSelectedItems] = useState<Map<string, SelectedItem>>(
    new Map()
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  const sizeInputRef = useRef<TextInput>(null);
  const qtyInputRef = useRef<TextInput>(null);
  const priceInputRef = useRef<TextInput>(null);

  // ── Item search via useItemSuggestions hook ─────────────────────────────────
  const {
    suggestions,
    isLoading: isSuggestionsLoading,
    search: searchItems,
    acceptSuggestion,
    clear: clearSuggestions,
  } = useItemSuggestions({ storeName: listStoreName });

  const { triggerPrefetch } = useVariantPrefetch({
    store: listNormalizedStoreId ?? listStoreName ?? "tesco",
  });

  const priceEstimate = useQuery(
    api.currentPrices.getEstimate,
    itemName.trim().length >= 2 ? { itemName: itemName.trim() } : "skip"
  );

  // ── Variant sizes query (fires when a suggestion is selected) ──────────────
  const variantArgs = useMemo(() => {
    if (!selectedSuggestion || !listNormalizedStoreId) return "skip" as const;
    return {
      itemName: selectedSuggestion.name,
      store: listNormalizedStoreId,
      ...(selectedSuggestion.category ? { category: selectedSuggestion.category } : {}),
    };
  }, [selectedSuggestion, listNormalizedStoreId]);

  const variantResult = useQuery(api.itemVariants.getSizesForStore, variantArgs);
  const isVariantsLoading = variantArgs !== "skip" && variantResult === undefined;

  // Map variant results to VariantOption[]
  const variantOptions: VariantOption[] = useMemo(() => {
    if (!variantResult?.sizes) return [];
    return variantResult.sizes.map((s) => ({
      variantName: `${selectedSuggestion?.name ?? ""} ${s.size}`,
      size: s.sizeNormalized || s.size,
      unit: s.unitLabel.replace("/", ""),
      price: s.price,
      priceSource: s.source as "personal" | "crowdsourced" | "ai_estimate",
      isUsual: s.isUsual,
    }));
  }, [variantResult, selectedSuggestion]);

  // ── Convex queries & mutations ────────────────────────────────────────────
  const pantryItems = useQuery(api.pantryItems.getByUser);
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

  const existingItemNamesList = useMemo(
    () => existingItems?.map((i) => i.name) ?? [],
    [existingItems]
  );

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

  const pantryListData = useMemo(() => {
    type SectionHeader = { type: "header"; title: string; count: number };
    type PantryEntry = { type: "item"; data: PantryItemData };
    const entries: (SectionHeader | PantryEntry)[] = [];

    if (outOfStock.length > 0) {
      entries.push({ type: "header", title: "Out of Stock", count: outOfStock.length });
      for (const item of outOfStock) entries.push({ type: "item", data: item });
    }
    if (runningLow.length > 0) {
      entries.push({ type: "header", title: "Running Low", count: runningLow.length });
      for (const item of runningLow) entries.push({ type: "item", data: item });
    }

    return entries;
  }, [outOfStock, runningLow]);

  const isPantryLoading = pantryItems === undefined;
  const pantryNeedCount = outOfStock.length + runningLow.length;

  // Whether suggestions dropdown should be visible
  const showSuggestions =
    activeView === "suggestions" &&
    !selectedSuggestion &&
    itemName.trim().length >= 2;

  // ── Handlers ────────────────────────────────────────────────────────────────

  const handleNameChange = useCallback(
    (text: string) => {
      setItemName(text);
      if (selectedSuggestion) {
        setSelectedSuggestion(null);
        setSelectedVariantName(undefined);
      }
      if (activeView !== "suggestions") setActiveView("suggestions");
      searchItems(text);
      triggerPrefetch(text);
    },
    [activeView, selectedSuggestion, searchItems, triggerPrefetch]
  );

  const handleSelectSuggestion = useCallback(
    (suggestion: ItemSuggestion) => {
      haptic("light");
      const name = acceptSuggestion(suggestion);
      setItemName(name);
      setSelectedSuggestion(suggestion);
      setActiveView("variants");

      // Pre-fill fields from suggestion
      if (suggestion.estimatedPrice != null) {
        setManualPrice(suggestion.estimatedPrice.toFixed(2));
      }
      if (suggestion.size) {
        setManualSize(suggestion.size);
      }
    },
    [acceptSuggestion]
  );

  const handleVariantSelect = useCallback(
    (variantName: string) => {
      haptic("light");
      setSelectedVariantName(variantName);

      // Find the selected variant and populate fields
      const variant = variantOptions.find((v) => v.variantName === variantName);
      if (variant) {
        setManualSize(variant.size);
        if (variant.price != null) {
          setManualPrice(variant.price.toFixed(2));
        }
      }
    },
    [variantOptions]
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

  const handleAddManualItem = useCallback(() => {
    const trimmed = itemName.trim();
    if (!trimmed) return;

    haptic("light");
    const key = trimmed.toLowerCase();
    const qty = parseInt(manualQty, 10) || 1;
    const price = manualPrice
      ? parseFloat(manualPrice)
      : (priceEstimate?.cheapest?.price ?? undefined);

    // Find unit from selected variant
    const selectedVariant = variantOptions.find(
      (v) => v.variantName === selectedVariantName
    );

    setSelectedItems((prev) => {
      const next = new Map(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.set(key, {
          name: trimmed,
          quantity: qty,
          size: manualSize || undefined,
          unit: selectedVariant?.unit || undefined,
          estimatedPrice: price,
          category: selectedSuggestion?.category,
          source: "manual",
          pantryItemId: selectedSuggestion?.pantryItemId
            ? (selectedSuggestion.pantryItemId as Id<"pantryItems">)
            : undefined,
        });
      }
      return next;
    });

    // Reset fields
    setItemName("");
    setManualSize("");
    setManualQty("1");
    setManualPrice("");
    setEditingField(null);
    setSelectedSuggestion(null);
    setSelectedVariantName(undefined);
    setActiveView("suggestions");
    clearSuggestions();
  }, [
    itemName,
    manualSize,
    manualQty,
    manualPrice,
    priceEstimate,
    selectedSuggestion,
    selectedVariantName,
    variantOptions,
    clearSuggestions,
  ]);

  const handleFieldToggle = useCallback(
    (field: "size" | "qty" | "price") => {
      haptic("light");
      setEditingField((prev) => (prev === field ? null : field));
      setTimeout(() => {
        if (field === "size") sizeInputRef.current?.focus();
        else if (field === "qty") qtyInputRef.current?.focus();
        else if (field === "price") priceInputRef.current?.focus();
      }, 100);
    },
    []
  );

  const handleShowPantry = useCallback(() => {
    haptic("light");
    setActiveView("pantry");
  }, []);

  const handleClose = useCallback(() => {
    setItemName("");
    setManualSize("");
    setManualQty("1");
    setManualPrice("");
    setEditingField(null);
    setSelectedItems(new Map());
    setSelectedSuggestion(null);
    setSelectedVariantName(undefined);
    setActiveView("suggestions");
    clearSuggestions();
    onClose();
  }, [onClose, clearSuggestions]);

  const handleSubmit = useCallback(async () => {
    if (selectedItems.size === 0) return;

    setIsSubmitting(true);
    haptic("medium");

    try {
      const pantryItemIds: Id<"pantryItems">[] = [];
      const searchItemsToCreate: SelectedItem[] = [];
      const customItemsToSeed: SelectedItem[] = [];

      // Build a lookup of existing pantry items by normalized name
      // to prevent creating duplicate pantry entries
      const pantryByName = new Map<string, Id<"pantryItems">>();
      if (pantryItems) {
        for (const p of pantryItems) {
          pantryByName.set(p.name.toLowerCase().trim(), p._id);
        }
      }

      for (const [, item] of selectedItems) {
        if (item.pantryItemId) {
          pantryItemIds.push(item.pantryItemId);
        } else if (
          (item.source === "search" || item.source === "manual") &&
          !item.category
        ) {
          // Check if a matching pantry item already exists before seeding
          const existingPantryId = pantryByName.get(item.name.toLowerCase().trim());
          if (existingPantryId) {
            // Use createItem with the existing pantryItemId instead of seeding a duplicate
            searchItemsToCreate.push({ ...item, pantryItemId: existingPantryId });
          } else {
            customItemsToSeed.push(item);
          }
        } else {
          searchItemsToCreate.push(item);
        }
      }

      if (pantryItemIds.length > 0) {
        await addFromPantryBulk({ listId, pantryItemIds });
      }

      for (const item of searchItemsToCreate) {
        await createItem({
          listId,
          name: item.name,
          quantity: item.quantity,
          category: item.category,
          size: item.size,
          unit: item.unit,
          estimatedPrice: item.estimatedPrice,
          ...(item.pantryItemId ? { pantryItemId: item.pantryItemId } : {}),
        });
      }

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
    pantryItems,
    addFromPantryBulk,
    createItem,
    addAndSeedPantry,
    handleClose,
  ]);

  // ── Render helpers ──────────────────────────────────────────────────────────

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

      {/* Input Section */}
      <View style={styles.inputSection}>
        <View style={styles.nameInputRow}>
          <View style={styles.nameInputWrapper}>
            <GlassInput
              placeholder="Item name"
              value={itemName}
              onChangeText={handleNameChange}
              autoFocus
              size="md"
            />
          </View>
          <Pressable
            style={[
              styles.addIconButton,
              itemName.trim().length > 0
                ? styles.addIconButtonActive
                : styles.addIconButtonDisabled,
            ]}
            onPress={handleAddManualItem}
            disabled={itemName.trim().length === 0}
          >
            <MaterialCommunityIcons
              name="plus"
              size={22}
              color={
                itemName.trim().length > 0
                  ? colors.text.primary
                  : colors.text.disabled
              }
            />
          </Pressable>
        </View>

        {/* Size / Qty / Price buttons */}
        <View style={styles.fieldButtonRow}>
          <Pressable
            style={[
              styles.fieldButton,
              editingField === "size" && styles.fieldButtonActive,
              manualSize.length > 0 && styles.fieldButtonFilled,
            ]}
            onPress={() => handleFieldToggle("size")}
          >
            <MaterialCommunityIcons
              name="ruler"
              size={14}
              color={
                manualSize.length > 0
                  ? colors.accent.primary
                  : colors.text.secondary
              }
            />
            <Text
              style={[
                styles.fieldButtonText,
                manualSize.length > 0 && styles.fieldButtonTextFilled,
              ]}
            >
              {manualSize || "Size"}
            </Text>
          </Pressable>

          <Pressable
            style={[
              styles.fieldButton,
              editingField === "qty" && styles.fieldButtonActive,
              manualQty !== "1" && styles.fieldButtonFilled,
            ]}
            onPress={() => handleFieldToggle("qty")}
          >
            <MaterialCommunityIcons
              name="numeric"
              size={14}
              color={
                manualQty !== "1"
                  ? colors.accent.primary
                  : colors.text.secondary
              }
            />
            <Text
              style={[
                styles.fieldButtonText,
                manualQty !== "1" && styles.fieldButtonTextFilled,
              ]}
            >
              {manualQty !== "1" ? `x${manualQty}` : "Qty"}
            </Text>
          </Pressable>

          <Pressable
            style={[
              styles.fieldButton,
              editingField === "price" && styles.fieldButtonActive,
              manualPrice.length > 0 && styles.fieldButtonFilled,
            ]}
            onPress={() => handleFieldToggle("price")}
          >
            <MaterialCommunityIcons
              name="currency-gbp"
              size={14}
              color={
                manualPrice.length > 0
                  ? colors.accent.primary
                  : colors.text.secondary
              }
            />
            <Text
              style={[
                styles.fieldButtonText,
                manualPrice.length > 0 && styles.fieldButtonTextFilled,
              ]}
            >
              {manualPrice ? `£${manualPrice}` : "Price"}
            </Text>
          </Pressable>
        </View>

        {/* Inline field editor */}
        {editingField && (
          <View style={styles.fieldEditorRow}>
            {editingField === "size" && (
              <TextInput
                ref={sizeInputRef}
                style={styles.fieldEditorInput}
                placeholder="e.g. 500ml, 1kg"
                placeholderTextColor={colors.text.disabled}
                value={manualSize}
                onChangeText={setManualSize}
                onSubmitEditing={() => setEditingField(null)}
                returnKeyType="done"
              />
            )}
            {editingField === "qty" && (
              <TextInput
                ref={qtyInputRef}
                style={styles.fieldEditorInput}
                placeholder="Quantity"
                placeholderTextColor={colors.text.disabled}
                value={manualQty}
                onChangeText={setManualQty}
                keyboardType="number-pad"
                onSubmitEditing={() => setEditingField(null)}
                returnKeyType="done"
              />
            )}
            {editingField === "price" && (
              <TextInput
                ref={priceInputRef}
                style={styles.fieldEditorInput}
                placeholder="Estimated price"
                placeholderTextColor={colors.text.disabled}
                value={manualPrice}
                onChangeText={setManualPrice}
                keyboardType="decimal-pad"
                onSubmitEditing={() => setEditingField(null)}
                returnKeyType="done"
              />
            )}
          </View>
        )}

        {!manualPrice && priceEstimate?.cheapest && (
          <Text style={styles.priceHint}>
            ~£{priceEstimate.cheapest.price.toFixed(2)} est.
          </Text>
        )}

        {/* Add from Pantry button */}
        <Pressable
          style={[
            styles.pantryButton,
            activeView === "pantry" && styles.pantryButtonActive,
          ]}
          onPress={handleShowPantry}
        >
          <MaterialCommunityIcons
            name="fridge-outline"
            size={18}
            color={
              activeView === "pantry"
                ? colors.accent.primary
                : colors.text.secondary
            }
          />
          <Text
            style={[
              styles.pantryButtonText,
              activeView === "pantry" && styles.pantryButtonTextActive,
            ]}
          >
            Add from Pantry
          </Text>
          {pantryNeedCount > 0 && (
            <View style={styles.pantryBadge}>
              <Text style={styles.pantryBadgeText}>{pantryNeedCount}</Text>
            </View>
          )}
        </Pressable>
      </View>

      {/* Content Area */}
      <View style={styles.contentArea}>
        {activeView === "pantry" ? (
          /* ── Pantry view ─────────────────────────────────── */
          <>
            {isPantryLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color={colors.accent.primary} />
                <Text style={styles.loadingText}>Loading pantry...</Text>
              </View>
            ) : pantryListData.length === 0 ? (
              <View style={styles.emptyContainer}>
                <MaterialCommunityIcons
                  name="fridge-off-outline"
                  size={48}
                  color={colors.text.disabled}
                />
                <Text style={styles.emptyText}>No items need restocking</Text>
                <Text style={styles.emptySubtext}>
                  Items marked as &quot;Out&quot; or &quot;Low&quot; in your pantry will appear here
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
        ) : activeView === "variants" && selectedSuggestion ? (
          /* ── Variant picker view ────────────────────────── */
          <ScrollView
            style={styles.variantScrollView}
            contentContainerStyle={styles.variantScrollContent}
            keyboardShouldPersistTaps="handled"
          >
            {isVariantsLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color={colors.accent.primary} />
                <Text style={styles.loadingText}>Loading sizes...</Text>
              </View>
            ) : variantOptions.length === 0 ? (
              <View style={styles.variantEmptyContainer}>
                <MaterialCommunityIcons
                  name="information-outline"
                  size={24}
                  color={colors.text.tertiary}
                />
                <Text style={styles.variantEmptyText}>
                  No size options found for {selectedSuggestion.name}
                </Text>
                <Text style={styles.emptySubtext}>
                  You can set the size manually using the buttons above
                </Text>
              </View>
            ) : (
              <>
                <Text style={styles.variantSectionTitle}>Pick a size</Text>
                <VariantPicker
                  baseItem={selectedSuggestion.name}
                  variants={variantOptions}
                  selectedVariant={selectedVariantName}
                  onSelect={handleVariantSelect}
                  showPricePerUnit
                  isLoading={isVariantsLoading}
                />
              </>
            )}
          </ScrollView>
        ) : (
          /* ── Suggestions view (default) ─────────────────── */
          <>
            {showSuggestions ? (
              <View style={styles.suggestionsContainer}>
                <ItemSuggestionsDropdown
                  suggestions={suggestions}
                  isLoading={isSuggestionsLoading}
                  onSelect={handleSelectSuggestion}
                  onDismiss={() => {}}
                  visible
                  existingItemNames={existingItemNamesList}
                />
              </View>
            ) : (
              <View style={styles.emptyContainer}>
                <MaterialCommunityIcons
                  name="text-box-search-outline"
                  size={48}
                  color={colors.text.disabled}
                />
                <Text style={styles.emptyText}>
                  Type an item name to search or add manually
                </Text>
              </View>
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

  // Input section
  inputSection: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.glass.border,
    gap: spacing.sm,
  },
  nameInputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  nameInputWrapper: {
    flex: 1,
  },
  addIconButton: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.md,
    justifyContent: "center",
    alignItems: "center",
  },
  addIconButtonActive: {
    backgroundColor: colors.accent.primary,
  },
  addIconButtonDisabled: {
    backgroundColor: colors.glass.background,
    borderWidth: 1,
    borderColor: colors.glass.border,
  },

  // Field buttons row (Size / Qty / Price)
  fieldButtonRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  fieldButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    backgroundColor: colors.glass.background,
    borderWidth: 1,
    borderColor: colors.glass.border,
    borderRadius: borderRadius.md,
  },
  fieldButtonActive: {
    borderColor: colors.accent.primary,
    backgroundColor: "rgba(0, 212, 170, 0.08)",
  },
  fieldButtonFilled: {
    borderColor: "rgba(0, 212, 170, 0.3)",
  },
  fieldButtonText: {
    ...typography.labelMedium,
    color: colors.text.secondary,
  },
  fieldButtonTextFilled: {
    color: colors.accent.primary,
    fontWeight: "600",
  },

  // Inline field editor
  fieldEditorRow: {
    flexDirection: "row",
  },
  fieldEditorInput: {
    flex: 1,
    ...typography.bodyMedium,
    color: colors.text.primary,
    backgroundColor: colors.glass.background,
    borderWidth: 1,
    borderColor: colors.glass.border,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  priceHint: {
    ...typography.bodySmall,
    color: colors.accent.primary,
    marginTop: 4,
    opacity: 0.8,
    paddingHorizontal: spacing.xl,
  },

  // Add from Pantry button
  pantryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    backgroundColor: colors.glass.background,
    borderWidth: 1,
    borderColor: colors.glass.border,
    borderRadius: borderRadius.md,
  },
  pantryButtonActive: {
    borderColor: colors.accent.primary,
    backgroundColor: "rgba(0, 212, 170, 0.08)",
  },
  pantryButtonText: {
    ...typography.labelMedium,
    color: colors.text.primary,
  },
  pantryButtonTextActive: {
    color: colors.accent.primary,
    fontWeight: "600",
  },
  pantryBadge: {
    backgroundColor: colors.accent.primary,
    borderRadius: borderRadius.sm,
    minWidth: 20,
    height: 20,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: spacing.sm,
  },
  pantryBadgeText: {
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

  // Suggestions container
  suggestionsContainer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    flex: 1,
  },

  // Variant picker
  variantScrollView: {
    flex: 1,
  },
  variantScrollContent: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.lg,
  },
  variantSectionTitle: {
    ...typography.labelLarge,
    color: colors.text.secondary,
    marginBottom: spacing.md,
  },
  variantEmptyContainer: {
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: spacing["3xl"],
    paddingHorizontal: spacing.xl,
  },
  variantEmptyText: {
    ...typography.bodyMedium,
    color: colors.text.primary,
    textAlign: "center",
    width: "100%",
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
    color: colors.text.primary,
    textAlign: "center",
    width: "100%",
  },
  emptySubtext: {
    ...typography.bodySmall,
    color: colors.text.secondary,
    textAlign: "center",
    lineHeight: 18,
    width: "100%",
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
    color: colors.text.primary,
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
