import React, { useState, useCallback, useMemo } from "react";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { FlashList } from "@shopify/flash-list";
import { useQuery, useMutation, usePaginatedQuery } from "convex/react";
import { useRouter } from "expo-router";
import { api } from "@/convex/_generated/api";
import { safeHaptics } from "@/lib/haptics/safeHaptics";
import {
  GlassButton,
  spacing,
  useGlassAlert,
  TAB_BAR_HEIGHT,
} from "@/components/ui/glass";
import { adminStyles as styles } from "./styles";
import { User } from "./types";
import type { Id } from "@/convex/_generated/dataModel";
import { useAdminToast } from "./hooks";
import { useUserActions } from "./hooks/useUserActions";
import type { FilterData } from "./components/SavedFilterPills";
import { UserRow } from "./components/UserRow";
import { UserListHeader } from "./components/UserListHeader";

interface UsersTabProps {
  /** Permission check function */
  hasPermission: (p: string) => boolean;
  /** CSV export handler */
  handleExportCSV: (type: "users" | "receipts" | "prices" | "analytics") => Promise<void>;
}

/**
 * UsersTab Component
 * Manages user accounts, permissions, and trial extensions.
 * Row and header rendering live in ./components/{UserRow,UserListHeader}.tsx
 * to keep this file under the 400-line limit.
 */
export function UsersTab({
  hasPermission,
  handleExportCSV,
}: UsersTabProps) {
  const router = useRouter();
  const { alert: showAlert } = useGlassAlert();
  const { showToast } = useAdminToast();
  const insets = useSafeAreaInsets();

  // Current admin, used to hide self-targeting actions. Every destructive
  // action on the admin's own account is blocked server-side, so the button
  // only produces a confusing error toast — better to not show it at all.
  const currentUser = useQuery(api.users.getCurrent);
  const currentUserId = currentUser?._id ?? null;
  // Bottom clearance = tab bar + safe-area inset + extra room for the floating
  // VoiceFAB which overlays the bottom-left corner and can hide the last row.
  const listBottomPadding = TAB_BAR_HEIGHT + insets.bottom + 40;
  const [search, setSearch] = useState("");
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());

  const canEdit = hasPermission("edit_users");
  const canBulk = hasPermission("bulk_operation");

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

  // Mutations — only those that depend on component-local state remain here.
  // Mutation-wrapping action handlers live in useUserActions.
  const bulkExtendTrial = useMutation(api.admin.bulkExtendTrial);
  const saveFilter = useMutation(api.admin.saveFilter);

  const {
    handleImpersonate,
    handleToggleAdmin,
  } = useUserActions({ showAlert, showToast });

  // Determine which users to display based on search
  const displayUsers = useMemo(() =>
    (search.length >= 2 ? searchResults : users) as User[] | undefined,
  [search, searchResults, users]);

  // --- Handlers ---

  const handleApplyPreset = useCallback((filterData: FilterData) => {
    if (filterData.type === "users" && filterData.searchQuery !== undefined) {
      setSearch(filterData.searchQuery);
    }
    showToast("Preset applied", "info");
  }, [showToast]);

  const handleSavePreset = useCallback(() => {
    if (!search) return;
    showAlert("Save Preset", "Give this search filter a name:", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Save",
        onPress: async () => {
          try {
            await saveFilter({ name: `Search: ${search}`, tab: "users", filterData: { search } });
            showToast("Search preset saved", "success");
          } catch (e) { showToast((e as Error).message, "error"); }
        },
      },
    ]);
  }, [search, saveFilter, showAlert, showToast]);

  const handleSelectUser = useCallback((userId: string) => {
    safeHaptics.selection();
    router.push({ pathname: "/admin/users/[id]", params: { id: userId } });
  }, [router]);

  const toggleUserSelection = useCallback((userId: string) => {
    setSelectedUsers(prev => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
    safeHaptics.selection();
  }, []);

  const handleBulkExtend = useCallback(async () => {
    if (selectedUsers.size === 0) return;
    showAlert("Bulk Extend", `Add 14 days to trial for ${selectedUsers.size} users?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Extend",
        onPress: async () => {
          try {
            const result = await bulkExtendTrial({ userIds: Array.from(selectedUsers) as Id<"users">[], days: 14 });
            setSelectedUsers(new Set());
            safeHaptics.success();
            // Server silently skips admin accounts and active paying subscribers;
            // surface the real counts so the admin knows who was actually extended.
            const skippedSuffix = result.skipped > 0 ? ` (${result.skipped} skipped)` : "";
            showToast(`Extended trials for ${result.count} users${skippedSuffix}`, "success");
          } catch (e) { showToast((e as Error).message, "error"); }
        },
      },
    ]);
  }, [selectedUsers, bulkExtendTrial, showAlert, showToast]);

  const userRenderItem = useCallback(
    ({ item }: { item: User }) => (
      <UserRow
        user={item}
        isBulkSelected={selectedUsers.has(item._id)}
        canBulk={canBulk}
        canEdit={canEdit}
        isSelf={item._id === currentUserId}
        onSelect={handleSelectUser}
        onToggleBulk={toggleUserSelection}
        onImpersonate={handleImpersonate}
        onToggleAdmin={handleToggleAdmin}
      />
    ),
    [selectedUsers, canBulk, canEdit, currentUserId, handleSelectUser, toggleUserSelection, handleImpersonate, handleToggleAdmin]
  );

  const userKeyExtractor = useCallback((item: User) => item._id, []);

  const listHeader = useMemo(
    () => (
      <UserListHeader
        search={search}
        setSearch={setSearch}
        selectedUsers={selectedUsers}
        setSelectedUsers={setSelectedUsers}
        canBulk={canBulk}
        displayUsers={displayUsers}
        onSavePreset={handleSavePreset}
        onApplyPreset={handleApplyPreset}
        onBulkExtend={handleBulkExtend}
        onExportCSV={handleExportCSV}
      />
    ),
    [search, setSearch, selectedUsers, setSelectedUsers, canBulk, displayUsers, handleSavePreset, handleApplyPreset, handleBulkExtend, handleExportCSV]
  );

  const userListData = useMemo(
    () => (Array.isArray(displayUsers) ? displayUsers : []),
    [displayUsers]
  );

  const listFooter = useMemo(
    () => (
      <View>
        {status === "CanLoadMore" && (
          <GlassButton
            onPress={() => loadMore(50)}
            variant="ghost"
            size="sm"
            style={{ marginTop: spacing.md }}
          >Load More Users</GlassButton>
        )}
        <View style={{ height: listBottomPadding }} />
      </View>
    ),
    [status, loadMore, listBottomPadding]
  );

  return (
    <View style={{ flex: 1 }}>
      <FlashList
        data={userListData}
        renderItem={userRenderItem}
        keyExtractor={userKeyExtractor}
        ListHeaderComponent={listHeader}
        ListFooterComponent={listFooter}
        extraData={{ selectedUsers, canBulk, canEdit }}
        contentContainerStyle={styles.scrollContent}
      />
    </View>
  );
}
