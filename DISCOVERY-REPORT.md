# Discovery Report: Subscription, Payments & Rewards System Overhaul

## Executive Summary
This report outlines the current state of Oja's subscription, payments, and rewards system based on a codebase audit conducted on 2026-03-02. The codebase contains a partially implemented cash-credit model that needs to be migrated to the new points-based rewards system. Some "loyaltyPoints" structures exist, but the new system will use "pointsBalance" and "pointsTransactions" to clearly delineate from the legacy system.

## Reusable Components
* **`subscriptions` table:** Fully functional and tracks Stripe subscription status.
* **`pricingConfig` table:** Can be reused for any dynamic pricing needs.
* **Stripe webhook infrastructure:** `convex/stripe.ts` is well-structured and already handles `checkout.session.completed`, `customer.subscription.updated`, and `customer.subscription.deleted`.
* **Tier calculation logic:** The threshold logic in `convex/lib/featureGating.ts` (`getTierFromScans`, `getNextTierInfo`) is solid and can be adapted to points.
* **`featureGating.ts` structure:** The framework for checking limits (`canCreateList`, `canAddPantryItem`) is excellent and just needs the new values.

## Needs Migration
* **`scanCredits` table:** Contains the legacy cash balances. Needs migration to the new points system (£1 = 1,000 points).
* **Current Free Tier Limits:** Need to be updated in `getFreeFeatures()`:
  * `maxLists`: 3 -> 2
  * `maxPantryItems`: 50 -> 30
  * `maxReceiptScans`: 3 -> Unlimited (but only 1 point-earning scan)
  * `maxVoiceRequests`: 20 -> 10

## Needs Replacement
* **`earnScanCredit` mutation:** Needs to be replaced by `earnPoints`.
* **`getScanCredits` query:** Needs to be replaced by `getPointsBalance`.
* **`getAndMarkScanCredits` (Stripe integration):** The invoice deduction logic needs to be rewritten to deduct points instead of cash credits.
* **UI in `app/(app)/subscription.tsx`:** Must be entirely overhauled to display points instead of cash.

## Net New Features
* **`pointsBalance` & `pointsTransactions` tables:** For the new robust points system.
* **`receiptHashes` table:** For duplicate receipt detection.
* **Fraud validation library (`convex/lib/receiptValidation.ts`):** Deduplication, OCR confidence, date validation, store validation, price validation, and rate limiting.
* **Points History Page (`app/(app)/points-history.tsx`).**
* **Limit Wall Modals:** For Pantry, Lists, and Earning Scans.
* **Gamification & Retention:** Streak bonuses, referral program, seasonal events.
* **Admin Dashboard Additions:** Points Economics Dashboard, Fraud Alerts, Manual Point Adjustment tools.

## Risk Assessment
* **Stripe Integration (High Risk):** Modifying the `invoice.created` webhook to apply negative invoice items based on points is critical. If it fails, users won't get their discounts. Needs extensive testing.
* **Migration (Medium Risk):** Converting `scanCredits` to `pointsBalance` needs to be accurate to prevent user complaints.
* **Fraud Prevention Constraints (Medium Risk):** If the fraud validation is too strict, legitimate users might be blocked from earning points, leading to frustration.

## Recommendation
Proceed with **Option A (Incremental migration)** or **Option B (Big bang replacement)** as decided by the team. Given the scope, a big bang replacement might be cleaner since the current cash-credit system appears to be partially active and transitioning directly to points will avoid maintaining two parallel economic systems.
