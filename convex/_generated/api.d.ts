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
import type * as crons from "../crons.js";
import type * as currentPrices from "../currentPrices.js";
import type * as http from "../http.js";
import type * as iconMapping from "../iconMapping.js";
import type * as insights from "../insights.js";
import type * as itemSearch from "../itemSearch.js";
import type * as itemVariants from "../itemVariants.js";
import type * as lib_communityHelpers from "../lib/communityHelpers.js";
import type * as lib_featureGating from "../lib/featureGating.js";
import type * as lib_fuzzyMatch from "../lib/fuzzyMatch.js";
import type * as lib_globalEnrichment from "../lib/globalEnrichment.js";
import type * as lib_priceBracketMatcher from "../lib/priceBracketMatcher.js";
import type * as lib_priceResolver from "../lib/priceResolver.js";
import type * as lib_receiptHelpers from "../lib/receiptHelpers.js";
import type * as lib_sizeUtils from "../lib/sizeUtils.js";
import type * as lib_storeNormalizer from "../lib/storeNormalizer.js";
import type * as lib_voiceParser from "../lib/voiceParser.js";
import type * as lib_voiceTools from "../lib/voiceTools.js";
import type * as listItems from "../listItems.js";
import type * as migrations_backfillListStores from "../migrations/backfillListStores.js";
import type * as migrations_rephraseItemNames from "../migrations/rephraseItemNames.js";
import type * as notifications from "../notifications.js";
import type * as nurture from "../nurture.js";
import type * as pantryItems from "../pantryItems.js";
import type * as partners from "../partners.js";
import type * as priceHistory from "../priceHistory.js";
import type * as receipts from "../receipts.js";
import type * as shoppingLists from "../shoppingLists.js";
import type * as stores from "../stores.js";
import type * as stripe from "../stripe.js";
import type * as subscriptions from "../subscriptions.js";
import type * as tips from "../tips.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  admin: typeof admin;
  ai: typeof ai;
  aiUsage: typeof aiUsage;
  crons: typeof crons;
  currentPrices: typeof currentPrices;
  http: typeof http;
  iconMapping: typeof iconMapping;
  insights: typeof insights;
  itemSearch: typeof itemSearch;
  itemVariants: typeof itemVariants;
  "lib/communityHelpers": typeof lib_communityHelpers;
  "lib/featureGating": typeof lib_featureGating;
  "lib/fuzzyMatch": typeof lib_fuzzyMatch;
  "lib/globalEnrichment": typeof lib_globalEnrichment;
  "lib/priceBracketMatcher": typeof lib_priceBracketMatcher;
  "lib/priceResolver": typeof lib_priceResolver;
  "lib/receiptHelpers": typeof lib_receiptHelpers;
  "lib/sizeUtils": typeof lib_sizeUtils;
  "lib/storeNormalizer": typeof lib_storeNormalizer;
  "lib/voiceParser": typeof lib_voiceParser;
  "lib/voiceTools": typeof lib_voiceTools;
  listItems: typeof listItems;
  "migrations/backfillListStores": typeof migrations_backfillListStores;
  "migrations/rephraseItemNames": typeof migrations_rephraseItemNames;
  notifications: typeof notifications;
  nurture: typeof nurture;
  pantryItems: typeof pantryItems;
  partners: typeof partners;
  priceHistory: typeof priceHistory;
  receipts: typeof receipts;
  shoppingLists: typeof shoppingLists;
  stores: typeof stores;
  stripe: typeof stripe;
  subscriptions: typeof subscriptions;
  tips: typeof tips;
  users: typeof users;
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
