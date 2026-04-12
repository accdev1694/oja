import React, { useState } from "react";
import { Pressable, StyleSheet, Text } from "react-native";
import Animated, { FadeInDown, FadeOutUp } from "react-native-reanimated";
import { useRouter } from "expo-router";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { colors, spacing, typography } from "@/lib/design/glassTokens";
import { useCurrentUser } from "@/hooks/useCurrentUser";

// Free-tier pantry cap — mirrors convex/lib/featureGating.getFreeFeatures().maxPantryItems.
// Kept as a local constant because `subscription.features.maxPantryItems` is -1
// (unlimited) during the trial, so it can't be used for the "overflow on expiry"
// warning; we specifically need the post-downgrade free-plan cap here.
const FREE_PANTRY_CAP = 30;

/**
 * Soft nudge banner shown on main screens:
 * - During trial: "X days remaining in your free trial — Upgrade now…"
 * - During trial with oversized pantry: warns that N items will be archived on expiry
 * - After expiry: persistent "Upgrade now to restore items" CTA
 * - Dismissible per session in both trial and expired states (resets on mount)
 * - The inline "Upgrade now" is rendered as an underlined link so users clearly
 *   see it's interactive — the whole banner is tappable, but the CTA is the
 *   visual anchor.
 */
export function TrialNudgeBanner() {
  const router = useRouter();
  const { firstName } = useCurrentUser();
  const subscription = useQuery(api.subscriptions.getCurrentSubscription);
  const [dismissed, setDismissed] = useState(false);

  // Only fetch the pantry when the banner could actually render — otherwise
  // every screen that mounts this banner would pay the roundtrip on every
  // render, even for paid users who never see it.
  const shouldCheckPantry =
    !!subscription &&
    (subscription.status === "trial" || subscription.status === "expired");
  const pantryItems = useQuery(
    api.pantryItems.getByUser,
    shouldCheckPantry ? {} : "skip"
  );

  if (dismissed || !subscription) return null;

  const isTrial = subscription.status === "trial";
  const isExpired = subscription.status === "expired";
  const trialEndsAt = "trialEndsAt" in subscription ? (subscription.trialEndsAt as number | undefined) : undefined;

  const daysLeft = isTrial && trialEndsAt
    ? Math.max(0, Math.ceil((trialEndsAt - Date.now()) / (1000 * 60 * 60 * 24)))
    : 0;

  // Show throughout entire trial period or after expiry
  const showTrial = isTrial;
  const showExpired = isExpired;

  if (!showTrial && !showExpired) return null;

  // Overflow still drives the accent colour (warmer = more urgent), but the
  // copy stays unified: users get the cap-archive detail via the notification
  // we push when the trial actually expires, not inside the banner.
  const activeCount = pantryItems?.length ?? 0;
  const hasOverflow = activeCount > FREE_PANTRY_CAP;
  const isUrgent = daysLeft <= 2;

  // Single canonical phrasing for every trial/expired state — split into
  // { prefix, suffix } so we can inline-style "Upgrade now" as a link.
  const name = firstName ? `${firstName}, ` : "";
  const daysLabel = (n: number) => `${n} day${n !== 1 ? "s" : ""}`;

  let prefix: string;
  let suffix: string;
  if (showExpired) {
    prefix = `${name}your free trial ended. `;
    suffix = " to restore archived items and unlock full Premium features.";
  } else if (daysLeft === 0) {
    prefix = `${name}your free trial ends today. `;
    suffix = " for full Premium features and to keep all pantry items.";
  } else {
    prefix = `${name}${daysLabel(daysLeft)} remaining in your free trial. `;
    suffix = " for full Premium features and to keep all pantry items.";
  }
  const ctaText = "Upgrade now";

  // Warm color for expired/urgent/overflow, teal for normal trial period
  const accentColor = showExpired || (hasOverflow && isUrgent)
    ? colors.accent.warm
    : isUrgent || hasOverflow
      ? colors.accent.secondary
      : colors.accent.primary;

  return (
    <Animated.View
      entering={FadeInDown.duration(300).springify()}
      exiting={FadeOutUp.duration(200)}
    >
      <Pressable
        style={[styles.banner, { borderColor: accentColor }]}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          router.push("/(app)/subscription");
        }}
      >
        <MaterialCommunityIcons
          name={showExpired ? "clock-alert-outline" : "crown"}
          size={18}
          color={accentColor}
        />
        <Text style={[styles.text, { color: accentColor }]} numberOfLines={3}>
          {prefix}
          <Text style={[styles.ctaLink, { color: accentColor }]}>{ctaText}</Text>
          {suffix}
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
    </Animated.View>
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
  ctaLink: {
    ...typography.bodySmall,
    fontWeight: "800",
    textDecorationLine: "underline",
  },
});
