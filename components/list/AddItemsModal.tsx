import React, { useState, useCallback, useRef, useMemo, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  Keyboard,
  StatusBar,
} from "react-native";
import {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

import {
  GlassModal,
  GlassButton,
  useGlassAlert,
  colors,
} from "@/components/ui/glass";
import { haptic } from "@/lib/haptics/safeHaptics";
import { useProductScanner } from "@/hooks/useProductScanner";
import { useItemSuggestions } from "@/hooks/useItemSuggestions";
import type { ItemSuggestion } from "@/hooks/useItemSuggestions";
import type { VariantOption } from "@/components/items/VariantPicker";
import { useVariantPrefetch } from "@/hooks/useVariantPrefetch";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { isDuplicateItem } from "@/convex/lib/fuzzyMatch";

// Sub-components
import { styles } from "./add-items/styles";
import { AddItemsHeader } from "./add-items/AddItemsHeader";
import { UnifiedInputBar } from "./add-items/UnifiedInputBar";
import { FeedbackPills } from "./add-items/FeedbackPills";
import { PantryView } from "./add-items/PantryView";
import { SearchView } from "./add-items/SearchView";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface AddItemsModalProps {
  visible: boolean;
  onClose: () => void;
  listId: Id<"shoppingLists">;
  listStoreName?: string;
  listNormalizedStoreId?: string;
  existingItems?: { name: string; size?: string }[];
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
  storeId?: string;
  storeName?: string;
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
type PantryFilter = "low" | "all";

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

  const { triggerPrefetch } = useVariantPrefetch({
    store: listNormalizedStoreId ?? listStoreName ?? "tesco",
  });

  // ── Product scanner (camera) ──────────────────────────────────────────────
  const productScanner = useProductScanner({
    onDuplicate: (existing) => {
      alert("Already Scanned", `${existing.name} is already in this session.`);
    },
  });

  // Clear product scanner session when modal opens to prevent cross-session duplicates
  useEffect(() => {
    if (visible) {
      productScanner.clearAll();
    }
  }, [visible, productScanner.clearAll]);

  // ── State ───────────────────────────────────────────────────────────────────
  const [itemName, setItemName] = useState("");
  const [manualSize, setManualSize] = useState("");
  const [manualQty, setManualQty] = useState("1");
  const [manualPrice, setManualPrice] = useState("");
  const [editingField, setEditingField] = useState<"size" | "qty" | "price" | null>(null);
  const [activeView, setActiveView] = useState<ActiveView>("search");
  const [pantryFilter, setPantryFilter] = useState<PantryFilter>("low");
  const [selectedSuggestion, setSelectedSuggestion] = useState<ItemSuggestion | null>(null);
  const [selectedVariantName, setSelectedVariantName] = useState<string | undefined>(undefined);
  const [scannedCategory, setScannedCategory] = useState<string | undefined>(undefined);
  const [addedThisSession, setAddedThisSession] = useState<AddedFeedbackItem[]>([]);
  const [sessionAddCount, setSessionAddCount] = useState(0);
  const [isAdding, setIsAdding] = useState(false);
  const feedbackIdRef = useRef(0);
  const pendingAddsRef = useRef(new Set<string>());

  // ── Pantry multi-select ────────────────────────────────────────────────────
  const [selectedPantryIds, setSelectedPantryIds] = useState<Set<Id<"pantryItems">>>(new Set());

  // Gentle pulse for capsule + icons
  const capsulePulse = useSharedValue(1);

  useEffect(() => {
    if (activeView === "pantry") {
      capsulePulse.value = withRepeat(
        withSequence(
          withTiming(1.2, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
          withTiming(1, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
        ),
        -1,
        false,
      );
    } else {
      cancelAnimation(capsulePulse);
      capsulePulse.value = 1;
    }
    return () => cancelAnimation(capsulePulse);
  }, [activeView, capsulePulse]);

  const capsulePulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: capsulePulse.value }],
  }));

  const handlePantryFilterSwitch = useCallback((index: number) => {
    setPantryFilter(index === 0 ? "low" : "all");
  }, []);

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
    return variantResult.sizes.map((s: {
      size: string;
      unit?: string;
      unitLabel: string;
      sizeNormalized?: string;
      price: number | null;
      source?: string;
      isUsual?: boolean;
      displayLabel?: string;
      pricePerUnit?: number | null;
      brand?: string;
      productName?: string;
      confidence?: number;
    }) => {
      const rawSize = s.sizeNormalized || s.size;
      // Extract unit from size string as fallback when DB unit is missing
      // e.g. "12pk" → "pk", "500ml" → "ml", "2pt" → "pt"
      const trailingUnit = rawSize.match(/[a-z]+$/i)?.[0]?.toLowerCase() || "";
      // Count-like suffixes that aren't valid storage units — normalize to "pk"
      const COUNT_SUFFIXES = new Set(["eggs", "egg", "pieces", "pcs", "units", "items", "rolls", "roll", "sheets", "bags", "bag", "count", "pack", "packs"]);
      const normalizedUnit = COUNT_SUFFIXES.has(trailingUnit) ? "pk" : trailingUnit;
      // For bare numbers like "18", default to "pk" (count items like eggs, rolls)
      const isBareNumber = /^\d+(?:\.\d+)?$/.test(rawSize);
      const unit = (s.unit && !COUNT_SUFFIXES.has(s.unit.toLowerCase()) ? s.unit : "") || normalizedUnit || (isBareNumber ? "pk" : "");
      // Build size string: strip count suffix and append valid unit
      const numPart = rawSize.match(/^(\d+(?:\.\d+)?)/)?.[1] || rawSize;
      const sizeStr = COUNT_SUFFIXES.has(trailingUnit) || isBareNumber ? `${numPart}pk` : rawSize;
      return {
        variantName: sizeStr,
        size: sizeStr,
        unit,
        price: s.price,
        priceSource: s.source as "personal" | "crowdsourced" | "ai_estimate",
        isUsual: s.isUsual ?? false,
        displayLabel: s.displayLabel,
      };
    });
  }, [variantResult]);

  // ── Convex queries & mutations ────────────────────────────────────────────
  const pantryItems = useQuery(api.pantryItems.getByUser);
  const createItem = useMutation(api.listItems.create);
  const addAndSeedPantry = useMutation(api.listItems.addAndSeedPantry);
  const updateItem = useMutation(api.listItems.update);

  // ── Derived data ────────────────────────────────────────────────────────────
  const isItemOnList = useCallback(
    (name: string, size?: string) => {
      if (!existingItems) return false;
      return existingItems.some((item) => isDuplicateItem(name, size, item.name, item.size));
    },
    [existingItems]
  );

  const { outOfStock, runningLow, fullyStocked } = useMemo(() => {
    if (!pantryItems) return { outOfStock: [], runningLow: [], fullyStocked: [] };
    const out: PantryItemData[] = [];
    const low: PantryItemData[] = [];
    const stocked: PantryItemData[] = [];
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
      else stocked.push(data);
    }
    return { outOfStock: out, runningLow: low, fullyStocked: stocked };
  }, [pantryItems]);

  const pantryListData = useMemo(() => {
    if (pantryFilter === "low") return [...outOfStock, ...runningLow];
    return [...outOfStock, ...runningLow, ...fullyStocked];
  }, [outOfStock, runningLow, fullyStocked, pantryFilter]);

  const isPantryLoading = pantryItems === undefined;
  const pantryNeedCount = outOfStock.length + runningLow.length;
  const totalPantryCount = (pantryItems?.length) ?? 0;

  const lowAddableCount = useMemo(() => {
    return [...outOfStock, ...runningLow].filter((item) => !isItemOnList(item.name)).length;
  }, [outOfStock, runningLow, isItemOnList]);

  const allAddableCount = useMemo(() => {
    return [...outOfStock, ...runningLow, ...fullyStocked].filter((item) => !isItemOnList(item.name)).length;
  }, [outOfStock, runningLow, fullyStocked, isItemOnList]);

  // ── Auto-select top suggestion as user types ─────────────────────────────
  useEffect(() => {
    if (activeView !== "search") return;
    if (suggestions.length > 0 && itemName.trim().length >= 2) {
      const top = suggestions[0];
      if (!selectedSuggestion || selectedSuggestion.name !== top.name) {
        setSelectedSuggestion(top);
        if (top.estimatedPrice != null) setManualPrice(top.estimatedPrice.toFixed(2));
        if (top.size) setManualSize(top.size);
      }
    } else if (itemName.trim().length < 2) {
      if (selectedSuggestion) setSelectedSuggestion(null);
    }
  }, [suggestions, itemName, activeView]); // eslint-disable-line react-hooks/exhaustive-deps

  const altSuggestions = useMemo(() => {
    if (!selectedSuggestion || suggestions.length <= 1) return [];
    return suggestions.filter((s: ItemSuggestion) => s.name !== selectedSuggestion.name).slice(0, 5);
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
      setTimeout(() => {
        setAddedThisSession((prev) => prev.filter((f) => f.id !== id));
      }, 2500);
    },
    []
  );

  // ── Per-item add to list ──────────────────────────────────────────────────

  const addItemToList = useCallback(
    async (item: SelectedItem, force = false) => {
      // Prevent rapid double-adds of the same item
      const dedupKey = `${item.name.toLowerCase()}::${(item.size || "").toLowerCase()}`;
      if (!force && pendingAddsRef.current.has(dedupKey)) return;
      pendingAddsRef.current.add(dedupKey);

      setIsAdding(true);
      try {
        let result;

        if (!item.category && !item.pantryItemId) {
          result = await addAndSeedPantry({
            listId,
            name: item.name,
            category: "Uncategorized",
            size: item.size,
            unit: item.unit,
            estimatedPrice: item.estimatedPrice,
            quantity: item.quantity,
            force,
          });
        } else {
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
          });
        }

        if (result && typeof result === "object" && "status" in result && result.status === "duplicate") {
          const existingItemId = (result as Record<string, unknown>).existingItemId as Id<"listItems"> | undefined;
          const existingName = (result as Record<string, unknown>).existingName as string | undefined ?? item.name;
          const existingQty = (result as Record<string, unknown>).existingQuantity as number | undefined ?? 1;
          const existingSize = (result as Record<string, unknown>).existingSize as string | undefined;
          const isChecked = (result as Record<string, unknown>).isChecked as boolean | undefined;
          const sizeLabel = existingSize ? ` (${existingSize})` : "";
          const locationMsg = isChecked ? "in your Checked section" : "on your list";
          const newQty = existingQty + item.quantity;

          alert(
            "Already on List",
            `"${existingName}"${sizeLabel} (\u00D7${existingQty}) is already ${locationMsg}. What would you like to do?`,
            [
              { text: "Cancel", style: "cancel" },
              {
                text: `Increment to \u00D7${newQty}`,
                onPress: async () => {
                  if (existingItemId) {
                    try {
                      await updateItem({ id: existingItemId, quantity: newQty });
                      haptic("success");
                      showAddedFeedback(existingName, existingSize, item.estimatedPrice);
                    } catch (err) {
                      console.error("Failed to increment:", err);
                      alert("Error", "Failed to update quantity");
                    }
                  }
                },
              },
              {
                text: "Add Separate",
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
        pendingAddsRef.current.delete(dedupKey);
        setIsAdding(false);
      }
    },
    [listId, createItem, addAndSeedPantry, updateItem, alert, showAddedFeedback]
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

  const handleSelectSuggestion = useCallback((suggestion: ItemSuggestion) => {
    haptic("light");
    setSelectedSuggestion(suggestion);
    setSelectedVariantName(undefined);
    setItemName(suggestion.name);
    if (suggestion.estimatedPrice != null) setManualPrice(suggestion.estimatedPrice.toFixed(2));
    else setManualPrice("");
    if (suggestion.size) setManualSize(suggestion.size);
    else setManualSize("");
  }, []);

  const handleVariantSelect = useCallback(
    (variantName: string) => {
      haptic("medium");
      const variant = variantOptions.find((v) => v.variantName === variantName);
      const name = selectedSuggestion?.name || itemName.trim();
      if (!name) return;
      resetInputFields();
      addItemToList({
        name,
        quantity: parseInt(manualQty, 10) || 1,
        size: variant?.size || manualSize || undefined,
        unit: variant?.unit || undefined,
        estimatedPrice: variant?.price ?? (manualPrice ? parseFloat(manualPrice) : undefined),
        category: selectedSuggestion?.category || scannedCategory,
        source: "manual",
        pantryItemId: selectedSuggestion?.pantryItemId ? (selectedSuggestion.pantryItemId as Id<"pantryItems">) : undefined,
      });
    },
    [variantOptions, selectedSuggestion, itemName, manualQty, manualSize, manualPrice, scannedCategory, addItemToList, resetInputFields]
  );

  const [bulkAddingFilter, setBulkAddingFilter] = useState<PantryFilter | null>(null);

  const executeBulkAdd = useCallback(async (filter: PantryFilter) => {
    const itemsToProcess = filter === "low" ? [...outOfStock, ...runningLow] : [...outOfStock, ...runningLow, ...fullyStocked];
    const itemsToAdd = itemsToProcess.filter((item) => !isItemOnList(item.name));
    if (itemsToAdd.length === 0) return;
    haptic("medium");
    setBulkAddingFilter(filter);
    try {
      for (const item of itemsToAdd) {
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
      }
      haptic("success");
    } catch (error) {
      console.error("Bulk add failed:", error);
      haptic("error");
    } finally {
      setBulkAddingFilter(null);
    }
  }, [outOfStock, runningLow, fullyStocked, isItemOnList, addItemToList]);

  const addAllFilteredItems = useCallback((filter: PantryFilter) => {
    const count = filter === "low" ? lowAddableCount : allAddableCount;
    if (count === 0) return;
    haptic("light");
    const label = filter === "low" ? "low" : "pantry";
    alert(`Add ${count} item${count !== 1 ? "s" : ""}?`, `This will add all ${label} items to your shopping list.`, [
      { text: "Cancel", style: "cancel" },
      { text: "Add All", onPress: () => executeBulkAdd(filter) },
    ]);
  }, [lowAddableCount, allAddableCount, alert, executeBulkAdd]);

  // ── Pantry multi-select handlers ──────────────────────────────────────────

  const togglePantrySelection = useCallback((id: Id<"pantryItems">) => {
    haptic("light");
    setSelectedPantryIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleSelectAllPantry = useCallback((filter: PantryFilter) => {
    const items = filter === "low"
      ? [...outOfStock, ...runningLow]
      : [...outOfStock, ...runningLow, ...fullyStocked];
    const addable = items.filter((item) => !isItemOnList(item.name));
    const allSelected = addable.length > 0 && addable.every((item) => selectedPantryIds.has(item._id));

    haptic("light");
    setSelectedPantryIds((prev) => {
      const next = new Set(prev);
      if (allSelected) {
        for (const item of addable) next.delete(item._id);
      } else {
        for (const item of addable) next.add(item._id);
      }
      return next;
    });
  }, [outOfStock, runningLow, fullyStocked, isItemOnList, selectedPantryIds]);

  const handleAddSelected = useCallback(async () => {
    if (selectedPantryIds.size === 0) return;
    const allPantry = [...outOfStock, ...runningLow, ...fullyStocked];
    const itemsToAdd = allPantry.filter((item) => selectedPantryIds.has(item._id));
    if (itemsToAdd.length === 0) return;

    haptic("medium");
    setIsAdding(true);
    try {
      for (const item of itemsToAdd) {
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
      }
      haptic("success");
      setSelectedPantryIds(new Set());
    } catch (error) {
      console.error("Add selected failed:", error);
      haptic("error");
    } finally {
      setIsAdding(false);
    }
  }, [selectedPantryIds, outOfStock, runningLow, fullyStocked, addItemToList]);

  const handleAddManualItem = useCallback(async () => {
    const trimmed = itemName.trim();
    if (!trimmed) return;
    haptic("light");
    const qty = parseInt(manualQty, 10) || 1;
    const price = manualPrice ? parseFloat(manualPrice) : (priceEstimate?.cheapest?.price ?? undefined);
    const selectedVariant = variantOptions.find((v) => v.variantName === selectedVariantName);
    await addItemToList({
      name: trimmed,
      quantity: qty,
      size: manualSize || undefined,
      unit: selectedVariant?.unit || undefined,
      estimatedPrice: price,
      category: selectedSuggestion?.category || scannedCategory,
      source: "manual",
      pantryItemId: selectedSuggestion?.pantryItemId ? (selectedSuggestion.pantryItemId as Id<"pantryItems">) : undefined,
    });
    resetInputFields();
  }, [itemName, manualSize, manualQty, manualPrice, priceEstimate, selectedSuggestion, selectedVariantName, scannedCategory, variantOptions, addItemToList, resetInputFields]);

  const handleCameraScan = useCallback(async () => {
    haptic("medium");
    try {
      const product = await productScanner.captureProduct();
      if (product) {
        await addItemToList({
          name: product.name,
          quantity: 1,
          size: product.size || undefined,
          unit: product.unit || undefined,
          estimatedPrice: product.estimatedPrice != null && isFinite(product.estimatedPrice) ? product.estimatedPrice : undefined,
          category: product.category,
          source: "manual",
        });
        resetInputFields();
        if (product.size && product.category) {
          const baseItem = selectedSuggestion?.name ?? (product.name.replace(/^\d+\s*(pk|pack|g|kg|ml|l|pt|pint)s?\s*/i, "").replace(/\s+\d+\s*(pk|pack|g|kg|ml|l|pt|pint)s?\s*$/i, "").trim() || product.name);
          const label = product.brand ? `${product.brand} ${product.size}` : product.size;
          enrichVariant({ baseItem, size: product.size, unit: product.unit ?? "", category: product.category, brand: product.brand, productName: product.name, displayLabel: label, estimatedPrice: product.estimatedPrice, confidence: product.confidence, imageStorageId: product.imageStorageId as Id<"_storage"> }).catch(() => {});
        }
      }
    } catch (error) {
      console.error("Camera scan failed:", error);
      haptic("error");
    }
  }, [productScanner, enrichVariant, selectedSuggestion, addItemToList, resetInputFields]);

  const handleFieldToggle = useCallback((field: "size" | "qty" | "price") => {
    haptic("light");
    setEditingField((prev) => (prev === field ? null : field));
    setTimeout(() => {
      if (field === "size") sizeInputRef.current?.focus();
      else if (field === "qty") qtyInputRef.current?.focus();
      else if (field === "price") priceInputRef.current?.focus();
    }, 100);
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
    setPantryFilter("low");
    setSelectedPantryIds(new Set());
    clearSuggestions();
    productScanner.clearAll();
    pendingAddsRef.current.clear();
    onClose();
  }, [onClose, clearSuggestions, productScanner]);

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
      <AddItemsHeader onClose={handleClose} />

      <UnifiedInputBar
        activeView={activeView}
        itemName={itemName}
        onNameChange={handleNameChange}
        onShowPantry={() => { haptic("light"); setActiveView((prev) => (prev === "pantry" ? "search" : "pantry")); }}
        onCameraScan={handleCameraScan}
        isScanning={productScanner.isProcessing}
        itemInputRef={itemInputRef}
        manualSize={manualSize}
        manualQty={manualQty}
        manualPrice={manualPrice}
        editingField={editingField}
        onFieldToggle={handleFieldToggle}
        onManualSizeChange={setManualSize}
        onManualQtyChange={setManualQty}
        onManualPriceChange={setManualPrice}
        sizeInputRef={sizeInputRef}
        qtyInputRef={qtyInputRef}
        priceInputRef={priceInputRef}
        onFieldSubmit={() => setEditingField(null)}
        priceEstimate={priceEstimate}
        selectedSuggestion={selectedSuggestion}
      />

      <FeedbackPills addedThisSession={addedThisSession} />

      <View style={styles.contentArea}>
        {activeView === "pantry" ? (
          <PantryView
            isLoading={isPantryLoading}
            totalPantryCount={totalPantryCount}
            pantryNeedCount={pantryNeedCount}
            lowAddableCount={lowAddableCount}
            allAddableCount={allAddableCount}
            pantryFilter={pantryFilter}
            onFilterChange={handlePantryFilterSwitch}
            onSelectAll={toggleSelectAllPantry}
            bulkAddingFilter={bulkAddingFilter}
            capsulePulseStyle={capsulePulseStyle}
            pantryListData={pantryListData}
            isItemOnList={isItemOnList}
            selectedIds={selectedPantryIds}
            onToggleSelect={togglePantrySelection}
          />
        ) : (
          <SearchView
            itemName={itemName}
            isSuggestionsLoading={isSuggestionsLoading}
            selectedSuggestion={selectedSuggestion}
            onSelectSuggestion={handleSelectSuggestion}
            isVariantsLoading={isVariantsLoading}
            variantOptions={variantOptions}
            selectedVariantName={selectedVariantName}
            onVariantSelect={handleVariantSelect}
            altSuggestions={altSuggestions}
            listId={listId}
            onItemAddedFeedback={() => showAddedFeedback("Item", undefined, undefined)}
          />
        )}
      </View>

      <View style={styles.bottomBar}>
        {sessionAddCount > 0 && (
          <Text style={styles.subtotalText}>
            {sessionAddCount} item{sessionAddCount !== 1 ? "s" : ""} added
          </Text>
        )}
        {activeView === "pantry" && selectedPantryIds.size > 0 ? (
          <GlassButton variant="primary" size="lg" icon="playlist-plus" onPress={handleAddSelected} disabled={isAdding} loading={isAdding} style={styles.submitButton}>
            {`Add ${selectedPantryIds.size} Selected`}
          </GlassButton>
        ) : itemName.trim().length === 0 && !isAdding ? (
          <GlassButton variant="secondary" size="lg" icon="format-list-checks" onPress={handleClose} style={styles.submitButton}>
            Go to List
          </GlassButton>
        ) : (
          <GlassButton variant="primary" size="lg" onPress={handleAddManualItem} disabled={isAdding} loading={isAdding} style={styles.submitButton}>
            Add Item
          </GlassButton>
        )}
      </View>
    </GlassModal>
  );
}
