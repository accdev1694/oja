import { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Linking,
} from "react-native";
import { useAuth, useUser } from "@clerk/clerk-expo";
import { useRouter } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { useQuery, useMutation, useAction } from "convex/react";

import { api } from "@/convex/_generated/api";
import * as Haptics from "expo-haptics";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { setHintsEnabled, resetAllHints } from "@/lib/storage/hintStorage";

import {
  GlassScreen,
  GlassCard,
  GlassButton,
  GlassCheckbox,
  SimpleHeader,
  SkeletonCard,
  AnimatedSection,
  GlassSegmentedControl,
  colors,
  typography,
  spacing,
  borderRadius,
  useGlassAlert,
} from "@/components/ui/glass";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useIsSwitchingUsers } from "@/hooks/useIsSwitchingUsers";
import { PlatformAIUsageMonitor } from "@/components/admin/PlatformAIUsageMonitor";

import { useHint } from "@/hooks/useHint";
import { HintOverlay } from "@/components/tutorial/HintOverlay";
import { hasViewedHint as hasViewedHintLocal } from "@/lib/storage/hintStorage";

export default function ProfileScreen() {
  const { signOut } = useAuth();
  const { user } = useUser();
  const router = useRouter();
  const { alert } = useGlassAlert();
  const { firstName, user: convexUser } = useCurrentUser();
  const isSwitchingUsers = useIsSwitchingUsers();

  // Hint targets
  const headerRef = useRef<View>(null);
  const dietRef = useRef<View>(null);
  const hintsRef = useRef<View>(null);

  // Hints
  const introHint = useHint("profile_intro", "delayed");
  const dietHint = useHint("profile_diet", "manual");
  const hintsHint = useHint("profile_hints", "manual");

  // Sequence: intro -> diet -> hints
  useEffect(() => {
    if (introHint.shouldShow === false && !hasViewedHintLocal("profile_diet")) {
      dietHint.showHint();
    }
  }, [introHint.shouldShow]);

  useEffect(() => {
    if (dietHint.shouldShow === false && !hasViewedHintLocal("profile_hints") && hasViewedHintLocal("profile_diet")) {
      hintsHint.showHint();
    }
  }, [dietHint.shouldShow]);
  
  const cancelAllSubs = useAction(api.stripe.cancelAllUserSubscriptions);
  const resetMyAccount = useMutation(api.users.resetMyAccount);
  const deleteMyAccount = useMutation(api.users.deleteMyAccount);
  const updateNotificationSettings = useMutation(api.users.updateNotificationSettings);
  const updateUser = useMutation(api.users.update);
  
  // Skip all queries during user switching to prevent cache leakage
  const allLists = useQuery(
    api.shoppingLists.getByUser,
    !isSwitchingUsers ? {} : "skip"
  );
  const pantryItems = useQuery(
    api.pantryItems.getByUser,
    !isSwitchingUsers ? {} : "skip"
  );
  const pointsBalance = useQuery(
    api.points.getPointsBalance,
    !isSwitchingUsers ? {} : "skip"
  );
  const subscription = useQuery(
    api.subscriptions.getCurrentSubscription,
    !isSwitchingUsers ? {} : "skip"
  );
  const aiUsage = useQuery(
    api.aiUsage.getUsageSummary,
    !isSwitchingUsers ? {} : "skip"
  );
  const receipts = useQuery(
    api.receipts.getByUser,
    !isSwitchingUsers ? {} : "skip"
  );
  const activeChallenge = useQuery(
    api.insights.getActiveChallenge,
    !isSwitchingUsers ? {} : "skip"
  );
  const referralInfo = useQuery(
    api.referrals.getMyReferralInfo,
    !isSwitchingUsers ? {} : "skip"
  );
  const generateReferralCode = useMutation(api.referrals.generateReferralCode);
  const generateChallenge = useMutation(api.insights.generateChallenge);
  
  const [isResetting, setIsResetting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [animationKey, setAnimationKey] = useState(0);
  const [gmvFilter, setGmvFilter] = useState<"week" | "month" | "year" | "lifetime">("lifetime");

  const myAdminPerms = useQuery(api.admin.getMyPermissions, {});
  const isAdmin = !!convexUser?.isAdmin || !!myAdminPerms;

  const adminAnalytics = useQuery(
    api.admin.getAnalytics,
    isAdmin ? {} : "skip"
  );
  const systemHealth = useQuery(
    api.admin.getSystemHealth,
    isAdmin ? {} : "skip"
  );
  const platformAIUsage = useQuery(
    api.admin.getPlatformAIUsage,
    isAdmin ? {} : "skip"
  );

  // Trigger animations every time this tab gains focus
  useFocusEffect(
    useCallback(() => {
      setAnimationKey((prev) => prev + 1);
    }, [])
  );

  // Auto-generate referral code if missing
  useEffect(() => {
    if (convexUser?._id && referralInfo === null) {
      generateReferralCode({ userId: convexUser._id });
    }
  }, [convexUser?._id, referralInfo, generateReferralCode]);

  const handleShareReferral = async () => {
    if (!referralInfo?.code) return;
    try {
      const message = `Join me on Oja and get 500 bonus points! Use my code ${referralInfo.code} to save on your groceries. https://oja.app/download`;
      await Linking.openURL(`sms:?&body=${encodeURIComponent(message)}`);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e) {
      console.error("Sharing failed:", e);
    }
  };

  const handleSupportPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    if (myAdminPerms?.role === "super_admin") {
      // Super Admin goes to Monitoring/Ops tab in Admin Dashboard
      router.push("/(app)/admin?tab=monitoring" as any);
    } else if (convexUser?.isAdmin || myAdminPerms) {
      // Regular Admin goes to support with internal flag
      router.push("/(app)/support?type=internal" as any);
    } else {
      // Normal user goes to standard support
      router.push("/(app)/support" as any);
    }
  };

  const handleSignOut = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await signOut();
    router.replace("/(auth)/sign-in");
  };

  const confirmAction = (title: string, message: string, onConfirm: () => void) => {
    alert(title, message, [
      { text: "Cancel", style: "cancel" },
      { text: "Confirm", style: "destructive", onPress: onConfirm },
    ]);
  };

  const handleResetAccount = () => {
    confirmAction(
      "Reset Account",
      "This will delete ALL your data (pantry, lists, receipts, etc.) and restart onboarding. Your login stays intact.",
      async () => {
        setIsResetting(true);
        try {
          await resetMyAccount();
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          router.replace("/onboarding/welcome" as any);
        } catch (e) {
          console.error("Reset failed:", e);
          setIsResetting(false);
        }
      }
    );
  };

  const handleResetHints = () => {
    confirmAction(
      "Reset All Hints",
      "This will show all tutorial hints again as you use the app.",
      async () => {
        resetAllHints();
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    );
  };

  const handleDeleteAccount = () => {
    confirmAction(
      "Delete Account",
      "This permanently deletes EVERYTHING — Convex data AND your Clerk login. You&apos;ll need to sign up with a fresh email. Are you sure?",
      async () => {
        setIsDeleting(true);
        try {
          // 1. Cancel all Stripe subscriptions (Crucial for End-to-End)
          try {
            await cancelAllSubs();
          } catch (stripeErr) {
            console.error("Stripe cancellation failed (ignoring for account deletion):", stripeErr);
          }

          // 2. Delete all Convex data + user doc
          await deleteMyAccount();

          // 3. Delete Clerk account (removes email from auth system)
          if (user) {
            try {
              await user.delete();
            } catch (clerkErr) {
              console.error("Clerk account deletion failed:", clerkErr);
              // Retry once
              try {
                await user.delete();
              } catch (retryErr) {
                console.error("Clerk deletion retry failed:", retryErr);
                alert(
                  "Partial Deletion",
                  "Your app data was deleted but the login account could not be removed. Please contact support or delete it manually from account settings."
                );
              }
            }
          }

          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          try { await signOut(); } catch {}
          router.replace("/(auth)/sign-in");
        } catch (e) {
          console.error("Delete failed:", e);
          try { await signOut(); } catch {}
          router.replace("/(auth)/sign-in");
          setIsDeleting(false);
        }
      }
    );
  };

  // Loading state with skeletons
  if (allLists === undefined || pantryItems === undefined) {
    return (
      <GlassScreen>
        <SimpleHeader title="Profile" accentColor={colors.semantic.profile} subtitle="Loading..." />
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.skeletonContent}>
          <View style={styles.section}>
            <SkeletonCard />
          </View>
          <View style={styles.section}>
            <SkeletonCard />
          </View>
          <View style={styles.section}>
            <SkeletonCard />
          </View>
        </ScrollView>
      </GlassScreen>
    );
  }

  // Improved name resolution
  const userDisplayName = 
    convexUser?.name || 
    user?.firstName || 
    user?.username || 
    user?.primaryEmailAddress?.emailAddress?.split("@")[0] || 
    "Shopper";

  // Calculate stats
  const completedLists = allLists.filter((list) => list.status === "completed");
  const outOfStockItems = pantryItems.filter((item) => item.stockLevel === "out").length;
  const lowStockItems = pantryItems.filter((item) => item.stockLevel === "low").length;

  return (
    <GlassScreen>
      <View ref={headerRef}>
        <SimpleHeader
          title={userDisplayName ? `Hey, ${userDisplayName}` : "Profile"}
          accentColor={colors.semantic.profile}
          subtitle="Your insights & settings"
        />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View key={animationKey}>
        
        {/* Admin Control Center - TOP PRIORITY FOR ADMINS */}
        {isAdmin && (
          <View style={{ gap: spacing.lg, marginBottom: spacing.lg }}>
            {/* 1. Platform Vitals (GMV + Health + AI) */}
            <AnimatedSection animation="fadeInDown" duration={400} delay={0}>
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Global Platform Overview (Admin)</Text>
                <GlassCard variant="bordered" accentColor={colors.accent.primary} style={styles.adminHeroCard}>
                  <View style={styles.gmvRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.adminLabel}>Global GMV</Text>
                      <Text style={styles.gmvValueHero}>
                        £{((gmvFilter === "week" ? adminAnalytics?.gmvThisWeek : 
                           gmvFilter === "month" ? adminAnalytics?.gmvThisMonth : 
                           gmvFilter === "year" ? adminAnalytics?.gmvThisYear : 
                           adminAnalytics?.totalGMV) ?? 0).toLocaleString()}
                      </Text>
                    </View>
                    <GlassSegmentedControl
                      tabs={[
                        { label: "Wk" },
                        { label: "Mth" },
                        { label: "Yr" },
                        { label: "All" },
                      ]}
                      activeIndex={
                        gmvFilter === "week" ? 0 : 
                        gmvFilter === "month" ? 1 : 
                        gmvFilter === "year" ? 2 : 3
                      }
                      onTabChange={(index) => {
                        const periods = ["week", "month", "year", "lifetime"] as const;
                        setGmvFilter(periods[index]);
                      }}
                      style={{ width: 160 }}
                      activeColor={colors.semantic.success}
                    />
                  </View>

                  <View style={styles.healthDivider} />

                  <View style={styles.healthRow}>
                    <View style={styles.healthInfo}>
                      <View style={[styles.healthDot, { backgroundColor: systemHealth?.status === "healthy" ? colors.semantic.success : colors.semantic.warning }]} />
                      <Text style={styles.healthText}>
                        System: {systemHealth?.status?.toUpperCase() || "LOADING..."}
                      </Text>
                    </View>
                    <Text style={styles.healthSubtext}>
                      {platformAIUsage?.activeProvider || "Gemini 2.0"}
                    </Text>
                  </View>

                  <View style={styles.healthDivider} />

                  <PlatformAIUsageMonitor data={platformAIUsage} />

                  {platformAIUsage?.alert && (
                    <View style={[styles.adminAlertBox, { backgroundColor: platformAIUsage.alert.level === "critical" ? `${colors.semantic.danger}15` : `${colors.semantic.warning}15`, borderColor: platformAIUsage.alert.level === "critical" ? colors.semantic.danger : colors.semantic.warning }]}>
                      <MaterialCommunityIcons 
                        name={platformAIUsage.alert.level === "critical" ? "alert-octagon" : "alert-circle"} 
                        size={16} 
                        color={platformAIUsage.alert.level === "critical" ? colors.semantic.danger : colors.semantic.warning} 
                      />
                      <Text style={[styles.adminAlertText, { color: platformAIUsage.alert.level === "critical" ? colors.semantic.danger : colors.semantic.warning }]}>
                        {platformAIUsage.alert.message}
                      </Text>
                    </View>
                  )}
                </GlassCard>
              </View>
            </AnimatedSection>

            {/* 2. Primary Launchpad */}
            <AnimatedSection animation="fadeInDown" duration={400} delay={100}>
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Launchpad</Text>
                <GlassButton
                  variant="primary"
                  size="lg"
                  icon="shield-crown"
                  onPress={() => { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); router.push("/(app)/admin" as any); }}
                  style={styles.mainAdminBtn}
                >
                  Enter Admin Dashboard
                </GlassButton>
                
                <View style={styles.quickActionRow}>
                  <Pressable 
                    onPress={() => router.push("/(app)/admin?tab=users" as any)}
                    style={({ pressed }) => [styles.quickActionBtn, pressed && { opacity: 0.7 }]}
                  >
                    <MaterialCommunityIcons name="account-search" size={24} color={colors.accent.primary} />
                    <Text style={styles.quickActionText}>Search Users</Text>
                  </Pressable>
                  
                  <Pressable 
                    onPress={() => router.push("/(app)/admin?tab=receipts" as any)}
                    style={({ pressed }) => [styles.quickActionBtn, pressed && { opacity: 0.7 }]}
                  >
                    <MaterialCommunityIcons name="receipt" size={24} color={colors.accent.primary} />
                    <Text style={styles.quickActionText}>Review Data</Text>
                  </Pressable>
                </View>
              </View>
            </AnimatedSection>
          </View>
        )}

        {/* User Account Section */}
        <AnimatedSection animation="fadeInDown" duration={400} delay={isAdmin ? 200 : 0}>
          <View style={styles.section} ref={dietRef}>
            <Text style={styles.sectionTitle}>Account</Text>
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
                    {user?.primaryEmailAddress?.emailAddress || "Not set"}
                  </Text>
                </View>
              </View>
            </GlassCard>

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

        {/* Settings Section */}
        <AnimatedSection animation="fadeInDown" duration={400} delay={isAdmin ? 250 : 50}>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Settings</Text>
            <GlassCard variant="standard" style={{ padding: spacing.md }}>
              <View style={styles.settingRow}>
                <View style={styles.settingInfo}>
                  <Text style={styles.settingTitle}>Enable Notifications</Text>
                  <Text style={styles.settingSubtitle}>Master switch for all alerts</Text>
                </View>
                <GlassCheckbox 
                  checked={convexUser?.preferences?.notifications ?? true}
                  onCheckedChange={(val) => updateNotificationSettings({ notifications: val })}
                />
              </View>
              
              {convexUser?.preferences?.notifications !== false && (
                <>
                  <View style={styles.settingDivider} />
                  <View style={styles.settingRow}>
                    <View style={styles.settingInfo}>
                      <Text style={styles.settingTitle}>Stock Reminders</Text>
                      <Text style={styles.settingSubtitle}>Wed & Fri pantry checks</Text>
                    </View>
                    <GlassCheckbox 
                      checked={convexUser?.preferences?.notificationSettings?.stockReminders ?? true}
                      onCheckedChange={(val) => updateNotificationSettings({ stockReminders: val })}
                    />
                  </View>
                  
                  <View style={styles.settingDivider} />
                  <View style={styles.settingRow}>
                    <View style={styles.settingInfo}>
                      <Text style={styles.settingTitle}>Nurture Messages</Text>
                      <Text style={styles.settingSubtitle}>Tips to get the most out of Oja</Text>
                    </View>
                    <GlassCheckbox 
                      checked={convexUser?.preferences?.notificationSettings?.nurtureMessages ?? true}
                      onCheckedChange={(val) => updateNotificationSettings({ nurtureMessages: val })}
                    />
                  </View>

                  <View style={styles.settingDivider} />
                  <View style={styles.settingRow}>
                    <View style={styles.settingInfo}>
                      <Text style={styles.settingTitle}>Quiet Hours (22:00 - 08:00)</Text>
                      <Text style={styles.settingSubtitle}>Pause alerts during the night</Text>
                    </View>
                    <GlassCheckbox 
                      checked={convexUser?.preferences?.notificationSettings?.quietHours?.enabled ?? false}
                      onCheckedChange={(val) => updateNotificationSettings({ 
                        quietHours: { 
                          enabled: val, 
                          start: "22:00", 
                          end: "08:00" 
                        } 
                      })}
                    />
                  </View>
                  <View style={styles.settingDivider} />
                  <View style={styles.settingRow} ref={hintsRef}>
                    <View style={styles.settingInfo}>
                      <Text style={styles.settingTitle}>Tutorial Hints</Text>
                      <Text style={styles.settingSubtitle}>Helpful tips as you use Oja</Text>
                    </View>
                    <GlassCheckbox 
                      checked={convexUser?.showTutorialHints ?? true}
                      onCheckedChange={(val) => {
                        setHintsEnabled(val);
                        updateUser({ showTutorialHints: val });
                      }}
                    />
                  </View>

                  <View style={styles.settingDivider} />
                  <View style={styles.settingRow}>
                    <View style={styles.settingInfo}>
                      <Text style={styles.settingTitle}>Re-show All Hints</Text>
                      <Text style={styles.settingSubtitle}>Reset progress & see tips again</Text>
                    </View>
                    <GlassButton
                      variant="secondary"
                      size="sm"
                      onPress={handleResetHints}
                    >
                      Reset
                    </GlassButton>
                  </View>
                </>
              )}
            </GlassCard>
          </View>
        </AnimatedSection>

        {/* New user milestone path — hide once all steps are done OR if admin */}
        {(() => {
          if (convexUser?.isAdmin) return null;
          const milestones = [
            { icon: "package-variant" as const, text: "Add items to your stock", done: pantryItems.length > 0 },
            { icon: "clipboard-list-outline" as const, text: "Create your first list", done: allLists.length > 0 },
            { icon: "camera" as const, text: "Scan a receipt", done: (receipts?.filter((r) => r.processingStatus === "completed").length ?? 0) > 0 },
            { icon: "trophy-outline" as const, text: "Earn your first points", done: (pointsBalance?.totalPoints ?? 0) > 0 },
          ];
          const allDone = milestones.every((m) => m.done);
          if (allDone) return null;
          return (
            <AnimatedSection animation="fadeInDown" duration={400} delay={50}>
              <View style={styles.section}>
                <GlassCard variant="standard" style={styles.milestonePath}>
                  <Text style={styles.milestoneTitle}>Your journey starts here</Text>
                  <Text style={styles.milestoneSubtitle}>
                    Most shoppers save £30+ in their first month. Here&apos;s how to get there:
                  </Text>
                  <View style={styles.milestoneSteps}>
                    {milestones.map((step) => (
                      <View key={step.text} style={styles.milestoneStep}>
                        <MaterialCommunityIcons
                          name={step.done ? "check-circle" : step.icon}
                          size={18}
                          color={step.done ? colors.accent.primary : colors.text.tertiary}
                        />
                        <Text style={[styles.milestoneStepText, step.done && styles.milestoneStepDone]}>
                          {step.text}
                        </Text>
                      </View>
                    ))}
                  </View>
                </GlassCard>
              </View>
            </AnimatedSection>
          );
        })()}

        {/* Quick Stats — single condensed row */}
        <AnimatedSection animation="fadeInDown" duration={400} delay={100}>
          <GlassCard variant="standard" style={styles.quickStatsCard}>
          <View style={styles.quickStatsRow}>
            <View style={styles.quickStat}>
              <Text style={styles.quickStatValue}>{completedLists.length}</Text>
              <Text style={styles.quickStatLabel}>trips</Text>
            </View>
            <View style={styles.quickStatDivider} />
            <View style={styles.quickStat}>
              <Text style={styles.quickStatValue}>{pantryItems.length}</Text>
              <Text style={styles.quickStatLabel}>items</Text>
            </View>
            <View style={styles.quickStatDivider} />
            <View style={styles.quickStat}>
              <Text style={styles.quickStatValue}>{receipts?.filter((r) => r.processingStatus === "completed").length ?? 0}</Text>
              <Text style={styles.quickStatLabel}>receipts</Text>
            </View>
            <View style={styles.quickStatDivider} />
            <View style={styles.quickStat}>
              <Text style={[styles.quickStatValue, { color: colors.accent.primary }]}>
                {pointsBalance?.tierProgress ?? 0}
              </Text>
              <Text style={styles.quickStatLabel}>scans</Text>
            </View>
          </View>
        </GlassCard>
        </AnimatedSection>

        {/* Navigation Links */}
        <AnimatedSection animation="fadeInDown" duration={400} delay={150}>
          <View style={styles.section}>
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push("/(app)/points-history" as any);
            }}
          >
            <GlassCard variant="standard" style={styles.navCard}>
              <View style={styles.navRow}>
                <View style={[styles.navIcon, { backgroundColor: `${colors.accent.primary}20` }]}>
                  <MaterialCommunityIcons name="star-circle-outline" size={20} color={colors.accent.primary} />
                </View>
                <View style={styles.navInfo}>
                  <Text style={styles.navTitle}>Points History</Text>
                  <Text style={styles.navSubtitle}>Detailed log of your rewards</Text>
                </View>
                <MaterialCommunityIcons name="chevron-right" size={22} color={colors.text.tertiary} />
              </View>
            </GlassCard>
          </Pressable>

          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push("/(app)/insights" as any);
            }}
          >
            <GlassCard variant="standard" style={styles.navCard}>
              <View style={styles.navRow}>
                <View style={[styles.navIcon, { backgroundColor: `${colors.accent.primary}20` }]}>
                  <MaterialCommunityIcons name="chart-line" size={20} color={colors.accent.primary} />
                </View>
                <View style={styles.navInfo}>
                  <Text style={styles.navTitle}>Insights</Text>
                  <Text style={styles.navSubtitle}>Trends, savings & achievements</Text>
                </View>
                <MaterialCommunityIcons name="chevron-right" size={22} color={colors.text.tertiary} />
              </View>
            </GlassCard>
          </Pressable>

          <Pressable
            onPress={handleSupportPress}
          >
            <GlassCard variant="standard" style={styles.navCard}>
              <View style={styles.navRow}>
                <View style={[
                  styles.navIcon, 
                  { backgroundColor: myAdminPerms?.role === "super_admin" ? `${colors.semantic.danger}20` : `${colors.accent.primary}20` }
                ]}>
                  <MaterialCommunityIcons 
                    name={
                      myAdminPerms?.role === "super_admin" 
                        ? "pulse" 
                        : (convexUser?.isAdmin || myAdminPerms) 
                          ? "shield-account-outline" 
                          : "help-circle-outline"
                    } 
                    size={20} 
                    color={myAdminPerms?.role === "super_admin" ? colors.semantic.danger : colors.accent.primary} 
                  />
                </View>
                <View style={styles.navInfo}>
                  <Text style={styles.navTitle}>
                    {myAdminPerms?.role === "super_admin" 
                      ? "System Status" 
                      : (convexUser?.isAdmin || myAdminPerms) 
                        ? "Internal Support" 
                        : "Help & Support"}
                  </Text>
                  <Text style={styles.navSubtitle}>
                    {myAdminPerms?.role === "super_admin" 
                      ? "Monitoring & Diagnostics" 
                      : (convexUser?.isAdmin || myAdminPerms) 
                        ? "Support for admins & policy" 
                        : "Contact support & view my tickets"}
                  </Text>
                </View>
                <MaterialCommunityIcons name="chevron-right" size={22} color={colors.text.tertiary} />
              </View>
            </GlassCard>
          </Pressable>

          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push("/(app)/ai-usage" as any);
            }}
          >
            <GlassCard variant="standard" style={styles.navCard}>
              <View style={styles.navRow}>
                <View style={[styles.navIcon, { backgroundColor: `${colors.accent.secondary}20` }]}>
                  <MaterialCommunityIcons name="robot" size={20} color={colors.accent.secondary} />
                </View>
                <View style={styles.navInfo}>
                  <Text style={styles.navTitle}>AI Usage</Text>
                  <Text style={styles.navSubtitle}>
                    Voice: {aiUsage?.voice?.usage ?? 0}/{aiUsage?.voice?.limit ?? 200} this month
                  </Text>
                </View>
                <MaterialCommunityIcons name="chevron-right" size={22} color={colors.text.tertiary} />
              </View>
            </GlassCard>
          </Pressable>

          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push("/(app)/subscription" as any);
            }}
          >
            <GlassCard variant="standard" style={styles.navCard}>
              <View style={styles.navRow}>
                <View style={[styles.navIcon, { backgroundColor: `${colors.accent.secondary}20` }]}>
                  <MaterialCommunityIcons
                    name={(subscription as any)?.isActive ? "crown" : "crown-outline"}
                    size={20}
                    color={subscription?.status === "expired" ? colors.text.tertiary : colors.accent.secondary}
                  />
                </View>
                <View style={styles.navInfo}>
                  <Text style={styles.navTitle}>
                    {subscription?.status === "trial"
                      ? "Premium Trial"
                      : subscription?.status === "expired"
                        ? "Free Plan"
                        : (subscription as any)?.isActive
                          ? "Premium"
                          : "Free Plan"}
                  </Text>
                  <Text style={styles.navSubtitle}>
                    {subscription?.status === "trial" && (subscription as any)?.trialEndsAt
                      ? `${Math.max(0, Math.ceil(((subscription as any).trialEndsAt - Date.now()) / (1000 * 60 * 60 * 24)))} days left · `
                      : subscription?.status === "expired"
                        ? "Trial ended · "
                        : ""}
                    {(pointsBalance?.tier || "bronze").charAt(0).toUpperCase() + (pointsBalance?.tier || "bronze").slice(1)} tier · {pointsBalance?.tierProgress ?? 0} scans
                  </Text>
                </View>
                <MaterialCommunityIcons name="chevron-right" size={22} color={colors.text.tertiary} />
              </View>
            </GlassCard>
          </Pressable>

          {/* Admin Dashboard - Only visible to admins */}
          {convexUser?.isAdmin && (
            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push("/(app)/admin" as any);
              }}
            >
              <GlassCard variant="standard" style={styles.navCard}>
                <View style={styles.navRow}>
                  <View style={[styles.navIcon, { backgroundColor: `${colors.semantic.danger}20` }]}>
                    <MaterialCommunityIcons name="shield-crown" size={20} color={colors.semantic.danger} />
                  </View>
                  <View style={styles.navInfo}>
                    <Text style={styles.navTitle}>Admin Dashboard</Text>
                    <Text style={styles.navSubtitle}>Platform management</Text>
                  </View>
                  <MaterialCommunityIcons name="chevron-right" size={22} color={colors.text.tertiary} />
                </View>
              </GlassCard>
            </Pressable>
          )}

          {outOfStockItems > 0 && (
            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.navigate("/(app)/(tabs)/" as any);
              }}
            >
              <GlassCard variant="standard" style={styles.navCard}>
                <View style={styles.navRow}>
                  <View style={[styles.navIcon, { backgroundColor: `${colors.semantic.danger}20` }]}>
                    <MaterialCommunityIcons name="alert-circle" size={20} color={colors.semantic.danger} />
                  </View>
                  <View style={styles.navInfo}>
                    <Text style={styles.navTitle}>Stock Alerts</Text>
                    <Text style={styles.navSubtitle}>
                      {outOfStockItems} out{lowStockItems > 0 ? ` · ${lowStockItems} low` : ""}
                    </Text>
                  </View>
                  <MaterialCommunityIcons name="chevron-right" size={22} color={colors.text.tertiary} />
                </View>
              </GlassCard>
            </Pressable>
          )}
        </View>
        </AnimatedSection>

        {/* Sign Out */}
        <AnimatedSection animation="fadeInDown" duration={400} delay={200}>
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
        </AnimatedSection>

        {/* Danger Zone - For all users (Legal Requirement) */}
        <AnimatedSection animation="fadeInDown" duration={400} delay={250}>
          <View style={styles.devToolsSection}>
            <Text style={styles.devToolsLabel}>Danger Zone</Text>
            <GlassButton
              variant="danger"
              size="md"
              icon="delete-forever"
              onPress={handleDeleteAccount}
              disabled={isDeleting}
            >
              {isDeleting ? "Deleting..." : "Delete Account"}
            </GlassButton>
            
            {isAdmin && (
              <>
                <View style={{ height: spacing.sm, marginTop: spacing.md, borderTopWidth: 1, borderTopColor: colors.glass.border, paddingTop: spacing.md }} />
                <Text style={styles.devToolsLabel}>Admin Dev Tools</Text>
                <GlassButton
                  variant="secondary"
                  size="md"
                  icon="refresh"
                  onPress={handleResetAccount}
                  disabled={isResetting}
                >
                  {isResetting ? "Resetting..." : "Reset Account (re-onboard)"}
                </GlassButton>
              </>
            )}
          </View>
        </AnimatedSection>
        </View>

        {/* Bottom spacing */}
        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* Tutorial Hints */}
      <HintOverlay
        visible={introHint.shouldShow}
        targetRef={headerRef}
        title="Control Center"
        content="This is your control center. Manage your account, referrals, and app settings here."
        onDismiss={introHint.dismiss}
        position="below"
      />

      <HintOverlay
        visible={dietHint.shouldShow}
        targetRef={dietRef}
        title="Personalise Oja"
        content="Set your dietary preferences in Account settings to get better health swaps tailored to you."
        onDismiss={dietHint.dismiss}
        position="below"
      />

      <HintOverlay
        visible={hintsHint.shouldShow}
        targetRef={hintsRef}
        title="Hint Settings"
        content="You can toggle these hints off anytime if you're already an Oja pro!"
        onDismiss={hintsHint.dismiss}
        position="above"
      />
    </GlassScreen>
  );
}

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
    borderRadius: borderRadius.sm,
    backgroundColor: colors.glass.backgroundStrong,
    marginBottom: spacing.sm,
    marginLeft: spacing.xs,
  },
  bottomSpacer: {
    height: 140,
  },

  // Section
  section: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    ...typography.labelLarge,
    color: colors.text.secondary,
    marginBottom: spacing.sm,
    marginLeft: spacing.xs,
  },

  // Admin Control Center
  adminHeroCard: {
    padding: spacing.md,
  },
  gmvRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  gmvValueHero: {
    ...typography.displaySmall,
    color: colors.semantic.success,
    fontWeight: "800",
    fontSize: 28,
  },
  adminLabel: {
    ...typography.labelSmall,
    color: colors.text.tertiary,
    textTransform: "uppercase",
    marginBottom: 4,
  },
  healthDivider: {
    height: 1,
    backgroundColor: colors.glass.border,
    marginVertical: spacing.md,
  },
  healthRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  healthInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  healthDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  healthText: {
    ...typography.labelSmall,
    color: colors.text.primary,
    fontWeight: "700",
  },
  healthSubtext: {
    ...typography.labelSmall,
    color: colors.text.tertiary,
  },
  mainAdminBtn: {
    marginBottom: spacing.md,
  },
  aiUsageRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: spacing.sm,
  },
  aiUsageItem: {
    flex: 1,
  },
  aiUsageValue: {
    ...typography.labelSmall,
    color: colors.text.primary,
    fontWeight: "700",
    fontSize: 14,
  },
  adminAlertBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    marginTop: spacing.md,
  },
  adminAlertText: {
    ...typography.labelSmall,
    flex: 1,
    fontWeight: "700",
  },
  quickActionRow: {
    flexDirection: "row",
    gap: spacing.md,
  },
  quickActionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    backgroundColor: `${colors.glass.border}20`,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.md,
    borderWidth: 1,
    borderColor: colors.glass.border,
  },
  quickActionText: {
    ...typography.labelSmall,
    color: colors.text.primary,
    fontWeight: "700",
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

  // Milestone path (new user)
  milestonePath: {
    marginBottom: spacing.md,
  },
  milestoneTitle: {
    ...typography.headlineSmall,
    color: colors.text.primary,
    marginBottom: 4,
  },
  milestoneSubtitle: {
    ...typography.bodySmall,
    color: colors.text.secondary,
    marginBottom: spacing.md,
  },
  milestoneSteps: {
    gap: spacing.sm,
  },
  milestoneStep: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  milestoneStepText: {
    ...typography.bodyMedium,
    color: colors.text.tertiary,
  },
  milestoneStepDone: {
    color: colors.accent.primary,
    textDecorationLine: "line-through",
  },

  // Quick Stats
  quickStatsCard: {
    marginBottom: spacing.lg,
  },
  quickStatsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
  },
  quickStat: {
    alignItems: "center",
    flex: 1,
  },
  quickStatValue: {
    ...typography.headlineMedium,
    color: colors.text.primary,
    fontWeight: "700",
  },
  quickStatLabel: {
    ...typography.labelSmall,
    color: colors.text.tertiary,
    marginTop: 2,
  },
  quickStatDivider: {
    width: 1,
    height: 28,
    backgroundColor: colors.glass.border,
  },

  // Navigation Cards
  navCard: {
    marginBottom: spacing.xs,
  },
  navRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  navIcon: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.full,
    justifyContent: "center",
    alignItems: "center",
  },
  navInfo: {
    flex: 1,
  },
  navTitle: {
    ...typography.bodyMedium,
    color: colors.text.primary,
    fontWeight: "600",
    marginBottom: 2,
  },
  navSubtitle: {
    ...typography.bodySmall,
    color: colors.text.tertiary,
  },

  // Sign Out
  signOutSection: {
    marginTop: spacing.lg,
  },

  // Dev Tools
  devToolsSection: {
    marginTop: spacing.xl,
    paddingTop: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.glass.border,
  },
  devToolsLabel: {
    ...typography.labelSmall,
    color: colors.text.tertiary,
    marginBottom: spacing.sm,
    textAlign: "center",
  },

  // Referrals
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

  // Settings
  settingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  settingInfo: {
    flex: 1,
  },
  settingTitle: {
    ...typography.bodyMedium,
    color: colors.text.primary,
    fontWeight: "600",
  },
  settingSubtitle: {
    ...typography.bodySmall,
    color: colors.text.tertiary,
    marginTop: 2,
  },
  settingDivider: {
    height: 1,
    backgroundColor: colors.glass.border,
    marginVertical: spacing.md,
  },
});
