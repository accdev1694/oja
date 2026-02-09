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

// ─── Types ──────────────────────────────────────────────────────────────────

export interface ActualPriceModalProps {
  visible: boolean;
  itemId: Id<"listItems"> | null;
  itemName: string;
  estimatedPrice: number;
  quantity: number;
  onClose: () => void;
  /** Called with actual price; updates item + toggles checked */
  onConfirm: (itemId: Id<"listItems">, actualPrice: number) => Promise<void>;
  /** Called when user skips entering a price; just toggles checked */
  onSkip: (itemId: Id<"listItems">) => Promise<void>;
}

// ─── Component ──────────────────────────────────────────────────────────────

export function ActualPriceModal({
  visible,
  itemId,
  itemName,
  estimatedPrice,
  quantity,
  onClose,
  onConfirm,
  onSkip,
}: ActualPriceModalProps) {
  const [actualPriceValue, setActualPriceValue] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const { alert } = useGlassAlert();

  // Reset input when modal opens
  useEffect(() => {
    if (visible) {
      setActualPriceValue("");
    }
  }, [visible]);

  function handleClose() {
    setActualPriceValue("");
    onClose();
  }

  async function handleConfirm() {
    if (!itemId) return;

    setIsSaving(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const actualPrice = parseFloat(actualPriceValue) || 0;

    try {
      await onConfirm(itemId, actualPrice);
      handleClose();
    } catch (error) {
      console.error("Failed to check off item:", error);
      alert("Error", "Failed to check off item");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleSkip() {
    if (!itemId) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    try {
      await onSkip(itemId);
      handleClose();
    } catch (error) {
      console.error("Failed to check off item:", error);
      alert("Error", "Failed to check off item");
    }
  }

  // Price difference calculation
  const actualPrice = parseFloat(actualPriceValue) || 0;
  const diff = (actualPrice - estimatedPrice) * quantity;
  const showDiff = estimatedPrice > 0 && actualPriceValue && Math.abs(diff) >= 0.01;
  const isMore = diff > 0;

  return (
    <GlassModal
      visible={visible}
      onClose={handleClose}
      overlayOpacity={0.75}
      maxWidth={360}
      avoidKeyboard
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.iconContainer}>
          <MaterialCommunityIcons
            name="check-circle-outline"
            size={28}
            color={colors.semantic.success}
          />
        </View>
        <View style={styles.headerText}>
          <Text style={styles.title}>Check Off Item</Text>
          <Text style={styles.itemName} numberOfLines={1}>
            {itemName}
            {quantity > 1 && ` (\u00D7${quantity})`}
          </Text>
        </View>
      </View>

      {/* Estimated Price Info */}
      {estimatedPrice > 0 && (
        <View style={styles.estimatedPriceInfo}>
          <Text style={styles.estimatedPriceLabel}>Estimated price:</Text>
          <Text style={styles.estimatedPriceValue}>
            {"\u00A3"}{(estimatedPrice * quantity).toFixed(2)}
          </Text>
        </View>
      )}

      {/* Actual Price Input */}
      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Actual Price (per item)</Text>
        <View style={styles.inputContainer}>
          <Text style={styles.currency}>{"\u00A3"}</Text>
          <TextInput
            style={styles.input}
            value={actualPriceValue}
            onChangeText={setActualPriceValue}
            keyboardType="decimal-pad"
            placeholder="0.00"
            placeholderTextColor={colors.text.tertiary}
            autoFocus
          />
        </View>
        {quantity > 1 && actualPriceValue ? (
          <Text style={styles.totalHint}>
            Total: {"\u00A3"}{(actualPrice * quantity).toFixed(2)}
          </Text>
        ) : null}
      </View>

      {/* Price Difference */}
      {showDiff && (
        <View style={styles.priceDifferenceContainer}>
          <View style={[
            styles.priceDifferenceBadge,
            isMore ? styles.priceDifferenceMore : styles.priceDifferenceLess,
          ]}>
            <MaterialCommunityIcons
              name={isMore ? "arrow-up" : "arrow-down"}
              size={16}
              color={isMore ? colors.semantic.danger : colors.semantic.success}
            />
            <Text style={[
              styles.priceDifferenceText,
              isMore ? styles.priceDifferenceMoreText : styles.priceDifferenceLessText,
            ]}>
              {"\u00A3"}{Math.abs(diff).toFixed(2)} {isMore ? "more" : "less"} than estimated
            </Text>
          </View>
        </View>
      )}

      {/* Action Buttons */}
      <View style={styles.actions}>
        <GlassButton
          variant="secondary"
          onPress={handleSkip}
          style={styles.actionBtn}
          disabled={isSaving}
        >
          Skip Price
        </GlassButton>
        <GlassButton
          variant="primary"
          onPress={handleConfirm}
          loading={isSaving}
          disabled={isSaving}
          style={styles.actionBtn}
        >
          Check Off
        </GlassButton>
      </View>
    </GlassModal>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.xl,
    backgroundColor: `${colors.semantic.success}15`,
    justifyContent: "center",
    alignItems: "center",
  },
  headerText: {
    flex: 1,
  },
  title: {
    ...typography.headlineSmall,
    color: colors.text.primary,
    marginBottom: 2,
  },
  itemName: {
    ...typography.bodyMedium,
    color: colors.text.secondary,
  },
  estimatedPriceInfo: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: colors.glass.background,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.glass.border,
  },
  estimatedPriceLabel: {
    ...typography.bodyMedium,
    color: colors.text.secondary,
  },
  estimatedPriceValue: {
    ...typography.labelLarge,
    color: colors.text.primary,
    fontWeight: "600",
  },
  inputGroup: {
    marginBottom: spacing.md,
  },
  inputLabel: {
    ...typography.labelMedium,
    color: colors.text.secondary,
    marginBottom: spacing.sm,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.glass.background,
    borderRadius: borderRadius.lg,
    borderWidth: 2,
    borderColor: colors.semantic.success,
    paddingHorizontal: spacing.md,
  },
  currency: {
    ...typography.headlineLarge,
    color: colors.semantic.success,
    marginRight: spacing.xs,
  },
  input: {
    flex: 1,
    ...typography.headlineLarge,
    color: colors.text.primary,
    paddingVertical: spacing.md,
  },
  totalHint: {
    ...typography.bodySmall,
    color: colors.text.tertiary,
    marginTop: spacing.xs,
    textAlign: "right",
  },
  priceDifferenceContainer: {
    marginBottom: spacing.lg,
  },
  priceDifferenceBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
  },
  priceDifferenceMore: {
    backgroundColor: `${colors.semantic.danger}15`,
  },
  priceDifferenceLess: {
    backgroundColor: `${colors.semantic.success}15`,
  },
  priceDifferenceText: {
    ...typography.bodyMedium,
    fontWeight: "500",
  },
  priceDifferenceMoreText: {
    color: colors.semantic.danger,
  },
  priceDifferenceLessText: {
    color: colors.semantic.success,
  },
  actions: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  actionBtn: {
    flex: 1,
  },
});
