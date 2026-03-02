/**
 * Insights - Achievements Tests
 * Tests unlock conditions for each badge type
 */

describe("Achievements", () => {
  type AchievementType =
    | "first_list"
    | "first_receipt"
    | "budget_keeper"
    | "streak_master"
    | "week_warrior"
    | "monthly_master"
    | "century_shopper"
    | "challenge_accepted"
    | "savings_milestone"
    | "pantry_pro"
    | "social_shopper"
    | "rewards_pioneer"
    | "top_tier";

  interface AchievementDefinition {
    type: AchievementType;
    name: string;
    description: string;
    checkUnlock: (stats: UserStats) => boolean;
  }

  interface UserStats {
    listsCreated: number;
    receiptsScanned: number;
    tripsUnderBudget: number;
    currentStreak: number;
    challengesCompleted: number;
    totalSaved: number;
    pantryItemsTracked: number;
    partnersInvited: number;
    totalPointsEarned: number;
    currentScanTier: string;
  }

  const ACHIEVEMENTS: AchievementDefinition[] = [
    {
      type: "first_list",
      name: "First Steps",
      description: "Created your first shopping list",
      checkUnlock: (s) => s.listsCreated >= 1,
    },
    {
      type: "first_receipt",
      name: "Receipt Rookie",
      description: "Scanned your first receipt",
      checkUnlock: (s) => s.receiptsScanned >= 1,
    },
    {
      type: "budget_keeper",
      name: "Budget Keeper",
      description: "Completed 5 trips under budget",
      checkUnlock: (s) => s.tripsUnderBudget >= 5,
    },
    {
      type: "streak_master",
      name: "Streak Master",
      description: "Maintained a 7-day streak",
      checkUnlock: (s) => s.currentStreak >= 7,
    },
    {
      type: "challenge_accepted",
      name: "Challenge Accepted",
      description: "Completed your first weekly challenge",
      checkUnlock: (s) => s.challengesCompleted >= 1,
    },
    {
      type: "savings_milestone",
      name: "Super Saver",
      description: "Saved a total of £100",
      checkUnlock: (s) => s.totalSaved >= 100,
    },
    {
      type: "pantry_pro",
      name: "Pantry Pro",
      description: "Track 30 items in your pantry",
      checkUnlock: (s) => s.pantryItemsTracked >= 30,
    },
    {
      type: "social_shopper",
      name: "Social Shopper",
      description: "Invited a partner to a list",
      checkUnlock: (s) => s.partnersInvited >= 1,
    },
    {
      type: "rewards_pioneer",
      name: "Rewards Pioneer",
      description: "Earned your first points",
      checkUnlock: (s) => s.totalPointsEarned >= 1,
    },
    {
      type: "top_tier",
      name: "Top Tier",
      description: "Reached Platinum scan tier",
      checkUnlock: (s) => s.currentScanTier === "platinum",
    },
  ];

  function checkNewAchievements(
    stats: UserStats,
    alreadyUnlocked: AchievementType[]
  ): AchievementType[] {
    return ACHIEVEMENTS.filter(
      (a) => !alreadyUnlocked.includes(a.type) && a.checkUnlock(stats)
    ).map((a) => a.type);
  }

  const emptyStats: UserStats = {
    listsCreated: 0,
    receiptsScanned: 0,
    tripsUnderBudget: 0,
    currentStreak: 0,
    challengesCompleted: 0,
    totalSaved: 0,
    pantryItemsTracked: 0,
    partnersInvited: 0,
    totalPointsEarned: 0,
    currentScanTier: "bronze",
  };

  describe("Individual achievement unlock conditions", () => {
    it("first_list unlocks at 1 list", () => {
      const stats = { ...emptyStats, listsCreated: 1 };
      const unlocked = checkNewAchievements(stats, []);
      expect(unlocked).toContain("first_list");
    });

    it("first_receipt unlocks at 1 receipt", () => {
      const stats = { ...emptyStats, receiptsScanned: 1 };
      const unlocked = checkNewAchievements(stats, []);
      expect(unlocked).toContain("first_receipt");
    });

    it("budget_keeper unlocks at 5 trips under budget", () => {
      const stats = { ...emptyStats, tripsUnderBudget: 5 };
      const unlocked = checkNewAchievements(stats, []);
      expect(unlocked).toContain("budget_keeper");
    });

    it("budget_keeper does not unlock at 4 trips", () => {
      const stats = { ...emptyStats, tripsUnderBudget: 4 };
      const unlocked = checkNewAchievements(stats, []);
      expect(unlocked).not.toContain("budget_keeper");
    });

    it("streak_master unlocks at 7-day streak", () => {
      const stats = { ...emptyStats, currentStreak: 7 };
      const unlocked = checkNewAchievements(stats, []);
      expect(unlocked).toContain("streak_master");
    });

    it("challenge_accepted unlocks at first challenge completion", () => {
      const stats = { ...emptyStats, challengesCompleted: 1 };
      const unlocked = checkNewAchievements(stats, []);
      expect(unlocked).toContain("challenge_accepted");
    });

    it("savings_milestone unlocks at £100 saved", () => {
      const stats = { ...emptyStats, totalSaved: 100 };
      const unlocked = checkNewAchievements(stats, []);
      expect(unlocked).toContain("savings_milestone");
    });

    it("pantry_pro unlocks at 30 pantry items", () => {
      const stats = { ...emptyStats, pantryItemsTracked: 30 };
      const unlocked = checkNewAchievements(stats, []);
      expect(unlocked).toContain("pantry_pro");
    });

    it("social_shopper unlocks at first invite", () => {
      const stats = { ...emptyStats, partnersInvited: 1 };
      const unlocked = checkNewAchievements(stats, []);
      expect(unlocked).toContain("social_shopper");
    });

    it("rewards_pioneer unlocks at first point", () => {
      const stats = { ...emptyStats, totalPointsEarned: 1 };
      const unlocked = checkNewAchievements(stats, []);
      expect(unlocked).toContain("rewards_pioneer");
    });

    it("top_tier unlocks at platinum tier", () => {
      const stats = { ...emptyStats, currentScanTier: "platinum" };
      const unlocked = checkNewAchievements(stats, []);
      expect(unlocked).toContain("top_tier");
    });
  });

  describe("checkNewAchievements", () => {
    it("should not return already unlocked achievements", () => {
      const stats = { ...emptyStats, listsCreated: 1, receiptsScanned: 1 };
      const unlocked = checkNewAchievements(stats, ["first_list"]);
      expect(unlocked).not.toContain("first_list");
      expect(unlocked).toContain("first_receipt");
    });

    it("should return empty array when no new achievements", () => {
      const unlocked = checkNewAchievements(emptyStats, []);
      expect(unlocked).toEqual([]);
    });

    it("should return multiple new achievements at once", () => {
      const stats = {
        ...emptyStats,
        listsCreated: 1,
        receiptsScanned: 1,
        partnersInvited: 1,
      };
      const unlocked = checkNewAchievements(stats, []);
      expect(unlocked).toHaveLength(3);
      expect(unlocked).toContain("first_list");
      expect(unlocked).toContain("first_receipt");
      expect(unlocked).toContain("social_shopper");
    });

    it("should handle all achievements already unlocked", () => {
      const allTypes = ACHIEVEMENTS.map((a) => a.type);
      const stats = {
        listsCreated: 100,
        receiptsScanned: 100,
        tripsUnderBudget: 100,
        currentStreak: 100,
        challengesCompleted: 100,
        totalSaved: 1000,
        pantryItemsTracked: 100,
        partnersInvited: 100,
        totalPointsEarned: 1000,
        currentScanTier: "platinum",
      };
      const unlocked = checkNewAchievements(stats, allTypes);
      expect(unlocked).toEqual([]);
    });
  });
});
