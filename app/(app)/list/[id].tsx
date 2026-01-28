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
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useState } from "react";
import type { Id } from "@/convex/_generated/dataModel";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { getIconForItem } from "@/lib/icons/iconMatcher";
import * as Haptics from "expo-haptics";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";

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
};

export default function ListDetailScreen() {
  const { id } = useLocalSearchParams<{ id: Id<"shoppingLists"> }>();
  const router = useRouter();

  const list = useQuery(api.shoppingLists.getById, { id });
  const items = useQuery(api.listItems.getByList, { listId: id });
  const toggleChecked = useMutation(api.listItems.toggleChecked);
  const addItem = useMutation(api.listItems.create);
  const updateItem = useMutation(api.listItems.update);
  const removeItem = useMutation(api.listItems.remove);
  const startShopping = useMutation(api.shoppingLists.startShopping);
  const completeShopping = useMutation(api.shoppingLists.completeShopping);
  const addFromPantryOut = useMutation(api.listItems.addFromPantryOut);

  const [isAddingItem, setIsAddingItem] = useState(false);
  const [newItemName, setNewItemName] = useState("");
  const [newItemQuantity, setNewItemQuantity] = useState("1");
  const [newItemPrice, setNewItemPrice] = useState("");

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
          <GlassButton variant="primary" onPress={() => router.back()}>
            Go Back
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

  async function handleToggleItem(itemId: Id<"listItems">) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      await toggleChecked({ id: itemId });
    } catch (error) {
      console.error("Failed to toggle item:", error);
      Alert.alert("Error", "Failed to update item");
    }
  }

  function findSimilarItem(name: string): ListItem | undefined {
    if (!items) return undefined;
    return items.find((item) => areItemsSimilar(item.name, name)) as ListItem | undefined;
  }

  async function addAsNewItem() {
    try {
      await addItem({
        listId: id,
        name: newItemName.trim(),
        quantity: parseInt(newItemQuantity) || 1,
        estimatedPrice: newItemPrice ? parseFloat(newItemPrice) : undefined,
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
              await addAsNewItem();
              setIsAddingItem(false);
            },
          },
        ]
      );
      return;
    }

    setIsAddingItem(true);
    await addAsNewItem();
    setIsAddingItem(false);
  }

  async function handleRemoveItem(itemId: Id<"listItems">, itemName: string) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert("Remove Item", `Remove "${itemName}" from list?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: async () => {
          try {
            await removeItem({ id: itemId });
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          } catch (error) {
            console.error("Failed to remove item:", error);
            Alert.alert("Error", "Failed to remove item");
          }
        },
      },
    ]);
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

  async function handleAddFromPantry() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      const result = await addFromPantryOut({ listId: id });
      if (result.count > 0) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert("Items Added", `Added ${result.count} items from pantry`);
      } else {
        Alert.alert("No Items", "No 'out of stock' items found in pantry");
      }
    } catch (error) {
      console.error("Failed to add from pantry:", error);
      Alert.alert("Error", "Failed to add items from pantry");
    }
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
          actions={[
            {
              icon: status.icon as keyof typeof MaterialCommunityIcons.glyphMap,
              onPress: () => {},
              color: status.color,
            },
          ]}
        />

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Budget Card */}
          {budget > 0 && (
            <GlassCard variant="bordered" accentColor={colors.accent.primary} style={styles.budgetCard}>
              <View style={styles.budgetHeader}>
                <View style={styles.budgetLabelRow}>
                  <MaterialCommunityIcons
                    name="wallet-outline"
                    size={20}
                    color={colors.accent.primary}
                  />
                  <Text style={styles.budgetLabel}>Budget Tracker</Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: `${status.color}20` }]}>
                  <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
                </View>
              </View>

              <BudgetProgressBar
                spent={currentTotal}
                budget={budget}
                showAmounts
                size="lg"
              />

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
                  icon="fridge-outline"
                  onPress={handleAddFromPantry}
                  style={styles.actionButton}
                >
                  From Pantry
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

          {/* Add Item Form */}
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
            </View>
          </GlassCard>

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
              {items.map((item) => (
                <ShoppingListItem
                  key={item._id}
                  item={item}
                  onToggle={() => handleToggleItem(item._id)}
                  onRemove={() => handleRemoveItem(item._id, item.name)}
                  isShopping={list.status === "shopping"}
                />
              ))}
            </View>
          )}

          {/* Bottom spacing */}
          <View style={styles.bottomSpacer} />
        </ScrollView>
      </KeyboardAvoidingView>
    </GlassScreen>
  );
}

// =============================================================================
// SHOPPING LIST ITEM COMPONENT
// =============================================================================

interface ShoppingListItemProps {
  item: ListItem;
  onToggle: () => void;
  onRemove: () => void;
  isShopping: boolean;
}

function ShoppingListItem({ item, onToggle, onRemove, isShopping }: ShoppingListItemProps) {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.98, animations.spring.stiff);
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, animations.spring.gentle);
  };

  const iconResult = getIconForItem(item.name, item.category || "other");

  return (
    <Animated.View style={animatedStyle}>
      <Pressable onPressIn={handlePressIn} onPressOut={handlePressOut}>
        <GlassCard
          variant="standard"
          style={[styles.itemCard, item.isChecked && styles.itemCardChecked]}
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
              </View>
            </View>

            {/* Remove button */}
            <Pressable
              style={styles.removeButton}
              onPress={onRemove}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <MaterialCommunityIcons
                name="close"
                size={18}
                color={colors.semantic.danger}
              />
            </Pressable>
          </View>
        </GlassCard>
      </Pressable>
    </Animated.View>
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
    height: spacing["2xl"],
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

  // Item Card
  itemCard: {
    marginBottom: spacing.xs,
  },
  itemCardChecked: {
    opacity: 0.7,
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
  removeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: `${colors.semantic.danger}15`,
    justifyContent: "center",
    alignItems: "center",
  },
});
