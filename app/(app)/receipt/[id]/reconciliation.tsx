import {
  View,
  Text,
  StyleSheet,
  ScrollView,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useState } from "react";
import type { Id } from "@/convex/_generated/dataModel";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import {
  GlassScreen,
  GlassCard,
  GlassButton,
  SimpleHeader,
  GlassSkeleton,
  colors,
  typography,
  spacing,
  useGlassAlert,
} from "@/components/ui/glass";

export default function ReconciliationScreen() {
  const params = useLocalSearchParams();
  const receiptId = params.id as string as Id<"receipts">;
  const listId = (params.listId as string) as Id<"shoppingLists"> | undefined;
  const router = useRouter();
  const { alert } = useGlassAlert();

  const receipt = useQuery(api.receipts.getById, { id: receiptId });
  const list = useQuery(
    api.shoppingLists.getById,
    listId ? { id: listId } : "skip"
  );
  const listItems = useQuery(
    api.listItems.getByList,
    listId ? { listId } : "skip"
  );

  // Multi-store: detect receipt/list store mismatch
  const mismatchInfo = useQuery(
    api.receipts.detectStoreMismatch,
    listId ? { receiptId, listId } : "skip"
  );

  // Smart unplanned items detection using multi-signal matcher
  const unplannedData = useQuery(
    api.itemMatching.identifyUnplannedItems,
    listId ? { receiptId, listId } : "skip"
  );

  const completeShopping = useMutation(api.shoppingLists.completeShopping);
  const archiveList = useMutation(api.shoppingLists.archiveList);
  const linkReceiptToList = useMutation(api.receipts.linkToList);
  const autoRestock = useMutation(api.pantryItems.autoRestockFromReceipt);
  const confirmFuzzyRestock = useMutation(api.pantryItems.confirmFuzzyRestock);
  const addFromReceipt = useMutation(api.pantryItems.addFromReceipt);
  const deleteReceipt = useMutation(api.receipts.remove);
  // (Old loyalty earnPoints removed — scan rewards handled at confirm step)

  const [isCompleting, setIsCompleting] = useState(false);
  const [restockResult, setRestockResult] = useState<{
    restockedCount: number;
    fuzzyMatches: {
      receiptItemName: string;
      pantryItemName: string;
      pantryItemId: string;
      similarity: number;
    }[];
    itemsToAdd: { name: string; category?: string }[];
  } | null>(null);
  const [mismatchChoice, setMismatchChoice] = useState<"tag" | "ignore" | null>(null);

  if (receipt === undefined || (listId && (list === undefined || listItems === undefined))) {
    return (
      <GlassScreen>
        <SimpleHeader title="Reconciliation" subtitle="Loading..." />
        <View style={styles.container}>
          <GlassSkeleton variant="card" />
          <GlassSkeleton variant="card" />
        </View>
      </GlassScreen>
    );
  }

  if (!receipt) {
    return (
      <GlassScreen>
        <SimpleHeader title="Reconciliation" subtitle="Receipt not found" />
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Receipt not found</Text>
          <GlassButton variant="primary" onPress={() => router.back()}>
            Go Back
          </GlassButton>
        </View>
      </GlassScreen>
    );
  }

  // If no list linked, show simple receipt summary
  if (!listId || !list || !listItems) {
    return (
      <GlassScreen>
        <SimpleHeader
          title="Receipt Saved"
          subtitle={receipt.storeName}
          showBack={true}
          onBack={() => {
            if (router.canGoBack()) {
              router.back();
            } else {
              router.replace("/(app)/(tabs)/scan" as any);
            }
          }}
        />        <ScrollView
          style={styles.container}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <GlassCard variant="bordered" accentColor={colors.semantic.success} style={styles.section}>
            <View style={styles.successHeader}>
              <MaterialCommunityIcons
                name="check-circle"
                size={48}
                color={colors.semantic.success}
              />
              <Text style={styles.successTitle}>Receipt Saved!</Text>
              <Text style={styles.successSubtitle}>
                Price history has been updated
              </Text>
            </View>
          </GlassCard>

          <GlassCard variant="standard" style={styles.section}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Total Spent</Text>
              <Text style={styles.summaryValue}>£{receipt.total.toFixed(2)}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Items</Text>
              <Text style={styles.summaryValue}>{receipt.items.length}</Text>
            </View>

            {/* Multi-store trip info */}
            {list?.storeSegments && list.storeSegments.length > 1 && (
              <View style={styles.multiStoreContainer}>
                <Text style={styles.multiStoreTitle}>Multi-Store Shopping Trip:</Text>
                {list.storeSegments.map((segment, idx) => (
                  <View key={idx} style={styles.segmentRow}>
                    <View style={[
                      styles.segmentDot, 
                      segment.storeName === receipt.storeName && styles.activeSegmentDot
                    ]} />
                    <Text style={[
                      styles.segmentText,
                      segment.storeName === receipt.storeName && styles.activeSegmentText
                    ]}>
                      {segment.storeName}
                    </Text>
                    <Text style={styles.segmentTime}>
                      {new Date(segment.switchedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </GlassCard>

          {/* Itemized List */}
          <GlassCard variant="standard" style={styles.section}>
            <View style={styles.sectionHeader}>
              <MaterialCommunityIcons name="format-list-bulleted" size={20} color={colors.accent.primary} />
              <Text style={styles.sectionTitle}>Itemized Details</Text>
            </View>
            
            {receipt.items.map((item, idx) => (
              <View key={idx} style={styles.receiptItemRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.receiptItemName}>{item.name}</Text>
                  <Text style={styles.receiptItemQty}>Qty: {item.quantity}</Text>
                </View>
                <Text style={styles.receiptItemPrice}>£{item.totalPrice.toFixed(2)}</Text>
              </View>
            ))}
          </GlassCard>

          <GlassButton
            variant="primary"
            size="lg"
            icon="clipboard-plus"
            onPress={() => router.push(`/(app)/create-list-from-receipt?receiptId=${receiptId}` as never)}
            style={{ marginBottom: spacing.md }}
          >
            Create List from Receipt
          </GlassButton>

          <View style={styles.secondaryActionsRow}>
            <View style={{ flex: 1 }}>
              <GlassButton
                variant="secondary"
                size="md"
                icon="fridge-outline"
                onPress={async () => {
                  try {
                    const items = receipt.items.map((item: any) => ({
                      name: item.name,
                      category: item.category ?? "Uncategorised",
                      estimatedPrice: item.quantity > 1 ? item.unitPrice : item.totalPrice,
                    }));
                    await autoRestock({ receiptId }); // Using existing mutation for consistency
                    alert("Pantry Updated", "Items from this receipt have been added to your pantry.");
                  } catch (e) {
                    alert("Error", "Failed to update pantry");
                  }
                }}
              >
                Add to Pantry
              </GlassButton>
            </View>
            <View style={{ flex: 1 }}>
              <GlassButton
                variant="secondary"
                size="md"
                icon="check"
                onPress={async () => {
                  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                  router.push("/(app)/(tabs)/" as any);
                }}
              >
                Done
              </GlassButton>
            </View>
          </View>

          <GlassButton
            variant="secondary"
            size="md"
            icon="delete-outline"
            onPress={() => {
              alert("Delete Receipt", "Are you sure? This cannot be undone.", [
                { text: "Cancel", style: "cancel" },
                { 
                  text: "Delete", 
                  style: "destructive", 
                  onPress: async () => {
                    await deleteReceipt({ id: receiptId });
                    router.replace("/(app)/(tabs)/scan" as any);
                  } 
                }
              ]);
            }}
            style={{ marginTop: spacing.sm }}
          >
            Delete Receipt
          </GlassButton>

          <View style={styles.bottomSpacer} />
        </ScrollView>
      </GlassScreen>
    );
  }

  // Calculate reconciliation data
  const budget = list.budget || 0;
  const actualTotal = receipt.total;
  const difference = budget - actualTotal;
  const savedMoney = difference > 0;
  const percentSaved = budget > 0 ? (difference / budget) * 100 : 0;

  // Calculate planned vs actual items
  const plannedItemsCount = listItems.length;
  const actualItemsCount = receipt.items.length;

  // Use smart matching to identify truly unplanned purchases
  // (items that don't match any list item even with fuzzy matching + learned patterns)
  const unplannedItems = unplannedData?.unplannedItems || [];
  const unplannedItemsTotal = unplannedData?.totalUnplanned || 0;

  // Handle complete trip
  async function handleCompleteTrip() {
    if (!listId) return;

    setIsCompleting(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      // Step 1: Link receipt to list
      await linkReceiptToList({
        receiptId,
        listId,
      });

      // Step 1b: Handle store mismatch — tag items with receipt's store if user chose "tag"
      if (mismatchChoice === "tag" && receipt?.normalizedStoreId) {
        // The linkToList mutation already tags matched items with purchasedAtStoreId
        // from the receipt, so no additional action needed — it's handled in the backend
      }

      // Step 2: Complete the shopping trip
      await completeShopping({ id: listId });

      // Step 3: Auto-restock pantry from receipt
      const result = await autoRestock({ receiptId });

      setRestockResult({
        restockedCount: result.restockedItems.length,
        fuzzyMatches: result.fuzzyMatches,
        itemsToAdd: result.itemsToAdd,
      });

      // Step 4: Archive the list with trip summary data
      await archiveList({
        id: listId,
        receiptId,
        actualTotal,
        pointsEarned: 0,
      });

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      // Show success message with restock count + points
      const restockMessage =
        result.restockedItems.length > 0
          ? `Pantry updated: ${result.restockedItems.length} item${result.restockedItems.length !== 1 ? "s" : ""} restocked`
          : "";

      const savingsMessage = savedMoney
        ? `Great job! You saved £${Math.abs(difference).toFixed(2)}!`
        : "Shopping trip completed successfully";

      const messageParts = [savingsMessage, restockMessage].filter(Boolean);
      const fullMessage = messageParts.join("\n\n");

      // Navigate to history tab after completion
      const navigateToHistory = () => router.push("/(app)/(tabs)/" as any);

      // Handle fuzzy matches and items to add
      if (result.fuzzyMatches.length > 0 || result.itemsToAdd.length > 0) {
        alert("Trip Archived!", fullMessage, [
          {
            text: "Review Pantry Updates",
            onPress: () => handleFuzzyMatchesAndNewItems(),
          },
          {
            text: "View History",
            onPress: navigateToHistory,
          },
        ]);
      } else {
        alert("Trip Archived!", fullMessage, [
          {
            text: "View History",
            onPress: navigateToHistory,
          },
        ]);
      }
    } catch (error) {
      console.error("Failed to complete trip:", error);
      alert("Error", "Failed to complete shopping trip");
    } finally {
      setIsCompleting(false);
    }
  }

  // Handle fuzzy matches and items to add
  async function handleFuzzyMatchesAndNewItems() {
    if (!restockResult) return;

    const { fuzzyMatches, itemsToAdd } = restockResult;

    // Handle fuzzy matches first
    for (const match of fuzzyMatches) {
      await new Promise<void>((resolve) => {
        alert(
          "Restock Item?",
          `Receipt has "${match.receiptItemName}"\nRestock "${match.pantryItemName}" (${match.similarity.toFixed(0)}% match)?`,
          [
            {
              text: "Skip",
              style: "cancel",
              onPress: () => resolve(),
            },
            {
              text: "Restock",
              onPress: async () => {
                try {
                  await confirmFuzzyRestock({ pantryItemId: match.pantryItemId as any });
                  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                } catch (error) {
                  console.error("Failed to restock:", error);
                }
                resolve();
              },
            },
          ]
        );
      });
    }

    // Handle items to add
    for (const item of itemsToAdd) {
      await new Promise<void>((resolve) => {
        alert("Add to Pantry?", `Add "${item.name}" to your pantry?`, [
          {
            text: "Skip",
            style: "cancel",
            onPress: () => resolve(),
          },
          {
            text: "Add",
            onPress: async () => {
              try {
                await addFromReceipt({ name: item.name, category: item.category });
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              } catch (error) {
                console.error("Failed to add item:", error);
              }
              resolve();
            },
          },
        ]);
      });
    }

    // All done - navigate to home
    router.push("/(app)/(tabs)/" as any);
  }

  return (
    <GlassScreen>
      <SimpleHeader
        title="Trip Summary"
        subtitle={savedMoney ? "Well done!" : "Shopping complete"}
      />

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Success/Over Budget Card */}
        {savedMoney ? (
          <GlassCard variant="bordered" accentColor={colors.semantic.success} style={styles.section}>
            <View style={styles.celebrationHeader}>
              <MaterialCommunityIcons
                name="party-popper"
                size={56}
                color={colors.semantic.success}
              />
              <Text style={styles.celebrationTitle}>
                Amazing! You saved £{Math.abs(difference).toFixed(2)}! 🎉
              </Text>
              <Text style={styles.celebrationSubtitle}>
                {percentSaved.toFixed(0)}% under budget
              </Text>
            </View>
          </GlassCard>
        ) : (
          <GlassCard variant="bordered" accentColor={colors.semantic.warning} style={styles.section}>
            <View style={styles.celebrationHeader}>
              <MaterialCommunityIcons
                name="alert-circle-outline"
                size={48}
                color={colors.semantic.warning}
              />
              <Text style={styles.overspendTitle}>
                Went over by £{Math.abs(difference).toFixed(2)}
              </Text>
              <Text style={styles.overspendSubtitle}>
                No worries, it happens!
              </Text>
            </View>
          </GlassCard>
        )}

        {/* Budget Comparison Card */}
        <GlassCard variant="standard" style={styles.section}>
          <View style={styles.sectionHeader}>
            <MaterialCommunityIcons
              name="wallet-outline"
              size={20}
              color={colors.accent.primary}
            />
            <Text style={styles.sectionTitle}>Budget Breakdown</Text>
          </View>

          <View style={styles.comparisonGrid}>
            <View style={styles.comparisonItem}>
              <Text style={styles.comparisonLabel}>Budget</Text>
              <Text style={styles.comparisonValue}>£{budget.toFixed(2)}</Text>
            </View>

            <View style={styles.comparisonItem}>
              <Text style={styles.comparisonLabel}>Actual Spent</Text>
              <Text style={[styles.comparisonValue, !savedMoney && styles.overspendValue]}>
                £{actualTotal.toFixed(2)}
              </Text>
            </View>

            <View style={[styles.comparisonItem, styles.highlightItem]}>
              <Text style={styles.comparisonLabel}>Difference</Text>
              <Text style={[
                styles.comparisonValue,
                styles.differenceValue,
                { color: savedMoney ? colors.semantic.success : colors.semantic.danger }
              ]}>
                {savedMoney ? '+' : ''}£{Math.abs(difference).toFixed(2)}
              </Text>
            </View>
          </View>
        </GlassCard>

        {/* Items Comparison Card */}
        <GlassCard variant="standard" style={styles.section}>
          <View style={styles.sectionHeader}>
            <MaterialCommunityIcons
              name="cart-outline"
              size={20}
              color={colors.accent.primary}
            />
            <Text style={styles.sectionTitle}>Items Breakdown</Text>
          </View>

          <View style={styles.itemsComparison}>
            <View style={styles.itemsRow}>
              <Text style={styles.itemsLabel}>Items Planned</Text>
              <Text style={styles.itemsValue}>{plannedItemsCount}</Text>
            </View>

            <View style={styles.itemsRow}>
              <Text style={styles.itemsLabel}>Items Purchased</Text>
              <Text style={styles.itemsValue}>
                {actualItemsCount}
                {unplannedItems.length > 0 && (
                  <Text style={styles.unplannedBadge}>
                    {' '}({unplannedItems.length} unplanned)
                  </Text>
                )}
              </Text>
            </View>
          </View>
        </GlassCard>

        {/* Unplanned Purchases Card */}
        {unplannedItems.length > 0 && (
          <GlassCard variant="bordered" accentColor={colors.accent.secondary} style={styles.section}>
            <View style={styles.sectionHeader}>
              <MaterialCommunityIcons
                name="lightning-bolt"
                size={20}
                color={colors.accent.secondary}
              />
              <Text style={styles.sectionTitle}>
                Unplanned Purchases ({unplannedItems.length})
              </Text>
            </View>

            <View style={styles.unplannedList}>
              {unplannedItems.map((item, index) => (
                <View key={index} style={styles.unplannedItem}>
                  <View style={styles.unplannedLeft}>
                    <Text style={styles.unplannedName}>{item.name}</Text>
                    <Text style={styles.unplannedQuantity}>×{item.quantity}</Text>
                  </View>
                  <Text style={styles.unplannedPrice}>
                    £{item.totalPrice.toFixed(2)}
                  </Text>
                </View>
              ))}

              <View style={styles.unplannedTotal}>
                <Text style={styles.unplannedTotalLabel}>Unplanned Total</Text>
                <Text style={styles.unplannedTotalValue}>
                  £{unplannedItemsTotal.toFixed(2)}
                </Text>
              </View>
            </View>
          </GlassCard>
        )}

        {/* Store Mismatch Warning */}
        {mismatchInfo?.isMismatch && mismatchChoice === null && (
          <GlassCard variant="bordered" accentColor={colors.semantic.warning} style={styles.section}>
            <View style={styles.sectionHeader}>
              <MaterialCommunityIcons
                name="alert-outline"
                size={20}
                color={colors.semantic.warning}
              />
              <Text style={styles.sectionTitle}>Store Mismatch</Text>
            </View>
            <Text style={styles.mismatchText}>
              This receipt is from{" "}
              <Text style={{ fontWeight: "700" }}>{mismatchInfo.receiptStore}</Text>
              , but your list was for{" "}
              <Text style={{ fontWeight: "700" }}>{mismatchInfo.listStore}</Text>.
            </Text>
            <View style={styles.mismatchActions}>
              <GlassButton
                variant="secondary"
                size="sm"
                icon="tag-outline"
                onPress={() => setMismatchChoice("tag")}
                style={styles.mismatchButton}
              >
                {`Tag items as ${mismatchInfo.receiptStore}`}
              </GlassButton>
              <GlassButton
                variant="secondary"
                size="sm"
                icon="close"
                onPress={() => setMismatchChoice("ignore")}
                style={styles.mismatchButton}
              >
                {`Keep as ${mismatchInfo.listStore}`}
              </GlassButton>
            </View>
          </GlassCard>
        )}

        {/* Mismatch resolved */}
        {mismatchInfo?.isMismatch && mismatchChoice !== null && (
          <View style={styles.mismatchResolved}>
            <MaterialCommunityIcons
              name="check-circle-outline"
              size={16}
              color={colors.text.tertiary}
            />
            <Text style={styles.mismatchResolvedText}>
              {mismatchChoice === "tag"
                ? `Items will be tagged as ${mismatchInfo.receiptStore}`
                : `Items will stay as ${mismatchInfo.listStore}`}
            </Text>
          </View>
        )}

        {/* Complete Trip Button */}
        <GlassButton
          variant="primary"
          size="lg"
          icon="check-circle-outline"
          onPress={handleCompleteTrip}
          loading={isCompleting}
          disabled={isCompleting}
        >
          Complete Trip
        </GlassButton>

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </GlassScreen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
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

  // Success/Celebration
  successHeader: {
    alignItems: "center",
    paddingVertical: spacing.lg,
  },
  successTitle: {
    ...typography.headlineMedium,
    color: colors.semantic.success,
    marginTop: spacing.md,
    textAlign: "center",
  },
  successSubtitle: {
    ...typography.bodyMedium,
    color: colors.text.secondary,
    marginTop: spacing.xs,
    textAlign: "center",
  },
  celebrationHeader: {
    alignItems: "center",
    paddingVertical: spacing.xl,
  },
  celebrationTitle: {
    ...typography.headlineMedium,
    color: colors.semantic.success,
    marginTop: spacing.md,
    textAlign: "center",
    fontWeight: "700",
  },
  celebrationSubtitle: {
    ...typography.bodyMedium,
    color: colors.text.secondary,
    marginTop: spacing.xs,
    textAlign: "center",
  },
  overspendTitle: {
    ...typography.headlineMedium,
    color: colors.semantic.warning,
    marginTop: spacing.md,
    textAlign: "center",
  },
  overspendSubtitle: {
    ...typography.bodyMedium,
    color: colors.text.secondary,
    marginTop: spacing.xs,
    textAlign: "center",
  },

  // Summary
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.glass.border,
  },
  summaryLabel: {
    ...typography.bodyMedium,
    color: colors.text.secondary,
  },
  summaryValue: {
    ...typography.labelLarge,
    color: colors.text.primary,
    fontWeight: "600",
  },

  // Multi-store trip
  multiStoreContainer: {
    marginTop: spacing.md,
    marginBottom: spacing.xs,
    padding: spacing.md,
    backgroundColor: `${colors.accent.primary}08`,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: `${colors.accent.primary}20`,
  },
  multiStoreTitle: {
    ...typography.labelSmall,
    color: colors.text.secondary,
    marginBottom: spacing.sm,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  segmentRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.xs,
    gap: spacing.sm,
  },
  segmentDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.glass.borderStrong,
  },
  activeSegmentDot: {
    backgroundColor: colors.accent.primary,
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  segmentText: {
    ...typography.bodyMedium,
    color: colors.text.secondary,
    flex: 1,
  },
  activeSegmentText: {
    color: colors.text.primary,
    fontWeight: "700",
  },
  segmentTime: {
    ...typography.bodySmall,
    color: colors.text.tertiary,
    fontSize: 10,
  },

  // Footer Actions
  secondaryActionsRow: {
    flexDirection: "row",
    gap: spacing.md,
  },

  // Budget Comparison
  comparisonGrid: {
    gap: spacing.md,
  },
  comparisonItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: spacing.sm,
  },
  highlightItem: {
    backgroundColor: colors.glass.background,
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    marginTop: spacing.xs,
  },
  comparisonLabel: {
    ...typography.bodyMedium,
    color: colors.text.secondary,
  },
  comparisonValue: {
    ...typography.labelLarge,
    color: colors.text.primary,
    fontWeight: "700",
  },
  differenceValue: {
    fontSize: 20,
  },
  overspendValue: {
    color: colors.semantic.danger,
  },

  // Items Comparison
  itemsComparison: {
    gap: spacing.sm,
  },
  itemsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.glass.border,
  },
  itemsLabel: {
    ...typography.bodyMedium,
    color: colors.text.secondary,
  },
  itemsValue: {
    ...typography.labelLarge,
    color: colors.text.primary,
    fontWeight: "600",
  },
  unplannedBadge: {
    ...typography.bodySmall,
    color: colors.accent.secondary,
  },

  // Unplanned Purchases
  unplannedList: {
    gap: spacing.sm,
  },
  unplannedItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.glass.border,
  },
  unplannedLeft: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  unplannedName: {
    ...typography.bodyMedium,
    color: colors.text.primary,
    flex: 1,
  },
  unplannedQuantity: {
    ...typography.bodySmall,
    color: colors.text.tertiary,
  },
  unplannedPrice: {
    ...typography.labelMedium,
    color: colors.text.primary,
    fontWeight: "600",
  },
  unplannedTotal: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: spacing.md,
    marginTop: spacing.sm,
    borderTopWidth: 2,
    borderTopColor: colors.accent.secondary,
  },
  unplannedTotalLabel: {
    ...typography.labelMedium,
    color: colors.accent.secondary,
    fontWeight: "600",
  },
  unplannedTotalValue: {
    ...typography.labelLarge,
    color: colors.accent.secondary,
    fontWeight: "700",
  },

  // Store Mismatch
  mismatchText: {
    ...typography.bodyMedium,
    color: colors.text.secondary,
    marginBottom: spacing.md,
    lineHeight: 22,
  },
  mismatchActions: {
    gap: spacing.sm,
  },
  mismatchButton: {
    marginBottom: spacing.xs,
  },
  mismatchResolved: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: spacing.md,
    paddingHorizontal: spacing.xs,
  },
  mismatchResolvedText: {
    ...typography.bodySmall,
    color: colors.text.tertiary,
    fontStyle: "italic",
  },

  bottomSpacer: {
    height: 140,
  },
  receiptItemRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.glass.border,
  },
  receiptItemName: {
    ...typography.bodyMedium,
    color: colors.text.primary,
    marginBottom: 2,
  },
  receiptItemQty: {
    ...typography.bodySmall,
    color: colors.text.tertiary,
  },
  receiptItemPrice: {
    ...typography.labelMedium,
    color: colors.text.primary,
    fontWeight: "600",
  },
});
