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
      case "approval_requested":
      case "item_approved":
      case "item_rejected":
      case "comment_added":
      case "list_approval_requested":
      case "list_approved":
      case "list_rejected":
      case "list_message":
        return data.listId ? `/list/${data.listId}` : null;
      default:
        return null;
    }
  };

  return {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    getRoute,
  };
}
