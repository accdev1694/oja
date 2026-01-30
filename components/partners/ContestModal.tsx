import React, { useState } from "react";
import {
  View,
  Text,
  Modal,
  Pressable,
  TextInput,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { colors, spacing, typography } from "@/lib/design/glassTokens";

interface ContestModalProps {
  visible: boolean;
  itemName: string;
  onContest: (reason: string, customText?: string) => Promise<void>;
  onClose: () => void;
}

const QUICK_REASONS = [
  { label: "Too expensive", icon: "currency-gbp" },
  { label: "Already have it", icon: "check-circle-outline" },
  { label: "Not needed", icon: "close-circle-outline" },
  { label: "Other", icon: "pencil-outline" },
] as const;

export function ContestModal({
  visible,
  itemName,
  onContest,
  onClose,
}: ContestModalProps) {
  const [selectedReason, setSelectedReason] = useState<string | null>(null);
  const [customText, setCustomText] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSelect = (reason: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedReason(reason);
    if (reason !== "Other") {
      setCustomText("");
    }
  };

  const handleSubmit = async () => {
    if (!selectedReason) return;
    setLoading(true);
    try {
      await onContest(
        selectedReason,
        selectedReason === "Other" ? customText || undefined : undefined
      );
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      handleReset();
      onClose();
    } catch {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setSelectedReason(null);
    setCustomText("");
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <Pressable style={styles.overlay} onPress={handleClose}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <Pressable style={styles.modal} onPress={(e) => e.stopPropagation()}>
            <View style={styles.header}>
              <MaterialCommunityIcons
                name="alert-circle"
                size={24}
                color="#FF8C00"
              />
              <Text style={styles.title}>Contest Item</Text>
            </View>

            <Text style={styles.subtitle}>
              Why do you want to contest "{itemName}"?
            </Text>

            <View style={styles.reasons}>
              {QUICK_REASONS.map(({ label, icon }) => (
                <Pressable
                  key={label}
                  style={[
                    styles.reasonChip,
                    selectedReason === label && styles.reasonChipSelected,
                  ]}
                  onPress={() => handleSelect(label)}
                >
                  <MaterialCommunityIcons
                    name={icon as any}
                    size={18}
                    color={
                      selectedReason === label
                        ? colors.text.primary
                        : colors.text.secondary
                    }
                  />
                  <Text
                    style={[
                      styles.reasonText,
                      selectedReason === label && styles.reasonTextSelected,
                    ]}
                  >
                    {label}
                  </Text>
                </Pressable>
              ))}
            </View>

            {selectedReason === "Other" && (
              <TextInput
                style={styles.input}
                placeholder="Tell them why..."
                placeholderTextColor={colors.text.tertiary}
                value={customText}
                onChangeText={setCustomText}
                multiline
                maxLength={200}
              />
            )}

            <View style={styles.actions}>
              <Pressable style={styles.cancelButton} onPress={handleClose}>
                <Text style={styles.cancelText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[
                  styles.submitButton,
                  !selectedReason && styles.submitDisabled,
                ]}
                onPress={handleSubmit}
                disabled={!selectedReason || loading}
              >
                <Text style={styles.submitText}>
                  {loading ? "Contesting..." : "Contest"}
                </Text>
              </Pressable>
            </View>
          </Pressable>
        </KeyboardAvoidingView>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.lg,
  },
  modal: {
    backgroundColor: colors.background.secondary,
    borderRadius: 16,
    padding: spacing.lg,
    width: "100%",
    maxWidth: 400,
    borderWidth: 1,
    borderColor: colors.glass.border,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  title: {
    fontSize: typography.headlineMedium.fontSize,
    fontWeight: "700",
    color: colors.text.primary,
  },
  subtitle: {
    fontSize: typography.bodyMedium.fontSize,
    color: colors.text.secondary,
    marginBottom: spacing.md,
  },
  reasons: {
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  reasonChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 10,
    backgroundColor: colors.glass.background,
    borderWidth: 1,
    borderColor: colors.glass.border,
  },
  reasonChipSelected: {
    backgroundColor: "rgba(255, 140, 0, 0.2)",
    borderColor: "#FF8C00",
  },
  reasonText: {
    fontSize: typography.bodyMedium.fontSize,
    color: colors.text.secondary,
  },
  reasonTextSelected: {
    color: colors.text.primary,
    fontWeight: "600",
  },
  input: {
    backgroundColor: colors.glass.background,
    borderWidth: 1,
    borderColor: colors.glass.border,
    borderRadius: 10,
    padding: spacing.md,
    color: colors.text.primary,
    fontSize: typography.bodyMedium.fontSize,
    minHeight: 80,
    textAlignVertical: "top",
    marginBottom: spacing.md,
  },
  actions: {
    flexDirection: "row",
    gap: spacing.sm,
    justifyContent: "flex-end",
  },
  cancelButton: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: 10,
  },
  cancelText: {
    color: colors.text.secondary,
    fontSize: typography.bodyMedium.fontSize,
    fontWeight: "600",
  },
  submitButton: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: 10,
    backgroundColor: "rgba(255, 140, 0, 0.3)",
  },
  submitDisabled: {
    opacity: 0.4,
  },
  submitText: {
    color: colors.text.primary,
    fontSize: typography.bodyMedium.fontSize,
    fontWeight: "700",
  },
});
