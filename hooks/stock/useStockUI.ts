import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "@react-navigation/native";
import { useState, useCallback, useRef, useEffect, startTransition } from "react";
import { View } from "react-native";
import { impactAsync, ImpactFeedbackStyle } from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useGlassAlert } from "@/components/ui/glass";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useHint } from "@/hooks/useHint";
import { hasViewedHint as hasViewedHintLocal } from "@/lib/storage/hintStorage";
import type { StockLevel } from "@/components/pantry";
import type { PantryViewMode, PantryItem } from "./types";

/**
 * Manages all UI state for the stock screen: view mode, search, filters,
 * modals, toasts, hints, gesture onboarding, animation keys, and refs.
 */
export function useStockUI(
  items: PantryItem[] | undefined,
  categories: string[]
) {
  const insets = useSafeAreaInsets();
  const { alert } = useGlassAlert();
  const { firstName } = useCurrentUser();

  // ── Refs ───────────────────────────────────────────────────────────────
  const headerRef = useRef<View>(null);
  const tabsRef = useRef<View>(null);
  const itemRef = useRef<View>(null);

  // ── Hints ──────────────────────────────────────────────────────────────
  const introHint = useHint("stock_intro", "delayed");
  const levelsHint = useHint("stock_levels", "manual");
  const lowHint = useHint("stock_low_alert", "manual");

  useEffect(() => {
    if (introHint.shouldShow === false) {
      if (!hasViewedHintLocal("stock_levels")) {
        levelsHint.showHint();
      }
    }
  }, [introHint.shouldShow]);

  // ── View mode ──────────────────────────────────────────────────────────
  const [viewMode, setViewMode] = useState<PantryViewMode>("attention");
  const capsuleActiveIndex = viewMode === "attention" ? 0 : 1;

  // ── Collapsed categories ───────────────────────────────────────────────
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(
    new Set()
  );

  const categoriesInitialized = useRef(false);
  useEffect(() => {
    if (categoriesInitialized.current) return;
    if (categories.length === 0) return;
    categoriesInitialized.current = true;
    setCollapsedCategories(new Set(categories as string[]));
  }, [categories]);

  const toggleCategory = useCallback((category: string) => {
    setCollapsedCategories((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(category)) {
        newSet.delete(category);
      } else {
        newSet.add(category);
      }
      return newSet;
    });
  }, []);

  // ── Search & filters ───────────────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState("");
  const [filterVisible, setFilterVisible] = useState(false);
  const [stockFilters, setStockFilters] = useState<Set<StockLevel>>(new Set());

  const toggleStockFilter = useCallback((level: StockLevel) => {
    impactAsync(ImpactFeedbackStyle.Light);
    setStockFilters((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(level)) {
        if (newSet.size > 1) {
          newSet.delete(level);
        }
      } else {
        newSet.add(level);
      }
      return newSet;
    });
  }, []);

  const showAllFilters = useCallback(() => {
    setStockFilters(new Set<StockLevel>());
    impactAsync(ImpactFeedbackStyle.Light);
  }, []);

  const handleOpenFilter = useCallback(() => {
    setFilterVisible(true);
  }, []);

  const handleCloseFilter = useCallback(() => {
    setFilterVisible(false);
  }, []);

  // ── Add-item modal ─────────────────────────────────────────────────────
  const [addModalVisible, setAddModalVisible] = useState(false);

  const handleOpenAddModal = useCallback(() => {
    impactAsync(ImpactFeedbackStyle.Light);
    setAddModalVisible(true);
  }, []);

  const handleCloseAddModal = useCallback(() => {
    setAddModalVisible(false);
  }, []);

  // ── Animation keys ─────────────────────────────────────────────────────
  const [animationKey, setAnimationKey] = useState(0);
  const [pageAnimationKey, setPageAnimationKey] = useState(0);

  useFocusEffect(
    useCallback(() => {
      setAnimationKey((prev) => prev + 1);
      setPageAnimationKey((prev) => prev + 1);
    }, [])
  );

  // ── Gesture onboarding ─────────────────────────────────────────────────
  const [showGestureOnboarding, setShowGestureOnboarding] = useState(false);
  const gestureOnboardingChecked = useRef(false);

  useEffect(() => {
    if (gestureOnboardingChecked.current) return;
    if (!items || items.length === 0) return;
    gestureOnboardingChecked.current = true;

    AsyncStorage.getItem("oja_gesture_onboarding_done").then((val) => {
      if (val !== "true") {
        setShowGestureOnboarding(true);
      }
    });
  }, [items]);

  const dismissGestureOnboarding = useCallback(() => {
    setShowGestureOnboarding(false);
    AsyncStorage.setItem("oja_gesture_onboarding_done", "true");
  }, []);

  // ── Toast state ────────────────────────────────────────────────────────
  const [flyStartPosition, setFlyStartPosition] = useState({ x: 0, y: 0 });
  const [toastVisible, setToastVisible] = useState(false);
  const [toastItemName, setToastItemName] = useState("");
  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((itemName: string) => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setToastItemName(itemName);
    setToastVisible(true);
    toastTimeoutRef.current = setTimeout(() => {
      setToastVisible(false);
    }, 2200);
  }, []);

  // ── Add-to-list picker ─────────────────────────────────────────────────
  const [addToListItem, setAddToListItem] = useState<{
    name: string;
    lastPrice?: number;
  } | null>(null);

  const handleCloseListPicker = useCallback(() => {
    setAddToListItem(null);
  }, []);

  // ── View mode switch ───────────────────────────────────────────────────
  const handleViewModeSwitch = useCallback(
    (index: number) => {
      const mode: PantryViewMode = index === 0 ? "attention" : "all";
      if (mode === viewMode) return;

      startTransition(() => {
        setViewMode(mode);
        setSearchQuery("");
        setAnimationKey((prev) => prev + 1);
        if (mode === "all" && categories.length > 0) {
          setCollapsedCategories(new Set(categories as string[]));
        }
      });
    },
    [viewMode, categories]
  );

  return {
    // Refs
    headerRef,
    tabsRef,
    itemRef,

    // User info
    firstName,
    insets,
    alert,

    // Hints
    levelsHint,
    lowHint,

    // View mode
    viewMode,
    capsuleActiveIndex,

    // Categories
    collapsedCategories,
    toggleCategory,

    // Search & filters
    searchQuery,
    setSearchQuery,
    filterVisible,
    stockFilters,
    activeFilterCount: stockFilters.size,
    toggleStockFilter,
    showAllFilters,
    handleOpenFilter,
    handleCloseFilter,

    // Add modal
    addModalVisible,
    handleOpenAddModal,
    handleCloseAddModal,

    // Animation
    animationKey,
    pageAnimationKey,

    // Gesture onboarding
    showGestureOnboarding,
    dismissGestureOnboarding,

    // Toast
    flyStartPosition,
    setFlyStartPosition,
    toastVisible,
    toastItemName,
    showToast,

    // List picker
    addToListItem,
    setAddToListItem,
    handleCloseListPicker,

    // View mode switch
    handleViewModeSwitch,
  };
}
