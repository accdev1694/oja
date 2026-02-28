import React, { useState, useCallback, useMemo, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TextInput,
  Pressable,
} from "react-native";
import { useQuery, useMutation, usePaginatedQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import * as Haptics from "expo-haptics";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import {
  GlassCard,
  GlassButton,
  AnimatedSection,
  colors,
  spacing,
  useGlassAlert,
} from "@/components/ui/glass";
import { adminStyles as styles } from "./styles";
import { User } from "./types";
import { ActivityTimeline } from "./ActivityTimeline";
import type { Id } from "@/convex/_generated/dataModel";
import { useAdminToast, useResponsive } from "./hooks";
import { SavedFilterPills } from "./components/SavedFilterPills";

interface UsersTabProps {
  /** Permission check function */
  hasPermission: (p: string) => boolean;
  /** CSV export handler */
  handleExportCSV: (type: "users" | "receipts" | "prices" | "analytics") => Promise<void>;
  /** Optional initial user ID to select (from global search) */
  initialUserId?: string;
  /** Callback when selection changes for breadcrumbs */
  onSelectionChange?: (label: string | null) => void;
}

/**
 * UsersTab Component
 * Manages user accounts, permissions, and trial extensions.
 */
export function UsersTab({ 
  hasPermission,
  handleExportCSV,
  initialUserId,
  onSelectionChange
}: UsersTabProps) {
  const { isMobile } = useResponsive();
  const { alert: showAlert } = useGlassAlert();
  const { showToast } = useAdminToast();
  const [search, setSearch] = useState("");
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [detailTab, setDetailTab] = useState<"info" | "activity">("info");
  const [newTag, setNewTag] = useState("");

  const canEdit = hasPermission("edit_users");
  const canBulk = hasPermission("bulk_operation");

  // Handle selection from global search or breadcrumb reset
  useEffect(() => {
    if (initialUserId === "RESET") {
      setSelectedUser(null);
    } else if (initialUserId) {
      setSelectedUser(initialUserId);
    }
  }, [initialUserId]);

  // Data fetching with pagination
  const { results: users, status, loadMore } = usePaginatedQuery(
    api.admin.getUsers,
    {},
    { initialNumItems: 50 }
  );

  // Search results query
  const searchResults = useQuery(
    api.admin.searchUsers,
    search.length >= 2 ? { searchTerm: search } : "skip"
  ) as User[] | undefined;
  
  // Memoized user detail query args
  const userQueryArgs = useMemo(() => 
    selectedUser ? { userId: selectedUser as Id<"users"> } : "skip", 
  [selectedUser]);

  const userDetail = useQuery(api.admin.getUserDetail, userQueryArgs) as User | undefined | null;
  const userTags = useQuery(api.admin.getUserTags, userQueryArgs) as string[] | undefined;

  // Sync breadcrumb label when selection changes
  useEffect(() => {
    if (onSelectionChange) {
      onSelectionChange(userDetail?.name || (selectedUser ? "Loading..." : null));
    }
  }, [userDetail, selectedUser, onSelectionChange]);

  // Mutations
  const toggleAdmin = useMutation(api.admin.toggleAdmin);
  const extendTrial = useMutation(api.admin.extendTrial);
  const bulkExtendTrial = useMutation(api.admin.bulkExtendTrial);
  const grantAccess = useMutation(api.admin.grantComplimentaryAccess);
  const toggleSuspension = useMutation(api.admin.toggleSuspension);
  const generateToken = useMutation(api.impersonation.generateImpersonationToken);
  const addTag = useMutation(api.tags.addUserTag);
  const removeTag = useMutation(api.tags.removeUserTag);
  const saveFilter = useMutation(api.admin.saveFilter);

  // Determine which users to display based on search
  const displayUsers = useMemo(() => 
    (search.length >= 2 ? searchResults : users) as User[] | undefined,
  [search, searchResults, users]);

  // --- Handlers ---

  const handleApplyPreset = useCallback((data: any) => {
    if (data.search !== undefined) setSearch(data.search);
    showToast("Preset applied", "info");
  }, [showToast]);

  const handleSavePreset = useCallback(() => {
    if (!search) return;
    showAlert("Save Preset", "Give this search filter a name:", [
      { text: "Cancel", style: "cancel" },
      { 
        text: "Save", 
        onPress: async () => {
          // In a real app we'd have a text input in the alert
          // For now let's use the search term as the name
          try {
            await saveFilter({ name: `Search: ${search}`, tab: "users", filterData: { search } });
            showToast("Search preset saved", "success");
          } catch (e) { showToast((e as Error).message, "error"); }
        }
      }
    ]);
  }, [search, saveFilter, showAlert, showToast]);

  const handleSelectUser = useCallback((userId: string) => {
    setSelectedUser(userId);
    Haptics.selectionAsync();
  }, []);

  const toggleUserSelection = useCallback((userId: string) => {
    setSelectedUsers(prev => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
    Haptics.selectionAsync();
  }, []);

  const handleBulkExtend = useCallback(async () => {
    if (selectedUsers.size === 0) return;
    showAlert("Bulk Extend", `Add 14 days to trial for ${selectedUsers.size} users?`, [
      { text: "Cancel", style: "cancel" },
      { 
        text: "Extend", 
        onPress: async () => {
          try {
            await bulkExtendTrial({ userIds: Array.from(selectedUsers) as Id<"users">[], days: 14 });
            const count = selectedUsers.size;
            setSelectedUsers(new Set());
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            showToast(`Extended trials for ${count} users`, "success");
          } catch (e) { showToast((e as Error).message, "error"); }
        }
      }
    ]);
  }, [selectedUsers, bulkExtendTrial, showAlert, showToast]);

  const handleImpersonate = useCallback(async (userId: string) => {
    try {
      const result = await generateToken({ userId: userId as Id<"users"> });
      const impersonateUrl = `oja://impersonate?token=${result.tokenValue}`;
      showAlert(
        "Impersonation Ready", 
        `User session token generated.\n\nDeep Link:\n${impersonateUrl}\n\nNote: This token expires in 1 hour.`,
        [
          { text: "Copy Link", onPress: () => showToast("Link copied to clipboard", "info") },
          { text: "Done", style: "cancel" }
        ]
      );
    } catch (e) { showToast((e as Error).message, "error"); }
  }, [generateToken, showAlert, showToast]);

  const handleAddTag = useCallback(async () => {
    if (!selectedUser || !newTag.trim()) return;
    try {
      await addTag({ userId: selectedUser as Id<"users">, tag: newTag.trim() });
      setNewTag("");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      showToast("Tag added", "success");
    } catch (e) {
      showToast((e as Error).message, "error");
    }
  }, [selectedUser, newTag, addTag, showToast]);

  const handleRemoveTag = useCallback(async (tag: string) => {
    if (!selectedUser) return;
    try {
      await removeTag({ userId: selectedUser as Id<"users">, tag });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      showToast("Tag removed", "success");
    } catch (e) {
      showToast((e as Error).message, "error");
    }
  }, [selectedUser, removeTag, showToast]);

  const handleToggleAdmin = useCallback(async (userId: string) => {
    try {
      const result = await toggleAdmin({ userId: userId as Id<"users"> });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      showToast(result.isAdmin ? "Admin privileges granted" : "Admin privileges revoked", "success");
    } catch (error) {
      showToast((error as Error).message || "Failed to toggle admin status", "error");
    }
  }, [toggleAdmin, showToast]);

  const handleExtendTrial = useCallback(async (userId: string) => {
    showAlert("Extend Trial", "Add 14 days to trial?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Extend",
        onPress: async () => {
          try {
            await extendTrial({ userId: userId as Id<"users">, days: 14 });
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            showToast("Trial extended", "success");
          } catch (error) {
            showToast((error as Error).message || "Failed to extend trial", "error");
          }
        },
      },
    ]);
  }, [extendTrial, showAlert, showToast]);

  const handleGrantAccess = useCallback(async (userId: string) => {
    showAlert("Grant Premium", "Give free premium annual access?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Grant",
        onPress: async () => {
          try {
            await grantAccess({ userId: userId as Id<"users">, months: 12 });
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            showToast("Premium access granted", "success");
          } catch (error) {
            showToast((error as Error).message || "Failed to grant access", "error");
          }
        },
      },
    ]);
  }, [grantAccess, showAlert, showToast]);

  const handleToggleSuspension = useCallback(async (userId: string) => {
    try {
      await toggleSuspension({ userId: userId as Id<"users"> });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      showToast("User status updated", "success");
    } catch (error) {
      showToast((error as Error).message || "Failed to toggle suspension", "error");
    }
  }, [toggleSuspension, showToast]);

  return (
    <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
      {/* Search & Saved Filters */}
      <AnimatedSection animation="fadeInDown" duration={400} delay={0}>
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
              <Pressable onPress={handleSavePreset} hitSlop={12} style={{ padding: 4 }}>
                <MaterialCommunityIcons name="bookmark-plus-outline" size={20} color={colors.accent.primary} />
              </Pressable>
            )}
          </View>
          
          <View style={{ marginTop: spacing.sm }}>
            <SavedFilterPills tab="users" onSelect={handleApplyPreset} />
          </View>
        </GlassCard>
      </AnimatedSection>

      {/* Bulk Actions Bar */}
      {selectedUsers.size > 0 && canBulk && (
        <AnimatedSection animation="fadeInDown" duration={400} delay={0}>
          <GlassCard style={[styles.section, { backgroundColor: `${colors.accent.primary}10` }]}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <Text style={styles.userName}>{selectedUsers.size} users selected</Text>
              <View style={{ flexDirection: "row", gap: spacing.sm }}>
                <GlassButton onPress={handleBulkExtend} variant="secondary" size="sm">
                  +14d Trial
                </GlassButton>
                <GlassButton onPress={() => handleExportCSV("users")} variant="ghost" size="sm">
                  CSV
                </GlassButton>
                <Pressable onPress={() => setSelectedUsers(new Set())} style={{ padding: 4 }}>
                  <MaterialCommunityIcons name="close" size={20} color={colors.text.tertiary} />
                </Pressable>
              </View>
            </View>
          </GlassCard>
        </AnimatedSection>
      )}

      {/* User Detail View */}
      {selectedUser && userDetail && (
        <AnimatedSection animation="fadeInDown" duration={400} delay={0}>
          <GlassCard style={styles.section}>
            <View style={styles.detailHeader}>
              <View>
                <Text style={styles.sectionTitle}>{userDetail.name}</Text>
                <Text style={styles.userEmail}>{userDetail.email || "No email"}</Text>
              </View>
              <View style={{ flexDirection: "row", gap: spacing.md }}>
                <Pressable onPress={() => handleImpersonate(selectedUser)} hitSlop={8}>
                  <MaterialCommunityIcons name="incognito" size={24} color={colors.accent.primary} />
                </Pressable>
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
                  <Pressable onPress={() => handleRemoveTag(tag)}>
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
                  onSubmitEditing={handleAddTag}
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
                    <Text style={styles.detailValue}>{userDetail.lastActiveAt ? new Date(userDetail.lastActiveAt).toLocaleDateString() : "Never"}</Text>
                    <Text style={styles.detailLabel}>Last Active</Text>
                  </View>
                </View>
                {userDetail.subscription && (
                  <Text style={styles.metricText}>
                    Plan: {userDetail.subscription.plan} • Status: {userDetail.subscription.status}
                  </Text>
                )}
                {canEdit && (
                  <View style={[styles.actionRow, isMobile && styles.mobileActionRow]}>
                    <Pressable style={styles.actionBtn} onPress={() => handleExtendTrial(selectedUser)}>
                      <MaterialCommunityIcons name="clock-plus-outline" size={16} color={colors.accent.primary} />
                      <Text style={styles.actionBtnText}>+14d Trial</Text>
                    </Pressable>
                    <Pressable style={styles.actionBtn} onPress={() => handleGrantAccess(selectedUser)}>
                      <MaterialCommunityIcons name="crown" size={16} color={colors.semantic.warning} />
                      <Text style={styles.actionBtnText}>Free Premium</Text>
                    </Pressable>
                    <Pressable
                      style={[styles.actionBtn, styles.suspendBtn]}
                      onPress={() => handleToggleSuspension(selectedUser)}
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
        </AnimatedSection>
      )}

      {/* User List */}
      {Array.isArray(displayUsers) && displayUsers.length > 0 && (
        <AnimatedSection animation="fadeInDown" duration={400} delay={100}>
          <GlassCard style={styles.section}>
            <Text style={styles.sectionTitle}>
              {search.length >= 2 ? `Results (${displayUsers.length})` : `Users (${displayUsers.length})`}
            </Text>
            {displayUsers.map((u) => (
              <Pressable
                key={u._id}
                style={[styles.userRow, selectedUsers.has(u._id) && { backgroundColor: `${colors.accent.primary}05` }]}
                onPress={() => handleSelectUser(u._id)}
              >
                <View style={{ flexDirection: "row", alignItems: "center", flex: 1 }}>
                  {canBulk && (
                    <Pressable 
                      onPress={() => toggleUserSelection(u._id)}
                      style={{ padding: 4, marginRight: spacing.xs }}
                    >
                      <MaterialCommunityIcons 
                        name={selectedUsers.has(u._id) ? "checkbox-marked" : "checkbox-blank-outline"} 
                        size={20} 
                        color={selectedUsers.has(u._id) ? colors.accent.primary : colors.text.tertiary} 
                      />
                    </Pressable>
                  )}
                  <View style={styles.userInfo}>
                    <Text style={styles.userName}>{u.name}</Text>
                    <Text style={styles.userEmail}>{u.email || "No email"}</Text>
                  </View>
                </View>
                
                {/* Inline Quick Actions */}
                <View style={styles.userActions}>
                  {canEdit && (
                    <>
                      <Pressable 
                        onPress={() => handleImpersonate(u._id)} 
                        hitSlop={12}
                        style={{ padding: 4 }}
                      >
                        <MaterialCommunityIcons name="incognito" size={18} color={colors.text.tertiary} />
                      </Pressable>
                      <Pressable 
                        onPress={() => handleToggleAdmin(u._id)} 
                        hitSlop={12}
                        style={{ padding: 4 }}
                      >
                        <MaterialCommunityIcons
                          name={u.isAdmin ? "shield-check" : "shield-outline"}
                          size={18}
                          color={u.isAdmin ? colors.accent.primary : colors.text.tertiary}
                        />
                      </Pressable>
                    </>
                  )}
                  <MaterialCommunityIcons name="chevron-right" size={18} color={colors.text.tertiary} />
                </View>
              </Pressable>
            ))}
            {status === "CanLoadMore" && (
              <GlassButton
                onPress={() => loadMore(50)}
                variant="ghost"
                size="sm"
                style={{ marginTop: spacing.md }}
              >Load More Users</GlassButton>
            )}
          </GlassCard>
        </AnimatedSection>
      )}

      <View style={{ height: 140 }} />
    </ScrollView>
  );
}
