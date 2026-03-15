import { useEffect, useState, useCallback, useRef } from "react";
import { View, Text, StyleSheet, ScrollView, Linking } from "react-native";
import { useAuth, useUser } from "@clerk/clerk-expo";
import { useRouter } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Doc } from "@/convex/_generated/dataModel";
import * as Haptics from "expo-haptics";
import { setHintsEnabled, resetAllHints } from "@/lib/storage/hintStorage";
import {
  GlassScreen, GlassCard, GlassButton, GlassModal, GlassInput, SimpleHeader,
  SkeletonCard, AnimatedSection, colors, typography, spacing, useGlassAlert, AlertButton,
} from "@/components/ui/glass";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { isGenericName } from "@/lib/names";
import { useIsSwitchingUsers } from "@/hooks/useIsSwitchingUsers";
import { useHint } from "@/hooks/useHint";
import { HintOverlay } from "@/components/tutorial/HintOverlay";
import { hasViewedHint as hasViewedHintLocal } from "@/lib/storage/hintStorage";
import { AccountSection } from "@/components/profile/AccountSection";
import { AdminControlCenter } from "@/components/profile/AdminControlCenter";
import { MilestonePath } from "@/components/profile/MilestonePath";
import { NavigationLinks } from "@/components/profile/NavigationLinks";
import { SettingsSection } from "@/components/profile/SettingsSection";

export default function ProfileScreen() {
  const { signOut } = useAuth();
  const { user } = useUser();
  const router = useRouter();
  const { alert } = useGlassAlert();
  const { user: convexUser } = useCurrentUser();
  const isSwitchingUsers = useIsSwitchingUsers();

  const headerRef = useRef(null);
  const dietRef = useRef(null);
  const hintsRef = useRef(null);

  const introHint = useHint("profile_intro", "delayed");
  const dietHint = useHint("profile_diet", "manual");
  const hintsHint = useHint("profile_hints", "manual");

  useEffect(() => {
    if (introHint.shouldShow === false && !hasViewedHintLocal("profile_diet")) dietHint.showHint();
  }, [introHint.shouldShow]);

  useEffect(() => {
    if (dietHint.shouldShow === false && !hasViewedHintLocal("profile_hints") && hasViewedHintLocal("profile_diet")) hintsHint.showHint();
  }, [dietHint.shouldShow]);

  const cancelAllSubs = useAction(api.stripe.cancelAllUserSubscriptions);
  const resetMyAccount = useMutation(api.users.resetMyAccount);
  const deleteMyAccount = useMutation(api.users.deleteMyAccount);
  const updateNotificationSettings = useMutation(api.users.updateNotificationSettings);
  const updateUser = useMutation(api.users.update);
  const generateReferralCode = useMutation(api.referrals.generateReferralCode);

  const skipArg = !isSwitchingUsers ? {} : "skip";
  const allLists = useQuery(api.shoppingLists.getByUser, skipArg);
  const pantryItems = useQuery(api.pantryItems.getByUser, skipArg);
  const pointsBalance = useQuery(api.points.getPointsBalance, skipArg);
  const subscription = useQuery(api.subscriptions.getCurrentSubscription, skipArg);
  const aiUsage = useQuery(api.aiUsage.getUsageSummary, skipArg);
  const receipts = useQuery(api.receipts.getByUser, skipArg);
  const referralInfo = useQuery(api.referrals.getMyReferralInfo, skipArg);

  const [isResetting, setIsResetting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [animationKey, setAnimationKey] = useState(0);
  const [gmvFilter, setGmvFilter] = useState<"week" | "month" | "year" | "lifetime">("lifetime");
  const [showEditName, setShowEditName] = useState(false);
  const [editNameValue, setEditNameValue] = useState("");
  const [savingName, setSavingName] = useState(false);

  const myAdminPerms = useQuery(api.admin.getMyPermissions, {});
  const isAdmin = !!convexUser?.isAdmin || !!myAdminPerms;
  const adminSkipArg = isAdmin ? {} : "skip";
  const adminAnalytics = useQuery(api.admin.getAnalytics, adminSkipArg);
  const systemHealth = useQuery(api.admin.getSystemHealth, adminSkipArg);
  const platformAIUsage = useQuery(api.admin.getPlatformAIUsage, adminSkipArg);

  useFocusEffect(useCallback(() => { setAnimationKey((prev) => prev + 1); }, []));

  useEffect(() => {
    if (convexUser?._id && referralInfo === null) generateReferralCode({ userId: convexUser._id });
  }, [convexUser?._id, referralInfo, generateReferralCode]);

  const handleShareReferral = async () => {
    if (!referralInfo?.code) return;
    try {
      const message = `Join me on Oja and get 500 bonus points! Use my code ${referralInfo.code} to save on your groceries. https://oja.app/download`;
      await Linking.openURL(`sms:?&body=${encodeURIComponent(message)}`);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e) { console.error("Sharing failed:", e); }
  };

  const handleSupportPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (myAdminPerms?.role === "super_admin") router.push("/(app)/admin?tab=monitoring");
    else if (convexUser?.isAdmin || myAdminPerms) router.push("/(app)/support?type=internal");
    else router.push("/(app)/support");
  };

  const handleSignOut = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await signOut();
    router.replace("/(auth)/sign-in");
  };

  const confirmAction = (title: string, message: string, onConfirm: () => void | Promise<void>) => {
    const buttons: AlertButton[] = [
      { text: "Cancel", style: "cancel" },
      { text: "Confirm", style: "destructive", onPress: onConfirm },
    ];
    alert(title, message, buttons);
  };

  const handleResetAccount = () => {
    const name = convexUser?.name || user?.firstName;
    confirmAction("Reset Account", `${name ? `${name}, this` : "This"} will delete ALL your data (pantry, lists, receipts, etc.) and restart onboarding. Your login stays intact.`, async () => {
      setIsResetting(true);
      try {
        await resetMyAccount();
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        router.replace("/onboarding/welcome");
      } catch (e) { console.error("Reset failed:", e); setIsResetting(false); }
    });
  };

  const handleResetHints = () => {
    confirmAction("Reset All Hints", "This will show all tutorial hints again as you use the app.", async () => {
      resetAllHints();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    });
  };

  const handleEditName = () => {
    setEditNameValue(convexUser?.name || "");
    setShowEditName(true);
  };

  const handleSaveName = async () => {
    const trimmed = editNameValue.trim();
    if (trimmed.length < 2 || /^\d+$/.test(trimmed)) return;
    setSavingName(true);
    try {
      await updateUser({ name: trimmed });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setShowEditName(false);
    } catch {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setSavingName(false);
    }
  };

  const handleDeleteAccount = () => {
    confirmAction("Delete Account", "This permanently deletes EVERYTHING \u2014 Convex data AND your Clerk login. You'll need to sign up with a fresh email. Are you sure?", async () => {
      setIsDeleting(true);
      try {
        try { await cancelAllSubs(); } catch (stripeErr) { console.error("Stripe cancellation failed:", stripeErr); }
        await deleteMyAccount();
        if (user) {
          try { await user.delete(); } catch (clerkErr) {
            console.error("Clerk account deletion failed:", clerkErr);
            try { await user.delete(); } catch (retryErr) {
              console.error("Clerk deletion retry failed:", retryErr);
              alert("Partial Deletion", "Your app data was deleted but the login account could not be removed. Please contact support.");
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
    });
  };

  if (allLists === undefined || pantryItems === undefined) {
    return (
      <GlassScreen>
        <SimpleHeader title="Profile" accentColor={colors.semantic.profile} subtitle="Loading..." />
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          {[1, 2, 3].map((k) => <View key={k} style={styles.section}><SkeletonCard /></View>)}
        </ScrollView>
      </GlassScreen>
    );
  }

  const convexName = convexUser?.name && !isGenericName(convexUser.name) ? convexUser.name : undefined;
  const clerkUsername = user?.username && !isGenericName(user.username) ? user.username : undefined;
  const userDisplayName = convexName || user?.firstName || clerkUsername || user?.primaryEmailAddress?.emailAddress?.split("@")[0] || "Shopper";
  const completedLists = allLists.filter((list: Doc<"shoppingLists">) => list.status === "completed");
  const outOfStockItems = pantryItems.filter((item: Doc<"pantryItems">) => item.stockLevel === "out").length;
  const lowStockItems = pantryItems.filter((item: Doc<"pantryItems">) => item.stockLevel === "low").length;
  const completedReceipts = receipts?.filter((r: Doc<"receipts">) => r.processingStatus === "completed").length ?? 0;

  const quickStats = [
    { value: completedLists.length, label: "trips" },
    { value: pantryItems.length, label: "items" },
    { value: completedReceipts, label: "receipts" },
    { value: pointsBalance?.tierProgress ?? 0, label: "scans", accent: true },
  ];

  return (
    <GlassScreen>
      <View ref={headerRef}>
        <SimpleHeader title={userDisplayName ? `Hey, ${userDisplayName}` : "Profile"} accentColor={colors.semantic.profile} subtitle={userDisplayName ? `${userDisplayName}'s insights & settings` : "Your insights & settings"} />
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View key={animationKey}>
        {isAdmin && (
          <AdminControlCenter adminAnalytics={adminAnalytics} systemHealth={systemHealth} platformAIUsage={platformAIUsage} gmvFilter={gmvFilter} setGmvFilter={setGmvFilter} router={router} />
        )}

        <AccountSection userDisplayName={userDisplayName} userEmail={user?.primaryEmailAddress?.emailAddress} referralInfo={referralInfo} handleShareReferral={handleShareReferral} isAdmin={isAdmin} dietRef={dietRef} animationDelay={isAdmin ? 200 : 0} onEditName={handleEditName} />

        <SettingsSection convexUser={convexUser} updateNotificationSettings={updateNotificationSettings} updateUser={updateUser} setHintsEnabled={setHintsEnabled} handleResetHints={handleResetHints} hintsRef={hintsRef} animationDelay={isAdmin ? 250 : 50} />

        <MilestonePath pantryItems={pantryItems} allLists={allLists} receipts={receipts} pointsBalance={pointsBalance} isAdmin={convexUser?.isAdmin} />

        <AnimatedSection animation="fadeInDown" duration={400} delay={100}>
          <GlassCard variant="standard" style={styles.quickStatsCard}>
            <View style={styles.quickStatsRow}>
              {quickStats.map((stat, i) => (
                <View key={stat.label} style={{ flexDirection: "row", alignItems: "center", flex: 1 }}>
                  {i > 0 && <View style={styles.quickStatDivider} />}
                  <View style={styles.quickStat}>
                    <Text style={[styles.quickStatValue, stat.accent && { color: colors.accent.primary }]}>{stat.value}</Text>
                    <Text style={styles.quickStatLabel}>{stat.label}</Text>
                  </View>
                </View>
              ))}
            </View>
          </GlassCard>
        </AnimatedSection>

        <NavigationLinks router={router} convexUser={convexUser} myAdminPerms={myAdminPerms} subscription={subscription} pointsBalance={pointsBalance} aiUsage={aiUsage} outOfStockItems={outOfStockItems} lowStockItems={lowStockItems} handleSupportPress={handleSupportPress} animationDelay={150} />

        <AnimatedSection animation="fadeInDown" duration={400} delay={200}>
          <View style={styles.signOutSection}>
            <GlassButton variant="danger" size="lg" icon="logout" onPress={handleSignOut}>Sign Out</GlassButton>
          </View>
        </AnimatedSection>

        <AnimatedSection animation="fadeInDown" duration={400} delay={250}>
          <View style={styles.devToolsSection}>
            <Text style={styles.devToolsLabel}>Danger Zone</Text>
            <GlassButton variant="danger" size="md" icon="delete-forever" onPress={handleDeleteAccount} disabled={isDeleting}>
              {isDeleting ? "Deleting..." : "Delete Account"}
            </GlassButton>
            {isAdmin && (
              <>
                <View style={{ height: spacing.sm, marginTop: spacing.md, borderTopWidth: 1, borderTopColor: colors.glass.border, paddingTop: spacing.md }} />
                <Text style={styles.devToolsLabel}>Admin Dev Tools</Text>
                <GlassButton variant="secondary" size="md" icon="refresh" onPress={handleResetAccount} disabled={isResetting}>
                  {isResetting ? "Resetting..." : "Reset Account (re-onboard)"}
                </GlassButton>
              </>
            )}
          </View>
        </AnimatedSection>
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>

      <HintOverlay visible={introHint.shouldShow} targetRef={headerRef} title="Control Center" content="This is your control center. Manage your account, referrals, and app settings here." onDismiss={introHint.dismiss} position="below" />
      <HintOverlay visible={dietHint.shouldShow} targetRef={dietRef} title="Personalise Oja" content="Set your dietary preferences in Account settings to get better health swaps tailored to you." onDismiss={dietHint.dismiss} position="below" />
      <HintOverlay visible={hintsHint.shouldShow} targetRef={hintsRef} title="Hint Settings" content="You can toggle these hints off anytime if you're already an Oja pro!" onDismiss={hintsHint.dismiss} position="above" />

      {/* Edit Name Modal */}
      <GlassModal
        visible={showEditName}
        onClose={() => setShowEditName(false)}
        animationType="fade"
        position="center"
        avoidKeyboard
      >
        <View style={{ alignItems: "center", paddingVertical: spacing.md }}>
          <MaterialCommunityIcons name="account-edit-outline" size={36} color={colors.accent.primary} style={{ marginBottom: spacing.md }} />
          <Text style={{ ...typography.headlineSmall, color: colors.text.primary, marginBottom: spacing.xs }}>Edit your name</Text>
          <Text style={{ ...typography.bodyMedium, color: colors.text.secondary, textAlign: "center", marginBottom: spacing.lg }}>
            This is how Oja will greet you
          </Text>
          <GlassInput
            placeholder="First name"
            value={editNameValue}
            onChangeText={setEditNameValue}
            autoCapitalize="words"
            autoComplete="given-name"
            iconLeft="account-outline"
          />
          <View style={{ height: spacing.md }} />
          <GlassButton
            variant="primary"
            size="lg"
            onPress={handleSaveName}
            loading={savingName}
            disabled={savingName || !editNameValue.trim()}
          >
            Save
          </GlassButton>
          <GlassButton
            variant="ghost"
            size="sm"
            onPress={() => setShowEditName(false)}
            style={{ marginTop: spacing.xs }}
          >
            Cancel
          </GlassButton>
        </View>
      </GlassModal>
    </GlassScreen>
  );
}

const styles = StyleSheet.create({
  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: spacing.lg, paddingTop: spacing.md },
  bottomSpacer: { height: 140 },
  section: { marginBottom: spacing.lg },
  quickStatsCard: { marginBottom: spacing.lg },
  quickStatsRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-around" },
  quickStat: { alignItems: "center", flex: 1 },
  quickStatValue: { ...typography.headlineMedium, color: colors.text.primary, fontWeight: "700" },
  quickStatLabel: { ...typography.labelSmall, color: colors.text.tertiary, marginTop: 2 },
  quickStatDivider: { width: 1, height: 28, backgroundColor: colors.glass.border },
  signOutSection: { marginTop: spacing.lg },
  devToolsSection: { marginTop: spacing.xl, paddingTop: spacing.lg, borderTopWidth: 1, borderTopColor: colors.glass.border },
  devToolsLabel: { ...typography.labelSmall, color: colors.text.tertiary, marginBottom: spacing.sm, textAlign: "center" },
});
