/**
 * One-time migration: Convert all partner roles to "member".
 *
 * Run via: npx convex run migrations/simplifyPartnerRoles
 *
 * Safe to run multiple times (idempotent).
 *
 * Note: Approval fields were removed from the schema directly.
 * Any leftover approval data on existing rows is ignored by Convex
 * since those fields are no longer in the schema definition.
 */
import { internalMutation } from "../_generated/server";

export default internalMutation({
  args: {},
  handler: async (ctx) => {
    let partnersUpdated = 0;
    let inviteCodesUpdated = 0;

    // 1. Convert all listPartners to role: "member"
    const partners = await ctx.db.query("listPartners").collect();
    for (const p of partners) {
      if (p.role !== "member") {
        await ctx.db.patch(p._id, { role: "member" });
        partnersUpdated++;
      }
    }

    // 2. Convert active invite codes to role: "member"
    const inviteCodes = await ctx.db.query("inviteCodes").collect();
    for (const ic of inviteCodes) {
      if (ic.role !== "member") {
        await ctx.db.patch(ic._id, { role: "member" });
        inviteCodesUpdated++;
      }
    }

    return {
      partnersUpdated,
      inviteCodesUpdated,
    };
  },
});
