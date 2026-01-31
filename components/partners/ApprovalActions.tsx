import React from "react";
import { View, Pressable, Text, StyleSheet } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { colors, spacing, typography } from "@/lib/design/glassTokens";

interface ApprovalActionsProps {
  onApprove: () => Promise<void> | void;
  onReject?: () => Promise<void> | void;
}

export function ApprovalActions({
  onApprove,
  onReject,
}: ApprovalActionsProps) {
  const handleApprove = async () => {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await onApprove();
  };

  const handleReject = async () => {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    if (onReject) await onReject();
  };

  return (
    <View style={styles.row}>
      <Pressable
        style={[styles.button, styles.approveButton]}
        onPress={handleApprove}
      >
        <MaterialCommunityIcons
          name="check"
          size={16}
          color={colors.text.primary}
        />
        <Text style={styles.buttonText}>Approve</Text>
      </Pressable>
      <Pressable
        style={[styles.button, styles.rejectButton]}
        onPress={handleReject}
      >
        <MaterialCommunityIcons
          name="close"
          size={16}
          color={colors.text.primary}
        />
        <Text style={styles.buttonText}>Reject</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  button: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 8,
  },
  approveButton: {
    backgroundColor: "rgba(16, 185, 129, 0.25)",
  },
  rejectButton: {
    backgroundColor: "rgba(239, 68, 68, 0.25)",
  },
  buttonText: {
    color: colors.text.primary,
    fontSize: typography.bodyMedium.fontSize,
    fontWeight: "600",
  },
});
