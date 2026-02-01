import { View, Text, StyleSheet, ScrollView, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import * as Haptics from "expo-haptics";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import {
  GlassScreen,
  GlassCard,
  GlassButton,
  GlassHeader,
  SkeletonCard,
  colors,
  typography,
  spacing,
} from "@/components/ui/glass";

const typeIcons: Record<string, string> = {
  partner_joined: "account-check",
  approval_requested: "shield-alert-outline",
  item_approved: "check-circle",
  item_rejected: "close-circle",
  achievement_unlocked: "trophy",
  trial_started: "star",
  tier_upgrade: "arrow-up-bold",
};

const typeColors: Record<string, string> = {
  partner_joined: colors.accent.primary,
  approval_requested: colors.semantic.warning,
  item_approved: colors.semantic.success,
  item_rejected: colors.semantic.danger,
  achievement_unlocked: colors.accent.secondary,
  trial_started: colors.accent.primary,
  tier_upgrade: colors.accent.secondary,
};

export default function NotificationsScreen() {
  const router = useRouter();
  const notifications = useQuery(api.notifications.getByUser);
  const markRead = useMutation(api.notifications.markAsRead);
  const markAllRead = useMutation(api.notifications.markAllAsRead);

  function handleNotificationPress(notification: any) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (!notification.read) {
      markRead({ id: notification._id });
    }

    // Deep link to relevant screen based on notification type
    switch (notification.type) {
      case "achievement_unlocked":
      case "challenge_completed":
        router.push("/(app)/insights" as any);
        break;
      case "tier_upgrade":
      case "trial_started":
        router.push("/(app)/subscription" as any);
        break;
      case "approval_requested":
      case "item_approved":
      case "item_rejected":
        if (notification.data?.listId) {
          router.push(`/(app)/list/${notification.data.listId}` as any);
        }
        break;
      case "partner_joined":
        router.push("/(app)/partners" as any);
        break;
    }
  }

  function handleMarkAllRead() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    markAllRead();
  }

  function formatTime(ts: number) {
    const diff = Date.now() - ts;
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  }

  if (notifications === undefined) {
    return (
      <GlassScreen>
        <GlassHeader title="Notifications" showBack onBack={() => router.back()} />
        <View style={styles.loading}>
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </View>
      </GlassScreen>
    );
  }

  return (
    <GlassScreen>
      <GlassHeader
        title="Notifications"
        showBack
        onBack={() => router.back()}
        rightElement={
          notifications.length > 0 ? (
            <GlassButton variant="ghost" size="sm" onPress={handleMarkAllRead}>
              Read All
            </GlassButton>
          ) : undefined
        }
      />

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {notifications.length === 0 && (
          <View style={styles.emptyState}>
            <MaterialCommunityIcons name="bell-off-outline" size={64} color={colors.text.tertiary} />
            <Text style={styles.emptyTitle}>No Notifications</Text>
            <Text style={styles.emptySubtitle}>You're all caught up!</Text>
          </View>
        )}

        {notifications.map((n) => (
          <Pressable key={n._id} onPress={() => handleNotificationPress(n)}>
            <GlassCard style={[styles.notifCard, !n.read && styles.unreadCard]}>
              <View style={styles.notifRow}>
                <View style={[styles.iconCircle, { backgroundColor: `${typeColors[n.type] || colors.accent.primary}20` }]}>
                  <MaterialCommunityIcons
                    name={(typeIcons[n.type] || "bell") as any}
                    size={20}
                    color={typeColors[n.type] || colors.accent.primary}
                  />
                </View>
                <View style={styles.notifContent}>
                  <Text style={styles.notifTitle}>{n.title}</Text>
                  <Text style={styles.notifBody}>{n.body}</Text>
                  <Text style={styles.notifTime}>{formatTime(n.createdAt)}</Text>
                </View>
                {!n.read && <View style={styles.unreadDot} />}
              </View>
            </GlassCard>
          </Pressable>
        ))}

        <View style={{ height: 140 }} />
      </ScrollView>
    </GlassScreen>
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, paddingHorizontal: spacing.lg, paddingTop: spacing.md, gap: spacing.md },
  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: spacing.lg, paddingTop: spacing.md },
  emptyState: { alignItems: "center", marginTop: 80, gap: spacing.sm },
  emptyTitle: { ...typography.headlineSmall, color: colors.text.primary },
  emptySubtitle: { ...typography.bodyMedium, color: colors.text.tertiary },
  notifCard: { marginBottom: spacing.sm },
  unreadCard: { borderColor: `${colors.accent.secondary}40`, borderWidth: 1 },
  notifRow: { flexDirection: "row", alignItems: "flex-start", gap: spacing.md },
  iconCircle: { width: 40, height: 40, borderRadius: 20, justifyContent: "center", alignItems: "center" },
  notifContent: { flex: 1 },
  notifTitle: { ...typography.bodyLarge, color: colors.text.primary, fontWeight: "600" },
  notifBody: { ...typography.bodyMedium, color: colors.text.secondary, marginTop: 2 },
  notifTime: { ...typography.bodySmall, color: colors.text.tertiary, marginTop: 4 },
  unreadDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.accent.secondary,
    marginTop: 4,
  },
});
