/**
 * Analytics Module
 *
 * Export all analytics-related utilities for tracking user events.
 */

export {
  // Core tracking function
  trackEvent,
  // Convenience functions
  trackItemAddedWithSize,
  trackItemEdited,
  trackStoreComparisonViewed,
  trackStoreSwitchInitiated,
  trackStoreSwitchCompleted,
  trackStoreSwitchCancelled,
  // Types
  type AnalyticsPriceSource,
  type AnalyticsEventName,
  type AnalyticsEventMap,
  type ItemAddedWithSizeProps,
  type ItemEditedProps,
  type StoreComparisonViewedProps,
  type StoreSwitchInitiatedProps,
  type StoreSwitchCompletedProps,
  type StoreSwitchCancelledProps,
} from "./trackEvent";
