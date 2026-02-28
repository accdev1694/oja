import React, { useState, useCallback, useEffect, useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  TextInput,
  Pressable,
  Modal,
  ActivityIndicator,
  StyleSheet,
  TouchableOpacity,
} from "react-native";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import * as Haptics from "expo-haptics";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import Animated, { FadeInDown } from "react-native-reanimated";
import {
  GlassCard,
  GlassButton,
  AnimatedSection,
  colors,
  spacing,
  typography,
  useGlassAlert,
  GlassDateRangePicker,
  type DateRange,
  GlassInput,
} from "@/components/ui/glass";
import { adminStyles as styles } from "./styles";
import { Receipt, PriceAnomaly } from "./types";
import type { Id } from "@/convex/_generated/dataModel";
import { useAdminToast, useResponsive } from "./hooks";
import { SavedFilterPills } from "./components/SavedFilterPills";

interface ReceiptsTabProps {
  /** Permission check function */
  hasPermission: (p: string) => boolean;
  /** Optional initial receipt ID to highlight (from global search) */
  initialReceiptId?: string;
  /** Callback when selection changes for breadcrumbs */
  onSelectionChange?: (label: string | null) => void;
}

/**
 * ReceiptThumbnail Component
 * Small image preview used in horizontal queues.
 */
function ReceiptThumbnail({ storageId, onPress }: { storageId: string; onPress: () => void }) {
  const url = useQuery(api.admin.getReceiptImageUrl, { storageId });
  
  return (
    <Pressable onPress={onPress} style={localStyles.thumbContainer}>
      {url ? (
        <Animated.Image 
          source={{ uri: url }} 
          style={localStyles.thumbImage} 
          entering={FadeInDown}
        />
      ) : (
        <View style={[localStyles.thumbImage, { justifyContent: "center", alignItems: "center", backgroundColor: `${colors.glass.border}20` }]}>
          <ActivityIndicator size="small" color={colors.accent.primary} />
        </View>
      )}
    </Pressable>
  );
}

function ReceiptImage({ storageId }: { storageId: string }) {
  const url = useQuery(api.admin.getReceiptImageUrl, { storageId });

  // Handle loading state
  if (url === undefined) {
    return (
      <View style={[styles.imageContainer, { justifyContent: "center" }]}>
        <ActivityIndicator color={colors.accent.primary} size="large" />
        <Text style={[styles.emptyText, { marginTop: spacing.md }]}>Fetching from storage...</Text>
      </View>
    );
  }

  // Handle missing or invalid storage IDs (common in seed data)
  if (url === null || !storageId.includes("_")) { 
    return (
      <View style={[styles.imageContainer, { justifyContent: "center", alignItems: "center", padding: spacing.xl }]}>
        <MaterialCommunityIcons name="image-off-outline" size={64} color={colors.text.tertiary} />
        <Text style={styles.modalTitle}>No Original Image</Text>
        <Text style={[styles.emptyText, { textAlign: "center" }]}>
          This receipt was likely created via seed data or the image has expired. Real scans will appear here.
        </Text>
        <Text style={[styles.logTime, { marginTop: spacing.md }]}>ID: {storageId}</Text>
      </View>
    );
  }

  return (
    <View style={styles.imageContainer}>
      <Animated.Image
        source={{ uri: url }}
        style={styles.receiptImage}
        resizeMode="contain"
        entering={FadeInDown}
      />
    </View>
  );
}

/**
 * ReceiptsTab Component
 * Manages receipt moderation, flagged entries, and price anomalies.
 */
export function ReceiptsTab({ hasPermission, initialReceiptId, onSelectionChange }: ReceiptsTabProps) {
  const { isMobile } = useResponsive();
  const { alert: showAlert } = useGlassAlert();
  const { showToast } = useAdminToast();
  const [dateRange, setDateRange] = useState<DateRange>({ startDate: null, endDate: null });
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedReceiptId, setSelectedReceiptId] = useState<string | null>(null);
  
  // Edit State
  const [editingReceipt, setEditingReceipt] = useState<Receipt | null>(null);
  const [editForm, setEditForm] = useState({ storeName: "", total: "" });

  const canDelete = hasPermission("delete_receipts");

  // Handle initial receipt selection from global search or reset
  useEffect(() => {
    if (initialReceiptId === "RESET") {
      setSelectedReceiptId(null);
      setSearch("");
    } else if (initialReceiptId) {
      setSelectedReceiptId(initialReceiptId);
      if (search) setSearch("");
    }
  }, [initialReceiptId, search]);

  const recentReceipts = useQuery(api.admin.getRecentReceipts, { 
    limit: 50,
    dateFrom: dateRange.startDate || undefined,
    dateTo: dateRange.endDate || undefined,
    searchTerm: search.length >= 2 ? search : undefined,
    status: statusFilter || undefined,
  }) as Receipt[] | undefined;
  
  const flaggedReceipts = useQuery(api.admin.getFlaggedReceipts, {}) as Receipt[] | undefined;
  const priceAnomaliesData = useQuery(api.admin.getPriceAnomalies, {}) as { anomalies: PriceAnomaly[], hasMore: boolean } | undefined;
  const priceAnomalies = priceAnomaliesData?.anomalies || [];

  // Find selected receipt for breadcrumb label
  const selectedReceipt = useMemo(() => {
    if (!selectedReceiptId) return null;
    return recentReceipts?.find(r => r._id === selectedReceiptId) || 
           flaggedReceipts?.find(r => r._id === selectedReceiptId) ||
           null;
  }, [selectedReceiptId, recentReceipts, flaggedReceipts]);

  // Sync breadcrumb label
  useEffect(() => {
    if (onSelectionChange) {
      if (selectedReceipt) {
        onSelectionChange(`${selectedReceipt.storeName} (£${selectedReceipt.total})`);
      } else if (selectedReceiptId) {
        onSelectionChange("Loading...");
      } else {
        onSelectionChange(null);
      }
    }
  }, [selectedReceipt, selectedReceiptId, onSelectionChange]);

  const deleteReceipt = useMutation(api.admin.deleteReceipt);
  const bulkAction = useMutation(api.admin.bulkReceiptAction);
  const overridePrice = useMutation(api.admin.overridePrice);
  const updateReceipt = useMutation(api.receipts.update);
  const saveFilter = useMutation(api.admin.saveFilter);

  const statusOptions = [
    { label: "All", value: null },
    { label: "Pending", value: "pending" },
    { label: "Processing", value: "processing" },
    { label: "Completed", value: "completed" },
    { label: "Failed", value: "failed" },
  ];

  const handleApplyPreset = useCallback((data: any) => {
    if (data.status !== undefined) setStatusFilter(data.status);
    if (data.search !== undefined) setSearch(data.search);
    showToast("Preset applied", "info");
  }, [showToast]);

  const handleSavePreset = useCallback(() => {
    const name = statusFilter ? `Status: ${statusFilter}` : (search ? `Search: ${search}` : "Receipt Filter");
    showAlert("Save Preset", `Save current filters as "${name}"?`, [
      { text: "Cancel", style: "cancel" },
      { 
        text: "Save", 
        onPress: async () => {
          try {
            await saveFilter({ name, tab: "receipts", filterData: { status: statusFilter, search } });
            showToast("Receipt preset saved", "success");
          } catch (e) { showToast((e as Error).message, "error"); }
        }
      }
    ]);
  }, [statusFilter, search, saveFilter, showAlert, showToast]);

  const handleSelectReceipt = useCallback((id: string) => {
    setSelectedReceiptId(id);
    Haptics.selectionAsync();
  }, []);

  const handleStartEdit = useCallback((receipt: Receipt) => {
    setEditingReceipt(receipt);
    setEditForm({
      storeName: receipt.storeName,
      total: receipt.total.toString(),
    });
    Haptics.selectionAsync();
  }, []);

  const handleSaveEdit = useCallback(async () => {
    if (!editingReceipt) return;
    try {
      await updateReceipt({
        id: editingReceipt._id as Id<"receipts">,
        storeName: editForm.storeName,
        total: parseFloat(editForm.total),
      });
      setEditingReceipt(null);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      showToast("Receipt updated", "success");
    } catch (e) {
      showToast((e as Error).message, "error");
    }
  }, [editingReceipt, editForm, updateReceipt, showToast]);

  const handleDeleteReceipt = useCallback(async (receiptId: string) => {
    showAlert("Delete Receipt", "Are you sure? This will remove all associated price history.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteReceipt({ receiptId: receiptId as Id<"receipts"> });
            if (selectedReceiptId === receiptId) setSelectedReceiptId(null);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            showToast("Receipt deleted", "success");
          } catch (error) {
            showToast((error as Error).message || "Failed to delete receipt", "error");
          }
        },
      },
    ]);
  }, [deleteReceipt, showAlert, showToast, selectedReceiptId]);

  const handleBulkApprove = useCallback(async () => {
    if (!flaggedReceipts || flaggedReceipts.length === 0) return;
    
    showAlert(
      "Bulk Approve", 
      `Are you sure you want to approve all ${flaggedReceipts.length} flagged receipts?`, 
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Approve All",
          onPress: async () => {
            const ids = flaggedReceipts.map((r) => r._id);
            try {
              const result = await bulkAction({ receiptIds: ids as Id<"receipts">[], action: "approve" });
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              showToast(`Approved ${result.count} receipts`, "success");
            } catch (error) {
              showToast((error as Error).message || "Failed to approve receipts", "error");
            }
          }
        }
      ]
    );
  }, [flaggedReceipts, bulkAction, showAlert, showToast]);

  const handleDeletePrice = useCallback(async (priceId: string) => {
    try {
      await overridePrice({ priceId: priceId as Id<"currentPrices">, deleteEntry: true });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      showToast("Price record removed", "success");
    } catch (error) {
      showToast((error as Error).message || "Failed to delete price", "error");
    }
  }, [overridePrice, showToast]);

  return (
    <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
      {/* Image Modal */}
      <Modal
        visible={!!selectedImage}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedImage(null)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setSelectedImage(null)}>
          <View style={styles.imageModalContent}>
            <View style={styles.imageModalHeader}>
              <Text style={styles.imageModalTitle}>Receipt Image</Text>
              <Pressable onPress={() => setSelectedImage(null)}>
                <MaterialCommunityIcons name="close" size={24} color={colors.text.primary} />
              </Pressable>
            </View>
            {selectedImage && <ReceiptImage storageId={selectedImage} />}
          </View>
        </Pressable>
      </Modal>

      {/* Edit Modal */}
      <Modal
        visible={!!editingReceipt}
        transparent
        animationType="slide"
        onRequestClose={() => setEditingReceipt(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Receipt</Text>
              <TouchableOpacity onPress={() => setEditingReceipt(null)}>
                <MaterialCommunityIcons name="close" size={24} color={colors.text.primary} />
              </TouchableOpacity>
            </View>
            
            <View style={{ gap: spacing.md }}>
              <View>
                <Text style={styles.fieldLabel}>Store Name</Text>
                <GlassInput
                  value={editForm.storeName}
                  onChangeText={(val) => setEditForm({ ...editForm, storeName: val })}
                />
              </View>
              <View>
                <Text style={styles.fieldLabel}>Total Amount (£)</Text>
                <GlassInput
                  value={editForm.total}
                  onChangeText={(val) => setEditForm({ ...editForm, total: val })}
                  keyboardType="numeric"
                />
              </View>
            </View>

            <View style={styles.modalActions}>
              <GlassButton onPress={() => setEditingReceipt(null)} variant="ghost" style={{ flex: 1 }}>
                Cancel
              </GlassButton>
              <GlassButton onPress={handleSaveEdit} style={{ flex: 1 }}>
                Save Changes
              </GlassButton>
            </View>
          </View>
        </View>
      </Modal>

      {/* Flagged Queue (Visual Moderation) */}
      {Array.isArray(flaggedReceipts) && flaggedReceipts.length > 0 && (
        <AnimatedSection animation="fadeInDown" duration={400} delay={0}>
          <GlassCard style={[styles.section, { paddingBottom: 0 }]}>
            <View style={styles.sectionHeader}>
              <MaterialCommunityIcons name="eye-check" size={24} color={colors.semantic.warning} />
              <Text style={styles.sectionTitle}>Moderation Queue ({flaggedReceipts.length})</Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={localStyles.thumbList}>
              {flaggedReceipts.map((r) => (
                <View key={r._id} style={localStyles.queueItem}>
                  <ReceiptThumbnail 
                    storageId={r.imageStorageId || ""} 
                    onPress={() => setSelectedImage(r.imageStorageId || null)} 
                  />
                  <Text style={localStyles.queueLabel} numberOfLines={1}>{r.storeName}</Text>
                  <Text style={localStyles.queueValue}>£{r.total.toFixed(2)}</Text>
                </View>
              ))}
            </ScrollView>
            <View style={{ padding: spacing.md, borderTopWidth: 1, borderTopColor: colors.glass.border }}>
              <GlassButton
                onPress={handleBulkApprove}
                variant="secondary"
                size="sm"
              >{`Approve All (${flaggedReceipts.length})`}</GlassButton>
            </View>
          </GlassCard>
        </AnimatedSection>
      )}

      {/* Search & Filters */}
      <GlassCard style={styles.section}>
        <View style={styles.searchRow}>
          <MaterialCommunityIcons name="magnify" size={20} color={colors.text.tertiary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search store, user..."
            placeholderTextColor={colors.text.tertiary}
            value={search}
            onChangeText={setSearch}
          />
          {(search.length > 0 || statusFilter) && (
            <Pressable onPress={handleSavePreset} hitSlop={12} style={{ padding: 4 }}>
              <MaterialCommunityIcons name="bookmark-plus-outline" size={20} color={colors.accent.primary} />
            </Pressable>
          )}
        </View>
        
        <View style={{ marginTop: spacing.sm }}>
          <SavedFilterPills tab="receipts" onSelect={handleApplyPreset} />
        </View>

        <View style={styles.filterRow}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm }}>
            {statusOptions.map((opt) => (
              <Pressable
                key={opt.value || "all"}
                style={[styles.filterChip, statusFilter === opt.value && styles.filterChipActive]}
                onPress={() => { setStatusFilter(opt.value); Haptics.selectionAsync(); }}
              >
                <Text style={[styles.filterChipText, statusFilter === opt.value && styles.filterChipTextActive]}>
                  {opt.label}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      </GlassCard>

      {/* Date Range Picker */}
      <GlassDateRangePicker 
        value={dateRange} 
        onChange={setDateRange} 
        onClear={() => setDateRange({ startDate: null, endDate: null })}
        title="Filter Receipts"
      />

      {/* Price Anomalies */}
      {Array.isArray(priceAnomalies) && priceAnomalies.length > 0 && (
        <AnimatedSection animation="fadeInDown" duration={400} delay={100}>
          <GlassCard style={styles.section}>
            <View style={styles.sectionHeader}>
              <MaterialCommunityIcons name="alert-circle" size={24} color={colors.semantic.danger} />
              <Text style={styles.sectionTitle}>Price Anomalies ({priceAnomalies.length})</Text>
            </View>
            {priceAnomalies.slice(0, 10).map((a) => (
              <View key={a._id} style={[styles.receiptRow, isMobile && { flexDirection: "column", alignItems: "flex-start", gap: 4 }]}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.userName}>{a.itemName}</Text>
                  <Text style={styles.userEmail}>
                    £{(a.unitPrice ?? 0).toFixed(2)} at {a.storeName} (avg: £{a.averagePrice ?? 0}, {a.deviation ?? 0}% off)
                  </Text>
                </View>
                <View style={{ width: isMobile ? "100%" : "auto", alignItems: "flex-end" }}>
                  {canDelete && (
                    <Pressable onPress={() => handleDeletePrice(a._id)} hitSlop={8}>
                      <MaterialCommunityIcons name="close-circle" size={20} color={colors.semantic.danger} />
                    </Pressable>
                  )}
                </View>
              </View>
            ))}
          </GlassCard>
        </AnimatedSection>
      )}

      {/* Recent Receipts */}
      {Array.isArray(recentReceipts) && recentReceipts.length > 0 && (
        <AnimatedSection animation="fadeInDown" duration={400} delay={200}>
          <GlassCard style={styles.section}>
            <Text style={styles.sectionTitle}>Recent Receipts</Text>
            {recentReceipts.map((r) => (
              <Pressable 
                key={r._id} 
                style={[styles.receiptRow, selectedReceiptId === r._id && { backgroundColor: `${colors.accent.primary}05` }, isMobile && { flexDirection: "column", alignItems: "flex-start", gap: 8 }]}
                onPress={() => handleSelectReceipt(r._id)}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.userName}>{r.storeName}</Text>
                  <Text style={styles.userEmail}>
                    £{(r.total ?? 0).toFixed(2)} • {r.userName} • {new Date(r.purchaseDate || Date.now()).toLocaleDateString()}
                  </Text>
                </View>
                <View style={{ flexDirection: "row", gap: spacing.md, alignItems: "center", width: isMobile ? "100%" : "auto", justifyContent: isMobile ? "space-between" : "flex-end" }}>
                  <View style={{ flexDirection: "row", gap: spacing.md, alignItems: "center" }}>
                    <Pressable onPress={() => handleStartEdit(r)} hitSlop={8}>
                      <MaterialCommunityIcons name="pencil-outline" size={18} color={colors.text.tertiary} />
                    </Pressable>
                    {r.imageStorageId && (
                      <Pressable onPress={() => setSelectedImage(r.imageStorageId || null)} hitSlop={8}>
                        <MaterialCommunityIcons name="eye-outline" size={20} color={colors.accent.primary} />
                      </Pressable>
                    )}
                    {canDelete && (
                      <Pressable onPress={() => handleDeleteReceipt(r._id)} hitSlop={8}>
                        <MaterialCommunityIcons name="delete-outline" size={18} color={colors.semantic.danger} />
                      </Pressable>
                    )}
                  </View>
                  <View style={[styles.statusBadge, r.processingStatus === "completed" ? styles.successBadge : styles.warningBadge]}>
                    <Text style={styles.statusBadgeText}>{r.processingStatus}</Text>
                  </View>
                </View>
              </Pressable>
            ))}
          </GlassCard>
        </AnimatedSection>
      )}

      <View style={{ height: 140 }} />
    </ScrollView>
  );
}

const localStyles = StyleSheet.create({
  thumbList: {
    paddingBottom: spacing.md,
  },
  thumbContainer: {
    width: 80,
    height: 100,
    borderRadius: 8,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.glass.border,
    backgroundColor: "rgba(0,0,0,0.2)",
  },
  thumbImage: {
    width: "100%",
    height: "100%",
  },
  queueItem: {
    width: 80,
    marginRight: spacing.md,
    gap: 4,
  },
  queueLabel: {
    ...typography.labelSmall,
    color: colors.text.secondary,
    fontSize: 9,
  },
  queueValue: {
    ...typography.labelSmall,
    color: colors.accent.primary,
    fontWeight: "700",
    fontSize: 10,
  },
});
