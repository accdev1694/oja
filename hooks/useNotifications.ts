import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";

/**
 * Hook to manage in-app notifications.
 * Provides notification list, unread count, and mark-as-read actions.
 */
export function useNotifications() {
  const notifications = useQuery(api.notifications.getByUser) ?? [];
  const unreadCount = useQuery(api.notifications.getUnreadCount) ?? 0;
  const markAsReadMutation = useMutation(api.notifications.markAsRead);
  const markAllAsReadMutation = useMutation(api.notifications.markAllAsRead);
  const dismissMutation = useMutation(api.notifications.dismiss);

  const markAsRead = async (id: Id<"notifications">) => {
    await markAsReadMutation({ id });
  };

  const markAllAsRead = async () => {
    await markAllAsReadMutation({});
  };

  /**
   * Get the navigation route for a notification based on its type/data.
   */
  const getRoute = (notification: { type: string; data?: any }): string | null => {
    const data = notification.data;
    if (!data) return null;

    switch (notification.type) {
      case "partner_joined":
      case "partner_left":
        return "/(app)/partners";
      case "comment_added":
      case "list_message":
        return data.listId ? `/(app)/list/${data.listId}` : null;
      case "achievement_unlocked":
      case "challenge_completed":
        return "/(app)/insights";
      case "tier_upgrade":
      case "trial_started":
        return "/(app)/subscription";
      default:
        return null;
    }
  };

  const dismiss = async (id: Id<"notifications">) => {
    await dismissMutation({ id });
  };

  return {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    dismiss,
    getRoute,
  };
}
