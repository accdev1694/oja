import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Animated,
} from "react-native";
import React, { useState, useMemo, useCallback } from "react";
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
  GlassModal,
  colors,
  typography,
  spacing,
  useGlassAlert,
} from "@/components/ui/glass";

// Tier progress helper for toast messages
function getTierProgress(lifetimeScans: number, currentTier: string): string | null {
  const tiers = [
    { tier: "bronze", threshold: 0 },
    { tier: "silver", threshold: 20 },
    { tier: "gold", threshold: 50 },
    { tier: "platinum", threshold: 100 },
  ];
  const idx = tiers.findIndex((t) => t.tier === currentTier);
  if (idx >= tiers.length - 1) return null; // already platinum
  const next = tiers[idx + 1];
  const remaining = next.threshold - lifetimeScans;
  if (remaining <= 0) return null;
  const label = next.tier.charAt(0).toUpperCase() + next.tier.slice(1);
  return `${remaining} to ${label}`;
}

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
  const { alert } = useGlassAlert();
  const { id, returnTo } = useLocalSearchParams<{ id: string; returnTo?: string }>();
  const receiptId = id as Id<"receipts">;

  const receipt = useQuery(api.receipts.getById, { id: receiptId });
  const pantryItems = useQuery(api.pantryItems.getByUser, {});
  const updateReceipt = useMutation(api.receipts.update);
  const savePriceHistory = useMutation(api.priceHistory.savePriceHistoryFromReceipt);
  const checkPriceAlerts = useMutation(api.priceHistory.checkPriceAlerts);
  const checkDuplicate = useMutation(api.receipts.checkDuplicate);
  const upsertCurrentPrices = useMutation(api.currentPrices.upsertFromReceipt);
  const improveArchivedPrices = useMutation(api.currentPrices.improveArchivedListPrices);

  // Gamification mutations
  const earnScanCredit = useMutation(api.subscriptions.earnScanCredit);
  const updateStreak = useMutation(api.insights.updateStreak);
  const activeChallenge = useQuery(api.insights.getActiveChallenge);
  const updateChallengeProgress = useMutation(api.insights.updateChallengeProgress);

  // Post-save: create list / update pantry
  const addBatchToPantry = useMutation(api.pantryItems.addBatchFromScan);
  const replacePantryMutation = useMutation(api.pantryItems.replaceWithScan);

  // Local state for edited items
  const [editedItems, setEditedItems] = useState<ReceiptItem[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);

  // Duplicate detection
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [duplicateInfo, setDuplicateInfo] = useState<{
    storeName: string;
    total: number;
    date: number;
  } | null>(null);

  // Edit modals
  const [editingItemIndex, setEditingItemIndex] = useState<number | null>(null);
  const [editingField, setEditingField] = useState<"name" | "price" | null>(null);
  const [editValue, setEditValue] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);

  // New item state
  const [newItemName, setNewItemName] = useState("");
  const [newItemPrice, setNewItemPrice] = useState("");
  const [newItemQuantity, setNewItemQuantity] = useState("1");

  // Post-save CTA state
  const [receiptSaved, setReceiptSaved] = useState(false);
  const [addedToPantry, setAddedToPantry] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");

  // All hooks must be above early returns to satisfy Rules of Hooks
  const lowConfidenceItems = useMemo(
    () => editedItems.filter((item) => item.confidence && item.confidence < 70),
    [editedItems]
  );

  const tax = receipt?.tax || 0;
  const { subtotal, total } = useMemo(() => {
    const sub = editedItems.reduce((sum, item) => sum + item.totalPrice, 0);
    return { subtotal: sub, total: sub + tax };
  }, [editedItems, tax]);

  const isPartialScan = useMemo(() => {
    if (editedItems.length === 0 || !receipt) return false;
    const parsedTotal = editedItems.reduce((sum, item) => sum + item.totalPrice, 0);
    const receiptTotal = receipt.total;
    if (receiptTotal > 0 && parsedTotal < receiptTotal * 0.7) return true;
    if (editedItems.length <= 2 && receiptTotal > 15) return true;
    return false;
  }, [editedItems, receipt]);

  const openEditNameModal = useCallback((index: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setEditingItemIndex(index);
    setEditingField("name");
    setEditValue(editedItems[index].name);
  }, [editedItems]);

  const openEditPriceModal = useCallback((index: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setEditingItemIndex(index);
    setEditingField("price");
    setEditValue(editedItems[index].totalPrice.toFixed(2));
  }, [editedItems]);

  const handleDeleteItem = useCallback((index: number) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    setEditedItems((prev) => prev.filter((_, i) => i !== index));
  }, []);

  // Get pantry suggestions for autocomplete
  const pantrySuggestions = useMemo(() => {
    if (!pantryItems || !editValue || editingField !== "name") return [];
    return pantryItems
      .filter((item: unknown) => (item as { name: string }).name.toLowerCase().includes(editValue.toLowerCase()))
      .slice(0, 5)
      .map((item: unknown) => (item as { name: string }).name);
  }, [pantryItems, editValue, editingField]);

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

  function handleAddMissingItem() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowAddModal(true);
  }

  function saveNewItem() {
    const name = newItemName.trim();
    const price = parseFloat(newItemPrice);
    const quantity = parseInt(newItemQuantity);

    if (!name || isNaN(price) || price <= 0 || isNaN(quantity) || quantity <= 0) {
      alert("Invalid Input", "Please enter valid name, price, and quantity");
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
      // Step 0: Check for duplicate receipt
      if (receipt) {
        const dupResult = await checkDuplicate({
          receiptId,
          storeName: receipt.storeName,
          total,
          purchaseDate: receipt.purchaseDate,
        });

        if (dupResult.isDuplicate && dupResult.existingReceipt) {
          setDuplicateInfo({
            storeName: dupResult.existingReceipt.storeName,
            total: dupResult.existingReceipt.total,
            date: dupResult.existingReceipt.date,
          });
          setShowDuplicateModal(true);
          return;
        }
      }

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

      // Step 3: Upsert current prices (freshest price database)
      await upsertCurrentPrices({ receiptId });

      // Step 3b: Retroactively improve archived list prices (per-store scoped)
      try {
        await improveArchivedPrices({ receiptId });
      } catch {
        // Non-critical — don't block receipt save
      }

      // Step 4: Check for price alerts
      const alerts = await checkPriceAlerts({ receiptId });

      // Step 5: Gamification — earn scan credit + tier progress, update streak, progress challenge
      let creditEarned = 0;
      let scanResult: any = null;
      try {
        scanResult = await earnScanCredit({ receiptId });
        if (scanResult.success) {
          creditEarned = scanResult.creditEarned;
        }
        await updateStreak({ type: "receipt_scanner" });
        if (activeChallenge && activeChallenge.type === "scan_receipts" && !activeChallenge.completedAt) {
          await updateChallengeProgress({ challengeId: activeChallenge._id, increment: 1 });
        }
      } catch (gamErr) {
        // Non-critical — don't block receipt save
        console.warn("Gamification update failed:", gamErr);
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      // Build reward message
      let suffix = "";
      if (scanResult?.success) {
        const parts: string[] = [];
        if (creditEarned > 0) parts.push(`+£${creditEarned.toFixed(2)} credit`);
        if (scanResult.tierUpgrade) {
          const tierLabel = scanResult.tier.charAt(0).toUpperCase() + scanResult.tier.slice(1);
          parts.push(`${tierLabel} tier!`);
        } else if (scanResult.lifetimeScans) {
          const tierConfig = getTierProgress(scanResult.lifetimeScans, scanResult.tier);
          if (tierConfig) parts.push(tierConfig);
        }
        if (parts.length > 0) suffix = parts.join(", ");
      }
      setSaveMessage(suffix);

      // Show price alerts if any, then transition to saved state
      if (alerts && alerts.length > 0) {
        const alertMessages = alerts.map((a: { type: string; itemName: string; percentChange: number }) => {
          if (a.type === "decrease") {
            return `Great deal! ${a.itemName} is ${a.percentChange.toFixed(0)}% cheaper than usual`;
          } else {
            return `${a.itemName} price went up ${a.percentChange.toFixed(0)}% since last purchase`;
          }
        });

        alert("Price Alerts", alertMessages.join("\n\n"), [
          { text: "OK", onPress: () => setReceiptSaved(true) },
        ]);
      } else {
        setReceiptSaved(true);
      }
    } catch (error) {
      console.error("Save error:", error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      alert("Error", "Failed to save receipt");
    }
  }

  // ── Post-save handlers ──────────────────────────────────────────────

  function handleDoneNavigation() {
    if (returnTo === "create-list-from-receipt") {
      router.replace(`/(app)/create-list-from-receipt?receiptId=${receiptId}` as never);
    } else if (receipt?.listId) {
      router.push(`/receipt/${receiptId}/reconciliation?listId=${receipt.listId}` as never);
    } else {
      router.push("/(app)/(tabs)/scan" as never);
    }
  }

  function mapReceiptItemsForBatch() {
    return editedItems.map((item) => ({
      name: item.name,
      category: item.category ?? "Uncategorised",
      estimatedPrice: item.quantity > 1 ? item.unitPrice : item.totalPrice,
      quantity: item.quantity,
    }));
  }

  function handleCreateListFromReceipt() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push(`/(app)/create-list-from-receipt?receiptId=${receiptId}` as never);
  }

  async function handlePostSaveUpdatePantry() {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const result = await addBatchToPantry({ items: mapReceiptItemsForBatch() });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      const skipped = result.skippedDuplicates ?? [];
      if (skipped.length > 0) {
        const match = skipped[0];
        const receiptItem = editedItems.find(
          (item) => item.name.toLowerCase() === (match.scannedName as string).toLowerCase()
        );
        alert(
          "Similar Item Found",
          `"${match.existingName}" in your pantry is similar to "${match.scannedName}". Update it?`,
          [
            { text: "Skip", style: "cancel" },
            {
              text: "Update",
              onPress: async () => {
                if (!receiptItem) return;
                try {
                  await replacePantryMutation({
                    pantryItemId: match.existingId as Id<"pantryItems">,
                    scannedData: {
                      name: receiptItem.name,
                      category: receiptItem.category ?? "Uncategorised",
                      estimatedPrice: receiptItem.quantity > 1 ? receiptItem.unitPrice : receiptItem.totalPrice,
                    },
                  });
                  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                } catch (err) {
                  console.error("Failed to update item:", err);
                }
              },
            },
          ]
        );
      }

      setAddedToPantry(true);
    } catch (error) {
      console.error("Failed to update pantry:", error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      alert("Error", "Failed to update pantry");
    }
  }

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

        {/* Partial Scan Warning */}
        {isPartialScan && (
          <GlassCard
            variant="bordered"
            accentColor={colors.semantic.danger}
            style={styles.section}
          >
            <View style={styles.warningHeader}>
              <MaterialCommunityIcons
                name="image-broken-variant"
                size={20}
                color={colors.semantic.danger}
              />
              <Text style={styles.partialScanTitle}>Incomplete Scan</Text>
            </View>
            <Text style={styles.warningText}>
              We only found {editedItems.length} item{editedItems.length !== 1 ? "s" : ""} but
              the receipt total is £{receipt.total.toFixed(2)}. Some items may not have
              been captured. Try retaking the photo with better lighting, or add
              missing items manually below.
            </Text>
            <GlassButton
              variant="secondary"
              size="sm"
              icon="camera-retake"
              onPress={() => router.back()}
              style={styles.retakeButton}
            >
              Retake Photo
            </GlassButton>
          </GlassCard>
        )}

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
              onEditName={openEditNameModal}
              onEditPrice={openEditPriceModal}
              onDelete={handleDeleteItem}
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

        {receiptSaved ? (
          /* ── Post-save CTAs ────────────────────────────────── */
          <GlassCard variant="bordered" accentColor={colors.accent.primary} style={styles.postSaveCard}>
            <View style={styles.postSaveHeader}>
              <MaterialCommunityIcons name="check-circle" size={28} color={colors.accent.primary} />
              <View style={{ flex: 1 }}>
                <Text style={styles.postSaveTitle}>Receipt Saved!</Text>
                {saveMessage ? (
                  <Text style={styles.postSaveSubtitle}>{saveMessage}</Text>
                ) : null}
              </View>
            </View>

            <Text style={styles.postSavePrompt}>
              What would you like to do with these items?
            </Text>

            <View style={styles.postSaveActions}>
              <View style={{ flex: 1 }}>
                <GlassButton
                  variant="primary"
                  size="md"
                  icon="clipboard-plus"
                  onPress={handleCreateListFromReceipt}
                >
                  Create List
                </GlassButton>
              </View>
              <View style={{ flex: 1 }}>
                <GlassButton
                  variant="secondary"
                  size="md"
                  icon={addedToPantry ? "check-circle" : "fridge-outline"}
                  disabled={addedToPantry}
                  onPress={handlePostSaveUpdatePantry}
                >
                  {addedToPantry ? "In Pantry" : "Update Pantry"}
                </GlassButton>
              </View>
            </View>

            <GlassButton
              variant="secondary"
              size="sm"
              icon="check"
              onPress={handleDoneNavigation}
              style={{ marginTop: spacing.sm }}
            >
              Done
            </GlassButton>
          </GlassCard>
        ) : (
          <>
            {/* Community contribution nudge */}
            <View style={styles.contributionRow}>
              <MaterialCommunityIcons name="heart-outline" size={14} color={colors.text.tertiary} />
              <Text style={styles.contributionText}>
                Your prices help build better data for shoppers everywhere.
              </Text>
            </View>

            {/* Save Button */}
            <GlassButton
              variant="primary"
              size="lg"
              icon="content-save"
              onPress={handleSaveReceipt}
            >
              Save Receipt
            </GlassButton>
          </>
        )}

        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* Edit Modal */}
      <GlassModal
        visible={editingItemIndex !== null}
        onClose={closeEditModal}
        maxWidth={400}
        avoidKeyboard
      >
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
      </GlassModal>

      {/* Duplicate Receipt Modal */}
      <GlassModal
        visible={showDuplicateModal}
        onClose={() => setShowDuplicateModal(false)}
        maxWidth={400}
      >
        <View style={styles.duplicateHeader}>
          <MaterialCommunityIcons
            name="receipt"
            size={32}
            color={colors.semantic.warning}
          />
          <Text style={styles.duplicateTitle}>Duplicate Receipt</Text>
        </View>
        <Text style={styles.duplicateText}>
          This receipt appears to have already been scanned.
        </Text>
        {duplicateInfo && (
          <View style={styles.duplicateDetails}>
            <Text style={styles.duplicateDetailText}>
              {duplicateInfo.storeName} — £{duplicateInfo.total.toFixed(2)}
            </Text>
            <Text style={styles.duplicateDetailDate}>
              {new Date(duplicateInfo.date).toLocaleDateString()}
            </Text>
          </View>
        )}
        <View style={styles.modalActions}>
          <GlassButton
            variant="secondary"
            size="md"
            onPress={() => {
              setShowDuplicateModal(false);
              router.back();
            }}
            style={styles.modalButton}
          >
            Discard
          </GlassButton>
          <GlassButton
            variant="primary"
            size="md"
            onPress={() => setShowDuplicateModal(false)}
            style={styles.modalButton}
          >
            Review
          </GlassButton>
        </View>
      </GlassModal>

      {/* Add Item Modal */}
      <GlassModal
        visible={showAddModal}
        onClose={() => setShowAddModal(false)}
        maxWidth={400}
        avoidKeyboard
      >
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
      </GlassModal>
    </GlassScreen>
  );
}

// =============================================================================
// EDITABLE ITEM ROW COMPONENT
// =============================================================================

interface EditableItemRowProps {
  item: ReceiptItem;
  index: number;
  onEditName: (index: number) => void;
  onEditPrice: (index: number) => void;
  onDelete: (index: number) => void;
}

const EditableItemRow = React.memo(function EditableItemRow({
  item,
  index,
  onEditName,
  onEditPrice,
  onDelete,
}: EditableItemRowProps) {
  const isLowConfidence = item.confidence && item.confidence < 70;

  const handleEditName = useCallback(() => onEditName(index), [onEditName, index]);
  const handleEditPrice = useCallback(() => onEditPrice(index), [onEditPrice, index]);
  const handleDelete = useCallback(() => onDelete(index), [onDelete, index]);

  const renderRightActions = useCallback(() => {
    return (
      <TouchableOpacity
        style={styles.deleteAction}
        onPress={handleDelete}
        activeOpacity={0.7}
      >
        <MaterialCommunityIcons name="delete" size={24} color="#FFFFFF" />
      </TouchableOpacity>
    );
  }, [handleDelete]);

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
            <TouchableOpacity onPress={handleEditName} activeOpacity={0.7}>
              <Text style={styles.itemName}>{item.name}</Text>
            </TouchableOpacity>

            <Text style={styles.itemQuantity}>Qty: {item.quantity}</Text>
          </View>
        </View>

        <TouchableOpacity onPress={handleEditPrice} activeOpacity={0.7}>
          <Text style={styles.itemPrice}>£{item.totalPrice.toFixed(2)}</Text>
        </TouchableOpacity>
      </View>
    </Swipeable>
  );
});

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
  partialScanTitle: {
    ...typography.labelMedium,
    color: colors.semantic.danger,
    fontWeight: "600",
  },
  retakeButton: {
    marginTop: spacing.sm,
    alignSelf: "flex-start",
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
    backgroundColor: "#FF6B6B",
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

  contributionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginBottom: spacing.md,
  },
  contributionText: {
    ...typography.labelSmall,
    color: colors.text.tertiary,
  },

  bottomSpacer: {
    height: 140,
  },

  // Post-save CTAs
  postSaveCard: {
    marginTop: spacing.lg,
  },
  postSaveHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  postSaveTitle: {
    ...typography.headlineSmall,
    color: colors.text.primary,
  },
  postSaveSubtitle: {
    ...typography.bodySmall,
    color: colors.accent.primary,
    marginTop: 2,
  },
  postSavePrompt: {
    ...typography.bodyMedium,
    color: colors.text.secondary,
    marginBottom: spacing.md,
  },
  postSaveActions: {
    flexDirection: "row",
    gap: spacing.md,
  },
  // Modal
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

  // Duplicate Modal
  duplicateHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  duplicateTitle: {
    ...typography.headlineSmall,
    color: colors.semantic.warning,
    fontWeight: "700",
  },
  duplicateText: {
    ...typography.bodyMedium,
    color: colors.text.secondary,
    marginBottom: spacing.md,
  },
  duplicateDetails: {
    backgroundColor: colors.glass.backgroundStrong,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  duplicateDetailText: {
    ...typography.labelMedium,
    color: colors.text.primary,
    fontWeight: "600",
    marginBottom: 4,
  },
  duplicateDetailDate: {
    ...typography.bodySmall,
    color: colors.text.tertiary,
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
