/**
 * UserDetailScreen — standalone admin user detail view.
 *
 * Previously this lived as a drawer block inside UserListHeader, mutating
 * UsersTab local state. It has been promoted to a real screen so tapping a
 * user row is explicit navigation (push) instead of "header mutation far
 * above the tapped row". Back button returns to the list with scroll
 * preserved; deep links (/admin/users/{id}) work for free.
 *
 * Self-fetches user detail, tags, permissions, and current user — no props
 * beyond the `userId` param from the route.
 */
import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  Pressable,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Keyboard,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

import {
  GlassScreen,
  SimpleHeader,
  GlassCard,
  colors,
  spacing,
  typography,
  useGlassAlert,
} from "@/components/ui/glass";
import { safeHaptics } from "@/lib/haptics/safeHaptics";

import { adminStyles as styles } from "../styles";
import { ActivityTimeline } from "../ActivityTimeline";
import { UserInfoPanel } from "./UserInfoPanel";
import { useAdminToast, useResponsive } from "../hooks";
import { useUserActions } from "../hooks/useUserActions";
import type { User, PermissionData } from "../types";

export function UserDetailScreen({ userId }: { userId: string }) {
  const { alert: showAlert } = useGlassAlert();
  const { showToast } = useAdminToast();
  const { isMobile } = useResponsive();

  const currentUser = useQuery(api.users.getCurrent);
  const userDetail = useQuery(api.admin.getUserDetail, {
    userId: userId as Id<"users">,
  }) as User | undefined | null;
  const userTags = useQuery(api.admin.getUserTags, {
    userId: userId as Id<"users">,
  }) as string[] | undefined;
  const myPerms = useQuery(api.admin.getMyPermissions, {}) as
    | PermissionData
    | undefined
    | null;

  const [detailTab, setDetailTab] = useState<"info" | "activity">("info");
  const [newTag, setNewTag] = useState("");

  const addTag = useMutation(api.tags.addUserTag);
  const removeTag = useMutation(api.tags.removeUserTag);

  const {
    handleImpersonate,
    handleExtendTrial,
    handleStartTrial,
    handleDowngrade,
    handleAdjustPoints,
    handleGrantAccess,
    handleToggleSuspension,
  } = useUserActions({ showAlert, showToast });

  // myPerms can be null (not authenticated / no perms) or undefined (loading).
  // Guard both branches so an unauthenticated admin can never slip through
  // with `canEdit === true` due to optional-chaining coalescing quirks.
  const canEdit =
    myPerms?.role === "super_admin" ||
    (Array.isArray(myPerms?.permissions) &&
      (myPerms?.permissions?.includes("edit_users") ?? false));
  const isSelf = currentUser?._id === userId;

  const handleAddTag = useCallback(async () => {
    if (!newTag.trim()) return;
    try {
      await addTag({ userId: userId as Id<"users">, tag: newTag.trim() });
      setNewTag("");
      Keyboard.dismiss();
      safeHaptics.success();
      showToast("Tag added", "success");
    } catch (e) {
      showToast((e as Error).message, "error");
    }
  }, [newTag, addTag, userId, showToast]);

  const handleRemoveTag = useCallback(
    async (tag: string) => {
      try {
        await removeTag({ userId: userId as Id<"users">, tag });
        safeHaptics.success();
        showToast("Tag removed", "success");
      } catch (e) {
        showToast((e as Error).message, "error");
      }
    },
    [removeTag, userId, showToast]
  );

  // Loading state — any of these undefined means the query hasn't resolved
  if (
    userDetail === undefined ||
    myPerms === undefined ||
    currentUser === undefined
  ) {
    return (
      <GlassScreen>
        <SimpleHeader title="User Detail" showBack includeSafeArea />
        <View
          style={{
            flex: 1,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <ActivityIndicator size="large" color={colors.accent.primary} />
        </View>
      </GlassScreen>
    );
  }

  // Not-found state — query resolved but returned null
  if (!userDetail) {
    return (
      <GlassScreen>
        <SimpleHeader title="User Not Found" showBack includeSafeArea />
        <View
          style={{
            flex: 1,
            alignItems: "center",
            justifyContent: "center",
            padding: spacing.xl,
            gap: spacing.md,
          }}
        >
          <MaterialCommunityIcons
            name="account-question"
            size={64}
            color={colors.text.tertiary}
          />
          <Text
            style={{
              ...typography.bodyLarge,
              color: colors.text.secondary,
              textAlign: "center",
            }}
          >
            This user could not be loaded. They may have been deleted.
          </Text>
        </View>
      </GlassScreen>
    );
  }

  const rightElement = !isSelf ? (
    <Pressable
      onPress={() => handleImpersonate(userId)}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel="Impersonate this user"
    >
      <MaterialCommunityIcons
        name="incognito"
        size={24}
        color={colors.accent.primary}
      />
    </Pressable>
  ) : undefined;

  return (
    <GlassScreen>
      <SimpleHeader
        title={userDetail.name}
        subtitle={userDetail.email || "No email"}
        showBack
        includeSafeArea
        rightElement={rightElement}
      />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <GlassCard style={styles.section}>
          {/* Tags */}
          <View
            style={[
              styles.filterRow,
              {
                marginBottom: spacing.sm,
                flexWrap: "wrap",
                gap: spacing.xs,
              },
            ]}
          >
            {userTags?.map((tag) => (
              <View key={tag} style={styles.tagBadge}>
                <Text style={styles.tagBadgeText}>{tag}</Text>
                <Pressable
                  onPress={() => handleRemoveTag(tag)}
                  accessibilityRole="button"
                  accessibilityLabel={`Remove tag ${tag}`}
                >
                  <MaterialCommunityIcons
                    name="close-circle"
                    size={14}
                    color={colors.text.tertiary}
                  />
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
                accessibilityLabel="Add a tag to this user"
              />
            </View>
          </View>

          {/* Info / Activity tab switcher — wrapped in a tablist so screen
              readers announce the pair as a group of tabs, not two unrelated
              buttons. */}
          <View
            accessibilityRole="tablist"
            style={[styles.filterRow, { marginBottom: spacing.md }]}
          >
            <Pressable
              style={[
                styles.filterChip,
                detailTab === "info" && styles.filterChipActive,
              ]}
              onPress={() => setDetailTab("info")}
              accessibilityRole="tab"
              accessibilityState={{ selected: detailTab === "info" }}
              accessibilityLabel="Info tab"
            >
              <Text
                style={[
                  styles.filterChipText,
                  detailTab === "info" && styles.filterChipTextActive,
                ]}
              >
                Info
              </Text>
            </Pressable>
            <Pressable
              style={[
                styles.filterChip,
                detailTab === "activity" && styles.filterChipActive,
              ]}
              onPress={() => setDetailTab("activity")}
              accessibilityRole="tab"
              accessibilityState={{ selected: detailTab === "activity" }}
              accessibilityLabel="Activity tab"
            >
              <Text
                style={[
                  styles.filterChipText,
                  detailTab === "activity" && styles.filterChipTextActive,
                ]}
              >
                Activity
              </Text>
            </Pressable>
          </View>

          {detailTab === "info" ? (
            <UserInfoPanel
              userDetail={userDetail}
              userId={userId}
              canEdit={canEdit}
              isSelf={isSelf}
              isMobile={isMobile}
              onStartTrial={handleStartTrial}
              onExtendTrial={handleExtendTrial}
              onGrantAccess={handleGrantAccess}
              onDowngrade={handleDowngrade}
              onAdjustPoints={handleAdjustPoints}
              onToggleSuspension={handleToggleSuspension}
            />
          ) : (
            <ActivityTimeline userId={userId} />
          )}
        </GlassCard>
      </ScrollView>
    </GlassScreen>
  );
}
