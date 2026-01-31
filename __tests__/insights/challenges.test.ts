/**
 * Insights - Challenges Tests
 * Tests challenge progress, completion, and generation
 */

describe("Challenges", () => {
  interface Challenge {
    title: string;
    description: string;
    type: string;
    target: number;
    progress: number;
    rewardPoints: number;
    isCompleted: boolean;
    expiresAt: number;
    createdAt: number;
  }

  const CHALLENGE_TEMPLATES = [
    { type: "receipt_collector", title: "Receipt Collector", description: "Scan {target} receipts this week", target: 3, reward: 30 },
    { type: "budget_boss", title: "Budget Boss", description: "Complete {target} trips under budget", target: 3, reward: 50 },
    { type: "list_crusher", title: "List Crusher", description: "Complete {target} shopping lists", target: 2, reward: 25 },
    { type: "pantry_keeper", title: "Pantry Keeper", description: "Update your pantry {target} times", target: 5, reward: 20 },
    { type: "streak_builder", title: "Streak Builder", description: "Maintain a {target}-day streak", target: 5, reward: 40 },
  ];

  function generateChallenge(now: number): Challenge {
    const template = CHALLENGE_TEMPLATES[Math.floor(Math.random() * CHALLENGE_TEMPLATES.length)];
    return {
      title: template.title,
      description: template.description.replace("{target}", String(template.target)),
      type: template.type,
      target: template.target,
      progress: 0,
      rewardPoints: template.reward,
      isCompleted: false,
      expiresAt: now + 7 * 24 * 60 * 60 * 1000,
      createdAt: now,
    };
  }

  function updateProgress(challenge: Challenge, increment: number = 1): Challenge {
    if (challenge.isCompleted) return challenge;
    if (challenge.expiresAt < Date.now()) return challenge;

    const newProgress = Math.min(challenge.progress + increment, challenge.target);
    const isCompleted = newProgress >= challenge.target;

    return {
      ...challenge,
      progress: newProgress,
      isCompleted,
    };
  }

  function isExpired(challenge: Challenge, now: number): boolean {
    return now > challenge.expiresAt;
  }

  function getProgressPercent(challenge: Challenge): number {
    return Math.min(Math.round((challenge.progress / challenge.target) * 100), 100);
  }

  describe("generateChallenge", () => {
    it("should create a challenge with 7-day expiry", () => {
      const now = Date.now();
      const challenge = generateChallenge(now);
      const expectedExpiry = now + 7 * 24 * 60 * 60 * 1000;
      expect(challenge.expiresAt).toBe(expectedExpiry);
    });

    it("should start with 0 progress", () => {
      const challenge = generateChallenge(Date.now());
      expect(challenge.progress).toBe(0);
      expect(challenge.isCompleted).toBe(false);
    });

    it("should have positive reward points", () => {
      const challenge = generateChallenge(Date.now());
      expect(challenge.rewardPoints).toBeGreaterThan(0);
    });

    it("should have a valid type from templates", () => {
      const validTypes = CHALLENGE_TEMPLATES.map((t) => t.type);
      const challenge = generateChallenge(Date.now());
      expect(validTypes).toContain(challenge.type);
    });
  });

  describe("updateProgress", () => {
    it("should increment progress by 1", () => {
      const challenge: Challenge = {
        title: "Test", description: "Test", type: "test", target: 3,
        progress: 1, rewardPoints: 30, isCompleted: false,
        expiresAt: Date.now() + 86400000, createdAt: Date.now(),
      };
      const result = updateProgress(challenge);
      expect(result.progress).toBe(2);
      expect(result.isCompleted).toBe(false);
    });

    it("should mark as completed when target reached", () => {
      const challenge: Challenge = {
        title: "Test", description: "Test", type: "test", target: 3,
        progress: 2, rewardPoints: 30, isCompleted: false,
        expiresAt: Date.now() + 86400000, createdAt: Date.now(),
      };
      const result = updateProgress(challenge);
      expect(result.progress).toBe(3);
      expect(result.isCompleted).toBe(true);
    });

    it("should not exceed target", () => {
      const challenge: Challenge = {
        title: "Test", description: "Test", type: "test", target: 3,
        progress: 2, rewardPoints: 30, isCompleted: false,
        expiresAt: Date.now() + 86400000, createdAt: Date.now(),
      };
      const result = updateProgress(challenge, 5);
      expect(result.progress).toBe(3);
    });

    it("should not update completed challenges", () => {
      const challenge: Challenge = {
        title: "Test", description: "Test", type: "test", target: 3,
        progress: 3, rewardPoints: 30, isCompleted: true,
        expiresAt: Date.now() + 86400000, createdAt: Date.now(),
      };
      const result = updateProgress(challenge);
      expect(result.progress).toBe(3);
    });

    it("should not update expired challenges", () => {
      const challenge: Challenge = {
        title: "Test", description: "Test", type: "test", target: 3,
        progress: 1, rewardPoints: 30, isCompleted: false,
        expiresAt: Date.now() - 86400000, createdAt: Date.now() - 2 * 86400000,
      };
      const result = updateProgress(challenge);
      expect(result.progress).toBe(1);
    });
  });

  describe("isExpired", () => {
    it("should return true for expired challenge", () => {
      const challenge: Challenge = {
        title: "Test", description: "Test", type: "test", target: 3,
        progress: 0, rewardPoints: 30, isCompleted: false,
        expiresAt: 1000, createdAt: 0,
      };
      expect(isExpired(challenge, 2000)).toBe(true);
    });

    it("should return false for active challenge", () => {
      const challenge: Challenge = {
        title: "Test", description: "Test", type: "test", target: 3,
        progress: 0, rewardPoints: 30, isCompleted: false,
        expiresAt: Date.now() + 86400000, createdAt: Date.now(),
      };
      expect(isExpired(challenge, Date.now())).toBe(false);
    });
  });

  describe("getProgressPercent", () => {
    it("should return 0 for no progress", () => {
      const challenge = { progress: 0, target: 3 } as Challenge;
      expect(getProgressPercent(challenge)).toBe(0);
    });

    it("should return 100 for completed", () => {
      const challenge = { progress: 3, target: 3 } as Challenge;
      expect(getProgressPercent(challenge)).toBe(100);
    });

    it("should return 33 for 1/3", () => {
      const challenge = { progress: 1, target: 3 } as Challenge;
      expect(getProgressPercent(challenge)).toBe(33);
    });

    it("should cap at 100", () => {
      const challenge = { progress: 5, target: 3 } as Challenge;
      expect(getProgressPercent(challenge)).toBe(100);
    });
  });
});
