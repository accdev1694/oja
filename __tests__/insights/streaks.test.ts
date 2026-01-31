/**
 * Insights - Streaks Tests
 * Tests streak increment, reset, and longest tracking
 */

describe("Streaks", () => {
  interface Streak {
    type: string;
    currentCount: number;
    longestCount: number;
    lastDate: string;
  }

  function updateStreak(streak: Streak, today: string): Streak {
    const todayDate = new Date(today);
    const lastDate = new Date(streak.lastDate);
    const diffMs = todayDate.getTime() - lastDate.getTime();
    const diffDays = Math.floor(diffMs / (24 * 60 * 60 * 1000));

    if (diffDays === 0) {
      // Already updated today
      return streak;
    }

    if (diffDays === 1) {
      // Continue streak
      const newCount = streak.currentCount + 1;
      return {
        ...streak,
        currentCount: newCount,
        longestCount: Math.max(streak.longestCount, newCount),
        lastDate: today,
      };
    }

    // Gap > 1 day, reset streak
    return {
      ...streak,
      currentCount: 1,
      longestCount: Math.max(streak.longestCount, streak.currentCount),
      lastDate: today,
    };
  }

  function checkStreakMilestone(count: number): string | null {
    if (count === 7) return "week_warrior";
    if (count === 30) return "monthly_master";
    if (count === 100) return "century_shopper";
    return null;
  }

  describe("updateStreak", () => {
    it("should not increment if already updated today", () => {
      const streak: Streak = {
        type: "shopping",
        currentCount: 5,
        longestCount: 10,
        lastDate: "2026-01-30",
      };
      const result = updateStreak(streak, "2026-01-30");
      expect(result.currentCount).toBe(5);
    });

    it("should increment if last activity was yesterday", () => {
      const streak: Streak = {
        type: "shopping",
        currentCount: 5,
        longestCount: 10,
        lastDate: "2026-01-29",
      };
      const result = updateStreak(streak, "2026-01-30");
      expect(result.currentCount).toBe(6);
      expect(result.lastDate).toBe("2026-01-30");
    });

    it("should reset to 1 if gap is more than 1 day", () => {
      const streak: Streak = {
        type: "shopping",
        currentCount: 10,
        longestCount: 15,
        lastDate: "2026-01-27",
      };
      const result = updateStreak(streak, "2026-01-30");
      expect(result.currentCount).toBe(1);
    });

    it("should update longest count when current exceeds it", () => {
      const streak: Streak = {
        type: "shopping",
        currentCount: 9,
        longestCount: 9,
        lastDate: "2026-01-29",
      };
      const result = updateStreak(streak, "2026-01-30");
      expect(result.currentCount).toBe(10);
      expect(result.longestCount).toBe(10);
    });

    it("should preserve longest count on reset", () => {
      const streak: Streak = {
        type: "shopping",
        currentCount: 5,
        longestCount: 20,
        lastDate: "2026-01-20",
      };
      const result = updateStreak(streak, "2026-01-30");
      expect(result.currentCount).toBe(1);
      expect(result.longestCount).toBe(20);
    });

    it("should handle streak from first day", () => {
      const streak: Streak = {
        type: "shopping",
        currentCount: 1,
        longestCount: 1,
        lastDate: "2026-01-29",
      };
      const result = updateStreak(streak, "2026-01-30");
      expect(result.currentCount).toBe(2);
      expect(result.longestCount).toBe(2);
    });

    it("should update longestCount on reset if current was higher", () => {
      const streak: Streak = {
        type: "shopping",
        currentCount: 12,
        longestCount: 8,
        lastDate: "2026-01-20",
      };
      const result = updateStreak(streak, "2026-01-30");
      expect(result.longestCount).toBe(12);
    });
  });

  describe("checkStreakMilestone", () => {
    it("should return week_warrior at 7", () => {
      expect(checkStreakMilestone(7)).toBe("week_warrior");
    });

    it("should return monthly_master at 30", () => {
      expect(checkStreakMilestone(30)).toBe("monthly_master");
    });

    it("should return century_shopper at 100", () => {
      expect(checkStreakMilestone(100)).toBe("century_shopper");
    });

    it("should return null for non-milestone counts", () => {
      expect(checkStreakMilestone(1)).toBeNull();
      expect(checkStreakMilestone(6)).toBeNull();
      expect(checkStreakMilestone(8)).toBeNull();
      expect(checkStreakMilestone(29)).toBeNull();
      expect(checkStreakMilestone(50)).toBeNull();
    });
  });

  describe("Multi-day streak simulation", () => {
    it("should build up a 7-day streak", () => {
      let streak: Streak = {
        type: "shopping",
        currentCount: 1,
        longestCount: 1,
        lastDate: "2026-01-24",
      };

      for (let day = 25; day <= 30; day++) {
        streak = updateStreak(streak, `2026-01-${day}`);
      }

      expect(streak.currentCount).toBe(7);
      expect(streak.longestCount).toBe(7);
    });

    it("should handle streak break and restart", () => {
      let streak: Streak = {
        type: "shopping",
        currentCount: 1,
        longestCount: 1,
        lastDate: "2026-01-20",
      };

      // Build 3-day streak
      streak = updateStreak(streak, "2026-01-21");
      streak = updateStreak(streak, "2026-01-22");
      expect(streak.currentCount).toBe(3);

      // Break (skip 23)
      streak = updateStreak(streak, "2026-01-24");
      expect(streak.currentCount).toBe(1);
      expect(streak.longestCount).toBe(3);

      // Build new 2-day streak
      streak = updateStreak(streak, "2026-01-25");
      expect(streak.currentCount).toBe(2);
      expect(streak.longestCount).toBe(3); // Previous longest preserved
    });
  });
});
