import { defineSchema } from "convex/server";
import { coreTables } from "./schema/core";
import { pricingTables } from "./schema/pricing";
import { collaborationTables } from "./schema/collaboration";
import { gamificationTables } from "./schema/gamification";
import { subscriptionTables } from "./schema/subscriptions";
import { analyticsTables } from "./schema/analytics";
import { adminTables } from "./schema/admin";
import { receiptTables } from "./schema/receipts";
import { contentTables } from "./schema/content";
import { experimentTables } from "./schema/experiments";
import { utilityTables } from "./schema/utils";

/**
 * Oja Database Schema
 * 
 * Modularized into domain-specific files in convex/schema/
 */
export default defineSchema({
  ...coreTables,
  ...pricingTables,
  ...collaborationTables,
  ...gamificationTables,
  ...subscriptionTables,
  ...analyticsTables,
  ...adminTables,
  ...receiptTables,
  ...contentTables,
  ...experimentTables,
  ...utilityTables,
});
