/**
 * One-time migration to seed initial pricing configuration
 *
 * Run from Convex Dashboard → Functions → seedPricingConfig:seedPricing
 *
 * This replaces hard-coded subscription prices with dynamic config.
 */
import { internalMutation } from "../_generated/server";

/**
 * Seed pricing configuration with current prices
 */
export const seedPricing = internalMutation({
  args: {},
  handler: async (ctx) => {
    console.log("[seedPricingConfig] Starting pricing config seed...");

    // Check if pricing already exists
    const existing = await ctx.db.query("pricingConfig").collect();

    if (existing.length > 0) {
      console.log("[seedPricingConfig] Pricing config already exists, skipping seed");
      return {
        success: true,
        message: "Pricing config already seeded",
        count: existing.length,
      };
    }

    const now = Date.now();

    // Seed monthly plan pricing
    await ctx.db.insert("pricingConfig", {
      planId: "premium_monthly",
      displayName: "Premium Monthly",
      priceAmount: 2.99,
      currency: "GBP",
      isActive: true,
      updatedAt: now,
    });

    // Seed annual plan pricing
    await ctx.db.insert("pricingConfig", {
      planId: "premium_annual",
      displayName: "Premium Annual",
      priceAmount: 21.99,
      currency: "GBP",
      isActive: true,
      updatedAt: now,
    });

    console.log("[seedPricingConfig] Successfully seeded pricing config");
    return {
      success: true,
      message: "Pricing config seeded successfully",
      plans: ["premium_monthly: £2.99", "premium_annual: £21.99"],
    };
  },
});
