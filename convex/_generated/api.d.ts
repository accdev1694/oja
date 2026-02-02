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
import type * as crons from "../crons.js";
import type * as currentPrices from "../currentPrices.js";
import type * as http from "../http.js";
import type * as iconMapping from "../iconMapping.js";
import type * as insights from "../insights.js";
import type * as itemVariants from "../itemVariants.js";
import type * as lib_featureGating from "../lib/featureGating.js";
import type * as listItems from "../listItems.js";
import type * as notifications from "../notifications.js";
import type * as pantryItems from "../pantryItems.js";
import type * as partners from "../partners.js";
import type * as priceHistory from "../priceHistory.js";
import type * as receipts from "../receipts.js";
import type * as shoppingLists from "../shoppingLists.js";
import type * as stripe from "../stripe.js";
import type * as subscriptions from "../subscriptions.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  admin: typeof admin;
  ai: typeof ai;
  crons: typeof crons;
  currentPrices: typeof currentPrices;
  http: typeof http;
  iconMapping: typeof iconMapping;
  insights: typeof insights;
  itemVariants: typeof itemVariants;
  "lib/featureGating": typeof lib_featureGating;
  listItems: typeof listItems;
  notifications: typeof notifications;
  pantryItems: typeof pantryItems;
  partners: typeof partners;
  priceHistory: typeof priceHistory;
  receipts: typeof receipts;
  shoppingLists: typeof shoppingLists;
  stripe: typeof stripe;
  subscriptions: typeof subscriptions;
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
