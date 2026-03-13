/**
 * StoreMismatchCard - Shows store mismatch warning and resolution on reconciliation screen
 */

import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import {
  GlassCard,
  GlassButton,
  colors,
  typography,
  spacing,
} from "@/components/ui/glass";

export function StoreMismatchCard({
  mismatchInfo,
  mismatchChoice,
  setMismatchChoice,
} {
  if (!mismatchInfo?.isMismatch) return null;

  // Already resolved
  if (mismatchChoice !== null) {
    return (
      <View style={styles.mismatchResolved}>
        <MaterialCommunityIcons
          name="check-circle-outline"
          size={16}
          color={colors.text.tertiary}
        />
        <Text style={styles.mismatchResolvedText}>
          {mismatchChoice === "tag"
            ? `Items will be tagged as ${mismatchInfo.receiptStore}`
            : `Items will stay as ${mismatchInfo.listStore}`}
        </Text>
      </View>
    );
  }

  // Unresolved warning
  return (
    <GlassCard variant="bordered" accentColor={colors.semantic.warning} style={styles.section}>
      <View style={styles.sectionHeader}>
        <MaterialCommunityIcons
          name="alert-outline"
          size={20}
          color={colors.semantic.warning}
        />
        <Text style={styles.sectionTitle}>Store Mismatch</Text>
      </View>
      <Text style={styles.mismatchText}>
        This receipt is from{" "}
        <Text style={{ fontWeight: "700" }}>{mismatchInfo.receiptStore}</Text>
        , but your list was for{" "}
        <Text style={{ fontWeight: "700" }}>{mismatchInfo.listStore}</Text>.
      </Text>
      <View style={styles.mismatchActions}>
        <GlassButton
          variant="secondary"
          size="sm"
          icon="tag-outline"
          onPress={() => setMismatchChoice("tag")}
          style={styles.mismatchButton}
        >
          {`Tag items as ${mismatchInfo.receiptStore}`}
        </GlassButton>
        <GlassButton
          variant="secondary"
          size="sm"
          icon="close"
          onPress={() => setMismatchChoice("ignore")}
          style={styles.mismatchButton}
        >
          {`Keep as ${mismatchInfo.listStore}`}
        </GlassButton>
      </View>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: spacing.md,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    ...typography.labelLarge,
    color: colors.text.primary,
  },
  mismatchText: {
    ...typography.bodyMedium,
    color: colors.text.secondary,
    marginBottom: spacing.md,
    lineHeight: 22,
  },
  mismatchActions: {
    gap: spacing.sm,
  },
  mismatchButton: {
    marginBottom: spacing.xs,
  },
  mismatchResolved: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: spacing.md,
    paddingHorizontal: spacing.xs,
  },
  mismatchResolvedText: {
    ...typography.bodySmall,
    color: colors.text.tertiary,
    fontStyle: "italic",
  },
});
