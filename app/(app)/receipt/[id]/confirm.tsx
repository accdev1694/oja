import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from "react-native";
import React, { useState, useMemo, useCallback, useRef } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import * as Haptics from "expo-haptics";
import {
  GlassScreen, GlassCard, GlassButton, GlassInput, SimpleHeader,
  GlassErrorState, GlassSkeleton, GlassModal, GlassToast, colors, typography, spacing, useGlassAlert,
} from "@/components/ui/glass";
import { useHint } from "@/hooks/useHint";
import { useDelightToast } from "@/hooks/useDelightToast";
import { HintOverlay } from "@/components/tutorial/HintOverlay";
import { UnmatchedItemsModal } from "@/components/receipt/UnmatchedItemsModal";
import { ReceiptStoreInfo } from "@/components/receipt/ReceiptStoreInfo";
import { ReceiptWarnings } from "@/components/receipt/ReceiptWarnings";
import { ReceiptItemsList } from "@/components/receipt/ReceiptItemsList";
import { ReceiptSavedView } from "@/components/receipt/ReceiptSavedView";

interface ReceiptItem {
  name: string; quantity: number; unitPrice: number; totalPrice: number;
  category?: string; confidence?: number;
}

export default function ConfirmReceiptScreen() {
  const router = useRouter();
  const { alert } = useGlassAlert();
  const { id, returnTo } = useLocalSearchParams<{ id: string; returnTo?: string }>();
  const receiptId = id as Id<"receipts">;
  const itemsRef = useRef<View>(null);
  const reviewHint = useHint("scan_review", "delayed");
  const { toast, dismiss, onPointsEarned } = useDelightToast();

  // ── Data queries & mutations ────────────────────────────────────────
  const receipt = useQuery(api.receipts.getById, { id: receiptId });
  const shoppingList = useQuery(api.shoppingLists.getById, receipt?.listId ? { id: receipt.listId } : "skip");
  const pantryItems = useQuery(api.pantryItems.getByUser, {});
  const updateReceipt = useMutation(api.receipts.update);
  const savePriceHistory = useMutation(api.priceHistory.savePriceHistoryFromReceipt);
  const checkPriceAlerts = useMutation(api.priceHistory.checkPriceAlerts);
  const checkDuplicate = useMutation(api.receipts.checkDuplicate);
  const deleteReceiptMut = useMutation(api.receipts.remove);
  const upsertCurrentPrices = useMutation(api.currentPrices.upsertFromReceipt);
  const improveArchivedPrices = useMutation(api.currentPrices.improveArchivedListPrices);
  const refreshActiveListPrices = useMutation(api.currentPrices.refreshActiveListsFromReceipt);
  const processReceiptMatching = useMutation(api.itemMatching.processReceiptMatching);
  const updateStreak = useMutation(api.insights.updateStreak);
  const activeChallenge = useQuery(api.insights.getActiveChallenge);
  const updateChallengeProgress = useMutation(api.insights.updateChallengeProgress);
  const addBatchToPantry = useMutation(api.pantryItems.addBatchFromScan);

  // ── Local state ─────────────────────────────────────────────────────
  const [editedItems, setEditedItems] = useState<ReceiptItem[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [duplicateInfo, setDuplicateInfo] = useState<{ storeName: string; total: number; date: number } | null>(null);
  const [editingItemIndex, setEditingItemIndex] = useState<number | null>(null);
  const [editingField, setEditingField] = useState<"name" | "price" | null>(null);
  const [editValue, setEditValue] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [newItemName, setNewItemName] = useState("");
  const [newItemPrice, setNewItemPrice] = useState("");
  const [newItemQuantity, setNewItemQuantity] = useState("1");
  const [receiptSaved, setReceiptSaved] = useState(false);
  const [savedPointsEarned, setSavedPointsEarned] = useState(0);
  const [addedToPantry, setAddedToPantry] = useState(false);
  const [showUnmatchedModal, setShowUnmatchedModal] = useState(false);

  // ── Derived values ──────────────────────────────────────────────────
  const lowConfidenceCount = useMemo(() => editedItems.filter((i) => i.confidence && i.confidence < 70).length, [editedItems]);
  const tax = receipt?.tax || 0;
  const { subtotal, total } = useMemo(() => {
    const sub = editedItems.reduce((s, i) => s + i.totalPrice, 0);
    return { subtotal: sub, total: sub + tax };
  }, [editedItems, tax]);
  const isPartialScan = useMemo(() => {
    if (editedItems.length === 0 || !receipt) return false;
    const parsed = editedItems.reduce((s, i) => s + i.totalPrice, 0);
    return (receipt.total > 0 && parsed < receipt.total * 0.7) || (editedItems.length <= 2 && receipt.total > 15);
  }, [editedItems, receipt]);
  const pantrySuggestions = useMemo(() => {
    if (!pantryItems || !editValue || editingField !== "name") return [];
    return pantryItems.filter((i: unknown) => (i as { name: string }).name.toLowerCase().includes(editValue.toLowerCase())).slice(0, 5).map((i: unknown) => (i as { name: string }).name);
  }, [pantryItems, editValue, editingField]);

  // ── Item edit callbacks ─────────────────────────────────────────────
  const openEditNameModal = useCallback((idx: number) => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setEditingItemIndex(idx); setEditingField("name"); setEditValue(editedItems[idx].name); }, [editedItems]);
  const openEditPriceModal = useCallback((idx: number) => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setEditingItemIndex(idx); setEditingField("price"); setEditValue(editedItems[idx].totalPrice.toFixed(2)); }, [editedItems]);
  const handleDeleteItem = useCallback((idx: number) => { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning); setEditedItems((prev) => prev.filter((_, i) => i !== idx)); }, []);

  // Initialize edited items from receipt
  if (receipt && !isInitialized) { setEditedItems(receipt.items as ReceiptItem[]); setIsInitialized(true); }

  // ── Loading / Error ─────────────────────────────────────────────────
  if (receipt === undefined) return <GlassScreen><SimpleHeader title="Confirm Receipt" subtitle="Loading..." /><View style={s.container}><GlassSkeleton variant="card" /><GlassSkeleton variant="card" /><GlassSkeleton variant="card" /></View></GlassScreen>;
  if (receipt === null) return <GlassScreen><SimpleHeader title="Confirm Receipt" subtitle="Error" /><View style={s.container}><GlassErrorState title="Receipt Not Found" message="This receipt could not be found" /></View></GlassScreen>;

  // ── Handlers ────────────────────────────────────────────────────────
  function goBack() { router.canGoBack() ? router.back() : router.replace("/(app)/(tabs)/scan"); }
  function closeEditModal() { setEditingItemIndex(null); setEditingField(null); setEditValue(""); }
  function saveEdit() {
    if (editingItemIndex === null) return;
    const updated = [...editedItems];
    if (editingField === "name") updated[editingItemIndex].name = editValue.trim();
    else if (editingField === "price") { const p = parseFloat(editValue); if (!isNaN(p) && p > 0) { updated[editingItemIndex].totalPrice = p; updated[editingItemIndex].unitPrice = p / updated[editingItemIndex].quantity; } }
    setEditedItems(updated); closeEditModal(); Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }
  function saveNewItem() {
    const name = newItemName.trim(); const price = parseFloat(newItemPrice); const qty = parseInt(newItemQuantity);
    if (!name || isNaN(price) || price <= 0 || isNaN(qty) || qty <= 0) { alert("Invalid Input", "Please enter valid name, price, and quantity"); return; }
    setEditedItems([...editedItems, { name, quantity: qty, unitPrice: price / qty, totalPrice: price }]);
    setShowAddModal(false); setNewItemName(""); setNewItemPrice(""); setNewItemQuantity("1");
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }
  function handleDoneNavigation() {
    if (returnTo === "create-list-from-receipt") router.replace(`/(app)/create-list-from-receipt?receiptId=${receiptId}` as never);
    else if (receipt?.listId) router.push(`/receipt/${receiptId}/reconciliation?listId=${receipt.listId}` as never);
    else router.push("/(app)/(tabs)/scan" as never);
  }
  function handleCreateListFromReceipt() { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); router.push(`/(app)/create-list-from-receipt?receiptId=${receiptId}` as never); }
  async function handleDeleteReceipt() {
    alert("Delete Receipt", "Are you sure? This cannot be undone.", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: async () => { await deleteReceiptMut({ id: receiptId }); router.replace("/(app)/(tabs)/scan"); } },
    ]);
  }
  async function handlePostSaveUpdatePantry() {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const items = editedItems.map((i) => ({ name: i.name, category: i.category ?? "Uncategorised", estimatedPrice: i.quantity > 1 ? i.unitPrice : i.totalPrice }));
      const result = await addBatchToPantry({ items });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      const parts: string[] = []; if (result.added > 0) parts.push(`${result.added} added`); if (result.restocked > 0) parts.push(`${result.restocked} restocked`);
      if (parts.length > 0) alert("Pantry Updated", `${parts.join(", ")}. All items marked as fully stocked.`);
      setAddedToPantry(true);
    } catch (err) { console.error("Failed to update pantry:", err); Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error); alert("Error", "Failed to update pantry"); }
  }
  async function handleSaveReceipt() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      if (receipt) { const dup = await checkDuplicate({ receiptId, storeName: receipt.storeName, total, purchaseDate: receipt.purchaseDate }); if (dup.isDuplicate && dup.existingReceipt) { setDuplicateInfo({ storeName: dup.existingReceipt.storeName, total: dup.existingReceipt.total, date: dup.existingReceipt.date }); setShowDuplicateModal(true); return; } }
      const updatedReceipt = await updateReceipt({ id: receiptId, items: editedItems, subtotal, total, processingStatus: "completed", imageHash: receipt?.imageHash, storeName: receipt?.storeName, purchaseDate: receipt?.purchaseDate, imageQuality: receipt?.imageQuality });
      if (updatedReceipt?.pointsEarned && updatedReceipt.pointsEarned > 0) {
        setSavedPointsEarned(updatedReceipt.pointsEarned);
        onPointsEarned(updatedReceipt.pointsEarned);
      }
      await savePriceHistory({ receiptId }); await upsertCurrentPrices({ receiptId });
      try { await improveArchivedPrices({ receiptId }); } catch { /* non-critical */ }
      let listPricesUpdated = 0;
      try { const r = await refreshActiveListPrices({ receiptId }); listPricesUpdated = r.updated; } catch { /* non-critical */ }
      let pendingMatches = 0;
      try { const m = await processReceiptMatching({ receiptId }); pendingMatches = m.pendingCount; listPricesUpdated += m.autoMatched; } catch { /* non-critical */ }
      const alerts = await checkPriceAlerts({ receiptId });
      try { await updateStreak({ type: "receipt_scanner" }); if (activeChallenge && activeChallenge.type === "scan_receipts" && !activeChallenge.completedAt) await updateChallengeProgress({ challengeId: activeChallenge._id, increment: 1 }); } catch { /* non-critical */ }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      const goSaved = () => { if (pendingMatches > 0) setShowUnmatchedModal(true); else { setReceiptSaved(true); setIsInitialized(false); } };
      if (alerts && alerts.length > 0) {
        const msgs = alerts.map((a: { type: string; itemName: string; percentChange: number }) => a.type === "decrease" ? `Great deal! ${a.itemName} is ${a.percentChange.toFixed(0)}% cheaper than usual` : `${a.itemName} price went up ${a.percentChange.toFixed(0)}% since last purchase`);
        alert("Receipt Saved", msgs.join("\n\n"), [{ text: "OK", onPress: goSaved }]);
      } else if (pendingMatches > 0) { setShowUnmatchedModal(true); } else { setReceiptSaved(true); setIsInitialized(false); alert("Success", "Receipt updated and price history synced!"); }
    } catch (err) { console.error("Save error:", err); Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error); alert("Error", "Failed to save receipt"); }
  }

  // ── Post-save view ──────────────────────────────────────────────────
  if (receiptSaved) return (
    <ReceiptSavedView receipt={{ total, storeName: receipt.storeName, items: editedItems }} receiptId={receiptId}
      list={shoppingList ? { storeSegments: shoppingList.storeSegments } : null}
      pointsEarned={savedPointsEarned}
      onGoBack={goBack} onCreateListFromReceipt={handleCreateListFromReceipt}
      onAddToPantry={handlePostSaveUpdatePantry} onDone={handleDoneNavigation} onDeleteReceipt={handleDeleteReceipt} />
  );

  // ── Main confirmation view ──────────────────────────────────────────
  return (
    <GlassScreen>
      <SimpleHeader title="Confirm Receipt" subtitle={`${editedItems.length} items \u00B7 \u00A3${total.toFixed(2)}`} showBack={true} onBack={goBack} />
      <ScrollView style={s.container} contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>
        <ReceiptStoreInfo storeName={receipt.storeName} storeAddress={receipt.storeAddress} purchaseDate={receipt.purchaseDate} storeSegments={shoppingList?.storeSegments} currentStoreName={receipt.storeName} />
        <ReceiptWarnings isPartialScan={isPartialScan} itemCount={editedItems.length} receiptTotal={receipt.total} lowConfidenceCount={lowConfidenceCount} onRetakePhoto={() => router.back()} />
        <ReceiptItemsList items={editedItems} onEditName={openEditNameModal} onEditPrice={openEditPriceModal} onDelete={handleDeleteItem} onAddMissingItem={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setShowAddModal(true); }} itemsRef={itemsRef} />

        {/* Totals */}
        <GlassCard variant="bordered" accentColor={colors.accent.primary} style={s.section}>
          <View style={s.totalRow}><Text style={s.totalLabel}>Subtotal:</Text><Text style={s.totalValue}>{"\u00A3"}{subtotal.toFixed(2)}</Text></View>
          {tax > 0 && <View style={s.totalRow}><Text style={s.totalLabel}>Tax:</Text><Text style={s.totalValue}>{"\u00A3"}{tax.toFixed(2)}</Text></View>}
          <View style={[s.totalRow, s.grandTotal]}><Text style={s.grandTotalLabel}>Total:</Text><Text style={s.grandTotalValue}>{"\u00A3"}{total.toFixed(2)}</Text></View>
        </GlassCard>

        {/* Actions */}
        <View style={s.footerActions}>
          {receipt.processingStatus === "pending" || (isInitialized && editedItems !== receipt.items)
            ? <GlassButton variant="primary" size="lg" icon="content-save" onPress={handleSaveReceipt} style={s.mainAction}>{receipt.processingStatus === "pending" ? "Save Receipt & Sync Prices" : "Save Changes"}</GlassButton>
            : <GlassButton variant="primary" size="lg" icon="clipboard-plus" onPress={handleCreateListFromReceipt} style={s.mainAction}>Create List from Receipt</GlassButton>}
          <View style={s.secondaryRow}>
            <View style={{ flex: 1 }}><GlassButton variant="secondary" size="md" icon={addedToPantry ? "check-circle" : "fridge-outline"} disabled={addedToPantry} onPress={handlePostSaveUpdatePantry}>{addedToPantry ? "In Pantry" : "Add to Pantry"}</GlassButton></View>
            <View style={{ flex: 1 }}><GlassButton variant="secondary" size="md" icon="check" onPress={handleDoneNavigation}>Done</GlassButton></View>
          </View>
          <GlassButton variant="secondary" size="md" icon="delete-outline" onPress={handleDeleteReceipt} style={{ marginTop: spacing.sm }}>Delete Receipt</GlassButton>
        </View>
        <View style={s.bottomSpacer} />
      </ScrollView>

      {/* Edit Modal */}
      <GlassModal visible={editingItemIndex !== null} onClose={closeEditModal} maxWidth={400} avoidKeyboard>
        <Text style={s.modalTitle}>Edit {editingField === "name" ? "Item Name" : "Price"}</Text>
        <GlassInput value={editValue} onChangeText={setEditValue} placeholder={editingField === "name" ? "Item name" : "0.00"} keyboardType={editingField === "price" ? "decimal-pad" : "default"} autoFocus style={s.modalInput} />
        {editingField === "name" && pantrySuggestions.length > 0 && (
          <View style={s.suggestions}>{pantrySuggestions.map((sug: string, i: number) => <TouchableOpacity key={i} style={s.chip} onPress={() => setEditValue(sug)}><Text style={s.chipText}>{sug}</Text></TouchableOpacity>)}</View>
        )}
        <View style={s.modalRow}><GlassButton variant="secondary" size="md" onPress={closeEditModal} style={s.modalBtn}>Cancel</GlassButton><GlassButton variant="primary" size="md" onPress={saveEdit} style={s.modalBtn}>Save</GlassButton></View>
      </GlassModal>

      {/* Duplicate Modal */}
      <GlassModal visible={showDuplicateModal} onClose={() => setShowDuplicateModal(false)} maxWidth={400}>
        <Text style={s.dupTitle}>Duplicate Receipt</Text>
        <Text style={s.dupText}>This receipt appears to have already been scanned.</Text>
        {duplicateInfo && <View style={s.dupDetails}><Text style={s.dupDetailMain}>{duplicateInfo.storeName} {"\u2014"} {"\u00A3"}{duplicateInfo.total.toFixed(2)}</Text><Text style={s.dupDetailDate}>{new Date(duplicateInfo.date).toLocaleDateString()}</Text></View>}
        <View style={s.modalRow}><GlassButton variant="secondary" size="md" onPress={() => { setShowDuplicateModal(false); router.back(); }} style={s.modalBtn}>Discard</GlassButton><GlassButton variant="primary" size="md" onPress={() => setShowDuplicateModal(false)} style={s.modalBtn}>Review</GlassButton></View>
      </GlassModal>

      {/* Add Item Modal */}
      <GlassModal visible={showAddModal} onClose={() => setShowAddModal(false)} maxWidth={400} avoidKeyboard>
        <Text style={s.modalTitle}>Add Missing Item</Text>
        <GlassInput value={newItemName} onChangeText={setNewItemName} placeholder="Item name" autoFocus style={s.modalInput} />
        <View style={s.inputRow}><GlassInput value={newItemQuantity} onChangeText={setNewItemQuantity} placeholder="Qty" keyboardType="number-pad" style={[s.modalInput, s.half]} /><GlassInput value={newItemPrice} onChangeText={setNewItemPrice} placeholder="Total price" keyboardType="decimal-pad" style={[s.modalInput, s.half]} /></View>
        <View style={s.modalRow}><GlassButton variant="secondary" size="md" onPress={() => setShowAddModal(false)} style={s.modalBtn}>Cancel</GlassButton><GlassButton variant="primary" size="md" onPress={saveNewItem} style={s.modalBtn}>Add Item</GlassButton></View>
      </GlassModal>

      <UnmatchedItemsModal visible={showUnmatchedModal} onClose={() => { setShowUnmatchedModal(false); setReceiptSaved(true); }} receiptId={receiptId} onComplete={() => { setShowUnmatchedModal(false); setReceiptSaved(true); }} />
      <HintOverlay visible={reviewHint.shouldShow} targetRef={itemsRef} title="Review Scan" content="Quickly check if the AI caught everything. Tap any name or price to correct it." onDismiss={reviewHint.dismiss} position="below" />
      <GlassToast message={toast.message} icon={toast.icon} iconColor={toast.iconColor} visible={toast.visible} onDismiss={dismiss} duration={4000} />
    </GlassScreen>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { paddingHorizontal: spacing.lg },
  section: { marginBottom: spacing.md },
  totalRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: spacing.xs },
  totalLabel: { ...typography.bodyMedium, color: colors.text.secondary },
  totalValue: { ...typography.bodyMedium, color: colors.text.primary, fontWeight: "600" },
  grandTotal: { paddingTop: spacing.sm, borderTopWidth: 1, borderTopColor: colors.glass.border, marginTop: spacing.xs },
  grandTotalLabel: { ...typography.labelLarge, color: colors.text.primary, fontWeight: "700" },
  grandTotalValue: { ...typography.labelLarge, color: colors.accent.primary, fontWeight: "700" },
  bottomSpacer: { height: 140 },
  footerActions: { marginTop: spacing.xl, gap: spacing.md },
  mainAction: { width: "100%" },
  secondaryRow: { flexDirection: "row", gap: spacing.md },
  modalTitle: { ...typography.headlineSmall, color: colors.text.primary, marginBottom: spacing.md },
  modalInput: { marginBottom: spacing.md },
  modalRow: { flexDirection: "row", gap: spacing.md },
  modalBtn: { flex: 1 },
  suggestions: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs, marginBottom: spacing.md },
  chip: { backgroundColor: colors.glass.backgroundStrong, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, borderRadius: 16, borderWidth: 1, borderColor: colors.glass.border },
  chipText: { ...typography.bodySmall, color: colors.text.primary },
  dupTitle: { ...typography.headlineSmall, color: colors.semantic.warning, fontWeight: "700", marginBottom: spacing.md },
  dupText: { ...typography.bodyMedium, color: colors.text.secondary, marginBottom: spacing.md },
  dupDetails: { backgroundColor: colors.glass.backgroundStrong, borderRadius: 12, padding: spacing.md, marginBottom: spacing.lg },
  dupDetailMain: { ...typography.labelMedium, color: colors.text.primary, fontWeight: "600", marginBottom: 4 },
  dupDetailDate: { ...typography.bodySmall, color: colors.text.tertiary },
  inputRow: { flexDirection: "row", gap: spacing.md },
  half: { flex: 1 },
});
