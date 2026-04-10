/**
 * UserInfoPanel — info-tab content for UserDetailScreen.
 *
 * Extracted from UserDetailScreen.tsx to keep that file under the 400-line
 * limit. Renders the detail grid, subscription badge, tier text, contextual
 * action buttons, and the suspend/unsuspend button.
 *
 * All state (which user, permission flags, whether the admin is viewing
 * themselves) is passed in as props — this component is purely presentational
 * and reuses the shared `adminStyles` so spacing matches the rest of the tab.
 */
import React from "react";
import { View, Text, Pressable } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import { colors, spacing, typography } from "@/components/ui/glass";

import { adminStyles as styles } from "../styles";
import { SubscriptionBadge } from "./SubscriptionBadge";
import { getContextualActions } from "./contextualActions";
import type { User } from "../types";

interface UserInfoPanelProps {
  userDetail: User;
  userId: string;
  canEdit: boolean;
  isSelf: boolean;
  isMobile: boolean;
  onStartTrial: (userId: string) => void;
  onExtendTrial: (userId: string, days?: number) => void;
  onGrantAccess: (userId: string) => void;
  onDowngrade: (userId: string) => void;
  onAdjustPoints: (userId: string) => void;
  onToggleSuspension: (userId: string) => void;
}

export function UserInfoPanel({
  userDetail,
  userId,
  canEdit,
  isSelf,
  isMobile,
  onStartTrial,
  onExtendTrial,
  onGrantAccess,
  onDowngrade,
  onAdjustPoints,
  onToggleSuspension,
}: UserInfoPanelProps) {
  return (
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
          <Text style={styles.detailValue}>
            {userDetail.scanRewards?.points?.toLocaleString() ?? 0}
          </Text>
          <Text style={styles.detailLabel}>Points</Text>
        </View>
      </View>
      {userDetail.subscriptionDisplay && (
        <View style={{ marginTop: spacing.sm, marginBottom: spacing.xs }}>
          <SubscriptionBadge
            display={userDetail.subscriptionDisplay}
            size="full"
          />
        </View>
      )}
      <Text style={styles.metricText}>
        Tier: {userDetail.scanRewards?.tier || "bronze"} (
        {userDetail.scanRewards?.lifetimeScans || 0} scans)
      </Text>
      {canEdit && isSelf && (
        <View
          style={{
            marginTop: spacing.md,
            padding: spacing.sm,
            borderRadius: 8,
            backgroundColor: `${colors.text.tertiary}10`,
          }}
        >
          <Text
            style={{
              ...typography.labelSmall,
              color: colors.text.tertiary,
              textAlign: "center",
            }}
          >
            This is your own account. Destructive admin actions on yourself are
            blocked for safety — ask another super_admin if you need them
            applied.
          </Text>
        </View>
      )}
      {canEdit && !isSelf && (
        <View style={[styles.actionRow, isMobile && styles.mobileActionRow]}>
          {getContextualActions(
            userDetail.subscriptionDisplay?.effectiveStatus
          ).map((action) => (
            <Pressable
              key={action.key}
              style={[styles.actionBtn, action.danger && styles.dangerBtn]}
              onPress={() => {
                switch (action.key) {
                  case "start_trial":
                    return onStartTrial(userId);
                  case "extend_7":
                    return onExtendTrial(userId, 7);
                  case "extend_14":
                    return onExtendTrial(userId, 14);
                  case "grant_premium":
                    return onGrantAccess(userId);
                  case "downgrade":
                    return onDowngrade(userId);
                }
              }}
              accessibilityRole="button"
              accessibilityLabel={action.label}
            >
              <MaterialCommunityIcons
                name={action.icon}
                size={16}
                color={
                  action.danger
                    ? colors.semantic.danger
                    : colors.accent.primary
                }
              />
              <Text
                style={[
                  styles.actionBtnText,
                  action.danger && { color: colors.semantic.danger },
                ]}
              >
                {action.label}
              </Text>
            </Pressable>
          ))}
          <Pressable
            style={styles.actionBtn}
            onPress={() => onAdjustPoints(userId)}
            accessibilityRole="button"
            accessibilityLabel="Adjust points"
          >
            <MaterialCommunityIcons
              name="star-plus-outline"
              size={16}
              color={colors.accent.secondary}
            />
            <Text style={styles.actionBtnText}>Adjust Pts</Text>
          </Pressable>
          <Pressable
            style={[styles.actionBtn, styles.suspendBtn]}
            onPress={() => onToggleSuspension(userId)}
            accessibilityRole="button"
            accessibilityLabel={
              userDetail.suspended ? "Unsuspend user" : "Suspend user"
            }
          >
            <MaterialCommunityIcons
              name={
                userDetail.suspended
                  ? "account-check-outline"
                  : "account-off-outline"
              }
              size={16}
              color={colors.semantic.danger}
            />
            <Text
              style={[
                styles.actionBtnText,
                { color: colors.semantic.danger },
              ]}
            >
              {userDetail.suspended ? "Unsuspend" : "Suspend"}
            </Text>
          </Pressable>
        </View>
      )}
    </>
  );
}
