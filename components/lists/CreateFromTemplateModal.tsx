import React, { useState } from "react";
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import {
  GlassModal,
  GlassButton,
  GlassInput,
  colors,
  typography,
  spacing,
} from "@/components/ui/glass";
import { formatPrice } from "@/lib/currency/currencyUtils";
import { useCurrentUser } from "@/hooks/useCurrentUser";

interface CreateFromTemplateModalProps {
  visible: boolean;
  sourceListId: Id<"shoppingLists"> | null;
  sourceListName: string;
  onClose: () => void;
  onConfirm: (newName: string, budget?: number) => Promise<void>;
}

export function CreateFromTemplateModal({
  visible,
  sourceListId,
  sourceListName,
  onClose,
  onConfirm,
}: CreateFromTemplateModalProps) {
  const [newName, setNewName] = useState(`${sourceListName} (Copy)`);
  const [isCreating, setIsCreating] = useState(false);
  const { currency } = useCurrentUser();

  const preview = useQuery(
    api.shoppingLists.getTemplatePreview,
    sourceListId ? { listId: sourceListId } : "skip"
  );

  const handleCreate = async () => {
    if (!newName.trim()) return;

    setIsCreating(true);
    try {
      await onConfirm(newName.trim());
      onClose();
    } finally {
      setIsCreating(false);
    }
  };

  // Show loading state while preview loads
  if (!preview) {
    return (
      <GlassModal visible={visible} onClose={onClose}>
        <Text style={styles.modalTitle}>Create from Template</Text>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.accent.primary} />
          <Text style={styles.loadingText}>Loading preview...</Text>
        </View>
      </GlassModal>
    );
  }

  return (
    <GlassModal visible={visible} onClose={onClose} avoidKeyboard>
      <Text style={styles.modalTitle}>Create from Template</Text>
      <ScrollView style={styles.content}>
        {/* Source list info */}
        <View style={styles.sourceInfo}>
          <MaterialCommunityIcons
            name="clipboard-check"
            size={20}
            color={colors.text.tertiary}
          />
          <Text style={styles.sourceText}>
            From: {sourceListName}
          </Text>
        </View>

        {/* Stats */}
        <View style={styles.stats}>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{preview.itemCount}</Text>
            <Text style={styles.statLabel}>Items</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statValue}>
              {formatPrice(preview.totalEstimated, currency || "GBP")}
            </Text>
            <Text style={styles.statLabel}>Estimated</Text>
          </View>
          {preview.list.storeName && (
            <View style={styles.stat}>
              <MaterialCommunityIcons
                name="store"
                size={16}
                color={colors.text.tertiary}
              />
              <Text style={styles.statLabel}>{preview.list.storeName}</Text>
            </View>
          )}
        </View>

        {/* Category breakdown */}
        <View style={styles.categories}>
          <Text style={styles.sectionTitle}>Categories</Text>
          {preview.itemsByCategory.map(({ category, count }: any) => (
            <View key={category} style={styles.categoryRow}>
              <Text style={styles.categoryName}>{category}</Text>
              <Text style={styles.categoryCount}>{count} items</Text>
            </View>
          ))}
        </View>

        {/* New list name input */}
        <View style={styles.inputSection}>
          <Text style={styles.inputLabel}>New List Name</Text>
          <GlassInput
            value={newName}
            onChangeText={setNewName}
            placeholder="Enter list name"
            autoFocus
          />
        </View>
      </ScrollView>

      {/* Actions */}
      <View style={styles.actions}>
        <GlassButton
          variant="secondary"
          onPress={onClose}
          style={styles.actionButton}
          disabled={isCreating}
        >
          Cancel
        </GlassButton>
        <GlassButton
          variant="primary"
          onPress={handleCreate}
          style={styles.actionButton}
          disabled={!newName.trim() || isCreating}
          loading={isCreating}
        >
          Create List
        </GlassButton>
      </View>
    </GlassModal>
  );
}

const styles = StyleSheet.create({
  modalTitle: {
    ...typography.headlineMedium,
    color: colors.text.primary,
    marginBottom: spacing.md,
  },
  content: {
    maxHeight: 500,
  },
  sourceInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: spacing.lg,
    padding: spacing.md,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderRadius: 8,
  },
  sourceText: {
    ...typography.bodyMedium,
    color: colors.text.secondary,
  },
  stats: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: spacing.lg,
    padding: spacing.md,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderRadius: 8,
  },
  stat: {
    alignItems: "center",
    gap: spacing.xs,
  },
  statValue: {
    ...typography.headlineSmall,
    color: colors.accent.primary,
    fontWeight: "700",
  },
  statLabel: {
    ...typography.bodySmall,
    color: colors.text.tertiary,
  },
  categories: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    ...typography.labelMedium,
    color: colors.text.secondary,
    marginBottom: spacing.sm,
  },
  categoryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.1)",
  },
  categoryName: {
    ...typography.bodyMedium,
    color: colors.text.primary,
  },
  categoryCount: {
    ...typography.bodySmall,
    color: colors.text.tertiary,
  },
  inputSection: {
    marginBottom: spacing.lg,
  },
  inputLabel: {
    ...typography.labelMedium,
    color: colors.text.secondary,
    marginBottom: spacing.sm,
  },
  actions: {
    flexDirection: "row",
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  actionButton: {
    flex: 1,
  },
  loadingContainer: {
    paddingVertical: spacing.xl,
    alignItems: "center",
    gap: spacing.md,
  },
  loadingText: {
    ...typography.bodyMedium,
    color: colors.text.secondary,
  },
});