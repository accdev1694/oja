import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
} from "react-native";
import { useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import * as Haptics from "expo-haptics";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import {
  GlassScreen,
  GlassCard,
  GlassButton,
  SimpleHeader,
  GlassErrorState,
  GlassSkeleton,
  colors,
  typography,
  spacing,
} from "@/components/ui/glass";

export default function ConfirmReceiptScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const receiptId = id as Id<"receipts">;

  const receipt = useQuery(api.receipts.getById, { id: receiptId });
  const updateReceipt = useMutation(api.receipts.update);

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

  const lowConfidenceItems = receipt.items.filter(
    (item: any) => item.confidence && item.confidence < 70
  );

  async function handleConfirm() {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    await updateReceipt({
      id: receiptId,
      processingStatus: "completed",
    });

    Alert.alert("Receipt Saved", "Your receipt has been saved successfully", [
      {
        text: "OK",
        onPress: () => router.push("/(app)/(tabs)/scan"),
      },
    ]);
  }

  function handleEdit() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Alert.alert("Edit Receipt", "Item editing coming in Story 5.3");
  }

  return (
    <GlassScreen>
      <SimpleHeader
        title="Confirm Receipt"
        subtitle="Review and verify the details"
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
          <GlassCard variant="bordered" accentColor={colors.semantic.warning} style={styles.section}>
            <View style={styles.warningHeader}>
              <MaterialCommunityIcons
                name="alert"
                size={20}
                color={colors.semantic.warning}
              />
              <Text style={styles.warningTitle}>Review Needed</Text>
            </View>
            <Text style={styles.warningText}>
              {lowConfidenceItems.length} item{lowConfidenceItems.length > 1 ? "s" : ""} marked with ⚠️ need your attention. Please verify carefully.
            </Text>
          </GlassCard>
        )}

        {/* Items */}
        <GlassCard variant="standard" style={styles.section}>
          <View style={styles.sectionHeader}>
            <MaterialCommunityIcons
              name="receipt"
              size={20}
              color={colors.accent.primary}
            />
            <Text style={styles.sectionTitle}>Items ({receipt.items.length})</Text>
          </View>

          {receipt.items.map((item: any, index: number) => {
            const isLowConfidence = item.confidence && item.confidence < 70;
            return (
              <View key={index} style={styles.itemRow}>
                <View style={styles.itemLeft}>
                  {isLowConfidence && (
                    <Text style={styles.warningIcon}>⚠️</Text>
                  )}
                  <View style={styles.itemInfo}>
                    <Text style={styles.itemName}>{item.name}</Text>
                    <Text style={styles.itemQuantity}>Qty: {item.quantity}</Text>
                  </View>
                </View>
                <Text style={styles.itemPrice}>
                  £{item.totalPrice.toFixed(2)}
                </Text>
              </View>
            );
          })}
        </GlassCard>

        {/* Totals */}
        <GlassCard variant="bordered" accentColor={colors.accent.primary} style={styles.section}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Subtotal:</Text>
            <Text style={styles.totalValue}>£{receipt.subtotal.toFixed(2)}</Text>
          </View>

          {receipt.tax && (
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Tax:</Text>
              <Text style={styles.totalValue}>£{receipt.tax.toFixed(2)}</Text>
            </View>
          )}

          <View style={[styles.totalRow, styles.grandTotal]}>
            <Text style={styles.grandTotalLabel}>Total:</Text>
            <Text style={styles.grandTotalValue}>£{receipt.total.toFixed(2)}</Text>
          </View>
        </GlassCard>

        {/* Actions */}
        <View style={styles.actions}>
          <GlassButton
            variant="secondary"
            size="lg"
            icon="pencil"
            onPress={handleEdit}
            style={styles.actionButton}
          >
            Edit
          </GlassButton>

          <GlassButton
            variant="primary"
            size="lg"
            icon="check"
            onPress={handleConfirm}
            style={styles.actionButton}
          >
            Confirm
          </GlassButton>
        </View>

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

  // Actions
  actions: {
    flexDirection: "row",
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  actionButton: {
    flex: 1,
  },

  bottomSpacer: {
    height: 120,
  },
});
