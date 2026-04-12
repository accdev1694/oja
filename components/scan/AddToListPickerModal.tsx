import { useState } from "react";
import { View, Text, TextInput, StyleSheet, Pressable, ScrollView } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useMutation } from "convex/react";

import {
  GlassButton,
  GlassModal,
  colors,
  typography,
  spacing,
  borderRadius,
} from "@/components/ui/glass";
import { api } from "@/convex/_generated/api";
import type { Doc, Id } from "@/convex/_generated/dataModel";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface AddToListPickerModalProps {
  visible: boolean;
  onClose: () => void;
  /** Active shopping lists to choose from */
  lists: Doc<"shoppingLists">[];
  /** Number of items about to be added — shown in the header for context */
  itemCount: number;
  /** Called once a list is chosen (existing or freshly created) */
  onSelect: (listId: Id<"shoppingLists">) => void;
}

// ─── Component ──────────────────────────────────────────────────────────────

export function AddToListPickerModal({
  visible,
  onClose,
  lists,
  itemCount,
  onSelect,
}: AddToListPickerModalProps) {
  const [mode, setMode] = useState<"pick" | "create">("pick");
  const [newName, setNewName] = useState("");
  const [newBudget, setNewBudget] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createList = useMutation(api.shoppingLists.create);

  function reset() {
    setMode("pick");
    setNewName("");
    setNewBudget("");
    setCreating(false);
    setError(null);
  }

  function handleClose() {
    reset();
    onClose();
  }

  function handlePick(listId: Id<"shoppingLists">) {
    Haptics.selectionAsync();
    onSelect(listId);
    reset();
  }

  async function handleCreate() {
    const name = newName.trim();
    if (!name) {
      setError("Enter a list name");
      return;
    }
    setCreating(true);
    setError(null);
    try {
      const budgetNum = parseFloat(newBudget);
      const listId = await createList({
        name,
        ...(Number.isFinite(budgetNum) && budgetNum > 0 ? { budget: budgetNum } : {}),
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onSelect(listId);
      reset();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to create list";
      setError(message);
      setCreating(false);
    }
  }

  return (
    <GlassModal
      visible={visible}
      onClose={handleClose}
      position="bottom"
      maxWidth="full"
      avoidKeyboard
    >
      <View style={styles.header}>
        <MaterialCommunityIcons name="format-list-bulleted" size={24} color={colors.accent.primary} />
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>
            {mode === "create" ? "New Shopping List" : "Add to Shopping List"}
          </Text>
          <Text style={styles.subtitle}>
            {mode === "create"
              ? `Create a list for your ${itemCount} scanned ${itemCount === 1 ? "item" : "items"}`
              : `Choose where to add your ${itemCount} scanned ${itemCount === 1 ? "item" : "items"}`}
          </Text>
        </View>
        <Pressable onPress={handleClose} hitSlop={12} style={styles.closeButton}>
          <MaterialCommunityIcons name="close" size={20} color={colors.text.secondary} />
        </Pressable>
      </View>

      {mode === "pick" ? (
        <>
          <ScrollView style={styles.listScroll} showsVerticalScrollIndicator={false}>
            <Pressable onPress={() => setMode("create")} style={styles.createRow}>
              <View style={[styles.rowIcon, styles.createIcon]}>
                <MaterialCommunityIcons name="plus" size={20} color={colors.accent.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.createRowTitle}>Create new list</Text>
                <Text style={styles.rowSubtitle}>Start a fresh list for these items</Text>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={18} color={colors.text.tertiary} />
            </Pressable>

            {lists.length === 0 ? (
              <View style={styles.emptyState}>
                <MaterialCommunityIcons name="cart-outline" size={32} color={colors.text.tertiary} />
                <Text style={styles.emptyText}>No active lists yet</Text>
              </View>
            ) : (
              lists.map((list) => (
                <Pressable
                  key={list._id}
                  onPress={() => handlePick(list._id)}
                  style={styles.listRow}
                >
                  <View style={styles.rowIcon}>
                    <MaterialCommunityIcons
                      name="cart-outline"
                      size={20}
                      color={colors.accent.primary}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.listName} numberOfLines={1}>
                      {list.name}
                    </Text>
                    <Text style={styles.rowSubtitle}>
                      {list.budget != null
                        ? `£${list.budget.toFixed(2)} budget`
                        : "No budget set"}
                      {list.storeName ? ` · ${list.storeName}` : ""}
                    </Text>
                  </View>
                  <MaterialCommunityIcons
                    name="chevron-right"
                    size={18}
                    color={colors.text.tertiary}
                  />
                </Pressable>
              ))
            )}
          </ScrollView>

          <GlassButton variant="ghost" size="md" onPress={handleClose} style={styles.cancelButton}>
            Cancel
          </GlassButton>
        </>
      ) : (
        <View style={styles.createForm}>
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>List name</Text>
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.textInput}
                value={newName}
                onChangeText={setNewName}
                placeholder="e.g. Weekly Tesco Shop"
                placeholderTextColor={colors.text.tertiary}
                autoFocus
                returnKeyType="next"
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Budget (£) — optional</Text>
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.textInput}
                value={newBudget}
                onChangeText={setNewBudget}
                placeholder="50"
                placeholderTextColor={colors.text.tertiary}
                keyboardType="decimal-pad"
                returnKeyType="done"
                onSubmitEditing={handleCreate}
              />
            </View>
          </View>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <View style={styles.actions}>
            <GlassButton
              variant="ghost"
              size="md"
              onPress={() => {
                setMode("pick");
                setError(null);
              }}
              style={{ flex: 1 }}
              disabled={creating}
            >
              Back
            </GlassButton>
            <GlassButton
              variant="primary"
              size="md"
              icon="plus"
              onPress={handleCreate}
              style={{ flex: 1 }}
              disabled={creating || !newName.trim()}
            >
              {creating ? "Creating..." : "Create & Add"}
            </GlassButton>
          </View>
        </View>
      )}
    </GlassModal>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  title: {
    ...typography.headlineSmall,
    color: colors.text.primary,
    fontWeight: "700",
  },
  subtitle: {
    ...typography.bodySmall,
    color: colors.text.secondary,
    marginTop: 2,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.glass.backgroundStrong,
  },
  listScroll: {
    maxHeight: 360,
    marginBottom: spacing.sm,
  },
  createRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.md,
    backgroundColor: `${colors.accent.primary}10`,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: colors.accent.primary,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
  },
  createRowTitle: {
    ...typography.bodyLarge,
    color: colors.accent.primary,
    fontWeight: "700",
  },
  listRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.glass.background,
    borderWidth: 1,
    borderColor: colors.glass.border,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
  },
  rowIcon: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.md,
    backgroundColor: `${colors.accent.primary}15`,
    justifyContent: "center",
    alignItems: "center",
  },
  createIcon: {
    backgroundColor: `${colors.accent.primary}25`,
  },
  listName: {
    ...typography.bodyLarge,
    color: colors.text.primary,
    fontWeight: "600",
  },
  rowSubtitle: {
    ...typography.labelSmall,
    color: colors.text.tertiary,
    marginTop: 2,
  },
  emptyState: {
    alignItems: "center",
    padding: spacing.lg,
    gap: spacing.sm,
  },
  emptyText: {
    ...typography.bodyMedium,
    color: colors.text.tertiary,
  },
  cancelButton: {
    marginTop: spacing.xs,
  },
  createForm: {
    gap: spacing.sm,
  },
  inputGroup: {
    marginBottom: spacing.sm,
  },
  inputLabel: {
    ...typography.labelMedium,
    color: colors.text.secondary,
    marginBottom: spacing.xs,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.glass.background,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.glass.border,
    paddingHorizontal: spacing.md,
    height: 48,
  },
  textInput: {
    flex: 1,
    ...typography.bodyMedium,
    color: colors.text.primary,
  },
  errorText: {
    ...typography.labelSmall,
    color: colors.accent.error,
    marginBottom: spacing.xs,
  },
  actions: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
});
