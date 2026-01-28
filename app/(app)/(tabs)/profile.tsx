import {
  View,
  Text,
  StyleSheet,
  ScrollView,
} from "react-native";
import { useAuth, useUser } from "@clerk/clerk-expo";
import { useRouter } from "expo-router";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import * as Haptics from "expo-haptics";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import {
  GlassScreen,
  GlassCard,
  GlassButton,
  SimpleHeader,
  SkeletonCard,
  SkeletonStatCard,
  colors,
  typography,
  spacing,
  borderRadius,
} from "@/components/ui/glass";

export default function ProfileScreen() {
  const { signOut } = useAuth();
  const { user } = useUser();
  const router = useRouter();

  const allLists = useQuery(api.shoppingLists.getByUser);
  const pantryItems = useQuery(api.pantryItems.getByUser);

  const handleSignOut = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await signOut();
    router.replace("/(auth)/sign-in");
  };

  // Loading state with skeletons
  if (allLists === undefined || pantryItems === undefined) {
    return (
      <GlassScreen>
        <SimpleHeader title="Profile" subtitle="Loading..." />
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.skeletonContent}>
          {/* Account Skeleton */}
          <View style={styles.section}>
            <View style={styles.skeletonSectionTitle} />
            <SkeletonCard />
          </View>

          {/* Stats Skeleton */}
          <View style={styles.section}>
            <View style={styles.skeletonSectionTitle} />
            <View style={styles.statsGrid}>
              <SkeletonStatCard />
              <SkeletonStatCard />
              <SkeletonStatCard />
              <SkeletonStatCard />
            </View>
          </View>

          {/* Pantry Skeleton */}
          <View style={styles.section}>
            <View style={styles.skeletonSectionTitle} />
            <SkeletonCard />
          </View>
        </ScrollView>
      </GlassScreen>
    );
  }

  // Calculate stats
  const completedLists = allLists.filter((list) => list.status === "completed");
  const activeLists = allLists.filter((list) => list.status === "active");
  const shoppingLists = allLists.filter((list) => list.status === "shopping");

  const totalSpent = completedLists.reduce((sum, list) => {
    return sum + (list.budget || 0);
  }, 0);

  const budgetAdherence =
    completedLists.length > 0
      ? (completedLists.filter((list) => (list.budget || 0) > 0).length /
          completedLists.length) *
        100
      : 0;

  const outOfStockItems = pantryItems.filter((item) => item.stockLevel === "out").length;
  const lowStockItems = pantryItems.filter((item) => item.stockLevel === "low").length;

  return (
    <GlassScreen>
      <SimpleHeader
        title="Profile"
        subtitle="Your insights & settings"
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* User Account Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>
          <GlassCard variant="bordered" accentColor={colors.semantic.profile}>
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
                  {user?.firstName || user?.username || "User"}
                </Text>
                <Text style={styles.accountEmail}>
                  {user?.primaryEmailAddress?.emailAddress || "Not set"}
                </Text>
              </View>
            </View>
          </GlassCard>
        </View>

        {/* Shopping Stats Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Shopping Stats</Text>

          {/* Stats Grid */}
          <View style={styles.statsGrid}>
            <StatCard
              value={allLists.length}
              label="Total Lists"
              icon="clipboard-list"
              color={colors.semantic.lists}
            />
            <StatCard
              value={completedLists.length}
              label="Completed"
              icon="check-circle"
              color={colors.accent.primary}
            />
            <StatCard
              value={activeLists.length}
              label="Active"
              icon="clipboard-edit-outline"
              color={colors.accent.secondary}
            />
            <StatCard
              value={shoppingLists.length}
              label="Shopping"
              icon="cart"
              color={colors.semantic.warning}
            />
          </View>

          {/* Total Spent Card */}
          <GlassCard variant="standard" style={styles.spentCard}>
            <View style={styles.spentRow}>
              <View style={styles.spentIconContainer}>
                <MaterialCommunityIcons
                  name="cash-multiple"
                  size={28}
                  color={colors.accent.primary}
                />
              </View>
              <View style={styles.spentInfo}>
                <Text style={styles.spentLabel}>Total Spent</Text>
                <Text style={styles.spentValue}>£{totalSpent.toFixed(2)}</Text>
              </View>
            </View>
          </GlassCard>

          {/* Budget Adherence */}
          {completedLists.length > 0 && (
            <GlassCard variant="standard">
              <View style={styles.adherenceRow}>
                <MaterialCommunityIcons
                  name="chart-donut"
                  size={24}
                  color={colors.text.secondary}
                />
                <View style={styles.adherenceInfo}>
                  <Text style={styles.adherenceLabel}>Budget Tracking</Text>
                  <Text style={styles.adherenceValue}>
                    {budgetAdherence.toFixed(0)}% of trips tracked
                  </Text>
                </View>
              </View>
            </GlassCard>
          )}
        </View>

        {/* Pantry Overview Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Pantry Overview</Text>

          {/* Total Items */}
          <GlassCard variant="bordered" accentColor={colors.semantic.pantry}>
            <View style={styles.pantryTotalRow}>
              <MaterialCommunityIcons
                name="fridge"
                size={32}
                color={colors.semantic.pantry}
              />
              <View style={styles.pantryTotalInfo}>
                <Text style={styles.pantryTotalValue}>{pantryItems.length}</Text>
                <Text style={styles.pantryTotalLabel}>Total Items in Pantry</Text>
              </View>
            </View>
          </GlassCard>

          {/* Stock Alerts */}
          {(outOfStockItems > 0 || lowStockItems > 0) && (
            <View style={styles.alertsContainer}>
              {outOfStockItems > 0 && (
                <GlassCard variant="standard" style={styles.alertCard}>
                  <View style={styles.alertRow}>
                    <View style={[styles.alertIconContainer, styles.alertIconDanger]}>
                      <MaterialCommunityIcons
                        name="alert-circle"
                        size={20}
                        color={colors.semantic.danger}
                      />
                    </View>
                    <View style={styles.alertInfo}>
                      <Text style={styles.alertTitle}>Out of Stock</Text>
                      <Text style={[styles.alertValue, styles.alertValueDanger]}>
                        {outOfStockItems} {outOfStockItems === 1 ? "item" : "items"}
                      </Text>
                    </View>
                    <MaterialCommunityIcons
                      name="chevron-right"
                      size={24}
                      color={colors.text.tertiary}
                    />
                  </View>
                </GlassCard>
              )}

              {lowStockItems > 0 && (
                <GlassCard variant="standard" style={styles.alertCard}>
                  <View style={styles.alertRow}>
                    <View style={[styles.alertIconContainer, styles.alertIconWarning]}>
                      <MaterialCommunityIcons
                        name="alert"
                        size={20}
                        color={colors.semantic.warning}
                      />
                    </View>
                    <View style={styles.alertInfo}>
                      <Text style={styles.alertTitle}>Low Stock</Text>
                      <Text style={[styles.alertValue, styles.alertValueWarning]}>
                        {lowStockItems} {lowStockItems === 1 ? "item" : "items"}
                      </Text>
                    </View>
                    <MaterialCommunityIcons
                      name="chevron-right"
                      size={24}
                      color={colors.text.tertiary}
                    />
                  </View>
                </GlassCard>
              )}
            </View>
          )}
        </View>

        {/* Sign Out */}
        <View style={styles.signOutSection}>
          <GlassButton
            variant="danger"
            size="lg"
            icon="logout"
            onPress={handleSignOut}
          >
            Sign Out
          </GlassButton>
        </View>

        {/* Bottom spacing */}
        <View style={styles.bottomSpacer} />
      </ScrollView>
    </GlassScreen>
  );
}

// =============================================================================
// STAT CARD COMPONENT
// =============================================================================

interface StatCardProps {
  value: number;
  label: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  color: string;
}

function StatCard({ value, label, icon, color }: StatCardProps) {
  return (
    <GlassCard variant="standard" style={styles.statCard}>
      <View style={[styles.statIconContainer, { backgroundColor: `${color}20` }]}>
        <MaterialCommunityIcons name={icon} size={20} color={color} />
      </View>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </GlassCard>
  );
}

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  skeletonContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  skeletonSectionTitle: {
    width: 80,
    height: 14,
    borderRadius: 4,
    backgroundColor: colors.glass.backgroundStrong,
    marginBottom: spacing.sm,
    marginLeft: spacing.xs,
  },
  bottomSpacer: {
    height: 120, // Extra space for tab bar
  },

  // Section
  section: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    ...typography.labelLarge,
    color: colors.text.secondary,
    marginBottom: spacing.sm,
    marginLeft: spacing.xs,
  },

  // Account Card
  accountRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  avatarContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
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

  // Stats Grid
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  statCard: {
    width: "48%",
    flexGrow: 1,
    alignItems: "center",
    paddingVertical: spacing.md,
  },
  statIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: spacing.xs,
  },
  statValue: {
    ...typography.displaySmall,
    fontWeight: "700",
    marginBottom: 2,
  },
  statLabel: {
    ...typography.labelSmall,
    color: colors.text.tertiary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },

  // Spent Card
  spentCard: {
    marginBottom: spacing.sm,
  },
  spentRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  spentIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: `${colors.accent.primary}20`,
    justifyContent: "center",
    alignItems: "center",
  },
  spentInfo: {
    flex: 1,
  },
  spentLabel: {
    ...typography.labelSmall,
    color: colors.text.secondary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  spentValue: {
    ...typography.displaySmall,
    color: colors.accent.primary,
    fontWeight: "700",
  },

  // Adherence
  adherenceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  adherenceInfo: {
    flex: 1,
  },
  adherenceLabel: {
    ...typography.labelSmall,
    color: colors.text.tertiary,
    marginBottom: 2,
  },
  adherenceValue: {
    ...typography.bodyMedium,
    color: colors.text.primary,
  },

  // Pantry Total
  pantryTotalRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  pantryTotalInfo: {
    flex: 1,
  },
  pantryTotalValue: {
    ...typography.displayMedium,
    color: colors.semantic.pantry,
    fontWeight: "700",
  },
  pantryTotalLabel: {
    ...typography.bodySmall,
    color: colors.text.secondary,
  },

  // Stock Alerts
  alertsContainer: {
    marginTop: spacing.sm,
    gap: spacing.sm,
  },
  alertCard: {
    // No extra margin needed
  },
  alertRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  alertIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  alertIconDanger: {
    backgroundColor: `${colors.semantic.danger}20`,
  },
  alertIconWarning: {
    backgroundColor: `${colors.semantic.warning}20`,
  },
  alertInfo: {
    flex: 1,
  },
  alertTitle: {
    ...typography.bodySmall,
    color: colors.text.secondary,
    marginBottom: 2,
  },
  alertValue: {
    ...typography.bodyLarge,
    fontWeight: "600",
  },
  alertValueDanger: {
    color: colors.semantic.danger,
  },
  alertValueWarning: {
    color: colors.semantic.warning,
  },

  // Sign Out
  signOutSection: {
    marginTop: spacing.lg,
  },
});
