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
import type * as ai from "../ai.js";
import type * as aiUsage from "../aiUsage.js";
import type * as analytics from "../analytics.js";
import type * as analytics_advanced from "../analytics_advanced.js";
import type * as cms from "../cms.js";
import type * as crons from "../crons.js";
import type * as currentPrices from "../currentPrices.js";
import type * as experiments from "../experiments.js";
import type * as http from "../http.js";
import type * as iconMapping from "../iconMapping.js";
import type * as impersonation from "../impersonation.js";
import type * as insights from "../insights.js";
import type * as itemSearch from "../itemSearch.js";
import type * as itemVariants from "../itemVariants.js";
import type * as lib_analytics from "../lib/analytics.js";
import type * as lib_communityHelpers from "../lib/communityHelpers.js";
import type * as lib_featureGating from "../lib/featureGating.js";
import type * as lib_fuzzyMatch from "../lib/fuzzyMatch.js";
import type * as lib_globalEnrichment from "../lib/globalEnrichment.js";
import type * as lib_priceBracketMatcher from "../lib/priceBracketMatcher.js";
import type * as lib_priceResolver from "../lib/priceResolver.js";
import type * as lib_receiptHelpers from "../lib/receiptHelpers.js";
import type * as lib_sizeUtils from "../lib/sizeUtils.js";
import type * as lib_storeNormalizer from "../lib/storeNormalizer.js";
import type * as lib_titleCase from "../lib/titleCase.js";
import type * as lib_voiceParser from "../lib/voiceParser.js";
import type * as lib_voiceTools from "../lib/voiceTools.js";
import type * as listItems from "../listItems.js";
import type * as migrations_backfillListNumbers from "../migrations/backfillListNumbers.js";
import type * as migrations_backfillListStores from "../migrations/backfillListStores.js";
import type * as migrations_grantAdminAccess from "../migrations/grantAdminAccess.js";
import type * as migrations_migrateAdminsToRBAC from "../migrations/migrateAdminsToRBAC.js";
import type * as migrations_rephraseItemNames from "../migrations/rephraseItemNames.js";
import type * as migrations_seedPricingConfig from "../migrations/seedPricingConfig.js";
import type * as migrations_seedRBAC from "../migrations/seedRBAC.js";
import type * as migrations_simplifyPartnerRoles from "../migrations/simplifyPartnerRoles.js";
import type * as migrations_titleCaseMigration from "../migrations/titleCaseMigration.js";
import type * as monitoring from "../monitoring.js";
import type * as notifications from "../notifications.js";
import type * as nurture from "../nurture.js";
import type * as pantryItems from "../pantryItems.js";
import type * as partners from "../partners.js";
import type * as priceHistory from "../priceHistory.js";
import type * as pricingConfig from "../pricingConfig.js";
import type * as receipts from "../receipts.js";
import type * as shoppingLists from "../shoppingLists.js";
import type * as stores from "../stores.js";
import type * as stripe from "../stripe.js";
import type * as subscriptions from "../subscriptions.js";
import type * as support from "../support.js";
import type * as tags from "../tags.js";
import type * as tips from "../tips.js";
import type * as users from "../users.js";
import type * as workflows from "../workflows.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  admin: typeof admin;
  ai: typeof ai;
  aiUsage: typeof aiUsage;
  analytics: typeof analytics;
  analytics_advanced: typeof analytics_advanced;
  cms: typeof cms;
  crons: typeof crons;
  currentPrices: typeof currentPrices;
  experiments: typeof experiments;
  http: typeof http;
  iconMapping: typeof iconMapping;
  impersonation: typeof impersonation;
  insights: typeof insights;
  itemSearch: typeof itemSearch;
  itemVariants: typeof itemVariants;
  "lib/analytics": typeof lib_analytics;
  "lib/communityHelpers": typeof lib_communityHelpers;
  "lib/featureGating": typeof lib_featureGating;
  "lib/fuzzyMatch": typeof lib_fuzzyMatch;
  "lib/globalEnrichment": typeof lib_globalEnrichment;
  "lib/priceBracketMatcher": typeof lib_priceBracketMatcher;
  "lib/priceResolver": typeof lib_priceResolver;
  "lib/receiptHelpers": typeof lib_receiptHelpers;
  "lib/sizeUtils": typeof lib_sizeUtils;
  "lib/storeNormalizer": typeof lib_storeNormalizer;
  "lib/titleCase": typeof lib_titleCase;
  "lib/voiceParser": typeof lib_voiceParser;
  "lib/voiceTools": typeof lib_voiceTools;
  listItems: typeof listItems;
  "migrations/backfillListNumbers": typeof migrations_backfillListNumbers;
  "migrations/backfillListStores": typeof migrations_backfillListStores;
  "migrations/grantAdminAccess": typeof migrations_grantAdminAccess;
  "migrations/migrateAdminsToRBAC": typeof migrations_migrateAdminsToRBAC;
  "migrations/rephraseItemNames": typeof migrations_rephraseItemNames;
  "migrations/seedPricingConfig": typeof migrations_seedPricingConfig;
  "migrations/seedRBAC": typeof migrations_seedRBAC;
  "migrations/simplifyPartnerRoles": typeof migrations_simplifyPartnerRoles;
  "migrations/titleCaseMigration": typeof migrations_titleCaseMigration;
  monitoring: typeof monitoring;
  notifications: typeof notifications;
  nurture: typeof nurture;
  pantryItems: typeof pantryItems;
  partners: typeof partners;
  priceHistory: typeof priceHistory;
  pricingConfig: typeof pricingConfig;
  receipts: typeof receipts;
  shoppingLists: typeof shoppingLists;
  stores: typeof stores;
  stripe: typeof stripe;
  subscriptions: typeof subscriptions;
  support: typeof support;
  tags: typeof tags;
  tips: typeof tips;
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
