import React from "react";
import {
  View,
  Text,
  Modal,
  Pressable,
  FlatList,
  StyleSheet,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { useNotifications } from "@/hooks/useNotifications";
import { colors, spacing, typography } from "@/lib/design/glassTokens";

interface NotificationDropdownProps {
  visible: boolean;
  onClose: () => void;
}

const typeIcons: Record<string, { icon: string; color: string }> = {
  partner_joined: { icon: "account-plus", color: colors.accent.primary },
  partner_left: { icon: "account-minus", color: colors.accent.warning },
  approval_requested: { icon: "clock-outline", color: colors.accent.warning },
  item_approved: { icon: "check-circle", color: colors.accent.success },
  item_rejected: { icon: "close-circle", color: colors.accent.error },
  item_contested: { icon: "alert-circle", color: "#FF8C00" },
  contest_resolved: { icon: "gavel", color: colors.accent.info },
  comment_added: { icon: "comment-text", color: colors.accent.primary },
};

function timeAgo(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}

export function NotificationDropdown({
  visible,
  onClose,
}: NotificationDropdownProps) {
  const { notifications, markAsRead, markAllAsRead, getRoute, unreadCount } =
    useNotifications();
  const router = useRouter();

  const handleTap = async (notification: (typeof notifications)[0]) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (!notification.read) {
      await markAsRead(notification._id);
    }
    const route = getRoute(notification);
    onClose();
    if (route) {
      router.push(route as any);
    }
  };

  const handleMarkAllRead = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await markAllAsRead();
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.dropdown} onPress={(e) => e.stopPropagation()}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Notifications</Text>
            {unreadCount > 0 && (
              <Pressable onPress={handleMarkAllRead}>
                <Text style={styles.markAllText}>Mark all read</Text>
              </Pressable>
            )}
          </View>

          {/* List */}
          <FlatList
            data={notifications}
            keyExtractor={(item) => item._id}
            style={styles.list}
            ListEmptyComponent={
              <View style={styles.empty}>
                <MaterialCommunityIcons
                  name="bell-off-outline"
                  size={32}
                  color={colors.text.tertiary}
                />
                <Text style={styles.emptyText}>No notifications</Text>
              </View>
            }
            renderItem={({ item }) => {
              const typeConfig = typeIcons[item.type] ?? {
                icon: "bell",
                color: colors.text.secondary,
              };
              return (
                <Pressable
                  style={[
                    styles.notification,
                    !item.read && styles.notificationUnread,
                  ]}
                  onPress={() => handleTap(item)}
                >
                  <View
                    style={[
                      styles.iconCircle,
                      { backgroundColor: `${typeConfig.color}20` },
                    ]}
                  >
                    <MaterialCommunityIcons
                      name={typeConfig.icon as any}
                      size={18}
                      color={typeConfig.color}
                    />
                  </View>
                  <View style={styles.notifContent}>
                    <Text
                      style={[
                        styles.notifTitle,
                        !item.read && styles.notifTitleUnread,
                      ]}
                      numberOfLines={1}
                    >
                      {item.title}
                    </Text>
                    <Text style={styles.notifBody} numberOfLines={2}>
                      {item.body}
                    </Text>
                  </View>
                  <Text style={styles.notifTime}>
                    {timeAgo(item.createdAt)}
                  </Text>
                  {!item.read && <View style={styles.unreadDot} />}
                </Pressable>
              );
            }}
          />
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.4)",
  },
  dropdown: {
    position: "absolute",
    top: 100,
    right: spacing.md,
    left: spacing.md,
    maxHeight: 420,
    backgroundColor: colors.background.secondary,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.glass.border,
    overflow: "hidden",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.glass.border,
  },
  title: {
    fontSize: typography.bodyLarge.fontSize,
    fontWeight: "700",
    color: colors.text.primary,
  },
  markAllText: {
    fontSize: typography.bodySmall.fontSize,
    color: colors.accent.primary,
    fontWeight: "600",
  },
  list: {
    maxHeight: 360,
  },
  empty: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.xl,
    gap: spacing.sm,
  },
  emptyText: {
    color: colors.text.tertiary,
    fontSize: typography.bodyMedium.fontSize,
  },
  notification: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    padding: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.glass.border,
  },
  notificationUnread: {
    backgroundColor: "rgba(255, 255, 255, 0.04)",
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  notifContent: {
    flex: 1,
  },
  notifTitle: {
    fontSize: typography.bodyMedium.fontSize,
    color: colors.text.secondary,
    fontWeight: "500",
  },
  notifTitleUnread: {
    color: colors.text.primary,
    fontWeight: "700",
  },
  notifBody: {
    fontSize: typography.bodySmall.fontSize,
    color: colors.text.tertiary,
    marginTop: 1,
  },
  notifTime: {
    fontSize: typography.bodySmall.fontSize,
    color: colors.text.tertiary,
    marginLeft: spacing.xs,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.accent.primary,
  },
});
