import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  ActivityIndicator,
} from "react-native";
import { useState, useMemo, useCallback } from "react";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import * as Haptics from "expo-haptics";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import {
  GlassScreen,
  GlassCard,
  GlassButton,
  GlassHeader,
  GlassToast,
  colors,
  typography,
  spacing,
  borderRadius,
  useGlassAlert,
} from "@/components/ui/glass";
import { useDelightToast } from "@/hooks/useDelightToast";
import { getStoreInfoSafe } from "@/convex/lib/storeNormalizer";

const MAX_LIST_NAME_LENGTH = 30;

// ─── Types ───────────────────────────────────────────────────────────────────

type ReceiptItem = {
  name: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  category?: string;
  size?: string;
  unit?: string;
};

type Receipt = {
  _id: Id<"receipts">;
  storeName: string;
  normalizedStoreId?: string;
  total: number;
  purchaseDate: number;
  items: ReceiptItem[];
  processingStatus: string;
};

// ─── Screen ──────────────────────────────────────────────────────────────────

export default function CreateListFromReceiptScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ receiptId?: string }>();
  const { alert } = useGlassAlert();
  const { toast, dismiss, showToast } = useDelightToast();

  // Queries
  const receipts = useQuery(api.receipts.getByUser, {});
  const createFromReceipt = useMutation(api.shoppingLists.createFromReceipt);

  // State
  const [selectedReceiptId, setSelectedReceiptId] = useState<Id<"receipts"> | null>(
    params.receiptId ? (params.receiptId as Id<"receipts">) : null
  );
  const [listName, setListName] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  // Filter to completed receipts with items
  const validReceipts = useMemo(() => {
    if (!receipts) return [];
    return receipts.filter(
      (r) => r.processingStatus === "completed" && r.items && r.items.length > 0
    ) as Receipt[];
  }, [receipts]);

  // Selected receipt data
  const selectedReceipt = useMemo(() => {
    if (!selectedReceiptId) return null;
    return validReceipts.find((r) => r._id === selectedReceiptId) ?? null;
  }, [selectedReceiptId, validReceipts]);

  // Auto-set list name when receipt is selected
  const effectiveListName = listName || (selectedReceipt ? `${selectedReceipt.storeName} Re-shop` : "");
  const effectiveBudget = selectedReceipt
    ? Math.ceil(selectedReceipt.total / 5) * 5
    : 0;

  // ─── Handlers ────────────────────────────────────────────────────────────

  function handleSelectReceipt(receiptId: Id<"receipts">) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedReceiptId(receiptId);
    setListName(""); // Reset to let auto-name kick in
  }

  const handleBackToPicker = useCallback(() => {
    if (isCreating) return; // Prevent navigation while creating
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedReceiptId(null);
    setListName("");
  }, [isCreating]);

  const handleCreateList = useCallback(async () => {
    if (!selectedReceiptId || !selectedReceipt || isCreating) return;

    setIsCreating(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const listId = await createFromReceipt({
        receiptId: selectedReceiptId,
        name: effectiveListName.trim() || undefined,
        budget: effectiveBudget,
      });

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      const itemCount = selectedReceipt.items.length;
      showToast(
        `List created with ${itemCount} item${itemCount !== 1 ? "s" : ""}!`,
        "clipboard-check",
        colors.accent.primary
      );

      // Brief delay so user sees the success toast, then navigate
      setTimeout(() => {
        router.replace(`/list/${listId}` as never);
      }, 800);
    } catch (error: unknown) {
      setIsCreating(false);
      const msg = error instanceof Error ? error.message : "";
      if (msg.includes("limit") || msg.includes("Upgrade") || msg.includes("Premium")) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        alert(
          "List Limit Reached",
          "Free plan allows up to 3 active lists. Upgrade to Premium for unlimited lists.",
          [
            { text: "Maybe Later", style: "cancel" },
            { text: "Upgrade", onPress: () => router.push("/(app)/subscription" as never) },
          ]
        );
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        alert("Error", "Failed to create list. Please try again.");
      }
    }
  }, [selectedReceiptId, selectedReceipt, isCreating, effectiveListName, effectiveBudget, createFromReceipt, showToast, alert, router]);

  // ─── Helpers ─────────────────────────────────────────────────────────────

  function formatDate(timestamp: number): string {
    const d = new Date(timestamp);
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = String(d.getFullYear()).slice(-2);
    return `${day}/${month}/${year}`;
  }

  function getStoreColor(normalizedStoreId?: string): string {
    if (!normalizedStoreId) return colors.text.tertiary;
    return getStoreInfoSafe(normalizedStoreId)?.color ?? colors.text.tertiary;
  }

  // ─── Loading State ───────────────────────────────────────────────────────

  if (receipts === undefined) {
    return (
      <GlassScreen>
        <GlassHeader title="Create from Receipt" showBack onBack={() => router.back()} />
        <View style={styles.centered}>
          <ActivityIndicator color={colors.accent.primary} size="large" />
        </View>
      </GlassScreen>
    );
  }

  // ─── Receipt Preview + Confirmation ──────────────────────────────────────

  if (selectedReceipt) {
    const storeColor = getStoreColor(selectedReceipt.normalizedStoreId);

    return (
      <GlassScreen>
        <GlassHeader
          title="Review Receipt"
          showBack
          onBack={handleBackToPicker}
        />

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Receipt Header */}
          <GlassCard style={styles.receiptHeader}>
            <View style={styles.receiptHeaderRow}>
              <View style={[styles.storeDot, { backgroundColor: storeColor }]} />
              <View style={styles.receiptHeaderText}>
                <Text style={styles.receiptStoreName}>{selectedReceipt.storeName}</Text>
                <Text style={styles.receiptDate}>
                  {formatDate(selectedReceipt.purchaseDate)}
                </Text>
              </View>
              <Text style={styles.receiptTotal}>
                £{selectedReceipt.total.toFixed(2)}
              </Text>
            </View>
          </GlassCard>

          {/* Item List */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>
              Items ({selectedReceipt.items.length})
            </Text>

            <GlassCard style={styles.itemListCard}>
              {selectedReceipt.items.map((item, index) => (
                <View
                  key={`${item.name}-${index}`}
                  style={[
                    styles.itemRow,
                    index < selectedReceipt.items.length - 1 && styles.itemRowBorder,
                  ]}
                >
                  <View style={styles.itemInfo}>
                    <Text style={styles.itemName} numberOfLines={1}>
                      {item.name}
                    </Text>
                    {(item.size || item.quantity > 1) && (
                      <Text style={styles.itemMeta}>
                        {[
                          item.quantity > 1 ? `x${item.quantity}` : null,
                          item.size,
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </Text>
                    )}
                  </View>
                  <Text style={styles.itemPrice}>
                    £{item.unitPrice.toFixed(2)}
                  </Text>
                </View>
              ))}
            </GlassCard>
          </View>

          {/* List Settings */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>List Settings</Text>

            <GlassCard style={styles.settingsCard}>
              {/* Name Input */}
              <View style={styles.settingRow}>
                <Text style={styles.settingLabel}>Name</Text>
                <View style={styles.nameInputWrap}>
                  <TextInput
                    style={styles.nameInput}
                    value={effectiveListName}
                    onChangeText={(text) => setListName(text.slice(0, MAX_LIST_NAME_LENGTH))}
                    placeholder="List name"
                    placeholderTextColor={colors.text.tertiary}
                    maxLength={MAX_LIST_NAME_LENGTH}
                    editable={!isCreating}
                  />
                  <Text
                    style={[
                      styles.charCount,
                      effectiveListName.length > MAX_LIST_NAME_LENGTH - 5 && styles.charCountWarning,
                    ]}
                  >
                    {MAX_LIST_NAME_LENGTH - effectiveListName.length}
                  </Text>
                </View>
              </View>

              {/* Budget Display */}
              <View style={[styles.settingRow, styles.settingRowLast]}>
                <Text style={styles.settingLabel}>Budget</Text>
                <Text style={styles.budgetValue}>£{effectiveBudget}</Text>
              </View>
            </GlassCard>
          </View>

          {/* CTA */}
          <GlassButton
            variant="primary"
            size="lg"
            icon="plus"
            onPress={handleCreateList}
            loading={isCreating}
            disabled={isCreating}
            style={styles.createCta}
          >
            {`Create List (${selectedReceipt.items.length} items)`}
          </GlassButton>

          <View style={styles.bottomSpacer} />
        </ScrollView>

        {/* Success toast */}
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

  // ─── Receipt Picker ──────────────────────────────────────────────────────

  return (
    <GlassScreen>
      <GlassHeader title="Create from Receipt" showBack onBack={() => router.back()} />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Scan New Receipt CTA */}
        <Pressable
          style={styles.scanCta}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            router.push("/(app)/(tabs)/scan?returnTo=create-list-from-receipt" as never);
          }}
        >
          <View style={styles.scanCtaIcon}>
            <MaterialCommunityIcons
              name="camera"
              size={28}
              color={colors.accent.primary}
            />
          </View>
          <View style={styles.scanCtaText}>
            <Text style={styles.scanCtaTitle}>Scan a New Receipt</Text>
            <Text style={styles.scanCtaDesc}>
              Have a receipt? Scan it and we'll build your list
            </Text>
          </View>
          <MaterialCommunityIcons
            name="chevron-right"
            size={24}
            color={colors.text.tertiary}
          />
        </Pressable>

        {/* Past Receipts */}
        {validReceipts.length > 0 ? (
          <>
            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>Or pick a past receipt</Text>
              <View style={styles.dividerLine} />
            </View>

            {validReceipts.map((receipt) => {
              const storeColor = getStoreColor(receipt.normalizedStoreId);

              return (
                <Pressable
                  key={receipt._id}
                  style={styles.receiptCard}
                  onPress={() => handleSelectReceipt(receipt._id)}
                >
                  <View style={[styles.storeDot, { backgroundColor: storeColor }]} />
                  <View style={styles.receiptCardInfo}>
                    <Text style={styles.receiptCardStore}>{receipt.storeName}</Text>
                    <Text style={styles.receiptCardMeta}>
                      {formatDate(receipt.purchaseDate)} · {receipt.items.length} item
                      {receipt.items.length !== 1 ? "s" : ""}
                    </Text>
                  </View>
                  <Text style={styles.receiptCardTotal}>
                    £{receipt.total.toFixed(2)}
                  </Text>
                  <MaterialCommunityIcons
                    name="chevron-right"
                    size={20}
                    color={colors.text.tertiary}
                  />
                </Pressable>
              );
            })}
          </>
        ) : (
          <View style={styles.emptyState}>
            <MaterialCommunityIcons
              name="receipt"
              size={48}
              color={colors.text.tertiary}
            />
            <Text style={styles.emptyTitle}>No receipts yet</Text>
            <Text style={styles.emptyDesc}>
              Scan a receipt above to get started
            </Text>
          </View>
        )}

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </GlassScreen>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
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

  // ── Scan CTA ────────────────────────────────────────────────────────────

  scanCta: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: `${colors.accent.primary}08`,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: `${colors.accent.primary}30`,
    padding: spacing.lg,
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  scanCtaIcon: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.md,
    backgroundColor: `${colors.accent.primary}15`,
    justifyContent: "center",
    alignItems: "center",
  },
  scanCtaText: {
    flex: 1,
    gap: 2,
  },
  scanCtaTitle: {
    ...typography.bodyLarge,
    color: colors.accent.primary,
    fontWeight: "700",
  },
  scanCtaDesc: {
    ...typography.bodySmall,
    color: colors.text.tertiary,
  },

  // ── Divider ─────────────────────────────────────────────────────────────

  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.glass.border,
  },
  dividerText: {
    ...typography.labelSmall,
    color: colors.text.tertiary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },

  // ── Receipt Card (Picker) ───────────────────────────────────────────────

  receiptCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.glass.background,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.glass.border,
    padding: spacing.md,
    gap: spacing.md,
    marginBottom: spacing.sm,
  },
  storeDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  receiptCardInfo: {
    flex: 1,
    gap: 2,
  },
  receiptCardStore: {
    ...typography.bodyMedium,
    color: colors.text.primary,
    fontWeight: "600",
  },
  receiptCardMeta: {
    ...typography.bodySmall,
    color: colors.text.tertiary,
  },
  receiptCardTotal: {
    ...typography.bodyMedium,
    color: colors.text.primary,
    fontWeight: "700",
  },

  // ── Empty State ─────────────────────────────────────────────────────────

  emptyState: {
    alignItems: "center",
    paddingVertical: spacing["3xl"],
    gap: spacing.sm,
  },
  emptyTitle: {
    ...typography.bodyLarge,
    color: colors.text.secondary,
    fontWeight: "600",
  },
  emptyDesc: {
    ...typography.bodySmall,
    color: colors.text.tertiary,
  },

  // ── Receipt Preview ─────────────────────────────────────────────────────

  receiptHeader: {
    marginBottom: spacing.md,
  },
  receiptHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  receiptHeaderText: {
    flex: 1,
    gap: 2,
  },
  receiptStoreName: {
    ...typography.headlineSmall,
    color: colors.text.primary,
    fontWeight: "700",
  },
  receiptDate: {
    ...typography.bodySmall,
    color: colors.text.tertiary,
  },
  receiptTotal: {
    ...typography.headlineMedium,
    color: colors.accent.primary,
    fontWeight: "700",
  },

  // ── Item List ───────────────────────────────────────────────────────────

  section: {
    marginBottom: spacing.md,
  },
  sectionLabel: {
    ...typography.labelMedium,
    color: colors.text.secondary,
    marginBottom: spacing.sm,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  itemListCard: {
    paddingVertical: 0,
  },
  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
  },
  itemRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.glass.border,
  },
  itemInfo: {
    flex: 1,
    gap: 2,
    marginRight: spacing.md,
  },
  itemName: {
    ...typography.bodyMedium,
    color: colors.text.primary,
  },
  itemMeta: {
    ...typography.bodySmall,
    color: colors.text.tertiary,
  },
  itemPrice: {
    ...typography.bodyMedium,
    color: colors.text.primary,
    fontWeight: "600",
  },

  // ── Settings Card ───────────────────────────────────────────────────────

  settingsCard: {
    paddingVertical: 0,
    paddingHorizontal: 0,
  },
  settingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.glass.border,
  },
  settingRowLast: {
    borderBottomWidth: 0,
  },
  settingLabel: {
    ...typography.bodyMedium,
    color: colors.text.secondary,
    marginRight: spacing.md,
  },
  nameInputWrap: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  nameInput: {
    flex: 1,
    ...typography.bodyMedium,
    color: colors.text.primary,
    textAlign: "right",
    paddingVertical: 0,
  },
  charCount: {
    ...typography.labelSmall,
    color: colors.text.tertiary,
    minWidth: 16,
    textAlign: "right",
  },
  charCountWarning: {
    color: colors.semantic.warning,
  },
  budgetValue: {
    ...typography.bodyMedium,
    color: colors.accent.primary,
    fontWeight: "700",
  },

  // ── CTA ─────────────────────────────────────────────────────────────────

  createCta: {
    marginTop: spacing.sm,
  },
});
