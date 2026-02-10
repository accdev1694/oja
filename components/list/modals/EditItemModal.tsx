import { useState, useEffect } from "react";
import { View, Text, TextInput, StyleSheet, Pressable } from "react-native";
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
    size?: string;
    unit?: string;
    priceOverride?: boolean;
    sizeOverride?: boolean;
  }) => Promise<void>;
}

// ─── Component ──────────────────────────────────────────────────────────────

export function EditItemModal({ item, onClose, onSave }: EditItemModalProps) {
  const [editName, setEditName] = useState("");
  const [editQuantity, setEditQuantity] = useState("");
  const [editPrice, setEditPrice] = useState("");
  const [editSize, setEditSize] = useState("");
  const [priceWasEdited, setPriceWasEdited] = useState(false);
  const [sizeWasEdited, setSizeWasEdited] = useState(false);
  const { alert } = useGlassAlert();

  // Sync fields when item changes
  useEffect(() => {
    if (item) {
      setEditName(item.name);
      setEditQuantity(String(item.quantity));
      setEditPrice(item.estimatedPrice ? String(item.estimatedPrice) : "");
      setEditSize(item.size || "");
      setPriceWasEdited(false);
      setSizeWasEdited(false);
    }
  }, [item]);

  // Track if user changed the price
  const handlePriceChange = (value: string) => {
    setEditPrice(value);
    const newPrice = parseFloat(value);
    if (!isNaN(newPrice) && newPrice !== item?.estimatedPrice) {
      setPriceWasEdited(true);
    }
  };

  // Track if user changed the size
  const handleSizeChange = (value: string) => {
    setEditSize(value);
    if (value !== item?.size) {
      setSizeWasEdited(true);
    }
  };

  function handleClose() {
    setEditName("");
    setEditQuantity("");
    setEditPrice("");
    setEditSize("");
    setPriceWasEdited(false);
    setSizeWasEdited(false);
    onClose();
  }

  async function handleSave() {
    if (!item) return;

    const updates: {
      id: Id<"listItems">;
      name?: string;
      quantity?: number;
      estimatedPrice?: number;
      size?: string;
      priceOverride?: boolean;
      sizeOverride?: boolean;
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
      updates.priceOverride = true;
    }

    // Handle size changes
    if (editSize !== item.size) {
      updates.size = editSize || undefined;
      if (editSize && editSize !== item.size) {
        updates.sizeOverride = true;
      }
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

  // Check if this item has an original size (meaning it was changed from store switch)
  const hasOriginalSize = item?.originalSize && item.originalSize !== item.size;

  // Check if price was manually set
  const isPriceManual = item?.priceOverride || item?.priceSource === "manual";

  return (
    <GlassModal
      visible={item !== null}
      onClose={handleClose}
      maxWidth={360}
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

      {/* Size input with "was X" indicator */}
      <View style={styles.inputGroup}>
        <View style={styles.labelRow}>
          <Text style={styles.inputLabel}>Size</Text>
          {hasOriginalSize && (
            <View style={styles.wasIndicator}>
              <MaterialCommunityIcons
                name="arrow-left-right"
                size={12}
                color={colors.accent.warning}
              />
              <Text style={styles.wasText}>was {item?.originalSize}</Text>
            </View>
          )}
        </View>
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.textInput}
            value={editSize}
            onChangeText={handleSizeChange}
            placeholder="e.g., 500ml, 2pt, 250g"
            placeholderTextColor={colors.text.tertiary}
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
          <View style={styles.labelRow}>
            <Text style={styles.inputLabel}>Price ({"\u00A3"})</Text>
            {isPriceManual && (
              <View style={styles.manualBadge}>
                <MaterialCommunityIcons
                  name="pencil"
                  size={10}
                  color={colors.accent.warm}
                />
                <Text style={styles.manualBadgeText}>Manual</Text>
              </View>
            )}
          </View>
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.textInput}
              value={editPrice}
              onChangeText={handlePriceChange}
              placeholder="0.00"
              placeholderTextColor={colors.text.tertiary}
              keyboardType="decimal-pad"
            />
          </View>
        </View>
      </View>

      {/* Info text for manual price */}
      {priceWasEdited && (
        <Text style={styles.infoText}>
          Editing the price will mark it as a manual override
        </Text>
      )}

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
  labelRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.xs,
  },
  inputLabel: {
    ...typography.labelMedium,
    color: colors.text.secondary,
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
  // "was X" indicator for changed sizes
  wasIndicator: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(245, 158, 11, 0.15)",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  wasText: {
    ...typography.bodySmall,
    color: colors.accent.warning,
  },
  // Manual price badge
  manualBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "rgba(255, 176, 136, 0.15)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  manualBadgeText: {
    fontSize: 10,
    fontWeight: "600" as const,
    color: colors.accent.warm,
  },
  // Info text
  infoText: {
    ...typography.bodySmall,
    color: colors.text.tertiary,
    fontStyle: "italic",
    textAlign: "center",
    marginBottom: spacing.sm,
  },
  actions: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.md,
  },
});
