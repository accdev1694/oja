import React, { useCallback } from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
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
  return (
    <GlassModal
      visible={visible}
      onClose={onClose}
      maxWidth={340}
      contentStyle={styles.modal}
    >
      <MaterialCommunityIcons name="playlist-plus" size={36} color={colors.accent.primary} />
      <Text style={styles.title}>Add to List</Text>
      <Text style={styles.subtitle}>
        Choose a list for "{itemName}"
      </Text>
      <View style={styles.options}>
        {lists
          .filter((l) => l.status === "active" || l.status === "shopping")
          .map((list) => (
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
      </View>
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
    marginBottom: spacing.xl,
  },
  options: {
    width: "100%",
    gap: spacing.md,
  },
  option: {
    flexDirection: "row",
    alignItems: "center",
    padding: spacing.md,
    backgroundColor: colors.glass.background,
    borderRadius: borderRadius.md,
    borderWidth: 2,
    borderColor: "transparent",
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
  },
  actions: {
    flexDirection: "row",
    gap: spacing.md,
    marginTop: spacing.xl,
  },
});
