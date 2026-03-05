import React, { useState, useMemo } from "react";
import { View, Text, StyleSheet, Pressable, ScrollView, TextInput } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Id } from "@/convex/_generated/dataModel";

import {
  GlassModal,
  GlassButton,
  colors,
  typography,
  spacing,
  borderRadius,
} from "@/components/ui/glass";

interface ListOption {
  _id: Id<"shoppingLists">;
  name: string;
  status: string;
}

interface PantryListPickerModalProps {
  visible: boolean;
  itemName: string;
  itemPrice?: number;
  lists: ListOption[];
  onPickList: (
    listId: Id<"shoppingLists">,
    listName: string,
    itemName: string,
    estimatedPrice?: number,
  ) => void;
  onClose: () => void;
}

export const PantryListPickerModal = React.memo(function PantryListPickerModal({
  visible,
  itemName,
  itemPrice,
  lists,
  onPickList,
  onClose,
}: PantryListPickerModalProps) {
  const [search, setSearch] = useState("");

  const activeLists = useMemo(() => 
    lists.filter((l) => l.status === "active" || l.status === "shopping"),
  [lists]);

  const filteredLists = useMemo(() => {
    if (!search.trim()) return activeLists;
    return activeLists.filter((l) => 
      l.name.toLowerCase().includes(search.toLowerCase())
    );
  }, [activeLists, search]);

  const showSearch = activeLists.length > 6;

  return (
    <GlassModal
      visible={visible}
      onClose={onClose}
      maxWidth={340}
      contentStyle={styles.modal}
      avoidKeyboard={true}
    >
      <MaterialCommunityIcons name="playlist-plus" size={36} color={colors.accent.primary} />
      <Text style={styles.title}>Add to List</Text>
      <Text style={styles.subtitle}>
        Choose a list for &quot;{itemName}&quot;
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
          {filteredLists.map((list) => (
            <Pressable
              key={list._id}
              style={styles.option}
              onPress={() => onPickList(list._id, list.name, itemName, itemPrice)}
            >
              <MaterialCommunityIcons
                name="clipboard-list-outline"
                size={20}
                color={colors.text.secondary}
              />
              <Text style={styles.optionName} numberOfLines={1}>
                {list.name}
              </Text>
              <Text style={styles.optionMeta}>
                {list.status === "shopping" ? "Shopping" : "Active"}
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
});

const styles = StyleSheet.create({
  modal: {
    alignItems: "center",
    maxHeight: "80%", // Prevent modal from being too tall
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

