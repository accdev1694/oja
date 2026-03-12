import { v } from "convex/values";
import { mutation, query } from "../_generated/server";
import { requireUser, optionalUser } from "./helpers";

/**
 * Get active weekly challenge (or generate one)
 */
export const getActiveChallenge = query({
  args: {},
  handler: async (ctx) => {
    const user = await optionalUser(ctx);
    if (!user) return null;

    const now = new Date();
    const today = now.toISOString().split("T")[0];

    const challenges = await ctx.db
      .query("weeklyChallenges")
      .withIndex("by_user", (q: any) => q.eq("userId", user._id))
      .collect();

    // Find active (not expired, not completed)
    const active = challenges.find(
      (c: any) => c.endDate >= today && !c.completedAt
    );

    return active || null;
  },
});

/**
 * Generate a new weekly challenge
 */
export const generateChallenge = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await requireUser(ctx);
    const now = new Date();
    const today = now.toISOString().split("T")[0];

    // Check if there's already an active one
    const challenges = await ctx.db
      .query("weeklyChallenges")
      .withIndex("by_user", (q: any) => q.eq("userId", user._id))
      .collect();

    const active = challenges.find((c: any) => c.endDate >= today && !c.completedAt);
    if (active) return active;

    const endDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

    const templates = [
      { type: "scan_receipts", title: "Receipt Collector", description: "Scan 3 receipts this week", icon: "camera", target: 3, reward: 15 },
      { type: "under_budget", title: "Budget Boss", description: "Complete 2 trips under budget", icon: "cash-check", target: 2, reward: 20 },
      { type: "complete_lists", title: "List Crusher", description: "Complete 3 shopping lists", icon: "clipboard-check", target: 3, reward: 15 },
      { type: "add_items", title: "Stock Up", description: "Add 15 items to your pantry", icon: "package-variant-closed", target: 15, reward: 10 },
      { type: "save_money", title: "Penny Pincher", description: "Save £10 or more across all trips", icon: "piggy-bank", target: 10, reward: 25 },
    ];

    const template = templates[Math.floor(Math.random() * templates.length)];

    const id = await ctx.db.insert("weeklyChallenges", {
      userId: user._id,
      type: template.type,
      title: template.title,
      description: template.description,
      icon: template.icon,
      target: template.target,
      progress: 0,
      reward: template.reward,
      startDate: today,
      endDate,
      createdAt: Date.now(),
    });

    return await ctx.db.get(id);
  },
});

/**
 * Update challenge progress
 */
export const updateChallengeProgress = mutation({
  args: {
    challengeId: v.id("weeklyChallenges"),
    increment: v.number(),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const challenge = await ctx.db.get(args.challengeId);
    if (!challenge || challenge.userId !== user._id) throw new Error("Not found");
    if (challenge.completedAt) return challenge;

    const newProgress = Math.min(challenge.progress + args.increment, challenge.target);
    const completed = newProgress >= challenge.target;

    await ctx.db.patch(args.challengeId, {
      progress: newProgress,
      ...(completed ? { completedAt: Date.now() } : {}),
    });

    if (completed) {
      const now = Date.now();

      // Award achievement for first challenge completion
      const existingAch = await ctx.db
        .query("achievements")
        .withIndex("by_user_type", (q: any) => q.eq("userId", user._id).eq("type", "first_challenge"))
        .unique();

      if (!existingAch) {
        await ctx.db.insert("achievements", {
          userId: user._id,
          type: "first_challenge",
          title: "Challenge Accepted",
          description: "Completed your first weekly challenge",
          icon: "flag-checkered",
          unlockedAt: now,
        });
      }

      await ctx.db.insert("notifications", {
        userId: user._id,
        type: "challenge_completed",
        title: "Challenge Complete!",
        body: `You completed "${challenge.title}" — +${challenge.reward} points!`,
        data: { challengeId: args.challengeId },
        read: false,
        createdAt: now,
      });
    }

    return { ...challenge, progress: newProgress, completedAt: completed ? Date.now() : undefined };
  },
});
