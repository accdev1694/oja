import React, { useState, useCallback } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable, TextInput } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import {
  notificationAsync,
  impactAsync,
  NotificationFeedbackType,
  ImpactFeedbackStyle,
} from "expo-haptics";
import { useRouter } from "expo-router";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";

import {
  GaugeIndicator,
  type StockLevel,
} from "@/components/pantry";
import {
  GlassModal,
  GlassButton,
  colors,
  typography,
  spacing,
  borderRadius,
  useGlassAlert,
} from "@/components/ui/glass";

const STOCK_CATEGORIES = [
  "Dairy", "Bakery", "Produce", "Meat", "Pantry Staples", "Spices & Seasonings",
  "Condiments", "Beverages", "Snacks", "Frozen", "Canned Goods", "Grains & Pasta",
  "Oils & Vinegars", "Baking", "Household", "Personal Care", "Health & Wellness",
];

const STOCK_LEVELS: { level: StockLevel; label: string; color: string }[] = [
  { level: "stocked", label: "Stocked", color: colors.budget.healthy },
  { level: "low", label: "Running Low", color: colors.budget.caution },
  { level: "out", label: "Out of Stock", color: colors.budget.exceeded },
];

interface AddPantryItemModalProps {
  visible: boolean;
  onClose: () => void;
}

export const AddPantryItemModal = React.memo(function AddPantryItemModal({
  visible,
  onClose,
}: AddPantryItemModalProps) {
  const router = useRouter();
  const { alert } = useGlassAlert();
  const createPantryItem = useMutation(api.pantryItems.create);

  const [newItemName, setNewItemName] = useState("");
  const [newItemCategory, setNewItemCategory] = useState("Pantry Staples");
  const [newItemStock, setNewItemStock] = useState<StockLevel>("stocked");

  const handleClose = useCallback(() => {
    onClose();
    setNewItemName("");
    setNewItemCategory("Pantry Staples");
    setNewItemStock("stocked");
  }, [onClose]);

  const handleAddItem = useCallback(async () => {
    const name = newItemName.trim();
    if (!name) return;
    impactAsync(ImpactFeedbackStyle.Medium);
    try {
      await createPantryItem({
        name,
        category: newItemCategory,
        stockLevel: newItemStock,
      });
      notificationAsync(NotificationFeedbackType.Success);
      handleClose();
    } catch (error: any) {
      console.error("Failed to add item:", error);
      const msg = error?.message ?? error?.data ?? "";
      if (msg.includes("limit") || msg.includes("Upgrade") || msg.includes("Premium")) {
        notificationAsync(NotificationFeedbackType.Warning);
        alert(
          "Pantry Limit Reached",
          "Free plan allows up to 50 pantry items. Upgrade to Premium for unlimited items.",
          [
            { text: "Maybe Later", style: "cancel" },
            { text: "Upgrade", onPress: () => router.push("/(app)/subscription") },
          ]
        );
      } else {
        alert("Error", "Failed to add pantry item");
      }
    }
  }, [newItemName, newItemCategory, newItemStock, createPantryItem, handleClose, alert, router]);

  return (
    <GlassModal
      visible={visible}
      onClose={handleClose}
      maxWidth={400}
      avoidKeyboard
      contentStyle={styles.addModalContent}
    >
      <MaterialCommunityIcons name="fridge-outline" size={36} color={colors.accent.primary} />
      <Text style={styles.addModalTitle}>Add to Stock</Text>

      <TextInput
        style={styles.addInput}
        placeholder="Item name (e.g. Olive Oil)"
        placeholderTextColor={colors.text.tertiary}
        value={newItemName}
        onChangeText={setNewItemName}
        autoFocus
        maxLength={80}
      />

      <Text style={styles.addLabel}>Category</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.addChipsScroll}
        contentContainerStyle={styles.addChipsContent}
      >
        {STOCK_CATEGORIES.map((cat) => (
          <Pressable
            key={cat}
            style={[styles.addChip, newItemCategory === cat && styles.addChipActive]}
            onPress={() => setNewItemCategory(cat)}
          >
            <Text style={[styles.addChipText, newItemCategory === cat && styles.addChipTextActive]}>
              {cat}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      <Text style={styles.addLabel}>Stock Level</Text>
      <View style={styles.addStockRow}>
        {STOCK_LEVELS.map((option) => (
          <Pressable
            key={option.level}
            style={[styles.addStockChip, newItemStock === option.level && styles.addStockChipActive]}
            onPress={() => setNewItemStock(option.level)}
          >
            <GaugeIndicator level={option.level} size="small" />
            <Text style={[
              styles.addStockChipText,
              newItemStock === option.level && styles.addStockChipTextActive,
            ]}>
              {option.label}
            </Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.addActions}>
        <GlassButton variant="ghost" size="md" onPress={handleClose}>
          Cancel
        </GlassButton>
        <GlassButton
          variant="primary"
          size="md"
          icon="plus"
          onPress={handleAddItem}
          disabled={!newItemName.trim()}
        >
          Add Item
        </GlassButton>
      </View>
    </GlassModal>
  );
});

const styles = StyleSheet.create({
  addModalContent: {
    alignItems: "center",
    gap: spacing.md,
  },
  addModalTitle: {
    ...typography.headlineMedium,
    color: colors.text.primary,
    width: "100%",
    textAlign: "center",
  },
  addInput: {
    width: "100%",
    backgroundColor: colors.glass.background,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    color: colors.text.primary,
    fontSize: 16,
    borderWidth: 1,
    borderColor: colors.glass.border,
  },
  addLabel: {
    ...typography.labelMedium,
    color: colors.text.primary,
    alignSelf: "flex-start",
  },
  addChipsScroll: {
    width: "100%",
    maxHeight: 40,
  },
  addChipsContent: {
    gap: spacing.xs,
    paddingRight: spacing.md,
  },
  addChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    backgroundColor: colors.glass.background,
    borderWidth: 1,
    borderColor: colors.glass.border,
  },
  addChipActive: {
    backgroundColor: `${colors.accent.primary}20`,
    borderColor: colors.accent.primary,
  },
  addChipText: {
    ...typography.bodySmall,
    color: colors.text.tertiary,
  },
  addChipTextActive: {
    color: colors.accent.primary,
    fontWeight: "600",
  },
  addStockRow: {
    width: "100%",
    gap: spacing.xs,
  },
  addStockChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.glass.background,
    borderWidth: 1,
    borderColor: colors.glass.border,
  },
  addStockChipActive: {
    backgroundColor: `${colors.accent.primary}15`,
    borderColor: colors.accent.primary,
  },
  addStockChipText: {
    ...typography.bodySmall,
    color: colors.text.tertiary,
  },
  addStockChipTextActive: {
    color: colors.accent.primary,
    fontWeight: "600",
  },
  addActions: {
    flexDirection: "row",
    gap: spacing.md,
    marginTop: spacing.sm,
  },
});
