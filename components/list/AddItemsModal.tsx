import React, { useState, useCallback, useRef, useMemo, useEffect, memo } from "react";
import {
  View,
  Text,
  TextInput,
  FlatList,
  Pressable,
  ActivityIndicator,
  StyleSheet,
  StatusBar,
  Keyboard,
  ScrollView,
  type ListRenderItemInfo,
} from "react-native";
import Animated, { FadeInDown, FadeOut } from "react-native-reanimated";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import {
  GlassModal,
  GlassInput,
  GlassButton,
  useGlassAlert,
  colors,
  typography,
  spacing,
  borderRadius,
} from "@/components/ui/glass";
import { haptic } from "@/lib/haptics/safeHaptics";
import { useProductScanner } from "@/hooks/useProductScanner";
import { useItemSuggestions } from "@/hooks/useItemSuggestions";
import type { ItemSuggestion } from "@/hooks/useItemSuggestions";
import { VariantPicker } from "@/components/items/VariantPicker";
import type { VariantOption } from "@/components/items/VariantPicker";
import { useVariantPrefetch } from "@/hooks/useVariantPrefetch";
import { getIconForItem } from "@/lib/icons/iconMatcher";
import { useSafeAreaInsets } from "react-native-safe-area-context";

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

interface AddedFeedbackItem {
  id: number;
  name: string;
  size?: string;
  price?: number;
}

type ActiveView = "search" | "pantry";

// ─────────────────────────────────────────────────────────────────────────────
// Pantry Row Component (memoized)
// ─────────────────────────────────────────────────────────────────────────────

interface PantryRowProps {
  item: PantryItemData;
  isOnList: boolean;
  onAdd: (item: PantryItemData) => void;
}

const PantryRow = memo(function PantryRow({
  item,
  isOnList,
  onAdd,
}: PantryRowProps) {
  const iconName = (item.icon ?? "food-variant") as keyof typeof MaterialCommunityIcons.glyphMap;

  return (
    <Pressable
      style={styles.row}
      onPress={() => {
        if (!isOnList) onAdd(item);
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
        ) : (
          <Pressable
            style={styles.addButton}
            onPress={() => onAdd(item)}
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
  const insets = useSafeAreaInsets();
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  useEffect(() => {
    const showSub = Keyboard.addListener("keyboardDidShow", () => setKeyboardVisible(true));
    const hideSub = Keyboard.addListener("keyboardDidHide", () => setKeyboardVisible(false));
    return () => { showSub.remove(); hideSub.remove(); };
  }, []);

  // ── State ───────────────────────────────────────────────────────────────────
  const [itemName, setItemName] = useState("");
  const [manualSize, setManualSize] = useState("");
  const [manualQty, setManualQty] = useState("1");
  const [manualPrice, setManualPrice] = useState("");
  const [editingField, setEditingField] = useState<"size" | "qty" | "price" | null>(null);
  const [activeView, setActiveView] = useState<ActiveView>("search");
  const [selectedSuggestion, setSelectedSuggestion] = useState<ItemSuggestion | null>(null);
  const [selectedVariantName, setSelectedVariantName] = useState<string | undefined>(undefined);
  const [scannedCategory, setScannedCategory] = useState<string | undefined>(undefined);
  const [addedThisSession, setAddedThisSession] = useState<AddedFeedbackItem[]>([]);
  const [sessionAddCount, setSessionAddCount] = useState(0);
  const [isAdding, setIsAdding] = useState(false);
  const feedbackIdRef = useRef(0);
  const { alert } = useGlassAlert();

  const itemInputRef = useRef<TextInput>(null);
  const sizeInputRef = useRef<TextInput>(null);
  const qtyInputRef = useRef<TextInput>(null);
  const priceInputRef = useRef<TextInput>(null);

  // ── Item search via useItemSuggestions hook ─────────────────────────────────
  const {
    suggestions,
    isLoading: isSuggestionsLoading,
    search: searchItems,
    clear: clearSuggestions,
  } = useItemSuggestions({ storeName: listStoreName });

  const { triggerPrefetch } = useVariantPrefetch({
    store: listNormalizedStoreId ?? listStoreName ?? "tesco",
  });

  // ── Product scanner (camera) ──────────────────────────────────────────────
  const productScanner = useProductScanner({
    onDuplicate: (existing) => {
      alert("Already Scanned", `${existing.name} is already in this session.`);
    },
  });
  const enrichVariant = useMutation(api.itemVariants.enrichFromScan);

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
      displayLabel: s.displayLabel,
    }));
  }, [variantResult, selectedSuggestion]);

  // ── Convex queries & mutations ────────────────────────────────────────────
  const pantryItems = useQuery(api.pantryItems.getByUser);
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

  // ── Auto-select top suggestion as user types ─────────────────────────────
  useEffect(() => {
    if (activeView !== "search") return;
    if (suggestions.length > 0 && itemName.trim().length >= 2) {
      const top = suggestions[0];
      // Only update if the top suggestion actually changed
      if (!selectedSuggestion || selectedSuggestion.name !== top.name) {
        setSelectedSuggestion(top);
        if (top.estimatedPrice != null) {
          setManualPrice(top.estimatedPrice.toFixed(2));
        }
        if (top.size) {
          setManualSize(top.size);
        }
      }
    } else if (itemName.trim().length < 2) {
      if (selectedSuggestion) setSelectedSuggestion(null);
    }
  }, [suggestions, itemName, activeView]); // eslint-disable-line react-hooks/exhaustive-deps

  // Other matching items for disambiguation (skip the auto-selected top one)
  const altSuggestions = useMemo(() => {
    if (!selectedSuggestion || suggestions.length <= 1) return [];
    return suggestions.filter((s) => s.name !== selectedSuggestion.name).slice(0, 5);
  }, [suggestions, selectedSuggestion]);

  // ── Reset helper ───────────────────────────────────────────────────────────

  const resetInputFields = useCallback(() => {
    setItemName("");
    setManualSize("");
    setManualQty("1");
    setManualPrice("");
    setEditingField(null);
    setSelectedSuggestion(null);
    setSelectedVariantName(undefined);
    setScannedCategory(undefined);
    setActiveView("search");
    clearSuggestions();
    setTimeout(() => itemInputRef.current?.focus(), 150);
  }, [clearSuggestions]);

  // ── Show feedback pill ────────────────────────────────────────────────────

  const showAddedFeedback = useCallback(
    (name: string, size?: string, price?: number) => {
      const id = ++feedbackIdRef.current;
      setAddedThisSession((prev) => [{ id, name, size, price }, ...prev]);
      setSessionAddCount((prev) => prev + 1);
      // Auto-dismiss pill after 2.5s (counter stays)
      setTimeout(() => {
        setAddedThisSession((prev) => prev.filter((f) => f.id !== id));
      }, 2500);
    },
    []
  );

  // ── Per-item add to list ──────────────────────────────────────────────────

  const addItemToList = useCallback(
    async (item: SelectedItem, force = false) => {
      setIsAdding(true);
      try {
        let result: { status: string; existingName?: string; existingQuantity?: number } | undefined;

        if (!item.category && !item.pantryItemId) {
          // Custom item without category → seed pantry
          result = await addAndSeedPantry({
            listId,
            name: item.name,
            category: "Uncategorized",
            size: item.size,
            unit: item.unit,
            estimatedPrice: item.estimatedPrice,
            quantity: item.quantity,
            force,
          }) as typeof result;
        } else {
          // Has category or pantryItemId → standard create
          result = await createItem({
            listId,
            name: item.name,
            quantity: item.quantity,
            category: item.category,
            size: item.size,
            unit: item.unit,
            estimatedPrice: item.estimatedPrice,
            ...(item.pantryItemId ? { pantryItemId: item.pantryItemId } : {}),
            force,
          }) as typeof result;
        }

        // Handle duplicate response
        if (result && typeof result === "object" && "status" in result && result.status === "duplicate") {
          const existingName = result.existingName ?? item.name;
          const existingQty = result.existingQuantity ?? 1;
          const existingSize = (result as Record<string, unknown>).existingSize as string | undefined;
          const sizeLabel = existingSize ? ` (${existingSize})` : "";
          alert(
            "Already on List",
            `"${existingName}"${sizeLabel} (\u00D7${existingQty}) is already on your list. Add again?`,
            [
              { text: "Skip", style: "cancel" },
              {
                text: "Add Anyway",
                onPress: () => { addItemToList(item, true); },
              },
            ]
          );
          return;
        }

        haptic("success");
        showAddedFeedback(item.name, item.size, item.estimatedPrice);
      } catch (error) {
        console.error("Failed to add item:", error);
        haptic("error");
      } finally {
        setIsAdding(false);
      }
    },
    [listId, createItem, addAndSeedPantry, alert, showAddedFeedback]
  );

  // ── Handlers ────────────────────────────────────────────────────────────────

  const handleNameChange = useCallback(
    (text: string) => {
      setItemName(text);
      setSelectedVariantName(undefined);
      if (scannedCategory) setScannedCategory(undefined);
      if (activeView !== "search") setActiveView("search");
      searchItems(text);
      triggerPrefetch(text);
    },
    [activeView, scannedCategory, searchItems, triggerPrefetch]
  );

  const handleSelectAltSuggestion = useCallback(
    (suggestion: ItemSuggestion) => {
      haptic("light");
      setSelectedSuggestion(suggestion);
      setSelectedVariantName(undefined);
      if (suggestion.estimatedPrice != null) {
        setManualPrice(suggestion.estimatedPrice.toFixed(2));
      } else {
        setManualPrice("");
      }
      if (suggestion.size) {
        setManualSize(suggestion.size);
      } else {
        setManualSize("");
      }
    },
    []
  );

  const handleVariantSelect = useCallback(
    (variantName: string) => {
      haptic("medium");

      const variant = variantOptions.find((v) => v.variantName === variantName);
      const name = selectedSuggestion?.name ?? itemName.trim();
      if (!name) return;

      // Reset immediately so keyboard stays open and input is ready for next item
      resetInputFields();

      // Add item to list in the background (don't await)
      addItemToList({
        name,
        quantity: parseInt(manualQty, 10) || 1,
        size: variant?.size || manualSize || undefined,
        unit: variant?.unit || undefined,
        estimatedPrice: variant?.price ?? (manualPrice ? parseFloat(manualPrice) : undefined),
        category: selectedSuggestion?.category || scannedCategory,
        source: "manual",
        pantryItemId: selectedSuggestion?.pantryItemId
          ? (selectedSuggestion.pantryItemId as Id<"pantryItems">)
          : undefined,
      });
    },
    [variantOptions, selectedSuggestion, itemName, manualQty, manualSize, manualPrice, scannedCategory, addItemToList, resetInputFields]
  );

  const addPantryItem = useCallback(
    async (item: PantryItemData) => {
      haptic("light");

      // Add to list immediately
      await addItemToList({
        name: item.name,
        category: item.category,
        size: item.defaultSize,
        unit: item.defaultUnit,
        estimatedPrice: item.lastPrice,
        quantity: 1,
        source: "pantry",
        pantryItemId: item._id,
      });

      // Refocus input (zero-tap loop)
      setTimeout(() => itemInputRef.current?.focus(), 150);
    },
    [addItemToList]
  );

  const handleAddManualItem = useCallback(async () => {
    const trimmed = itemName.trim();
    if (!trimmed) return;

    haptic("light");
    const qty = parseInt(manualQty, 10) || 1;
    const price = manualPrice
      ? parseFloat(manualPrice)
      : (priceEstimate?.cheapest?.price ?? undefined);

    // Find unit from selected variant
    const selectedVariant = variantOptions.find(
      (v) => v.variantName === selectedVariantName
    );

    // Add to list immediately
    await addItemToList({
      name: trimmed,
      quantity: qty,
      size: manualSize || undefined,
      unit: selectedVariant?.unit || undefined,
      estimatedPrice: price,
      category: selectedSuggestion?.category || scannedCategory,
      source: "manual",
      pantryItemId: selectedSuggestion?.pantryItemId
        ? (selectedSuggestion.pantryItemId as Id<"pantryItems">)
        : undefined,
    });

    // Reset for next item (zero-tap loop)
    resetInputFields();
  }, [
    itemName,
    manualSize,
    manualQty,
    manualPrice,
    priceEstimate,
    selectedSuggestion,
    selectedVariantName,
    scannedCategory,
    variantOptions,
    addItemToList,
    resetInputFields,
  ]);

  const handleCameraScan = useCallback(async () => {
    haptic("medium");
    try {
      const product = await productScanner.captureProduct();
      if (product) {
        // Add scanned item to list immediately
        await addItemToList({
          name: product.name,
          quantity: 1,
          size: product.size || undefined,
          unit: product.unit || undefined,
          estimatedPrice:
            product.estimatedPrice != null && isFinite(product.estimatedPrice)
              ? product.estimatedPrice
              : undefined,
          category: product.category,
          source: "manual",
        });

        // Reset for next item (zero-tap loop)
        resetInputFields();

        // Enrich itemVariants with scan data (fire-and-forget)
        if (product.size && product.category) {
          const baseItem = selectedSuggestion?.name
            ?? (product.name
              .replace(/^\d+\s*(pk|pack|g|kg|ml|l|pt|pint)s?\s*/i, "")
              .replace(/\s+\d+\s*(pk|pack|g|kg|ml|l|pt|pint)s?\s*$/i, "")
              .trim()
            || product.name);
          const label = product.brand
            ? `${product.brand} ${product.size}`
            : product.size;
          enrichVariant({
            baseItem,
            size: product.size,
            unit: product.unit ?? "",
            category: product.category,
            brand: product.brand,
            productName: product.name,
            displayLabel: label,
            estimatedPrice: product.estimatedPrice,
            confidence: product.confidence,
            imageStorageId: product.imageStorageId as Id<"_storage">,
          }).catch(() => {});
        }
      }
    } catch (error) {
      console.error("Camera scan failed:", error);
      haptic("error");
    }
  }, [productScanner, enrichVariant, selectedSuggestion, addItemToList, resetInputFields]);

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
    setActiveView((prev) => (prev === "pantry" ? "search" : "pantry"));
  }, []);

  const handleClose = useCallback(() => {
    setItemName("");
    setManualSize("");
    setManualQty("1");
    setManualPrice("");
    setEditingField(null);
    setAddedThisSession([]);
    setSessionAddCount(0);
    setSelectedSuggestion(null);
    setSelectedVariantName(undefined);
    setScannedCategory(undefined);
    setActiveView("search");
    clearSuggestions();
    onClose();
  }, [onClose, clearSuggestions]);

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

      return (
        <PantryRow
          item={item.data}
          isOnList={isItemOnList(item.data.name)}
          onAdd={addPantryItem}
        />
      );
    },
    [isItemOnList, addPantryItem]
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
      fillHeight
      overlayOpacity={0.7}
      contentStyle={[styles.modalContent, { marginBottom: keyboardVisible ? 0 : insets.bottom }]}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTextContainer}>
          <Text style={styles.headerTitle}>Add Items</Text>
          <Text style={styles.headerSubtitle}>
            Restock From Your Pantry, Add Product Manually, or Scan a Product Label
          </Text>
        </View>
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

      {/* Unified Input Bar */}
      <View style={styles.inputSection}>
        <View style={styles.unifiedInputRow}>
          {/* Pantry button */}
          <Pressable
            style={[
              styles.inputBarIcon,
              activeView === "pantry" && styles.inputBarIconActive,
            ]}
            onPress={handleShowPantry}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <MaterialCommunityIcons
              name="fridge-outline"
              size={20}
              color={
                activeView === "pantry"
                  ? colors.accent.primary
                  : colors.text.secondary
              }
            />
            <Text
              style={[
                styles.inputBarIconLabel,
                activeView === "pantry" && styles.inputBarIconLabelActive,
              ]}
            >
              Pantry
            </Text>
          </Pressable>

          {/* Text input */}
          <View style={styles.inputBarFieldWrapper}>
            <GlassInput
              ref={itemInputRef}
              placeholder={
                activeView === "pantry"
                  ? "Search pantry..."
                  : productScanner.isProcessing
                    ? "Scanning product..."
                    : "Type item name..."
              }
              value={itemName}
              onChangeText={handleNameChange}
              autoFocus
              size="md"
            />
          </View>

          {/* Camera button */}
          <Pressable
            style={[
              styles.inputBarIcon,
              productScanner.isProcessing && styles.inputBarIconActive,
            ]}
            onPress={handleCameraScan}
            disabled={productScanner.isProcessing}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            {productScanner.isProcessing ? (
              <ActivityIndicator size="small" color={colors.accent.primary} />
            ) : (
              <MaterialCommunityIcons
                name="camera"
                size={20}
                color={colors.text.secondary}
              />
            )}
            <Text
              style={[
                styles.inputBarIconLabel,
                productScanner.isProcessing && styles.inputBarIconLabelActive,
              ]}
            >
              Scan
            </Text>
          </Pressable>
        </View>

        {/* Size / Qty / Price — only after item name is entered */}
        {(itemName.trim().length > 0 || selectedSuggestion != null) && (
          <>
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
          </>
        )}

      </View>

      {/* Added feedback pills */}
      {addedThisSession.length > 0 && (
        <View style={styles.feedbackContainer}>
          {addedThisSession.slice(0, 3).map((item) => (
            <Animated.View
              key={item.id}
              entering={FadeInDown.duration(250)}
              exiting={FadeOut.duration(200)}
              style={styles.feedbackPill}
            >
              <MaterialCommunityIcons
                name="check-circle"
                size={14}
                color={colors.accent.primary}
              />
              <Text style={styles.feedbackText} numberOfLines={1}>
                {item.name}
                {item.size ? ` ${item.size}` : ""}
                {item.price != null ? ` \u00B7 \u00A3${item.price.toFixed(2)}` : ""}
                {" added"}
              </Text>
            </Animated.View>
          ))}
        </View>
      )}

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
        ) : (
          /* ── Search view — single-layer variants ────────── */
          <ScrollView
            style={styles.variantScrollView}
            contentContainerStyle={styles.variantScrollContent}
            keyboardShouldPersistTaps="always"
            showsVerticalScrollIndicator={false}
          >
            {itemName.trim().length < 2 ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyHint}>
                  Search above or add from pantry
                </Text>
              </View>
            ) : isSuggestionsLoading && !selectedSuggestion ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color={colors.accent.primary} />
                <Text style={styles.loadingText}>Searching...</Text>
              </View>
            ) : !selectedSuggestion ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyHint}>
                  No matches found — tap &quot;Add Item&quot; to add manually
                </Text>
              </View>
            ) : (
              <>
                {/* Matched item label + variant chips (single line header) */}
                <View style={styles.matchedItemRow}>
                  <Text style={styles.matchedItemLabel}>
                    {selectedSuggestion.name}
                    {selectedSuggestion.source === "pantry" && (
                      <Text style={styles.matchedItemBadge}> · in pantry</Text>
                    )}
                  </Text>
                </View>

                {/* Variant chips */}
                {isVariantsLoading ? (
                  <VariantPicker
                    baseItem={selectedSuggestion.name}
                    variants={[]}
                    onSelect={handleVariantSelect}
                    isLoading
                    compact
                  />
                ) : variantOptions.length > 0 ? (
                  <VariantPicker
                    baseItem={selectedSuggestion.name}
                    variants={variantOptions}
                    selectedVariant={selectedVariantName}
                    onSelect={handleVariantSelect}
                    showPricePerUnit
                    compact
                  />
                ) : (
                  <Text style={styles.noVariantsHint}>
                    No size options — use Size button above or tap &quot;Add Item&quot;
                  </Text>
                )}

                {/* Disambiguation: other matching items */}
                {altSuggestions.length > 0 && (
                  <View style={styles.altSuggestionsSection}>
                    <Text style={styles.altSuggestionsLabel}>Did you mean?</Text>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      keyboardShouldPersistTaps="always"
                      contentContainerStyle={styles.altSuggestionsRow}
                    >
                      {altSuggestions.map((s) => (
                        <Pressable
                          key={s.name}
                          style={styles.altSuggestionChip}
                          onPress={() => handleSelectAltSuggestion(s)}
                        >
                          <Text style={styles.altSuggestionText} numberOfLines={1}>
                            {s.name}
                          </Text>
                          {s.source === "pantry" && (
                            <View style={[styles.stockDot, {
                              backgroundColor:
                                s.stockLevel === "out" ? colors.accent.error :
                                s.stockLevel === "low" ? colors.accent.warning :
                                colors.accent.success,
                            }]} />
                          )}
                        </Pressable>
                      ))}
                    </ScrollView>
                  </View>
                )}
              </>
            )}

          </ScrollView>
        )}
      </View>

      {/* Sticky Bottom Bar */}
      <View style={styles.bottomBar}>
        {sessionAddCount > 0 && (
          <Text style={styles.subtotalText}>
            {sessionAddCount} item{sessionAddCount !== 1 ? "s" : ""} added
          </Text>
        )}
        <GlassButton
          variant="primary"
          size="lg"
          onPress={handleAddManualItem}
          disabled={isAdding || itemName.trim().length === 0}
          loading={isAdding}
          style={styles.submitButton}
        >
          Add Item
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
    marginTop: (StatusBar.currentHeight ?? 0) + 12,
    paddingTop: spacing.xs,
    paddingHorizontal: 0,
    paddingBottom: 0,
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
  headerTextContainer: {
    flex: 1,
    marginRight: spacing.sm,
  },
  headerTitle: {
    ...typography.headlineMedium,
    color: colors.text.primary,
  },
  headerSubtitle: {
    ...typography.bodySmall,
    color: colors.text.tertiary,
    marginTop: 2,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.glass.background,
    justifyContent: "center",
    alignItems: "center",
  },

  // Unified input bar
  inputSection: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.glass.border,
    gap: spacing.xs,
  },
  unifiedInputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  inputBarIcon: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.md,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.glass.background,
    borderWidth: 1,
    borderColor: colors.glass.border,
    gap: 1,
    paddingTop: 8,
    paddingBottom: 0,
  },
  inputBarIconActive: {
    borderColor: colors.accent.primary,
    backgroundColor: "rgba(0, 212, 170, 0.08)",
  },
  inputBarFieldWrapper: {
    flex: 1,
  },
  inputBarIconLabel: {
    ...typography.bodySmall,
    color: colors.text.tertiary,
    textAlign: "center",
    fontSize: 9,
  },
  inputBarIconLabelActive: {
    color: colors.accent.primary,
  },

  // Field buttons row (Size / Qty / Price)
  fieldButtonRow: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.xs,
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

  // (pantry badge styles moved to inputBarBadge above)

  // Feedback pills
  feedbackContainer: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xs,
    gap: spacing.xs,
  },
  feedbackPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    backgroundColor: "rgba(0, 212, 170, 0.1)",
    borderRadius: borderRadius.full,
    alignSelf: "flex-start",
  },
  feedbackText: {
    ...typography.bodySmall,
    color: colors.accent.primary,
    fontWeight: "500",
    flexShrink: 1,
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

  // Variant picker
  variantScrollView: {
    flex: 1,
  },
  variantScrollContent: {
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
  },

  // Matched item row (single line: name + badge)
  matchedItemRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.xl,
    marginBottom: spacing.sm,
  },
  matchedItemLabel: {
    ...typography.labelLarge,
    color: colors.text.primary,
    fontWeight: "600",
  },
  matchedItemBadge: {
    ...typography.labelSmall,
    color: colors.accent.primary,
    fontWeight: "500",
  },
  noVariantsHint: {
    ...typography.bodySmall,
    color: colors.text.tertiary,
    paddingHorizontal: spacing.xl,
    marginTop: spacing.sm,
  },

  // Alt suggestions (disambiguation)
  altSuggestionsSection: {
    marginTop: spacing.xl,
    paddingHorizontal: spacing.xl,
  },
  altSuggestionsLabel: {
    ...typography.labelSmall,
    color: colors.text.tertiary,
    marginBottom: spacing.sm,
  },
  altSuggestionsRow: {
    gap: spacing.sm,
  },
  altSuggestionChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.glass.background,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.glass.border,
  },
  altSuggestionText: {
    ...typography.bodySmall,
    color: colors.text.secondary,
    fontWeight: "500",
  },
  stockDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
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
  emptyHint: {
    ...typography.bodySmall,
    color: colors.text.tertiary,
    textAlign: "center",
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
  subtotalText: {
    ...typography.bodySmall,
    color: colors.text.secondary,
    textAlign: "center",
    marginBottom: spacing.sm,
  },
  submitButton: {
    width: "100%",
  },

});
