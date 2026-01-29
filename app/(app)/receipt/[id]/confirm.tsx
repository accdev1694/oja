import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  TextInput,
  Modal,
  TouchableOpacity,
  Animated,
} from "react-native";
import { useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import * as Haptics from "expo-haptics";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Swipeable } from "react-native-gesture-handler";

import {
  GlassScreen,
  GlassCard,
  GlassButton,
  GlassInput,
  SimpleHeader,
  GlassErrorState,
  GlassSkeleton,
  colors,
  typography,
  spacing,
} from "@/components/ui/glass";

interface ReceiptItem {
  name: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  category?: string;
  confidence?: number;
}

export default function ConfirmReceiptScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const receiptId = id as Id<"receipts">;

  const receipt = useQuery(api.receipts.getById, { id: receiptId });
  const pantryItems = useQuery(api.pantryItems.getByUser, {});
  const updateReceipt = useMutation(api.receipts.update);
  const savePriceHistory = useMutation(api.priceHistory.savePriceHistoryFromReceipt);
  const checkPriceAlerts = useMutation(api.priceHistory.checkPriceAlerts);

  // Local state for edited items
  const [editedItems, setEditedItems] = useState<ReceiptItem[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);

  // Edit modals
  const [editingItemIndex, setEditingItemIndex] = useState<number | null>(null);
  const [editingField, setEditingField] = useState<"name" | "price" | null>(null);
  const [editValue, setEditValue] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);

  // New item state
  const [newItemName, setNewItemName] = useState("");
  const [newItemPrice, setNewItemPrice] = useState("");
  const [newItemQuantity, setNewItemQuantity] = useState("1");

  // Initialize edited items from receipt
  if (receipt && !isInitialized) {
    setEditedItems(receipt.items as ReceiptItem[]);
    setIsInitialized(true);
  }

  if (receipt === undefined) {
    return (
      <GlassScreen>
        <SimpleHeader title="Confirm Receipt" subtitle="Loading..." />
        <View style={styles.container}>
          <GlassSkeleton variant="card" />
          <GlassSkeleton variant="card" />
          <GlassSkeleton variant="card" />
        </View>
      </GlassScreen>
    );
  }

  if (receipt === null) {
    return (
      <GlassScreen>
        <SimpleHeader title="Confirm Receipt" subtitle="Error" />
        <View style={styles.container}>
          <GlassErrorState
            title="Receipt Not Found"
            message="This receipt could not be found"
          />
        </View>
      </GlassScreen>
    );
  }

  const lowConfidenceItems = editedItems.filter(
    (item) => item.confidence && item.confidence < 70
  );

  // Calculate totals from edited items
  const subtotal = editedItems.reduce((sum, item) => sum + item.totalPrice, 0);
  const tax = receipt.tax || 0;
  const total = subtotal + tax;

  function openEditNameModal(index: number) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setEditingItemIndex(index);
    setEditingField("name");
    setEditValue(editedItems[index].name);
  }

  function openEditPriceModal(index: number) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setEditingItemIndex(index);
    setEditingField("price");
    setEditValue(editedItems[index].totalPrice.toFixed(2));
  }

  function saveEdit() {
    if (editingItemIndex === null) return;

    const updated = [...editedItems];

    if (editingField === "name") {
      updated[editingItemIndex].name = editValue.trim();
    } else if (editingField === "price") {
      const newPrice = parseFloat(editValue);
      if (!isNaN(newPrice) && newPrice > 0) {
        updated[editingItemIndex].totalPrice = newPrice;
        updated[editingItemIndex].unitPrice = newPrice / updated[editingItemIndex].quantity;
      }
    }

    setEditedItems(updated);
    closeEditModal();
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }

  function closeEditModal() {
    setEditingItemIndex(null);
    setEditingField(null);
    setEditValue("");
  }

  function handleDeleteItem(index: number) {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    const updated = editedItems.filter((_, i) => i !== index);
    setEditedItems(updated);

    Alert.alert("Item removed", "", [{ text: "OK" }]);
  }

  function handleAddMissingItem() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowAddModal(true);
  }

  function saveNewItem() {
    const name = newItemName.trim();
    const price = parseFloat(newItemPrice);
    const quantity = parseInt(newItemQuantity);

    if (!name || isNaN(price) || price <= 0 || isNaN(quantity) || quantity <= 0) {
      Alert.alert("Invalid Input", "Please enter valid name, price, and quantity");
      return;
    }

    const newItem: ReceiptItem = {
      name,
      quantity,
      unitPrice: price / quantity,
      totalPrice: price,
    };

    setEditedItems([...editedItems, newItem]);
    setShowAddModal(false);
    setNewItemName("");
    setNewItemPrice("");
    setNewItemQuantity("1");

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }

  async function handleSaveReceipt() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      // Step 1: Update receipt with edited items
      await updateReceipt({
        id: receiptId,
        items: editedItems,
        subtotal,
        total,
        processingStatus: "completed",
      });

      // Step 2: Save price history
      await savePriceHistory({ receiptId });

      // Step 3: Check for price alerts
      const alerts = await checkPriceAlerts({ receiptId });

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      // If there are price alerts, show them
      if (alerts && alerts.length > 0) {
        const alertMessages = alerts.map((alert: any) => {
          if (alert.type === "decrease") {
            return `🎉 Great deal! ${alert.itemName} is ${alert.percentChange.toFixed(0)}% cheaper than usual`;
          } else {
            return `📈 ${alert.itemName} price went up ${alert.percentChange.toFixed(0)}% since last purchase`;
          }
        });

        Alert.alert(
          "Price Alerts",
          alertMessages.join("\n\n"),
          [
            {
              text: "OK",
              onPress: () => {
                // Navigate to reconciliation if linked to a list, otherwise go to scan
                if (receipt?.listId) {
                  router.push(`/receipt/${receiptId}/reconciliation?listId=${receipt.listId}` as any);
                } else {
                  router.push("/(app)/(tabs)/scan" as any);
                }
              },
            },
          ]
        );
      } else {
        // No alerts - navigate to reconciliation if linked to a list
        if (receipt?.listId) {
          router.push(`/receipt/${receiptId}/reconciliation?listId=${receipt.listId}` as any);
        } else {
          Alert.alert("Receipt Saved", "Your receipt has been saved successfully", [
            {
              text: "OK",
              onPress: () => router.push("/(app)/(tabs)/scan" as any),
            },
          ]);
        }
      }
    } catch (error) {
      console.error("Save error:", error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("Error", "Failed to save receipt");
    }
  }

  // Get pantry suggestions for autocomplete
  const pantrySuggestions =
    pantryItems
      ?.filter((item: any) =>
        editValue && editingField === "name"
          ? item.name.toLowerCase().includes(editValue.toLowerCase())
          : false
      )
      .slice(0, 5)
      .map((item: any) => item.name) || [];

  return (
    <GlassScreen>
      <SimpleHeader
        title="Confirm Receipt"
        subtitle={`${editedItems.length} items • £${total.toFixed(2)}`}
      />

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Store Info */}
        <GlassCard variant="standard" style={styles.section}>
          <View style={styles.sectionHeader}>
            <MaterialCommunityIcons
              name="store"
              size={20}
              color={colors.accent.primary}
            />
            <Text style={styles.sectionTitle}>Store Information</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Store:</Text>
            <Text style={styles.infoValue}>{receipt.storeName}</Text>
          </View>

          {receipt.storeAddress && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Address:</Text>
              <Text style={styles.infoValue}>{receipt.storeAddress}</Text>
            </View>
          )}

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Date:</Text>
            <Text style={styles.infoValue}>
              {new Date(receipt.purchaseDate).toLocaleDateString()}
            </Text>
          </View>
        </GlassCard>

        {/* Low Confidence Warning */}
        {lowConfidenceItems.length > 0 && (
          <GlassCard
            variant="bordered"
            accentColor={colors.semantic.warning}
            style={styles.section}
          >
            <View style={styles.warningHeader}>
              <MaterialCommunityIcons
                name="alert"
                size={20}
                color={colors.semantic.warning}
              />
              <Text style={styles.warningTitle}>Review Needed</Text>
            </View>
            <Text style={styles.warningText}>
              {lowConfidenceItems.length} item{lowConfidenceItems.length > 1 ? "s" : ""} marked
              with ⚠️ need your attention. Tap to edit.
            </Text>
          </GlassCard>
        )}

        {/* Editable Items */}
        <GlassCard variant="standard" style={styles.section}>
          <View style={styles.sectionHeader}>
            <MaterialCommunityIcons
              name="receipt"
              size={20}
              color={colors.accent.primary}
            />
            <Text style={styles.sectionTitle}>Items ({editedItems.length})</Text>
          </View>

          {editedItems.map((item, index) => (
            <EditableItemRow
              key={index}
              item={item}
              index={index}
              onEditName={() => openEditNameModal(index)}
              onEditPrice={() => openEditPriceModal(index)}
              onDelete={() => handleDeleteItem(index)}
            />
          ))}

          {/* Add Missing Item Button */}
          <TouchableOpacity
            style={styles.addButton}
            onPress={handleAddMissingItem}
            activeOpacity={0.7}
          >
            <MaterialCommunityIcons
              name="plus-circle"
              size={20}
              color={colors.accent.primary}
            />
            <Text style={styles.addButtonText}>Add Missing Item</Text>
          </TouchableOpacity>
        </GlassCard>

        {/* Totals */}
        <GlassCard
          variant="bordered"
          accentColor={colors.accent.primary}
          style={styles.section}
        >
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Subtotal:</Text>
            <Text style={styles.totalValue}>£{subtotal.toFixed(2)}</Text>
          </View>

          {tax > 0 && (
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Tax:</Text>
              <Text style={styles.totalValue}>£{tax.toFixed(2)}</Text>
            </View>
          )}

          <View style={[styles.totalRow, styles.grandTotal]}>
            <Text style={styles.grandTotalLabel}>Total:</Text>
            <Text style={styles.grandTotalValue}>£{total.toFixed(2)}</Text>
          </View>
        </GlassCard>

        {/* Save Button */}
        <GlassButton
          variant="primary"
          size="lg"
          icon="content-save"
          onPress={handleSaveReceipt}
        >
          Save Receipt
        </GlassButton>

        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* Edit Modal */}
      <Modal
        visible={editingItemIndex !== null}
        transparent
        animationType="fade"
        onRequestClose={closeEditModal}
      >
        <View style={styles.modalOverlay}>
          <GlassCard variant="bordered" style={styles.modal}>
            <Text style={styles.modalTitle}>
              Edit {editingField === "name" ? "Item Name" : "Price"}
            </Text>

            <GlassInput
              value={editValue}
              onChangeText={setEditValue}
              placeholder={editingField === "name" ? "Item name" : "0.00"}
              keyboardType={editingField === "price" ? "decimal-pad" : "default"}
              autoFocus
              style={styles.modalInput}
            />

            {/* Pantry Suggestions */}
            {editingField === "name" && pantrySuggestions.length > 0 && (
              <View style={styles.suggestions}>
                {pantrySuggestions.map((suggestion: string, idx: number) => (
                  <TouchableOpacity
                    key={idx}
                    style={styles.suggestionChip}
                    onPress={() => setEditValue(suggestion)}
                  >
                    <Text style={styles.suggestionText}>{suggestion}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            <View style={styles.modalActions}>
              <GlassButton
                variant="secondary"
                size="md"
                onPress={closeEditModal}
                style={styles.modalButton}
              >
                Cancel
              </GlassButton>

              <GlassButton
                variant="primary"
                size="md"
                onPress={saveEdit}
                style={styles.modalButton}
              >
                Save
              </GlassButton>
            </View>
          </GlassCard>
        </View>
      </Modal>

      {/* Add Item Modal */}
      <Modal
        visible={showAddModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowAddModal(false)}
      >
        <View style={styles.modalOverlay}>
          <GlassCard variant="bordered" style={styles.modal}>
            <Text style={styles.modalTitle}>Add Missing Item</Text>

            <GlassInput
              value={newItemName}
              onChangeText={setNewItemName}
              placeholder="Item name"
              autoFocus
              style={styles.modalInput}
            />

            <View style={styles.row}>
              <GlassInput
                value={newItemQuantity}
                onChangeText={setNewItemQuantity}
                placeholder="Qty"
                keyboardType="number-pad"
                style={[styles.modalInput, styles.halfWidth]}
              />

              <GlassInput
                value={newItemPrice}
                onChangeText={setNewItemPrice}
                placeholder="Total price"
                keyboardType="decimal-pad"
                style={[styles.modalInput, styles.halfWidth]}
              />
            </View>

            <View style={styles.modalActions}>
              <GlassButton
                variant="secondary"
                size="md"
                onPress={() => setShowAddModal(false)}
                style={styles.modalButton}
              >
                Cancel
              </GlassButton>

              <GlassButton
                variant="primary"
                size="md"
                onPress={saveNewItem}
                style={styles.modalButton}
              >
                Add Item
              </GlassButton>
            </View>
          </GlassCard>
        </View>
      </Modal>
    </GlassScreen>
  );
}

// =============================================================================
// EDITABLE ITEM ROW COMPONENT
// =============================================================================

interface EditableItemRowProps {
  item: ReceiptItem;
  index: number;
  onEditName: () => void;
  onEditPrice: () => void;
  onDelete: () => void;
}

function EditableItemRow({
  item,
  index,
  onEditName,
  onEditPrice,
  onDelete,
}: EditableItemRowProps) {
  const isLowConfidence = item.confidence && item.confidence < 70;

  const renderRightActions = (
    progress: Animated.AnimatedInterpolation<number>,
    dragX: Animated.AnimatedInterpolation<number>
  ) => {
    return (
      <TouchableOpacity
        style={styles.deleteAction}
        onPress={onDelete}
        activeOpacity={0.7}
      >
        <MaterialCommunityIcons name="delete" size={24} color="#FFFFFF" />
      </TouchableOpacity>
    );
  };

  return (
    <Swipeable
      renderRightActions={renderRightActions}
      overshootRight={false}
      friction={2}
    >
      <View style={styles.itemRow}>
        <View style={styles.itemLeft}>
          {isLowConfidence && <Text style={styles.warningIcon}>⚠️</Text>}

          <View style={styles.itemInfo}>
            <TouchableOpacity onPress={onEditName} activeOpacity={0.7}>
              <Text style={styles.itemName}>{item.name}</Text>
            </TouchableOpacity>

            <Text style={styles.itemQuantity}>Qty: {item.quantity}</Text>
          </View>
        </View>

        <TouchableOpacity onPress={onEditPrice} activeOpacity={0.7}>
          <Text style={styles.itemPrice}>£{item.totalPrice.toFixed(2)}</Text>
        </TouchableOpacity>
      </View>
    </Swipeable>
  );
}

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
  },

  // Sections
  section: {
    marginBottom: spacing.md,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    ...typography.labelLarge,
    color: colors.text.primary,
  },

  // Info Rows
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: spacing.xs,
  },
  infoLabel: {
    ...typography.bodyMedium,
    color: colors.text.secondary,
  },
  infoValue: {
    ...typography.bodyMedium,
    color: colors.text.primary,
    fontWeight: "600",
  },

  // Warning
  warningHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  warningTitle: {
    ...typography.labelMedium,
    color: colors.semantic.warning,
    fontWeight: "600",
  },
  warningText: {
    ...typography.bodySmall,
    color: colors.text.secondary,
  },

  // Items
  itemRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.glass.border,
    backgroundColor: colors.glass.background,
  },
  itemLeft: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.xs,
    flex: 1,
  },
  warningIcon: {
    fontSize: 16,
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    ...typography.bodyMedium,
    color: colors.text.primary,
    marginBottom: 2,
  },
  itemQuantity: {
    ...typography.bodySmall,
    color: colors.text.secondary,
  },
  itemPrice: {
    ...typography.bodyMedium,
    color: colors.text.primary,
    fontWeight: "600",
  },

  // Delete action
  deleteAction: {
    backgroundColor: "#EF4444",
    justifyContent: "center",
    alignItems: "center",
    width: 80,
    height: "100%",
  },

  // Add Button
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingVertical: spacing.md,
    justifyContent: "center",
  },
  addButtonText: {
    ...typography.labelMedium,
    color: colors.accent.primary,
    fontWeight: "600",
  },

  // Totals
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: spacing.xs,
  },
  totalLabel: {
    ...typography.bodyMedium,
    color: colors.text.secondary,
  },
  totalValue: {
    ...typography.bodyMedium,
    color: colors.text.primary,
    fontWeight: "600",
  },
  grandTotal: {
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.glass.border,
    marginTop: spacing.xs,
  },
  grandTotalLabel: {
    ...typography.labelLarge,
    color: colors.text.primary,
    fontWeight: "700",
  },
  grandTotalValue: {
    ...typography.labelLarge,
    color: colors.accent.primary,
    fontWeight: "700",
  },

  bottomSpacer: {
    height: 120,
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.lg,
  },
  modal: {
    width: "100%",
    maxWidth: 400,
  },
  modalTitle: {
    ...typography.headlineSmall,
    color: colors.text.primary,
    marginBottom: spacing.md,
  },
  modalInput: {
    marginBottom: spacing.md,
  },
  modalActions: {
    flexDirection: "row",
    gap: spacing.md,
  },
  modalButton: {
    flex: 1,
  },

  // Suggestions
  suggestions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  suggestionChip: {
    backgroundColor: colors.glass.backgroundStrong,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.glass.border,
  },
  suggestionText: {
    ...typography.bodySmall,
    color: colors.text.primary,
  },

  // Row
  row: {
    flexDirection: "row",
    gap: spacing.md,
  },
  halfWidth: {
    flex: 1,
  },
});
