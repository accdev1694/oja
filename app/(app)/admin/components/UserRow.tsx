/**
 * Single-row renderer for the admin Users tab FlashList.
 * Extracted from UsersTab.tsx to keep that file under the 400-line limit.
 * Pure presentational component — all handlers and selection state are passed in.
 */
import React from "react";
import { View, Text, Pressable } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { colors, spacing } from "@/components/ui/glass";
import { adminStyles as styles } from "../styles";
import { SubscriptionBadge } from "./SubscriptionBadge";
import type { User } from "../types";

interface UserRowProps {
  user: User;
  isBulkSelected: boolean;
  canBulk: boolean;
  canEdit: boolean;
  /** True when this row represents the currently logged-in admin — hides self-targeting actions. */
  isSelf: boolean;
  onSelect: (userId: string) => void;
  onToggleBulk: (userId: string) => void;
  onImpersonate: (userId: string) => void;
  onToggleAdmin: (userId: string) => void;
}

export const UserRow = React.memo(function UserRow({
  user: u,
  isBulkSelected,
  canBulk,
  canEdit,
  isSelf,
  onSelect,
  onToggleBulk,
  onImpersonate,
  onToggleAdmin,
}: UserRowProps) {
  return (
    <Pressable
      style={[styles.userRow, isBulkSelected && { backgroundColor: `${colors.accent.primary}05` }]}
      onPress={() => onSelect(u._id)}
      accessibilityRole="button"
      accessibilityLabel={`Open details for ${u.name || u.email || "user"}`}
    >
      <View style={{ flexDirection: "row", alignItems: "center", flex: 1 }}>
        {canBulk && (
          <Pressable
            onPress={() => onToggleBulk(u._id)}
            style={{ padding: 4, marginRight: spacing.xs }}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: isBulkSelected }}
            accessibilityLabel={`${isBulkSelected ? "Deselect" : "Select"} ${u.name || u.email || "user"} for bulk actions`}
          >
            <MaterialCommunityIcons
              name={isBulkSelected ? "checkbox-marked" : "checkbox-blank-outline"}
              size={20}
              color={isBulkSelected ? colors.accent.primary : colors.text.tertiary}
            />
          </Pressable>
        )}
        <View style={styles.userInfo}>
          <Text style={styles.userName}>
            {u.name}
            {isSelf && <Text style={{ color: colors.text.tertiary }}>  (you)</Text>}
          </Text>
          <Text style={styles.userEmail}>{u.email || "No email"}</Text>
          {u.subscriptionDisplay && (
            <View style={{ marginTop: 4 }}>
              <SubscriptionBadge display={u.subscriptionDisplay} size="compact" />
            </View>
          )}
        </View>
      </View>

      {/* Inline Quick Actions — hidden entirely when this row is the current
          admin, because every mutation below is server-rejected on self. */}
      <View style={styles.userActions}>
        {canEdit && !isSelf && (
          <>
            <Pressable
              onPress={() => onImpersonate(u._id)}
              hitSlop={12}
              style={{ padding: 4 }}
              accessibilityRole="button"
              accessibilityLabel={`Impersonate ${u.name || u.email || "user"}`}
            >
              <MaterialCommunityIcons name="incognito" size={18} color={colors.text.tertiary} />
            </Pressable>
            <Pressable
              onPress={() => onToggleAdmin(u._id)}
              hitSlop={12}
              style={{ padding: 4 }}
              accessibilityRole="button"
              accessibilityLabel={u.isAdmin ? `Remove admin role from ${u.name || u.email || "user"}` : `Grant admin role to ${u.name || u.email || "user"}`}
            >
              <MaterialCommunityIcons
                name={u.isAdmin ? "shield-check" : "shield-outline"}
                size={18}
                color={u.isAdmin ? colors.accent.primary : colors.text.tertiary}
              />
            </Pressable>
          </>
        )}
        {/* For the self row we still show the shield as a non-interactive
            badge so the admin can see their own admin status at a glance. */}
        {isSelf && u.isAdmin && (
          <MaterialCommunityIcons
            name="shield-check"
            size={18}
            color={colors.accent.primary}
            accessibilityRole="image"
            accessibilityLabel="You are an admin"
          />
        )}
        <MaterialCommunityIcons name="chevron-right" size={18} color={colors.text.tertiary} />
      </View>
    </Pressable>
  );
});
