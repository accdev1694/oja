# Subscription, Payments & Rewards System Overhaul
## Implementation Plan

**Created:** 2026-03-02
**Status:** 🟡 95% COMPLETE — 1 CRITICAL BUG BLOCKING FULL FUNCTIONALITY
**Last Audited:** 2026-03-02
**Goal:** Transform Oja's monetization from cash-credit model to points-based rewards system with improved fraud prevention, better conversion funnels, and UK-competitive pricing strategy.

---

## 🚨 CRITICAL BUG DISCOVERED (See SUBSCRIPTION-REWARDS-AUDIT-REPORT.md)

**Issue:** Points earning mutation (`earnPointsInternal`) is **imported but never called** during receipt processing.

**Impact:** Users cannot earn points from receipt scans (primary earning mechanism is non-functional).

**Location:** `convex/receipts.ts` line 246-251 (missing call after fraud validation)

**Fix Required:** Add ~10 lines of code + 2 schema fields (`earnedPoints`, `pointsEarned`)

**Estimated Time:** 30 minutes

**Status:** ✅ Infrastructure 100% complete | ❌ Integration missing

---

---

## 🎯 QUICK NAVIGATION

- **Phase 0 Audit Results:** See sections 0.1-0.6 below
- **⚠️ CRITICAL FIXES REQUIRED:** Jump to bottom → "RECOMMENDED FIXES — CRITICAL ACTION REQUIRED"
- **Pre-Launch Checklist:** Jump to bottom → "PRE-LAUNCH CHECKLIST"
- **Detailed Audit Report:** See `SUBSCRIPTION-REWARDS-AUDIT-REPORT.md` in project root

---

## Executive Summary

### Current State Problems
1. **Cash credits model** - Paying users £0.25-0.30/scan creates negative unit economics risk
2. **Free tier too generous** - 3 scans/month allows users to never convert
3. **No fraud prevention** - Receipt deduplication, validation, or rate limiting missing
4. **Unclear value proposition** - Users don't understand rewards until they hit limits
5. **Gaming vulnerabilities** - Users can scan duplicates, fake receipts, or churn subscriptions

### Solution Overview
**Points-Based Rewards System** (Like Morrisons More, Tesco Clubcard)
- Replace cash credits with Oja Rewards Points (1,000pts = £1.00)
- Unlimited receipt scanning for budget tracking (core value)
- Limited point-earning scans per month (4-6 based on tier)
- Robust fraud prevention (deduplication, validation, rate limiting)
- Improved conversion funnel with limit walls and upsell CTAs

### Key Metrics Impact
| Metric | Before | After | Change |
|--------|--------|-------|--------|
| Net Revenue/User | £1.20-1.79 | £1.64-2.39 | +37-34% |
| Gross Margin | 40-60% | 55-80% | +15-20pp |
| Free → Premium Conversion | ~5% (est) | 12-15% (target) | +7-10pp |
| Gaming Risk | High | Low | Major reduction |
| User Data Quality | Good | Excellent | More scans |

---

## Phase 0: Discovery & Codebase Audit
**Owner:** Winston (Architect) + All Agents
**Duration:** 2-3 days
**Depends on:** None
**Priority:** CRITICAL - Must complete BEFORE any implementation begins

### Objectives
- Audit existing codebase to identify what's already implemented
- Document extent of current implementation vs planned features
- Identify reusable code vs code that needs replacement
- Prevent duplicate work and wasted effort
- Create accurate baseline for planning

### Tasks

#### 0.1 Existing Subscription System Audit ✅ COMPLETE

**0.1.1 Review Current Implementation**
- [x] **Subscription tables** (convex/schema.ts):
  - [x] Check if `subscriptions` table exists — ✅ EXISTS with full schema
  - [x] Document current fields and their purpose — ✅ DOCUMENTED in audit report
  - [x] Check if `scanCredits` table exists and is in use — ✅ EXISTS but STUBBED (returns null)
  - [x] Check if `scanCreditTransactions` table exists — ✅ EXISTS (old system)
  - [x] Check if `pricingConfig` table exists — ✅ EXISTS with £2.99/£21.99 pricing

- [x] **Current pricing configuration** (convex/migrations/seedPricingConfig.ts):
  - [x] Verify current prices: £2.99/month, £21.99/year — ✅ CONFIRMED
  - [x] Check if pricing is hard-coded or dynamic — ✅ Stored in pricingConfig table
  - [x] Document where prices are referenced — ✅ Used in Stripe integration

- [x] **Existing mutations/queries** (convex/subscriptions.ts, convex/stripe.ts):
  - [x] List all existing subscription-related functions — ✅ DOCUMENTED
  - [x] Document current earnScanCredit logic — ✅ STUBBED OUT (returns null)
  - [x] Check current Stripe webhook handlers — ✅ 5 webhooks active
  - [x] Verify which webhooks are currently processed — ✅ checkout, subscription, invoice events

**0.1.2 Document Current Cash Credit System**
- [x] Review `convex/lib/featureGating.ts`:
  - [x] Document current tier system (Bronze/Silver/Gold/Platinum) — ✅ COMPLETE (lines 80-85)
  - [x] Document current credit-per-scan rates (£0.25-0.30) — ⚠️ REPLACED with points (150-225pts/scan)
  - [x] Document current max scans per tier (4-6) — ✅ CORRECT (4-6 earning scans/mo)
  - [x] Check if this is fully implemented or partially — ✅ FULLY IMPLEMENTED

- [x] Review actual Stripe integration:
  - [x] Check if `invoice.created` webhook is handling credits — ✅ IMPLEMENTED (lines 170-200)
  - [x] Verify if credits are actually being applied to invoices — ✅ YES (negative invoice items)
  - [x] Check `getAndMarkScanCredits` implementation status — ⚠️ Replaced by getAndMarkPoints
  - [x] Test if credits show up in Stripe invoices (staging) — 🔄 NEEDS LIVE TESTING

**0.1.3 Identify Migration Needs**
- [x] Create comparison matrix:
  ```
  | Feature | Currently Exists? | Implementation % | Needs Migration? | Needs Replacement? | Can Reuse? |
  |---------|------------------|------------------|------------------|-------------------|-----------|
  | scanCredits table | YES (stubbed) | 0% | NO | YES (use points) | NO |
  | earnScanCredit mutation | YES (stubbed) | 0% | NO | YES (use earnPoints) | NO |
  | Stripe invoice credits | YES | 100% | NO | NO | YES (already points) |
  | Tier progression | YES | 100% | NO | NO | YES |
  | pointsBalance table | YES | 100% | NO | NO | YES |
  | pointsTransactions | YES | 100% | NO | NO | YES |
  | receiptHashes | YES | 100% | NO | NO | YES |
  ```

#### 0.2 Fraud Prevention Audit ✅ COMPLETE

**0.2.1 Check Existing Validation**
- [x] Review `convex/receipts.ts`:
  - [x] Check if any deduplication logic exists — ✅ YES (lines 220-232: receiptHashes table insert)
  - [x] Check if date validation exists — ✅ YES (validateReceiptData lines 88-103)
  - [x] Check if OCR confidence checking exists — ✅ YES (imageQuality < 70 flagged)
  - [x] Check if rate limiting exists (daily/monthly) — ✅ YES (max 2 scans/day, lines 123-137)
  - [x] Document any existing fraud flags or warnings — ✅ COMPLETE (7 flag types)

- [x] Review receipt schema:
  - [x] Check if `imageHash` field exists — ✅ YES (optional field in receipts table)
  - [x] Check if any fraud-related fields exist — ✅ YES (fraudFlags array added line 244)
  - [x] Check existing indexes on receipts table — ✅ YES (by_user, by_user_date, by_user_fingerprint)

**0.2.2 Identify Security Gaps**
- [x] List all missing fraud prevention features:
  - [x] Duplicate detection: ☑ Complete (SHA-256 hash via receiptHashes table)
  - [x] Date validation: ☑ Complete (30-day limit enforced)
  - [x] Rate limiting: ☑ Complete (2/day hard limit)
  - [x] OCR confidence: ☑ Complete (flags < 70%, non-blocking)
  - [x] Store validation: ☑ Complete (UK whitelist: 15 stores, fuzzy matching)
  - [x] Price validation: ☑ Complete (flags £0.10-£100 range violations)
  - [x] Anomaly detection: ☑ Complete (repeated totals/item counts flagged)

#### 0.3 UI/UX Audit ✅ COMPLETE

**0.3.1 Review Subscription Page** (app/(app)/subscription.tsx)
- [x] Check what's currently displayed:
  - [x] Scan credits UI exists? NO (replaced with points UI)
  - [x] Tier progression UI exists? ✅ YES (lines 282-322: badge, progress bar, scans to next tier)
  - [x] Cash values shown? ⚠️ PARTIAL (shows points → GBP conversion line 367)
  - [x] Points values shown? ✅ YES (lines 364-367: availablePoints + value)
  - [x] Can we reuse existing UI components? ✅ YES (GlassCard, tier badges, progress bars all functional)

**0.3.2 Review Receipt Scan Flow**
- [x] Check current scan confirmation screen — ✅ EXISTS (app/(app)/receipt/[id]/confirm.tsx)
- [x] Check if any rewards messaging exists — ⚠️ CODE EXISTS but NOT CALLED (line 357: conditional on earnedPoints field)
- [x] Check if points/credits are shown after scan — ❌ NO (because earnPoints mutation never called)
- [x] Identify reusable components vs new builds needed — ✅ UI components ready, just need backend integration

**0.3.3 Review Limit Walls**
- [x] Check if any limit walls exist for:
  - [x] Pantry items (free tier) — ✅ YES (enforced in featureGating.ts)
  - [x] Shopping lists (free tier) — ✅ YES (maxLists: 2 for free)
  - [x] Receipt scans (free tier) — ⚠️ Unlimited scans, but earning limit exists (1/mo)
  - [x] Voice requests (free tier) — ✅ YES (10/mo for free, 200/mo premium)
- [x] Document current limit wall UI patterns (if any) — ✅ DOCUMENTED (requireFeature throws ConvexError)

#### 0.4 Feature Gating Audit ✅ COMPLETE

**0.4.1 Review Current Feature Gating** (convex/lib/featureGating.ts)
- [x] Document current free tier limits:
  - [x] Max lists: 2 (line 22) ✅ MATCHES PLAN
  - [x] Max pantry items: 30 (line 23) ✅ MATCHES PLAN
  - [x] Max receipt scans: -1 unlimited (line 24) ✅ CORRECT (earning scans limited separately)
  - [x] Max voice requests: 10/mo (line 25) ✅ MATCHES PLAN
  - [x] Partner mode enabled? NO (line 28: false) ✅ PREMIUM-ONLY

- [x] Compare against planned limits (see Phase 1.2) — ✅ ALL LIMITS ALREADY MATCH PLAN
- [x] Document which limits need changing — ✅ NONE (already correct)

**0.4.2 Check Trial Implementation**
- [x] Review trial auto-start logic (convex/users.ts:completeOnboarding) — ✅ EXISTS (lines 182-212)
- [x] Verify 7-day trial is active and working — ✅ YES (7 days from signup)
- [x] Check trial expiry logic — ✅ YES (isTrialExpired + expireTrials cron)
- [x] Document any issues with current trial system — ✅ NO ISSUES FOUND

#### 0.5 Analytics & Admin Dashboard Audit ⏸️ DEFERRED (Out of Scope)

**0.5.1 Review Admin Dashboard** (app/(app)/admin.tsx + admin/*)
- [ ] Check if subscription analytics exist — ⏸️ NOT AUDITED
- [ ] Check if scan credits analytics exist — ⏸️ NOT AUDITED
- [ ] Check if fraud detection tools exist — ⏸️ NOT AUDITED
- [ ] Document what's missing for points system — ⏸️ NOT AUDITED

**0.5.2 Identify Monitoring Gaps**
- [ ] List all monitoring/alerting that needs to be added:
  - [ ] Points economics dashboard: ⏸️ NOT AUDITED
  - [ ] Fraud alert system: ⏸️ NOT AUDITED
  - [ ] Manual points adjustment tools: ⏸️ NOT AUDITED
  - [ ] Redemption tracking: ⏸️ NOT AUDITED

**Note:** Admin dashboard exists (refactored from 2700+ lines monolithic → 12 modular files). Points-specific admin features are Phase 8 work.

#### 0.6 Create Discovery Report ✅ COMPLETE

**0.6.1 Compile Findings Document**
- [x] Create `DISCOVERY-REPORT.md` with:
  - [x] **Executive Summary:** What exists vs what's needed — ✅ CREATED (SUBSCRIPTION-REWARDS-AUDIT-REPORT.md)
  - [x] **Reusable Components:** List all code that can be kept as-is — ✅ DOCUMENTED (95% reusable)
  - [x] **Needs Migration:** List all code that needs data migration — ✅ NONE (points system already new)
  - [x] **Needs Replacement:** List all code that must be rewritten — ✅ MINIMAL (stub earnScanCredit → use earnPoints)
  - [x] **Net New Features:** List all features that don't exist yet — ✅ CRITICAL: earnPoints integration missing
  - [x] **Risk Assessment:** Identify high-risk areas (e.g., Stripe integration) — ✅ DOCUMENTED (P0-P2 risks)

**0.6.2 Update Implementation Plan**
- [x] Based on discovery findings, update Phases 1-10:
  - [x] Mark tasks as "Already Complete" if feature exists — ✅ UPDATING NOW
  - [x] Mark tasks as "Needs Testing Only" if partially complete — ✅ Stripe integration
  - [x] Mark tasks as "Needs Refactor" vs "Build from Scratch" — ✅ 1 critical bug fix needed
  - [x] Adjust time estimates based on actual baseline — ✅ 30 min fix vs weeks planned

**0.6.3 Decision Gate**
- [x] Review discovery report with all agents — ✅ COMPLETE (audit report created)
- [x] Decide on migration strategy:
  - [x] **Option C CHOSEN:** Hybrid approach (points system already exists, scanCredits stubbed)
  - [x] No migration needed — new system is already in place, just not integrated
- [x] Get stakeholder approval before proceeding to Phase 1 — 🔄 AWAITING USER APPROVAL TO FIX BUG

---

## Phase 1: Business Model & Strategy
**Owner:** Mary (Analyst) + John (PM)
**Duration:** 1 week (planning only, no code)
**Depends on:** None

### Objectives
- Finalize points system economics
- Define tier structure and earning rates
- Update free tier limits
- Design conversion funnel strategy

### Tasks

#### 1.1 Points System Design ✅ IMPLEMENTED
- [x] ~~Research UK loyalty programs (Tesco, Morrisons, Nectar)~~ - COMPLETED
- [x] Finalize points-to-currency conversion rate (1,000pts = £1.00) — ✅ IMPLEMENTED (featureGating.ts + stripe.ts)
- [x] Define tier earning rates: — ✅ IMPLEMENTED (featureGating.ts:80-85)
  - [x] Bronze (0-19 lifetime scans): 150pts/scan, max 4 earning scans/mo = 600pts
  - [x] Silver (20-49 scans): 175pts/scan, max 5 earning scans/mo = 875pts
  - [x] Gold (50-99 scans): 200pts/scan, max 5 earning scans/mo = 1,000pts
  - [x] Platinum (100+ scans): 225pts/scan, max 6 earning scans/mo = 1,350pts
- [x] Free tier: 100pts/scan, max 1 earning scan/mo = 100pts — ✅ IMPLEMENTED (featureGating.ts:108-115)
- [x] Define redemption rules: — ✅ IMPLEMENTED (stripe.ts:430-444, points.ts:197-199)
  - [x] Minimum 500pts to redeem — ✅ YES (enforced in both files)
  - [x] Monthly max: 1,500pts (£1.50) — ✅ IMPLEMENTED (capped in getAndMarkPoints)
  - [ ] Annual max: 5,000pts (£5.00) — ⏸️ NOT IMPLEMENTED (monthly cap only)
  - [ ] Points expire after 12 months — ⏸️ NOT IMPLEMENTED (expirePoints exists, no cron)
  - [ ] Points forfeit on subscription cancellation — ⏸️ NOT IMPLEMENTED

#### 1.2 Free Tier Restructuring ✅ IMPLEMENTED
- [x] Update free tier limits (force earlier conversion): — ✅ IMPLEMENTED (featureGating.ts:20-32)
  - [x] Receipt scans: UNLIMITED (for tracking) — ✅ YES (line 24: -1)
  - [x] Point-earning scans: 1/month — ✅ YES (featureGating.ts:108)
  - [x] Shopping lists: 2 (down from 3) — ✅ YES (line 22)
  - [x] Pantry items: 30 (down from 50) — ✅ YES (line 23)
  - [x] Voice requests: 10/month (down from 20) — ✅ YES (line 25)
  - [x] Partner mode: DISABLED (premium-only) — ✅ YES (line 28: false)
- [x] Keep 7-day trial with FULL premium access (all features unlimited) — ✅ YES (users.ts:182-212)
- [x] Document upgrade incentives at each limit — ✅ YES (featureGating enforces via ConvexError)

#### 1.3 Pricing Strategy (Optional: Add Middle Tier)
**Decision Point:** Do we add a £1.49/month Bronze plan?

**Option A: Keep Current (Recommended for MVP)**
- [ ] Free: £0/month (limited features)
- [ ] Premium: £2.99/month (unlimited + points earning)
- [ ] Annual: £21.99/year (39% savings + bonus points)

**Option B: Add Middle Tier (Future Enhancement)**
- [ ] Free: £0/month
- [ ] Bronze: £1.49/month (higher limits, NO point earning)
- [ ] Premium: £2.99/month (unlimited + points earning)
- [ ] Annual: £21.99/year

**Action:** Decide by end of Phase 1

#### 1.4 Conversion Funnel Design
- [ ] Map user journey: Signup → Trial → Limit Wall → Conversion
- [ ] Design trial day 3 email: "You've earned X points preview"
- [ ] Design trial day 6 push: "Trial ends tomorrow + points you'd save"
- [ ] Design limit walls for each constraint:
  - Scan limit wall: "You've used your 1 earning scan. Upgrade for 4-6/month"
  - List limit wall: "Max 2 lists on free plan. Upgrade for unlimited"
  - Pantry limit wall: "30/30 items. Upgrade for unlimited pantry"
- [ ] Design post-scan messaging:
  - Points earned: "✅ Earned 150 points!"
  - No points (cap hit): "✅ Saved to budget. 4/4 earning scans used. Upgrade for 6/month"
  - Free user, already used: "✅ Saved to budget. Upgrade to earn from all scans"

#### 1.5 Competitive Positioning
- [ ] Update app store description (lead with rewards)
- [ ] Update homepage copy: "The budget app that pays you back"
- [ ] Create comparison matrix (Oja vs Snoop vs Cleo vs Emma)
- [ ] Document unique selling points:
  - Item-level grocery tracking (not just transactions)
  - Cashback applied to subscription (unique in UK)
  - Voice assistant (Tobi) differentiation
  - Pantry tracking for food waste reduction

---

## Phase 2: Database Schema & Backend Infrastructure ✅ 95% COMPLETE
**Owner:** Winston (Architect)
**Duration:** ~~1 week~~ → ALREADY IMPLEMENTED
**Depends on:** Phase 1 completion

### Objectives
- [x] Create new Convex tables for points system — ✅ COMPLETE
- [x] Add fraud prevention tables — ✅ COMPLETE
- [x] Implement database indexes for performance — ✅ COMPLETE
- [x] Build core points system mutations/queries — ⚠️ COMPLETE but not integrated (see Phase 0 audit)

### Tasks

#### 2.1 Schema Changes (convex/schema.ts) ✅ COMPLETE

**2.1.1 New Table: `pointsBalance`** ✅ EXISTS (schema.ts:520-540)
- [x] Create table with fields:
  ```typescript
  pointsBalance: defineTable({
    userId: v.id("users"),
    totalPoints: v.number(),        // Lifetime earned
    availablePoints: v.number(),    // Current balance (redeemable)
    pendingPoints: v.number(),      // Awaiting next billing cycle
    pointsUsed: v.number(),         // Historical redemptions
    tier: v.string(),               // bronze/silver/gold/platinum
    tierProgress: v.number(),       // Lifetime scans (for tier calc)
    earningScansThisMonth: v.number(), // Count of scans that earned points this month
    monthStart: v.number(),         // Timestamp of current earning period start
    lastEarnedAt: v.number(),       // Timestamp of last points earned
    streakCount: v.number(),        // Consecutive weeks with scans
    lastStreakScan: v.number(),     // Week number of last scan (for streak tracking)
    createdAt: v.number(),
    updatedAt: v.number(),
  })
  .index("by_user", ["userId"])
  .index("by_tier", ["tier"])
  ```

**2.1.2 New Table: `pointsTransactions`** ✅ EXISTS (schema.ts:542-560)
- [x] Create table with fields:
  ```typescript
  pointsTransactions: defineTable({
    userId: v.id("users"),
    type: v.union(
      v.literal("earn"),        // Earned from scan
      v.literal("bonus"),       // Streak/referral bonus
      v.literal("redeem"),      // Applied to invoice
      v.literal("expire"),      // Points expired (12mo)
      v.literal("refund"),      // Scan deleted/fraudulent
    ),
    amount: v.number(),          // Points (positive or negative)
    source: v.string(),          // "receipt_scan", "referral", "streak_bonus", "invoice_XXX"
    receiptId: v.optional(v.id("receipts")),
    invoiceId: v.optional(v.string()), // Stripe invoice ID
    stripeInvoiceItemId: v.optional(v.string()), // Stripe invoice item ID
    balanceBefore: v.number(),
    balanceAfter: v.number(),
    metadata: v.optional(v.any()),  // Extra data (e.g., tier at time of earn)
    createdAt: v.number(),
  })
  .index("by_user", ["userId"])
  .index("by_user_and_type", ["userId", "type"])
  .index("by_receipt", ["receiptId"])
  .index("by_created", ["createdAt"])
  ```

**2.1.3 New Table: `receiptHashes`** ✅ EXISTS (schema.ts:562-577)
- [x] Create table for fraud prevention:
  ```typescript
  receiptHashes: defineTable({
    userId: v.id("users"),
    imageHash: v.string(),          // SHA-256 of receipt image
    receiptId: v.id("receipts"),
    storeName: v.optional(v.string()),
    receiptDate: v.optional(v.number()), // Parsed from OCR
    totalAmount: v.optional(v.number()),
    ocrConfidence: v.optional(v.number()), // 0-100
    flags: v.optional(v.array(v.string())), // ["duplicate", "low_confidence", etc]
    firstSeenAt: v.number(),
    createdAt: v.number(),
  })
  .index("by_hash", ["imageHash"])
  .index("by_user_and_date", ["userId", "receiptDate"])
  .index("by_flags", ["flags"])
  ```

**2.1.4 Update Existing Table: `receipts`**
- [x] Add new fields: — ⚠️ PARTIAL (imageHash ✅, fraudFlags ✅, earnedPoints ❌, pointsEarned ❌)
  ```typescript
  imageHash: v.optional(v.string()),      // ✅ EXISTS
  pointsEarned: v.optional(v.number()),   // ❌ MISSING (need to add)
  earnedPoints: v.optional(v.boolean()),  // ❌ MISSING (need to add)
  fraudFlags: v.optional(v.array(v.string())), // ✅ EXISTS (set in receipts.ts:244)
  ```
- [x] Add new indexes:
  ```typescript
  .index("by_user_date", ["userId", "purchaseDate"])  // ✅ EXISTS (used for rate limiting)
  .index("by_user_fingerprint", ["userId", "fingerprint"]) // ✅ EXISTS (deduplication)
  ```

#### 2.2 Core Points Mutations/Queries (convex/points.ts) ✅ COMPLETE (345 lines)

**2.2.1 Initialize Points Balance** ✅ EXISTS (points.ts:67-73)
- [x] Create `initializePointsBalance` mutation
  - [x] Runs on user signup or first receipt scan — ✅ Via getOrCreatePointsBalance helper
  - [x] Creates pointsBalance record with tier "bronze", 0 points
  - [x] Returns balance object

**2.2.2 Earn Points** ✅ EXISTS (points.ts:75-160, 162-180)
- [x] Create `earnPoints` mutation + `earnPointsInternal` + `processEarnPoints` helper
  - [x] Input: userId, receiptId, points amount
  - [x] Check if earning scans quota available for current month — ✅ Lines 82-84
  - [x] If quota exceeded, throw error or return { earned: false } — ✅ Returns reason
  - [x] Otherwise:
    - [x] Increment tierProgress (lifetime scans) — ✅ Line 109
    - [x] Calculate new tier based on tierProgress — ✅ Line 110
    - [x] Add points to availablePoints — ✅ Lines 113-123
    - [x] Create pointsTransactions record (type: "earn") — ✅ Lines 126-136
    - [x] Check for streak bonus eligibility — ✅ Lines 88-107, bonus transaction lines 139-151
    - [x] Return updated balance — ✅ Lines 153-159

**2.2.3 Redeem Points** ✅ EXISTS (points.ts:182-222)
- [x] Create `redeemPoints` mutation (internal, called by Stripe webhook)
  - [x] Input: userId, points amount, invoiceId
  - [x] Validate user has enough availablePoints — ✅ Lines 193-195
  - [x] Deduct from availablePoints — ✅ Lines 202-206
  - [x] Increment pointsUsed
  - [x] Create pointsTransactions record (type: "redeem") — ✅ Lines 208-218
  - [x] Return updated balance — ✅ Line 220

**2.2.4 Get Points Balance** ✅ EXISTS (points.ts:224-254)
- [x] Create `getPointsBalance` query
  - [x] Input: none (uses authenticated user) — ✅ Lines 227-228
  - [x] Return pointsBalance with derived fields:
    - [x] canEarnMore: earningScansThisMonth < maxEarningScans — ✅ Line 246
    - [x] nextTierInfo: { nextTier, scansNeeded } — ✅ Line 247
    - [x] effectiveDiscount: availablePoints / 1000 (£ value) — ✅ Line 248
    - [x] monthlyEarningCap: max points based on tier — ✅ Line 249

**2.2.5 Get Points History** ✅ EXISTS (points.ts:256-279)
- [x] Create `getPointsHistory` query
  - Input: limit (optional, default 50)
  - Return pointsTransactions ordered by createdAt desc
  - Include receipt details for "earn" transactions
  - Include invoice details for "redeem" transactions

#### 2.3 Fraud Prevention Library (convex/lib/receiptValidation.ts - NEW FILE)

**2.3.1 Image Hash Generation**
- [ ] Create `generateImageHash` function
  - Input: base64 image data
  - Use SHA-256 hashing (Web Crypto API)
  - Return hex string hash
  - Handle errors gracefully

**2.3.2 Receipt Validation**
- [ ] Create `validateReceipt` function
  - Input: ctx, userId, imageData, ocrResult
  - Output: { isValid, confidence, flags, reason?, hash }
  - Checks:
    1. **Duplicate detection:** Query receiptHashes by imageHash
    2. **OCR confidence:** Reject if <70%, flag if 70-85%
    3. **Date validation:**
       - Parse receipt date from OCR
       - Reject if >30 days old
       - Flag if <1 hour old (screenshot manipulation risk)
       - Flag if future date
    4. **Store validation:**
       - Normalize store name
       - Check against UK store whitelist (Tesco, Sainsbury, Asda, etc.)
       - Flag if unknown store
    5. **Price validation:**
       - Flag items <£0.10 or >£100 (suspicious)
       - Check total amount plausibility
    6. **Daily rate limit:**
       - Query receipts by_user_and_date for today
       - Reject if >=2 scans today (prevent spam)
    7. **Pattern detection:**
       - Get user's last 10 scans
       - Flag if anomalous pattern (same items, same totals, etc.)
  - Return validation result with all flags

**2.3.3 UK Store Validation**
- [ ] Create `isValidUKStore` function
  - Whitelist: Tesco, Sainsbury, Asda, Morrisons, Aldi, Lidl, Waitrose, Co-op, Iceland, M&S, Ocado, Budgens, Nisa, Spar
  - Fuzzy matching for OCR errors (e.g., "TESCC" → "TESCO")
  - Return boolean

**2.3.4 Anomaly Detection**
- [ ] Create `detectAnomalousPattern` function
  - Input: user's recent scans, new scan
  - Checks:
    - Same item count across all scans (suspicious)
    - Same total amount repeatedly (duplicate risk)
    - Same store + same items + same total = likely duplicate
    - Scans at exact same time of day (bot behavior)
  - Return boolean

#### 2.4 Update Existing Receipt Flow

**2.4.1 Update `createReceipt` mutation (convex/receipts.ts)**
- [ ] Add validation step before creating receipt:
  ```typescript
  const validation = await validateReceipt(ctx, userId, args.imageData, args.ocrResult);
  if (!validation.isValid) {
    throw new ConvexError(validation.reason);
  }
  ```
- [ ] Create receipt with imageHash and flags
- [ ] Create receiptHashes record
- [ ] Check if scan can earn points:
  ```typescript
  const pointsBalance = await getOrCreatePointsBalance(ctx, userId);
  const canEarn = pointsBalance.earningScansThisMonth < getMaxEarningScans(tier, isPremium);
  ```
- [ ] If can earn points, call `earnPoints` mutation
- [ ] Return receipt with points metadata:
  ```typescript
  return {
    receiptId,
    pointsEarned: canEarn ? pointsAmount : 0,
    earnedPoints: canEarn,
    earningScansUsed: pointsBalance.earningScansThisMonth + (canEarn ? 1 : 0),
    maxEarningScans: getMaxEarningScans(tier, isPremium),
    message: canEarn
      ? `Earned ${pointsAmount} points!`
      : `Receipt saved! You've used ${pointsBalance.earningScansThisMonth}/${maxScans} earning scans this month.`
  };
  ```

**2.4.2 Update `deleteReceipt` mutation**
- [ ] If receipt earned points, refund them:
  ```typescript
  if (receipt.pointsEarned > 0) {
    await ctx.runMutation(api.points.refundPoints, {
      userId,
      receiptId,
      points: receipt.pointsEarned,
    });
  }
  ```
- [ ] Delete receiptHashes record
- [ ] Delete receipt

---

## Phase 3: Stripe Integration & Invoice Credits
**Owner:** Winston (Architect)
**Duration:** 3-4 days
**Depends on:** Phase 2 completion

### Objectives
- Update Stripe webhook to apply points as invoice credits
- Migrate existing cash credits to points
- Test full billing cycle with points redemption

### Tasks

#### 3.1 Update Stripe Webhook (convex/stripe.ts)

**3.1.1 Update `invoice.created` Handler**
- [ ] Get user from Stripe customer ID
- [ ] Query pointsBalance for user
- [ ] Calculate discount:
  ```typescript
  const isAnnual = invoice.lines.data[0]?.price?.recurring?.interval === "year";
  const maxPoints = isAnnual ? 5000 : 2000;  // £5 annual, £2 monthly
  const pointsToRedeem = Math.min(pointsBalance.availablePoints, maxPoints);

  // Only redeem if >= 500 points (£0.50 minimum)
  if (pointsToRedeem < 500) return;

  const discountAmount = Math.floor(pointsToRedeem / 1000 * 100); // Convert to pence
  ```
- [ ] Create Stripe invoice item (negative amount):
  ```typescript
  const invoiceItem = await stripe.invoiceItems.create({
    customer: customerId,
    invoice: invoice.id,
    amount: -discountAmount,  // Negative = credit
    currency: "gbp",
    description: `Oja Rewards: ${pointsToRedeem} points redeemed`,
  });
  ```
- [ ] Call `redeemPoints` mutation:
  ```typescript
  await ctx.runMutation(api.points.redeemPoints, {
    userId,
    points: pointsToRedeem,
    invoiceId: invoice.id,
    stripeInvoiceItemId: invoiceItem.id,
  });
  ```
- [ ] Log admin event for audit trail

**3.1.2 Update `subscription.created` Handler**
- [ ] Initialize pointsBalance if doesn't exist
- [ ] Grant welcome bonus (optional): 500 points for new annual subscribers

**3.1.3 Update `subscription.deleted` Handler**
- [ ] Expire all remaining points:
  ```typescript
  const pointsBalance = await getPointsBalance(ctx, userId);
  if (pointsBalance.availablePoints > 0) {
    await ctx.runMutation(api.points.expirePoints, {
      userId,
      points: pointsBalance.availablePoints,
      reason: "subscription_cancelled",
    });
  }
  ```

#### 3.2 Migration Script (convex/migrations/migrateToPoints.ts)

**3.2.1 Create Migration Function**
- [ ] Create `migrateExistingScanCredits` internal mutation:
  ```typescript
  export const migrateExistingScanCredits = internalMutation({
    handler: async (ctx) => {
      const allCredits = await ctx.db.query("scanCredits").collect();

      for (const credit of allCredits) {
        // Convert cash to points: £1 = 1,000 points
        const pointsEquivalent = Math.round(credit.creditsEarned * 1000);

        // Create pointsBalance
        await ctx.db.insert("pointsBalance", {
          userId: credit.userId,
          totalPoints: pointsEquivalent,
          availablePoints: pointsEquivalent,
          pendingPoints: 0,
          pointsUsed: 0,
          tier: credit.tier,
          tierProgress: credit.lifetimeScans,
          earningScansThisMonth: credit.scansThisPeriod,
          monthStart: credit.periodStart,
          lastEarnedAt: Date.now(),
          streakCount: 0,
          lastStreakScan: 0,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        // Create migration transaction record
        await ctx.db.insert("pointsTransactions", {
          userId: credit.userId,
          type: "earn",
          amount: pointsEquivalent,
          source: "migration_from_cash_credits",
          balanceBefore: 0,
          balanceAfter: pointsEquivalent,
          metadata: {
            originalCash: credit.creditsEarned,
            originalTier: credit.tier,
            migrationDate: Date.now(),
          },
          createdAt: Date.now(),
        });
      }

      return { success: true, migratedUsers: allCredits.length };
    }
  });
  ```

**3.2.2 Run Migration**
- [ ] Test migration on staging data
- [ ] Run migration in production via Convex dashboard
- [ ] Verify all users have pointsBalance records
- [ ] Archive scanCredits table (don't delete - keep for audit)

#### 3.3 Testing

**3.3.1 Local Testing (Stripe Test Mode)**
- [ ] Create test subscription
- [ ] Scan receipts to earn 2,000+ points
- [ ] Trigger invoice.created webhook
- [ ] Verify points deducted from balance
- [ ] Verify negative invoice item created in Stripe
- [ ] Verify invoice total reduced by points value
- [ ] Verify pointsTransactions record created

**3.3.2 Edge Cases**
- [ ] Test with <500 points (should not redeem)
- [ ] Test with exactly 500 points (should redeem £0.50)
- [ ] Test annual subscription (max 5,000pts = £5)
- [ ] Test subscription cancellation (points should expire)
- [ ] Test webhook failure/retry (idempotency)

---

## Phase 4: Frontend - Points Display & UX
**Owner:** Winston (Architect) + John (PM)
**Duration:** 1 week
**Depends on:** Phase 2 completion (can run in parallel with Phase 3)

### Objectives
- Update subscription page to show points instead of cash
- Add points history page
- Update receipt scan flow to show points earned
- Add limit walls with upsell CTAs
- Build tier progression UI

### Tasks

#### 4.1 Update Subscription Page (app/(app)/subscription.tsx)

**4.1.1 Replace Scan Credits Section**
- [ ] Update `getScanCredits` query to `getPointsBalance`
- [ ] Replace cash values with points:
  ```typescript
  // Old: "£0.60 earned"
  // New: "600 points earned (£0.60 value)"
  ```
- [ ] Update progress bar to show earning scans used:
  ```typescript
  <Text>Earning scans: {earningScansUsed}/{maxEarningScans} this month</Text>
  <ProgressBar value={earningScansUsed} max={maxEarningScans} />
  ```
- [ ] Show points redemption preview:
  ```typescript
  {availablePoints >= 500 && (
    <Text>Next renewal: £{basePrice} - £{pointsValue} = £{effectivePrice}</Text>
  )}
  ```
- [ ] Update tier progression display (keep existing UI)

**4.1.2 Add Points Balance Highlight**
- [ ] Add prominent points balance card at top:
  ```tsx
  <GlassCard>
    <Text style={styles.pointsBalanceLabel}>Your Oja Rewards Balance</Text>
    <Text style={styles.pointsBalanceValue}>{availablePoints} points</Text>
    <Text style={styles.pointsBalanceSubtext}>
      Worth £{(availablePoints / 1000).toFixed(2)} off next renewal
    </Text>
  </GlassCard>
  ```

**4.1.3 Update Free User CTA**
- [ ] Change from cash messaging to points:
  ```tsx
  <Text>
    Upgrade to earn up to 1,350 points/month (£1.35 off)
  </Text>
  ```

#### 4.2 Create Points History Page (app/(app)/points-history.tsx - NEW FILE)

**4.2.1 Build History List**
- [ ] Create new page route
- [ ] Query `getPointsHistory`
- [ ] Display transactions in chronological order (newest first)
- [ ] Group by month
- [ ] Show transaction details:
  ```tsx
  <TransactionCard>
    <Icon name={getIconForType(transaction.type)} />
    <View>
      <Text>{getDescriptionForTransaction(transaction)}</Text>
      <Text style={styles.timestamp}>{formatDate(transaction.createdAt)}</Text>
    </View>
    <Text style={getAmountStyle(transaction)}>
      {transaction.amount > 0 ? '+' : ''}{transaction.amount} pts
    </Text>
  </TransactionCard>
  ```
- [ ] Add filters: All / Earned / Redeemed / Bonuses
- [ ] Add lifetime stats at top:
  ```tsx
  <StatsRow>
    <Stat label="Total Earned" value={`${totalEarned} pts`} />
    <Stat label="Total Redeemed" value={`${totalRedeemed} pts`} />
    <Stat label="Total Saved" value={`£${totalSaved}`} />
  </StatsRow>
  ```

**4.2.2 Add Navigation**
- [ ] Add "Points History" link to subscription page
- [ ] Add "Points" tab to profile menu (optional)

#### 4.3 Update Receipt Scan Flow

**4.3.1 Update Confirmation Screen (app/(app)/receipt/[id]/confirm.tsx)**
- [ ] After successful scan, show points earned:
  ```tsx
  {pointsEarned > 0 ? (
    <SuccessBanner>
      <Icon name="check-circle" />
      <Text>Receipt scanned! Earned {pointsEarned} points</Text>
    </SuccessBanner>
  ) : (
    <InfoBanner>
      <Icon name="information" />
      <Text>Receipt saved to your budget</Text>
      {!isPremium && (
        <Text style={styles.upgradeHint}>
          Upgrade to earn up to 1,350pts/month from scans
        </Text>
      )}
      {isPremium && earningScansUsed >= maxEarningScans && (
        <Text style={styles.limitHint}>
          You've earned points from {maxEarningScans}/{maxEarningScans} scans this month.
          Upgrade to Platinum for 6 earning scans!
        </Text>
      )}
    </InfoBanner>
  )}
  ```

**4.3.2 Add Earning Scans Progress**
- [ ] Show progress indicator on scan screen:
  ```tsx
  <ProgressChip>
    <Icon name="barcode-scan" />
    <Text>{earningScansUsed}/{maxEarningScans} earning scans used</Text>
  </ProgressChip>
  ```

#### 4.4 Limit Walls & Upsell CTAs

**4.4.1 Pantry Limit Wall (app/(app)/(tabs)/index.tsx)**
- [ ] When user hits 30/30 items on free plan:
  ```tsx
  <LimitWallModal visible={hitLimit}>
    <Icon name="lock" size={64} />
    <Text style={styles.limitTitle}>Pantry Full</Text>
    <Text style={styles.limitBody}>
      Free plan: 30 items max
      Premium: Unlimited pantry + earn 600-1,350pts/month
    </Text>
    <GlassButton onPress={goToSubscription}>
      Upgrade for £2.99/month
    </GlassButton>
    <Pressable onPress={closeModal}>
      <Text style={styles.dismissText}>Maybe later</Text>
    </Pressable>
  </LimitWallModal>
  ```

**4.4.2 Lists Limit Wall (app/(app)/(tabs)/lists.tsx)**
- [ ] When user tries to create 3rd list on free plan:
  ```tsx
  <LimitWallModal visible={hitLimit}>
    <Icon name="format-list-bulleted" size={64} />
    <Text style={styles.limitTitle}>List Limit Reached</Text>
    <Text style={styles.limitBody}>
      Free plan: 2 active lists
      Premium: Unlimited lists + earn points from every scan
    </Text>
    <GlassButton onPress={goToSubscription}>
      Upgrade to Premium
    </GlassButton>
  </LimitWallModal>
  ```

**4.4.3 Earning Scans Limit Wall**
- [ ] When free user scans 2nd receipt of month:
  ```tsx
  <InfoModal visible={showInfo}>
    <Icon name="gift-outline" size={48} />
    <Text style={styles.infoTitle}>Receipt Saved!</Text>
    <Text style={styles.infoBody}>
      Free plan: 1 earning scan/month (already used)
      Your receipt is tracked, but didn't earn points.

      Upgrade to earn from 4-6 scans/month (600-1,350pts = £0.60-1.35 off)
    </Text>
    <GlassButton onPress={goToSubscription}>
      See Premium Plans
    </GlassButton>
  </InfoModal>
  ```

#### 4.5 Tier Progression UI

**4.5.1 Update Tier Progress Section (subscription.tsx)**
- [ ] Keep existing tier progress bar
- [ ] Update messaging to focus on points earning:
  ```tsx
  <TierProgressCard>
    <TierBadge tier={currentTier} />
    <Text>{currentTier} Tier: {earningRate}pts/scan, max {maxScans}/month</Text>
    {nextTier && (
      <>
        <ProgressBar value={progress} max={100} />
        <Text>{scansToNext} more scans to {nextTier} tier!</Text>
        <Text style={styles.tierBenefits}>
          {nextTier} benefits: {nextEarningRate}pts/scan, {nextMaxScans} earning scans/month
        </Text>
      </>
    )}
  </TierProgressCard>
  ```

**4.5.2 Add Tier Calculator (Optional Enhancement)**
- [ ] Build "Calculate Your Savings" component:
  ```tsx
  <TierCalculator>
    <Text>How many receipts do you scan per month?</Text>
    <Slider value={scansPerMonth} min={1} max={10} />
    <Text>{scansPerMonth} scans/month</Text>

    <ResultsCard>
      <Text>Your tier: {projectedTier}</Text>
      <Text>Points earned: {projectedPoints}/month</Text>
      <Text>Subscription savings: £{projectedSavings}/month</Text>
      <Text>Effective cost: £{effectiveCost}/month</Text>
    </ResultsCard>
  </TierCalculator>
  ```

#### 4.6 Update Onboarding Flow

**4.6.1 Add Points Preview to Trial Welcome**
- [ ] Update welcome screen to mention rewards:
  ```tsx
  <WelcomeCard>
    <Text>Welcome to your 7-day trial!</Text>
    <FeatureList>
      <Feature icon="infinity" text="Unlimited scans, lists, and pantry" />
      <Feature icon="cash-multiple" text="Earn Oja Rewards points from every scan" />
      <Feature icon="chart-line" text="See how much you could save each month" />
    </FeatureList>
  </WelcomeCard>
  ```

**4.6.2 Day 3 Trial Email (Backend)**
- [ ] Create Convex cron job to send trial day 3 emails
- [ ] Email content:
  ```
  Subject: You've earned X points this week! 🎯

  Hi {name},

  Great start! Based on your 3 scans this week, you're on track to earn
  {projectedPoints} points/month as a Premium member.

  That's £{projectedSavings} off your subscription – just from scanning
  receipts you already have!

  {tier} members earn {tierPoints}pts/scan ({tierMax} scans/month).
  Platinum users save up to £1.35/month.

  [See how rewards work] [Upgrade now and keep your points]
  ```

**4.6.3 Day 6 Trial Push Notification**
- [ ] Create Convex cron job for day 6 notifications
- [ ] Push notification:
  ```
  Title: "Your trial ends tomorrow"
  Body: "You've earned {totalPoints} points. Subscribe to keep earning + apply them to your next bill!"
  Action: Open subscription page
  ```

---

## Phase 5: Gamification & Retention Features
**Owner:** John (PM) + Winston (Architect)
**Duration:** 1 week
**Depends on:** Phase 4 completion

### Objectives
- Implement streak bonuses
- Build referral program
- Add seasonal events infrastructure
- Create engagement notifications

### Tasks

#### 5.1 Streak Bonuses

**5.1.1 Backend Logic (convex/points.ts)**
- [ ] Update `earnPoints` mutation to check for streaks:
  ```typescript
  // Check if this scan continues a streak
  const currentWeek = getWeekNumber(Date.now());
  const lastWeek = getWeekNumber(pointsBalance.lastStreakScan);

  let newStreakCount = pointsBalance.streakCount;

  if (currentWeek === lastWeek + 1) {
    // Consecutive week - increment streak
    newStreakCount++;
  } else if (currentWeek === lastWeek) {
    // Same week - maintain streak
    newStreakCount = pointsBalance.streakCount;
  } else {
    // Streak broken - reset
    newStreakCount = 1;
  }

  // Award streak bonuses
  let bonusPoints = 0;
  if (newStreakCount === 3) bonusPoints = 50;   // 3 weeks
  if (newStreakCount === 4) bonusPoints = 100;  // 4 weeks (full month)
  if (newStreakCount === 8) bonusPoints = 250;  // 2 months
  if (newStreakCount === 12) bonusPoints = 500; // 3 months

  if (bonusPoints > 0) {
    await ctx.db.insert("pointsTransactions", {
      userId,
      type: "bonus",
      amount: bonusPoints,
      source: `streak_bonus_${newStreakCount}_weeks`,
      balanceBefore: newBalance,
      balanceAfter: newBalance + bonusPoints,
      createdAt: Date.now(),
    });

    // Send celebration notification
    await sendStreakNotification(userId, newStreakCount, bonusPoints);
  }
  ```

**5.1.2 UI Updates**
- [ ] Add streak indicator to subscription page:
  ```tsx
  <StreakCard>
    <Icon name="fire" color="#FF6B35" />
    <Text>{streakCount} week streak! 🔥</Text>
    {streakCount === 3 && <Text>Keep it up for +100 bonus points!</Text>}
  </StreakCard>
  ```

#### 5.2 Referral Program

**5.2.1 Backend (convex/referrals.ts - NEW FILE)**
- [ ] Create `referralCodes` table:
  ```typescript
  referralCodes: defineTable({
    userId: v.id("users"),
    code: v.string(),           // Unique 8-char code
    referredUsers: v.array(v.id("users")), // Who they referred
    pointsEarned: v.number(),   // Total bonus points from referrals
    createdAt: v.number(),
  })
  .index("by_user", ["userId"])
  .index("by_code", ["code"])
  ```

- [ ] Create `generateReferralCode` mutation
  - Generate unique 8-character code
  - Create referralCodes record
  - Return code

- [ ] Create `applyReferralCode` mutation
  - Input: code (from new user during signup)
  - Validate code exists
  - Check new user hasn't already used a referral
  - When new user subscribes:
    - Award 500 points to referrer
    - Award 500 points to new user
    - Create transactions for both
    - Add new user to referredUsers array

**5.2.2 UI**
- [ ] Add referral section to profile page:
  ```tsx
  <ReferralCard>
    <Text>Invite friends, get 500 points each!</Text>
    <Text style={styles.referralCode}>Your code: {referralCode}</Text>
    <GlassButton onPress={shareReferralCode}>
      Share via WhatsApp/SMS
    </GlassButton>
    <Text style={styles.referralStats}>
      {referredCount} friends referred • {referralPoints} points earned
    </Text>
  </ReferralCard>
  ```

- [ ] Add referral code input to signup flow:
  ```tsx
  <TextInput
    placeholder="Have a referral code? (optional)"
    onChangeText={setReferralCode}
  />
  ```

#### 5.3 Seasonal Events

**5.3.1 Backend (convex/events.ts - NEW FILE)**
- [ ] Create `seasonalEvents` table:
  ```typescript
  seasonalEvents: defineTable({
    name: v.string(),           // "Double Points December"
    description: v.string(),
    type: v.union(
      v.literal("points_multiplier"),  // 2x points
      v.literal("bonus_points"),       // +X bonus per scan
      v.literal("tier_boost"),         // Temporary tier upgrade
    ),
    multiplier: v.optional(v.number()),  // 2.0 for double points
    bonusAmount: v.optional(v.number()), // +50 per scan
    isActive: v.boolean(),
    startDate: v.number(),
    endDate: v.number(),
    createdAt: v.number(),
  })
  .index("by_active", ["isActive"])
  .index("by_dates", ["startDate", "endDate"])
  ```

- [ ] Create `getActiveEvent` query
  - Check if current date within any active event
  - Return event details if active

- [ ] Update `earnPoints` to apply event bonuses:
  ```typescript
  const activeEvent = await getActiveEvent(ctx);
  let finalPoints = basePoints;

  if (activeEvent?.type === "points_multiplier") {
    finalPoints = Math.round(basePoints * activeEvent.multiplier);
  } else if (activeEvent?.type === "bonus_points") {
    finalPoints = basePoints + activeEvent.bonusAmount;
  }
  ```

**5.3.2 UI**
- [ ] Add event banner when active:
  ```tsx
  {activeEvent && (
    <EventBanner>
      <Icon name="star" />
      <Text>{activeEvent.name} - {activeEvent.description}</Text>
    </EventBanner>
  )}
  ```

- [ ] Show event bonus in scan confirmation:
  ```tsx
  <Text>Earned {basePoints} points</Text>
  {eventBonus > 0 && (
    <Text style={styles.bonus}>+ {eventBonus} event bonus! 🎉</Text>
  )}
  ```

#### 5.4 Engagement Notifications

**5.4.1 Backend Cron Jobs**
- [ ] Weekly summary email (Sundays):
  ```
  Subject: "Your week in savings: {pointsEarned} points earned"

  This week you:
  - Scanned {scansCount} receipts
  - Earned {pointsEarned} points (£{value})
  - Current balance: {totalPoints} points

  You're {scansToNext} scans away from {nextTier} tier!
  ```

- [ ] Tier upgrade celebration:
  ```
  Title: "You've reached {newTier} tier! 🎉"
  Body: "You now earn {newRate}pts/scan ({maxScans} scans/month)"
  ```

- [ ] Points redemption confirmation:
  ```
  Title: "£{amount} credit applied to your next bill"
  Body: "{pointsRedeemed} points redeemed successfully"
  ```

---

## Phase 6: Admin Dashboard & Monitoring
**Owner:** Winston (Architect)
**Duration:** 3-4 days
**Depends on:** Phase 3 completion

### Objectives
- Add points system analytics to admin dashboard
- Build fraud detection monitoring
- Create manual review queue
- Add points adjustment tools

### Tasks

#### 6.1 Admin Analytics (convex/admin.ts)

**6.1.1 Points Economics Dashboard**
- [ ] Create `getPointsEconomics` query:
  ```typescript
  export const getPointsEconomics = query({
    handler: async (ctx) => {
      await requireAdmin(ctx);

      const allBalances = await ctx.db.query("pointsBalance").collect();
      const allTransactions = await ctx.db.query("pointsTransactions").collect();

      const totalPointsIssued = sum(allBalances.map(b => b.totalPoints));
      const totalPointsRedeemed = sum(allBalances.map(b => b.pointsUsed));
      const totalPointsOutstanding = sum(allBalances.map(b => b.availablePoints));

      const costLiability = totalPointsOutstanding / 1000; // £

      const recentRedemptions = allTransactions
        .filter(t => t.type === "redeem")
        .filter(t => t.createdAt > Date.now() - 30 * 24 * 60 * 60 * 1000);

      const monthlyRedemptionCost = sum(recentRedemptions.map(t => t.amount)) / 1000;

      return {
        totalPointsIssued,
        totalPointsRedeemed,
        totalPointsOutstanding,
        costLiability,
        monthlyRedemptionCost,
        avgPointsPerUser: avg(allBalances.map(b => b.availablePoints)),
        tierDistribution: groupBy(allBalances, b => b.tier),
      };
    }
  });
  ```

**6.1.2 UI - Add Points Economics Tab**
- [ ] Add "Points Economics" section to Analytics tab:
  ```tsx
  <PointsEconomicsCard>
    <Metric label="Total Points Issued" value={`${totalIssued.toLocaleString()} pts`} />
    <Metric label="Total Redeemed" value={`£${totalRedeemed.toFixed(2)}`} />
    <Metric label="Outstanding Liability" value={`£${liability.toFixed(2)}`} trend="warning" />
    <Metric label="Monthly Redemption Cost" value={`£${monthlyCost.toFixed(2)}`} />

    <TierDistributionChart data={tierDistribution} />
  </PointsEconomicsCard>
  ```

#### 6.2 Fraud Detection Monitoring

**6.2.1 Backend Queries**
- [ ] Create `getFraudAlerts` query:
  ```typescript
  export const getFraudAlerts = query({
    handler: async (ctx) => {
      await requireAdmin(ctx);

      // Get receipts with fraud flags
      const flaggedReceipts = await ctx.db
        .query("receiptHashes")
        .withIndex("by_flags")
        .filter(q => q.field("flags").exists())
        .order("desc")
        .take(100);

      // Get users with multiple flagged scans
      const userFlagCounts = groupBy(flaggedReceipts, r => r.userId);
      const highRiskUsers = Object.entries(userFlagCounts)
        .filter(([_, receipts]) => receipts.length >= 3)
        .map(([userId, receipts]) => ({ userId, flagCount: receipts.length }));

      return {
        flaggedReceipts,
        highRiskUsers,
        totalFlags: flaggedReceipts.length,
        flagTypes: countBy(flaggedReceipts.flatMap(r => r.flags)),
      };
    }
  });
  ```

**6.2.2 UI - Fraud Alerts Tab**
- [ ] Add "Fraud Alerts" tab to admin dashboard:
  ```tsx
  <FraudAlertsPanel>
    <AlertsSummary>
      <AlertCount type="duplicate" count={duplicateCount} />
      <AlertCount type="low_confidence" count={lowConfCount} />
      <AlertCount type="suspicious" count={suspiciousCount} />
    </AlertsSummary>

    <HighRiskUsersTable>
      {highRiskUsers.map(user => (
        <UserRow key={user.userId}>
          <UserInfo userId={user.userId} />
          <FlagCount count={user.flagCount} />
          <Actions>
            <Button onClick={() => reviewUser(user.userId)}>Review</Button>
            <Button onClick={() => suspendUser(user.userId)}>Suspend</Button>
          </Actions>
        </UserRow>
      ))}
    </HighRiskUsersTable>

    <FlaggedReceiptsList>
      {flaggedReceipts.map(receipt => (
        <ReceiptCard key={receipt._id}>
          <ReceiptImage hash={receipt.imageHash} />
          <Flags flags={receipt.flags} />
          <Actions>
            <Button onClick={() => approveReceipt(receipt._id)}>Approve</Button>
            <Button onClick={() => rejectReceipt(receipt._id)}>Reject</Button>
          </Actions>
        </ReceiptCard>
      ))}
    </FlaggedReceiptsList>
  </FraudAlertsPanel>
  ```

#### 6.3 Manual Points Adjustment Tools

**6.3.1 Backend Mutations**
- [ ] Create `adjustUserPoints` mutation:
  ```typescript
  export const adjustUserPoints = mutation({
    args: {
      userId: v.id("users"),
      amount: v.number(),  // Can be negative
      reason: v.string(),
      adminNotes: v.string(),
    },
    handler: async (ctx, args) => {
      await requireAdmin(ctx);

      const admin = await getCurrentUser(ctx);
      const pointsBalance = await getPointsBalance(ctx, args.userId);

      await ctx.db.patch(pointsBalance._id, {
        availablePoints: pointsBalance.availablePoints + args.amount,
        totalPoints: pointsBalance.totalPoints + Math.max(0, args.amount),
      });

      await ctx.db.insert("pointsTransactions", {
        userId: args.userId,
        type: args.amount > 0 ? "bonus" : "refund",
        amount: args.amount,
        source: "admin_adjustment",
        balanceBefore: pointsBalance.availablePoints,
        balanceAfter: pointsBalance.availablePoints + args.amount,
        metadata: {
          adminId: admin._id,
          reason: args.reason,
          notes: args.adminNotes,
        },
        createdAt: Date.now(),
      });

      // Log admin action
      await logAdminAction(ctx, {
        action: "adjust_user_points",
        targetUserId: args.userId,
        details: { amount: args.amount, reason: args.reason },
      });
    }
  });
  ```

**6.3.2 UI - User Detail Page**
- [ ] Add points adjustment form to user detail page:
  ```tsx
  <PointsAdjustmentForm>
    <Input
      label="Points adjustment"
      type="number"
      placeholder="+500 or -500"
      value={adjustmentAmount}
    />
    <Select label="Reason" options={[
      "Fraud compensation",
      "Customer service goodwill",
      "Bug fix adjustment",
      "Fraudulent activity penalty",
    ]} />
    <TextArea label="Admin notes (internal)" />
    <Button onClick={submitAdjustment}>Apply Adjustment</Button>
  </PointsAdjustmentForm>
  ```

#### 6.4 Automated Alerts

**6.4.1 Create Alert Cron Job**
- [ ] Create `checkFraudAlerts` cron (runs every 6 hours):
  ```typescript
  export const checkFraudAlerts = cron({
    handler: async (ctx) => {
      const flaggedReceipts = await ctx.db
        .query("receiptHashes")
        .withIndex("by_flags")
        .filter(q => q.field("flags").exists())
        .filter(q => q.gt("createdAt", Date.now() - 6 * 60 * 60 * 1000))
        .collect();

      if (flaggedReceipts.length > 10) {
        // Send Slack/email alert to admin team
        await sendAdminAlert({
          type: "high_fraud_activity",
          message: `${flaggedReceipts.length} flagged receipts in last 6 hours`,
          severity: "warning",
        });
      }
    }
  });
  ```

---

## Phase 7: Testing & QA
**Owner:** All agents + QA
**Duration:** 1 week
**Depends on:** Phases 1-6 completion

### Objectives
- Comprehensive testing of points system
- Load testing for fraud prevention
- User acceptance testing
- Bug fixes and refinements

### Tasks

#### 7.1 Unit Tests

**7.1.1 Points System Tests (__tests__/points.test.ts)**
- [ ] Test `earnPoints` mutation:
  - Earning within quota
  - Earning at quota limit
  - Earning beyond quota (should fail)
  - Tier progression after earning
  - Streak bonus calculation
- [ ] Test `redeemPoints` mutation:
  - Redeem with sufficient balance
  - Redeem with insufficient balance (should fail)
  - Redeem below minimum (500pts)
  - Points deducted correctly
- [ ] Test `expirePoints` mutation:
  - Points older than 12 months expired
  - Transaction records created
- [ ] Test tier calculations:
  - getTierFromScans accuracy
  - Tier thresholds (0, 20, 50, 100)
  - Earning rates per tier

**7.1.2 Fraud Prevention Tests (__tests__/receiptValidation.test.ts)**
- [ ] Test duplicate detection:
  - Same image hash rejected
  - Different images accepted
- [ ] Test date validation:
  - Receipt >30 days rejected
  - Receipt <1 hour flagged
  - Future date flagged
- [ ] Test rate limiting:
  - 2 scans/day allowed
  - 3rd scan/day rejected
- [ ] Test OCR confidence:
  - <70% rejected
  - 70-85% flagged but accepted
  - >85% accepted
- [ ] Test store validation:
  - Valid UK stores accepted
  - Unknown stores flagged

#### 7.2 Integration Tests

**7.2.1 End-to-End Flow Tests (e2e/tests/points-flow.spec.ts)**
- [ ] New user signup → scan receipt → earn points → points appear in balance
- [ ] Premium user → scan multiple receipts → hit quota → next scan doesn't earn
- [ ] Points balance → subscription renewal → points redeemed → invoice reduced
- [ ] Referral flow → new user applies code → both users get 500pts
- [ ] Streak flow → scan 3 consecutive weeks → get 50pt bonus

**7.2.2 Stripe Integration Tests**
- [ ] Test invoice.created webhook:
  - Points deducted from balance
  - Negative invoice item created
  - Transaction record created
  - Idempotency (duplicate webhook calls)
- [ ] Test subscription.deleted webhook:
  - All points expired
  - Expiration transaction created

#### 7.3 Load Testing

**7.3.1 Receipt Validation Performance**
- [ ] Test 100 concurrent receipt scans
- [ ] Measure validation time (<500ms target)
- [ ] Test hash generation performance
- [ ] Test database query performance with indexes

**7.3.2 Points Redemption at Scale**
- [ ] Test 1,000 simultaneous invoice creations
- [ ] Verify all points redeemed correctly
- [ ] Check for race conditions

#### 7.4 User Acceptance Testing

**7.4.1 Beta Testing Group**
- [ ] Recruit 20 existing users for beta
- [ ] Migrate their cash credits to points
- [ ] Collect feedback on:
  - Clarity of points system
  - Ease of understanding value (points vs £)
  - Satisfaction with earning rates
  - UI/UX issues

**7.4.2 Feedback Collection**
- [ ] In-app survey after first points redemption
- [ ] Track conversion rates (free → premium)
- [ ] Monitor support tickets for confusion

#### 7.5 Bug Fixes & Refinements

- [ ] Fix any bugs found in testing
- [ ] Refine UI based on user feedback
- [ ] Optimize performance bottlenecks
- [ ] Update documentation

---

## Phase 8: Marketing & Launch Preparation
**Owner:** John (PM) + Mary (Analyst)
**Duration:** 1 week
**Depends on:** Phase 7 completion

### Objectives
- Update all marketing materials
- Create launch communications
- Plan A/B tests for conversion optimization
- Prepare support team

### Tasks

#### 8.1 Marketing Materials Update

**8.1.1 App Store Listings**
- [ ] Update App Store description:
  ```
  Title: Oja - Budget Smarter, Earn Rewards

  Subtitle: The grocery budget app that pays you back

  Description:
  Track your grocery spending and earn Oja Rewards points with every receipt scan.
  Like Tesco Clubcard, but for your budget app subscription.

  ✨ What makes Oja different:
  • Earn up to 1,350 points/month (£1.35 off your subscription)
  • Item-level tracking - see exactly what you're spending on
  • Smart pantry - never forget what you have at home
  • Voice assistant - hands-free shopping list management
  • Partner mode - share lists and budgets with family

  💰 Pricing that pays you back:
  • Free: Track spending, earn 100 points/month
  • Premium: £2.99/month, earn 600-1,350 points/month
  • Annual: £21.99/year (save 39%)

  🏆 Rewards tiers:
  Bronze → Silver → Gold → Platinum
  Scan more, earn more, save more.

  Try 7 days free. Cancel anytime.
  ```

- [ ] Update screenshots to show points UI
- [ ] Create demo video showing points earning flow
- [ ] Update keywords: "rewards", "cashback", "points", "loyalty"

**8.1.2 Website Updates**
- [ ] Update homepage hero section:
  ```
  Headline: Shop smarter. Save money. Earn rewards.
  Subhead: Track your grocery budget and earn points that reduce your subscription cost.
  CTA: Start earning today - 7 days free
  ```
- [ ] Add "How Rewards Work" section with tier comparison
- [ ] Add FAQ:
  - "How do I earn points?"
  - "When are points redeemed?"
  - "Do points expire?"
  - "What's the difference between tiers?"

**8.1.3 Social Media Campaign**
- [ ] Create launch announcement posts:
  ```
  📣 Introducing Oja Rewards!

  Your grocery budget app just got better. Now every receipt scan earns you points
  that reduce your subscription cost.

  🥉 Bronze tier: Save £0.60/month
  🥈 Silver tier: Save £0.88/month
  🥇 Gold tier: Save £1.00/month
  💎 Platinum tier: Save £1.35/month

  It's like Tesco Clubcard, but for your Oja subscription.

  Try it free for 7 days 👉 [link]
  ```

- [ ] Create explainer graphics (Canva templates)
- [ ] Schedule 2-week launch campaign

#### 8.2 Email Campaigns

**8.2.1 Existing Users Announcement**
- [ ] Subject: "Your cash credits are now Oja Rewards Points!"
- [ ] Body:
  ```
  Hi {name},

  We've upgraded our rewards system! Your existing cash credits have been
  converted to Oja Rewards Points at a 1:1 rate (£1 = 1,000 points).

  Your current balance: {balance} points (worth £{value})

  What's new:
  ✅ Clearer value - see exactly how many points you're earning
  ✅ Tier progression - unlock higher earning rates as you scan more
  ✅ Streak bonuses - earn extra points for scanning consistently
  ✅ Referral rewards - invite friends, get 500 points each

  Your points will automatically apply to your next invoice.

  [View your points balance] [Learn how it works]
  ```

**8.2.2 Lapsed Users Re-engagement**
- [ ] Subject: "We're paying you back now - come see"
- [ ] Body:
  ```
  Remember Oja? We've added something you'll love.

  Now every receipt scan earns you points that reduce your subscription cost.
  Premium users save £0.60-1.35/month automatically.

  Come back for a free 7-day trial and see how much you can save.

  [Restart your free trial]
  ```

**8.2.3 Free Users Upgrade Campaign**
- [ ] Subject: "You're leaving money on the table"
- [ ] Body:
  ```
  Hi {name},

  You scanned {scanCount} receipts last month, but only earned points from 1.

  If you were Premium:
  • You'd have earned {projectedPoints} points (£{projectedValue})
  • Your effective subscription cost would be £{effectiveCost}/month
  • You'd have unlimited lists and pantry tracking

  Upgrade today and start earning from every scan.

  [See Premium plans]
  ```

#### 8.3 In-App Messaging

**8.3.1 Launch Announcement Modal**
- [ ] Show to all users on first app open after launch:
  ```tsx
  <AnnouncementModal>
    <Icon name="gift" size={64} />
    <Text style={styles.title}>Introducing Oja Rewards! 🎉</Text>
    <Text style={styles.body}>
      Earn points with every receipt scan. Points automatically reduce your
      subscription cost.
    </Text>
    <FeatureList>
      <Feature text="Earn 600-1,350 points/month" />
      <Feature text="Save up to £1.35/month automatically" />
      <Feature text="Unlock tiers for higher rewards" />
    </FeatureList>
    <GlassButton onPress={goToRewards}>See how it works</GlassButton>
  </AnnouncementModal>
  ```

**8.3.2 Feature Discovery Tooltips**
- [ ] Add tooltips for first-time points experiences:
  - First scan with points: "You earned 150 points! 🎉"
  - First tier upgrade: "Congrats! Silver tier unlocked"
  - First redemption: "£0.88 applied to your next bill"

#### 8.4 Support Team Preparation

**8.4.1 Create Support Documentation**
- [ ] Write internal wiki:
  - How points system works
  - Common user questions & answers
  - How to check user points balance (admin dashboard)
  - How to manually adjust points (fraud cases)
  - Escalation process for fraud reports

**8.4.2 Update Help Center**
- [ ] Add "Rewards" category with articles:
  - "How do I earn Oja Rewards points?"
  - "When are my points redeemed?"
  - "What are tiers and how do I unlock them?"
  - "Why didn't my scan earn points?"
  - "Do my points expire?"
  - "What happens to my points if I cancel?"

**8.4.3 Train Support Team**
- [ ] Hold 2-hour training session
- [ ] Role-play common scenarios:
  - User confused about points vs cash
  - User hit earning scan quota
  - User thinks they were overcharged (didn't see credit applied)
  - User reports suspected fraud

#### 8.5 Analytics Setup

**8.5.1 Define Launch KPIs**
- [ ] Track metrics:
  - Free → Premium conversion rate (target: 12-15%)
  - Points redemption rate (target: >80% of users redeem)
  - Average points earned per user
  - Fraud flag rate (target: <5% of scans)
  - Net revenue per user (target: £1.64-2.39)
  - User satisfaction (NPS survey)

**8.5.2 Create Analytics Dashboard**
- [ ] Build Convex queries for launch metrics
- [ ] Create Metabase/Looker dashboard
- [ ] Set up daily email reports for first 30 days

**8.5.3 A/B Test Plans**
- [ ] Plan tests for post-launch optimization:
  - Test 1: Points messaging (emphasize savings vs earning)
  - Test 2: Free tier limits (1 vs 2 earning scans)
  - Test 3: Redemption minimum (500 vs 1,000 points)
  - Test 4: Tier earning rates (current vs +10% boost)

---

## Phase 9: Launch & Monitoring
**Owner:** All agents
**Duration:** 2 weeks
**Depends on:** Phase 8 completion

### Objectives
- Phased rollout to production
- Monitor for issues
- Rapid iteration on feedback
- Celebrate successes

### Tasks

#### 9.1 Phased Rollout

**9.1.1 Soft Launch (Week 1)**
- [ ] Day 1: Enable for 5% of users (flag in Convex)
- [ ] Day 2: Monitor metrics, check for errors
- [ ] Day 3: Increase to 10% if no issues
- [ ] Day 4: Increase to 25%
- [ ] Day 5: Increase to 50%
- [ ] Day 6-7: Monitor weekend behavior

**9.1.2 Full Launch (Week 2)**
- [ ] Day 8: Enable for 100% of users
- [ ] Day 8: Send announcement emails
- [ ] Day 8: Post social media announcements
- [ ] Day 9: Monitor support tickets closely
- [ ] Day 10: Review first invoice redemptions
- [ ] Day 11-14: Continue monitoring

#### 9.2 Issue Response Plan

**9.2.1 Critical Issues (Production Down)**
- [ ] Rollback plan ready (feature flag off)
- [ ] On-call rotation for first 2 weeks
- [ ] Incident response checklist:
  1. Disable feature flag
  2. Assess impact (how many users affected)
  3. Fix issue in staging
  4. Test fix thoroughly
  5. Re-enable for 5% of users
  6. Monitor and gradually re-rollout

**9.2.2 Non-Critical Issues**
- [ ] Bug triage process (P0/P1/P2)
- [ ] Fix priority:
  - P0: Revenue-impacting (points not redeeming) - 4hr SLA
  - P1: User-impacting (UI bugs, confusion) - 24hr SLA
  - P2: Minor issues (cosmetic, edge cases) - 1 week SLA

#### 9.3 Daily Monitoring (First 2 Weeks)

**9.3.1 Metrics to Watch**
- [ ] Points issued vs redeemed (should be ~30-40% redemption in month 1)
- [ ] Fraud flag rate (target <5%)
- [ ] Conversion rate (free → premium)
- [ ] Support ticket volume (expect 20-30% increase initially)
- [ ] Stripe invoice success rate (should stay >99%)
- [ ] App crash rate (should stay <1%)

**9.3.2 Daily Standup**
- [ ] Review previous day's metrics
- [ ] Discuss any support escalations
- [ ] Plan bug fixes or quick wins
- [ ] Adjust rollout pace if needed

#### 9.4 User Feedback Collection

**9.4.1 In-App Survey (After First Redemption)**
- [ ] Question 1: "How easy was it to understand the points system?"
  - Very easy / Easy / Neutral / Difficult / Very difficult
- [ ] Question 2: "Do you feel the rewards are fair value?"
  - Yes, very fair / Fair / Neutral / Unfair / Very unfair
- [ ] Question 3: "Would you recommend Oja to a friend?"
  - Definitely / Probably / Not sure / Probably not / Definitely not
- [ ] Question 4 (open): "What would make the rewards system better?"

**9.4.2 Support Ticket Analysis**
- [ ] Categorize all points-related tickets
- [ ] Identify top 3 confusion points
- [ ] Create quick-fix solutions (UI tweaks, help text, etc.)

#### 9.5 Iteration & Optimization

**9.5.1 Quick Wins (Week 1-2)**
- [ ] Fix any UI/UX issues discovered
- [ ] Add tooltips for confusing elements
- [ ] Update help text based on common questions
- [ ] Adjust fraud detection thresholds if too strict/lenient

**9.5.2 Data-Driven Adjustments (Week 3-4)**
- [ ] Review earning rates (are tiers balanced?)
- [ ] Review redemption minimums (is 500pts too high?)
- [ ] Review free tier limits (is 1 scan too restrictive?)
- [ ] Consider tier threshold adjustments

#### 9.6 Celebrate Success

**9.6.1 Internal Wins**
- [ ] Share metrics with team weekly
- [ ] Celebrate milestones:
  - 1,000 users earning points
  - 100 successful redemptions
  - First Platinum tier user
  - £1,000 total points redeemed

**9.6.2 Public Wins**
- [ ] Share user testimonials on social media
- [ ] Create case study: "Sarah saved £8.40 in her first month"
- [ ] Blog post: "Month 1 Results: X users saved £Y"

---

## Phase 10: Post-Launch Enhancements
**Owner:** John (PM)
**Duration:** Ongoing
**Depends on:** Phase 9 completion + 30 days data

### Future Enhancements (Backlog)

#### 10.1 Advanced Features
- [ ] Points gifting (send points to partner)
- [ ] Points marketplace (redeem for Amazon vouchers, etc.)
- [ ] Premium+ tier (£4.99/mo with higher earning caps)
- [ ] Business/family plans (multi-user shared points pool)
- [ ] Points challenges (weekly goals with bonus rewards)

#### 10.2 Gamification Expansion
- [ ] Achievements system (badges for milestones)
- [ ] Leaderboards (top earners - opt-in)
- [ ] Seasonal quests ("Scan 10 receipts in December for 500 bonus pts")
- [ ] Partner rewards (earn extra at specific stores)

#### 10.3 Data Intelligence
- [ ] Personalized earning recommendations
- [ ] Price drop alerts (items you buy regularly)
- [ ] Spending insights powered by receipt data
- [ ] Store comparison tools

---

## Success Metrics

### Month 1 Targets
- [ ] Free → Premium conversion: 12%+ (up from ~5%)
- [ ] Points redemption rate: 60%+ of premium users
- [ ] Fraud flag rate: <5% of scans
- [ ] Net revenue per premium user: £1.80+ average
- [ ] User satisfaction (NPS): 40+ (promoters - detractors)
- [ ] Support tickets: <10% related to points confusion

### Month 3 Targets
- [ ] Free → Premium conversion: 15%+
- [ ] Points redemption rate: 80%+ of premium users
- [ ] Monthly Active Users: +20% from pre-launch
- [ ] Churn rate: <5% monthly
- [ ] Referral conversions: 100+ new users from referrals

### Month 6 Targets
- [ ] MRR: +30% from pre-launch
- [ ] Premium user base: 2,000+ users
- [ ] Average tier: Silver (users engaging long-term)
- [ ] Total points redeemed: £10,000+
- [ ] App Store rating: 4.5+ stars

---

## Risk Mitigation

### Technical Risks
| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Stripe webhook failures | High | Medium | Retry logic, manual reconciliation tool, monitoring alerts |
| Database performance issues | High | Low | Comprehensive indexing, load testing, query optimization |
| Points calculation bugs | High | Medium | Extensive unit tests, staging environment testing, gradual rollout |
| Fraud at scale | Medium | Medium | Multi-layer validation, manual review queue, ML anomaly detection (future) |

### Business Risks
| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Users don't understand points | High | Medium | Clear UI, onboarding tooltips, help center, support training |
| Conversion doesn't improve | High | Low | A/B testing, iterate on free tier limits, improve messaging |
| Fraud drains profitability | Medium | Low | Robust validation, daily monitoring, quick suspension tools |
| Negative user reaction | Medium | Low | Grandfather existing users, clear communication, beta testing first |

---

## ⚠️ RECOMMENDED FIXES — CRITICAL ACTION REQUIRED

### 🔴 P0 — BLOCKING PRODUCTION LAUNCH

#### Fix #1: Integrate Points Earning into Receipt Flow
**Status:** ❌ NOT IMPLEMENTED
**Impact:** CRITICAL — Users cannot earn points from receipt scans
**Estimated Time:** 30 minutes
**Priority:** P0 — MUST FIX BEFORE LAUNCH

**Problem:**
- `earnPointsInternal` mutation exists but is **never called** during receipt processing
- Frontend displays points UI but backend never populates the data
- Silent failure — no errors, points just don't accumulate

**Evidence:**
```typescript
// convex/receipts.ts:134
import { earnPointsInternal } from "./points"; // ✅ IMPORTED

// convex/receipts.ts:246-251
if (validation.isValid && !receipt.earnedPoints) {
  // Validation passed. Points will be awarded when the user confirms the receipt.
  // ❌ COMMENT IS MISLEADING — NO CODE EXISTS TO AWARD POINTS
}
```

**Required Changes:**

**Step 1: Add Schema Fields**
```typescript
// File: convex/schema.ts
// Location: receipts table definition (around line 200)

receipts: defineTable({
  // ... existing fields ...
  earnedPoints: v.optional(v.boolean()),    // ✅ ADD THIS
  pointsEarned: v.optional(v.number()),     // ✅ ADD THIS
  // ... rest of schema ...
})
```

**Step 2: Integrate Points Earning**
```typescript
// File: convex/receipts.ts
// Location: Lines 246-251 (replace existing validation block)

if (validation.isValid) {
  // ✅ ADD THIS BLOCK
  const pointsResult = await ctx.runMutation(
    internal.points.earnPointsInternal,
    {
      userId: user._id,
      receiptId: args.id
    }
  );

  if (pointsResult && pointsResult.earned) {
    updates.earnedPoints = true;
    updates.pointsEarned = pointsResult.pointsAmount + (pointsResult.bonusPoints || 0);
  } else {
    updates.earnedPoints = false;
    // User can still see the receipt, but no points earned (quota hit or validation failed)
  }
} else if (!validation.isValid && validation.reason) {
  console.warn(`Receipt ${args.id} failed validation: ${validation.reason}`);
  updates.earnedPoints = false; // Explicitly mark as not earned
}
```

**Step 3: Import Internal API**
```typescript
// File: convex/receipts.ts
// Location: Top of file (around line 8)

import { internal } from "./_generated/api"; // ✅ ADD THIS if not already imported
```

**Testing:**
1. Scan a receipt
2. Verify points balance increases
3. Check pointsTransactions table has new record
4. Verify tierProgress increments
5. Test monthly cap enforcement (scan 4-6 receipts)
6. Test streak bonuses (scan in consecutive weeks)
7. Test fraud validation rejections (duplicate hash, old date)

---

### 🟡 P1 — RECOMMENDED BEFORE LAUNCH

#### Fix #2: Enable invoice.created Webhook in Stripe Dashboard
**Status:** ⏸️ NEEDS VERIFICATION
**Impact:** HIGH — Points won't redeem against invoices
**Estimated Time:** 5 minutes
**Priority:** P1 — SHOULD FIX BEFORE LAUNCH

**Problem:**
- Code exists in `convex/stripe.ts:170-200` to handle `invoice.created` events
- Webhook may not be enabled in Stripe Dashboard
- First invoice and renewals won't have points credits applied

**Required Changes:**
1. Log into Stripe Dashboard → Webhooks
2. Click on your webhook endpoint
3. Verify "invoice.created" event is **checked**
4. If not, click "Add events" and enable it
5. Save changes

**Testing:**
1. Create test subscription in Stripe test mode
2. Scan receipts to earn points (>500pts)
3. Trigger invoice creation
4. Verify negative invoice item appears with description "Oja Points redemption (XXX pts applied)"
5. Verify pointsTransactions table has redeem record

---

#### Fix #3: Add End-to-End Integration Tests
**Status:** ❌ NOT IMPLEMENTED
**Impact:** MEDIUM — Risk of regression bugs
**Estimated Time:** 2-3 hours
**Priority:** P1 — SHOULD FIX BEFORE LAUNCH

**Problem:**
- No automated tests for points earning flow
- No automated tests for Stripe redemption flow
- Manual testing only catches obvious bugs

**Required Changes:**
Create new test file: `__tests__/points-integration.test.ts`

```typescript
describe("Points Earning Integration", () => {
  it("should earn points on receipt scan", async () => {
    // 1. Create user
    // 2. Upload receipt
    // 3. Complete AI processing
    // 4. Verify pointsBalance updated
    // 5. Verify pointsTransaction created
  });

  it("should enforce monthly earning cap", async () => {
    // 1. Create bronze user (max 4 scans/mo)
    // 2. Scan 5 receipts
    // 3. Verify first 4 earn points
    // 4. Verify 5th returns { earned: false, reason: "monthly_limit_reached" }
  });

  it("should award streak bonuses", async () => {
    // 1. Mock weekly scans
    // 2. Verify 3-week streak bonus (50pts)
    // 3. Verify transaction type = "bonus"
  });
});

describe("Points Redemption Integration", () => {
  it("should apply points to Stripe invoice", async () => {
    // 1. Create user with 1000 points
    // 2. Trigger subscription renewal
    // 3. Mock invoice.created webhook
    // 4. Verify negative invoice item created
    // 5. Verify pointsBalance deducted
  });
});
```

---

### 🟢 P2 — POST-LAUNCH ENHANCEMENTS

#### Fix #4: Implement Point Expiration Cron
**Status:** ⏸️ NOT IMPLEMENTED
**Impact:** LOW — Points accumulate indefinitely (not critical for MVP)
**Estimated Time:** 1 hour
**Priority:** P2 — CAN DEFER TO POST-LAUNCH

**Problem:**
- `expirePoints` mutation exists (points.ts:315-344)
- No scheduled cron job calls it
- Points never expire (infinite liability)

**Required Changes:**
```typescript
// File: convex/crons.ts

crons.monthly(
  "expire-old-points",
  { day: 1 }, // Run on 1st of every month
  internal.points.expireOldPoints // Create this internal mutation
);
```

```typescript
// File: convex/points.ts
// Add new internal mutation

export const expireOldPoints = internalMutation({
  handler: async (ctx) => {
    const oneYearAgo = Date.now() - (365 * 24 * 60 * 60 * 1000);

    // Find transactions older than 12 months
    const oldTransactions = await ctx.db
      .query("pointsTransactions")
      .withIndex("by_created")
      .filter((q) => q.and(
        q.lt(q.field("createdAt"), oneYearAgo),
        q.eq(q.field("type"), "earn")
      ))
      .collect();

    // Group by userId and sum points
    const expiryMap = new Map<string, number>();
    for (const tx of oldTransactions) {
      const current = expiryMap.get(tx.userId) || 0;
      expiryMap.set(tx.userId, current + tx.amount);
    }

    // Call expirePoints for each user
    for (const [userId, points] of expiryMap.entries()) {
      await ctx.runMutation(internal.points.expirePoints, {
        userId: userId as any,
        points,
        reason: "12_month_expiration"
      });
    }

    return { usersAffected: expiryMap.size, pointsExpired: Array.from(expiryMap.values()).reduce((a,b) => a+b, 0) };
  }
});
```

---

#### Fix #5: Add Stripe-Convex Reconciliation Cron
**Status:** ⏸️ NOT IMPLEMENTED
**Impact:** LOW — Webhook retries usually work
**Estimated Time:** 2 hours
**Priority:** P2 — CAN DEFER TO POST-LAUNCH

**Problem:**
- If Stripe webhook is missed (network issue, server downtime), points won't be redeemed
- No automated reconciliation to catch missed events
- Requires manual intervention

**Required Changes:**
```typescript
// File: convex/crons.ts

crons.daily(
  "reconcile-stripe-points",
  { hourUTC: 2 }, // Run at 2 AM UTC
  internal.stripe.reconcilePointRedemptions
);
```

```typescript
// File: convex/stripe.ts
// Add new internal mutation

export const reconcilePointRedemptions = internalMutation({
  handler: async (ctx) => {
    // 1. Query all subscriptions with status "active"
    // 2. For each subscription, check Stripe API for recent invoices
    // 3. Compare Stripe invoice line items vs pointsTransactions records
    // 4. If discrepancy found, log alert and optionally auto-fix
    // 5. Return reconciliation report
  }
});
```

---

#### Fix #6: Add Points Admin Dashboard
**Status:** ⏸️ NOT IMPLEMENTED
**Impact:** LOW — Can manage via database queries initially
**Estimated Time:** 1 day
**Priority:** P2 — CAN DEFER TO POST-LAUNCH

**Problem:**
- No UI for admin to manually adjust points
- No fraud review queue for flagged receipts
- No points economics dashboard

**Required Changes:**
Add to `app/(app)/admin/` directory:
- `PointsTab.tsx` - Points balance search, manual adjustments
- `FraudQueueTab.tsx` - Review receipts with fraud flags
- `PointsAnalyticsTab.tsx` - Economics dashboard (earn rate, redeem rate, liability)

---

## 📋 PRE-LAUNCH CHECKLIST

Before enabling points system in production, verify:

### Backend
- [ ] **Fix #1 implemented** — earnPointsInternal called in receipt flow ✅ CRITICAL
- [ ] Schema updated with earnedPoints + pointsEarned fields
- [ ] Points earning tested end-to-end (scan → earn → balance update)
- [ ] Monthly cap enforcement tested (4-6 scans depending on tier)
- [ ] Fraud validation tested (duplicate rejection, rate limiting)
- [ ] Streak bonuses tested (3wk, 4wk, 8wk, 12wk)

### Stripe Integration
- [ ] **Fix #2 verified** — invoice.created webhook enabled in Stripe
- [ ] Points redemption tested (earn 500pts → subscribe → verify credit applied)
- [ ] Monthly renewal tested (points apply to second invoice)
- [ ] Test mode fully validated before switching to live mode

### Frontend
- [ ] Subscription page displays points balance correctly
- [ ] Points history page shows transactions
- [ ] Receipt confirmation screen shows "Earned Xpts" message
- [ ] Tier progression UI updates correctly
- [ ] Empty states tested (new user, 0 points)

### Monitoring
- [ ] Sentry alerts configured for points-related errors
- [ ] Daily cron to check points liability (total availablePoints)
- [ ] Alert if fraud flag rate > 10%
- [ ] Alert if redemption rate < 50% (users not understanding system)

### Documentation
- [ ] Help center article: "How do Oja Rewards Points work?"
- [ ] FAQ: "When do points expire?", "How do I redeem points?", "What if I cancel?"
- [ ] Support team trained on points system

---

## Appendix

### A. Competitive Research Sources
- [Morrisons More Card Guide](https://www.groupon.co.uk/discount-codes/blog/morrisons-more-card-worth-it)
- [UK Supermarket Loyalty Programs Comparison](https://www.lovemoney.com/guides/55593/uk-supermarket-loyalty-schemes-tesco-sainsburys-asda-iceland-clubcard-nectar)
- [Tesco vs Sainsbury's Points Calculator](https://procalculator.co.uk/loyalty-points-value-calculator-tesco-sainsburys/)

### B. Technical Architecture Diagrams
(To be added: Database schema ERD, points flow diagram, Stripe integration sequence diagram)

### C. UI/UX Mockups
(To be added: Figma links for points balance UI, limit walls, tier progression)

### D. Migration Checklist
- [ ] Backup production database
- [ ] Run migration script in staging
- [ ] Verify all users migrated correctly
- [ ] Run migration in production
- [ ] Send user announcement emails
- [ ] Monitor for issues in first 24 hours

---

**Document Version:** 2.0 (Post-Audit)
**Last Updated:** 2026-03-02 (Audit Completed)
**Next Review:** After Fix #1 implementation

**⚠️ IMPORTANT:** See "RECOMMENDED FIXES — CRITICAL ACTION REQUIRED" section above for required changes before launch.
