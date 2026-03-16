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

import { TripSummaryCards } from "@/components/receipt/TripSummaryCards";
import { ReceiptSavedView } from "@/components/receipt/ReceiptSavedView";
import { StoreMismatchCard } from "@/components/receipt/StoreMismatchCard";
import { useDelightToast } from "@/hooks/useDelightToast";

export default function ReconciliationScreen() {
  const params = useLocalSearchParams();
  const receiptId = params.id as string as Id<"receipts">;
  const listId = (params.listId as string) as Id<"shoppingLists"> | undefined;
  const router = useRouter();
  const { alert } = useGlassAlert();
  const { onPointsEarned } = useDelightToast();

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

  const finishTrip = useMutation(api.shoppingLists.finishTrip);
  const archiveList = useMutation(api.shoppingLists.archiveList);
  const linkReceiptToList = useMutation(api.receipts.linkToList);
  const autoRestock = useMutation(api.pantryItems.autoRestockFromReceipt);
  const confirmFuzzyRestock = useMutation(api.pantryItems.confirmFuzzyRestock);
  const addFromReceipt = useMutation(api.pantryItems.addFromReceipt);
  const deleteReceipt = useMutation(api.receipts.remove);

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

  // If no list linked, show simple receipt summary using extracted component
  if (!listId || !list || !listItems) {
    return (
      <ReceiptSavedView
        receipt={receipt}
        receiptId={receiptId}
        list={list}
        pointsEarned={receipt.pointsEarned ?? 0}
        onGoBack={() => {
          if (router.canGoBack()) {
            router.back();
          } else {
            router.replace("/(app)/(tabs)/scan");
          }
        }}
        onCreateListFromReceipt={() =>
          router.push(`/(app)/create-list-from-receipt?receiptId=${receiptId}`)
        }
        onAddToPantry={async () => {
          try {
            await autoRestock({ receiptId });
            alert("Pantry Updated", "Items from this receipt have been added to your pantry.");
          } catch (e) {
            alert("Error", "Failed to update pantry");
          }
        }}
        onDone={async () => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          router.push("/(app)/(tabs)");
        }}
        onDeleteReceipt={() => {
          alert("Delete Receipt", "Are you sure? This cannot be undone.", [
            { text: "Cancel", style: "cancel" },
            {
              text: "Delete",
              style: "destructive",
              onPress: async () => {
                await deleteReceipt({ id: receiptId });
                router.replace("/(app)/(tabs)/scan");
              },
            },
          ]);
        }}
      />
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
  const unplannedItems = unplannedData?.unplannedItems || [];
  const unplannedItemsTotal = unplannedData?.totalUnplanned || 0;

  // Handle complete trip
  async function handleCompleteTrip() {
    if (!listId) return;

    setIsCompleting(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      // Step 1: Link receipt to list
      await linkReceiptToList({ receiptId, listId });

      // Step 2: Complete the shopping trip
      await finishTrip({ id: listId });

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
        pointsEarned: receipt?.pointsEarned ?? 0,
      });

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      // Celebrate points earned
      const earnedPts = receipt?.pointsEarned ?? 0;
      if (earnedPts > 0) {
        onPointsEarned(earnedPts);
      }

      const restockMessage =
        result.restockedItems.length > 0
          ? `Pantry updated: ${result.restockedItems.length} item${result.restockedItems.length !== 1 ? "s" : ""} restocked`
          : "";

      const pointsMessage = earnedPts > 0 ? `+${earnedPts} points earned` : "";

      const savingsMessage = savedMoney
        ? `Great job! You saved £${Math.abs(difference).toFixed(2)}!`
        : "Shopping trip completed successfully";

      const messageParts = [savingsMessage, pointsMessage, restockMessage].filter(Boolean);
      const fullMessage = messageParts.join("\n\n");

      const navigateToHistory = () => router.push("/(app)/(tabs)");

      if (result.fuzzyMatches.length > 0 || result.itemsToAdd.length > 0) {
        alert("Trip Archived!", fullMessage, [
          { text: "Review Pantry Updates", onPress: () => handleFuzzyMatchesAndNewItems() },
          { text: "View History", onPress: navigateToHistory },
        ]);
      } else {
        alert("Trip Archived!", fullMessage, [
          { text: "View History", onPress: navigateToHistory },
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

    for (const match of fuzzyMatches) {
      await new Promise<void>((resolve) => {
        alert(
          "Restock Item?",
          `Receipt has "${match.receiptItemName}"\nRestock "${match.pantryItemName}" (${match.similarity.toFixed(0)}% match)?`,
          [
            { text: "Skip", style: "cancel", onPress: () => resolve() },
            {
              text: "Restock",
              onPress: async () => {
                try {
                  await confirmFuzzyRestock({ pantryItemId: match.pantryItemId as Id<"pantryItems"> });
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

    for (const item of itemsToAdd) {
      await new Promise<void>((resolve) => {
        alert("Add to Pantry?", `Add "${item.name}" to your pantry?`, [
          { text: "Skip", style: "cancel", onPress: () => resolve() },
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

    router.push("/(app)/(tabs)");
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
        {/* Trip Summary Cards (celebration, budget, items, unplanned) */}
        <TripSummaryCards
          budget={budget}
          actualTotal={actualTotal}
          difference={difference}
          savedMoney={savedMoney}
          percentSaved={percentSaved}
          plannedItemsCount={plannedItemsCount}
          actualItemsCount={actualItemsCount}
          unplannedItems={unplannedItems}
          unplannedItemsTotal={unplannedItemsTotal}
        />

        {/* Store Mismatch Warning */}
        <StoreMismatchCard
          mismatchInfo={mismatchInfo}
          mismatchChoice={mismatchChoice}
          setMismatchChoice={setMismatchChoice}
        />

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
  bottomSpacer: {
    height: 140,
  },
});
