import { View, Text, StyleSheet, Pressable } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { RefObject } from "react";

import {
  GlassCard,
  GlassButton,
  AnimatedSection,
  colors,
  typography,
  spacing,
  borderRadius,
} from "@/components/ui/glass";

export function AccountSection({
  userDisplayName,
  userEmail,
  referralInfo,
  handleShareReferral,
  isAdmin,
  dietRef,
  animationDelay,
  onEditName,
}: {
  userDisplayName: string;
  userEmail: string | undefined;
  referralInfo: {
    code: string;
    referredUsers: string[];
    pointsEarned: number;
  } | undefined | null;
  handleShareReferral: () => void;
  isAdmin: boolean;
  dietRef: RefObject<View | null>;
  animationDelay: number;
  onEditName?: () => void;
}) {
  return (
    <AnimatedSection animation="fadeInDown" duration={400} delay={animationDelay}>
      <View style={styles.section} ref={dietRef}>
        <Text style={styles.sectionTitle}>Account</Text>
        <Pressable onPress={onEditName}>
          <GlassCard variant="bordered" accentColor={colors.semantic.profile} style={{ marginBottom: spacing.sm }}>
            <View style={styles.accountRow}>
              <View style={styles.avatarContainer}>
                <MaterialCommunityIcons
                  name="account-circle"
                  size={48}
                  color={colors.semantic.profile}
                />
              </View>
              <View style={styles.accountInfo}>
                <Text style={styles.accountName}>
                  {userDisplayName}
                </Text>
                <Text style={styles.accountEmail}>
                  {userEmail || "Not set"}
                </Text>
              </View>
              <MaterialCommunityIcons
                name="pencil-outline"
                size={18}
                color={colors.text.tertiary}
              />
            </View>
          </GlassCard>
        </Pressable>

        {/* Referrals Section */}
        <GlassCard variant="standard" style={styles.referralCard}>
          <View style={styles.referralHeader}>
            <MaterialCommunityIcons name="gift-outline" size={24} color={colors.accent.primary} />
            <Text style={styles.referralTitle}>Invite Friends, Get Points</Text>
          </View>
          <Text style={styles.referralSubtitle}>
            Get 500 pts (£0.50) for every friend who joins. They&apos;ll get 500 pts too!
          </Text>

          <View style={styles.referralCodeBox}>
            <View style={{ flex: 1 }}>
              <Text style={styles.referralCodeLabel}>YOUR CODE</Text>
              <Text style={styles.referralCodeText}>{referralInfo?.code || "GENERATING..."}</Text>
            </View>
            <GlassButton
              variant="primary"
              size="sm"
              onPress={handleShareReferral}
              disabled={!referralInfo?.code}
            >
              Invite
            </GlassButton>
          </View>

          {referralInfo?.referredUsers && referralInfo.referredUsers.length > 0 && (
            <Text style={styles.referralStats}>
              {referralInfo.referredUsers.length} friend{referralInfo.referredUsers.length !== 1 ? "s" : ""} joined · {referralInfo.pointsEarned} pts earned
            </Text>
          )}
        </GlassCard>
      </View>
    </AnimatedSection>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    ...typography.labelLarge,
    color: colors.text.secondary,
    marginBottom: spacing.sm,
    marginLeft: spacing.xs,
  },
  accountRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  avatarContainer: {
    width: 56,
    height: 56,
    borderRadius: borderRadius.full,
    backgroundColor: `${colors.semantic.profile}20`,
    justifyContent: "center",
    alignItems: "center",
  },
  accountInfo: {
    flex: 1,
  },
  accountName: {
    ...typography.headlineSmall,
    color: colors.text.primary,
    marginBottom: 2,
  },
  accountEmail: {
    ...typography.bodyMedium,
    color: colors.text.secondary,
  },
  referralCard: {
    marginTop: spacing.sm,
    padding: spacing.md,
  },
  referralHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: 4,
  },
  referralTitle: {
    ...typography.bodyMedium,
    color: colors.text.primary,
    fontWeight: "700",
  },
  referralSubtitle: {
    ...typography.bodySmall,
    color: colors.text.secondary,
    marginBottom: spacing.md,
  },
  referralCodeBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    padding: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  referralCodeLabel: {
    fontSize: 9,
    color: colors.text.tertiary,
    fontWeight: "800",
    letterSpacing: 1,
  },
  referralCodeText: {
    ...typography.headlineSmall,
    color: colors.accent.primary,
    fontWeight: "800",
    letterSpacing: 2,
  },
  referralStats: {
    ...typography.labelSmall,
    color: colors.text.tertiary,
    marginTop: spacing.sm,
    textAlign: "center",
  },
});
