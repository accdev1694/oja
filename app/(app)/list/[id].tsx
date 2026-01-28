import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Alert, TextInput } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useState } from "react";
import type { Id } from "@/convex/_generated/dataModel";

export default function ListDetailScreen() {
  const { id } = useLocalSearchParams<{ id: Id<"shoppingLists"> }>();
  const router = useRouter();

  const list = useQuery(api.shoppingLists.getById, { id });
  const items = useQuery(api.listItems.getByList, { listId: id });
  const toggleChecked = useMutation(api.listItems.toggleChecked);
  const addItem = useMutation(api.listItems.create);
  const removeItem = useMutation(api.listItems.remove);
  const startShopping = useMutation(api.shoppingLists.startShopping);
  const completeShopping = useMutation(api.shoppingLists.completeShopping);
  const addFromPantryOut = useMutation(api.listItems.addFromPantryOut);

  const [isAddingItem, setIsAddingItem] = useState(false);
  const [newItemName, setNewItemName] = useState("");
  const [newItemQuantity, setNewItemQuantity] = useState("1");
  const [newItemPrice, setNewItemPrice] = useState("");

  if (list === undefined || items === undefined) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF6B35" />
        <Text style={styles.loadingText}>Loading list...</Text>
      </View>
    );
  }

  if (!list) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>List not found</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
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

  const checkedCount = items.filter(item => item.isChecked).length;
  const totalCount = items.length;

  // Budget status
  const budget = list.budget || 0;
  const currentTotal = list.status === "shopping" ? actualTotal : estimatedTotal;
  const budgetPercentage = budget > 0 ? (currentTotal / budget) * 100 : 0;
  const isOverBudget = currentTotal > budget;
  const isNearBudget = budgetPercentage > 80 && budgetPercentage <= 100;

  async function handleToggleItem(itemId: Id<"listItems">) {
    try {
      await toggleChecked({ id: itemId });
    } catch (error) {
      console.error("Failed to toggle item:", error);
      Alert.alert("Error", "Failed to update item");
    }
  }

  async function handleAddItem() {
    if (!newItemName.trim()) {
      Alert.alert("Error", "Please enter an item name");
      return;
    }

    setIsAddingItem(true);
    try {
      await addItem({
        listId: id,
        name: newItemName.trim(),
        quantity: parseInt(newItemQuantity) || 1,
        estimatedPrice: newItemPrice ? parseFloat(newItemPrice) : undefined,
      });

      setNewItemName("");
      setNewItemQuantity("1");
      setNewItemPrice("");
    } catch (error) {
      console.error("Failed to add item:", error);
      Alert.alert("Error", "Failed to add item");
    } finally {
      setIsAddingItem(false);
    }
  }

  async function handleRemoveItem(itemId: Id<"listItems">, itemName: string) {
    Alert.alert(
      "Remove Item",
      `Remove "${itemName}" from list?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: async () => {
            try {
              await removeItem({ id: itemId });
            } catch (error) {
              console.error("Failed to remove item:", error);
              Alert.alert("Error", "Failed to remove item");
            }
          },
        },
      ]
    );
  }

  async function handleStartShopping() {
    try {
      await startShopping({ id });
      Alert.alert("Shopping Started", "Good luck with your shopping!");
    } catch (error) {
      console.error("Failed to start shopping:", error);
      Alert.alert("Error", "Failed to start shopping");
    }
  }

  async function handleCompleteShopping() {
    Alert.alert(
      "Complete Shopping",
      "Mark this shopping trip as complete?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Complete",
          onPress: async () => {
            try {
              await completeShopping({ id });
              Alert.alert("Shopping Complete", "Shopping trip completed!");
              router.back();
            } catch (error) {
              console.error("Failed to complete shopping:", error);
              Alert.alert("Error", "Failed to complete shopping");
            }
          },
        },
      ]
    );
  }

  async function handleAddFromPantry() {
    try {
      const result = await addFromPantryOut({ listId: id });
      if (result.count > 0) {
        Alert.alert("Items Added", `Added ${result.count} items from pantry`);
      } else {
        Alert.alert("No Items", "No 'out of stock' items found in pantry");
      }
    } catch (error) {
      console.error("Failed to add from pantry:", error);
      Alert.alert("Error", "Failed to add items from pantry");
    }
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backIconButton}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <View style={styles.headerTextContainer}>
          <Text style={styles.title}>{list.name}</Text>
          <Text style={styles.subtitle}>
            {checkedCount}/{totalCount} items • {list.status}
          </Text>
        </View>
      </View>

      {/* Budget Display */}
      {budget > 0 && (
        <View style={styles.budgetContainer}>
          <View style={styles.budgetHeader}>
            <Text style={styles.budgetLabel}>Budget</Text>
            <Text style={[
              styles.budgetAmount,
              isOverBudget && styles.budgetAmountOver,
              isNearBudget && styles.budgetAmountNear,
            ]}>
              £{currentTotal.toFixed(2)} / £{budget.toFixed(2)}
            </Text>
          </View>
          <View style={styles.budgetBar}>
            <View
              style={[
                styles.budgetBarFill,
                { width: `${Math.min(budgetPercentage, 100)}%` },
                isOverBudget && styles.budgetBarFillOver,
                isNearBudget && styles.budgetBarFillNear,
              ]}
            />
          </View>
          {isOverBudget && (
            <Text style={styles.budgetWarning}>
              Over budget by £{(currentTotal - budget).toFixed(2)}
            </Text>
          )}
        </View>
      )}

      {/* Action Buttons */}
      <View style={styles.actionButtons}>
        {list.status === "active" && (
          <>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={handleAddFromPantry}
            >
              <Text style={styles.actionButtonText}>+ From Pantry</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, styles.actionButtonPrimary]}
              onPress={handleStartShopping}
            >
              <Text style={[styles.actionButtonText, styles.actionButtonTextPrimary]}>
                Start Shopping
              </Text>
            </TouchableOpacity>
          </>
        )}
        {list.status === "shopping" && (
          <TouchableOpacity
            style={[styles.actionButton, styles.actionButtonSuccess]}
            onPress={handleCompleteShopping}
          >
            <Text style={[styles.actionButtonText, styles.actionButtonTextPrimary]}>
              Complete Shopping
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Add Item Form */}
      <View style={styles.addItemForm}>
        <TextInput
          style={styles.addItemInput}
          placeholder="Item name"
          value={newItemName}
          onChangeText={setNewItemName}
          editable={!isAddingItem}
        />
        <TextInput
          style={styles.addItemInputSmall}
          placeholder="Qty"
          value={newItemQuantity}
          onChangeText={setNewItemQuantity}
          keyboardType="numeric"
          editable={!isAddingItem}
        />
        <TextInput
          style={styles.addItemInputSmall}
          placeholder="£"
          value={newItemPrice}
          onChangeText={setNewItemPrice}
          keyboardType="decimal-pad"
          editable={!isAddingItem}
        />
        <TouchableOpacity
          style={[styles.addItemButton, isAddingItem && styles.addItemButtonDisabled]}
          onPress={handleAddItem}
          disabled={isAddingItem}
        >
          {isAddingItem ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.addItemButtonText}>+</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Items List */}
      {items.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyEmoji}>🛒</Text>
          <Text style={styles.emptyTitle}>No Items Yet</Text>
          <Text style={styles.emptySubtitle}>
            Add items to your shopping list
          </Text>
        </View>
      ) : (
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          {items.map((item) => (
            <View key={item._id} style={styles.itemCard}>
              <TouchableOpacity
                style={styles.checkbox}
                onPress={() => handleToggleItem(item._id)}
              >
                <View style={[
                  styles.checkboxInner,
                  item.isChecked && styles.checkboxInnerChecked,
                ]}>
                  {item.isChecked && <Text style={styles.checkmark}>✓</Text>}
                </View>
              </TouchableOpacity>

              <View style={styles.itemContent}>
                <Text style={[
                  styles.itemName,
                  item.isChecked && styles.itemNameChecked,
                ]}>
                  {item.name}
                </Text>
                <View style={styles.itemDetails}>
                  <Text style={styles.itemQuantity}>Qty: {item.quantity}</Text>
                  {item.estimatedPrice && (
                    <Text style={styles.itemPrice}>
                      Est. £{(item.estimatedPrice * item.quantity).toFixed(2)}
                    </Text>
                  )}
                  {item.actualPrice && (
                    <Text style={styles.itemPriceActual}>
                      Actual: £{(item.actualPrice * item.quantity).toFixed(2)}
                    </Text>
                  )}
                </View>
                {item.autoAdded && (
                  <Text style={styles.autoAddedBadge}>Auto-added</Text>
                )}
              </View>

              <TouchableOpacity
                style={styles.removeButton}
                onPress={() => handleRemoveItem(item._id, item.name)}
              >
                <Text style={styles.removeButtonText}>×</Text>
              </TouchableOpacity>
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFAF8",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FFFAF8",
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: "#636E72",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FFFAF8",
    padding: 24,
  },
  errorText: {
    fontSize: 18,
    color: "#EF4444",
    marginBottom: 16,
  },
  backButton: {
    backgroundColor: "#FF6B35",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  backButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 16,
  },
  backIconButton: {
    marginRight: 12,
  },
  backIcon: {
    fontSize: 28,
    color: "#2D3436",
  },
  headerTextContainer: {
    flex: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#2D3436",
  },
  subtitle: {
    fontSize: 14,
    color: "#636E72",
    marginTop: 2,
  },
  budgetContainer: {
    backgroundColor: "#fff",
    marginHorizontal: 24,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginBottom: 16,
  },
  budgetHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  budgetLabel: {
    fontSize: 14,
    color: "#636E72",
    fontWeight: "600",
  },
  budgetAmount: {
    fontSize: 18,
    fontWeight: "700",
    color: "#10B981",
  },
  budgetAmountNear: {
    color: "#F59E0B",
  },
  budgetAmountOver: {
    color: "#EF4444",
  },
  budgetBar: {
    height: 8,
    backgroundColor: "#E5E7EB",
    borderRadius: 4,
    overflow: "hidden",
  },
  budgetBarFill: {
    height: "100%",
    backgroundColor: "#10B981",
    borderRadius: 4,
  },
  budgetBarFillNear: {
    backgroundColor: "#F59E0B",
  },
  budgetBarFillOver: {
    backgroundColor: "#EF4444",
  },
  budgetWarning: {
    marginTop: 8,
    fontSize: 14,
    color: "#EF4444",
    fontWeight: "600",
  },
  actionButtons: {
    flexDirection: "row",
    paddingHorizontal: 24,
    gap: 12,
    marginBottom: 16,
  },
  actionButton: {
    flex: 1,
    backgroundColor: "#fff",
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    alignItems: "center",
  },
  actionButtonPrimary: {
    backgroundColor: "#FF6B35",
    borderColor: "#FF6B35",
  },
  actionButtonSuccess: {
    backgroundColor: "#10B981",
    borderColor: "#10B981",
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#2D3436",
  },
  actionButtonTextPrimary: {
    color: "#fff",
  },
  addItemForm: {
    flexDirection: "row",
    paddingHorizontal: 24,
    gap: 8,
    marginBottom: 16,
  },
  addItemInput: {
    flex: 2,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  addItemInputSmall: {
    flex: 0.8,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  addItemButton: {
    backgroundColor: "#FF6B35",
    width: 44,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  addItemButtonDisabled: {
    opacity: 0.6,
  },
  addItemButtonText: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "600",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  emptyEmoji: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#2D3436",
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    color: "#636E72",
    textAlign: "center",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
  },
  itemCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  checkbox: {
    marginRight: 12,
  },
  checkboxInner: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: "#E5E7EB",
    justifyContent: "center",
    alignItems: "center",
  },
  checkboxInnerChecked: {
    backgroundColor: "#10B981",
    borderColor: "#10B981",
  },
  checkmark: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  itemContent: {
    flex: 1,
  },
  itemName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#2D3436",
    marginBottom: 4,
  },
  itemNameChecked: {
    textDecorationLine: "line-through",
    color: "#636E72",
  },
  itemDetails: {
    flexDirection: "row",
    gap: 12,
    flexWrap: "wrap",
  },
  itemQuantity: {
    fontSize: 14,
    color: "#636E72",
  },
  itemPrice: {
    fontSize: 14,
    color: "#636E72",
  },
  itemPriceActual: {
    fontSize: 14,
    color: "#10B981",
    fontWeight: "600",
  },
  autoAddedBadge: {
    fontSize: 12,
    color: "#3B82F6",
    marginTop: 4,
  },
  removeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#FEE2E2",
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 8,
  },
  removeButtonText: {
    fontSize: 24,
    color: "#EF4444",
    fontWeight: "600",
  },
});
