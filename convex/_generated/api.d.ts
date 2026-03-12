/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as admin from "../admin.js";
import type * as admin_analytics from "../admin/analytics.js";
import type * as admin_catalog from "../admin/catalog.js";
import type * as admin_content from "../admin/content.js";
import type * as admin_filters from "../admin/filters.js";
import type * as admin_helpers from "../admin/helpers.js";
import type * as admin_index from "../admin/index.js";
import type * as admin_operations from "../admin/operations.js";
import type * as admin_preferences from "../admin/preferences.js";
import type * as admin_rbac from "../admin/rbac.js";
import type * as admin_receiptMgmt from "../admin/receiptMgmt.js";
import type * as admin_sessions from "../admin/sessions.js";
import type * as admin_userMgmt from "../admin/userMgmt.js";
import type * as admin_webhooks from "../admin/webhooks.js";
import type * as ai from "../ai.js";
import type * as aiUsage from "../aiUsage.js";
import type * as ai_health from "../ai/health.js";
import type * as ai_index from "../ai/index.js";
import type * as ai_pantry from "../ai/pantry.js";
import type * as ai_pricing from "../ai/pricing.js";
import type * as ai_shared from "../ai/shared.js";
import type * as ai_suggestions from "../ai/suggestions.js";
import type * as ai_vision from "../ai/vision.js";
import type * as ai_voice from "../ai/voice.js";
import type * as analytics from "../analytics.js";
import type * as analytics_advanced from "../analytics_advanced.js";
import type * as cms from "../cms.js";
import type * as crons from "../crons.js";
import type * as currentPrices from "../currentPrices.js";
import type * as currentPrices_comparison from "../currentPrices/comparison.js";
import type * as currentPrices_core from "../currentPrices/core.js";
import type * as currentPrices_index from "../currentPrices/index.js";
import type * as currentPrices_refresh from "../currentPrices/refresh.js";
import type * as debug from "../debug.js";
import type * as events from "../events.js";
import type * as experiments from "../experiments.js";
import type * as http from "../http.js";
import type * as iconMapping from "../iconMapping.js";
import type * as impersonation from "../impersonation.js";
import type * as insights from "../insights.js";
import type * as insights_challenges from "../insights/challenges.js";
import type * as insights_gamification from "../insights/gamification.js";
import type * as insights_helpers from "../insights/helpers.js";
import type * as insights_index from "../insights/index.js";
import type * as insights_monthlyTrends from "../insights/monthlyTrends.js";
import type * as insights_personalBests from "../insights/personalBests.js";
import type * as insights_weeklyDigest from "../insights/weeklyDigest.js";
import type * as itemMatching from "../itemMatching.js";
import type * as itemSearch from "../itemSearch.js";
import type * as itemVariants from "../itemVariants.js";
import type * as lib_alerts from "../lib/alerts.js";
import type * as lib_analytics from "../lib/analytics.js";
import type * as lib_auth from "../lib/auth.js";
import type * as lib_communityHelpers from "../lib/communityHelpers.js";
import type * as lib_featureGating from "../lib/featureGating.js";
import type * as lib_fuzzyMatch from "../lib/fuzzyMatch.js";
import type * as lib_globalEnrichment from "../lib/globalEnrichment.js";
import type * as lib_itemDeduplicator from "../lib/itemDeduplicator.js";
import type * as lib_itemMatcher from "../lib/itemMatcher.js";
import type * as lib_itemNameParser from "../lib/itemNameParser.js";
import type * as lib_priceBracketMatcher from "../lib/priceBracketMatcher.js";
import type * as lib_priceResolver from "../lib/priceResolver.js";
import type * as lib_priceValidator from "../lib/priceValidator.js";
import type * as lib_rateLimit from "../lib/rateLimit.js";
import type * as lib_receiptHelpers from "../lib/receiptHelpers.js";
import type * as lib_receiptValidation from "../lib/receiptValidation.js";
import type * as lib_siem from "../lib/siem.js";
import type * as lib_sizeUtils from "../lib/sizeUtils.js";
import type * as lib_storeNormalizer from "../lib/storeNormalizer.js";
import type * as lib_titleCase from "../lib/titleCase.js";
import type * as lib_voiceParser from "../lib/voiceParser.js";
import type * as lib_voice_declarations from "../lib/voice/declarations.js";
import type * as lib_voice_dispatcher from "../lib/voice/dispatcher.js";
import type * as lib_voice_index from "../lib/voice/index.js";
import type * as lib_voice_prompts from "../lib/voice/prompts.js";
import type * as lib_voice_readTools from "../lib/voice/readTools.js";
import type * as lib_voice_writeTools from "../lib/voice/writeTools.js";
import type * as listItems from "../listItems.js";
import type * as listItems_core from "../listItems/core.js";
import type * as listItems_helpers from "../listItems/helpers.js";
import type * as listItems_index from "../listItems/index.js";
import type * as listItems_pricing from "../listItems/pricing.js";
import type * as migrations_backfillListNumbers from "../migrations/backfillListNumbers.js";
import type * as migrations_backfillListStores from "../migrations/backfillListStores.js";
import type * as migrations_collapseShoppingModes from "../migrations/collapseShoppingModes.js";
import type * as migrations_grantAdminAccess from "../migrations/grantAdminAccess.js";
import type * as migrations_migrateAdminsToRBAC from "../migrations/migrateAdminsToRBAC.js";
import type * as migrations_migrateToPoints from "../migrations/migrateToPoints.js";
import type * as migrations_optimizeImages from "../migrations/optimizeImages.js";
import type * as migrations_pantryStatusBackfill from "../migrations/pantryStatusBackfill.js";
import type * as migrations_removeSeedReceipts from "../migrations/removeSeedReceipts.js";
import type * as migrations_rephraseItemNames from "../migrations/rephraseItemNames.js";
import type * as migrations_seedPricingConfig from "../migrations/seedPricingConfig.js";
import type * as migrations_seedRBAC from "../migrations/seedRBAC.js";
import type * as migrations_simplifyPartnerRoles from "../migrations/simplifyPartnerRoles.js";
import type * as migrations_titleCaseMigration from "../migrations/titleCaseMigration.js";
import type * as monitoring from "../monitoring.js";
import type * as notifications from "../notifications.js";
import type * as nurture from "../nurture.js";
import type * as pantryItems from "../pantryItems.js";
import type * as pantryReminders from "../pantryReminders.js";
import type * as pantry_core from "../pantry/core.js";
import type * as pantry_helpers from "../pantry/helpers.js";
import type * as pantry_index from "../pantry/index.js";
import type * as pantry_lifecycle from "../pantry/lifecycle.js";
import type * as pantry_restock from "../pantry/restock.js";
import type * as partners from "../partners.js";
import type * as personalization from "../personalization.js";
import type * as points from "../points.js";
import type * as priceHistory from "../priceHistory.js";
import type * as pricingConfig from "../pricingConfig.js";
import type * as receipts from "../receipts.js";
import type * as receipts_core from "../receipts/core.js";
import type * as receipts_index from "../receipts/index.js";
import type * as receipts_processing from "../receipts/processing.js";
import type * as receipts_utils from "../receipts/utils.js";
import type * as referrals from "../referrals.js";
import type * as schema_admin from "../schema/admin.js";
import type * as schema_analytics from "../schema/analytics.js";
import type * as schema_collaboration from "../schema/collaboration.js";
import type * as schema_content from "../schema/content.js";
import type * as schema_core from "../schema/core.js";
import type * as schema_experiments from "../schema/experiments.js";
import type * as schema_gamification from "../schema/gamification.js";
import type * as schema_pricing from "../schema/pricing.js";
import type * as schema_receipts from "../schema/receipts.js";
import type * as schema_subscriptions from "../schema/subscriptions.js";
import type * as schema_utils from "../schema/utils.js";
import type * as shoppingLists from "../shoppingLists.js";
import type * as shoppingLists_core from "../shoppingLists/core.js";
import type * as shoppingLists_health from "../shoppingLists/health.js";
import type * as shoppingLists_helpers from "../shoppingLists/helpers.js";
import type * as shoppingLists_index from "../shoppingLists/index.js";
import type * as shoppingLists_misc from "../shoppingLists/misc.js";
import type * as shoppingLists_sharing from "../shoppingLists/sharing.js";
import type * as shoppingLists_trip from "../shoppingLists/trip.js";
import type * as stores from "../stores.js";
import type * as stripe from "../stripe.js";
import type * as stripe_checkout from "../stripe/checkout.js";
import type * as stripe_credits from "../stripe/credits.js";
import type * as stripe_index from "../stripe/index.js";
import type * as stripe_webhooks from "../stripe/webhooks.js";
import type * as subscriptions from "../subscriptions.js";
import type * as support from "../support.js";
import type * as tags from "../tags.js";
import type * as tips from "../tips.js";
import type * as tutorialHints from "../tutorialHints.js";
import type * as users from "../users.js";
import type * as workflows from "../workflows.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  admin: typeof admin;
  "admin/analytics": typeof admin_analytics;
  "admin/catalog": typeof admin_catalog;
  "admin/content": typeof admin_content;
  "admin/filters": typeof admin_filters;
  "admin/helpers": typeof admin_helpers;
  "admin/index": typeof admin_index;
  "admin/operations": typeof admin_operations;
  "admin/preferences": typeof admin_preferences;
  "admin/rbac": typeof admin_rbac;
  "admin/receiptMgmt": typeof admin_receiptMgmt;
  "admin/sessions": typeof admin_sessions;
  "admin/userMgmt": typeof admin_userMgmt;
  "admin/webhooks": typeof admin_webhooks;
  ai: typeof ai;
  aiUsage: typeof aiUsage;
  "ai/health": typeof ai_health;
  "ai/index": typeof ai_index;
  "ai/pantry": typeof ai_pantry;
  "ai/pricing": typeof ai_pricing;
  "ai/shared": typeof ai_shared;
  "ai/suggestions": typeof ai_suggestions;
  "ai/vision": typeof ai_vision;
  "ai/voice": typeof ai_voice;
  analytics: typeof analytics;
  analytics_advanced: typeof analytics_advanced;
  cms: typeof cms;
  crons: typeof crons;
  currentPrices: typeof currentPrices;
  "currentPrices/comparison": typeof currentPrices_comparison;
  "currentPrices/core": typeof currentPrices_core;
  "currentPrices/index": typeof currentPrices_index;
  "currentPrices/refresh": typeof currentPrices_refresh;
  debug: typeof debug;
  events: typeof events;
  experiments: typeof experiments;
  http: typeof http;
  iconMapping: typeof iconMapping;
  impersonation: typeof impersonation;
  insights: typeof insights;
  "insights/challenges": typeof insights_challenges;
  "insights/gamification": typeof insights_gamification;
  "insights/helpers": typeof insights_helpers;
  "insights/index": typeof insights_index;
  "insights/monthlyTrends": typeof insights_monthlyTrends;
  "insights/personalBests": typeof insights_personalBests;
  "insights/weeklyDigest": typeof insights_weeklyDigest;
  itemMatching: typeof itemMatching;
  itemSearch: typeof itemSearch;
  itemVariants: typeof itemVariants;
  "lib/alerts": typeof lib_alerts;
  "lib/analytics": typeof lib_analytics;
  "lib/auth": typeof lib_auth;
  "lib/communityHelpers": typeof lib_communityHelpers;
  "lib/featureGating": typeof lib_featureGating;
  "lib/fuzzyMatch": typeof lib_fuzzyMatch;
  "lib/globalEnrichment": typeof lib_globalEnrichment;
  "lib/itemDeduplicator": typeof lib_itemDeduplicator;
  "lib/itemMatcher": typeof lib_itemMatcher;
  "lib/itemNameParser": typeof lib_itemNameParser;
  "lib/priceBracketMatcher": typeof lib_priceBracketMatcher;
  "lib/priceResolver": typeof lib_priceResolver;
  "lib/priceValidator": typeof lib_priceValidator;
  "lib/rateLimit": typeof lib_rateLimit;
  "lib/receiptHelpers": typeof lib_receiptHelpers;
  "lib/receiptValidation": typeof lib_receiptValidation;
  "lib/siem": typeof lib_siem;
  "lib/sizeUtils": typeof lib_sizeUtils;
  "lib/storeNormalizer": typeof lib_storeNormalizer;
  "lib/titleCase": typeof lib_titleCase;
  "lib/voiceParser": typeof lib_voiceParser;
  "lib/voice/declarations": typeof lib_voice_declarations;
  "lib/voice/dispatcher": typeof lib_voice_dispatcher;
  "lib/voice/index": typeof lib_voice_index;
  "lib/voice/prompts": typeof lib_voice_prompts;
  "lib/voice/readTools": typeof lib_voice_readTools;
  "lib/voice/writeTools": typeof lib_voice_writeTools;
  listItems: typeof listItems;
  "listItems/core": typeof listItems_core;
  "listItems/helpers": typeof listItems_helpers;
  "listItems/index": typeof listItems_index;
  "listItems/pricing": typeof listItems_pricing;
  "migrations/backfillListNumbers": typeof migrations_backfillListNumbers;
  "migrations/backfillListStores": typeof migrations_backfillListStores;
  "migrations/collapseShoppingModes": typeof migrations_collapseShoppingModes;
  "migrations/grantAdminAccess": typeof migrations_grantAdminAccess;
  "migrations/migrateAdminsToRBAC": typeof migrations_migrateAdminsToRBAC;
  "migrations/migrateToPoints": typeof migrations_migrateToPoints;
  "migrations/optimizeImages": typeof migrations_optimizeImages;
  "migrations/pantryStatusBackfill": typeof migrations_pantryStatusBackfill;
  "migrations/removeSeedReceipts": typeof migrations_removeSeedReceipts;
  "migrations/rephraseItemNames": typeof migrations_rephraseItemNames;
  "migrations/seedPricingConfig": typeof migrations_seedPricingConfig;
  "migrations/seedRBAC": typeof migrations_seedRBAC;
  "migrations/simplifyPartnerRoles": typeof migrations_simplifyPartnerRoles;
  "migrations/titleCaseMigration": typeof migrations_titleCaseMigration;
  monitoring: typeof monitoring;
  notifications: typeof notifications;
  nurture: typeof nurture;
  pantryItems: typeof pantryItems;
  pantryReminders: typeof pantryReminders;
  "pantry/core": typeof pantry_core;
  "pantry/helpers": typeof pantry_helpers;
  "pantry/index": typeof pantry_index;
  "pantry/lifecycle": typeof pantry_lifecycle;
  "pantry/restock": typeof pantry_restock;
  partners: typeof partners;
  personalization: typeof personalization;
  points: typeof points;
  priceHistory: typeof priceHistory;
  pricingConfig: typeof pricingConfig;
  receipts: typeof receipts;
  "receipts/core": typeof receipts_core;
  "receipts/index": typeof receipts_index;
  "receipts/processing": typeof receipts_processing;
  "receipts/utils": typeof receipts_utils;
  referrals: typeof referrals;
  "schema/admin": typeof schema_admin;
  "schema/analytics": typeof schema_analytics;
  "schema/collaboration": typeof schema_collaboration;
  "schema/content": typeof schema_content;
  "schema/core": typeof schema_core;
  "schema/experiments": typeof schema_experiments;
  "schema/gamification": typeof schema_gamification;
  "schema/pricing": typeof schema_pricing;
  "schema/receipts": typeof schema_receipts;
  "schema/subscriptions": typeof schema_subscriptions;
  "schema/utils": typeof schema_utils;
  shoppingLists: typeof shoppingLists;
  "shoppingLists/core": typeof shoppingLists_core;
  "shoppingLists/health": typeof shoppingLists_health;
  "shoppingLists/helpers": typeof shoppingLists_helpers;
  "shoppingLists/index": typeof shoppingLists_index;
  "shoppingLists/misc": typeof shoppingLists_misc;
  "shoppingLists/sharing": typeof shoppingLists_sharing;
  "shoppingLists/trip": typeof shoppingLists_trip;
  stores: typeof stores;
  stripe: typeof stripe;
  "stripe/checkout": typeof stripe_checkout;
  "stripe/credits": typeof stripe_credits;
  "stripe/index": typeof stripe_index;
  "stripe/webhooks": typeof stripe_webhooks;
  subscriptions: typeof subscriptions;
  support: typeof support;
  tags: typeof tags;
  tips: typeof tips;
  tutorialHints: typeof tutorialHints;
  users: typeof users;
  workflows: typeof workflows;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
