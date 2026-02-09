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

// ─── Types ──────────────────────────────────────────────────────────────────

export interface EditBudgetModalProps {
  visible: boolean;
  budget: number;
  onClose: () => void;
  /** Called with the parsed budget value. Undefined means "clear budget". */
  onSave: (newBudget: number | undefined) => Promise<void>;
}

// ─── Component ──────────────────────────────────────────────────────────────

export function EditBudgetModal({ visible, budget, onClose, onSave }: EditBudgetModalProps) {
  const [editBudgetValue, setEditBudgetValue] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const { alert } = useGlassAlert();

  // Sync value when modal opens
  useEffect(() => {
    if (visible) {
      setEditBudgetValue(budget > 0 ? budget.toString() : "");
    }
  }, [visible, budget]);

  function handleClose() {
    setEditBudgetValue("");
    onClose();
  }

  async function handleSave() {
    const budgetNum = parseFloat(editBudgetValue) || 0;
    if (budgetNum < 0) {
      alert("Error", "Budget cannot be negative");
      return;
    }

    setIsSaving(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await onSave(budgetNum > 0 ? budgetNum : undefined);
      handleClose();
    } catch (error) {
      console.error("Failed to update budget:", error);
      alert("Error", "Failed to update budget");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <GlassModal
      visible={visible}
      onClose={handleClose}
      overlayOpacity={0.75}
      maxWidth={360}
      avoidKeyboard
    >
      <View style={styles.header}>
        <MaterialCommunityIcons
          name="wallet-outline"
          size={24}
          color={colors.accent.primary}
        />
        <Text style={styles.title}>
          {budget > 0 ? "Edit Budget" : "Set Budget"}
        </Text>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Budget Amount</Text>
        <View style={styles.inputContainer}>
          <Text style={styles.currency}>{"\u00A3"}</Text>
          <TextInput
            style={styles.input}
            value={editBudgetValue}
            onChangeText={setEditBudgetValue}
            keyboardType="decimal-pad"
            placeholder="50.00"
            placeholderTextColor={colors.text.tertiary}
            autoFocus
          />
        </View>
      </View>

      <View style={styles.actions}>
        <GlassButton
          variant="secondary"
          onPress={handleClose}
          style={styles.actionBtn}
        >
          Cancel
        </GlassButton>
        <GlassButton
          variant="primary"
          onPress={handleSave}
          loading={isSaving}
          disabled={isSaving}
          style={styles.actionBtn}
        >
          {budget > 0 ? "Update" : "Set Budget"}
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
    gap: spacing.sm,
    marginBottom: spacing.xl,
  },
  title: {
    ...typography.headlineMedium,
    color: colors.text.primary,
  },
  inputGroup: {
    marginBottom: spacing.lg,
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
    borderWidth: 1,
    borderColor: colors.glass.border,
    paddingHorizontal: spacing.md,
  },
  currency: {
    ...typography.headlineLarge,
    color: colors.accent.primary,
    marginRight: spacing.xs,
  },
  input: {
    flex: 1,
    ...typography.headlineLarge,
    color: colors.text.primary,
    paddingVertical: spacing.md,
  },
  actions: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  actionBtn: {
    flex: 1,
  },
});
