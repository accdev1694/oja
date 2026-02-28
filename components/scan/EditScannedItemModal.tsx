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
} from "@/components/ui/glass";
import type { ScannedProduct } from "@/hooks/useProductScanner";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface EditScannedItemModalProps {
  /** The scanned product being edited, or null if modal is closed */
  product: ScannedProduct | null;
  onClose: () => void;
  /** Called when user confirms - returns the edited product data */
  onConfirm: (editedProduct: {
    name: string;
    category: string;
    quantity: number;
    size?: string;
    unit?: string;
    brand?: string;
    estimatedPrice?: number;
    confidence: number;
    imageStorageId: string;
  }) => void;
}

// ─── Component ──────────────────────────────────────────────────────────────

export function EditScannedItemModal({ product, onClose, onConfirm }: EditScannedItemModalProps) {
  const [editName, setEditName] = useState("");
  const [editQuantity, setEditQuantity] = useState("1");
  const [editPrice, setEditPrice] = useState("");
  const [editSize, setEditSize] = useState("");
  const [editBrand, setEditBrand] = useState("");

  // Sync fields when product changes
  useEffect(() => {
    if (product) {
      setEditName(product.name);
      setEditQuantity(String(product.quantity || "1"));
      setEditPrice(product.estimatedPrice ? String(product.estimatedPrice.toFixed(2)) : "");
      setEditSize(product.size || "");
      setEditBrand(product.brand || "");
    }
  }, [product]);

  function handleClose() {
    setEditName("");
    setEditQuantity("1");
    setEditPrice("");
    setEditSize("");
    setEditBrand("");
    onClose();
  }

  function handleConfirm() {
    if (!product || !editName.trim()) return;

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    const qty = parseInt(editQuantity);
    const price = parseFloat(editPrice);

    onConfirm({
      name: editName.trim(),
      category: product.category,
      quantity: !isNaN(qty) && qty > 0 ? qty : 1,
      size: editSize.trim() || undefined,
      unit: product.unit,
      brand: editBrand.trim() || undefined,
      estimatedPrice: !isNaN(price) && price >= 0 ? price : undefined,
      confidence: product.confidence,
      imageStorageId: product.imageStorageId,
    });

    handleClose();
  }

  // Confidence indicator
  const confidenceColor =
    (product?.confidence ?? 0) >= 70
      ? colors.semantic.success
      : (product?.confidence ?? 0) >= 40
        ? colors.accent.warning
        : colors.semantic.danger;

  const confidenceLabel =
    (product?.confidence ?? 0) >= 70
      ? "High confidence"
      : (product?.confidence ?? 0) >= 40
        ? "Medium confidence"
        : "Low confidence";

  // Check if size is missing
  const isSizeMissing = !editSize.trim();

  return (
    <GlassModal
      visible={product !== null}
      onClose={handleClose}
      maxWidth={360}
      avoidKeyboard
    >
      <View style={styles.header}>
        <MaterialCommunityIcons name="barcode-scan" size={28} color={colors.accent.primary} />
        <Text style={styles.title}>Review Scanned Item</Text>
        <Text style={styles.subtitle}>Confirm details before adding to list</Text>
      </View>

      {/* Confidence indicator */}
      <View style={styles.confidenceRow}>
        <MaterialCommunityIcons
          name={product?.confidence && product.confidence >= 70 ? "check-circle" : "alert-circle"}
          size={16}
          color={confidenceColor}
        />
        <Text style={[styles.confidenceText, { color: confidenceColor }]}>
          {confidenceLabel} ({product?.confidence ?? 0}%)
        </Text>
      </View>

      {/* Name input */}
      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Name</Text>
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.textInput}
            value={editName}
            onChangeText={setEditName}
            placeholder="Product name"
            placeholderTextColor={colors.text.tertiary}
            autoFocus
          />
        </View>
      </View>

      {/* Brand input */}
      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Brand</Text>
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.textInput}
            value={editBrand}
            onChangeText={setEditBrand}
            placeholder="e.g., Heinz, Tesco, PG Tips"
            placeholderTextColor={colors.text.tertiary}
          />
        </View>
      </View>

      {/* Size input with warning if missing */}
      <View style={styles.inputGroup}>
        <View style={styles.labelRow}>
          <Text style={styles.inputLabel}>Size / Weight</Text>
          {isSizeMissing && (
            <View style={styles.warningBadge}>
              <MaterialCommunityIcons name="alert" size={12} color={colors.accent.warning} />
              <Text style={styles.warningBadgeText}>Missing</Text>
            </View>
          )}
        </View>
        <View style={[styles.inputContainer, isSizeMissing && styles.inputContainerWarning]}>
          <TextInput
            style={styles.textInput}
            value={editSize}
            onChangeText={setEditSize}
            placeholder="e.g., 500ml, 2pt, 400g"
            placeholderTextColor={colors.text.tertiary}
          />
        </View>
        {isSizeMissing && (
          <Text style={styles.warningHint}>
            Adding size helps with duplicate detection
          </Text>
        )}
      </View>

      {/* Quantity and Price row */}
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

      {/* Actions */}
      <View style={styles.actions}>
        <GlassButton
          variant="ghost"
          size="md"
          onPress={handleClose}
          style={{ flex: 1 }}
        >
          Cancel
        </GlassButton>
        <GlassButton
          variant="primary"
          size="md"
          icon="plus"
          onPress={handleConfirm}
          style={{ flex: 1 }}
          disabled={!editName.trim()}
        >
          Add to List
        </GlassButton>
      </View>
    </GlassModal>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  header: {
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  title: {
    ...typography.headlineMedium,
    color: colors.text.primary,
    marginTop: spacing.sm,
  },
  subtitle: {
    ...typography.bodySmall,
    color: colors.text.secondary,
    marginTop: spacing.xs,
  },
  confidenceRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    marginBottom: spacing.md,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    backgroundColor: colors.glass.backgroundStrong,
    borderRadius: borderRadius.sm,
    alignSelf: "center",
  },
  confidenceText: {
    ...typography.labelSmall,
    fontWeight: "600",
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
  inputContainerWarning: {
    borderColor: colors.accent.warning,
  },
  textInput: {
    flex: 1,
    ...typography.bodyMedium,
    color: colors.text.primary,
  },
  warningBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(245, 158, 11, 0.15)",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  warningBadgeText: {
    fontSize: 10,
    fontWeight: "600",
    color: colors.accent.warning,
  },
  warningHint: {
    ...typography.bodySmall,
    color: colors.accent.warning,
    marginTop: spacing.xs,
    fontStyle: "italic",
  },
  actions: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.md,
  },
});
