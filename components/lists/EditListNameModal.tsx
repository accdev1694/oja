import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet } from "react-native";
import * as Haptics from "expo-haptics";
import {
  GlassModal,
  GlassButton,
  GlassInput,
  colors,
  typography,
  spacing,
} from "@/components/ui/glass";

interface EditListNameModalProps {
  visible: boolean;
  currentName: string;
  onClose: () => void;
  onSave: (newName: string) => Promise<void>;
}

export function EditListNameModal({
  visible,
  currentName,
  onClose,
  onSave,
}: EditListNameModalProps) {
  const [name, setName] = useState(currentName);
  const [isSaving, setIsSaving] = useState(false);

  // Reset name when modal opens
  useEffect(() => {
    if (visible) {
      setName(currentName);
    }
  }, [visible, currentName]);

  const handleSave = async () => {
    const trimmedName = name.trim();
    if (!trimmedName) return;
    if (trimmedName === currentName) {
      onClose();
      return;
    }

    setIsSaving(true);
    try {
      await onSave(trimmedName);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onClose();
    } catch (error) {
      console.error("Failed to update list name:", error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <GlassModal visible={visible} onClose={onClose} avoidKeyboard>
      <Text style={styles.modalTitle}>Edit List Name</Text>

      <View style={styles.inputSection}>
        <GlassInput
          value={name}
          onChangeText={setName}
          placeholder="Enter list name"
          autoFocus
          maxLength={100}
        />
      </View>

      <View style={styles.actions}>
        <GlassButton
          variant="secondary"
          onPress={onClose}
          style={styles.actionButton}
          disabled={isSaving}
        >
          Cancel
        </GlassButton>
        <GlassButton
          variant="primary"
          onPress={handleSave}
          style={styles.actionButton}
          disabled={!name.trim() || name.trim() === currentName || isSaving}
          loading={isSaving}
        >
          Save
        </GlassButton>
      </View>
    </GlassModal>
  );
}

const styles = StyleSheet.create({
  modalTitle: {
    ...typography.headlineMedium,
    color: colors.text.primary,
    marginBottom: spacing.lg,
  },
  inputSection: {
    marginBottom: spacing.lg,
  },
  actions: {
    flexDirection: "row",
    gap: spacing.md,
    marginTop: spacing.md,
  },
  actionButton: {
    flex: 1,
  },
});
