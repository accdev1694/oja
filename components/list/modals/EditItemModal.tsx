import { useState, useEffect } from "react";
import { View, Text, TextInput, StyleSheet } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import {
  GlassButton,
  GlassModal,
  colors,
  typography,
  spacing,
  borderRadius,
  useGlassAlert,
} from "@/components/ui/glass";
import type { Id } from "@/convex/_generated/dataModel";
import type { ListItem } from "@/components/list/ShoppingListItem";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface EditItemModalProps {
  /** The item being edited, or null if modal is closed */
  item: ListItem | null;
  onClose: () => void;
  onSave: (updates: {
    id: Id<"listItems">;
    name?: string;
    quantity?: number;
    estimatedPrice?: number;
  }) => Promise<void>;
}

// ─── Component ──────────────────────────────────────────────────────────────

export function EditItemModal({ item, onClose, onSave }: EditItemModalProps) {
  const [editName, setEditName] = useState("");
  const [editQuantity, setEditQuantity] = useState("");
  const [editPrice, setEditPrice] = useState("");
  const { alert } = useGlassAlert();

  // Sync fields when item changes
  useEffect(() => {
    if (item) {
      setEditName(item.name);
      setEditQuantity(String(item.quantity));
      setEditPrice(item.estimatedPrice ? String(item.estimatedPrice) : "");
    }
  }, [item]);

  function handleClose() {
    setEditName("");
    setEditQuantity("");
    setEditPrice("");
    onClose();
  }

  async function handleSave() {
    if (!item) return;

    const updates: {
      id: Id<"listItems">;
      name?: string;
      quantity?: number;
      estimatedPrice?: number;
    } = { id: item._id };

    if (editName.trim() && editName !== item.name) {
      updates.name = editName.trim();
    }

    const qty = parseInt(editQuantity);
    if (!isNaN(qty) && qty > 0 && qty !== item.quantity) {
      updates.quantity = qty;
    }

    const price = parseFloat(editPrice);
    if (!isNaN(price) && price >= 0 && price !== item.estimatedPrice) {
      updates.estimatedPrice = price;
    }

    try {
      await onSave(updates);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      handleClose();
    } catch (error) {
      console.error("Failed to update item:", error);
      alert("Error", "Failed to update item");
    }
  }

  return (
    <GlassModal
      visible={item !== null}
      onClose={handleClose}
      maxWidth={340}
      avoidKeyboard
    >
      <View style={styles.header}>
        <MaterialCommunityIcons name="pencil" size={28} color={colors.accent.primary} />
        <Text style={styles.title}>Edit Item</Text>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Name</Text>
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.textInput}
            value={editName}
            onChangeText={setEditName}
            placeholder="Item name"
            placeholderTextColor={colors.text.tertiary}
            autoFocus
          />
        </View>
      </View>

      <View style={styles.inputRow}>
        <View style={[styles.inputGroup, { flex: 1 }]}>
          <Text style={styles.inputLabel}>Quantity</Text>
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.textInput}
              value={editQuantity}
              onChangeText={setEditQuantity}
              placeholder="1"
              placeholderTextColor={colors.text.tertiary}
              keyboardType="number-pad"
            />
          </View>
        </View>

        <View style={[styles.inputGroup, { flex: 1 }]}>
          <Text style={styles.inputLabel}>Price ({"\u00A3"})</Text>
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.textInput}
              value={editPrice}
              onChangeText={setEditPrice}
              placeholder="0.00"
              placeholderTextColor={colors.text.tertiary}
              keyboardType="decimal-pad"
            />
          </View>
        </View>
      </View>

      <View style={styles.actions}>
        <GlassButton variant="ghost" size="md" onPress={handleClose} style={{ flex: 1 }}>
          Cancel
        </GlassButton>
        <GlassButton
          variant="primary"
          size="md"
          icon="check"
          onPress={handleSave}
          style={{ flex: 1 }}
          disabled={!editName.trim()}
        >
          Save
        </GlassButton>
      </View>
    </GlassModal>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  header: {
    alignItems: "center",
    marginBottom: spacing.md,
  },
  title: {
    ...typography.headlineMedium,
    color: colors.text.primary,
    marginTop: spacing.sm,
  },
  inputGroup: {
    marginBottom: spacing.md,
  },
  inputRow: {
    flexDirection: "row",
    gap: spacing.md,
  },
  inputLabel: {
    ...typography.labelMedium,
    color: colors.text.secondary,
    marginBottom: spacing.xs,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.glass.background,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.glass.border,
    paddingHorizontal: spacing.md,
    height: 48,
  },
  textInput: {
    flex: 1,
    ...typography.bodyMedium,
    color: colors.text.primary,
  },
  actions: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.md,
  },
});
