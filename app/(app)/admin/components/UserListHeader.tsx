/**
 * Header block for the admin Users tab FlashList — search bar, bulk actions,
 * user detail drawer, and list section title. Extracted from UsersTab.tsx
 * to keep that file under the 400-line limit.
 *
 * Pure presentational component: all state is lifted to UsersTab and passed in
 * as props. No mutations or queries are invoked here directly.
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
import { ActivityTimeline } from "../ActivityTimeline";
import { SavedFilterPills, type FilterData } from "./SavedFilterPills";
import { SubscriptionBadge } from "./SubscriptionBadge";
import { getContextualActions } from "./contextualActions";
import type { User } from "../types";

interface UserListHeaderProps {
  search: string;
  setSearch: (v: string) => void;
  selectedUsers: Set<string>;
  setSelectedUsers: (s: Set<string>) => void;
  canBulk: boolean;
  canEdit: boolean;
  selectedUser: string | null;
  setSelectedUser: (id: string | null) => void;
  /** Id of the currently logged-in admin — used to hide self-targeting actions in the detail drawer. */
  currentUserId: string | null;
  userDetail: User | undefined | null;
  userTags: string[] | undefined;
  detailTab: "info" | "activity";
  setDetailTab: (t: "info" | "activity") => void;
  isMobile: boolean;
  displayUsers: User[] | undefined;
  newTag: string;
  setNewTag: (v: string) => void;
  onSavePreset: () => void;
  onApplyPreset: (data: FilterData) => void;
  onBulkExtend: () => void;
  onExportCSV: (type: "users" | "receipts" | "prices" | "analytics") => Promise<void>;
  onImpersonate: (userId: string) => void;
  onRemoveTag: (tag: string) => void;
  onAddTag: () => void;
  onExtendTrial: (userId: string, days?: number) => void;
  onStartTrial: (userId: string) => void;
  onDowngrade: (userId: string) => void;
  onAdjustPoints: (userId: string) => void;
  onGrantAccess: (userId: string) => void;
  onToggleSuspension: (userId: string) => void;
}

export function UserListHeader({
  search,
  setSearch,
  selectedUsers,
  setSelectedUsers,
  canBulk,
  canEdit,
  selectedUser,
  setSelectedUser,
  currentUserId,
  userDetail,
  userTags,
  detailTab,
  setDetailTab,
  isMobile,
  displayUsers,
  newTag,
  setNewTag,
  onSavePreset,
  onApplyPreset,
  onBulkExtend,
  onExportCSV,
  onImpersonate,
  onRemoveTag,
  onAddTag,
  onExtendTrial,
  onStartTrial,
  onDowngrade,
  onAdjustPoints,
  onGrantAccess,
  onToggleSuspension,
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
          />
          {search.length > 0 && (
            <Pressable onPress={onSavePreset} hitSlop={12} style={{ padding: 4 }}>
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
              <Pressable onPress={() => setSelectedUsers(new Set())} style={{ padding: 4 }}>
                <MaterialCommunityIcons name="close" size={20} color={colors.text.tertiary} />
              </Pressable>
            </View>
          </View>
        </GlassCard>
      )}

      {/* User Detail View */}
      {selectedUser && userDetail && (() => {
        const isSelf = selectedUser === currentUserId;
        return (
        <GlassCard style={styles.section}>
          <View style={styles.detailHeader}>
            <View>
              <Text style={styles.sectionTitle}>
                {userDetail.name}
                {isSelf && <Text style={{ color: colors.text.tertiary, fontWeight: "400" }}>  (you)</Text>}
              </Text>
              <Text style={styles.userEmail}>{userDetail.email || "No email"}</Text>
            </View>
            <View style={{ flexDirection: "row", gap: spacing.md }}>
              {!isSelf && (
                <Pressable onPress={() => onImpersonate(selectedUser)} hitSlop={8}>
                  <MaterialCommunityIcons name="incognito" size={24} color={colors.accent.primary} />
                </Pressable>
              )}
              <Pressable onPress={() => setSelectedUser(null)}>
                <MaterialCommunityIcons name="close" size={24} color={colors.text.tertiary} />
              </Pressable>
            </View>
          </View>

          {/* Tags */}
          <View style={[styles.filterRow, { marginVertical: spacing.sm }]}>
            {userTags?.map((tag) => (
              <View key={tag} style={styles.tagBadge}>
                <Text style={styles.tagBadgeText}>{tag}</Text>
                <Pressable onPress={() => onRemoveTag(tag)}>
                  <MaterialCommunityIcons name="close-circle" size={14} color={colors.text.tertiary} />
                </Pressable>
              </View>
            ))}
            <View style={styles.addTagRow}>
              <TextInput
                style={styles.tagInput}
                placeholder="+Tag"
                placeholderTextColor={colors.text.tertiary}
                value={newTag}
                onChangeText={setNewTag}
                onSubmitEditing={onAddTag}
              />
            </View>
          </View>

          {/* Details Tabs */}
          <View style={[styles.filterRow, { marginBottom: spacing.md }]}>
            <Pressable
              style={[styles.filterChip, detailTab === "info" && styles.filterChipActive]}
              onPress={() => setDetailTab("info")}
            >
              <Text style={[styles.filterChipText, detailTab === "info" && styles.filterChipTextActive]}>Info</Text>
            </Pressable>
            <Pressable
              style={[styles.filterChip, detailTab === "activity" && styles.filterChipActive]}
              onPress={() => setDetailTab("activity")}
            >
              <Text style={[styles.filterChipText, detailTab === "activity" && styles.filterChipTextActive]}>Activity</Text>
            </Pressable>
          </View>

          {detailTab === "info" ? (
            <>
              <View style={[styles.detailGrid, isMobile && styles.mobileDetailGrid]}>
                <View style={styles.detailItem}>
                  <Text style={styles.detailValue}>{userDetail.receiptCount ?? 0}</Text>
                  <Text style={styles.detailLabel}>Receipts</Text>
                </View>
                <View style={styles.detailItem}>
                  <Text style={styles.detailValue}>{userDetail.listCount ?? 0}</Text>
                  <Text style={styles.detailLabel}>Lists</Text>
                </View>
                <View style={styles.detailItem}>
                  <Text style={styles.detailValue}>£{userDetail.totalSpent ?? 0}</Text>
                  <Text style={styles.detailLabel}>Spent</Text>
                </View>
                <View style={styles.detailItem}>
                  <Text style={styles.detailValue}>{userDetail.scanRewards?.points?.toLocaleString() ?? 0}</Text>
                  <Text style={styles.detailLabel}>Points</Text>
                </View>
              </View>
              {userDetail.subscriptionDisplay && (
                <View style={{ marginTop: spacing.sm, marginBottom: spacing.xs }}>
                  <SubscriptionBadge display={userDetail.subscriptionDisplay} size="full" />
                </View>
              )}
              <Text style={styles.metricText}>
                Tier: {userDetail.scanRewards?.tier || "bronze"} ({userDetail.scanRewards?.lifetimeScans || 0} scans)
              </Text>
              {canEdit && isSelf && (
                <View style={{ marginTop: spacing.md, padding: spacing.sm, borderRadius: 8, backgroundColor: `${colors.text.tertiary}10` }}>
                  <Text style={{ color: colors.text.tertiary, fontSize: 12, textAlign: "center" }}>
                    This is your own account. Destructive admin actions on yourself are blocked for safety — ask another super_admin if you need them applied.
                  </Text>
                </View>
              )}
              {canEdit && !isSelf && (
                <View style={[styles.actionRow, isMobile && styles.mobileActionRow]}>
                  {getContextualActions(userDetail.subscriptionDisplay?.effectiveStatus).map((action) => (
                    <Pressable
                      key={action.key}
                      style={[styles.actionBtn, action.danger && styles.dangerBtn]}
                      onPress={() => {
                        switch (action.key) {
                          case "start_trial": return onStartTrial(selectedUser);
                          case "extend_7": return onExtendTrial(selectedUser, 7);
                          case "extend_14": return onExtendTrial(selectedUser, 14);
                          case "grant_premium": return onGrantAccess(selectedUser);
                          case "downgrade": return onDowngrade(selectedUser);
                        }
                      }}
                    >
                      <MaterialCommunityIcons
                        name={action.icon}
                        size={16}
                        color={action.danger ? colors.semantic.danger : colors.accent.primary}
                      />
                      <Text style={[styles.actionBtnText, action.danger && { color: colors.semantic.danger }]}>
                        {action.label}
                      </Text>
                    </Pressable>
                  ))}
                  <Pressable style={styles.actionBtn} onPress={() => onAdjustPoints(selectedUser)}>
                    <MaterialCommunityIcons name="star-plus-outline" size={16} color={colors.accent.secondary} />
                    <Text style={styles.actionBtnText}>Adjust Pts</Text>
                  </Pressable>
                  <Pressable
                    style={[styles.actionBtn, styles.suspendBtn]}
                    onPress={() => onToggleSuspension(selectedUser)}
                  >
                    <MaterialCommunityIcons
                      name={userDetail.suspended ? "account-check-outline" : "account-off-outline"}
                      size={16}
                      color={colors.semantic.danger}
                    />
                    <Text style={[styles.actionBtnText, { color: colors.semantic.danger }]}>
                      {userDetail.suspended ? "Unsuspend" : "Suspend"}
                    </Text>
                  </Pressable>
                </View>
              )}
            </>
          ) : (
            <ActivityTimeline userId={selectedUser} />
          )}
        </GlassCard>
        );
      })()}

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
