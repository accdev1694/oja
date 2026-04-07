# Feature Validation Checklist

> **Purpose:** Track `/validate-feature` runs across all Oja feature areas.
> Each feature goes through: Map -> 5 Parallel Agents -> Report -> Fix -> Verify.
> Mark complete only after all phases pass.

---

## Progress

| # | Feature Area | Status | Date | Notes |
|---|---|---|---|---|
| 1 | Auth (Clerk + Convex) | :white_check_mark: Done | 2026-04-05 | Validated & fixed |
| 2 | Item Name Parser | :white_check_mark: Done | 2026-04-05 | Validated & fixed |
| 3 | Shopping Lists (CRUD, budgets, store switching, archiving) | :white_check_mark: Done | 2026-04-06 | Validated & fixed, files split under 400 lines |
| 4 | Pantry (CRUD, lifecycle, auto-archiving, restock) | :white_check_mark: Done | 2026-04-06 | 30+5 issues fixed (4C/7H/10M/9L + 5 from independent audit): cleanItemForStorage in all mutations, free-tier bypass, N+1 query, file splits, React.memo, type safety, dead imports/props |
| 5 | List Items (Item CRUD, price resolution, variant matching) | :white_check_mark: Done | 2026-04-06 | 10+1 issues fixed (4C/3H/2M/1L + 1 from independent audit): cleanItemForStorage in update, recalculateListTotal in remove/removeMultiple/toggleChecked, zero-blank-price in addFromPantryBulk/addItemMidShop, safe normalizeId replacing unsafe casts, consolidated pantry duplicate scan, core.ts split into core+batch |
| 6 | Price Intelligence (3-layer cascade, priceResolver, currentPrices) | :white_check_mark: Done | 2026-04-07 | 7+2 bugs fixed (N+1 batching, zero-blank-price, auth). Layer 0 (Live Store Prices) researched and ice-boxed — see ICE-BOX.md |
| 7 | Receipt Scanning (Camera, Gemini parsing, confirm, reconciliation) | :white_check_mark: Done | 2026-04-07 | 2+5 issues fixed (2C/2H/1M from initial + 2C/2H/1M from audit): race conditions (create+update), cleanItemForStorage, input validation, error logging. 2 false positives (auth pattern, backend cleaning) |
| 8 | Store Tracking (Store switching, multi-store segments, storeNormalizer) | :white_check_mark: Done | 2026-04-07 | 9 issues fixed (3C/3H/3M): N+1 batching in analytics, race condition in toggleChecked, stores.ts split (592→3 files), store ID validation, canonical name lookups, same-store switch prevention |
| 9 | Voice Assistant / Tobi (STT, TTS, AI, context injection) | :white_check_mark: Done | 2026-04-07 | 15 issues fixed (2C/4H/2M/1L + 6P): N+1 batch delete, Gemini null check+timeout, race conditions, rate limiting, safeHaptics, React.memo, error logging |
| 10 | Insights (Weekly digest, monthly trends, challenges, personal bests) | :white_check_mark: Done | 2026-04-07 | 10 issues fixed (4C/3H/2M/1L): N+1 batch queries in weeklyDigest, monthlyTrends, personalBests, savingsJar; safeHaptics in insights.tsx; error logging; fixed inline require; HTML entity fix |
| 11 | Partner / Sharing (Invites, roles, real-time collaboration) | :white_check_mark: Done | 2026-04-08 | 24 issues fixed (2C/10H/6M/6L): crypto-secure invites, N+1 batch queries, pagination limits, safeHaptics, error logging |
| 12 | Subscriptions (Stripe, feature gating, trial) | :white_check_mark: Done | 2026-04-08 | 12 issues fixed (2C/5H/2M/1L/1R + 1 audit): webhook idempotency, null checks, points reservation expiry, safeHaptics, premium detection alignment |
| 13 | Points / Gamification (Receipt points, fraud prevention, tiers) | :hourglass: Pending | | |
| 14 | Admin Dashboard (RBAC, user/receipt management, analytics) | :hourglass: Pending | | |
| 15 | Onboarding (Welcome flow, cuisine, store, pantry seeding) | :hourglass: Pending | | |

---

## Fixes Applied

### Feature 1: Auth
- (details lost in compaction)

### Feature 2: Item Name Parser
- (details lost in compaction)

### Feature 3: Shopping Lists
- Fixed `priceCache` type in `switchStore` (misc.ts)
- Split `AddItemForm.tsx` under 400 lines
- Split `AddItemsModal.tsx` under 400 lines
- Split `list/[id].tsx` under 400 lines
- Split `create-list-from-receipt.tsx` under 400 lines

### Feature 4: Pantry
- (details in checklist row)

### Feature 5: List Items
- Added `cleanItemForStorage()` to `update` mutation (core.ts)
- Added `recalculateListTotal()` to `remove`, `removeMultiple`, `toggleChecked` (core.ts)
- Added zero-blank-price fallback to `addFromPantryBulk` (batch.ts)
- Removed `@ts-ignore` from `addAndSeedPantry`, used proper `as const` (batch.ts)
- Replaced unsafe `as Id<>` casts with `ctx.db.normalizeId()` in itemMatching/mutations.ts
- Consolidated `findDuplicatePantryItem` from 2 queries to 1 (helpers.ts)
- Split core.ts (478 lines) into core.ts (265) + batch.ts (221)
- Removed dead else branch in `update` mutation
- [Audit] Added zero-blank-price fallback to `addItemMidShop` (batch.ts)

### Feature 6: Price Intelligence
- [H1] Batched N+1 queries in `refreshListPrices` — from N*4 queries to 2-3 batch queries (listItems/pricing.ts)
- [H2] Batched N+1 currentPrices query in `getWithPrices` (itemVariants/queries.ts)
- [M1] Standardized priceSource to `"ai"` (was `"ai_estimate"`) in getWithPrices
- [M2] Added emergency fallback in getWithPrices for zero-blank-price policy
- [L1] Changed OR to AND in personal history filter for precise size+unit matching
- [Audit-H3] Added authentication to `getByItemName` query (currentPrices/core.ts) — prevents bulk scraping
- [Audit-M2] Added Layer 3 emergency fallback to `refreshListPrices` — zero-blank-price for price refresh

### Feature 7: Receipt Scanning
**Initial fixes:**
- [C1] Fixed race condition in `create` mutation — hash-first pattern prevents double points fraud (receipts/core.ts)
- [M1] Removed redundant `db.get` in `update` mutation — use merged data from updates + original (receipts/core.ts)

**Audit fixes:**
- [Audit-C1] Added `cleanItemForStorage()` via `cleanReceiptItems()` helper to create & update mutations (receipts/core.ts)
- [Audit-H1] Fixed race condition in `update` path — same hash-first pattern as create (receipts/core.ts)
- [Audit-H2] Added `validateReceiptInput()` with bounds checking for prices, quantities, array sizes (receipts/core.ts)
- [Audit-M1] Removed duplicate hash check from `validateReceiptData` — caller now handles it (receiptValidation.ts)
- [Audit-M2] Added `console.warn` logging for non-critical errors instead of silent swallowing (confirm.tsx)

**False positives (no fix needed):**
- [Audit-C2] Auth in `getById` — returning null for all failure cases is correct Convex query pattern (no info leak)
- [Audit-L1] `addFromReceipt` mutation already uses `cleanItemForStorage` on backend (pantry/restock.ts:277)

### Feature 8: Store Tracking
- [C1] Batched N+1 query in `getStoreRecommendation` — batch-fetch all currentPrices upfront (stores/analytics.ts)
- [C2] Batched N+1 query in `getBestDealsFound` — same pattern (stores/analytics.ts)
- [C3] Fixed race condition in `toggleChecked` — re-read list before patching to get freshest store info (listItems/core.ts)
- [H1] Split stores.ts (592 lines) into 3 files: core.ts (~50), preferences.ts (~120), analytics.ts (~350)
- [H2] Added store ID validation in `markTripStart` using `isValidStoreId()` (trip.ts)
- [H3] Improved store lookup fallback in `finishTrip` — look up canonical name from storeNormalizer (trip.ts)
- [M1] Added MAX_FAVORITES (50) bounds check in `setUserPreferences` (stores/preferences.ts)
- [M2] Added same-store switch prevention in `switchStoreMidShop` — returns early with `alreadyAtStore: true` (trip.ts)
- [M3] Same as H3 — consolidated fix for "Unknown" fallback issue

### Feature 9: Voice Assistant / Tobi
**Critical fixes:**
- [C1] Fixed N+1 query in `clear_checked_items` — batch delete via `removeMultiple` (listWriteTools.ts)
- [C2] Added null check on Gemini response — safe text extraction with fallback (voice.ts)

**High priority fixes:**
- [H1] Fixed race condition in auto-resume — track timeout ref and clear on unmount (useVoiceToolExecution.ts)
- [H2] Fixed TTS failure handling — ensure wrappedOnDone always called even on error (useVoiceTTS.ts)
- [H3] Added rate limiting to textToSpeech action (voice.ts)
- [H4] Added 30s timeout to Gemini calls via Promise.race wrapper (voice.ts)

**Medium fixes:**
- [M1] Log swallowed errors instead of silent catch in listWriteTools.ts and pantryStoreWriteTools.ts
- [M7] Removed hardcoded "tesco" store fallback — now empty string (itemWriteTools.ts)

**Rule compliance:**
- [R1] Replaced expo-haptics with safeHaptics in useVoiceRecognition.ts, useVoiceToolExecution.ts, useVoiceAssistant.ts

**Performance fixes:**
- [P3] Added React.memo to MessageBubble component

**Bug fixes:**
- [B3] Added "limit_reached" type to VoiceAssistantResponse interface (voiceTypes.ts)

### Feature 10: Insights
**Critical fixes (N+1 queries):**
- [C1] Batched N+1 query in `getWeeklyDigest` — batch-fetch listItems upfront then filter in memory (weeklyDigest.ts)
- [C2] Batched N+1 query in `getMonthlyTrends` — same pattern for budget adherence (monthlyTrends.ts)
- [C3] Batched N+1 query in `getPersonalBests` — batch-fetch all listItems for completed lists (personalBests.ts)
- [C4] Batched N+1 query in `getSavingsJar` — same batch-fetch pattern (savingsJar.ts)

**High priority fixes:**
- [H1] Replaced expo-haptics with safeHaptics in insights.tsx (device-safe haptic feedback)
- [H2] Replaced inline `require()` for GlassToast with proper top-level import
- [H3] Fixed over-fetching in store analytics queries (already optimized from Store Tracking)

**Medium fixes:**
- [M1] Added error logging in challenge generation catch block instead of silent swallow
- [M2] Moved inline require to top-level import for proper bundling

**Low fixes:**
- [L1] Fixed HTML entity `&apos;` → `'` in narrative strings

### Feature 11: Partner / Sharing
**Critical fixes:**
- [C1] Crypto-secure invite codes — replaced `Math.random()` with `crypto.getRandomValues()` (invites.ts)

**High priority fixes (N+1 batch queries):**
- [H1] Batched N+1 query in `getCommentCounts` — single batch with in-memory filtering + cross-list security (comments.ts)
- [H2] Batched N+1 query in `getByList` — `batchGetUsers` helper for user lookups (members.ts)
- [H3] Batched N+1 query in `getSharedLists` — same batch pattern (members.ts)
- [H4] Batched N+1 query in `getComments` — batch user lookups (comments.ts)
- [H5] Batched N+1 query in `getListMessages` — batch user lookups (messages.ts)
- [H6] Batched N+1 query in `getShared` — batch list items counting (sharing.ts)
- [H7] Batched N+1 query in `getHistory` — batch list+user lookups (sharing.ts)

**Medium fixes:**
- [M1] Added pagination limits `.take(100-200)` to all list queries (comments.ts, messages.ts, sharing.ts)
- [M2] Added cross-list security validation in `getCommentCounts` — prevents data leakage
- [M4] Limited count query in `getListMessageCount` to `.take(1000)`

**Low fixes:**
- [L1] Added error logging in Share.share() catch block (partners.tsx)
- [D6] Added notification for removed partners (members.ts)

**Rule compliance:**
- [R1] Replaced expo-haptics with safeHaptics in 6 files: partners.tsx, join-list.tsx, CommentThread.tsx, ListChatThread.tsx, NotificationBell.tsx, NotificationDropdown.tsx

### Feature 12: Subscriptions
**Critical fixes:**
- [C1] Atomic webhook idempotency — combined check+mark into single mutation to prevent race condition (webhooks.ts)
- [C2] Duplicate notification prevention — check for existing notification before insert (webhooks.ts)

**High priority fixes:**
- [H1] Added idempotency key to handleCheckoutCompleted bonus award — prevents double-credit on annual (webhooks.ts)
- [H2] Increased points reservation expiry from 5 to 15 minutes — handles slow Stripe processing (credits.ts)
- [H3] Added null checks for optional Stripe webhook data — prevents crashes on malformed events (webhooks.ts)
- [H4] Added deprecation warnings to stub functions — getScanCredits/earnScanCredit now log warnings (internal.ts)

**Medium fixes:**
- [M6] Aligned frontend premium detection with backend isEffectivelyPremium() logic (subscription.tsx)

**Low fixes:**
- [L5] Removed redundant useMemo for trivial string capitalization (useUserSubscription.ts)

**Rule compliance:**
- [R1] Replaced expo-haptics with safeHaptics in subscription.tsx (4 calls)

**Audit fixes:**
- Removed unused `showPaywall` state variable
- Fixed missing useCallback dependencies (alert, firstName)

---

## How to Run

For each pending feature:
1. Run `/validate-feature` targeting the feature area
2. Review the 5-agent report
3. Approve fixes
4. Verify typecheck + tests pass
5. Update this checklist
