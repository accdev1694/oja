import { View, Text, Pressable, StyleSheet } from "react-native";
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
  return (
    <GlassModal
      visible={item !== null}
      onClose={onClose}
      maxWidth={340}
      contentStyle={styles.modal}
    >
      <MaterialCommunityIcons name="playlist-plus" size={36} color={colors.accent.primary} />
      <Text style={styles.title}>Add to List</Text>
      <Text style={styles.subtitle}>
        Choose a list for "{item?.name}"
      </Text>
      <View style={styles.options}>
        {otherLists.map((otherList) => (
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
              {otherList.status === "shopping" ? "Shopping" : "Active"}
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
}

// ─── Styles ─────────────────────────────────────────────────────────────────

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
