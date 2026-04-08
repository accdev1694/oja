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
| 13 | Points / Gamification (Receipt points, fraud prevention, tiers) | :white_check_mark: Done | 2026-04-08 | 14 issues fixed (4C/3H/3M/2L + 2 audit): month boundary race, refund tracking, auth fix, challenge race, batch processing, N+1 parallel fetch, eventBonus in receipts, cron self-scheduling |
| 14 | Admin Dashboard (RBAC, user/receipt management, analytics) | :white_check_mark: Done | 2026-04-08 | 34 issues fixed across 3 commits (2C/4H/3M/1L/12R initial + 9 first audit + 8 second audit): MFA grace period with RBAC support, session OCC cleanup, impersonation token filter+exposure, .take() limits on all analytics, funnel per-step queries, safeHaptics migration (12 files), activeUsers via activityEvents, financial report optimization, AppState-gated auto-refresh, missing indexes, cross-admin SIEM logging |
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

### Feature 13: Points / Gamification
**Critical fixes:**
- [C1] Month boundary race condition — re-fetch balance before patch to verify limit not exceeded (helpers.ts)
- [C3] Negative balance via refunds — track actual vs requested refund amount, log shortfall in metadata (mutations.ts)
- [C4] Missing auth on initializePointsBalance — changed from `mutation` to `internalMutation` (mutations.ts)

**High priority fixes:**
- [H4] Challenge completion race condition — re-verify completedAt after patch, check existing notification (challenges.ts)
- [H5] Unbounded table scan in expireOldPoints — batch processing (500 records) with error isolation (admin.ts)
- [H6] N+1 query in checkDealAchievements — parallel fetch with Promise.all, Map lookup (storeAchievements.ts)

**Low fixes:**
- [L4] Error isolation in cron jobs — try-catch per user, continue on failure (admin.ts)

**Hook fixes:**
- Fixed check-duplicate-exports.js output format (JSON hookSpecificOutput instead of console.error)
- Fixed post-fix-audit.js output format (wrapped in hookSpecificOutput)

**Audit fixes (post-implementation verification):**
- [Audit-C1] Fixed stale tier/streak calculation — moved recalculation AFTER re-fetch (helpers.ts)
- [REMAINING-1] Added eventBonus to receipt.pointsEarned calculation — both create and update paths (receipts/core.ts)
- [REMAINING-3] Added self-scheduling cron loop — expireOldPoints schedules next batch if hasMore (admin.ts)

### Feature 14: Admin Dashboard
**Commits:** `a3a9c4b`, `16876e0`, `a4615b6`

**Critical/High fixes:**
- [C1] MFA grace period enforcement in requireAdmin — blocks access after 14 days if mfaEnabled is false, uses userRole.grantedAt for RBAC admins (helpers.ts)
- [C2→H2] Session concurrency defense — removed ineffective re-check, documented Convex OCC reliance (sessions.ts)
- [C3] .take(50000) limit on getLiveAnalytics queries — prevents unbounded memory (analytics.ts)
- [C4] .take(10000) limit on computeRevenueReport subscriptions query (analytics.ts)
- [H2] .take(10000) on getPointsEconomics balances query (analytics.ts)
- [H3-audit] .take(50000) on recentTxns in getPointsEconomics (analytics.ts)
- [H4-audit] .take(10000) on all support ticket queries (analytics.ts)
- [C1-audit] Fixed inverted impersonation token filter — query by expiry only, not usedAt (sessions.ts)

**Medium fixes:**
- [M1] Auto-refresh interval 30s → 120s with AppState foreground check (OverviewTab.tsx)
- [M2] Per-step funnel queries using by_event index with Promise.all + stepConversion field (analytics.ts)
- [H6] Admin audit metadata on adjustPoints (adminId, reason, adjustedBy) (userMgmt.ts)
- [M1-audit] Removed unnecessary `as string` cast on admin._id (userMgmt.ts)
- [M3-audit] Aligned activeUsersThisWeek — both precomputed and live paths use activityEvents (analytics.ts, analytics cron)
- [M5-audit] Removed raw tokenValue from getActiveImpersonationToken response; added stopImpersonationForUser mutation (sessions.ts)
- [M4-audit] Cross-admin SIEM logging for impersonation stop (sessions.ts)

**Low fixes:**
- [L5-audit] JavaScript && → q.and() in support ticket filter (analytics.ts)
- [L1-audit] activeUsersThisWeek uses activityEvents not list updatedAt (analytics.ts)
- [L2-audit] getFinancialReport queries activeUsers directly, not full getLiveAnalytics (analytics.ts)
- [L3-audit] Separate AppState listener from interval useEffect (OverviewTab.tsx)
- [L4-audit] Test timestamps use 6/15 day values instead of fragile 1s (admin-auth.test.ts)
- [L5-audit-2] Document COGS as rough proxy, add isEstimatedCOGS flag (analytics.ts)

**Frontend migration (R1):**
- expo-haptics → safeHaptics across 13 admin files (12 tabs/components + ImpersonationBanner)

**Index fixes:**
- Added .withIndex() to 12 queries across analytics.ts, admin/analytics.ts, userMgmt.ts
- Added by_timestamp index to activityEvents schema

**Tests:**
- 4 new MFA grace period tests (isAdmin expired/within, RBAC expired/within)

---

## How to Run

For each pending feature:
1. Run `/validate-feature` targeting the feature area
2. Review the 5-agent report
3. Approve fixes
4. Verify typecheck + tests pass
5. Update this checklist
