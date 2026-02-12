/**
 * Analytics Event Tracking
 *
 * Simple analytics utility for tracking user events in the Oja app.
 * Currently logs events to console for development.
 *
 * TODO: Integrate with analytics provider (Amplitude, Mixpanel, PostHog, etc.)
 *
 * Usage:
 *   import { trackEvent } from "@/lib/analytics/trackEvent";
 *   trackEvent("item_added", { item_name: "Milk", price: 1.50 });
 */

// =============================================================================
// TYPES
// =============================================================================

/**
 * Price source types for analytics
 */
export type AnalyticsPriceSource =
  | "personal"
  | "crowdsourced"
  | "ai"
  | "manual";

/**
 * All supported analytics event names
 */
export type AnalyticsEventName =
  // Item Events
  | "item_added_with_size"
  | "item_edited"
  // Store Comparison Events
  | "store_comparison_viewed"
  | "store_switch_initiated"
  | "store_switch_completed"
  | "store_switch_cancelled";

/**
 * Event properties for Item events
 */
export interface ItemAddedWithSizeProps {
  item_name: string;
  size: string;
  price: number;
  source: AnalyticsPriceSource;
  store_id: string;
  list_id: string;
}

export interface ItemEditedProps {
  item_name: string;
  size?: string;
  price: number;
  source: AnalyticsPriceSource;
  store_id: string;
  edit_type: "size" | "price" | "both";
}

/**
 * Event properties for Store Comparison events
 */
export interface StoreComparisonViewedProps {
  list_id: string;
  current_store_id: string;
  current_total: number;
  alternatives_count: number;
  best_savings: number;
}

export interface StoreSwitchInitiatedProps {
  list_id: string;
  old_store_id: string;
  new_store_id: string;
  potential_savings: number;
  items_count: number;
}

export interface StoreSwitchCompletedProps {
  list_id: string;
  old_store_id: string;
  new_store_id: string;
  savings_amount: number;
  items_switched: number;
  size_changes_count: number;
  manual_overrides_kept: number;
}

export interface StoreSwitchCancelledProps {
  list_id: string;
  old_store_id: string;
  new_store_id: string;
  potential_savings: number;
}

/**
 * Map of event names to their property types
 */
export interface AnalyticsEventMap {
  item_added_with_size: ItemAddedWithSizeProps;
  item_edited: ItemEditedProps;
  store_comparison_viewed: StoreComparisonViewedProps;
  store_switch_initiated: StoreSwitchInitiatedProps;
  store_switch_completed: StoreSwitchCompletedProps;
  store_switch_cancelled: StoreSwitchCancelledProps;
}

// =============================================================================
// CONFIGURATION
// =============================================================================

/**
 * Analytics configuration
 */
const config = {
  /** Enable console logging in development */
  enableConsoleLog: __DEV__,
  /** Prefix for console logs */
  logPrefix: "[Analytics]",
};

// =============================================================================
// MAIN TRACKING FUNCTION
// =============================================================================

/**
 * Track an analytics event with typed properties
 *
 * @param eventName - The name of the event to track
 * @param properties - Event properties (type-safe based on event name)
 *
 * @example
 * ```ts
 * trackEvent("size_selected", {
 *   item_name: "Semi-Skimmed Milk",
 *   size: "2L",
 *   price: 1.65,
 *   source: "personal",
 *   store_id: "tesco",
 * });
 * ```
 */
export function trackEvent<E extends AnalyticsEventName>(
  eventName: E,
  properties: AnalyticsEventMap[E]
): void {
  // Log to console in development
  if (config.enableConsoleLog) {
    console.log(
      `${config.logPrefix} ${eventName}`,
      JSON.stringify(properties, null, 2)
    );
  }

  // TODO: Send to analytics provider
  // Example integrations:
  //
  // Amplitude:
  // amplitude.track(eventName, properties);
  //
  // Mixpanel:
  // mixpanel.track(eventName, properties);
  //
  // PostHog:
  // posthog.capture(eventName, properties);
  //
  // Segment:
  // analytics.track(eventName, properties);
}

// =============================================================================
// CONVENIENCE FUNCTIONS
// =============================================================================

/**
 * Track when item is added with size selection
 */
export function trackItemAddedWithSize(
  itemName: string,
  size: string,
  price: number,
  source: AnalyticsPriceSource,
  storeId: string,
  listId: string
): void {
  trackEvent("item_added_with_size", {
    item_name: itemName,
    size,
    price,
    source,
    store_id: storeId,
    list_id: listId,
  });
}

/**
 * Track when item is edited
 */
export function trackItemEdited(
  itemName: string,
  price: number,
  source: AnalyticsPriceSource,
  storeId: string,
  editType: "size" | "price" | "both",
  size?: string
): void {
  trackEvent("item_edited", {
    item_name: itemName,
    size,
    price,
    source,
    store_id: storeId,
    edit_type: editType,
  });
}

/**
 * Track when store comparison section is viewed
 */
export function trackStoreComparisonViewed(
  listId: string,
  currentStoreId: string,
  currentTotal: number,
  alternativesCount: number,
  bestSavings: number
): void {
  trackEvent("store_comparison_viewed", {
    list_id: listId,
    current_store_id: currentStoreId,
    current_total: currentTotal,
    alternatives_count: alternativesCount,
    best_savings: bestSavings,
  });
}

/**
 * Track when user initiates a store switch (clicks switch button)
 */
export function trackStoreSwitchInitiated(
  listId: string,
  oldStoreId: string,
  newStoreId: string,
  potentialSavings: number,
  itemsCount: number
): void {
  trackEvent("store_switch_initiated", {
    list_id: listId,
    old_store_id: oldStoreId,
    new_store_id: newStoreId,
    potential_savings: potentialSavings,
    items_count: itemsCount,
  });
}

/**
 * Track when store switch is completed (user confirms)
 */
export function trackStoreSwitchCompleted(
  listId: string,
  oldStoreId: string,
  newStoreId: string,
  savingsAmount: number,
  itemsSwitched: number,
  sizeChangesCount: number,
  manualOverridesKept: number
): void {
  trackEvent("store_switch_completed", {
    list_id: listId,
    old_store_id: oldStoreId,
    new_store_id: newStoreId,
    savings_amount: savingsAmount,
    items_switched: itemsSwitched,
    size_changes_count: sizeChangesCount,
    manual_overrides_kept: manualOverridesKept,
  });
}

/**
 * Track when user cancels a store switch
 */
export function trackStoreSwitchCancelled(
  listId: string,
  oldStoreId: string,
  newStoreId: string,
  potentialSavings: number
): void {
  trackEvent("store_switch_cancelled", {
    list_id: listId,
    old_store_id: oldStoreId,
    new_store_id: newStoreId,
    potential_savings: potentialSavings,
  });
}
