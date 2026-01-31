import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  Modal,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useState, useEffect, useCallback } from "react";
import type { Id } from "@/convex/_generated/dataModel";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { getIconForItem } from "@/lib/icons/iconMatcher";
import * as Haptics from "expo-haptics";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  runOnJS,
  interpolateColor,
} from "react-native-reanimated";
import { Gesture, GestureDetector } from "react-native-gesture-handler";

import {
  GlassScreen,
  GlassCard,
  GlassButton,
  GlassHeader,
  GlassInput,
  GlassCircularCheckbox,
  BudgetProgressBar,
  colors,
  typography,
  spacing,
  animations,
  borderRadius,
} from "@/components/ui/glass";
import { CategoryFilter } from "@/components/ui/CategoryFilter";
import { usePartnerRole } from "@/hooks/usePartnerRole";
import { RemoveButton } from "@/components/ui/RemoveButton";
import {
  ApprovalBadge,
  ApprovalActions,
  CommentThread,
  NotificationBell,
  NotificationDropdown,
} from "@/components/partners";

/**
 * Normalize a string for comparison
 */
function normalizeForComparison(str: string): string {
  let normalized = str.toLowerCase().trim();

  // Remove common prefixes
  const prefixes = ["a ", "an ", "the ", "some ", "fresh ", "organic "];
  for (const prefix of prefixes) {
    if (normalized.startsWith(prefix)) {
      normalized = normalized.slice(prefix.length);
    }
  }

  // Remove trailing 's' or 'es' for basic pluralization
  if (normalized.endsWith("ies")) {
    normalized = normalized.slice(0, -3) + "y";
  } else if (normalized.endsWith("es")) {
    normalized = normalized.slice(0, -2);
  } else if (normalized.endsWith("s") && normalized.length > 2) {
    normalized = normalized.slice(0, -1);
  }

  return normalized.trim();
}

/**
 * Check if two item names are similar
 */
function areItemsSimilar(name1: string, name2: string): boolean {
  const norm1 = normalizeForComparison(name1);
  const norm2 = normalizeForComparison(name2);

  if (norm1 === norm2) return true;
  if (norm1.includes(norm2) || norm2.includes(norm1)) return true;

  const words1 = norm1.split(/\s+/).filter((w) => w.length > 2);
  const words2 = norm2.split(/\s+/).filter((w) => w.length > 2);

  for (const word of words1) {
    if (words2.some((w) => w === word || w.includes(word) || word.includes(w))) {
      return true;
    }
  }

  return false;
}

type ListItem = {
  _id: Id<"listItems">;
  name: string;
  quantity: number;
  category?: string;
  estimatedPrice?: number;
  actualPrice?: number;
  isChecked: boolean;
  autoAdded?: boolean;
  priority?: "must-have" | "should-have" | "nice-to-have";
  approvalStatus?: "pending" | "approved" | "rejected" | "contested";
};

export default function ListDetailScreen() {
  const params = useLocalSearchParams();
  const id = params.id as string as Id<"shoppingLists">;
  const router = useRouter();

  const list = useQuery(api.shoppingLists.getById, { id });
  const items = useQuery(api.listItems.getByList, { listId: id });
  const toggleChecked = useMutation(api.listItems.toggleChecked);
  const addItem = useMutation(api.listItems.create);
  const updateItem = useMutation(api.listItems.update);
  const removeItem = useMutation(api.listItems.remove);
  const startShopping = useMutation(api.shoppingLists.startShopping);
  const completeShopping = useMutation(api.shoppingLists.completeShopping);

  const toggleBudgetLock = useMutation(api.shoppingLists.toggleBudgetLock);
  const updateList = useMutation(api.shoppingLists.update);
  const addItemMidShop = useMutation(api.listItems.addItemMidShop);
  const impulseUsage = useQuery(api.listItems.getImpulseUsage, { listId: id });
  const generateSuggestions = useAction(api.ai.generateListSuggestions);

  // Partner mode
  const { isOwner, isPartner, canEdit, canApprove, loading: roleLoading } = usePartnerRole(id);
  const handleApproval = useMutation(api.partners.handleApproval);
  const commentCounts = useQuery(api.partners.getCommentCounts, items ? { listItemIds: items.map((i) => i._id) } : "skip");


  // Notification state
  const [showNotifications, setShowNotifications] = useState(false);

  // Comment thread state
  const [showCommentThread, setShowCommentThread] = useState(false);
  const [commentItemId, setCommentItemId] = useState<Id<"listItems"> | null>(null);
  const [commentItemName, setCommentItemName] = useState("");

  const [isAddingItem, setIsAddingItem] = useState(false);
  const [newItemName, setNewItemName] = useState("");
  const [newItemQuantity, setNewItemQuantity] = useState("1");
  const [newItemPrice, setNewItemPrice] = useState("");

  // Price estimate from current prices database
  const priceEstimate = useQuery(
    api.currentPrices.getEstimate,
    newItemName.trim().length >= 2 ? { itemName: newItemName.trim() } : "skip"
  );

  // Edit budget modal state
  const [showEditBudgetModal, setShowEditBudgetModal] = useState(false);
  const [editBudgetValue, setEditBudgetValue] = useState("");
  const [isSavingBudget, setIsSavingBudget] = useState(false);

  // Mid-shop add flow state
  const [showMidShopModal, setShowMidShopModal] = useState(false);
  const [midShopItemName, setMidShopItemName] = useState("");
  const [midShopItemPrice, setMidShopItemPrice] = useState(0);
  const [midShopItemQuantity, setMidShopItemQuantity] = useState(1);
  const [isAddingMidShop, setIsAddingMidShop] = useState(false);

  // Check-off with actual price state (Story 3.8)
  const [showActualPriceModal, setShowActualPriceModal] = useState(false);
  const [checkingItemId, setCheckingItemId] = useState<Id<"listItems"> | null>(null);
  const [checkingItemName, setCheckingItemName] = useState("");
  const [checkingItemEstPrice, setCheckingItemEstPrice] = useState(0);
  const [checkingItemQuantity, setCheckingItemQuantity] = useState(1);
  const [actualPriceValue, setActualPriceValue] = useState("");
  const [isSavingActualPrice, setIsSavingActualPrice] = useState(false);

  // Category filter for items list
  const [listCategoryFilter, setListCategoryFilter] = useState<string | null>(null);

  // Smart suggestions state (Story 3.10)
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [dismissedSuggestions, setDismissedSuggestions] = useState<string[]>([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(true);

  // Auto-fill price estimate when available and user hasn't typed one
  useEffect(() => {
    if (priceEstimate && priceEstimate.cheapest && !newItemPrice) {
      setNewItemPrice(priceEstimate.cheapest.price.toFixed(2));
    }
  }, [priceEstimate]); // eslint-disable-line react-hooks/exhaustive-deps

  // Load suggestions when items change (Story 3.10)
  const loadSuggestions = useCallback(async () => {
    if (!items || items.length === 0 || !showSuggestions) {
      setSuggestions([]);
      return;
    }

    setIsLoadingSuggestions(true);
    try {
      const currentItemNames = items.map((item) => item.name);
      const excludeItems = [...currentItemNames, ...dismissedSuggestions];

      const newSuggestions = await generateSuggestions({
        currentItems: currentItemNames,
        excludeItems,
      });

      setSuggestions(newSuggestions);
    } catch (error) {
      console.error("Failed to load suggestions:", error);
      setSuggestions([]);
    } finally {
      setIsLoadingSuggestions(false);
    }
  }, [items, dismissedSuggestions, showSuggestions, generateSuggestions]);

  // Fetch suggestions when items change
  useEffect(() => {
    // Debounce suggestions loading
    const timeoutId = setTimeout(() => {
      if (items && items.length > 0 && showSuggestions) {
        loadSuggestions();
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [items?.length, showSuggestions]);

  // Loading state
  if (list === undefined || items === undefined) {
    return (
      <GlassScreen>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.accent.primary} />
          <Text style={styles.loadingText}>Loading list...</Text>
        </View>
      </GlassScreen>
    );
  }

  // Error state - list not found
  if (!list) {
    return (
      <GlassScreen>
        <View style={styles.errorContainer}>
          <MaterialCommunityIcons
            name="alert-circle-outline"
            size={64}
            color={colors.semantic.danger}
          />
          <Text style={styles.errorText}>List not found</Text>
          <GlassButton variant="primary" icon="home" onPress={() => router.replace("/(app)/(tabs)")}>
            Go Home
          </GlassButton>
        </View>
      </GlassScreen>
    );
  }

  // Calculate totals
  const estimatedTotal = items.reduce((sum, item) => {
    return sum + (item.estimatedPrice || 0) * item.quantity;
  }, 0);

  const actualTotal = items.reduce((sum, item) => {
    if (item.isChecked && item.actualPrice) {
      return sum + item.actualPrice * item.quantity;
    }
    return sum;
  }, 0);

  const checkedCount = items.filter((item) => item.isChecked).length;
  const totalCount = items.length;

  // Budget status
  const budget = list.budget || 0;
  const currentTotal = list.status === "shopping" ? actualTotal : estimatedTotal;
  const budgetLocked = list.budgetLocked || false;

  // Impulse Fund: 10% buffer
  const impulseFund = budget > 0 ? budget * 0.1 : 0;
  const totalLimit = budget + impulseFund; // Total spending limit with impulse fund
  const remainingBudget = budget - currentTotal;
  const remainingWithImpulse = totalLimit - currentTotal;

  // Budget state for color coding
  type BudgetState = "healthy" | "caution" | "impulse" | "exceeded";
  const getBudgetState = (): BudgetState => {
    if (currentTotal > totalLimit) return "exceeded";
    if (currentTotal > budget) return "impulse"; // Using impulse fund
    if (currentTotal > budget * 0.8) return "caution";
    return "healthy";
  };
  const budgetState = getBudgetState();

  // Check if adding an item would exceed the budget (with impulse fund)
  function wouldExceedBudget(itemPrice: number, quantity: number): boolean {
    if (!budget || !budgetLocked) return false;
    const itemTotal = itemPrice * quantity;
    // When locked, allow spending up to budget + impulse fund
    return (currentTotal + itemTotal) > totalLimit;
  }

  // Show budget exceeded modal
  function showBudgetExceededModal(itemName: string, itemTotal: number, onUnlock: () => void) {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    Alert.alert(
      "Budget + Impulse Fund Exceeded",
      `Adding "${itemName}" (£${itemTotal.toFixed(2)}) would exceed your total limit.\n\nBudget: £${budget.toFixed(2)}\nImpulse Fund (10%): £${impulseFund.toFixed(2)}\nTotal Limit: £${totalLimit.toFixed(2)}\n\nCurrent total: £${currentTotal.toFixed(2)}\nRemaining: £${remainingWithImpulse.toFixed(2)}\n\nRemove items or unlock budget to continue.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Unlock Budget",
          onPress: async () => {
            await handleToggleBudgetLock();
            onUnlock();
          },
        },
      ]
    );
  }

  // Toggle budget lock
  async function handleToggleBudgetLock() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await toggleBudgetLock({ id });
    } catch (error) {
      console.error("Failed to toggle budget lock:", error);
      Alert.alert("Error", "Failed to update budget lock");
    }
  }

  // Edit budget handlers
  function handleOpenEditBudget() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setEditBudgetValue(budget > 0 ? budget.toString() : "");
    setShowEditBudgetModal(true);
  }

  function handleCloseEditBudget() {
    setShowEditBudgetModal(false);
    setEditBudgetValue("");
  }

  async function handleSaveBudget() {
    const budgetNum = parseFloat(editBudgetValue) || 0;
    if (budgetNum < 0) {
      Alert.alert("Error", "Budget cannot be negative");
      return;
    }

    setIsSavingBudget(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await updateList({
        id,
        budget: budgetNum > 0 ? budgetNum : undefined,
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      handleCloseEditBudget();
    } catch (error) {
      console.error("Failed to update budget:", error);
      Alert.alert("Error", "Failed to update budget");
    } finally {
      setIsSavingBudget(false);
    }
  }

  async function handleToggleItem(itemId: Id<"listItems">) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    // Find the item
    const item = items?.find((i) => i._id === itemId);
    if (!item) return;

    // If in shopping mode and checking (not unchecking), show actual price modal
    if (list?.status === "shopping" && !item.isChecked) {
      setCheckingItemId(itemId);
      setCheckingItemName(item.name);
      setCheckingItemEstPrice(item.estimatedPrice || 0);
      setCheckingItemQuantity(item.quantity);
      setActualPriceValue(item.estimatedPrice?.toString() || "");
      setShowActualPriceModal(true);
      return;
    }

    // Otherwise, just toggle (for unchecking or non-shopping mode)
    try {
      await toggleChecked({ id: itemId });
    } catch (error) {
      console.error("Failed to toggle item:", error);
      Alert.alert("Error", "Failed to update item");
    }
  }

  // Actual price modal handlers (Story 3.8)
  function closeActualPriceModal() {
    setShowActualPriceModal(false);
    setCheckingItemId(null);
    setCheckingItemName("");
    setCheckingItemEstPrice(0);
    setCheckingItemQuantity(1);
    setActualPriceValue("");
  }

  async function handleConfirmActualPrice() {
    if (!checkingItemId) return;

    setIsSavingActualPrice(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const actualPrice = parseFloat(actualPriceValue) || 0;

    try {
      // Update the item with actual price
      await updateItem({
        id: checkingItemId,
        actualPrice: actualPrice,
      });

      // Then toggle checked
      await toggleChecked({ id: checkingItemId });

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      closeActualPriceModal();
    } catch (error) {
      console.error("Failed to check off item:", error);
      Alert.alert("Error", "Failed to check off item");
    } finally {
      setIsSavingActualPrice(false);
    }
  }

  async function handleSkipActualPrice() {
    if (!checkingItemId) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    try {
      // Just toggle checked without actual price
      await toggleChecked({ id: checkingItemId });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      closeActualPriceModal();
    } catch (error) {
      console.error("Failed to check off item:", error);
      Alert.alert("Error", "Failed to check off item");
    }
  }

  function findSimilarItem(name: string): ListItem | undefined {
    if (!items) return undefined;
    return items.find((item) => areItemsSimilar(item.name, name)) as ListItem | undefined;
  }

  async function addAsNewItem() {
    const itemName = newItemName.trim();
    const quantity = parseInt(newItemQuantity) || 1;
    const price = newItemPrice ? parseFloat(newItemPrice) : 0;
    const itemTotal = price * quantity;

    // Check budget lock
    if (budgetLocked && budget > 0 && price > 0 && wouldExceedBudget(price, quantity)) {
      showBudgetExceededModal(itemName, itemTotal, async () => {
        // After unlocking, retry adding the item
        setIsAddingItem(true);
        await addItemToList(itemName, quantity, price || undefined);
        setIsAddingItem(false);
      });
      return;
    }

    await addItemToList(itemName, quantity, price || undefined);
  }

  async function addItemToList(name: string, quantity: number, price?: number) {
    try {
      await addItem({
        listId: id,
        name,
        quantity,
        estimatedPrice: price,
      });

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setNewItemName("");
      setNewItemQuantity("1");
      setNewItemPrice("");
    } catch (error) {
      console.error("Failed to add item:", error);
      Alert.alert("Error", "Failed to add item");
    }
  }

  async function addToExistingItem(existingItem: ListItem) {
    try {
      const additionalQty = parseInt(newItemQuantity) || 1;
      const newQuantity = existingItem.quantity + additionalQty;

      await updateItem({
        id: existingItem._id,
        quantity: newQuantity,
      });

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert("Quantity Updated", `"${existingItem.name}" quantity increased to ${newQuantity}`);

      setNewItemName("");
      setNewItemQuantity("1");
      setNewItemPrice("");
    } catch (error) {
      console.error("Failed to update item:", error);
      Alert.alert("Error", "Failed to update item quantity");
    }
  }

  async function handleAddItem() {
    if (!newItemName.trim()) {
      Alert.alert("Error", "Please enter an item name");
      return;
    }

    const similarItem = findSimilarItem(newItemName.trim());

    if (similarItem) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      Alert.alert(
        "Similar Item Found",
        `"${similarItem.name}" is already in your list (Qty: ${similarItem.quantity}).\n\nWhat would you like to do?`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Add to Existing",
            onPress: async () => {
              setIsAddingItem(true);
              await addToExistingItem(similarItem);
              setIsAddingItem(false);
            },
          },
          {
            text: "Add as Separate",
            onPress: async () => {
              setIsAddingItem(true);
              // If in shopping mode with budget, show mid-shop modal
              if (list?.status === "shopping" && budget > 0) {
                openMidShopModal();
              } else {
                await addAsNewItem();
              }
              setIsAddingItem(false);
            },
          },
        ]
      );
      return;
    }

    // If in shopping mode with budget, show mid-shop modal
    if (list?.status === "shopping" && budget > 0) {
      openMidShopModal();
      return;
    }

    setIsAddingItem(true);
    await addAsNewItem();
    setIsAddingItem(false);
  }

  // Mid-shop modal handlers
  function openMidShopModal() {
    const itemName = newItemName.trim();
    const quantity = parseInt(newItemQuantity) || 1;
    const price = parseFloat(newItemPrice) || 0;

    setMidShopItemName(itemName);
    setMidShopItemQuantity(quantity);
    setMidShopItemPrice(price);
    setShowMidShopModal(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }

  function closeMidShopModal() {
    setShowMidShopModal(false);
    setMidShopItemName("");
    setMidShopItemPrice(0);
    setMidShopItemQuantity(1);
  }

  async function handleMidShopAdd(source: "budget" | "impulse" | "next_trip") {
    if (!midShopItemName) return;

    setIsAddingMidShop(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const result = await addItemMidShop({
        listId: id,
        name: midShopItemName,
        estimatedPrice: midShopItemPrice,
        quantity: midShopItemQuantity,
        source,
      });

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      // Show appropriate confirmation
      if (source === "budget") {
        Alert.alert("Added to Budget", `"${midShopItemName}" added to your list`);
      } else if (source === "impulse") {
        Alert.alert("Added from Impulse Fund", `"${midShopItemName}" added using impulse fund`);
      } else if (source === "next_trip") {
        Alert.alert("Saved for Later", `"${midShopItemName}" added to stock for next trip`);
      }

      // Clear the form
      setNewItemName("");
      setNewItemQuantity("1");
      setNewItemPrice("");
      closeMidShopModal();
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";

      if (errorMessage === "BUDGET_EXCEEDED") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        Alert.alert(
          "Budget Exceeded",
          "This item would exceed your budget + impulse fund. Try using the impulse fund or defer to next trip."
        );
      } else if (errorMessage === "IMPULSE_EXCEEDED") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        Alert.alert(
          "Impulse Fund Exceeded",
          "Not enough remaining in your impulse fund. Try adding to budget or defer to next trip."
        );
      } else {
        console.error("Failed to add mid-shop item:", error);
        Alert.alert("Error", "Failed to add item");
      }
    } finally {
      setIsAddingMidShop(false);
    }
  }

  async function handleRemoveItem(itemId: Id<"listItems">, itemName: string) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const doRemove = async () => {
      try {
        await removeItem({ id: itemId });
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch (error) {
        console.error("Failed to remove item:", error);
        if (Platform.OS === "web") {
          window.alert("Failed to remove item");
        } else {
          Alert.alert("Error", "Failed to remove item");
        }
      }
    };

    if (Platform.OS === "web") {
      if (window.confirm(`Remove "${itemName}" from list?`)) {
        await doRemove();
      }
    } else {
      Alert.alert("Remove Item", `Remove "${itemName}" from list?`, [
        { text: "Cancel", style: "cancel" },
        { text: "Remove", style: "destructive", onPress: doRemove },
      ]);
    }
  }

  async function handlePriorityChange(
    itemId: Id<"listItems">,
    newPriority: "must-have" | "should-have" | "nice-to-have"
  ) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await updateItem({ id: itemId, priority: newPriority });
    } catch (error) {
      console.error("Failed to update priority:", error);
    }
  }

  async function handleStartShopping() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await startShopping({ id });
      Alert.alert("Shopping Started", "Good luck with your shopping!");
    } catch (error) {
      console.error("Failed to start shopping:", error);
      Alert.alert("Error", "Failed to start shopping");
    }
  }

  async function handleCompleteShopping() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert("Complete Shopping", "Mark this shopping trip as complete?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Complete",
        onPress: async () => {
          try {
            await completeShopping({ id });
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            Alert.alert("Shopping Complete", "Shopping trip completed!");
            router.back();
          } catch (error) {
            console.error("Failed to complete shopping:", error);
            Alert.alert("Error", "Failed to complete shopping");
          }
        },
      },
    ]);
  }

  function handleAddFromPantry() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(`/pantry-pick?listId=${id}`);
  }

  // Smart suggestions handlers (Story 3.10)
  async function handleAddSuggestion(suggestionName: string) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    // Remove from suggestions
    setSuggestions((prev) => prev.filter((s) => s !== suggestionName));

    try {
      await addItem({
        listId: id,
        name: suggestionName,
        quantity: 1,
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.error("Failed to add suggestion:", error);
      // Add back to suggestions if failed
      setSuggestions((prev) => [...prev, suggestionName]);
      Alert.alert("Error", "Failed to add item");
    }
  }

  function handleDismissSuggestion(suggestionName: string) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSuggestions((prev) => prev.filter((s) => s !== suggestionName));
    setDismissedSuggestions((prev) => [...prev, suggestionName]);
  }

  function handleRefreshSuggestions() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    loadSuggestions();
  }

  function handleToggleSuggestions() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowSuggestions((prev) => !prev);
    if (!showSuggestions) {
      // Clear dismissed when toggling back on
      setDismissedSuggestions([]);
    }
  }

  // Partner mode handlers
  async function handleApproveItem(itemId: Id<"listItems">) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await handleApproval({ listItemId: itemId, decision: "approved" });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.error("Failed to approve item:", error);
      Alert.alert("Error", "Failed to approve item");
    }
  }

  async function handleRejectItem(itemId: Id<"listItems">) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await handleApproval({ listItemId: itemId, decision: "rejected" });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.error("Failed to reject item:", error);
      Alert.alert("Error", "Failed to reject item");
    }
  }

  function openCommentThread(itemId: Id<"listItems">, itemName: string) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setCommentItemId(itemId);
    setCommentItemName(itemName);
    setShowCommentThread(true);
  }

  // Status badge config
  const statusConfig = {
    active: { color: colors.accent.primary, label: "Planning", icon: "clipboard-edit-outline" },
    shopping: { color: colors.semantic.warning, label: "Shopping", icon: "cart-outline" },
    completed: { color: colors.text.tertiary, label: "Completed", icon: "check-circle-outline" },
  };
  const status = statusConfig[list.status as keyof typeof statusConfig] || statusConfig.active;

  return (
    <GlassScreen>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        {/* Header */}
        <GlassHeader
          title={list.name}
          subtitle={`${checkedCount}/${totalCount} items`}
          showBack
          rightElement={
            <View style={styles.headerRightRow}>
              <NotificationBell onPress={() => setShowNotifications(true)} />
              <Pressable
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  router.push(`/partners?listId=${id}`);
                }}
                hitSlop={8}
                style={styles.headerIconButton}
              >
                <MaterialCommunityIcons
                  name="account-group"
                  size={22}
                  color={colors.text.secondary}
                />
              </Pressable>
              <View style={[styles.headerStatusBadge, { backgroundColor: `${status.color}20` }]}>
                <MaterialCommunityIcons
                  name={status.icon as keyof typeof MaterialCommunityIcons.glyphMap}
                  size={16}
                  color={status.color}
                />
              </View>
            </View>
          }
        />

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Budget Card - Set Budget Prompt when no budget */}
          {budget === 0 && (
            <Pressable onPress={handleOpenEditBudget}>
              <GlassCard
                variant="bordered"
                accentColor={colors.accent.primary}
                style={styles.setBudgetCard}
              >
                <View style={styles.setBudgetContent}>
                  <View style={styles.setBudgetIcon}>
                    <MaterialCommunityIcons
                      name="wallet-plus-outline"
                      size={32}
                      color={colors.accent.primary}
                    />
                  </View>
                  <View style={styles.setBudgetText}>
                    <Text style={styles.setBudgetTitle}>Set Your Budget</Text>
                    <Text style={styles.setBudgetSubtitle}>
                      Track spending and stay on target
                    </Text>
                  </View>
                  <MaterialCommunityIcons
                    name="chevron-right"
                    size={24}
                    color={colors.text.tertiary}
                  />
                </View>
              </GlassCard>
            </Pressable>
          )}

          {/* Budget Card - Budget Tracker when budget is set */}
          {budget > 0 && (
            <GlassCard
              variant="bordered"
              accentColor={
                budgetState === "exceeded" ? colors.semantic.danger :
                budgetState === "impulse" ? colors.semantic.warning :
                budgetLocked ? colors.semantic.warning :
                colors.accent.primary
              }
              style={styles.budgetCard}
            >
              <View style={styles.budgetHeader}>
                <View style={styles.budgetLabelRow}>
                  <MaterialCommunityIcons
                    name={budgetLocked ? "lock" : "wallet-outline"}
                    size={20}
                    color={budgetLocked ? colors.semantic.warning : colors.accent.primary}
                  />
                  <Text style={styles.budgetLabel}>Budget Tracker</Text>
                  {budgetLocked && (
                    <View style={styles.lockedBadge}>
                      <Text style={styles.lockedBadgeText}>LOCKED</Text>
                    </View>
                  )}
                </View>
                <View style={styles.budgetActions}>
                  {/* Edit Budget Button */}
                  <Pressable
                    style={styles.editBudgetButton}
                    onPress={handleOpenEditBudget}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <MaterialCommunityIcons
                      name="pencil-outline"
                      size={18}
                      color={colors.text.secondary}
                    />
                  </Pressable>
                  {/* Lock Budget Button */}
                  <Pressable
                    style={[
                      styles.lockButton,
                      budgetLocked && styles.lockButtonActive,
                    ]}
                    onPress={handleToggleBudgetLock}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <MaterialCommunityIcons
                      name={budgetLocked ? "lock-open-variant-outline" : "lock-outline"}
                      size={18}
                      color={budgetLocked ? colors.semantic.warning : colors.text.secondary}
                    />
                  </Pressable>
                </View>
              </View>

              {/* Main Budget Progress */}
              <BudgetProgressBar
                spent={currentTotal}
                budget={budget}
                showAmounts
                size="lg"
              />

              {/* Impulse Fund Display */}
              <View style={styles.impulseFundContainer}>
                <View style={styles.impulseFundRow}>
                  <View style={styles.impulseFundLabel}>
                    <MaterialCommunityIcons
                      name="lightning-bolt"
                      size={16}
                      color={
                        budgetState === "exceeded" ? colors.semantic.danger :
                        budgetState === "impulse" ? colors.semantic.warning :
                        colors.accent.secondary
                      }
                    />
                    <Text style={styles.impulseFundText}>Impulse Fund (10%)</Text>
                  </View>
                  <Text style={[
                    styles.impulseFundAmount,
                    budgetState === "exceeded" && styles.impulseFundExceeded,
                    budgetState === "impulse" && styles.impulseFundActive,
                  ]}>
                    £{impulseFund.toFixed(2)}
                  </Text>
                </View>

                {/* Impulse Fund Status */}
                {budgetState === "exceeded" ? (
                  <View style={styles.impulseFundStatus}>
                    <MaterialCommunityIcons name="alert-circle" size={14} color={colors.semantic.danger} />
                    <Text style={[styles.impulseFundStatusText, { color: colors.semantic.danger }]}>
                      Over total limit by £{Math.abs(remainingWithImpulse).toFixed(2)}
                    </Text>
                  </View>
                ) : budgetState === "impulse" ? (
                  <View style={styles.impulseFundStatus}>
                    <MaterialCommunityIcons name="lightning-bolt" size={14} color={colors.semantic.warning} />
                    <Text style={[styles.impulseFundStatusText, { color: colors.semantic.warning }]}>
                      Using impulse fund: £{remainingWithImpulse.toFixed(2)} remaining
                    </Text>
                  </View>
                ) : remainingBudget <= impulseFund ? (
                  <View style={styles.impulseFundStatus}>
                    <MaterialCommunityIcons name="information-outline" size={14} color={colors.text.tertiary} />
                    <Text style={styles.impulseFundStatusText}>
                      £{remainingWithImpulse.toFixed(2)} total remaining (includes impulse)
                    </Text>
                  </View>
                ) : null}
              </View>

              {budgetLocked && remainingWithImpulse > 0 && budgetState !== "impulse" && budgetState !== "exceeded" && (
                <Text style={styles.remainingNote}>
                  £{remainingBudget.toFixed(2)} budget + £{impulseFund.toFixed(2)} impulse available
                </Text>
              )}

              {list.status === "shopping" && estimatedTotal > 0 && (
                <Text style={styles.estimateNote}>
                  Original estimate: £{estimatedTotal.toFixed(2)}
                </Text>
              )}
            </GlassCard>
          )}

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            {list.status === "active" && (
              <>
                <GlassButton
                  variant="secondary"
                  size="md"
                  icon="package-variant"
                  onPress={handleAddFromPantry}
                  style={styles.actionButton}
                >
                  From Stock
                </GlassButton>
                <GlassButton
                  variant="primary"
                  size="md"
                  icon="cart-outline"
                  onPress={handleStartShopping}
                  style={styles.actionButton}
                >
                  Start Shopping
                </GlassButton>
              </>
            )}
            {list.status === "shopping" && (
              <GlassButton
                variant="primary"
                size="md"
                icon="check-circle-outline"
                onPress={handleCompleteShopping}
                style={styles.fullWidthButton}
              >
                Complete Shopping
              </GlassButton>
            )}
          </View>

          {/* Add Item Form — hidden for viewers */}
          {canEdit !== false && (
          <GlassCard variant="standard" style={styles.addItemCard}>
            <Text style={styles.addItemTitle}>Add Item</Text>
            <View style={styles.addItemForm}>
              <GlassInput
                placeholder="Item name"
                value={newItemName}
                onChangeText={setNewItemName}
                editable={!isAddingItem}
                style={styles.nameInput}
              />
              <View style={styles.smallInputRow}>
                <GlassInput
                  placeholder="Qty"
                  value={newItemQuantity}
                  onChangeText={setNewItemQuantity}
                  keyboardType="numeric"
                  editable={!isAddingItem}
                  style={styles.smallInput}
                />
                <GlassInput
                  placeholder="£ Est."
                  value={newItemPrice}
                  onChangeText={setNewItemPrice}
                  keyboardType="decimal-pad"
                  editable={!isAddingItem}
                  style={styles.smallInput}
                />
                <GlassButton
                  variant="primary"
                  size="md"
                  icon="plus"
                  onPress={handleAddItem}
                  loading={isAddingItem}
                  disabled={isAddingItem}
                  style={styles.addButton}
                />
              </View>

              {/* Price estimate hint */}
              {priceEstimate && priceEstimate.cheapest && (
                <Text style={styles.priceHint}>
                  Based on £{priceEstimate.cheapest.price.toFixed(2)} at {priceEstimate.cheapest.storeName}
                </Text>
              )}
            </View>
          </GlassCard>
          )}

          {/* Smart Suggestions (Story 3.10) */}
          {items.length > 0 && (
            <GlassCard variant="standard" style={styles.suggestionsCard}>
              <View style={styles.suggestionsHeader}>
                <View style={styles.suggestionsHeaderLeft}>
                  <MaterialCommunityIcons
                    name="lightbulb-on-outline"
                    size={20}
                    color={colors.accent.secondary}
                  />
                  <Text style={styles.suggestionsTitle}>Suggestions</Text>
                </View>
                <View style={styles.suggestionsHeaderRight}>
                  {showSuggestions && suggestions.length > 0 && (
                    <Pressable
                      style={styles.refreshButton}
                      onPress={handleRefreshSuggestions}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      disabled={isLoadingSuggestions}
                    >
                      <MaterialCommunityIcons
                        name="refresh"
                        size={18}
                        color={isLoadingSuggestions ? colors.text.tertiary : colors.text.secondary}
                      />
                    </Pressable>
                  )}
                  <Pressable
                    style={styles.toggleSuggestionsButton}
                    onPress={handleToggleSuggestions}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <MaterialCommunityIcons
                      name={showSuggestions ? "chevron-up" : "chevron-down"}
                      size={20}
                      color={colors.text.secondary}
                    />
                  </Pressable>
                </View>
              </View>

              {showSuggestions && (
                <View style={styles.suggestionsContent}>
                  {isLoadingSuggestions ? (
                    <View style={styles.suggestionsLoading}>
                      <ActivityIndicator size="small" color={colors.accent.secondary} />
                      <Text style={styles.suggestionsLoadingText}>Finding suggestions...</Text>
                    </View>
                  ) : suggestions.length > 0 ? (
                    <View style={styles.suggestionsList}>
                      {suggestions.map((suggestion, index) => (
                        <View key={`${suggestion}-${index}`} style={styles.suggestionChip}>
                          <Text style={styles.suggestionText}>{suggestion}</Text>
                          <View style={styles.suggestionActions}>
                            <Pressable
                              style={styles.suggestionAddButton}
                              onPress={() => handleAddSuggestion(suggestion)}
                              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                            >
                              <MaterialCommunityIcons
                                name="plus"
                                size={16}
                                color={colors.semantic.success}
                              />
                            </Pressable>
                            <Pressable
                              style={styles.suggestionDismissButton}
                              onPress={() => handleDismissSuggestion(suggestion)}
                              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                            >
                              <MaterialCommunityIcons
                                name="close"
                                size={14}
                                color={colors.text.tertiary}
                              />
                            </Pressable>
                          </View>
                        </View>
                      ))}
                    </View>
                  ) : (
                    <Text style={styles.noSuggestionsText}>
                      No suggestions available
                    </Text>
                  )}
                </View>
              )}
            </GlassCard>
          )}

          {/* Items List */}
          {items.length === 0 ? (
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconContainer}>
                <MaterialCommunityIcons
                  name="cart-outline"
                  size={64}
                  color={colors.text.tertiary}
                />
              </View>
              <Text style={styles.emptyTitle}>No Items Yet</Text>
              <Text style={styles.emptySubtitle}>Add items to your shopping list above</Text>
            </View>
          ) : (
            <View style={styles.itemsContainer}>
              <Text style={styles.sectionTitle}>Items ({items.length})</Text>
              {(() => {
                const listCategories = [...new Set(items.map((i) => i.category).filter(Boolean) as string[])].sort();
                const listCategoryCounts: Record<string, number> = {};
                items.forEach((i) => { if (i.category) listCategoryCounts[i.category] = (listCategoryCounts[i.category] || 0) + 1; });
                const categoryFiltered = listCategoryFilter
                  ? items.filter((i) => i.category === listCategoryFilter)
                  : items;
                // Sort pending items to top
                const displayItems = [...categoryFiltered].sort((a, b) => {
                  const aPending = a.approvalStatus === "pending" ? 0 : 1;
                  const bPending = b.approvalStatus === "pending" ? 0 : 1;
                  return aPending - bPending;
                });
                const pendingCount = categoryFiltered.filter((i) => i.approvalStatus === "pending").length;
                return (
                  <>
                    <CategoryFilter
                      categories={listCategories}
                      selected={listCategoryFilter}
                      onSelect={setListCategoryFilter}
                      counts={listCategoryCounts}
                    />
                    {pendingCount > 0 && (
                      <View style={styles.pendingBanner}>
                        <MaterialCommunityIcons
                          name="clock-outline"
                          size={16}
                          color={colors.accent.warning}
                        />
                        <Text style={styles.pendingBannerText}>
                          {pendingCount} {pendingCount === 1 ? "item needs" : "items need"} approval
                        </Text>
                      </View>
                    )}
                    {displayItems.map((item) => (
                      <ShoppingListItem
                        key={item._id}
                        item={item}
                        onToggle={() => handleToggleItem(item._id)}
                        onRemove={() => handleRemoveItem(item._id, item.name)}
                        onPriorityChange={(priority) => handlePriorityChange(item._id, priority)}
                        isShopping={list.status === "shopping"}
                        isOwner={isOwner}
                        canApprove={canApprove}
                        commentCount={commentCounts?.[item._id as string] ?? 0}
                        onApprove={() => handleApproveItem(item._id)}
                        onReject={() => handleRejectItem(item._id)}
                        onOpenComments={isPartner || isOwner ? () => openCommentThread(item._id, item.name) : undefined}
                      />
                    ))}
                  </>
                );
              })()}
            </View>
          )}

          {/* Bottom spacing */}
          <View style={styles.bottomSpacer} />
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Edit Budget Modal */}
      <Modal
        visible={showEditBudgetModal}
        transparent
        animationType="fade"
        onRequestClose={handleCloseEditBudget}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.modalOverlay}
        >
          <Pressable style={styles.modalBackdrop} onPress={handleCloseEditBudget} />
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <MaterialCommunityIcons
                name="wallet-outline"
                size={24}
                color={colors.accent.primary}
              />
              <Text style={styles.modalTitle}>
                {budget > 0 ? "Edit Budget" : "Set Budget"}
              </Text>
            </View>

            <View style={styles.modalInputGroup}>
              <Text style={styles.modalInputLabel}>Budget Amount</Text>
              <View style={styles.budgetInputContainer}>
                <Text style={styles.currencySymbol}>£</Text>
                <TextInput
                  style={styles.budgetInput}
                  value={editBudgetValue}
                  onChangeText={setEditBudgetValue}
                  keyboardType="decimal-pad"
                  placeholder="50.00"
                  placeholderTextColor={colors.text.tertiary}
                  autoFocus
                />
              </View>
            </View>

            {/* Impulse Fund Preview */}
            {parseFloat(editBudgetValue) > 0 && (
              <View style={styles.impulseFundPreview}>
                <View style={styles.impulseFundPreviewRow}>
                  <MaterialCommunityIcons
                    name="lightning-bolt"
                    size={16}
                    color={colors.accent.secondary}
                  />
                  <Text style={styles.impulseFundPreviewText}>
                    +£{(parseFloat(editBudgetValue) * 0.1).toFixed(2)} impulse fund (10%)
                  </Text>
                </View>
                <Text style={styles.impulseFundPreviewTotal}>
                  Total spending limit: £{(parseFloat(editBudgetValue) * 1.1).toFixed(2)}
                </Text>
              </View>
            )}

            <View style={styles.modalActions}>
              <GlassButton
                variant="secondary"
                onPress={handleCloseEditBudget}
                style={styles.modalButton}
              >
                Cancel
              </GlassButton>
              <GlassButton
                variant="primary"
                onPress={handleSaveBudget}
                loading={isSavingBudget}
                disabled={isSavingBudget}
                style={styles.modalButton}
              >
                {budget > 0 ? "Update" : "Set Budget"}
              </GlassButton>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Mid-Shop Add Flow Modal */}
      <Modal
        visible={showMidShopModal}
        transparent
        animationType="slide"
        onRequestClose={closeMidShopModal}
      >
        <View style={styles.modalOverlay}>
          <Pressable style={styles.modalBackdrop} onPress={closeMidShopModal} />
          <View style={styles.midShopModalContent}>
            {/* Header */}
            <View style={styles.midShopHeader}>
              <View style={styles.midShopIconContainer}>
                <MaterialCommunityIcons
                  name="cart-plus"
                  size={28}
                  color={colors.accent.primary}
                />
              </View>
              <View style={styles.midShopHeaderText}>
                <Text style={styles.midShopTitle}>Add "{midShopItemName}"?</Text>
                <Text style={styles.midShopSubtitle}>
                  {midShopItemPrice > 0
                    ? `Est. £${(midShopItemPrice * midShopItemQuantity).toFixed(2)}`
                    : "No price set"}
                  {midShopItemQuantity > 1 && ` (×${midShopItemQuantity})`}
                </Text>
              </View>
            </View>

            {/* Budget Status */}
            <View style={styles.midShopBudgetStatus}>
              <View style={styles.midShopBudgetRow}>
                <Text style={styles.midShopBudgetLabel}>Current Total</Text>
                <Text style={styles.midShopBudgetValue}>£{currentTotal.toFixed(2)}</Text>
              </View>
              <View style={styles.midShopBudgetRow}>
                <Text style={styles.midShopBudgetLabel}>Budget</Text>
                <Text style={styles.midShopBudgetValue}>£{budget.toFixed(2)}</Text>
              </View>
              <View style={styles.midShopBudgetRow}>
                <Text style={styles.midShopBudgetLabel}>Remaining</Text>
                <Text style={[
                  styles.midShopBudgetValue,
                  remainingBudget < 0 && styles.midShopBudgetNegative
                ]}>
                  £{remainingBudget.toFixed(2)}
                </Text>
              </View>
            </View>

            {/* Option Cards */}
            <View style={styles.midShopOptions}>
              {/* Option 1: Add to Budget */}
              <Pressable
                style={[
                  styles.midShopOptionCard,
                  isAddingMidShop && styles.midShopOptionDisabled,
                ]}
                onPress={() => handleMidShopAdd("budget")}
                disabled={isAddingMidShop}
              >
                <View style={[styles.midShopOptionIcon, { backgroundColor: `${colors.accent.primary}15` }]}>
                  <MaterialCommunityIcons
                    name="wallet-outline"
                    size={24}
                    color={colors.accent.primary}
                  />
                </View>
                <View style={styles.midShopOptionText}>
                  <Text style={styles.midShopOptionTitle}>Add to Budget</Text>
                  <Text style={styles.midShopOptionDesc}>
                    Counts toward £{budget.toFixed(0)} limit
                  </Text>
                </View>
                <MaterialCommunityIcons
                  name="chevron-right"
                  size={24}
                  color={colors.text.tertiary}
                />
              </Pressable>

              {/* Option 2: Use Impulse Fund */}
              <Pressable
                style={[
                  styles.midShopOptionCard,
                  isAddingMidShop && styles.midShopOptionDisabled,
                ]}
                onPress={() => handleMidShopAdd("impulse")}
                disabled={isAddingMidShop}
              >
                <View style={[styles.midShopOptionIcon, { backgroundColor: `${colors.accent.secondary}15` }]}>
                  <MaterialCommunityIcons
                    name="lightning-bolt"
                    size={24}
                    color={colors.accent.secondary}
                  />
                </View>
                <View style={styles.midShopOptionText}>
                  <Text style={styles.midShopOptionTitle}>Use Impulse Fund</Text>
                  <Text style={styles.midShopOptionDesc}>
                    £{(impulseUsage?.remaining ?? impulseFund).toFixed(2)} remaining
                  </Text>
                </View>
                <MaterialCommunityIcons
                  name="chevron-right"
                  size={24}
                  color={colors.text.tertiary}
                />
              </Pressable>

              {/* Option 3: Add to Next Trip */}
              <Pressable
                style={[
                  styles.midShopOptionCard,
                  isAddingMidShop && styles.midShopOptionDisabled,
                ]}
                onPress={() => handleMidShopAdd("next_trip")}
                disabled={isAddingMidShop}
              >
                <View style={[styles.midShopOptionIcon, { backgroundColor: `${colors.text.tertiary}15` }]}>
                  <MaterialCommunityIcons
                    name="clock-outline"
                    size={24}
                    color={colors.text.secondary}
                  />
                </View>
                <View style={styles.midShopOptionText}>
                  <Text style={styles.midShopOptionTitle}>Add to Next Trip</Text>
                  <Text style={styles.midShopOptionDesc}>
                    Save to stock for later
                  </Text>
                </View>
                <MaterialCommunityIcons
                  name="chevron-right"
                  size={24}
                  color={colors.text.tertiary}
                />
              </Pressable>
            </View>

            {/* Cancel Button */}
            <GlassButton
              variant="secondary"
              onPress={closeMidShopModal}
              style={styles.midShopCancelButton}
            >
              Cancel
            </GlassButton>

            {isAddingMidShop && (
              <View style={styles.midShopLoadingOverlay}>
                <ActivityIndicator size="large" color={colors.accent.primary} />
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* Notifications Dropdown */}
      <NotificationDropdown
        visible={showNotifications}
        onClose={() => setShowNotifications(false)}
      />

      {/* Comment Thread (Partner Mode) */}
      <CommentThread
        visible={showCommentThread}
        itemId={commentItemId}
        itemName={commentItemName}
        onClose={() => {
          setShowCommentThread(false);
          setCommentItemId(null);
          setCommentItemName("");
        }}
      />

      {/* Actual Price Modal (Story 3.8) */}
      <Modal
        visible={showActualPriceModal}
        transparent
        animationType="fade"
        onRequestClose={closeActualPriceModal}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.modalOverlay}
        >
          <Pressable style={styles.modalBackdrop} onPress={closeActualPriceModal} />
          <View style={styles.actualPriceModalContent}>
            {/* Header */}
            <View style={styles.actualPriceHeader}>
              <View style={styles.actualPriceIconContainer}>
                <MaterialCommunityIcons
                  name="check-circle-outline"
                  size={28}
                  color={colors.semantic.success}
                />
              </View>
              <View style={styles.actualPriceHeaderText}>
                <Text style={styles.actualPriceTitle}>Check Off Item</Text>
                <Text style={styles.actualPriceItemName} numberOfLines={1}>
                  {checkingItemName}
                  {checkingItemQuantity > 1 && ` (×${checkingItemQuantity})`}
                </Text>
              </View>
            </View>

            {/* Estimated Price Info */}
            {checkingItemEstPrice > 0 && (
              <View style={styles.estimatedPriceInfo}>
                <Text style={styles.estimatedPriceLabel}>Estimated price:</Text>
                <Text style={styles.estimatedPriceValue}>
                  £{(checkingItemEstPrice * checkingItemQuantity).toFixed(2)}
                </Text>
              </View>
            )}

            {/* Actual Price Input */}
            <View style={styles.actualPriceInputGroup}>
              <Text style={styles.actualPriceInputLabel}>Actual Price (per item)</Text>
              <View style={styles.actualPriceInputContainer}>
                <Text style={styles.actualPriceCurrency}>£</Text>
                <TextInput
                  style={styles.actualPriceInput}
                  value={actualPriceValue}
                  onChangeText={setActualPriceValue}
                  keyboardType="decimal-pad"
                  placeholder="0.00"
                  placeholderTextColor={colors.text.tertiary}
                  autoFocus
                />
              </View>
              {checkingItemQuantity > 1 && actualPriceValue && (
                <Text style={styles.actualPriceTotalHint}>
                  Total: £{((parseFloat(actualPriceValue) || 0) * checkingItemQuantity).toFixed(2)}
                </Text>
              )}
            </View>

            {/* Price Difference */}
            {checkingItemEstPrice > 0 && actualPriceValue && (
              <View style={styles.priceDifferenceContainer}>
                {(() => {
                  const actualPrice = parseFloat(actualPriceValue) || 0;
                  const diff = (actualPrice - checkingItemEstPrice) * checkingItemQuantity;
                  const isMore = diff > 0;
                  const isLess = diff < 0;

                  if (Math.abs(diff) < 0.01) return null;

                  return (
                    <View style={[
                      styles.priceDifferenceBadge,
                      isMore ? styles.priceDifferenceMore : styles.priceDifferenceLess
                    ]}>
                      <MaterialCommunityIcons
                        name={isMore ? "arrow-up" : "arrow-down"}
                        size={16}
                        color={isMore ? colors.semantic.danger : colors.semantic.success}
                      />
                      <Text style={[
                        styles.priceDifferenceText,
                        isMore ? styles.priceDifferenceMoreText : styles.priceDifferenceLessText
                      ]}>
                        £{Math.abs(diff).toFixed(2)} {isMore ? "more" : "less"} than estimated
                      </Text>
                    </View>
                  );
                })()}
              </View>
            )}

            {/* Action Buttons */}
            <View style={styles.actualPriceActions}>
              <GlassButton
                variant="secondary"
                onPress={handleSkipActualPrice}
                style={styles.actualPriceButton}
                disabled={isSavingActualPrice}
              >
                Skip Price
              </GlassButton>
              <GlassButton
                variant="primary"
                onPress={handleConfirmActualPrice}
                loading={isSavingActualPrice}
                disabled={isSavingActualPrice}
                style={styles.actualPriceButton}
              >
                Check Off
              </GlassButton>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </GlassScreen>
  );
}

// =============================================================================
// SHOPPING LIST ITEM COMPONENT
// =============================================================================

// Priority configuration
const PRIORITY_CONFIG = {
  "must-have": {
    label: "Must",
    color: colors.semantic.danger,
    icon: "exclamation-thick" as const,
  },
  "should-have": {
    label: "Should",
    color: colors.accent.primary,
    icon: "check" as const,
  },
  "nice-to-have": {
    label: "Nice",
    color: colors.text.tertiary,
    icon: "heart-outline" as const,
  },
};

const PRIORITY_ORDER: Array<"must-have" | "should-have" | "nice-to-have"> = [
  "must-have",
  "should-have",
  "nice-to-have",
];

interface ShoppingListItemProps {
  item: ListItem;
  onToggle: () => void;
  onRemove: () => void;
  onPriorityChange: (priority: "must-have" | "should-have" | "nice-to-have") => void;
  isShopping: boolean;
  // Partner mode props
  isOwner?: boolean;
  canApprove?: boolean;
  commentCount?: number;
  onApprove?: () => void;
  onReject?: () => void;
  onOpenComments?: () => void;
}

function ShoppingListItem({
  item,
  onToggle,
  onRemove,
  onPriorityChange,
  isShopping,
  isOwner,
  canApprove,
  commentCount,
  onApprove,
  onReject,
  onOpenComments,
}: ShoppingListItemProps) {
  const translateX = useSharedValue(0);
  const scale = useSharedValue(1);

  const currentPriority = item.priority || "should-have";
  const priorityConfig = PRIORITY_CONFIG[currentPriority];

  const triggerPriorityChange = (direction: "left" | "right") => {
    const currentIndex = PRIORITY_ORDER.indexOf(currentPriority);
    let newIndex: number;

    if (direction === "left") {
      // Swipe left = decrease priority (towards nice-to-have)
      newIndex = Math.min(currentIndex + 1, PRIORITY_ORDER.length - 1);
    } else {
      // Swipe right = increase priority (towards must-have)
      newIndex = Math.max(currentIndex - 1, 0);
    }

    if (newIndex !== currentIndex) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      onPriorityChange(PRIORITY_ORDER[newIndex]);
    }
  };

  const panGesture = Gesture.Pan()
    .activeOffsetX([-20, 20])
    .onUpdate((event) => {
      // Clamp the translation
      translateX.value = Math.max(-80, Math.min(80, event.translationX));
    })
    .onEnd((event) => {
      const threshold = 50;

      if (event.translationX > threshold) {
        runOnJS(triggerPriorityChange)("right");
      } else if (event.translationX < -threshold) {
        runOnJS(triggerPriorityChange)("left");
      }

      translateX.value = withSpring(0, { damping: 15 });
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { scale: scale.value },
    ],
  }));

  const leftActionStyle = useAnimatedStyle(() => ({
    opacity: translateX.value > 20 ? Math.min((translateX.value - 20) / 30, 1) : 0,
  }));

  const rightActionStyle = useAnimatedStyle(() => ({
    opacity: translateX.value < -20 ? Math.min((-translateX.value - 20) / 30, 1) : 0,
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.98, animations.spring.stiff);
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, animations.spring.gentle);
  };

  const iconResult = getIconForItem(item.name, item.category || "other");

  return (
    <View style={styles.swipeContainer}>
      {/* Left action (increase priority) */}
      <Animated.View style={[styles.swipeAction, styles.swipeActionLeft, leftActionStyle]}>
        <MaterialCommunityIcons name="arrow-up-bold" size={20} color="#fff" />
        <Text style={styles.swipeActionText}>Priority ↑</Text>
      </Animated.View>

      {/* Right action (decrease priority) */}
      <Animated.View style={[styles.swipeAction, styles.swipeActionRight, rightActionStyle]}>
        <Text style={styles.swipeActionText}>Priority ↓</Text>
        <MaterialCommunityIcons name="arrow-down-bold" size={20} color="#fff" />
      </Animated.View>

      <GestureDetector gesture={panGesture}>
        <Animated.View style={animatedStyle}>
          <Pressable onPressIn={handlePressIn} onPressOut={handlePressOut}>
            <GlassCard
              variant="standard"
              style={[styles.itemCard, item.isChecked && styles.itemCardChecked, item.approvalStatus === "pending" && styles.itemCardPending]}
            >
              <View style={styles.itemRow}>
                {/* Checkbox */}
                <GlassCircularCheckbox
                  checked={item.isChecked}
                  onToggle={onToggle}
                  size="md"
                />

                {/* Item content */}
                <View style={styles.itemContent}>
                  <View style={styles.itemNameRow}>
                    <MaterialCommunityIcons
                      name={iconResult.icon as keyof typeof MaterialCommunityIcons.glyphMap}
                      size={18}
                      color={item.isChecked ? colors.text.tertiary : colors.text.secondary}
                    />
                    <Text
                      style={[styles.itemName, item.isChecked && styles.itemNameChecked]}
                      numberOfLines={1}
                    >
                      {item.name}
                    </Text>
                  </View>

                  <View style={styles.itemDetails}>
                    {/* Priority Badge */}
                    <View style={[styles.priorityBadge, { backgroundColor: `${priorityConfig.color}20` }]}>
                      <MaterialCommunityIcons
                        name={priorityConfig.icon}
                        size={10}
                        color={priorityConfig.color}
                      />
                      <Text style={[styles.priorityText, { color: priorityConfig.color }]}>
                        {priorityConfig.label}
                      </Text>
                    </View>

                    <View style={styles.quantityBadge}>
                      <Text style={styles.quantityText}>×{item.quantity}</Text>
                    </View>

                    {item.estimatedPrice && (
                      <Text style={styles.itemPrice}>
                        £{(item.estimatedPrice * item.quantity).toFixed(2)}
                      </Text>
                    )}

                    {item.actualPrice && isShopping && (
                      <View style={styles.actualPriceBadge}>
                        <Text style={styles.actualPriceText}>
                          £{(item.actualPrice * item.quantity).toFixed(2)}
                        </Text>
                      </View>
                    )}

                    {item.autoAdded && (
                      <View style={styles.autoAddedBadge}>
                        <MaterialCommunityIcons
                          name="lightning-bolt"
                          size={12}
                          color={colors.accent.secondary}
                        />
                        <Text style={styles.autoAddedText}>Auto</Text>
                      </View>
                    )}

                    {/* Approval Badge */}
                    {item.approvalStatus && (
                      <ApprovalBadge status={item.approvalStatus} compact />
                    )}
                  </View>

                  {/* Approval Actions for pending items — owner or approver partner */}
                  {item.approvalStatus === "pending" && (isOwner || canApprove) && (
                    <ApprovalActions
                      onApprove={onApprove ?? (() => {})}
                      onReject={onReject ?? (() => {})}
                    />
                  )}
                </View>

                {/* Comment button */}
                {onOpenComments && (
                  <Pressable
                    style={styles.commentButton}
                    onPress={onOpenComments}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <MaterialCommunityIcons
                      name="comment-text-outline"
                      size={16}
                      color={colors.text.secondary}
                    />
                    {(commentCount ?? 0) > 0 && (
                      <View style={styles.commentCountBadge}>
                        <Text style={styles.commentCountText}>{commentCount}</Text>
                      </View>
                    )}
                  </Pressable>
                )}

                {/* Remove button */}
                <RemoveButton onPress={onRemove} size="md" />
              </View>
            </GlassCard>
          </Pressable>
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
  keyboardView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    ...typography.bodyMedium,
    color: colors.text.secondary,
    marginTop: spacing.md,
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: spacing.xl,
    gap: spacing.lg,
  },
  errorText: {
    ...typography.headlineMedium,
    color: colors.semantic.danger,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  bottomSpacer: {
    height: 140,
  },

  // Budget Card
  budgetCard: {
    marginBottom: spacing.md,
  },
  budgetHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.md,
  },
  budgetLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  budgetLabel: {
    ...typography.labelLarge,
    color: colors.text.primary,
  },
  lockedBadge: {
    backgroundColor: `${colors.semantic.warning}20`,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: spacing.xs,
  },
  lockedBadgeText: {
    ...typography.labelSmall,
    color: colors.semantic.warning,
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  lockButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.glass.background,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.glass.border,
  },
  lockButtonActive: {
    backgroundColor: `${colors.semantic.warning}20`,
    borderColor: colors.semantic.warning,
  },
  remainingNote: {
    ...typography.bodySmall,
    color: colors.semantic.warning,
    marginTop: spacing.sm,
    textAlign: "center",
    fontWeight: "500",
  },
  impulseFundContainer: {
    marginTop: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.glass.border,
  },
  impulseFundRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  impulseFundLabel: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  impulseFundText: {
    ...typography.bodySmall,
    color: colors.text.secondary,
  },
  impulseFundAmount: {
    ...typography.labelMedium,
    color: colors.accent.secondary,
    fontWeight: "600",
  },
  impulseFundActive: {
    color: colors.semantic.warning,
  },
  impulseFundExceeded: {
    color: colors.semantic.danger,
  },
  impulseFundStatus: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  impulseFundStatusText: {
    ...typography.bodySmall,
    color: colors.text.tertiary,
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 12,
  },
  statusText: {
    ...typography.labelSmall,
    fontWeight: "600",
  },
  estimateNote: {
    ...typography.bodySmall,
    color: colors.text.tertiary,
    marginTop: spacing.sm,
    textAlign: "center",
  },

  // Action Buttons
  actionButtons: {
    flexDirection: "row",
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  actionButton: {
    flex: 1,
  },
  fullWidthButton: {
    flex: 1,
  },

  // Add Item Card
  addItemCard: {
    marginBottom: spacing.lg,
  },
  addItemTitle: {
    ...typography.labelLarge,
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  addItemForm: {
    gap: spacing.sm,
  },
  nameInput: {
    flex: 1,
  },
  smallInputRow: {
    flexDirection: "row",
    gap: spacing.sm,
    alignItems: "center",
  },
  smallInput: {
    flex: 1,
  },
  addButton: {
    width: 48,
    paddingHorizontal: 0,
  },
  priceHint: {
    ...typography.bodySmall,
    color: colors.accent.primary,
    marginTop: 4,
    opacity: 0.8,
  },

  // Empty State
  emptyContainer: {
    alignItems: "center",
    paddingVertical: spacing["2xl"],
  },
  emptyIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.glass.background,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: spacing.md,
  },
  emptyTitle: {
    ...typography.headlineSmall,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  emptySubtitle: {
    ...typography.bodyMedium,
    color: colors.text.secondary,
  },

  // Items Section
  itemsContainer: {
    gap: spacing.sm,
  },
  sectionTitle: {
    ...typography.labelLarge,
    color: colors.text.secondary,
    marginBottom: spacing.xs,
  },

  // Pending approval banner
  pendingBanner: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: spacing.xs,
    backgroundColor: "rgba(245, 158, 11, 0.12)",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 10,
    marginBottom: spacing.sm,
  },
  pendingBannerText: {
    color: colors.accent.warning,
    fontSize: typography.bodyMedium.fontSize,
    fontWeight: "600" as const,
  },

  // Swipe Container
  swipeContainer: {
    position: "relative",
    marginBottom: spacing.xs,
  },
  swipeAction: {
    position: "absolute",
    top: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
  },
  swipeActionLeft: {
    left: 0,
    backgroundColor: colors.semantic.success,
    borderRadius: borderRadius.lg,
  },
  swipeActionRight: {
    right: 0,
    backgroundColor: colors.text.tertiary,
    borderRadius: borderRadius.lg,
  },
  swipeActionText: {
    ...typography.labelSmall,
    color: "#fff",
    fontWeight: "600",
  },

  // Item Card
  itemCard: {
    // No marginBottom here, handled by swipeContainer
  },
  itemCardChecked: {
    opacity: 0.7,
  },
  itemCardPending: {
    opacity: 0.6,
    borderColor: "rgba(245, 158, 11, 0.4)",
    borderWidth: 1,
  },
  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  itemContent: {
    flex: 1,
  },
  itemNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  itemName: {
    ...typography.bodyLarge,
    color: colors.text.primary,
    flex: 1,
  },
  itemNameChecked: {
    textDecorationLine: "line-through",
    color: colors.text.tertiary,
  },
  itemDetails: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    flexWrap: "wrap",
  },
  priorityBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  priorityText: {
    ...typography.labelSmall,
    fontSize: 10,
    fontWeight: "600",
  },
  quantityBadge: {
    backgroundColor: colors.glass.backgroundStrong,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  quantityText: {
    ...typography.labelSmall,
    color: colors.text.secondary,
  },
  itemPrice: {
    ...typography.bodySmall,
    color: colors.text.secondary,
  },
  actualPriceBadge: {
    backgroundColor: `${colors.accent.primary}20`,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  actualPriceText: {
    ...typography.labelSmall,
    color: colors.accent.primary,
    fontWeight: "600",
  },
  autoAddedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    backgroundColor: `${colors.accent.secondary}20`,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  autoAddedText: {
    ...typography.labelSmall,
    color: colors.accent.secondary,
    fontSize: 10,
  },

  // Set Budget Card (when no budget)
  setBudgetCard: {
    marginBottom: spacing.md,
  },
  setBudgetContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  setBudgetIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: `${colors.accent.primary}15`,
    justifyContent: "center",
    alignItems: "center",
  },
  setBudgetText: {
    flex: 1,
  },
  setBudgetTitle: {
    ...typography.headlineSmall,
    color: colors.text.primary,
    marginBottom: 2,
  },
  setBudgetSubtitle: {
    ...typography.bodySmall,
    color: colors.text.secondary,
  },

  // Budget Actions (edit + lock buttons)
  budgetActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  editBudgetButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.glass.background,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.glass.border,
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.75)",
  },
  modalContent: {
    width: "85%",
    maxWidth: 360,
    backgroundColor: colors.background.primary,
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: colors.glass.borderFocus,
    shadowColor: colors.accent.primary,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.3,
    shadowRadius: 24,
    elevation: 15,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: spacing.xl,
  },
  modalTitle: {
    ...typography.headlineMedium,
    color: colors.text.primary,
  },
  modalInputGroup: {
    marginBottom: spacing.lg,
  },
  modalInputLabel: {
    ...typography.labelMedium,
    color: colors.text.secondary,
    marginBottom: spacing.sm,
  },
  budgetInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.glass.background,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.glass.border,
    paddingHorizontal: spacing.md,
  },
  currencySymbol: {
    ...typography.headlineLarge,
    color: colors.accent.primary,
    marginRight: spacing.xs,
  },
  budgetInput: {
    flex: 1,
    ...typography.headlineLarge,
    color: colors.text.primary,
    paddingVertical: spacing.md,
  },
  impulseFundPreview: {
    backgroundColor: `${colors.accent.secondary}10`,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  impulseFundPreviewRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  impulseFundPreviewText: {
    ...typography.bodyMedium,
    color: colors.accent.secondary,
    fontWeight: "500",
  },
  impulseFundPreviewTotal: {
    ...typography.bodySmall,
    color: colors.text.tertiary,
  },
  modalActions: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  modalButton: {
    flex: 1,
  },

  // Mid-Shop Modal Styles
  midShopModalContent: {
    width: "90%",
    maxWidth: 400,
    backgroundColor: colors.background.primary,
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  midShopHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  midShopIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: `${colors.accent.primary}15`,
    justifyContent: "center",
    alignItems: "center",
  },
  midShopHeaderText: {
    flex: 1,
  },
  midShopTitle: {
    ...typography.headlineSmall,
    color: colors.text.primary,
    marginBottom: 2,
  },
  midShopSubtitle: {
    ...typography.bodyMedium,
    color: colors.text.secondary,
  },
  midShopBudgetStatus: {
    backgroundColor: colors.glass.background,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.glass.border,
  },
  midShopBudgetRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: spacing.xs,
  },
  midShopBudgetLabel: {
    ...typography.bodyMedium,
    color: colors.text.secondary,
  },
  midShopBudgetValue: {
    ...typography.labelLarge,
    color: colors.text.primary,
    fontWeight: "600",
  },
  midShopBudgetNegative: {
    color: colors.semantic.danger,
  },
  midShopOptions: {
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  midShopOptionCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.glass.background,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.glass.border,
    gap: spacing.md,
  },
  midShopOptionDisabled: {
    opacity: 0.5,
  },
  midShopOptionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
  },
  midShopOptionText: {
    flex: 1,
  },
  midShopOptionTitle: {
    ...typography.labelLarge,
    color: colors.text.primary,
    marginBottom: 2,
  },
  midShopOptionDesc: {
    ...typography.bodySmall,
    color: colors.text.secondary,
  },
  midShopCancelButton: {
    marginTop: spacing.xs,
  },
  midShopLoadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(255, 255, 255, 0.8)",
    justifyContent: "center",
    alignItems: "center",
    borderRadius: borderRadius.xl,
  },

  // Actual Price Modal Styles (Story 3.8)
  actualPriceModalContent: {
    width: "85%",
    maxWidth: 360,
    backgroundColor: colors.background.primary,
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  actualPriceHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  actualPriceIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: `${colors.semantic.success}15`,
    justifyContent: "center",
    alignItems: "center",
  },
  actualPriceHeaderText: {
    flex: 1,
  },
  actualPriceTitle: {
    ...typography.headlineSmall,
    color: colors.text.primary,
    marginBottom: 2,
  },
  actualPriceItemName: {
    ...typography.bodyMedium,
    color: colors.text.secondary,
  },
  estimatedPriceInfo: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: colors.glass.background,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.glass.border,
  },
  estimatedPriceLabel: {
    ...typography.bodyMedium,
    color: colors.text.secondary,
  },
  estimatedPriceValue: {
    ...typography.labelLarge,
    color: colors.text.primary,
    fontWeight: "600",
  },
  actualPriceInputGroup: {
    marginBottom: spacing.md,
  },
  actualPriceInputLabel: {
    ...typography.labelMedium,
    color: colors.text.secondary,
    marginBottom: spacing.sm,
  },
  actualPriceInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.glass.background,
    borderRadius: borderRadius.lg,
    borderWidth: 2,
    borderColor: colors.semantic.success,
    paddingHorizontal: spacing.md,
  },
  actualPriceCurrency: {
    ...typography.headlineLarge,
    color: colors.semantic.success,
    marginRight: spacing.xs,
  },
  actualPriceInput: {
    flex: 1,
    ...typography.headlineLarge,
    color: colors.text.primary,
    paddingVertical: spacing.md,
  },
  actualPriceTotalHint: {
    ...typography.bodySmall,
    color: colors.text.tertiary,
    marginTop: spacing.xs,
    textAlign: "right",
  },
  priceDifferenceContainer: {
    marginBottom: spacing.lg,
  },
  priceDifferenceBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
  },
  priceDifferenceMore: {
    backgroundColor: `${colors.semantic.danger}15`,
  },
  priceDifferenceLess: {
    backgroundColor: `${colors.semantic.success}15`,
  },
  priceDifferenceText: {
    ...typography.bodyMedium,
    fontWeight: "500",
  },
  priceDifferenceMoreText: {
    color: colors.semantic.danger,
  },
  priceDifferenceLessText: {
    color: colors.semantic.success,
  },
  actualPriceActions: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  actualPriceButton: {
    flex: 1,
  },

  // Smart Suggestions Styles (Story 3.10)
  suggestionsCard: {
    marginBottom: spacing.lg,
  },
  suggestionsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  suggestionsHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  suggestionsTitle: {
    ...typography.labelLarge,
    color: colors.text.primary,
  },
  suggestionsHeaderRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  refreshButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.glass.background,
    justifyContent: "center",
    alignItems: "center",
  },
  toggleSuggestionsButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  suggestionsContent: {
    marginTop: spacing.md,
  },
  suggestionsLoading: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    paddingVertical: spacing.md,
  },
  suggestionsLoadingText: {
    ...typography.bodySmall,
    color: colors.text.tertiary,
  },
  suggestionsList: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  suggestionChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: `${colors.accent.secondary}15`,
    borderRadius: borderRadius.full,
    paddingLeft: spacing.md,
    paddingRight: spacing.xs,
    paddingVertical: spacing.xs,
    gap: spacing.xs,
  },
  suggestionText: {
    ...typography.bodyMedium,
    color: colors.text.primary,
  },
  suggestionActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  suggestionAddButton: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: `${colors.semantic.success}20`,
    justifyContent: "center",
    alignItems: "center",
  },
  suggestionDismissButton: {
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: "center",
    alignItems: "center",
  },
  noSuggestionsText: {
    ...typography.bodySmall,
    color: colors.text.tertiary,
    textAlign: "center",
    paddingVertical: spacing.sm,
  },

  // Header styles
  headerRightRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  headerIconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  headerStatusBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },

  commentButton: {
    position: "relative" as const,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.glass.background,
    justifyContent: "center" as const,
    alignItems: "center" as const,
  },
  commentCountBadge: {
    position: "absolute",
    top: -2,
    right: -2,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.accent.primary,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 3,
  },
  commentCountText: {
    ...typography.labelSmall,
    fontSize: 9,
    color: colors.text.primary,
    fontWeight: "800",
  },
});
