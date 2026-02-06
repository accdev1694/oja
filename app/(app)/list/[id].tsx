import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  LayoutAnimation,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useState, useEffect, useCallback, useRef } from "react";
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
} from "react-native-reanimated";
import { Gesture, GestureDetector } from "react-native-gesture-handler";

import {
  GlassScreen,
  GlassCard,
  GlassButton,
  GlassHeader,
  GlassInput,
  GlassCircularCheckbox,
  CircularBudgetDial,
  GlassModal,
  colors,
  typography,
  spacing,
  animations,
  borderRadius,
  useGlassAlert,
} from "@/components/ui/glass";
import { CategoryFilter } from "@/components/ui/CategoryFilter";
import { usePartnerRole } from "@/hooks/usePartnerRole";
import { RemoveButton } from "@/components/ui/RemoveButton";
import { AddToListButton } from "@/components/ui/AddToListButton";
import {
  ApprovalBadge,
  ApprovalActions,
  CommentThread,
  NotificationBell,
  NotificationDropdown,
} from "@/components/partners";
import { ListApprovalBanner } from "@/components/partners/ListApprovalBanner";
import { ListChatThread } from "@/components/partners/ListChatThread";
import { GlassToast } from "@/components/ui/glass/GlassToast";
import { useDelightToast } from "@/hooks/useDelightToast";

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

/**
 * Get a confidence label for a price based on its source and report count.
 * reportCount: 0 = "~est.", 1-2 = "at StoreName", 3-9 = "avg", 10+ = no qualifier
 */
function getPriceLabel(
  price: number,
  priceSource: "personal" | "crowdsourced" | "ai_estimate",
  reportCount: number,
  storeName: string | null
): { prefix: string; suffix: string } {
  if (priceSource === "ai_estimate" || reportCount === 0) {
    return { prefix: "~", suffix: "est." };
  }
  if (reportCount <= 2 && storeName) {
    return { prefix: "", suffix: `at ${storeName}` };
  }
  if (reportCount < 10) {
    return { prefix: "", suffix: "avg" };
  }
  return { prefix: "", suffix: "" };
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
  approvalStatus?: "pending" | "approved" | "rejected";
};

export default function ListDetailScreen() {
  const params = useLocalSearchParams();
  const id = params.id as string as Id<"shoppingLists">;
  const router = useRouter();
  const { alert } = useGlassAlert();
  const { toast, dismiss, onMundaneAction } = useDelightToast();

  const list = useQuery(api.shoppingLists.getById, { id });
  const items = useQuery(api.listItems.getByList, { listId: id });
  const toggleChecked = useMutation(api.listItems.toggleChecked);
  const addItem = useMutation(api.listItems.create);
  const updateItem = useMutation(api.listItems.update);
  const removeItem = useMutation(api.listItems.remove);
  const startShopping = useMutation(api.shoppingLists.startShopping);
  const completeShopping = useMutation(api.shoppingLists.completeShopping);

  const updateList = useMutation(api.shoppingLists.update);
  const addItemMidShop = useMutation(api.listItems.addItemMidShop);
  const generateSuggestions = useAction(api.ai.generateListSuggestions);
  const estimateItemPrice = useAction(api.ai.estimateItemPrice);

  // Partner mode
  const { isOwner, isPartner, canEdit, canApprove, loading: roleLoading } = usePartnerRole(id);
  const handleApproval = useMutation(api.partners.handleApproval);
  const setPreferredVariant = useMutation(api.pantryItems.setPreferredVariant);
  const commentCounts = useQuery(api.partners.getCommentCounts, items ? { listItemIds: items.map((i) => i._id) } : "skip");
  const allActiveLists = useQuery(api.shoppingLists.getActive);

  // Add-to-list picker state
  const [addToListItem, setAddToListItem] = useState<{
    name: string;
    estimatedPrice?: number;
    quantity: number;
  } | null>(null);

  // Edit item modal state
  const [editingItem, setEditingItem] = useState<ListItem | null>(null);
  const [editName, setEditName] = useState("");
  const [editQuantity, setEditQuantity] = useState("");
  const [editPrice, setEditPrice] = useState("");

  // Notification state
  const [showNotifications, setShowNotifications] = useState(false);

  // Comment thread state
  const [showCommentThread, setShowCommentThread] = useState(false);
  const [commentItemId, setCommentItemId] = useState<Id<"listItems"> | null>(null);
  const [commentItemName, setCommentItemName] = useState("");

  // List chat state
  const [showListChat, setShowListChat] = useState(false);

  // Partner data for approval banner
  const listPartners = useQuery(api.partners.getByList, { listId: id });
  const hasApprovers = (listPartners ?? []).some(
    (p: any) => p.status === "accepted" && p.role === "approver"
  );
  const hasPartners = (listPartners ?? []).some((p: any) => p.status === "accepted");
  const listMessageCount = useQuery(api.partners.getListMessageCount, hasPartners ? { listId: id } : "skip");

  // Resolve approver name for banner
  const approverName = list?.approvalRespondedBy
    ? (listPartners ?? []).find((p: any) => p.userId === list.approvalRespondedBy)?.userName
    : undefined;

  const [isAddingItem, setIsAddingItem] = useState(false);
  const [newItemName, setNewItemName] = useState("");
  const [newItemQuantity, setNewItemQuantity] = useState("1");
  const [newItemPrice, setNewItemPrice] = useState("");
  const [selectedVariantName, setSelectedVariantName] = useState<string | null>(null);
  const [isEstimatingPrice, setIsEstimatingPrice] = useState(false);

  // Price estimate from current prices database
  const priceEstimate = useQuery(
    api.currentPrices.getEstimate,
    newItemName.trim().length >= 2 ? { itemName: newItemName.trim() } : "skip"
  );

  // Item variants for the typed item name (with 3-layer price cascade)
  const itemVariants = useQuery(
    api.itemVariants.getWithPrices,
    newItemName.trim().length >= 2
      ? {
          baseItem: newItemName.trim(),
          ...(list?.userId ? { userId: list.userId } : {}),
          ...(list?.storeName ? { storeName: list.storeName } : {}),
        }
      : "skip"
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

  // Progressive disclosure states (Criterion 1: Simplicity)
  const [addFormVisible, setAddFormVisible] = useState(false);

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

  // Reset selected variant when item name changes
  useEffect(() => {
    setSelectedVariantName(null);
  }, [newItemName]);

  // Trigger AI price estimation for completely unknown items
  useEffect(() => {
    if (
      newItemName.trim().length < 2 ||
      isEstimatingPrice ||
      !list?.userId
    ) return;

    // Wait for both queries to resolve (not undefined/loading)
    if (priceEstimate === undefined || itemVariants === undefined) return;

    // If we already have price data from either source, no need to estimate
    if (priceEstimate !== null || (itemVariants && itemVariants.length > 0)) return;

    // No price data anywhere — trigger AI estimation
    setIsEstimatingPrice(true);
    estimateItemPrice({
      itemName: newItemName.trim(),
      userId: list.userId,
    })
      .catch(console.error)
      .finally(() => setIsEstimatingPrice(false));
  }, [newItemName, priceEstimate, itemVariants, list?.userId]); // eslint-disable-line react-hooks/exhaustive-deps

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

  // Blended total for shopping mode: actual for checked items + estimated for unchecked
  const shoppingTotal = items.reduce((sum, item) => {
    if (item.isChecked && item.actualPrice) {
      return sum + item.actualPrice * item.quantity;
    }
    return sum + (item.estimatedPrice || 0) * item.quantity;
  }, 0);

  const checkedCount = items.filter((item) => item.isChecked).length;
  const totalCount = items.length;

  // Budget status
  const budget = list.budget || 0;
  const currentTotal = list.status === "shopping" ? shoppingTotal : estimatedTotal;
  const remainingBudget = budget - currentTotal;
  const isOverBudget = budget > 0 && currentTotal > budget;

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
      alert("Error", "Budget cannot be negative");
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
      alert("Error", "Failed to update budget");
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
      onMundaneAction(); // Surprise delight on check-off
    } catch (error) {
      console.error("Failed to toggle item:", error);
      alert("Error", "Failed to update item");
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
      onMundaneAction(); // Surprise delight on check-off
      closeActualPriceModal();
    } catch (error) {
      console.error("Failed to check off item:", error);
      alert("Error", "Failed to check off item");
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
      alert("Error", "Failed to check off item");
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
      alert("Error", "Failed to add item");
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
      alert("Quantity Updated", `"${existingItem.name}" quantity increased to ${newQuantity}`);

      setNewItemName("");
      setNewItemQuantity("1");
      setNewItemPrice("");
    } catch (error) {
      console.error("Failed to update item:", error);
      alert("Error", "Failed to update item quantity");
    }
  }

  async function handleAddItem() {
    if (!newItemName.trim()) {
      alert("Error", "Please enter an item name");
      return;
    }

    const similarItem = findSimilarItem(newItemName.trim());

    if (similarItem) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      alert(
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

  async function handleMidShopAdd(source: "add" | "next_trip") {
    if (!midShopItemName) return;

    setIsAddingMidShop(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      await addItemMidShop({
        listId: id,
        name: midShopItemName,
        estimatedPrice: midShopItemPrice,
        quantity: midShopItemQuantity,
        source,
      });

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      if (source === "add") {
        alert("Added to List", `"${midShopItemName}" added to your list`);
      } else {
        alert("Saved for Later", `"${midShopItemName}" added to stock for next trip`);
      }

      setNewItemName("");
      setNewItemQuantity("1");
      setNewItemPrice("");
      closeMidShopModal();
    } catch (error: unknown) {
      console.error("Failed to add mid-shop item:", error);
      alert("Error", "Failed to add item");
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
        alert("Error", "Failed to remove item");
      }
    };

    alert("Remove Item", `Remove "${itemName}" from list?`, [
      { text: "Cancel", style: "cancel" },
      { text: "Remove", style: "destructive", onPress: doRemove },
    ]);
  }

  function handleEditItem(item: ListItem) {
    setEditingItem(item);
    setEditName(item.name);
    setEditQuantity(String(item.quantity));
    setEditPrice(item.estimatedPrice ? String(item.estimatedPrice) : "");
  }

  function handleCloseEditModal() {
    setEditingItem(null);
    setEditName("");
    setEditQuantity("");
    setEditPrice("");
  }

  async function handleSaveEdit() {
    if (!editingItem) return;

    const updates: {
      id: Id<"listItems">;
      name?: string;
      quantity?: number;
      estimatedPrice?: number;
    } = { id: editingItem._id };

    if (editName.trim() && editName !== editingItem.name) {
      updates.name = editName.trim();
    }

    const qty = parseInt(editQuantity);
    if (!isNaN(qty) && qty > 0 && qty !== editingItem.quantity) {
      updates.quantity = qty;
    }

    const price = parseFloat(editPrice);
    if (!isNaN(price) && price >= 0 && price !== editingItem.estimatedPrice) {
      updates.estimatedPrice = price;
    }

    try {
      await updateItem(updates);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      handleCloseEditModal();
    } catch (error) {
      console.error("Failed to update item:", error);
      alert("Error", "Failed to update item");
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

  function handleAddItemToList(item: { name: string; estimatedPrice?: number; quantity: number }) {
    const otherLists = (allActiveLists ?? []).filter(
      (l) => l._id !== id && (l.status === "active" || l.status === "shopping")
    );

    if (otherLists.length === 0) {
      alert("No Other Lists", "There are no other active lists to add this item to.");
      return;
    }

    if (otherLists.length === 1) {
      pickListForItem(otherLists[0]._id, otherLists[0].name, item.name, item.estimatedPrice, item.quantity);
      return;
    }

    setAddToListItem(item);
  }

  async function pickListForItem(
    listId: Id<"shoppingLists">,
    listName: string,
    itemName: string,
    estimatedPrice?: number,
    quantity: number = 1
  ) {
    try {
      await addItem({
        listId,
        name: itemName,
        quantity,
        estimatedPrice,
      });
      toast(`${itemName} → ${listName}`);
    } catch (e) {
      console.error("Failed to add to list:", e);
    }
    setAddToListItem(null);
  }

  async function handleStartShopping() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await startShopping({ id });
    } catch (error) {
      console.error("Failed to start shopping:", error);
      alert("Error", "Failed to start shopping");
    }
  }

  async function handleCompleteShopping() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const doComplete = async () => {
      try {
        await completeShopping({ id });
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        router.back();
      } catch (error) {
        console.error("Failed to complete shopping:", error);
        alert("Error", "Failed to complete shopping");
      }
    };

    alert("Complete Shopping", "Mark this shopping trip as complete?", [
      { text: "Cancel", style: "cancel" },
      { text: "Complete", onPress: doComplete },
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
      // Get a price estimate before adding
      let price: number | undefined;
      try {
        if (list?.userId) {
          const estimate = await estimateItemPrice({ itemName: suggestionName, userId: list.userId });
          price = estimate?.estimatedPrice;
        }
      } catch {
        // Price estimation failed — add without price rather than blocking
      }

      await addItem({
        listId: id,
        name: suggestionName,
        quantity: 1,
        estimatedPrice: price,
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.error("Failed to add suggestion:", error);
      // Add back to suggestions if failed
      setSuggestions((prev) => [...prev, suggestionName]);
      alert("Error", "Failed to add item");
    }
  }

  function handleDismissSuggestion(suggestionName: string) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSuggestions((prev) => prev.filter((s) => s !== suggestionName));
    setDismissedSuggestions((prev) => [...prev, suggestionName]);
  }

  // Progressive disclosure handlers
  function handleToggleAddForm() {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setAddFormVisible((prev) => !prev);
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
      alert("Error", "Failed to approve item");
    }
  }

  async function handleRejectItem(itemId: Id<"listItems">) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await handleApproval({ listItemId: itemId, decision: "rejected" });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.error("Failed to reject item:", error);
      alert("Error", "Failed to reject item");
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
              {hasPartners && (
                <Pressable
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setShowListChat(true);
                  }}
                  hitSlop={8}
                  style={styles.headerIconButton}
                >
                  <MaterialCommunityIcons
                    name="chat-outline"
                    size={22}
                    color={colors.text.secondary}
                  />
                  {(listMessageCount ?? 0) > 0 && (
                    <View style={styles.chatCountBadge}>
                      <Text style={styles.chatCountText}>
                        {listMessageCount! > 99 ? "99+" : listMessageCount}
                      </Text>
                    </View>
                  )}
                </Pressable>
              )}
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
          {/* Circular Budget Dial — tap to edit */}
          {budget > 0 && (
            <CircularBudgetDial
              spent={currentTotal}
              budget={budget}
              onPress={handleOpenEditBudget}
            />
          )}

          {/* List-Level Approval Banner */}
          {hasPartners && (
            <ListApprovalBanner
              listId={id}
              approvalStatus={list.approvalStatus}
              approvalNote={list.approvalNote}
              approverName={approverName}
              isOwner={isOwner}
              canApprove={canApprove}
              hasApprovers={hasApprovers}
            />
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
                  Add from Pantry
                </GlassButton>
                <GlassButton
                  variant="primary"
                  size="md"
                  icon="cart-outline"
                  onPress={handleStartShopping}
                  style={styles.actionButton}
                >
                  Go Shopping
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

          {/* Add Item — collapsed button or expanded form with inline suggestions */}
          {canEdit !== false && (
            <>
              {/* Collapsed: "+ Add Item" button */}
              {!addFormVisible && items.length > 0 && (
                <GlassButton
                  variant="secondary"
                  size="md"
                  icon="plus"
                  onPress={handleToggleAddForm}
                  style={styles.addItemCollapsedButton}
                >
                  Add Item
                </GlassButton>
              )}

              {/* Expanded: Full add form with inline suggestions */}
              {(addFormVisible || items.length === 0) && (
                <GlassCard variant="standard" style={styles.addItemCard}>
                  <View style={styles.addItemHeader}>
                    <Text style={styles.addItemTitle}>Add Item</Text>
                    {items.length > 0 && (
                      <Pressable
                        onPress={handleToggleAddForm}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <MaterialCommunityIcons
                          name="close"
                          size={20}
                          color={colors.text.tertiary}
                        />
                      </Pressable>
                    )}
                  </View>
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

                    {/* Price estimate hint (only show when no variants available) */}
                    {priceEstimate && priceEstimate.cheapest && (!itemVariants || itemVariants.length === 0) && (
                      <Text style={styles.priceHint}>
                        {priceEstimate.cheapest.confidence != null && priceEstimate.cheapest.confidence < 0.1
                          ? `~£${priceEstimate.cheapest.price.toFixed(2)} est.`
                          : `Based on £${priceEstimate.cheapest.price.toFixed(2)} at ${priceEstimate.cheapest.storeName}`
                        }
                      </Text>
                    )}

                    {/* Variant picker chips */}
                    {itemVariants && itemVariants.length > 0 && (
                      <View style={styles.variantPickerContainer}>
                        <Text style={styles.variantPickerLabel}>Choose a size:</Text>
                        <ScrollView
                          horizontal
                          showsHorizontalScrollIndicator={false}
                          contentContainerStyle={styles.variantChipsList}
                        >
                          {itemVariants.map((variant) => {
                            const isSelected = selectedVariantName === variant.variantName;
                            const label = variant.price != null
                              ? getPriceLabel(variant.price, variant.priceSource, variant.reportCount, variant.storeName)
                              : null;

                            return (
                              <Pressable
                                key={variant._id}
                                style={[styles.variantChip, isSelected && styles.variantChipSelected]}
                                onPress={() => {
                                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                  setSelectedVariantName(variant.variantName);
                                  setNewItemName(variant.variantName);
                                  if (variant.price != null) {
                                    setNewItemPrice(variant.price.toFixed(2));
                                  }
                                  // Persist preferred variant on pantry item (fire-and-forget)
                                  setPreferredVariant({
                                    itemName: variant.baseItem,
                                    preferredVariant: variant.variantName,
                                  }).catch(console.error);
                                }}
                              >
                                <Text style={[styles.variantChipName, isSelected && styles.variantChipNameSelected]} numberOfLines={1}>
                                  {variant.variantName}
                                </Text>
                                {variant.price != null && label && (
                                  <Text style={[styles.variantChipPrice, isSelected && styles.variantChipPriceSelected]}>
                                    {label.prefix}£{variant.price.toFixed(2)}{label.suffix ? ` ${label.suffix}` : ""}
                                  </Text>
                                )}
                                {variant.priceSource === "personal" && (
                                  <Text style={styles.variantChipBadge}>Your usual</Text>
                                )}
                              </Pressable>
                            );
                          })}
                          {/* "Other / not sure" option */}
                          <Pressable
                            style={[styles.variantChip, styles.variantChipOther]}
                            onPress={() => {
                              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                              setSelectedVariantName(null);
                              // Use base-item average price if available
                              if (priceEstimate?.average) {
                                setNewItemPrice(priceEstimate.average.toFixed(2));
                              }
                            }}
                          >
                            <Text style={styles.variantChipName}>Not sure</Text>
                          </Pressable>
                        </ScrollView>
                      </View>
                    )}

                    {/* Loading indicator for AI price estimation */}
                    {isEstimatingPrice && (
                      <View style={styles.estimatingContainer}>
                        <ActivityIndicator size="small" color={colors.accent.primary} />
                        <Text style={styles.estimatingText}>Getting price estimate...</Text>
                      </View>
                    )}
                  </View>

                  {/* Inline Suggestions — only visible when add form is open */}
                  {items.length > 0 && addFormVisible && (
                    <View style={styles.inlineSuggestionsContainer}>
                      <View style={styles.suggestionsHeader}>
                        <View style={styles.suggestionsHeaderLeft}>
                          <MaterialCommunityIcons
                            name="lightbulb-on-outline"
                            size={16}
                            color={colors.accent.secondary}
                          />
                          <Text style={styles.suggestionsTitle}>Suggestions</Text>
                          <Text style={styles.suggestionsSubtitle}>Based on your shopping history</Text>
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
                                size={16}
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
                              size={18}
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
                    </View>
                  )}
                </GlassCard>
              )}
            </>
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
              <Text style={styles.emptyTitle}>Your list is ready</Text>
              <Text style={styles.emptySubtitle}>Add items above or pull from your stock</Text>
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
                        onEdit={() => handleEditItem(item)}
                        onPriorityChange={(priority) => handlePriorityChange(item._id, priority)}
                        isShopping={list.status === "shopping"}
                        isOwner={isOwner}
                        canApprove={canApprove}
                        commentCount={commentCounts?.[item._id as string] ?? 0}
                        onApprove={() => handleApproveItem(item._id)}
                        onReject={() => handleRejectItem(item._id)}
                        onOpenComments={hasPartners ? () => openCommentThread(item._id, item.name) : undefined}
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
      <GlassModal
        visible={showEditBudgetModal}
        onClose={handleCloseEditBudget}
        overlayOpacity={0.75}
        maxWidth={360}
        avoidKeyboard
      >
        <View style={styles.editBudgetHeader}>
          <MaterialCommunityIcons
            name="wallet-outline"
            size={24}
            color={colors.accent.primary}
          />
          <Text style={styles.editBudgetTitle}>
            {budget > 0 ? "Edit Budget" : "Set Budget"}
          </Text>
        </View>

        <View style={styles.editBudgetInputGroup}>
          <Text style={styles.editBudgetInputLabel}>Budget Amount</Text>
          <View style={styles.editBudgetInputContainer}>
            <Text style={styles.editBudgetCurrency}>£</Text>
            <TextInput
              style={styles.editBudgetInput}
              value={editBudgetValue}
              onChangeText={setEditBudgetValue}
              keyboardType="decimal-pad"
              placeholder="50.00"
              placeholderTextColor={colors.text.tertiary}
              autoFocus
            />
          </View>
        </View>

        <View style={styles.editBudgetActions}>
          <GlassButton
            variant="secondary"
            onPress={handleCloseEditBudget}
            style={styles.editBudgetBtn}
          >
            Cancel
          </GlassButton>
          <GlassButton
            variant="primary"
            onPress={handleSaveBudget}
            loading={isSavingBudget}
            disabled={isSavingBudget}
            style={styles.editBudgetBtn}
          >
            {budget > 0 ? "Update" : "Set Budget"}
          </GlassButton>
        </View>
      </GlassModal>

      {/* Mid-Shop Add Flow Modal */}
      <GlassModal
        visible={showMidShopModal}
        onClose={closeMidShopModal}
        animationType="slide"
        maxWidth={400}
        overlayOpacity={0.75}
      >
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
          {/* Option 1: Add to List */}
          <Pressable
            style={[
              styles.midShopOptionCard,
              isAddingMidShop && styles.midShopOptionDisabled,
            ]}
            onPress={() => handleMidShopAdd("add")}
            disabled={isAddingMidShop}
          >
            <View style={[styles.midShopOptionIcon, { backgroundColor: `${colors.accent.primary}15` }]}>
              <MaterialCommunityIcons
                name="cart-plus"
                size={24}
                color={colors.accent.primary}
              />
            </View>
            <View style={styles.midShopOptionText}>
              <Text style={styles.midShopOptionTitle}>Add to List</Text>
              <Text style={styles.midShopOptionDesc}>
                Add item to your shopping list
              </Text>
            </View>
            <MaterialCommunityIcons
              name="chevron-right"
              size={24}
              color={colors.text.tertiary}
            />
          </Pressable>

          {/* Option 2: Save for Next Trip */}
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
              <Text style={styles.midShopOptionTitle}>Save for Next Trip</Text>
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
      </GlassModal>

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

      {/* List Chat Thread (Partner Mode) */}
      <ListChatThread
        visible={showListChat}
        listId={id}
        listName={list.name}
        onClose={() => setShowListChat(false)}
      />

      {/* Actual Price Modal (Story 3.8) */}
      <GlassModal
        visible={showActualPriceModal}
        onClose={closeActualPriceModal}
        overlayOpacity={0.75}
        maxWidth={360}
        avoidKeyboard
      >
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
      </GlassModal>

      {/* Edit Item Modal */}
      <GlassModal
        visible={editingItem !== null}
        onClose={handleCloseEditModal}
        maxWidth={340}
        avoidKeyboard
      >
        <View style={styles.editModalHeader}>
          <MaterialCommunityIcons name="pencil" size={28} color={colors.accent.primary} />
          <Text style={styles.editModalTitle}>Edit Item</Text>
        </View>

        <View style={styles.editInputGroup}>
          <Text style={styles.editInputLabel}>Name</Text>
          <View style={styles.editInputContainer}>
            <TextInput
              style={styles.editTextInput}
              value={editName}
              onChangeText={setEditName}
              placeholder="Item name"
              placeholderTextColor={colors.text.tertiary}
              autoFocus
            />
          </View>
        </View>

        <View style={styles.editInputRow}>
          <View style={[styles.editInputGroup, { flex: 1 }]}>
            <Text style={styles.editInputLabel}>Quantity</Text>
            <View style={styles.editInputContainer}>
              <TextInput
                style={styles.editTextInput}
                value={editQuantity}
                onChangeText={setEditQuantity}
                placeholder="1"
                placeholderTextColor={colors.text.tertiary}
                keyboardType="number-pad"
              />
            </View>
          </View>

          <View style={[styles.editInputGroup, { flex: 1 }]}>
            <Text style={styles.editInputLabel}>Price (£)</Text>
            <View style={styles.editInputContainer}>
              <TextInput
                style={styles.editTextInput}
                value={editPrice}
                onChangeText={setEditPrice}
                placeholder="0.00"
                placeholderTextColor={colors.text.tertiary}
                keyboardType="decimal-pad"
              />
            </View>
          </View>
        </View>

        <View style={styles.editModalActions}>
          <GlassButton variant="ghost" size="md" onPress={handleCloseEditModal} style={{ flex: 1 }}>
            Cancel
          </GlassButton>
          <GlassButton
            variant="primary"
            size="md"
            icon="check"
            onPress={handleSaveEdit}
            style={{ flex: 1 }}
            disabled={!editName.trim()}
          >
            Save
          </GlassButton>
        </View>
      </GlassModal>

      {/* List Picker Modal */}
      <GlassModal
        visible={addToListItem !== null}
        onClose={() => setAddToListItem(null)}
        maxWidth={340}
        contentStyle={styles.listPickerModal}
      >
        <MaterialCommunityIcons name="playlist-plus" size={36} color={colors.accent.primary} />
        <Text style={styles.listPickerTitle}>Add to List</Text>
        <Text style={styles.listPickerSubtitle}>
          Choose a list for "{addToListItem?.name}"
        </Text>
        <View style={styles.listPickerOptions}>
          {(allActiveLists ?? [])
            .filter((l) => l._id !== id && (l.status === "active" || l.status === "shopping"))
            .map((otherList) => (
              <Pressable
                key={otherList._id}
                style={styles.listPickerOption}
                onPress={() =>
                  pickListForItem(
                    otherList._id,
                    otherList.name,
                    addToListItem?.name ?? "",
                    addToListItem?.estimatedPrice,
                    addToListItem?.quantity ?? 1
                  )
                }
              >
                <MaterialCommunityIcons
                  name="clipboard-list-outline"
                  size={20}
                  color={colors.text.secondary}
                />
                <Text style={styles.listPickerOptionName} numberOfLines={1}>
                  {otherList.name}
                </Text>
                <Text style={styles.listPickerOptionMeta}>
                  {otherList.status === "shopping" ? "Shopping" : "Active"}
                </Text>
                <MaterialCommunityIcons
                  name="chevron-right"
                  size={18}
                  color={colors.text.tertiary}
                />
              </Pressable>
            ))}
        </View>
        <View style={styles.listPickerActions}>
          <GlassButton variant="ghost" size="md" onPress={() => setAddToListItem(null)}>
            Cancel
          </GlassButton>
        </View>
      </GlassModal>

      {/* Surprise delight toast */}
      <GlassToast
        message={toast.message}
        icon={toast.icon}
        iconColor={toast.iconColor}
        visible={toast.visible}
        onDismiss={dismiss}
      />
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
  onEdit: () => void;
  onPriorityChange: (priority: "must-have" | "should-have" | "nice-to-have") => void;
  isShopping: boolean;
  onAddToList?: () => void;
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
  onEdit,
  onPriorityChange,
  isShopping,
  onAddToList,
  isOwner,
  canApprove,
  commentCount,
  onApprove,
  onReject,
  onOpenComments,
}: ShoppingListItemProps) {
  const translateX = useSharedValue(0);
  const scale = useSharedValue(1);
  const checkFlash = useSharedValue(0);
  const prevCheckedRef = useRef(item.isChecked);

  // Celebration flash when item gets checked
  useEffect(() => {
    if (item.isChecked && !prevCheckedRef.current) {
      checkFlash.value = 1;
      checkFlash.value = withTiming(0, { duration: 600 });
    }
    prevCheckedRef.current = item.isChecked;
  }, [item.isChecked]);

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

  const checkFlashStyle = useAnimatedStyle(() => ({
    borderColor: checkFlash.value > 0
      ? `rgba(16, 185, 129, ${checkFlash.value * 0.6})`
      : "transparent",
    borderWidth: checkFlash.value > 0 ? 1.5 : 0,
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
            <Animated.View style={[{ borderRadius: 16 }, checkFlashStyle]}>
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

                {/* Add to another list button */}
                {onAddToList && !isShopping && (
                  <AddToListButton onPress={onAddToList} size="md" />
                )}

                {/* Edit button */}
                {!item.isChecked && (
                  <Pressable
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      onEdit();
                    }}
                    style={styles.editButton}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <MaterialCommunityIcons
                      name="pencil-outline"
                      size={18}
                      color={colors.text.tertiary}
                    />
                  </Pressable>
                )}

                {/* Remove button */}
                <RemoveButton onPress={onRemove} size="md" />
              </View>
            </GlassCard>
            </Animated.View>
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

  // Action Buttons
  actionButtons: {
    flexDirection: "row",
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  actionButton: {
    flex: 1,
  },
  editButton: {
    padding: spacing.xs,
    borderRadius: 8,
    backgroundColor: `${colors.text.tertiary}15`,
  },
  fullWidthButton: {
    flex: 1,
  },

  // Add Item Card
  addItemCollapsedButton: {
    marginBottom: spacing.lg,
  },
  addItemCard: {
    marginBottom: spacing.lg,
  },
  addItemHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  addItemTitle: {
    ...typography.labelLarge,
    color: colors.text.primary,
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
  variantPickerContainer: {
    marginTop: spacing.sm,
  },
  variantPickerLabel: {
    ...typography.labelSmall,
    color: colors.text.secondary,
    marginBottom: spacing.xs,
  },
  variantChipsList: {
    gap: spacing.sm,
    paddingVertical: 2,
  },
  variantChip: {
    backgroundColor: colors.glass.background,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.glass.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    alignItems: "center",
    minWidth: 90,
  },
  variantChipName: {
    ...typography.labelSmall,
    color: colors.text.primary,
    fontWeight: "600",
    marginBottom: 2,
  },
  variantChipPrice: {
    ...typography.labelSmall,
    color: colors.accent.primary,
    fontWeight: "700",
  },
  variantChipStore: {
    ...typography.labelSmall,
    color: colors.text.tertiary,
    fontSize: 9,
    marginTop: 1,
  },
  variantChipSelected: {
    borderColor: colors.accent.primary,
    backgroundColor: "rgba(0, 212, 170, 0.15)",
  },
  variantChipNameSelected: {
    color: colors.accent.primary,
  },
  variantChipPriceSelected: {
    color: colors.accent.primary,
  },
  variantChipBadge: {
    ...typography.labelSmall,
    fontSize: 9,
    color: colors.accent.secondary,
    marginTop: 2,
    fontWeight: "600",
  },
  variantChipOther: {
    borderStyle: "dashed" as any,
    opacity: 0.7,
  },
  estimatingContainer: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  estimatingText: {
    ...typography.labelSmall,
    color: colors.text.tertiary,
    fontStyle: "italic" as const,
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

  // Modal Styles
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
    backgroundColor: "rgba(13, 21, 40, 0.8)",
    justifyContent: "center",
    alignItems: "center",
    borderRadius: borderRadius.xl,
  },

  // Actual Price Modal Styles (Story 3.8)
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
  inlineSuggestionsContainer: {
    marginTop: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.glass.border,
  },
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
  suggestionsSubtitle: {
    ...typography.labelSmall,
    color: colors.text.tertiary,
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

  chatCountBadge: {
    position: "absolute" as const,
    top: -2,
    right: -4,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.accent.primary,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    paddingHorizontal: 3,
  },
  chatCountText: {
    fontSize: 9,
    color: colors.text.primary,
    fontWeight: "800" as const,
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

  // Edit budget modal styles
  editBudgetHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: spacing.xl,
  },
  editBudgetTitle: {
    ...typography.headlineMedium,
    color: colors.text.primary,
  },
  editBudgetInputGroup: {
    marginBottom: spacing.lg,
  },
  editBudgetInputLabel: {
    ...typography.labelMedium,
    color: colors.text.secondary,
    marginBottom: spacing.sm,
  },
  editBudgetInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.glass.background,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.glass.border,
    paddingHorizontal: spacing.md,
  },
  editBudgetCurrency: {
    ...typography.headlineLarge,
    color: colors.accent.primary,
    marginRight: spacing.xs,
  },
  editBudgetInput: {
    flex: 1,
    ...typography.headlineLarge,
    color: colors.text.primary,
    paddingVertical: spacing.md,
  },
  editBudgetActions: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  editBudgetBtn: {
    flex: 1,
  },

  // List picker modal
  // Edit Item Modal
  editModalHeader: {
    alignItems: "center",
    marginBottom: spacing.md,
  },
  editModalTitle: {
    ...typography.headlineMedium,
    color: colors.text.primary,
    marginTop: spacing.sm,
  },
  editInputGroup: {
    marginBottom: spacing.md,
  },
  editInputRow: {
    flexDirection: "row",
    gap: spacing.md,
  },
  editInputLabel: {
    ...typography.labelMedium,
    color: colors.text.secondary,
    marginBottom: spacing.xs,
  },
  editInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.glass.background,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.glass.border,
    paddingHorizontal: spacing.md,
    height: 48,
  },
  editTextInput: {
    flex: 1,
    ...typography.bodyMedium,
    color: colors.text.primary,
  },
  editModalActions: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  listPickerModal: {
    alignItems: "center",
  },
  listPickerTitle: {
    ...typography.headlineMedium,
    color: colors.text.primary,
    textAlign: "center",
    marginBottom: spacing.xs,
  },
  listPickerSubtitle: {
    ...typography.bodyMedium,
    color: colors.text.secondary,
    textAlign: "center",
    marginBottom: spacing.xl,
  },
  listPickerOptions: {
    width: "100%",
    gap: spacing.md,
  },
  listPickerOption: {
    flexDirection: "row",
    alignItems: "center",
    padding: spacing.md,
    backgroundColor: colors.glass.background,
    borderRadius: borderRadius.md,
    borderWidth: 2,
    borderColor: "transparent",
    gap: spacing.md,
  },
  listPickerOptionName: {
    ...typography.bodyLarge,
    color: colors.text.primary,
    flex: 1,
  },
  listPickerOptionMeta: {
    ...typography.bodySmall,
    color: colors.text.tertiary,
  },
  listPickerActions: {
    flexDirection: "row",
    gap: spacing.md,
    marginTop: spacing.xl,
  },
});
