import React, { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { colors, spacing, typography } from "@/lib/design/glassTokens";

/**
 * Soft nudge banner shown on main screens:
 * - Last 2 days of trial: "2 days left — subscribe to keep unlimited"
 * - After trial expires: "Trial ended — upgrade for unlimited lists & pantry"
 * - Dismissible per session
 */
export function TrialNudgeBanner() {
  const router = useRouter();
  const subscription = useQuery(api.subscriptions.getCurrentSubscription);
  const [dismissed, setDismissed] = useState(false);

  if (dismissed || !subscription) return null;

  const isTrial = subscription.status === "trial";
  const isExpired = subscription.status === "expired";
  const trialEndsAt = (subscription as any)?.trialEndsAt;

  const daysLeft = isTrial && trialEndsAt
    ? Math.max(0, Math.ceil((trialEndsAt - Date.now()) / (1000 * 60 * 60 * 24)))
    : 0;

  // Show during last 2 days of trial or after expiry
  const showTrialUrgency = isTrial && daysLeft <= 2;
  const showExpired = isExpired;

  if (!showTrialUrgency && !showExpired) return null;

  const message = showExpired
    ? "Your trial ended — upgrade for unlimited lists & pantry"
    : daysLeft === 0
      ? "Trial ends today — subscribe to keep unlimited access"
      : `${daysLeft} day${daysLeft !== 1 ? "s" : ""} left — subscribe to keep unlimited access`;

  const accentColor = showExpired ? colors.accent.warm : colors.accent.secondary;

  return (
    <Pressable
      style={[styles.banner, { borderColor: accentColor }]}
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        router.push("/(app)/subscription" as any);
      }}
    >
      <MaterialCommunityIcons
        name={showExpired ? "clock-alert-outline" : "crown"}
        size={18}
        color={accentColor}
      />
      <Text style={[styles.text, { color: accentColor }]} numberOfLines={1}>
        {message}
      </Text>
      <Pressable
        onPress={(e) => {
          e.stopPropagation();
          setDismissed(true);
        }}
        hitSlop={8}
      >
        <MaterialCommunityIcons name="close" size={16} color={colors.text.tertiary} />
      </Pressable>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: 12,
    borderWidth: 1,
    backgroundColor: `${colors.background.primary}CC`,
  },
  text: {
    ...typography.bodySmall,
    fontWeight: "600",
    flex: 1,
  },
});
