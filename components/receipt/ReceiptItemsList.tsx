/**
 * ReceiptItemsList - Editable list of scanned receipt items.
 * Includes swipeable rows for delete and tap-to-edit interactions.
 */

import React, { useCallback } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Swipeable } from "react-native-gesture-handler";

import {
  GlassCard,
  colors,
  typography,
  spacing,
} from "@/components/ui/glass";

interface ReceiptItem {
  name: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  category?: string;
  confidence?: number;
}

// ─── EditableItemRow ────────────────────────────────────────────────

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

// ─── ReceiptItemsList ───────────────────────────────────────────────

interface ReceiptItemsListProps {
  items: ReceiptItem[];
  onEditName: (index: number) => void;
  onEditPrice: (index: number) => void;
  onDelete: (index: number) => void;
  onAddMissingItem: () => void;
  itemsRef: React.RefObject<View | null>;
}

export function ReceiptItemsList({
  items,
  onEditName,
  onEditPrice,
  onDelete,
  onAddMissingItem,
  itemsRef,
}: ReceiptItemsListProps) {
  return (
    <View ref={itemsRef}>
      <GlassCard variant="standard" style={styles.section}>
        <View style={styles.sectionHeader}>
          <MaterialCommunityIcons
            name="receipt"
            size={20}
            color={colors.accent.primary}
          />
          <Text style={styles.sectionTitle}>Items ({items.length})</Text>
        </View>

        {items.map((item, index) => (
          <EditableItemRow
            key={index}
            item={item}
            index={index}
            onEditName={onEditName}
            onEditPrice={onEditPrice}
            onDelete={onDelete}
          />
        ))}

        {/* Add Missing Item Button */}
        <TouchableOpacity
          style={styles.addButton}
          onPress={onAddMissingItem}
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
    </View>
  );
}

const styles = StyleSheet.create({
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
  deleteAction: {
    backgroundColor: "#FF6B6B",
    justifyContent: "center",
    alignItems: "center",
    width: 80,
    height: "100%",
  },
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
});
