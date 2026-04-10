/**
 * Header block for the admin Users tab FlashList — search bar, bulk actions,
 * and list section title. Extracted from UsersTab.tsx to keep that file
 * under the 400-line limit.
 *
 * Pure presentational component: all state is lifted to UsersTab and passed in
 * as props. No mutations or queries are invoked here directly.
 *
 * The old "user detail drawer" block has been removed — user detail now
 * lives at its own route (/admin/users/{id}) via UserDetailScreen. Tapping
 * a user row pushes instead of mutating header state far above the row.
 */
import React from "react";
import { View, Text, TextInput, Pressable } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import {
  GlassCard,
  GlassButton,
  colors,
  spacing,
} from "@/components/ui/glass";
import { adminStyles as styles } from "../styles";
import { SavedFilterPills, type FilterData } from "./SavedFilterPills";
import type { User } from "../types";

interface UserListHeaderProps {
  search: string;
  setSearch: (v: string) => void;
  selectedUsers: Set<string>;
  setSelectedUsers: (s: Set<string>) => void;
  canBulk: boolean;
  displayUsers: User[] | undefined;
  onSavePreset: () => void;
  onApplyPreset: (data: FilterData) => void;
  onBulkExtend: () => void;
  onExportCSV: (type: "users" | "receipts" | "prices" | "analytics") => Promise<void>;
}

export function UserListHeader({
  search,
  setSearch,
  selectedUsers,
  setSelectedUsers,
  canBulk,
  displayUsers,
  onSavePreset,
  onApplyPreset,
  onBulkExtend,
  onExportCSV,
}: UserListHeaderProps) {
  return (
    <View>
      {/* Search & Saved Filters */}
      <GlassCard style={styles.section}>
        <View style={styles.searchRow}>
          <MaterialCommunityIcons name="magnify" size={20} color={colors.text.tertiary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search users..."
            placeholderTextColor={colors.text.tertiary}
            value={search}
            onChangeText={setSearch}
            accessibilityLabel="Search users"
          />
          {search.length > 0 && (
            <Pressable
              onPress={onSavePreset}
              hitSlop={12}
              style={{ padding: 4 }}
              accessibilityRole="button"
              accessibilityLabel="Save search as preset"
            >
              <MaterialCommunityIcons name="bookmark-plus-outline" size={20} color={colors.accent.primary} />
            </Pressable>
          )}
        </View>

        <View style={{ marginTop: spacing.sm }}>
          <SavedFilterPills tab="users" onSelect={onApplyPreset} />
        </View>
      </GlassCard>

      {/* Bulk Actions Bar */}
      {selectedUsers.size > 0 && canBulk && (
        <GlassCard style={[styles.section, { backgroundColor: `${colors.accent.primary}10` }]}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <Text style={styles.userName}>{selectedUsers.size} users selected</Text>
            <View style={{ flexDirection: "row", gap: spacing.sm }}>
              <GlassButton onPress={onBulkExtend} variant="secondary" size="sm">
                +14d Trial
              </GlassButton>
              <GlassButton
                onPress={async () => {
                  await onExportCSV("users");
                  setSelectedUsers(new Set());
                }}
                variant="ghost"
                size="sm"
              >
                CSV
              </GlassButton>
              <Pressable
                onPress={() => setSelectedUsers(new Set())}
                style={{ padding: 4 }}
                accessibilityRole="button"
                accessibilityLabel="Clear bulk selection"
              >
                <MaterialCommunityIcons name="close" size={20} color={colors.text.tertiary} />
              </Pressable>
            </View>
          </View>
        </GlassCard>
      )}

      {/* Section title for user list */}
      {Array.isArray(displayUsers) && displayUsers.length > 0 && (
        <GlassCard style={[styles.section, { paddingBottom: 0 }]}>
          <Text style={styles.sectionTitle}>
            {search.length >= 2 ? `Results (${displayUsers.length})` : `Users (${displayUsers.length})`}
          </Text>
        </GlassCard>
      )}
    </View>
  );
}
