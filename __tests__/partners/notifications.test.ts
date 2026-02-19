/**
 * Partner Mode - Notifications Tests
 * Tests notification creation on partner actions
 */

describe("Partner Notifications", () => {
  type NotificationType =
    | "partner_joined"
    | "partner_left"
    | "comment_added"
    | "list_message";

  interface Notification {
    userId: string;
    type: NotificationType;
    title: string;
    body: string;
    isRead: boolean;
    listId?: string;
    itemId?: string;
    createdAt: number;
  }

  function createNotification(
    userId: string,
    type: NotificationType,
    title: string,
    body: string,
    meta?: { listId?: string; itemId?: string }
  ): Notification {
    return {
      userId,
      type,
      title,
      body,
      isRead: false,
      listId: meta?.listId,
      itemId: meta?.itemId,
      createdAt: Date.now(),
    };
  }

  function getUnreadCount(notifications: Notification[]): number {
    return notifications.filter((n) => !n.isRead).length;
  }

  function markAsRead(notification: Notification): Notification {
    return { ...notification, isRead: true };
  }

  function markAllAsRead(notifications: Notification[]): Notification[] {
    return notifications.map((n) => ({ ...n, isRead: true }));
  }

  function notifyPartnerJoined(
    ownerId: string,
    partnerName: string,
    listName: string,
    listId: string
  ): Notification {
    return createNotification(
      ownerId,
      "partner_joined",
      "New Partner",
      `${partnerName} joined "${listName}"`,
      { listId }
    );
  }

  describe("createNotification", () => {
    it("should create unread notification", () => {
      const n = createNotification("user_1", "partner_joined", "Test", "Body");
      expect(n.isRead).toBe(false);
      expect(n.type).toBe("partner_joined");
    });

    it("should include optional metadata", () => {
      const n = createNotification("user_1", "comment_added", "Comment", "New comment", {
        listId: "list_1",
        itemId: "item_1",
      });
      expect(n.listId).toBe("list_1");
      expect(n.itemId).toBe("item_1");
    });
  });

  describe("getUnreadCount", () => {
    it("should count only unread notifications", () => {
      const notifications: Notification[] = [
        createNotification("user_1", "partner_joined", "A", "B"),
        { ...createNotification("user_1", "comment_added", "C", "D"), isRead: true },
        createNotification("user_1", "list_message", "E", "F"),
      ];
      expect(getUnreadCount(notifications)).toBe(2);
    });

    it("should return 0 for empty array", () => {
      expect(getUnreadCount([])).toBe(0);
    });

    it("should return 0 when all read", () => {
      const notifications = markAllAsRead([
        createNotification("user_1", "partner_joined", "A", "B"),
      ]);
      expect(getUnreadCount(notifications)).toBe(0);
    });
  });

  describe("markAsRead", () => {
    it("should mark a notification as read", () => {
      const n = createNotification("user_1", "comment_added", "Test", "Body");
      expect(n.isRead).toBe(false);
      const read = markAsRead(n);
      expect(read.isRead).toBe(true);
    });
  });

  describe("markAllAsRead", () => {
    it("should mark all notifications as read", () => {
      const notifications = [
        createNotification("user_1", "partner_joined", "A", "B"),
        createNotification("user_1", "comment_added", "C", "D"),
      ];
      const allRead = markAllAsRead(notifications);
      expect(allRead.every((n) => n.isRead)).toBe(true);
    });
  });

  describe("notifyPartnerJoined", () => {
    it("should create correct notification for owner", () => {
      const n = notifyPartnerJoined("owner_1", "Alice", "Weekly Shop", "list_1");
      expect(n.userId).toBe("owner_1");
      expect(n.type).toBe("partner_joined");
      expect(n.body).toContain("Alice");
      expect(n.body).toContain("Weekly Shop");
      expect(n.listId).toBe("list_1");
    });
  });

  describe("Notification types for partner actions", () => {
    const allTypes: NotificationType[] = [
      "partner_joined",
      "partner_left",
      "comment_added",
      "list_message",
    ];

    it("should support all partner notification types", () => {
      for (const type of allTypes) {
        const n = createNotification("user_1", type, "Title", "Body");
        expect(n.type).toBe(type);
      }
    });
  });
});
