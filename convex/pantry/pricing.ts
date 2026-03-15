import { mutation } from "../_generated/server";
import { requireUser } from "./helpers";
import { resolvePrice } from "../lib/priceResolver";

export const refreshPantryPrices = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await requireUser(ctx);

    const items = await ctx.db
      .query("pantryItems")
      .withIndex("by_user_status", (q) =>
        q.eq("userId", user._id).eq("status", "active")
      )
      .collect();

    let updated = 0;
    const defaultStore = user.storePreferences?.defaultStore;

    for (const item of items) {
      const normalizedName = item.name.toLowerCase().trim();

      const resolved = await resolvePrice(
        ctx,
        normalizedName,
        item.defaultSize,
        item.defaultUnit,
        undefined,
        defaultStore,
        user._id,
        item.lastPrice,
      );

      if (
        resolved.price !== null &&
        resolved.price !== undefined &&
        resolved.price !== item.lastPrice
      ) {
        await ctx.db.patch(item._id, {
          lastPrice: resolved.price,
          priceSource:
            resolved.priceSource === "personal"
              ? "receipt"
              : resolved.priceSource === "crowdsourced"
                ? "receipt"
                : "ai_estimate",
          updatedAt: Date.now(),
        });
        updated++;
      }
    }

    return { updated, total: items.length };
  },
});
