/**
 * ReceiptSavedView - Standalone receipt summary shown when no shopping list is linked.
 * Displays receipt total, itemized details, multi-store segments, and action buttons.
 */

import { View, Text, StyleSheet, ScrollView } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import {
  GlassScreen,
  GlassCard,
  GlassButton,
  SimpleHeader,
  colors,
  typography,
  spacing,
  useGlassAlert,
} from "@/components/ui/glass";

import type { Id } from "@/convex/_generated/dataModel";

interface StoreSegment {
  storeName: string;
  switchedAt: number;
}

interface ReceiptItem {
  name: string;
  quantity: number;
  totalPrice: number;
  unitPrice?: number;
  category?: string;
}

interface ReceiptSavedViewProps {
  receipt: {
    total: number;
    storeName: string;
    items: ReceiptItem[];
  };
  receiptId: Id<"receipts">;
  list?: {
    storeSegments?: StoreSegment[];
  } | null;
  pointsEarned?: number;
  onGoBack: () => void;
  onCreateListFromReceipt: () => void;
  onAddToPantry: () => Promise<void>;
  onDone: () => void;
  onDeleteReceipt: () => void;
}

export function ReceiptSavedView({
  receipt,
  receiptId,
  list,
  pointsEarned,
  onGoBack,
  onCreateListFromReceipt,
  onAddToPantry,
  onDone,
  onDeleteReceipt,
}: ReceiptSavedViewProps) {
  return (
    <GlassScreen>
      <SimpleHeader
        title="Receipt Saved"
        subtitle={receipt.storeName}
        showBack={true}
        onBack={onGoBack}
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
            {pointsEarned != null && pointsEarned > 0 && (
              <View style={styles.pointsBadge}>
                <MaterialCommunityIcons name="star-circle" size={20} color={colors.accent.primary} />
                <Text style={styles.pointsBadgeText}>+{pointsEarned} points earned</Text>
              </View>
            )}
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
          onPress={onCreateListFromReceipt}
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
              onPress={onAddToPantry}
            >
              Add to Pantry
            </GlassButton>
          </View>
          <View style={{ flex: 1 }}>
            <GlassButton
              variant="secondary"
              size="md"
              icon="check"
              onPress={onDone}
            >
              Done
            </GlassButton>
          </View>
        </View>

        <GlassButton
          variant="secondary"
          size="md"
          icon="delete-outline"
          onPress={onDeleteReceipt}
          style={{ marginTop: spacing.sm }}
        >
          Delete Receipt
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
  pointsBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    marginTop: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: `${colors.accent.primary}15`,
    borderRadius: 20,
  },
  pointsBadgeText: {
    ...typography.labelMedium,
    color: colors.accent.primary,
    fontWeight: "700",
  },
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
  secondaryActionsRow: {
    flexDirection: "row",
    gap: spacing.md,
  },
  bottomSpacer: {
    height: 140,
  },
});
