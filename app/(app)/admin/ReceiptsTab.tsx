import React, { useState, useCallback, useEffect, useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  TextInput,
  Pressable,
  Modal,
  ActivityIndicator,
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
  useGlassAlert,
  GlassDateRangePicker,
  type DateRange,
} from "@/components/ui/glass";
import { adminStyles as styles } from "./styles";
import { Receipt, PriceAnomaly } from "./types";
import type { Id } from "@/convex/_generated/dataModel";
import { useAdminToast } from "./hooks";

interface ReceiptsTabProps {
  /** Permission check function */
  hasPermission: (p: string) => boolean;
  /** Optional initial receipt ID to highlight (from global search) */
  initialReceiptId?: string;
  /** Callback when selection changes for breadcrumbs */
  onSelectionChange?: (label: string | null) => void;
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
  const { alert: showAlert } = useGlassAlert();
  const { showToast } = useAdminToast();
  const [dateRange, setDateRange] = useState<DateRange>({ startDate: null, endDate: null });
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedReceiptId, setSelectedReceiptId] = useState<string | null>(null);

  const canDelete = hasPermission("delete_receipts");

  // Handle initial receipt selection from global search or reset
  useEffect(() => {
    if (initialReceiptId === "RESET") {
      setSelectedReceiptId(null);
      setSearch("");
    } else if (initialReceiptId) {
      setSelectedReceiptId(initialReceiptId);
      // If searching, clear it to show the highlighted item
      if (search) setSearch("");
    }
  }, [initialReceiptId]);

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

  const statusOptions = [
    { label: "All", value: null },
    { label: "Pending", value: "pending" },
    { label: "Processing", value: "processing" },
    { label: "Completed", value: "completed" },
    { label: "Failed", value: "failed" },
  ];

  const handleSelectReceipt = useCallback((id: string) => {
    setSelectedReceiptId(id);
    Haptics.selectionAsync();
  }, []);

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
          {search.length > 0 && (
            <Pressable onPress={() => setSearch("")} hitSlop={8}>
              <MaterialCommunityIcons name="close-circle" size={18} color={colors.text.tertiary} />
            </Pressable>
          )}
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

      {/* Flagged Receipts */}
      {Array.isArray(flaggedReceipts) && flaggedReceipts.length > 0 && (
        <AnimatedSection animation="fadeInDown" duration={400} delay={0}>
          <GlassCard style={styles.section}>
            <View style={styles.sectionHeader}>
              <MaterialCommunityIcons name="flag" size={24} color={colors.semantic.warning} />
              <Text style={styles.sectionTitle}>Flagged ({flaggedReceipts.length})</Text>
            </View>
            {flaggedReceipts.slice(0, 10).map((r) => (
              <Pressable 
                key={r._id} 
                style={[styles.receiptRow, selectedReceiptId === r._id && { backgroundColor: `${colors.accent.primary}05` }]}
                onPress={() => handleSelectReceipt(r._id)}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.userName}>{r.storeName}</Text>
                  <Text style={styles.userEmail}>
                    £{r.total} • {r.userName} • {r.processingStatus}
                  </Text>
                </View>
                <View style={{ flexDirection: "row", gap: spacing.md, alignItems: "center" }}>
                  {r.imageStorageId && (
                    <Pressable onPress={() => setSelectedImage(r.imageStorageId || null)} hitSlop={8}>
                      <MaterialCommunityIcons name="eye-outline" size={20} color={colors.accent.primary} />
                    </Pressable>
                  )}
                  {canDelete && (
                    <Pressable onPress={() => handleDeleteReceipt(r._id)} hitSlop={8}>
                      <MaterialCommunityIcons name="delete-outline" size={20} color={colors.semantic.danger} />
                    </Pressable>
                  )}
                </View>
              </Pressable>
            ))}
            <GlassButton
              onPress={handleBulkApprove}
              variant="secondary"
              size="sm"
              style={{ marginTop: spacing.sm }}
            >{`Approve All (${flaggedReceipts.length})`}</GlassButton>
          </GlassCard>
        </AnimatedSection>
      )}

      {/* Price Anomalies */}
      {Array.isArray(priceAnomalies) && priceAnomalies.length > 0 && (
        <AnimatedSection animation="fadeInDown" duration={400} delay={100}>
          <GlassCard style={styles.section}>
            <View style={styles.sectionHeader}>
              <MaterialCommunityIcons name="alert-circle" size={24} color={colors.semantic.danger} />
              <Text style={styles.sectionTitle}>Price Anomalies ({priceAnomalies.length})</Text>
            </View>
            {priceAnomalies.slice(0, 10).map((a) => (
              <View key={a._id} style={styles.receiptRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.userName}>{a.itemName}</Text>
                  <Text style={styles.userEmail}>
                    £{(a.unitPrice ?? 0).toFixed(2)} at {a.storeName} (avg: £{a.averagePrice ?? 0}, {a.deviation ?? 0}% off)
                  </Text>
                </View>
                {canDelete && (
                  <Pressable onPress={() => handleDeletePrice(a._id)} hitSlop={8}>
                    <MaterialCommunityIcons name="close-circle" size={20} color={colors.semantic.danger} />
                  </Pressable>
                )}
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
                style={[styles.receiptRow, selectedReceiptId === r._id && { backgroundColor: `${colors.accent.primary}05` }]}
                onPress={() => handleSelectReceipt(r._id)}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.userName}>{r.storeName}</Text>
                  <Text style={styles.userEmail}>
                    £{(r.total ?? 0).toFixed(2)} • {r.userName} • {new Date(r.purchaseDate || Date.now()).toLocaleDateString()}
                  </Text>
                </View>
                <View style={{ flexDirection: "row", gap: spacing.md, alignItems: "center" }}>
                  {r.imageStorageId && (
                    <Pressable onPress={() => setSelectedImage(r.imageStorageId || null)} hitSlop={8}>
                      <MaterialCommunityIcons name="eye-outline" size={20} color={colors.accent.primary} />
                    </Pressable>
                  )}
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
