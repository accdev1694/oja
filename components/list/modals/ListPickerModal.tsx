import React, { useState, useMemo } from "react";
import { View, Text, Pressable, StyleSheet, ScrollView, TextInput } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import {
  GlassButton,
  GlassModal,
  colors,
  typography,
  spacing,
  borderRadius,
} from "@/components/ui/glass";
import type { Id } from "@/convex/_generated/dataModel";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface ListPickerItem {
  name: string;
  estimatedPrice?: number;
  quantity: number;
}

interface ActiveList {
  _id: Id<"shoppingLists">;
  name: string;
  status: string;
}

export interface ListPickerModalProps {
  /** The item to add, or null if modal is closed */
  item: ListPickerItem | null;
  /** All other active lists to pick from */
  otherLists: ActiveList[];
  onClose: () => void;
  onPick: (
    listId: Id<"shoppingLists">,
    listName: string,
    itemName: string,
    estimatedPrice: number | undefined,
    quantity: number,
  ) => void;
}

// ─── Component ──────────────────────────────────────────────────────────────

export function ListPickerModal({ item, otherLists, onClose, onPick }: ListPickerModalProps) {
  const [search, setSearch] = useState("");

  const filteredLists = useMemo(() => {
    if (!search.trim()) return otherLists;
    return otherLists.filter((l) => 
      l.name.toLowerCase().includes(search.toLowerCase())
    );
  }, [otherLists, search]);

  const showSearch = otherLists.length > 6;

  return (
    <GlassModal
      visible={item !== null}
      onClose={onClose}
      maxWidth={340}
      contentStyle={styles.modal}
      avoidKeyboard={true}
    >
      <MaterialCommunityIcons name="playlist-plus" size={36} color={colors.accent.primary} />
      <Text style={styles.title}>Add to List</Text>
      <Text style={styles.subtitle}>
        Choose a list for &quot;{item?.name}&quot;
      </Text>

      {showSearch && (
        <View style={styles.searchContainer}>
          <MaterialCommunityIcons name="magnify" size={18} color={colors.text.tertiary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search lists..."
            placeholderTextColor={colors.text.tertiary}
            value={search}
            onChangeText={setSearch}
            autoCorrect={false}
          />
          {search.length > 0 && (
            <Pressable onPress={() => setSearch("")} hitSlop={8}>
              <MaterialCommunityIcons name="close-circle" size={18} color={colors.text.tertiary} />
            </Pressable>
          )}
        </View>
      )}

      <ScrollView 
        style={styles.scrollArea} 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.options}>
          {filteredLists.map((otherList) => (
            <Pressable
              key={otherList._id}
              style={styles.option}
              onPress={() =>
                onPick(
                  otherList._id,
                  otherList.name,
                  item?.name ?? "",
                  item?.estimatedPrice,
                  item?.quantity ?? 1,
                )
              }
            >
              <MaterialCommunityIcons
                name="clipboard-list-outline"
                size={20}
                color={colors.text.secondary}
              />
              <Text style={styles.optionName} numberOfLines={1}>
                {otherList.name}
              </Text>
              <Text style={styles.optionMeta}>
                {otherList.isInProgress ? "Shopping" : "Active"}
              </Text>
              <MaterialCommunityIcons
                name="chevron-right"
                size={18}
                color={colors.text.tertiary}
              />
            </Pressable>
          ))}
          {filteredLists.length === 0 && (
            <Text style={styles.noResults}>No matching lists found</Text>
          )}
        </View>
      </ScrollView>

      <View style={styles.actions}>
        <GlassButton variant="ghost" size="md" onPress={onClose}>
          Cancel
        </GlassButton>
      </View>
    </GlassModal>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  modal: {
    alignItems: "center",
    maxHeight: "80%",
  },
  title: {
    ...typography.headlineMedium,
    color: colors.text.primary,
    textAlign: "center",
    marginBottom: spacing.xs,
  },
  subtitle: {
    ...typography.bodyMedium,
    color: colors.text.secondary,
    textAlign: "center",
    marginBottom: spacing.md,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    height: 44,
    width: "100%",
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.glass.border,
  },
  searchInput: {
    flex: 1,
    ...typography.bodyMedium,
    color: colors.text.primary,
    marginLeft: spacing.sm,
  },
  scrollArea: {
    width: "100%",
    minHeight: 180, // Ensures at least 3 lines are always visible
    maxHeight: 400, // Allows more context on larger screens
  },
  scrollContent: {
    paddingVertical: 2,
  },
  options: {
    width: "100%",
    gap: spacing.sm,
  },
  option: {
    flexDirection: "row",
    alignItems: "center",
    padding: spacing.md,
    backgroundColor: "rgba(255, 255, 255, 0.03)",
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.glass.border,
    gap: spacing.md,
  },
  optionName: {
    ...typography.bodyLarge,
    color: colors.text.primary,
    flex: 1,
  },
  optionMeta: {
    ...typography.bodySmall,
    color: colors.text.tertiary,
    fontSize: 10,
    textTransform: "uppercase",
    fontWeight: "600",
  },
  noResults: {
    ...typography.bodyMedium,
    color: colors.text.tertiary,
    textAlign: "center",
    marginVertical: spacing.xl,
  },
  actions: {
    flexDirection: "row",
    gap: spacing.md,
    marginTop: spacing.md,
  },
});

