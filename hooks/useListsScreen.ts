import { useState, useCallback, useMemo } from "react";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { useFocusEffect } from "@react-navigation/native";

import { useGlassAlert } from "@/components/ui/glass";
import { useShoppingList } from "@/hooks";
import { useNotifications } from "@/hooks";
import { defaultListName } from "@/lib/list/helpers";

export function useListsScreen() {
  const router = useRouter();
  const { alert } = useGlassAlert();

  const {
    activeLists: lists,
    historyLists: history,
    sharedLists,
    createList,
    deleteList,
    updateListName,
    createFromMultiple,
    createFromTemplate,
  } = useShoppingList();

  const activeShared = [];
  if (sharedLists) {
    for (const list of sharedLists) {
      if (list && list.status !== "archived" && list.status !== "completed") {
        activeShared.push(list);
      }
    }
  }
  const { unreadCount } = useNotifications();

  const [tabMode, setTabMode] = useState("active");
  const [isCreating, setIsCreating] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [animationKey, setAnimationKey] = useState(0);
  const [pageAnimationKey, setPageAnimationKey] = useState(0);

  // Create List Flow State
  const [showCreateOptionsModal, setShowCreateOptionsModal] = useState(false);
  const [showTemplatePickerModal, setShowTemplatePickerModal] = useState(false);

  // Template Modal State
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState(null);
  const [selectedTemplateName, setSelectedTemplateName] = useState("");

  // Edit List Name State
  const [showEditNameModal, setShowEditNameModal] = useState(false);
  const [editingListId, setEditingListId] = useState(null);
  const [editingListName, setEditingListName] = useState("");

  // History Filter State
  const [historySearchQuery, setHistorySearchQuery] = useState("");
  const [historyStoreFilter, setHistoryStoreFilter] = useState(null);
  const [historyDateFilter, setHistoryDateFilter] = useState(null);

  // Trigger animations every time this tab gains focus
  useFocusEffect(
    useCallback(() => {
      setAnimationKey((prev) => prev + 1);
      setPageAnimationKey((prev) => prev + 1);
    }, [])
  );

  const handleTabSwitch = useCallback((index: number) => {
    const mode = index === 0 ? "active" : "history";
    if (mode === tabMode) return;
    setTabMode(mode);
    setAnimationKey((prev) => prev + 1);
  }, [tabMode]);

  const showListLimitAlert = useCallback(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    alert(
      "List Limit Reached",
      "Free plan allows up to 2 active lists. Upgrade to Premium for unlimited lists.",
      [
        { text: "Maybe Later", style: "cancel" },
        { text: "Upgrade", onPress: () => router.push("/(app)/subscription") },
      ]
    );
  }, [alert, router]);

  const isListLimitError = useCallback((error: any) => {
    const msg = error instanceof Error ? error.message : String(error);
    return msg.includes("limit") || msg.includes("Upgrade") || msg.includes("Premium");
  }, []);

  const handleListPress = useCallback((id: any) => {
    router.push(`/list/${id}`);
  }, [router]);

  const handleDeletePress = useCallback((id: any, name: string) => {
    deleteList(id, name);
  }, [deleteList]);

  const handleEditName = useCallback((id: any, currentName: string) => {
    setEditingListId(id);
    setEditingListName(currentName);
    setShowEditNameModal(true);
  }, []);

  const handleSaveListName = useCallback(async (newName: string) => {
    if (!editingListId) return;
    const success = await updateListName(editingListId, newName);
    if (success) setShowEditNameModal(false);
  }, [updateListName, editingListId]);

  const handleHistoryPress = useCallback((id: any) => {
    router.push(`/trip-summary?id=${id}`);
  }, [router]);

  const handleSharedPress = useCallback((id: any) => {
    router.push(`/list/${id}`);
  }, [router]);

  const handleUseAsTemplate = useCallback((listId: any, listName: string) => {
    setSelectedTemplateId(listId);
    setSelectedTemplateName(listName);
    setShowTemplateModal(true);
  }, []);

  // Handles both single template and combine flow
  // When additionalListIds is provided, routes to createFromMultiple
  const handleConfirmTemplate = useCallback(async (newName: string, budget: any, additionalListIds: any) => {
    if (!selectedTemplateId) return;
    try {
      let result;
      if (additionalListIds && additionalListIds.length > 0) {
        // Combine mode: merge source + additional lists
        result = await createFromMultiple(
          [selectedTemplateId, ...additionalListIds],
          newName,
          budget
        );
      } else {
        // Single template mode
        result = await createFromTemplate(selectedTemplateId, newName);
      }
      setShowTemplateModal(false);
      router.push(`/list/${result.listId}`);
    } catch (error) {
      if (isListLimitError(error)) showListLimitAlert();
    }
  }, [selectedTemplateId, createFromTemplate, createFromMultiple, router, isListLimitError, showListLimitAlert]);

  const stableFormatDateTime = useCallback((timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  }, []);

  const handleCreateListFlow = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowCreateOptionsModal(true);
  }, []);

  const handleCreateFromScratch = useCallback(async () => {
    setShowCreateOptionsModal(false);
    if (isCreating) return;
    setIsCreating(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const name = defaultListName();
    try {
      const listId = await createList({ name, budget: 50 });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.push(`/list/${listId}`);
    } catch (error) {
      console.error("Failed to create list:", error);
      if (isListLimitError(error)) {
        showListLimitAlert();
      } else {
        alert("Error", "Failed to create shopping list");
      }
    } finally {
      setIsCreating(false);
    }
  }, [isCreating, createList, router, alert, isListLimitError, showListLimitAlert]);

  const handleShowTemplatePicker = useCallback(() => {
    setShowCreateOptionsModal(false);
    setShowTemplatePickerModal(true);
  }, []);

  const handlePickTemplate = useCallback((listId: any, listName: string) => {
    setShowTemplatePickerModal(false);
    setSelectedTemplateId(listId);
    setSelectedTemplateName(listName);
    setShowTemplateModal(true);
  }, []);

  const handleShowNotifications = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowNotifications(true);
  }, []);

  const handleCloseTemplate = useCallback(() => {
    setShowTemplateModal(false);
    setSelectedTemplateId(null);
    setSelectedTemplateName("");
  }, []);

  // Extract unique store names from full (unfiltered) history
  const historyStores = useMemo(() => {
    if (!history) return [];
    const storeSet = new Set();
    for (const list of history) {
      if (list.storeSegments && list.storeSegments.length > 0) {
        for (const seg of list.storeSegments) {
          storeSet.add(seg.storeName);
        }
      } else if (list.storeName) {
        storeSet.add(list.storeName);
      }
    }
    return Array.from(storeSet).sort();
  }, [history]);

  // Filter history based on search, store, and date filters
  const filteredHistory = useMemo(() => {
    if (!history) return [];
    let result = history;

    // Text search: filter by name or store
    if (historySearchQuery.trim()) {
      const q = historySearchQuery.toLowerCase().trim();
      result = result.filter((list) => {
        const nameMatch = list.name.toLowerCase().includes(q);
        const storeMatch = list.storeName && list.storeName.toLowerCase().includes(q);
        const segmentMatch = list.storeSegments?.some(
          (seg) => seg.storeName.toLowerCase().includes(q)
        );
        return nameMatch || storeMatch || segmentMatch;
      });
    }

    // Store filter
    if (historyStoreFilter) {
      result = result.filter((list) => {
        if (list.storeSegments && list.storeSegments.length > 0) {
          return list.storeSegments.some((seg) => seg.storeName === historyStoreFilter);
        }
        return list.storeName === historyStoreFilter;
      });
    }

    // Date filter
    if (historyDateFilter) {
      const now = Date.now();
      const cutoffs = { month: 30, "3months": 90, year: 365 };
      const days = cutoffs[historyDateFilter];
      if (days) {
        const cutoff = now - days * 24 * 60 * 60 * 1000;
        result = result.filter((list) => {
          const ts = list.completedAt ?? list.createdAt;
          return ts >= cutoff;
        });
      }
    }

    return result;
  }, [history, historySearchQuery, historyStoreFilter, historyDateFilter]);

  const hasActiveFilters = !!(historySearchQuery.trim() || historyStoreFilter || historyDateFilter);

  const clearHistoryFilters = useCallback(() => {
    setHistorySearchQuery("");
    setHistoryStoreFilter(null);
    setHistoryDateFilter(null);
  }, []);

  const currentData = tabMode === "active" ? lists : filteredHistory;
  const isLoaded = (tabMode === "active" ? lists : history) !== undefined;
  const displayList = currentData ?? [];
  const hasAnyActiveLists = tabMode === "active"
    ? (displayList.length > 0 || activeShared.length > 0)
    : displayList.length > 0;

  return {
    // Data
    lists,
    history,
    activeShared,
    displayList,
    isLoaded,
    hasAnyActiveLists,
    unreadCount,

    // UI State
    tabMode,
    isCreating,
    animationKey,
    pageAnimationKey,
    showNotifications,

    // Filter State
    historySearchQuery,
    historyStoreFilter,
    historyDateFilter,
    historyStores,
    hasActiveFilters,

    // Modal State
    showCreateOptionsModal,
    showTemplatePickerModal,
    showTemplateModal,
    showEditNameModal,
    selectedTemplateId,
    selectedTemplateName,
    editingListName,

    // Handlers
    handleTabSwitch,
    handleListPress,
    handleDeletePress,
    handleEditName,
    handleSaveListName,
    handleHistoryPress,
    handleSharedPress,
    handleUseAsTemplate,
    handleConfirmTemplate,
    stableFormatDateTime,
    handleCreateListFlow,
    handleCreateFromScratch,
    handleShowTemplatePicker,
    handlePickTemplate,
    handleShowNotifications,
    handleCloseTemplate,
    clearHistoryFilters,

    // Filter setters
    setHistorySearchQuery,
    setHistoryStoreFilter,
    setHistoryDateFilter,

    // Modal close helpers
    setShowNotifications,
    setShowCreateOptionsModal,
    setShowTemplatePickerModal,
    setShowEditNameModal,
  };
}
