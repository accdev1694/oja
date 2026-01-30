import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  Platform,
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
} from "@/components/ui/glass";

export default function ReconciliationScreen() {
  const params = useLocalSearchParams();
  const receiptId = params.id as string as Id<"receipts">;
  const listId = (params.listId as string) as Id<"shoppingLists"> | undefined;
  const router = useRouter();

  const receipt = useQuery(api.receipts.getById, { id: receiptId });
  const list = listId ? useQuery(api.shoppingLists.getById, { id: listId }) : null;
  const listItems = listId ? useQuery(api.listItems.getByList, { listId }) : null;
  const completeShopping = useMutation(api.shoppingLists.completeShopping);
  const linkReceiptToList = useMutation(api.receipts.linkToList);
  const autoRestock = useMutation(api.pantryItems.autoRestockFromReceipt);
  const confirmFuzzyRestock = useMutation(api.pantryItems.confirmFuzzyRestock);
  const addFromReceipt = useMutation(api.pantryItems.addFromReceipt);

  const [isCompleting, setIsCompleting] = useState(false);
  const [restockResult, setRestockResult] = useState<{
    restockedCount: number;
    fuzzyMatches: Array<{
      receiptItemName: string;
      pantryItemName: string;
      pantryItemId: string;
      similarity: number;
    }>;
    itemsToAdd: Array<{ name: string; category?: string }>;
  } | null>(null);

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
        />
        <ScrollView
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
          </GlassCard>

          <GlassButton
            variant="primary"
            size="lg"
            icon="check"
            onPress={() => router.push("/(app)/(tabs)/" as any)}
          >
            Done
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

  // Identify unplanned purchases (items in receipt but not in list)
  const unplannedItems = receipt.items.filter((receiptItem) => {
    return !listItems.some((listItem) =>
      listItem.name.toLowerCase().trim() === receiptItem.name.toLowerCase().trim()
    );
  });

  const unplannedItemsTotal = unplannedItems.reduce((sum, item) => sum + item.totalPrice, 0);

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

      // Step 2: Complete the shopping trip
      await completeShopping({ id: listId });

      // Step 3: Auto-restock pantry from receipt
      const result = await autoRestock({ receiptId });

      setRestockResult({
        restockedCount: result.restockedItems.length,
        fuzzyMatches: result.fuzzyMatches,
        itemsToAdd: result.itemsToAdd,
      });

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      // Show success message with restock count
      const restockMessage =
        result.restockedItems.length > 0
          ? `Pantry updated: ${result.restockedItems.length} item${result.restockedItems.length !== 1 ? "s" : ""} restocked`
          : "";

      const savingsMessage = savedMoney
        ? `Great job! You saved £${Math.abs(difference).toFixed(2)}!`
        : "Shopping trip completed successfully";

      const fullMessage = restockMessage
        ? `${savingsMessage}\n\n${restockMessage}`
        : savingsMessage;

      // Handle fuzzy matches and items to add
      if (Platform.OS === "web") {
        window.alert("Trip Completed!\n\n" + fullMessage);
        if (result.fuzzyMatches.length > 0 || result.itemsToAdd.length > 0) {
          handleFuzzyMatchesAndNewItems();
        } else {
          router.push("/(app)/(tabs)/" as any);
        }
      } else if (result.fuzzyMatches.length > 0 || result.itemsToAdd.length > 0) {
        Alert.alert("Trip Completed!", fullMessage, [
          {
            text: "Review Pantry Updates",
            onPress: () => handleFuzzyMatchesAndNewItems(),
          },
          {
            text: "Done",
            onPress: () => router.push("/(app)/(tabs)/" as any),
          },
        ]);
      } else {
        Alert.alert("Trip Completed!", fullMessage, [
          {
            text: "Done",
            onPress: () => router.push("/(app)/(tabs)/" as any),
          },
        ]);
      }
    } catch (error) {
      console.error("Failed to complete trip:", error);
      Alert.alert("Error", "Failed to complete shopping trip");
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
        Alert.alert(
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
        Alert.alert("Add to Pantry?", `Add "${item.name}" to your pantry?`, [
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

  bottomSpacer: {
    height: 120,
  },
});
