/**
 * Component Tests - NotificationBell
 * Tests unread count display and badge logic
 */

describe("NotificationBell Logic", () => {
  interface Notification {
    id: string;
    isRead: boolean;
    createdAt: number;
  }

  function getUnreadCount(notifications: Notification[]): number {
    return notifications.filter((n) => !n.isRead).length;
  }

  function formatBadgeCount(count: number): string {
    if (count <= 0) return "";
    if (count > 99) return "99+";
    return String(count);
  }

  function shouldShowBadge(count: number): boolean {
    return count > 0;
  }

  function groupNotificationsByDate(
    notifications: Notification[]
  ): Record<string, Notification[]> {
    const groups: Record<string, Notification[]> = {};

    for (const n of notifications) {
      const date = new Date(n.createdAt).toISOString().split("T")[0];
      if (!groups[date]) groups[date] = [];
      groups[date].push(n);
    }

    return groups;
  }

  function getRelativeTime(timestamp: number, now: number): string {
    const diffMs = now - timestamp;
    const diffMinutes = Math.floor(diffMs / (60 * 1000));
    const diffHours = Math.floor(diffMs / (60 * 60 * 1000));
    const diffDays = Math.floor(diffMs / (24 * 60 * 60 * 1000));

    if (diffMinutes < 1) return "Just now";
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return new Date(timestamp).toLocaleDateString();
  }

  describe("getUnreadCount", () => {
    it("should return 0 for empty array", () => {
      expect(getUnreadCount([])).toBe(0);
    });

    it("should count only unread", () => {
      const notifications: Notification[] = [
        { id: "1", isRead: false, createdAt: 1000 },
        { id: "2", isRead: true, createdAt: 2000 },
        { id: "3", isRead: false, createdAt: 3000 },
      ];
      expect(getUnreadCount(notifications)).toBe(2);
    });

    it("should return 0 when all read", () => {
      const notifications: Notification[] = [
        { id: "1", isRead: true, createdAt: 1000 },
        { id: "2", isRead: true, createdAt: 2000 },
      ];
      expect(getUnreadCount(notifications)).toBe(0);
    });
  });

  describe("formatBadgeCount", () => {
    it("should return empty string for 0", () => {
      expect(formatBadgeCount(0)).toBe("");
    });

    it("should return empty string for negative", () => {
      expect(formatBadgeCount(-1)).toBe("");
    });

    it("should return number as string for 1-99", () => {
      expect(formatBadgeCount(1)).toBe("1");
      expect(formatBadgeCount(50)).toBe("50");
      expect(formatBadgeCount(99)).toBe("99");
    });

    it("should return 99+ for 100+", () => {
      expect(formatBadgeCount(100)).toBe("99+");
      expect(formatBadgeCount(999)).toBe("99+");
    });
  });

  describe("shouldShowBadge", () => {
    it("should show for positive count", () => {
      expect(shouldShowBadge(1)).toBe(true);
      expect(shouldShowBadge(50)).toBe(true);
    });

    it("should not show for zero", () => {
      expect(shouldShowBadge(0)).toBe(false);
    });
  });

  describe("getRelativeTime", () => {
    const now = Date.now();

    it("should show Just now for very recent", () => {
      expect(getRelativeTime(now - 30000, now)).toBe("Just now");
    });

    it("should show minutes for < 1 hour", () => {
      expect(getRelativeTime(now - 5 * 60 * 1000, now)).toBe("5m ago");
    });

    it("should show hours for < 1 day", () => {
      expect(getRelativeTime(now - 3 * 60 * 60 * 1000, now)).toBe("3h ago");
    });

    it("should show days for < 1 week", () => {
      expect(getRelativeTime(now - 2 * 24 * 60 * 60 * 1000, now)).toBe("2d ago");
    });

    it("should show date for >= 1 week", () => {
      const result = getRelativeTime(now - 10 * 24 * 60 * 60 * 1000, now);
      expect(result).not.toContain("ago");
    });
  });

  describe("groupNotificationsByDate", () => {
    it("should group notifications by date", () => {
      const day1 = new Date("2026-01-29T10:00:00Z").getTime();
      const day2 = new Date("2026-01-30T14:00:00Z").getTime();

      const notifications: Notification[] = [
        { id: "1", isRead: false, createdAt: day1 },
        { id: "2", isRead: false, createdAt: day1 + 3600000 },
        { id: "3", isRead: false, createdAt: day2 },
      ];

      const groups = groupNotificationsByDate(notifications);
      expect(Object.keys(groups)).toHaveLength(2);
      expect(groups["2026-01-29"]).toHaveLength(2);
      expect(groups["2026-01-30"]).toHaveLength(1);
    });

    it("should handle empty array", () => {
      const groups = groupNotificationsByDate([]);
      expect(Object.keys(groups)).toHaveLength(0);
    });
  });
});
