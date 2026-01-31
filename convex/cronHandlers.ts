import { internalMutation } from "./_generated/server";

/**
 * Expire loyalty points older than 12 months.
 * Creates "expired" pointTransaction entries and decrements the balance.
 */
export const expireOldPoints = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const twelveMonthsAgo = now - 365 * 24 * 60 * 60 * 1000;

    // Find all earned transactions older than 12 months that haven't been expired
    const allTransactions = await ctx.db.query("pointTransactions").collect();
    const oldEarned = allTransactions.filter(
      (t) => t.type === "earned" && t.createdAt < twelveMonthsAgo
    );

    // Group by user
    const userExpiry: Record<string, number> = {};
    for (const t of oldEarned) {
      const userId = t.userId.toString();
      userExpiry[userId] = (userExpiry[userId] || 0) + t.amount;
    }

    // Check which users already had these points expired
    const expiredTransactions = allTransactions.filter((t) => t.type === "expired");
    const alreadyExpired: Record<string, number> = {};
    for (const t of expiredTransactions) {
      const userId = t.userId.toString();
      alreadyExpired[userId] = (alreadyExpired[userId] || 0) + Math.abs(t.amount);
    }

    // Process each user
    for (const [userIdStr, totalOldPoints] of Object.entries(userExpiry)) {
      const previouslyExpired = alreadyExpired[userIdStr] || 0;
      const toExpire = totalOldPoints - previouslyExpired;

      if (toExpire <= 0) continue;

      // Find the loyalty record
      const allLoyalty = await ctx.db.query("loyaltyPoints").collect();
      const loyalty = allLoyalty.find((l) => l.userId.toString() === userIdStr);
      if (!loyalty || loyalty.points <= 0) continue;

      const actualExpiry = Math.min(toExpire, loyalty.points);
      if (actualExpiry <= 0) continue;

      // Deduct points
      await ctx.db.patch(loyalty._id, {
        points: loyalty.points - actualExpiry,
        updatedAt: now,
      });

      // Log expiry transaction
      await ctx.db.insert("pointTransactions", {
        userId: loyalty.userId,
        amount: -actualExpiry,
        type: "expired",
        source: "system",
        description: `${actualExpiry} points expired (12-month rolling window)`,
        createdAt: now,
      });

      // Notify user
      await ctx.db.insert("notifications", {
        userId: loyalty.userId,
        type: "points_expired",
        title: "Points Expired",
        body: `${actualExpiry} loyalty points have expired. Earn more by scanning receipts!`,
        read: false,
        createdAt: now,
      });
    }
  },
});
