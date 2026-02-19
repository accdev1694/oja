import React, { useCallback, useRef } from "react";
import {
  View,
  Text,
  Pressable,
  FlatList,
  StyleSheet,
} from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import ReanimatedSwipeable from "react-native-gesture-handler/ReanimatedSwipeable";
import Reanimated, {
  SharedValue,
  useAnimatedStyle,
} from "react-native-reanimated";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { useNotifications } from "@/hooks/useNotifications";
import { GlassModal } from "@/components/ui/glass";
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
  comment_added: { icon: "comment-text", color: colors.accent.primary },
  list_approval_requested: { icon: "clipboard-check-outline", color: colors.accent.warning },
  list_approved: { icon: "clipboard-check", color: colors.accent.success },
  list_rejected: { icon: "clipboard-remove", color: colors.accent.error },
  list_message: { icon: "chat", color: colors.accent.primary },
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

function RenderLeftAction({ drag }: { drag: SharedValue<number> }) {
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: drag.value - 72 }],
  }));

  return (
    <Reanimated.View style={[styles.dismissAction, animatedStyle]}>
      <MaterialCommunityIcons name="trash-can-outline" size={20} color="#fff" />
    </Reanimated.View>
  );
}

export function NotificationDropdown({
  visible,
  onClose,
}: NotificationDropdownProps) {
  const { notifications, markAsRead, markAllAsRead, dismiss, getRoute, unreadCount } =
    useNotifications();
  const router = useRouter();
  const swipeableRefs = useRef<Map<string, ReanimatedSwipeable>>(new Map());

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

  const handleDismiss = useCallback(async (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await dismiss(id as any).catch(console.warn);
  }, [dismiss]);

  const handleMarkAllRead = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await markAllAsRead();
  };

  const renderLeftActions = useCallback(
    (_progress: SharedValue<number>, drag: SharedValue<number>) => {
      return (
        <RenderLeftAction drag={drag} />
      );
    },
    []
  );

  return (
    <GlassModal
      visible={visible}
      onClose={onClose}
      position="custom"
      bare
      overlayOpacity={0.4}
    >
      <GestureHandlerRootView style={styles.gestureRoot}>
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

          {/* Swipe hint */}
          {notifications.length > 0 && (
            <View style={styles.swipeHint}>
              <MaterialCommunityIcons name="gesture-swipe-right" size={14} color={colors.text.tertiary} />
              <Text style={styles.swipeHintText}>Swipe right to dismiss</Text>
            </View>
          )}

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
                <ReanimatedSwipeable
                  ref={(ref) => {
                    if (ref) swipeableRefs.current.set(item._id, ref);
                    else swipeableRefs.current.delete(item._id);
                  }}
                  renderLeftActions={renderLeftActions}
                  onSwipeableOpen={() => handleDismiss(item._id)}
                  overshootLeft={false}
                  friction={2}
                >
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
                </ReanimatedSwipeable>
              );
            }}
          />
        </Pressable>
      </GestureHandlerRootView>
    </GlassModal>
  );
}

const styles = StyleSheet.create({
  gestureRoot: {
    flex: 1,
  },
  dropdown: {
    position: "absolute",
    top: 100,
    right: spacing.md,
    left: spacing.md,
    maxHeight: 420,
    backgroundColor: colors.background.primary,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.glass.borderFocus,
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
    backgroundColor: colors.background.primary,
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
  dismissAction: {
    backgroundColor: colors.accent.error,
    justifyContent: "center",
    alignItems: "center",
    width: 72,
  },
  swipeHint: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingVertical: spacing.xs,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.glass.border,
  },
  swipeHintText: {
    fontSize: 11,
    color: colors.text.tertiary,
  },
});
