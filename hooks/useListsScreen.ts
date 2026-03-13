import { useState, useCallback } from "react";
import { useRouter } from "expo-router";
import { Id } from "@/convex/_generated/dataModel";
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

  const activeShared = sharedLists?.filter((l: any) => l && l.status !== "archived" && l.status !== "completed") ?? [];
  const { unreadCount } = useNotifications();

  const [tabMode, setTabMode] = useState<"active" | "history">("active");
  const [isCreating, setIsCreating] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [animationKey, setAnimationKey] = useState(0);
  const [pageAnimationKey, setPageAnimationKey] = useState(0);

  // Create List Flow State
  const [showCreateOptionsModal, setShowCreateOptionsModal] = useState(false);
  const [showTemplatePickerModal, setShowTemplatePickerModal] = useState(false);

  // Template Modal State
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<Id<"shoppingLists"> | null>(null);
  const [selectedTemplateName, setSelectedTemplateName] = useState("");

  // Multi-Select Template State
  const [isMultiSelectMode, setIsMultiSelectMode] = useState(false);
  const [selectedHistoryLists, setSelectedHistoryLists] = useState<Set<Id<"shoppingLists">>>(new Set());
  const [showCombineModal, setShowCombineModal] = useState(false);

  // Edit List Name State
  const [showEditNameModal, setShowEditNameModal] = useState(false);
  const [editingListId, setEditingListId] = useState<Id<"shoppingLists"> | null>(null);
  const [editingListName, setEditingListName] = useState("");

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
    setTabMode(mode as "active" | "history");
    setIsMultiSelectMode(false);
    setSelectedHistoryLists(new Set());
    setAnimationKey((prev) => prev + 1);
  }, [tabMode]);

  const handleToggleSelect = useCallback((id: Id<"shoppingLists">) => {
    setSelectedHistoryLists(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

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

  const isListLimitError = useCallback((error: unknown) => {
    const msg = error instanceof Error ? error.message : String(error);
    return msg.includes("limit") || msg.includes("Upgrade") || msg.includes("Premium");
  }, []);

  const handleConfirmCombine = useCallback(async (newName: string, budget?: number) => {
    if (selectedHistoryLists.size === 0) return;
    try {
      const result = await createFromMultiple(Array.from(selectedHistoryLists), newName, budget);
      setShowCombineModal(false);
      setIsMultiSelectMode(false);
      setSelectedHistoryLists(new Set());
      router.push(`/list/${result.listId}`);
    } catch (error: unknown) {
      if (isListLimitError(error)) showListLimitAlert();
    }
  }, [selectedHistoryLists, createFromMultiple, router, isListLimitError, showListLimitAlert]);

  const handleListPress = useCallback((id: Id<"shoppingLists">) => {
    router.push(`/list/${id}`);
  }, [router]);

  const handleDeletePress = useCallback((id: Id<"shoppingLists">, name: string) => {
    deleteList(id, name);
  }, [deleteList]);

  const handleEditName = useCallback((id: Id<"shoppingLists">, currentName: string) => {
    setEditingListId(id);
    setEditingListName(currentName);
    setShowEditNameModal(true);
  }, []);

  const handleSaveListName = useCallback(async (newName: string) => {
    if (!editingListId) return;
    const success = await updateListName(editingListId, newName);
    if (success) setShowEditNameModal(false);
  }, [updateListName, editingListId]);

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
      const result = await createFromTemplate(selectedTemplateId, newName);
      setShowTemplateModal(false);
      router.push(`/list/${result.listId}`);
    } catch (error: unknown) {
      if (isListLimitError(error)) showListLimitAlert();
    }
  }, [selectedTemplateId, createFromTemplate, router, isListLimitError, showListLimitAlert]);

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
    } catch (error: unknown) {
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

  const handlePickTemplate = useCallback((listId: Id<"shoppingLists">, listName: string) => {
    setShowTemplatePickerModal(false);
    setSelectedTemplateId(listId);
    setSelectedTemplateName(listName);
    setShowTemplateModal(true);
  }, []);

  const handleToggleMultiSelect = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsMultiSelectMode(!isMultiSelectMode);
    if (isMultiSelectMode) setSelectedHistoryLists(new Set());
  }, [isMultiSelectMode]);

  const handleShowNotifications = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowNotifications(true);
  }, []);

  const handleCloseTemplate = useCallback(() => {
    setShowTemplateModal(false);
    setSelectedTemplateId(null);
    setSelectedTemplateName("");
  }, []);

  const currentData = tabMode === "active" ? lists : history;
  const isLoaded = currentData !== undefined;
  const displayList = currentData ?? [];
  const hasAnyActiveLists = displayList.length > 0 || activeShared.length > 0;

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
    isMultiSelectMode,
    animationKey,
    pageAnimationKey,
    showNotifications,

    // Modal State
    showCreateOptionsModal,
    showTemplatePickerModal,
    showTemplateModal,
    showCombineModal,
    showEditNameModal,
    selectedTemplateId,
    selectedTemplateName,
    editingListName,
    selectedHistoryLists,

    // Handlers
    handleTabSwitch,
    handleToggleSelect,
    handleConfirmCombine,
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
    handleToggleMultiSelect,
    handleShowNotifications,
    handleCloseTemplate,

    // Modal close helpers
    setShowNotifications,
    setShowCreateOptionsModal,
    setShowTemplatePickerModal,
    setShowCombineModal,
    setShowEditNameModal,
  };
}
