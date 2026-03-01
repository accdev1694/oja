import React, { useState, useMemo } from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
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
  borderRadius,
} from "@/components/ui/glass";

interface CombineListsModalProps {
  visible: boolean;
  sourceListIds: Id<"shoppingLists">[];
  onClose: () => void;
  onConfirm: (newName: string, budget?: number) => Promise<void>;
}

export function CombineListsModal({
  visible,
  sourceListIds,
  onClose,
  onConfirm,
}: CombineListsModalProps) {
  const [newName, setNewName] = useState(`Combined List`);
  const [isCreating, setIsCreating] = useState(false);

  // We fetch history just to get the names/stats of the selected lists
  // This is a quick way to get details without a dedicated preview endpoint for multi-select
  const history = useQuery(api.shoppingLists.getHistory);
  
  const selectedLists = useMemo(() => {
    if (!history) return [];
    return history.filter(l => sourceListIds.includes(l._id));
  }, [history, sourceListIds]);

  const totalEstimatedCost = useMemo(() => {
    return selectedLists.reduce((sum, list) => {
      // Safely access properties that might exist depending on the query return type
      const l = list as any;
      return sum + (l.totalEstimatedCost || l.actualTotal || l.budget || 0);
    }, 0);
  }, [selectedLists]);

  const totalItemCount = useMemo(() => {
    return selectedLists.reduce((sum, list) => {
      const l = list as any;
      return sum + (l.itemCount || 0);
    }, 0);
  }, [selectedLists]);

  const handleCreate = async () => {
    if (!newName.trim()) return;

    setIsCreating(true);
    try {
      await onConfirm(newName.trim(), totalEstimatedCost);
      onClose();
    } finally {
      setIsCreating(false);
    }
  };

  if (sourceListIds.length === 0) {
    return null;
  }

  return (
    <GlassModal visible={visible} onClose={onClose} avoidKeyboard>
      <Text style={styles.modalTitle}>Combine {sourceListIds.length} Lists</Text>
      <ScrollView style={styles.content}>
        
        {/* Warning/Info about deduplication */}
        <View style={styles.infoBox}>
          <MaterialCommunityIcons name="information" size={20} color={colors.accent.primary} />
          <Text style={styles.infoText}>
            Identical items across these lists will be automatically merged, keeping the highest quantity.
          </Text>
        </View>

        {/* Selected Lists Overview */}
        <Text style={styles.sectionTitle}>Selected Lists</Text>
        <View style={styles.listsContainer}>
          {selectedLists.map(list => (
            <View key={list._id} style={styles.listRow}>
              <MaterialCommunityIcons name="clipboard-check-outline" size={16} color={colors.text.tertiary} />
              <Text style={styles.listName} numberOfLines={1}>{list.name}</Text>
            </View>
          ))}
        </View>

        {/* Stats */}
        <View style={styles.stats}>
          <View style={styles.stat}>
            <Text style={styles.statValue}>~{totalItemCount}</Text>
            <Text style={styles.statLabel}>Items (pre-merge)</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statValue}>
              £{totalEstimatedCost.toFixed(2)}
            </Text>
            <Text style={styles.statLabel}>Est. Total</Text>
          </View>
        </View>

        {/* New list name input */}
        <View style={styles.inputSection}>
          <Text style={styles.inputLabel}>New Combined List Name</Text>
          <GlassInput
            value={newName}
            onChangeText={setNewName}
            placeholder="Enter combined list name"
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
          Combine Lists
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
  infoBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: `${colors.accent.primary}15`,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  infoText: {
    ...typography.bodySmall,
    color: colors.text.secondary,
    flex: 1,
  },
  sectionTitle: {
    ...typography.labelMedium,
    color: colors.text.secondary,
    marginBottom: spacing.sm,
  },
  listsContainer: {
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
    gap: spacing.xs,
  },
  listRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  listName: {
    ...typography.bodyMedium,
    color: colors.text.primary,
    flex: 1,
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
});