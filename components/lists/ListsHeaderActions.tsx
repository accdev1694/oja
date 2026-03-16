import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import {
  colors,
  typography,
  spacing,
  borderRadius,
} from "@/components/ui/glass";

const ListsHeaderActions = React.memo(function ListsHeaderActions({
  tabMode,
  isCreating,
  unreadCount,
  onCreateListFlow,
  onShowNotifications,
}: any) {
  return (
    <View style={styles.headerActions}>
      {tabMode === "active" && (
        <Pressable
          style={[styles.addButton, isCreating && { opacity: 0.5 }]}
          onPress={onCreateListFlow}
          disabled={isCreating}
        >
          <MaterialCommunityIcons name="plus" size={18} color={colors.accent.primary} />
        </Pressable>
      )}
      <Pressable
        onPress={onShowNotifications}
        style={styles.bellButton}
        hitSlop={8}
      >
        <MaterialCommunityIcons
          name="bell-outline"
          size={22}
          color={colors.text.secondary}
        />
        {unreadCount > 0 && (
          <View style={styles.bellBadge}>
            <Text style={styles.bellBadgeText}>
              {unreadCount > 9 ? "9+" : unreadCount}
            </Text>
          </View>
        )}
      </Pressable>
    </View>
  );
});

export { ListsHeaderActions };

const styles = StyleSheet.create({
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  addButton: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.full,
    backgroundColor: `${colors.accent.primary}20`,
    borderWidth: 1,
    borderColor: `${colors.accent.primary}40`,
    alignItems: "center",
    justifyContent: "center",
  },
  bellButton: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.full,
    backgroundColor: colors.glass.background,
    alignItems: "center",
    justifyContent: "center",
  },
  bellBadge: {
    position: "absolute",
    top: -2,
    right: -2,
    backgroundColor: colors.accent.error,
    borderRadius: 18,
    minWidth: 18,
    height: 18,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.xs,
  },
  bellBadgeText: {
    ...typography.labelSmall,
    color: colors.text.inverse,
    fontSize: 10,
  },
});
