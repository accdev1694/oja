# Oja E2E Testing Strategy

> Comprehensive end-to-end testing plan organized by feature, implemented with **Playwright** against **Expo Web**.

**Execution order matters.** Tests are sequenced so that each feature section assumes the prior section's tests have passed. This creates a chain: Authentication -> Onboarding -> Pantry -> Shopping Lists -> List Items & Prices -> Receipt Scanning -> Budget & Price Intelligence -> Gamification & Insights -> Partner Mode -> Profile & Account -> Subscription & Payments -> Admin -> Cross-Cutting Concerns.

---

## Running the Tests

```bash
# Prerequisites
# 1. Copy e2e/.env.e2e.example to .env.e2e and fill in test credentials
# 2. Start Convex dev server: npx convex dev
# 3. Playwright auto-starts Expo Web, or start manually: npx expo start --web

# Run all E2E tests (headless)
npm run e2e

# Run with Playwright UI (monitor in browser — recommended)
npm run e2e:ui

# Run in debug mode (step through tests)
npm run e2e:debug

# View HTML test report after run
npm run e2e:report

# Run a single spec file
npx playwright test e2e/tests/03-pantry.spec.ts

# Run tests matching a pattern
npx playwright test -g "pantry"
```

### File Structure

```
e2e/
├── .auth/                    # Saved auth state (gitignored)
├── .env.e2e.example          # Env template for test credentials
├── fixtures/
│   ├── auth.setup.ts         # Auth setup project (runs first)
│   └── base.ts               # Shared helpers & custom fixtures
├── pages/                    # Page Object Models
│   ├── SignInPage.ts
│   ├── OnboardingPage.ts
│   ├── PantryPage.ts
│   ├── ListsPage.ts
│   ├── ListDetailPage.ts
│   ├── ScanPage.ts
│   └── ProfilePage.ts
└── tests/                    # Spec files (run in order)
    ├── 01-authentication.spec.ts
    ├── 02-onboarding.spec.ts
    ├── 03-pantry.spec.ts
    ├── 04-shopping-lists.spec.ts
    ├── 05-list-items.spec.ts
    ├── 06-receipt-scanning.spec.ts
    ├── 07-budget-prices.spec.ts
    ├── 08-gamification-insights.spec.ts
    ├── 09-partner-mode.spec.ts
    ├── 10-profile.spec.ts
    ├── 11-subscription.spec.ts
    ├── 12-admin.spec.ts
    └── 13-cross-cutting.spec.ts
```

### Web Testing Notes

- Tests run against Expo Web (`localhost:8081`) via Chromium
- React Native Web maps `testID` to `data-testid` — currently using text/placeholder locators
- Native features (haptics, camera, gestures) are stubbed/skipped on web
- Swipe gestures tested via click-based alternatives
- Receipt scanning tests verify UI states; actual AI parsing needs mock/test images

---

## Table of Contents

1. [Authentication](#1-authentication)
2. [Onboarding](#2-onboarding)
3. [Pantry Tracker](#3-pantry-tracker)
4. [Shopping Lists](#4-shopping-lists)
5. [List Items & Price Intelligence](#5-list-items--price-intelligence)
6. [Receipt Scanning](#6-receipt-scanning)
7. [Budget Tracking & Price Cascade](#7-budget-tracking--price-cascade)
8. [Gamification & Insights](#8-gamification--insights)
9. [Partner Mode & Collaboration](#9-partner-mode--collaboration)
10. [Profile & Account Management](#10-profile--account-management)
11. [Subscription & Payments](#11-subscription--payments)
12. [Admin Dashboard](#12-admin-dashboard)
13. [Cross-Cutting Concerns](#13-cross-cutting-concerns)

---

## 1. Authentication

**Spec file:** `e2e/tests/01-authentication.spec.ts`
**Depends on:** Nothing (entry point)
**Feeds into:** Onboarding (new user) or Pantry (returning user)

**Key files:** `app/(auth)/sign-in.tsx`, `app/(auth)/sign-up.tsx`, `convex/users.ts`

### Sign Up

- [ ] **1.1** Navigate to sign-up screen from welcome/landing
- [ ] **1.2** Create account with valid email + password — verify success redirect
- [ ] **1.3** Create account with invalid email format — verify inline validation error
- [ ] **1.4** Create account with weak password — verify password strength feedback
- [ ] **1.5** Create account with duplicate email — verify "already exists" error
- [ ] **1.6** Sign up with Google OAuth — verify Clerk OAuth flow completes and user record created in Convex via `getOrCreate()`
- [ ] **1.7** Sign up with Apple OAuth — verify same flow as Google
- [ ] **1.8** Verify OTP email delivery and successful verification
- [ ] **1.9** Verify Convex user record created after first sign-in (`users.getOrCreate()`)

### Sign In

- [ ] **1.10** Sign in with valid credentials — verify redirect to `/(app)/(tabs)`
- [ ] **1.11** Sign in with wrong password — verify error message, no redirect
- [ ] **1.12** Sign in with non-existent email — verify error message
- [ ] **1.13** Sign in with Google OAuth (existing account) — verify session restored
- [ ] **1.14** Sign in with Apple OAuth (existing account) — verify session restored

### Session & Guards

- [ ] **1.15** Unauthenticated user accessing `/(app)/*` — verify redirect to `/(auth)/sign-in`
- [ ] **1.16** Authenticated user accessing `/(auth)/*` — verify redirect to app home
- [ ] **1.17** Session expiry — verify graceful re-auth prompt (no crash)
- [ ] **1.18** New user (onboarding incomplete) — verify redirect to `/onboarding/welcome` instead of tabs

**Connection to next section:** Successful sign-up of a new user triggers the onboarding flow.

---

## 2. Onboarding

**Spec file:** `e2e/tests/02-onboarding.spec.ts`
**Depends on:** Authentication (new user signed up)
**Feeds into:** Pantry (seeded with AI items)

**Key files:** `app/onboarding/welcome.tsx`, `app/onboarding/cuisine-selection.tsx`, `app/onboarding/pantry-seeding.tsx`, `app/onboarding/review-items.tsx`, `convex/users.ts`, `convex/pantryItems.ts`, `convex/ai.ts`

### Welcome Screen

- [ ] **2.1** New user sees welcome screen with feature highlights
- [ ] **2.2** Tap "Get Started" navigates to cuisine selection
- [ ] **2.3** Back button / swipe back returns to welcome (no crash)

### Cuisine Selection

- [ ] **2.4** Display cuisine options — verify at least 8 cuisines shown
- [ ] **2.5** Select 1-3 cuisines — verify selection state toggles visually
- [ ] **2.6** Deselect a cuisine — verify toggle off
- [ ] **2.7** Proceed with 0 cuisines selected — verify validation or default behavior
- [ ] **2.8** Tap "Continue" — calls `setOnboardingData()` with selected cuisines

### AI Pantry Seeding

- [ ] **2.9** After cuisine selection, AI generates seed items — verify loading state shown
- [ ] **2.10** Verify AI returns items (target ~100-200) with name, category, price context
- [ ] **2.11** Verify no duplicate items in seed response (dedup by normalized name)
- [ ] **2.12** Verify all seeded items have a price estimate (zero-blank invariant)
- [ ] **2.13** Verify items have valid icons assigned (no crash on invalid icon name)
- [ ] **2.14** AI failure (Gemini down) — verify OpenAI fallback kicks in
- [ ] **2.15** Both AI providers fail — verify graceful error with retry option

### Review & Edit Items

- [ ] **2.16** Review screen shows all generated items grouped by category
- [ ] **2.17** Edit item name before saving — verify change persists
- [ ] **2.18** Change item category before saving — verify category update
- [ ] **2.19** Change item stock level before saving — verify stock level update
- [ ] **2.20** Remove item from seed list — verify item excluded from save
- [ ] **2.21** Confirm save — calls `bulkCreate()` with all remaining items
- [ ] **2.22** Verify `completeOnboarding()` marks user as onboarded
- [ ] **2.23** After save, redirect to Pantry (home tab) — not back to onboarding
- [ ] **2.24** Revisiting `/onboarding/*` after completion — redirects to app home

**Connection to next section:** Pantry is now populated with AI-seeded items. All subsequent tests use this seeded state.

---

## 3. Pantry Tracker

**Spec file:** `e2e/tests/03-pantry.spec.ts`
**Depends on:** Onboarding (pantry has seeded items)
**Feeds into:** Shopping Lists (items added from pantry), Receipt Scanning (auto-restock)

**Key files:** `app/(app)/(tabs)/index.tsx`, `convex/pantryItems.ts`, `components/pantry/PantryItemCard.tsx`

### Default View — Needs Restocking Tab

- [ ] **3.1** First load shows "Needs Restocking" tab as default
- [ ] **3.2** Only Low and Out stock items displayed in this tab
- [ ] **3.3** Badge count matches number of Low + Out items
- [ ] **3.4** Journey banner visible: "X items out of stock — add to your next list?"
- [ ] **3.5** Banner CTA taps navigates to list creation or adds to active list
- [ ] **3.6** Empty state shown when no items need restocking

### All Items Tab

- [ ] **3.7** Switch to "All Items" tab — shows all pantry items
- [ ] **3.8** Items grouped by category with collapsible section headers
- [ ] **3.9** Collapse/expand category sections — verify animation and state
- [ ] **3.10** Each item shows: icon, name, stock level badge, price with confidence label
- [ ] **3.11** Search bar filters items by name — verify real-time filtering
- [ ] **3.12** Search with no results — verify "no items found" state
- [ ] **3.13** Clear search — verify all items return

### Stock Level Swipe Gestures

- [ ] **3.14** First swipe ever — gesture onboarding overlay appears (animated hand)
- [ ] **3.15** Perform first swipe — overlay dismisses permanently (AsyncStorage flag set)
- [ ] **3.16** Swipe left on Stocked item — stock changes to Low
- [ ] **3.17** Swipe left on Low item — stock changes to Out
- [ ] **3.18** Swipe right on Out item — stock changes to Low
- [ ] **3.19** Swipe right on Low item — stock changes to Stocked
- [ ] **3.20** Each swipe triggers haptic feedback
- [ ] **3.21** Swipe item to Out — auto-add to active shopping list triggered
- [ ] **3.22** Auto-add shows fly-to-list animation + burst toast confirmation
- [ ] **3.23** Auto-add when no active list — prompts to create one
- [ ] **3.24** Verify `updateStockLevel()` mutation called on each swipe

### Stock Level Filter (All Items Tab)

- [ ] **3.25** Open filter modal — shows Stocked / Low / Out toggles
- [ ] **3.26** Toggle off "Stocked" — only Low and Out items shown
- [ ] **3.27** Toggle off all — empty state or all hidden
- [ ] **3.28** "Show All" button resets filters
- [ ] **3.29** Filter persists during tab session

### Add New Item

- [ ] **3.30** Tap "+" button — add item modal appears
- [ ] **3.31** Enter item name + select category + stock level — verify all fields required
- [ ] **3.32** Submit — calls `create()` mutation, item appears in list
- [ ] **3.33** New item gets auto-assigned icon based on name + category
- [ ] **3.34** New item has price from AI estimate (zero-blank)
- [ ] **3.35** Free plan: adding 51st item — shows limit alert with upgrade prompt
- [ ] **3.36** Duplicate item name — verify handling (allow or warn)

### Remove Item

- [ ] **3.37** Tap remove button on item — confirmation alert appears
- [ ] **3.38** Confirm removal — item deleted via `removePantryItem()`
- [ ] **3.39** Cancel removal — item stays
- [ ] **3.40** Verify removed item no longer shows in any tab or search

### Add to List (from Pantry)

- [ ] **3.41** Tap "Add to List" on item with 1 active list — item added directly
- [ ] **3.42** Tap "Add to List" with 2+ active lists — list picker modal appears
- [ ] **3.43** Select list from picker — item added with `lastPrice` as `estimatedPrice`
- [ ] **3.44** Tap "Add to List" with 0 active lists — create list prompt shown
- [ ] **3.45** Verify price from pantry item flows to list item (no blank price)
- [ ] **3.46** Verify haptic feedback on add action

### Price Display on Pantry Items

- [ ] **3.47** Item with AI estimate only — shows "~£X.XX est."
- [ ] **3.48** Item with 1-2 receipt reports — shows "£X.XX at StoreName"
- [ ] **3.49** Item with 3-9 reports — shows "£X.XX avg"
- [ ] **3.50** Item with 10+ reports — shows "£X.XX" (no qualifier)
- [ ] **3.51** Every visible item has a non-null price displayed (zero-blank invariant)

**Connection to next section:** Pantry items are added to shopping lists. The "Add to List" flow bridges Pantry -> Shopping Lists.

---

## 4. Shopping Lists

**Spec file:** `e2e/tests/04-shopping-lists.spec.ts`
**Depends on:** Pantry (items to add to lists)
**Feeds into:** List Items (managing items within a list), Budget Tracking

**Key files:** `app/(app)/(tabs)/lists.tsx`, `convex/shoppingLists.ts`

### Active Lists Tab

- [ ] **4.1** Lists tab shows "Active" section by default
- [ ] **4.2** Active lists display: name, status badge (Planning/Shopping), budget, estimated cost, item count, date
- [ ] **4.3** Budget color coding: green (healthy), orange (caution), red (exceeded)
- [ ] **4.4** Friendly date names: "Today's Shop", "Yesterday's Shop", etc.
- [ ] **4.5** "Shared With Me" section visible when partner lists exist
- [ ] **4.6** "Join a shared list" card visible

### Create New List

- [ ] **4.7** Tap "New List" — create list modal appears
- [ ] **4.8** Default name is current date — verify auto-population
- [ ] **4.9** Enter custom name + optional budget — create successfully
- [ ] **4.10** Budget validation: must be >= 0
- [ ] **4.11** Free plan: creating 4th active list — limit error with upgrade prompt
- [ ] **4.12** New list appears in Active tab with "Planning" badge
- [ ] **4.13** Tap new list card — navigates to `/list/[id]`

### List Card Interactions

- [ ] **4.14** Tap list card — navigates to list detail screen
- [ ] **4.15** Delete list — confirmation alert, then `remove()` called
- [ ] **4.16** Cancel delete — list stays

### History Tab

- [ ] **4.17** Switch to History tab — shows completed/archived lists
- [ ] **4.18** Trip cards show: completion date, savings/overspend, store name, points earned
- [ ] **4.19** History items sorted by most recent first
- [ ] **4.20** Empty history — shows empty state with encouragement copy

### Shopping Mode Transitions

- [ ] **4.21** Start shopping on a list — status changes to "Shopping", `startShopping()` called
- [ ] **4.22** Complete shopping — `completeShopping(actualTotal)` called, savings calculated
- [ ] **4.23** Completed list moves from Active to History
- [ ] **4.24** Archive list — `archiveList()` called, list hidden from Active

**Connection to next section:** Opening a list leads to the List Detail screen where items are managed with price intelligence.

---

## 5. List Items & Price Intelligence

**Spec file:** `e2e/tests/05-list-items.spec.ts`
**Depends on:** Shopping Lists (list exists), Pantry (items to add)
**Feeds into:** Budget Tracking (prices affect dial), Receipt Scanning (reconciliation)

**Key files:** `app/(app)/list/[id].tsx`, `convex/listItems.ts`, `convex/itemVariants.ts`, `convex/currentPrices.ts`

### List Detail Screen Layout

- [ ] **5.1** Header shows list name, status badge, budget dial (circular progress)
- [ ] **5.2** Budget dial shows estimated total vs budget visually
- [ ] **5.3** Sentiment message below dial: "Looking good — lots of room left" (under budget) / "Getting close" (near budget) / "Over budget" (exceeded)
- [ ] **5.4** Category filter chips shown for active categories
- [ ] **5.5** Items displayed with: checkbox, name, quantity, price + confidence label, priority

### Add Item to List

- [ ] **5.6** Tap add item — input appears
- [ ] **5.7** Type item name — auto-suggestions from pantry shown
- [ ] **5.8** Select suggestion — item added with pantry price
- [ ] **5.9** Type unknown item — triggers real-time AI `estimateItemPrice()`
- [ ] **5.10** AI estimate returns — item added with "~£X.XX est." label
- [ ] **5.11** Every added item has a non-null price (zero-blank invariant)

### Variant Picker

- [ ] **5.12** Add "milk" (item with variants) — variant picker modal appears
- [ ] **5.13** Picker shows 3-5 size variants with prices: "Whole Milk 2 Pints £1.20", "4 Pints £2.10"
- [ ] **5.14** "Your usual" star badge shown on previously selected variant
- [ ] **5.15** "Not sure" option available — uses base-item average price
- [ ] **5.16** Select variant — price and size set on list item
- [ ] **5.17** Add "milk" again later — auto-selects preferred variant, no picker shown
- [ ] **5.18** Preferred variant stored via `setPreferredVariant()`

### Price Confidence Labels on List Items

- [ ] **5.19** AI-only price — displays "~£1.50 est."
- [ ] **5.20** 1-2 receipt reports — displays "£1.50 at Aldi"
- [ ] **5.21** 3-9 reports — displays "£1.50 avg"
- [ ] **5.22** 10+ reports — displays "£1.50" (no qualifier)

### Check Off Items (Shopping Mode)

- [ ] **5.23** Tap checkbox on item — green border flash animation (600ms)
- [ ] **5.24** Haptic feedback on check-off (micro-celebration)
- [ ] **5.25** Budget dial updates in real-time (blended: actual for checked + estimated for unchecked)
- [ ] **5.26** Checked item visually distinguished (strikethrough or dimmed)
- [ ] **5.27** Uncheck item — reverts visual state and budget calculation
- [ ] **5.28** Optimistic update — UI responds instantly before server confirms

### Edit & Delete Items

- [ ] **5.29** Tap item to open edit modal — change name, quantity, price, priority
- [ ] **5.30** Priority options: must-have, should-have, nice-to-have
- [ ] **5.31** Swipe item to reveal delete — confirmation, then `remove()` called
- [ ] **5.32** Delete item — budget dial updates immediately

### Add Item Mid-Shop

- [ ] **5.33** While in "Shopping" status, add new item — `addItemMidShop()` called
- [ ] **5.34** New mid-shop item gets price estimate before insertion
- [ ] **5.35** Budget dial recalculates with new item included

### Category Filtering

- [ ] **5.36** Tap category chip — filters list to that category only
- [ ] **5.37** Tap again to deselect — all items shown
- [ ] **5.38** Multiple categories selectable (if supported)

**Connection to next section:** Scanning a receipt populates prices that feed back into list items and the budget dial.

---

## 6. Receipt Scanning

**Spec file:** `e2e/tests/06-receipt-scanning.spec.ts`
**Depends on:** Shopping Lists (optional list link), Pantry (auto-restock target)
**Feeds into:** Price Intelligence (prices populate cascade), Gamification (scan credits/streaks), Pantry (auto-restock)

**Key files:** `app/(app)/(tabs)/scan.tsx`, `app/(app)/receipt/[id]/confirm.tsx`, `convex/receipts.ts`, `convex/ai.ts`, `convex/priceHistory.ts`, `convex/currentPrices.ts`

### Scan Screen — Default State

- [ ] **6.1** Scan tab shows camera icon + "Tips for best results" card
- [ ] **6.2** "Link to shopping list" selector visible with active lists
- [ ] **6.3** Select a list to link — shows "Linked to: [List Name]"
- [ ] **6.4** Two action buttons: "Take Photo" and "Choose from Library"

### Camera & Photo Permissions

- [ ] **6.5** First time tapping "Take Photo" — camera permission requested
- [ ] **6.6** Permission granted — camera opens
- [ ] **6.7** Permission denied — shows settings redirect message
- [ ] **6.8** "Choose from Library" — photo library permission requested
- [ ] **6.9** Select photo from library — shows preview

### Preview Mode

- [ ] **6.10** After photo taken/selected — full-screen preview shown
- [ ] **6.11** "Retake" button clears image, returns to scan screen
- [ ] **6.12** "Use Photo" button starts upload

### Upload & AI Parsing

- [ ] **6.13** "Use Photo" tapped — loading spinner with "Reading your receipt..."
- [ ] **6.14** Info card shown during parsing: "AI is extracting items..."
- [ ] **6.15** Cancel button available — deletes pending receipt, resets state
- [ ] **6.16** Upload calls `generateUploadUrl()` + blob upload + `createReceipt()`
- [ ] **6.17** `parseReceipt()` called with Gemini 2.0 Flash
- [ ] **6.18** Successful parse — navigate to `/receipt/[id]/confirm`
- [ ] **6.19** Gemini fails — OpenAI fallback triggered automatically
- [ ] **6.20** Both providers fail — error alert shown, receipt deleted, no infinite spinner
- [ ] **6.21** `isParsing` state reset on failure (critical bug fix from E2E sweep)

### Confirm Receipt Screen

- [ ] **6.22** Parsed items displayed in editable table
- [ ] **6.23** Receipt metadata shown: store name, date, total
- [ ] **6.24** Scan credits earned displayed (tier progress)
- [ ] **6.25** Edit item name inline — verify change saved
- [ ] **6.26** Edit item price inline — verify change saved
- [ ] **6.27** Swipe item to delete — item removed from parsed list
- [ ] **6.28** Add new item manually — name + price input

### Duplicate Detection

- [ ] **6.29** Scan receipt with same store + total + date as existing — duplicate warning shown
- [ ] **6.30** User can proceed anyway or cancel

### Save Receipt & Side Effects

- [ ] **6.31** "Save & Add to Pantry" triggers full side-effect chain:
- [ ] **6.32** — `savePriceHistoryFromReceipt()` stores prices in personal history
- [ ] **6.33** — `upsertCurrentPrices()` updates crowdsourced price averages
- [ ] **6.34** — `autoRestockFromReceipt()` fuzzy-matches items to pantry, updates stock to Stocked
- [ ] **6.35** — `earnScanCredit()` awards scan points
- [ ] **6.36** — `updateStreak()` increments receipt scanning streak
- [ ] **6.37** — `updateChallengeProgress()` updates active challenge if type = "scan_receipts"
- [ ] **6.38** If list linked — navigate to trip summary; otherwise back to scan screen
- [ ] **6.39** Cancel save — confirmation prompt, receipt deleted

### Receipt Parsing Edge Cases

- [ ] **6.40** Receipt with discount lines — discounts excluded from item list
- [ ] **6.41** Receipt with VAT codes (Aldi/Lidl) — VAT codes ignored
- [ ] **6.42** Receipt with SKU codes (Aldi) — SKU codes stripped
- [ ] **6.43** Receipt with abbreviations ("WHL MLK") — AI expands to "Whole Milk"
- [ ] **6.44** Non-grocery receipt (clothing store) — graceful handling, no crash
- [ ] **6.45** Very long receipt (50+ items) — all items parsed, scrollable list
- [ ] **6.46** Blurry/damaged receipt — parse attempt, partial results acceptable, no crash

**Connection to next section:** Saved receipt prices now feed the price cascade used in budget calculations.

---

## 7. Budget Tracking & Price Cascade

**Spec file:** `e2e/tests/07-budget-prices.spec.ts`
**Depends on:** List Items (items with prices), Receipt Scanning (prices populated)
**Feeds into:** Trip Summary, Insights

**Key files:** `convex/itemVariants.ts` (`getWithPrices`), `convex/currentPrices.ts`, `convex/priceHistory.ts`, `convex/ai.ts`

### Three-Layer Price Cascade

- [ ] **7.1** Item with personal receipt history — Layer 1 price shown ("£1.15 at Aldi")
- [ ] **7.2** Item with no personal history but crowdsourced data — Layer 2 shown ("~£1.15 avg")
- [ ] **7.3** Item with no history at all — Layer 3 AI estimate triggered and cached ("~£1.15 est.")
- [ ] **7.4** Cascade priority: personal > crowdsourced > AI (never reversed)
- [ ] **7.5** AI estimate cached in `currentPrices` for all users after first request

### Budget Dial Accuracy

- [ ] **7.6** Empty list with £50 budget — dial at 0%, green
- [ ] **7.7** Add items totaling £25 estimated — dial at 50%, green
- [ ] **7.8** Add items totaling £45 estimated — dial at 90%, orange/caution
- [ ] **7.9** Add items totaling £55 estimated — dial exceeds 100%, red
- [ ] **7.10** Check off items during shopping — dial shows blended total (actual for checked + estimated for unchecked)
- [ ] **7.11** Budget dial never resets to £0 when entering shopping mode (critical bug fix)

### Sentiment Messages

- [ ] **7.12** Under 60% budget used — "Looking good — lots of room left"
- [ ] **7.13** 60-90% budget used — "Getting close"
- [ ] **7.14** Over 100% budget — "Over budget"

### Trip Summary

- [ ] **7.15** Complete shopping — navigate to trip summary screen
- [ ] **7.16** Summary shows: Budget vs Actual comparison
- [ ] **7.17** Summary shows: Items checked vs total count
- [ ] **7.18** Summary shows: Savings (budget - actual) or overspend
- [ ] **7.19** Summary shows: Personal bests (biggest saving, cheapest trip, most items)
- [ ] **7.20** New personal record — confetti animation + heavy haptic
- [ ] **7.21** Savings milestone reached (e.g., "Saved £50 this month!") — celebration UI

### Price Freshness & Weighting

- [ ] **7.22** Crowdsourced prices use 30-day freshness weighting (recent scans weighted more)
- [ ] **7.23** Prices older than 30 days — lower weight in average calculation
- [ ] **7.24** Report count increments correctly on new receipt scan

**Connection to next section:** Trip completion and receipt scanning trigger gamification events (streaks, achievements, challenges).

---

## 8. Gamification & Insights

**Spec file:** `e2e/tests/08-gamification-insights.spec.ts`
**Depends on:** Receipt Scanning (scan credits), Budget Tracking (savings data), Shopping completion
**Feeds into:** Profile (stats display), Retention loops

**Key files:** `convex/insights.ts`, `app/(app)/insights.tsx`

### Streaks

- [ ] **8.1** Complete shopping trip — streak counter increments
- [ ] **8.2** Scan receipt — receipt streak increments
- [ ] **8.3** Miss a day — streak resets to 0 (or maintains with grace period if implemented)
- [ ] **8.4** Streak counter displays with flame icon on profile + insights
- [ ] **8.5** 7-day streak — special milestone toast

### Achievements / Badges

- [ ] **8.6** Complete first trip — "First Purchase" badge unlocked
- [ ] **8.7** Stay 20% under budget — "Budget Buster" badge unlocked
- [ ] **8.8** Badge unlock triggers: confetti animation + toast notification
- [ ] **8.9** Achievements list accessible from insights screen
- [ ] **8.10** Already-earned badges show as unlocked with earn date

### Weekly Challenges

- [ ] **8.11** Active challenge shown on insights: "Scan 3 receipts for 50 points"
- [ ] **8.12** Progress bar updates in real-time as actions complete
- [ ] **8.13** Complete challenge — marked done, points awarded
- [ ] **8.14** "Generate New Challenge" button creates fresh challenge
- [ ] **8.15** Challenge types: scan_receipts, complete_trips, add_items, stay_under_budget

### Scan Credit Tiers

- [ ] **8.16** Tier display on profile: Bronze (0-19), Silver (20-49), Gold (50-99), Platinum (100+)
- [ ] **8.17** Tier progress shown after each scan: "3 more to Silver!"
- [ ] **8.18** Tier upgrade — celebration toast

### Savings Jar

- [ ] **8.19** £0 saved — aspirational copy ("Start your first shopping trip...")
- [ ] **8.20** £10-50 saved — encouraging copy ("Great start! Every £1 counts")
- [ ] **8.21** £100+ saved — milestone copy ("Triple digits! You're a budgeting pro")
- [ ] **8.22** Warm accent color (#FFB088) used for milestone text

### Weekly Digest & Narrative

- [ ] **8.23** `generateWeeklyNarrative()` produces 2-3 sentence story
- [ ] **8.24** Digest shows: total spent, top categories, budget adherence
- [ ] **8.25** Narrative uses warm, supportive tone (not clinical)

### Insights Screen Layout

- [ ] **8.26** All insight sections use `GlassCollapsible` — collapsed by default
- [ ] **8.27** Expand each section — data loads correctly
- [ ] **8.28** Monthly trends chart renders (if Premium)
- [ ] **8.29** Personal bests section shows: biggest saving, cheapest trip, most items
- [ ] **8.30** Premium gate on full charts — Free users see limited view with upgrade prompt

### Milestones

- [ ] **8.31** On profile: milestone path shown for new users ("Add items", "Create list", "Scan receipt", "Earn first credit")
- [ ] **8.32** Each milestone step checked off as user completes it
- [ ] **8.33** All milestones complete — milestone path hidden

**Connection to next section:** Partner Mode extends shopping lists with collaboration, building on the list + item + gamification foundation.

---

## 9. Partner Mode & Collaboration

**Spec file:** `e2e/tests/09-partner-mode.spec.ts`
**Depends on:** Shopping Lists (shared lists), List Items (partner additions)
**Feeds into:** Notifications, Gamification (shared trip stats)

**Key files:** `convex/partners.ts`, `app/(app)/partners.tsx`, `app/(app)/join-list.tsx`, `app/(app)/notifications.tsx`

### Creating & Sharing Invites

- [ ] **9.1** Owner opens list settings — "Invite Partner" option visible
- [ ] **9.2** Generate invite code — unique code displayed
- [ ] **9.3** Copy code to clipboard — confirmation feedback
- [ ] **9.4** Share via system share sheet — code included in share content
- [ ] **9.5** QR code displayed for scanning
- [ ] **9.6** Select role before generating: Viewer / Editor / Approver
- [ ] **9.7** Invite code expires after configured time/uses

### Joining a Shared List

- [ ] **9.8** Navigate to "Join a shared list" — input screen shown
- [ ] **9.9** Enter valid invite code — list preview shown (name, owner, item count)
- [ ] **9.10** Tap "Accept" — `acceptInvite()` adds user as partner with assigned role
- [ ] **9.11** Shared list appears in "Shared With Me" section
- [ ] **9.12** Enter invalid/expired code — error message shown
- [ ] **9.13** Scan QR code — auto-fills invite code

### Role-Based Permissions

- [ ] **9.14** Viewer can see items but cannot add, edit, or check off
- [ ] **9.15** Editor can add and edit items — new items marked "pending" approval
- [ ] **9.16** Approver can add items — items auto-approved (no pending badge)
- [ ] **9.17** Owner can do everything + manage partners

### Approval Workflow

- [ ] **9.18** Editor adds item — `approvalStatus = "pending"` set
- [ ] **9.19** Owner sees approval badge on pending items
- [ ] **9.20** Owner approves item — status changes to "approved", item active on list
- [ ] **9.21** Owner rejects item — item removed or marked rejected
- [ ] **9.22** Owner contests item — triggers comment thread for discussion
- [ ] **9.23** Approver-role partner adds item — auto-approved, no pending state

### Comments

- [ ] **9.24** Tap item to open comment thread
- [ ] **9.25** Post comment — visible to all list members
- [ ] **9.26** Reply to comment in thread
- [ ] **9.27** Comment shows author name + timestamp
- [ ] **9.28** New comment triggers notification for other members

### Notifications

- [ ] **9.29** Bell icon on lists tab shows unread count badge
- [ ] **9.30** Tap bell — dropdown shows: approval requests, new comments, list updates
- [ ] **9.31** Tap notification — navigates to relevant item/list
- [ ] **9.32** "Mark all as read" clears unread count
- [ ] **9.33** Individual notification marked read on tap

### Partner Management

- [ ] **9.34** Owner changes partner role — dropdown, immediate update
- [ ] **9.35** Owner removes partner — confirmation, partner loses access
- [ ] **9.36** Partner leaves list voluntarily — "Leave list" button, confirmation
- [ ] **9.37** Removed partner can no longer access list

**Connection to next section:** Profile screen shows stats from all features above (trips, scans, streaks) and provides account management.

---

## 10. Profile & Account Management

**Spec file:** `e2e/tests/10-profile.spec.ts`
**Depends on:** All prior features (stats aggregation)
**Feeds into:** Authentication (sign out), Onboarding (reset account)

**Key files:** `app/(app)/(tabs)/profile.tsx`, `convex/users.ts`

### Account Display

- [ ] **10.1** Profile shows user avatar, name from Clerk, email
- [ ] **10.2** Account section header visible

### Milestone Path (New Users)

- [ ] **10.3** New user sees milestone checklist: Add items, Create list, Scan receipt, Earn credit
- [ ] **10.4** Completed steps show green checkmark + strikethrough
- [ ] **10.5** All milestones done — entire section hidden

### Quick Stats

- [ ] **10.6** Completed trips count accurate (matches history)
- [ ] **10.7** Pantry items count accurate (matches pantry)
- [ ] **10.8** Receipts scanned count — only counts `processingStatus === "completed"` (bug fix verified)
- [ ] **10.9** Lifetime scans displayed with highlight

### Navigation Cards

- [ ] **10.10** "Insights" card — navigates to insights screen
- [ ] **10.11** "Premium/Free Plan" card — shows current tier, navigates to subscription
- [ ] **10.12** "Stock Alerts" card (conditional) — shows count of out-of-stock + low items, navigates to pantry

### Sign Out

- [ ] **10.13** Sign out button visible (red danger variant)
- [ ] **10.14** Tap sign out — Clerk `signOut()` called, redirect to sign-in
- [ ] **10.15** After sign out, accessing app routes redirects to auth

### Dev Tools

- [ ] **10.16** Dev tools section visible
- [ ] **10.17** "Reset Account" — confirmation alert, then `resetMyAccount()` called
- [ ] **10.18** After reset — all data deleted, redirected to onboarding, login persists
- [ ] **10.19** "Delete Account" — confirmation alert, then `deleteMyAccount()` + Clerk `user.delete()`
- [ ] **10.20** After delete — fully logged out, account removed from system

**Connection to next section:** Profile links to Subscription screen for plan management.

---

## 11. Subscription & Payments

**Spec file:** `e2e/tests/11-subscription.spec.ts`
**Depends on:** Profile (navigation), Feature gates throughout app
**Feeds into:** Feature unlock (premium limits removed)

**Key files:** `app/(app)/subscription.tsx`, `convex/subscriptions.ts`, `convex/stripe.ts`

### Plan Display

- [ ] **11.1** Current plan shown: Free or Premium
- [ ] **11.2** Free plan limits displayed: 50 pantry items, 3 active lists
- [ ] **11.3** Premium benefits listed: unlimited items + lists, full insights, etc.
- [ ] **11.4** Annual/monthly pricing toggle (if implemented)

### Upgrade Flow

- [ ] **11.5** "Upgrade Now" button — initiates Stripe checkout session
- [ ] **11.6** Stripe checkout completes — webhook `checkout.session.completed` processed
- [ ] **11.7** Subscription record updated in Convex — `hasPremium()` returns true
- [ ] **11.8** Premium limits immediately lifted (can add 51+ items, 4+ lists)

### Trial

- [ ] **11.9** New user eligible for 7-day free trial
- [ ] **11.10** Start trial — premium features unlocked for trial period
- [ ] **11.11** Trial expires — show upgrade prompt, limits re-enforced

### Subscription Management

- [ ] **11.12** "Manage Subscription" — opens Stripe portal
- [ ] **11.13** Cancel subscription — `handleSubscriptionUpdated()` processes downgrade
- [ ] **11.14** After cancellation — premium features removed at period end
- [ ] **11.15** Payment failure — `handlePaymentFailed()` alerts user, grace period

### Scan Credit Tiers

- [ ] **11.16** Bronze/Silver/Gold/Platinum tiers based on lifetime scans
- [ ] **11.17** Tier displayed on profile and subscription screen
- [ ] **11.18** Tier progress bar shows scans until next tier

**Connection to next section:** Admin dashboard manages all user subscriptions, prices, and system health.

---

## 12. Admin Dashboard

**Spec file:** `e2e/tests/12-admin.spec.ts`
**Depends on:** All features (system-level management)
**Feeds into:** Price Intelligence (manual corrections), User management

**Key files:** `convex/admin.ts`, `app/(app)/admin.tsx` (placeholder)

### User Management

- [ ] **12.1** Admin can search/filter users
- [ ] **12.2** View user detail: profile, subscription, activity
- [ ] **12.3** Toggle user suspension
- [ ] **12.4** Extend trials / grant complimentary access

### Receipt Management

- [ ] **12.5** View recent receipts across all users
- [ ] **12.6** View flagged/problematic receipts
- [ ] **12.7** Delete problematic receipts
- [ ] **12.8** Bulk receipt operations (delete, reprocess)

### Price Management

- [ ] **12.9** Override price for specific item — `overridePrice()`
- [ ] **12.10** View price anomalies — `getPriceAnomalies()`
- [ ] **12.11** Merge duplicate store names — `mergeStoreNames()`

### Analytics

- [ ] **12.12** Daily active users metric
- [ ] **12.13** Retention metrics
- [ ] **12.14** Revenue report: subscription revenue, churn

### System Controls

- [ ] **12.15** Feature flags: toggle features on/off
- [ ] **12.16** Create announcements for in-app broadcast
- [ ] **12.17** Audit log: track admin actions

**Connection to next section:** Cross-cutting concerns apply to all features above.

---

## 13. Cross-Cutting Concerns

**Spec file:** `e2e/tests/13-cross-cutting.spec.ts`
**Applies to:** Every feature section above

### Zero-Blank Price Invariant

- [ ] **13.1** Audit all UI paths where an item price is displayed — assert `price !== null`
- [ ] **13.2** Pantry items: every item has a price
- [ ] **13.3** List items: every item has an estimated price on add
- [ ] **13.4** Variant picker: every variant option shows a price
- [ ] **13.5** Receipt confirm: every parsed item has a price

### Authentication Guards

- [ ] **13.6** Every Convex mutation checks user ownership — unauthorized access returns error
- [ ] **13.7** Users cannot access other users' pantry items
- [ ] **13.8** Users cannot access other users' lists (unless shared)
- [ ] **13.9** Users cannot access other users' receipts

### Error Handling (All Screens)

- [ ] **13.10** Network offline — graceful degradation, no crash
- [ ] **13.11** Convex query failure — error state shown (not blank screen)
- [ ] **13.12** AI action failure — fallback or user-friendly error
- [ ] **13.13** File upload failure — retry prompt, no stuck state

### Loading States

- [ ] **13.14** Every screen has a loading state while data fetches
- [ ] **13.15** Loading states use skeleton or spinner (not blank)
- [ ] **13.16** No infinite spinners on any failure path

### Empty States

- [ ] **13.17** Empty pantry — descriptive CTA ("Add your first items")
- [ ] **13.18** Empty lists — descriptive CTA ("Create your first list")
- [ ] **13.19** Empty receipts — descriptive CTA ("Scan your first receipt")
- [ ] **13.20** Empty insights — descriptive CTA ("Complete your first trip")

### Haptic Feedback

- [ ] **13.21** Button presses trigger haptic (light impact)
- [ ] **13.22** Stock level swipe triggers haptic
- [ ] **13.23** Check-off triggers haptic (medium impact)
- [ ] **13.24** Achievement unlock triggers haptic (heavy impact)
- [ ] **13.25** Confetti events trigger haptic (heavy impact)

### Emotional Design & Warm Tone

- [ ] **13.26** All empty states use warm, supportive copy (not clinical)
- [ ] **13.27** Budget sentiment messages use friendly language
- [ ] **13.28** Savings jar uses encouraging milestones
- [ ] **13.29** Teal (#00D4AA) used ONLY for primary CTAs
- [ ] **13.30** Warm accent (#FFB088) used for celebrations and milestones
- [ ] **13.31** Social proof in empty states: "Join 12,000 UK shoppers..."

### Glass UI Consistency

- [ ] **13.32** All screens use `GlassScreen` wrapper with gradient background
- [ ] **13.33** Cards use `GlassCard` with blur effect
- [ ] **13.34** Buttons use `GlassButton` with correct variants
- [ ] **13.35** Inputs use `GlassInput` styling
- [ ] **13.36** Design tokens from `glassTokens` used consistently (no hardcoded colors)

### Performance

- [ ] **13.37** Pantry with 100 items loads in < 500ms
- [ ] **13.38** List with 50 items — check-off animations smooth (60fps)
- [ ] **13.39** Receipt parsing completes in < 15 seconds for clear receipt
- [ ] **13.40** Scrolling 50+ item lists — no jank or dropped frames

### Accessibility

- [ ] **13.41** All interactive elements have accessible labels
- [ ] **13.42** Color contrast meets WCAG AA
- [ ] **13.43** Swipe gestures have tap button alternatives
- [ ] **13.44** Icons paired with text labels (not icon-only)

### Data Integrity

- [ ] **13.45** Failed receipts not counted in milestones (filter `processingStatus === "completed"`)
- [ ] **13.46** Failed receipts not counted in stats (same filter)
- [ ] **13.47** Deleted items removed from all aggregations
- [ ] **13.48** Completed lists correctly calculate savings (budget - actual total)

---

## Summary

| Section | Test Count | Status |
|---------|:----------:|:------:|
| 1. Authentication | 18 | Not Started |
| 2. Onboarding | 24 | Not Started |
| 3. Pantry Tracker | 51 | Not Started |
| 4. Shopping Lists | 24 | Not Started |
| 5. List Items & Prices | 38 | Not Started |
| 6. Receipt Scanning | 46 | Not Started |
| 7. Budget & Price Cascade | 24 | Not Started |
| 8. Gamification & Insights | 33 | Not Started |
| 9. Partner Mode | 37 | Not Started |
| 10. Profile & Account | 20 | Not Started |
| 11. Subscription & Payments | 18 | Not Started |
| 12. Admin Dashboard | 17 | Not Started |
| 13. Cross-Cutting Concerns | 48 | Not Started |
| **TOTAL** | **398** | **Not Started** |

---

*Generated 2026-02-02 by Amelia (Dev Agent) for Oja E2E test planning.*
