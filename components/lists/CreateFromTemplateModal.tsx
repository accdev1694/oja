import React, { useState, useEffect, useMemo } from "react";
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Pressable } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import {
  GlassModal,
  GlassButton,
  GlassInput,
  GlassCheckbox,
  colors,
  typography,
  spacing,
  borderRadius,
} from "@/components/ui/glass";
import { formatPrice } from "@/lib/currency/currencyUtils";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { defaultListName } from "@/lib/list/helpers";

export function CreateFromTemplateModal({
  visible,
  sourceListId,
  sourceListName,
  onClose,
  onConfirm,
  historyLists,
}: any) {
  const [newName, setNewName] = useState(defaultListName());
  const [isCreating, setIsCreating] = useState(false);
  const [showCombinePicker, setShowCombinePicker] = useState(false);
  const [additionalListIds, setAdditionalListIds] = useState(new Set());
  const { user } = useCurrentUser();
  const currency = user?.currency || "GBP";

  const preview = useQuery(
    api.shoppingLists.getTemplatePreview,
    sourceListId ? { listId: sourceListId } : "skip"
  );

  // Other history lists (excluding the source)
  const otherLists = useMemo(() => {
    if (!historyLists || !sourceListId) return [];
    return historyLists.filter((l: any) => l._id !== sourceListId);
  }, [historyLists, sourceListId]);

  // Reset state when modal opens
  useEffect(() => {
    if (visible) {
      setNewName(defaultListName());
      setShowCombinePicker(false);
      setAdditionalListIds(new Set());
    }
  }, [visible]);

  const toggleAdditionalList = (listId: any) => {
    Haptics.selectionAsync();
    setAdditionalListIds((prev) => {
      const next = new Set(prev);
      if (next.has(listId)) next.delete(listId);
      else next.add(listId);
      return next;
    });
  };

  const handleCreate = async () => {
    if (!newName.trim()) return;

    setIsCreating(true);
    try {
      await onConfirm(
        newName.trim(),
        undefined,
        additionalListIds.size > 0 ? Array.from(additionalListIds) : undefined
      );
      onClose();
    } finally {
      setIsCreating(false);
    }
  };

  const isCombineMode = additionalListIds.size > 0;

  // Show loading state while preview loads
  if (!preview) {
    return (
      <GlassModal visible={visible} onClose={onClose}>
        <Text style={styles.modalTitle}>Shop Again</Text>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.accent.primary} />
          <Text style={styles.loadingText}>Loading preview...</Text>
        </View>
      </GlassModal>
    );
  }

  return (
    <GlassModal visible={visible} onClose={onClose} avoidKeyboard>
      <Text style={styles.modalTitle}>Shop Again</Text>
      <ScrollView style={styles.content}>
        {/* Source list info */}
        <View style={styles.sourceInfo}>
          <MaterialCommunityIcons name="clipboard-check" size={20} color={colors.text.tertiary} />
          <Text style={styles.sourceText}>From: {sourceListName}</Text>
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
              <MaterialCommunityIcons name="store" size={16} color={colors.text.tertiary} />
              <Text style={styles.statLabel}>{preview.list.storeName}</Text>
            </View>
          )}
        </View>

        {/* Category breakdown */}
        <View style={styles.categories}>
          <Text style={styles.sectionTitle}>Categories</Text>
          {preview.itemsByCategory.map(({ category, count }) => (
            <View key={category} style={styles.categoryRow}>
              <Text style={styles.categoryName}>{category}</Text>
              <Text style={styles.categoryCount}>{count} items</Text>
            </View>
          ))}
        </View>

        {/* Combine with other trips */}
        {otherLists.length > 0 && (
          <View style={styles.combineSection}>
            <Pressable
              style={styles.combineToggle}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setShowCombinePicker(!showCombinePicker);
              }}
            >
              <MaterialCommunityIcons
                name="layers-plus"
                size={18}
                color={colors.accent.primary}
              />
              <Text style={styles.combineToggleText}>
                {showCombinePicker ? "Hide past trips" : "Combine with past trips"}
              </Text>
              {isCombineMode && (
                <View style={styles.combineBadge}>
                  <Text style={styles.combineBadgeText}>+{additionalListIds.size}</Text>
                </View>
              )}
              <MaterialCommunityIcons
                name={showCombinePicker ? "chevron-up" : "chevron-down"}
                size={18}
                color={colors.text.tertiary}
              />
            </Pressable>

            {showCombinePicker && (
              <View style={styles.combineList}>
                {otherLists.slice(0, 10).map((list: any) => (
                  <Pressable
                    key={list._id}
                    style={styles.combineItem}
                    onPress={() => toggleAdditionalList(list._id)}
                  >
                    <GlassCheckbox
                      checked={additionalListIds.has(list._id)}
                      onToggle={() => toggleAdditionalList(list._id)}
                    />
                    <View style={styles.combineItemInfo}>
                      <Text style={styles.combineItemName} numberOfLines={1}>
                        {list.name}
                      </Text>
                      {list.storeName && (
                        <Text style={styles.combineItemMeta}>{list.storeName}</Text>
                      )}
                    </View>
                  </Pressable>
                ))}
              </View>
            )}
          </View>
        )}

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
          {isCombineMode ? `Combine & Create` : "Create List"}
        </GlassButton>
      </View>
    </GlassModal>
  );
}

const styles = StyleSheet.create({
  modalTitle: { ...typography.headlineMedium, color: colors.text.primary, marginBottom: spacing.md },
  content: { maxHeight: 500 },
  sourceInfo: {
    flexDirection: "row", alignItems: "center", gap: spacing.sm,
    marginBottom: spacing.lg, padding: spacing.md,
    backgroundColor: "rgba(255, 255, 255, 0.05)", borderRadius: 8,
  },
  sourceText: { ...typography.bodyMedium, color: colors.text.secondary },
  stats: {
    flexDirection: "row", justifyContent: "space-around",
    marginBottom: spacing.lg, padding: spacing.md,
    backgroundColor: "rgba(255, 255, 255, 0.05)", borderRadius: 8,
  },
  stat: { alignItems: "center", gap: spacing.xs },
  statValue: { ...typography.headlineSmall, color: colors.accent.primary, fontWeight: "700" },
  statLabel: { ...typography.bodySmall, color: colors.text.tertiary },
  categories: { marginBottom: spacing.lg },
  sectionTitle: { ...typography.labelMedium, color: colors.text.secondary, marginBottom: spacing.sm },
  categoryRow: {
    flexDirection: "row", justifyContent: "space-between",
    paddingVertical: spacing.sm, borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.1)",
  },
  categoryName: { ...typography.bodyMedium, color: colors.text.primary },
  categoryCount: { ...typography.bodySmall, color: colors.text.tertiary },
  combineSection: { marginBottom: spacing.lg },
  combineToggle: {
    flexDirection: "row", alignItems: "center", gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  combineToggleText: { ...typography.bodyMedium, color: colors.accent.primary, fontWeight: "600", flex: 1 },
  combineBadge: {
    backgroundColor: `${colors.accent.primary}20`,
    paddingHorizontal: spacing.sm, paddingVertical: 2,
    borderRadius: borderRadius.full,
  },
  combineBadgeText: { ...typography.labelSmall, color: colors.accent.primary, fontWeight: "700" },
  combineList: { gap: spacing.xs, marginTop: spacing.sm },
  combineItem: { flexDirection: "row", alignItems: "center", gap: spacing.sm, paddingVertical: spacing.xs },
  combineItemInfo: { flex: 1 },
  combineItemName: { ...typography.bodyMedium, color: colors.text.primary },
  combineItemMeta: { ...typography.bodySmall, color: colors.text.tertiary },
  inputSection: { marginBottom: spacing.lg },
  inputLabel: { ...typography.labelMedium, color: colors.text.secondary, marginBottom: spacing.sm },
  actions: { flexDirection: "row", gap: spacing.md, marginTop: spacing.lg },
  actionButton: { flex: 1 },
  loadingContainer: { paddingVertical: spacing.xl, alignItems: "center", gap: spacing.md },
  loadingText: { ...typography.bodyMedium, color: colors.text.secondary },
});
