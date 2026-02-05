import React, { useState } from "react";
import { View, Text, Pressable, TextInput, StyleSheet } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useMutation } from "convex/react";
import * as Haptics from "expo-haptics";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { colors, spacing, typography } from "@/lib/design/glassTokens";

type ListApprovalStatus =
  | "draft"
  | "pending_approval"
  | "approved"
  | "rejected"
  | "changes_requested"
  | undefined;

interface ListApprovalBannerProps {
  listId: Id<"shoppingLists">;
  approvalStatus: ListApprovalStatus;
  approvalNote?: string;
  approverName?: string;
  isOwner: boolean;
  canApprove: boolean;
  hasApprovers: boolean;
}

export function ListApprovalBanner({
  listId,
  approvalStatus,
  approvalNote,
  approverName,
  isOwner,
  canApprove,
  hasApprovers,
}: ListApprovalBannerProps) {
  const [showNoteInput, setShowNoteInput] = useState(false);
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);

  const submitForApproval = useMutation(api.partners.submitListForApproval);
  const handleListApproval = useMutation(api.partners.handleListApproval);

  const handleSubmit = async () => {
    setLoading(true);
    try {
      await submitForApproval({ listId });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    setLoading(true);
    try {
      await handleListApproval({ listId, decision: "approved" });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setLoading(false);
    }
  };

  const handleRequestChanges = async () => {
    if (!note.trim()) {
      setShowNoteInput(true);
      return;
    }
    setLoading(true);
    try {
      await handleListApproval({
        listId,
        decision: "changes_requested",
        note: note.trim(),
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setNote("");
      setShowNoteInput(false);
    } catch {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setLoading(false);
    }
  };

  // Owner: show "Submit for Approval" button when no approval or after rejection
  if (isOwner && hasApprovers && (!approvalStatus || approvalStatus === "rejected" || approvalStatus === "changes_requested" || approvalStatus === "draft")) {
    const isResubmit = approvalStatus === "rejected" || approvalStatus === "changes_requested";
    return (
      <View style={styles.container}>
        {isResubmit && approvalNote && (
          <View style={[styles.banner, styles.rejectedBanner]}>
            <MaterialCommunityIcons name="alert-circle-outline" size={16} color={colors.accent.error} />
            <Text style={styles.rejectedText} numberOfLines={2}>
              {approverName ? `${approverName}: ` : ""}{approvalNote}
            </Text>
          </View>
        )}
        <Pressable
          style={[styles.submitButton, loading && styles.disabled]}
          onPress={handleSubmit}
          disabled={loading}
        >
          <MaterialCommunityIcons name="clipboard-check-outline" size={18} color="#fff" />
          <Text style={styles.submitText}>
            {isResubmit ? "Resubmit for Approval" : "Submit for Approval"}
          </Text>
        </Pressable>
      </View>
    );
  }

  // Pending: show status to everyone
  if (approvalStatus === "pending_approval") {
    return (
      <View style={styles.container}>
        <View style={[styles.banner, styles.pendingBanner]}>
          <MaterialCommunityIcons name="clock-outline" size={16} color={colors.accent.warning} />
          <Text style={styles.pendingText}>
            {isOwner ? "Sent for approval" : "Awaiting your review"}
          </Text>
        </View>

        {/* Approver actions */}
        {canApprove && (
          <View style={styles.actionRow}>
            <Pressable
              style={[styles.approveButton, loading && styles.disabled]}
              onPress={handleApprove}
              disabled={loading}
            >
              <MaterialCommunityIcons name="check" size={16} color="#fff" />
              <Text style={styles.approveText}>Approve</Text>
            </Pressable>
            <Pressable
              style={[styles.changesButton, loading && styles.disabled]}
              onPress={handleRequestChanges}
              disabled={loading}
            >
              <MaterialCommunityIcons name="pencil-outline" size={16} color={colors.accent.warning} />
              <Text style={styles.changesText}>Request Changes</Text>
            </Pressable>
          </View>
        )}

        {showNoteInput && (
          <View style={styles.noteRow}>
            <TextInput
              style={styles.noteInput}
              placeholder="What changes are needed?"
              placeholderTextColor={colors.text.tertiary}
              value={note}
              onChangeText={setNote}
              maxLength={300}
              returnKeyType="send"
              onSubmitEditing={handleRequestChanges}
              autoFocus
            />
            <Pressable onPress={handleRequestChanges} disabled={!note.trim()}>
              <MaterialCommunityIcons
                name="send"
                size={20}
                color={note.trim() ? colors.accent.primary : colors.text.disabled}
              />
            </Pressable>
          </View>
        )}
      </View>
    );
  }

  // Approved
  if (approvalStatus === "approved") {
    return (
      <View style={[styles.banner, styles.approvedBanner, { margin: spacing.md }]}>
        <MaterialCommunityIcons name="check-circle" size={16} color={colors.accent.success} />
        <Text style={styles.approvedText}>
          Approved{approverName ? ` by ${approverName}` : ""}
        </Text>
      </View>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  banner: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 10,
  },
  pendingBanner: {
    backgroundColor: "rgba(245, 158, 11, 0.12)",
  },
  pendingText: {
    color: colors.accent.warning,
    fontSize: typography.bodyMedium.fontSize,
    fontWeight: "600",
  },
  approvedBanner: {
    backgroundColor: "rgba(16, 185, 129, 0.12)",
  },
  approvedText: {
    color: colors.accent.success,
    fontSize: typography.bodyMedium.fontSize,
    fontWeight: "600",
  },
  rejectedBanner: {
    backgroundColor: "rgba(239, 68, 68, 0.1)",
  },
  rejectedText: {
    color: colors.accent.error,
    fontSize: typography.bodySmall.fontSize,
    flex: 1,
  },
  submitButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    backgroundColor: colors.accent.primary,
    paddingVertical: 12,
    borderRadius: 12,
  },
  submitText: {
    color: "#fff",
    fontSize: typography.bodyMedium.fontSize,
    fontWeight: "700",
  },
  actionRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  approveButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    backgroundColor: colors.accent.success,
    paddingVertical: 10,
    borderRadius: 10,
  },
  approveText: {
    color: "#fff",
    fontSize: typography.bodyMedium.fontSize,
    fontWeight: "600",
  },
  changesButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    borderWidth: 1,
    borderColor: colors.accent.warning,
    paddingVertical: 10,
    borderRadius: 10,
  },
  changesText: {
    color: colors.accent.warning,
    fontSize: typography.bodyMedium.fontSize,
    fontWeight: "600",
  },
  noteRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  noteInput: {
    flex: 1,
    backgroundColor: colors.glass.background,
    borderRadius: 20,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    color: colors.text.primary,
    fontSize: typography.bodyMedium.fontSize,
    borderWidth: 1,
    borderColor: colors.glass.border,
  },
  disabled: {
    opacity: 0.5,
  },
});
