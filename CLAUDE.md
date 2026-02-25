# CLAUDE.md

This file provides guidance to Claude Code when working with code in this repository.

## Model Configuration (IMPORTANT)

**Required model:** `claude-opus-4-6` (Opus 4.6)

If user reports degraded performance or asks about the model:
1. Check `~/.claude/settings.json` - the `"model"` field MUST be `"claude-opus-4-6"`
2. If it shows `"opus"` or `"claude-opus-4-5"`, fix it immediately
3. Claude Code auto-migrations can reset this setting after updates

## Quick Reference

**What is Oja?** Budget-first shopping app for UK shoppers - pantry tracking, shopping lists with budgets, receipt scanning, voice assistant (Tobi), gamification.

**Tech Stack:** Expo SDK 54 + TypeScript + Expo Router + Convex (backend) + Clerk (auth) + Stripe (payments)

## Commands

```bash
# Development
npx expo start                    # Start dev server
npx convex dev                    # Start Convex backend (required)

# Testing
npm test                          # Jest unit tests (31 test files)
npm run test:watch                # Watch mode
npm run e2e                       # Playwright E2E (16 specs, 398 cases)
npm run e2e:ui                    # Playwright UI mode

# Code Quality
npm run lint                      # ESLint (flat config)
npm run typecheck                 # TypeScript check
```

## Dev Build & Native Modules

**This project uses a dev build (development client), NOT Expo Go.**

**How it works:**
- `npx expo start` runs **Metro bundler** which bundles JS/TS code and serves it to the phone
- The **APK on phone** contains the native code (Java/Kotlin) and connects to Metro via QR code
- Metro can hot-reload JS instantly, but **native modules live in the APK**

**When adding native modules:**
1. Native modules (e.g., `react-native-keyboard-controller`, `expo-speech-recognition`) require rebuilding the APK
2. If you see "package doesn't seem to be linked" errors, the APK needs to be rebuilt
3. Rebuild with: `npx expo run:android` (or `eas build --profile development --platform android`)
4. Reinstall the new APK on the phone

**Safe wrappers for native modules:**
- `lib/keyboard/safeKeyboardController.tsx` - Wraps `react-native-keyboard-controller` with fallback to `KeyboardAvoidingView` if native module isn't linked
- Always use `SafeKeyboardProvider` and `SafeKeyboardAwareScrollView` instead of importing directly from `react-native-keyboard-controller`
- This allows development to continue even if the APK hasn't been rebuilt yet

## Architecture

### Navigation (Expo Router)

```
app/
├── _layout.tsx              # Root: Clerk + Convex providers
├── +not-found.tsx           # Catch-all for OAuth callbacks
├── (auth)/                  # Sign in/up/forgot-password
├── onboarding/              # welcome → cuisine → pantry-seeding → store-selection → review
└── (app)/                   # Protected routes
    ├── _layout.tsx          # PersistentTabBar + VoiceFAB
    ├── (tabs)/              # Bottom tabs: Pantry, Lists, Scan, Profile
    │   ├── index.tsx        # Pantry (1,084 lines)
    │   ├── lists.tsx        # Shopping lists
    │   ├── scan.tsx         # Receipt scanning
    │   └── profile.tsx      # User profile
    ├── list/[id].tsx        # Shopping list detail (1,279 lines)
    ├── receipt/[id]/        # confirm.tsx + reconciliation.tsx
    ├── insights.tsx         # Gamification/analytics (1,620 lines)
    ├── subscription.tsx     # Stripe payment flow
    ├── ai-usage.tsx         # Voice/scan usage tracking
    ├── admin.tsx            # Admin panel (feature-gated)
    └── ...                  # partners, notifications, price-history, etc.
```

### Backend (Convex)

All backend in `convex/`. **28 tables** in schema.ts:
- **Core:** users, pantryItems, shoppingLists, listItems, receipts
- **Pricing:** currentPrices, priceHistory, itemVariants
- **Collaboration:** listPartners, inviteCodes, listMessages, itemComments
- **Gamification:** achievements, streaks, weeklyChallenges, loyaltyPoints
- **Subscriptions:** subscriptions, scanCredits, aiUsage

**Key files:**
- `ai.ts` - Gemini 2.0 Flash + OpenAI fallback
- `lib/voiceTools.ts` - **30 voice tools** for Tobi assistant
- `lib/featureGating.ts` - Free trial (full features, time-limited) → paid subscription
- `stores.ts` - 13 UK stores with brand colors

**Pattern:** Every mutation must call `requireCurrentUser(ctx)` for auth.

### Price Intelligence (Zero-Blank Prices)

Every item shows a price. Three-layer cascade:
1. **Personal History** - User's own receipts (highest trust)
2. **Crowdsourced** - All users' receipt data by store/region
3. **AI Estimate** - Gemini with OpenAI fallback

Key files: `itemVariants.ts`, `currentPrices.ts`, `priceHistory.ts`

### Glass UI Design System

Import from `@/components/ui/glass/`. Tokens in `@/lib/design/glassTokens.ts`.

**Colors:**
- Background: #0D1528 → #1B2845 → #101A2B (gradient)
- Primary accent: #00D4AA (teal) - **CTAs only**
- Warm accent: #FFB088 (celebrations)
- Secondary: white/gray/indigo

**Key components:** GlassCard, GlassButton, GlassInput, CircularBudgetDial, GlassAnimations

**UI/UX Guidelines:**
- **Mandatory Page Load Animation:** All pages must implement the "Oja Smooth Load" pattern:
  - Use `pageAnimationKey` (incremented on focus) for the initial staggered entrance of static elements.
  - Use `animationKey` (incremented on mode/tab/filter switches) for dynamic content sections to ensure smooth data transitions without full-page reloads.
  - Wrap elements in `AnimatedSection` with staggered delays (e.g., 0ms, 50ms, 100ms, 150ms...).
- **Haptics:** Always provide haptic feedback for primary actions (`Light` for taps, `Medium` for success/deletions).
- **Consistency:** Maintain standard 16px horizontal margins (`spacing.lg`) for all main container elements, headers, and switchers.
- **Loading States:** Use early returns with `SkeletonCard` or `SkeletonPantryItem` while data is `undefined`.

### Voice Assistant (Tobi)

**30 function tools** for full CRUD via Gemini 2.0 Flash.
- STT: `expo-speech-recognition` (on-device)
- TTS cascade: Google Cloud Neural2 → expo-speech
- Hook: `hooks/useVoiceAssistant.ts` (523 lines)
- Tools: `convex/lib/voiceTools.ts`

Requires dev build (native modules).

### Key Hooks & Utilities

| Hook/Utility | Purpose |
|--------------|---------|
| `useVoiceAssistant` | Voice assistant lifecycle |
| `useVariantPrefetch` | Size/Price modal cache warming |
| `usePartnerRole` | List permissions (viewer/editor/approver) |
| `useDelightToast` | Gamification celebrations |
| `lib/haptics/safeHaptics` | Safe haptic feedback |
| `lib/sizes/sizeNormalizer` | UK size parsing (pints, ml, kg) |
| `lib/icons/iconMatcher` | Validated MaterialCommunityIcons |
| `lib/keyboard/safeKeyboardController` | Safe keyboard wrapper (dev build fallback) |

## Keyboard Awareness Pattern

Use `react-native-keyboard-controller` (NOT Reanimated's `useAnimatedKeyboard`). See `list/[id].tsx` for the reference implementation: dynamic overlap algorithm using `useReanimatedKeyboardAnimation` + `useReanimatedFocusedInput` + `useKeyboardHandler({ onEnd })`. Never call `Dimensions.get()` inside a worklet — capture on JS thread and close over it.

**Windows build:** `android/app/build.gradle` has `buildStagingDirectory = file("C:/b")` to avoid 260-char path limit.

## Admin Dashboard

**Access:** `app/(app)/admin.tsx` (1,032 lines) - Feature-gated via `isAdmin` flag on user record

### Bootstrap First Admin

**Migration:** `convex/migrations/grantAdminAccess.ts`

To grant admin access to the app creator (or first admin):
1. Sign into the app with your account to create user record
2. Open Convex Dashboard → Functions
3. Run `migrations/grantAdminAccess:grantAdmin`
4. Restart app and navigate to `/admin`

Once bootstrapped, admins can grant admin privileges to others via the dashboard (Users tab → shield icon).

### 5-Tab Interface

#### **1. OVERVIEW Tab** - Platform Monitoring
- **System Health** - Receipt processing success rate, failed count, processing queue
- **Analytics Cards** - Total users, new/active (week), lists, receipts, GMV (£)
- **Revenue Report** - MRR, ARR, subscriber breakdown (monthly/annual/trial)
- **Audit Logs** - Last 10 admin actions with timestamps and executor names

#### **2. USERS Tab** - User Management
- **Search & Listing** - 50 users, searchable by name/email (min 2 chars)
- **User Detail Modal** - Receipts count, lists count, total spent, lifetime scans, subscription status
- **Admin Actions:**
  - `+14d Trial` - Extend trial by 14 days
  - `Free Premium` - Grant 1-year complimentary annual access
  - `Suspend` - Toggle user suspension
  - `Toggle Admin` - Promote/demote admin privileges (shield icon)

All actions logged to `adminLogs` table.

#### **3. RECEIPTS Tab** - Data Quality Control
- **Flagged Receipts** - Auto-detected problems (`processingStatus: "failed"` or `total: 0`)
  - Actions: Delete individual, **Bulk Approve All**
- **Price Anomalies** - Items with >50% deviation from average (max 50 shown)
  - Actions: Delete/override individual prices
- **Recent Receipts** - Last 20 with store, amount, user, status badges

#### **4. CATALOG Tab** - Data Normalization
- **Duplicate Store Detection** - Finds name variants ("Tesco"/"TESCO"/"tesco Express")
  - Action: **Merge** to consolidate all variants → updates all price records
- **Categories Inventory** - Lists all pantry categories with item counts

#### **5. SETTINGS Tab** - Platform Controls
- **Feature Flags** - Toggle on/off, create new flags (kill switches, A/B testing)
- **Announcements** - Create with title/body/type (info/warning/promo)
  - Optional scheduling with `startsAt`/`endsAt` timestamps
  - Toggle active/inactive visibility

### Backend Architecture

**Admin API:** `convex/admin.ts` (953 lines)

**Key Queries:**
```
getAnalytics, getRevenueReport, getSystemHealth, getAuditLogs
getUsers, searchUsers, filterUsers, getUserDetail
getRecentReceipts, getFlaggedReceipts, getPriceAnomalies
getCategories, getDuplicateStores
getFeatureFlags, getAnnouncements
```

**Mutations:**
```
toggleAdmin, extendTrial, grantComplimentaryAccess, toggleSuspension
deleteReceipt, bulkReceiptAction, overridePrice
mergeStoreNames
toggleFeatureFlag, createAnnouncement, toggleAnnouncement
```

**Auth Pattern:** All queries/mutations require `requireAdmin(ctx)` check. Returns `null`/`[]` if not admin.

### Audit Logging

Every admin action creates an `adminLogs` record:
- `adminUserId` - Who performed the action
- `action` - Action type (grant_admin, delete_receipt, etc.)
- `targetType` - Entity type (user, receipt, featureFlag, etc.)
- `targetId` - Affected entity ID
- `details` - Human-readable description
- `createdAt` - Timestamp

**Indexed by:** `adminUserId`, `action`

### Safeguards

| Operation | Protection |
|-----------|-----------|
| Delete receipt | Confirmation modal + audit log |
| Suspend user | Confirmation + warning haptic + audit log |
| Override price | Validation (£0 < price ≤ £10,000) |
| Merge stores | Confirmation modal, shows affected count |
| Bulk operations | Action-level confirmation (no per-item) |

### Performance Notes

- **Full table scans:** `searchUsers`, `getPriceAnomalies`, `getRecentReceipts` collect entire tables before filtering (opportunity for index optimization at scale)
- **Bulk store merge:** Updates all matching price records in loop (could be slow with 10k+ records)
- **Real-time updates:** Uses Convex `useQuery` hooks for auto-reactivity

## Critical Rules

1. **Read `project-context.md` first** - If it exists, always read before implementation
2. **Use indexes** - Never scan full Convex tables
3. **Optimistic updates** - For instant UX feedback
4. **Haptic feedback** - On all interactions via `safeHaptics.ts`
5. **Handle all states** - Loading, error, empty, success
6. **Zero-Blank Prices** - Every item must show a price
7. **Validated icons only** - Use `iconMatcher.ts` for MaterialCommunityIcons
8. **NEVER kill node.exe** - `taskkill //F //IM node.exe` kills Claude Code itself. To kill other Node processes (e.g., Metro), use `npx kill-port <port>` or find the specific PID with `netstat -ano | findstr :<port>` and kill only that PID
9. **No `any` types** - Never use `any` type annotations. Use proper types, generics, or `unknown` with type guards
10. **Parallel sub-agents** - Always deploy multiple sub-agents in parallel where possible to execute tasks concurrently, preserving context window
11. **Never fix without approval** - Always present analysis and proposed solution first. Never jump into fixing things without the user's express approval

## Feature Development Workflow

For every new feature, follow this workflow:

### 1. Planning Phase
- Run an **ultrathink session in party mode** (`/party-mode`) with all relevant BMAD agents
- Discuss architecture, edge cases, and implementation approach
- Identify affected files and potential risks

### 2. Create Implementation Plan
- Create a new `.md` file in the **project root** named `FEATURE-NAME-IMPLEMENTATION.md`
- Structure the file with **numbered phases** (e.g., Phase 1, Phase 2, etc.)
- Each phase should have **checkboxes** for tracking progress:

```markdown
## Phase 1: Foundation
- [ ] Task 1 description
- [ ] Task 2 description
- [x] Completed task (check when done)

## Phase 2: Core Logic
- [ ] Task 1 description
...
```

### 3. Execution
- User tells Claude which phase to execute (e.g., "execute phase 3")
- Claude spawns **parallel sub-agents** where possible for efficiency
- Claude checks off completed items in the plan file as work progresses
- Run tests after each phase before moving to the next

### 4. Cleanup
- Delete the implementation `.md` file once feature is complete
- Update this CLAUDE.md if the feature adds new patterns or conventions

## Testing

**Unit Tests (31 files in `__tests__/`):**
- Admin, insights, partners, subscriptions, sizes, components

**E2E Tests (16 specs in `e2e/tests/`):**
- Full user journeys: auth → onboarding → pantry → lists → receipts → insights
- Playwright with shared Clerk auth state
- 19 real UK receipt images for scanning tests

**Known E2E quirks:**
- `AnimatedPressable` clicks need `page.evaluate()` JS click
- `networkidle` never fires (Convex WebSocket) - use `waitForConvex()` helper

## Environment Variables

**Client (.env):**
```
EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_...
EXPO_PUBLIC_CONVEX_URL=https://...
```

**Server (Convex Dashboard):**
```
GEMINI_API_KEY, OPENAI_API_KEY, STRIPE_SECRET_KEY, CLERK_SECRET_KEY
```

## Large Files (Refactoring Candidates)

| File | Lines | Notes |
|------|-------|-------|
| insights.tsx | 1,620 | Gamification + trends + achievements |
| list/[id].tsx | 1,279 | Shopping list detail (improved from 3000+) |
| (tabs)/index.tsx | 1,084 | Pantry screen (improved from 1800+) |
| admin.tsx | 1,032 | Admin dashboard |

## Subscription System (PINNED — Revisit Later)

**Status:** Core bugs fixed (Feb 2025). Needs Stripe Dashboard config + end-to-end live testing.

### Architecture
- **Trial:** 7 days, auto-started in `convex/users.ts:completeOnboarding()` (lines 182-212). Sets `plan: "premium_monthly"`, `status: "trial"`.
- **Feature Gating:** Single source of truth in `convex/lib/featureGating.ts`. Free tier: 3 lists, 50 pantry, 3 scans/mo, 20 voice/mo, `partnerMode: false`. Premium: unlimited (voice capped at 200/mo).
- **Tier System:** Bronze→Silver(20)→Gold(50)→Platinum(100) based on lifetime scans. Config in `featureGating.ts:TIER_TABLE`.
- **Scan Credits:** Premium users earn £0.25-0.30/scan, capped per tier. Applied as negative invoice item via `invoice.created` webhook.
- **Stripe Flow:** `createCheckoutSession` → Stripe Checkout → `checkout.session.completed` webhook → `handleCheckoutCompleted` → subscription active + scanCredits record created.

### Key Files
| File | Purpose |
|------|---------|
| `convex/lib/featureGating.ts` | **Single source** for features, tiers, premium checks |
| `convex/subscriptions.ts` | Queries, mutations, earnScanCredit, expireTrials cron |
| `convex/stripe.ts` | Checkout, portal, webhooks, getAndMarkScanCredits |
| `convex/http.ts` | Webhook route (5 events including `invoice.created`) |
| `convex/users.ts:159-216` | `completeOnboarding` — auto-starts 7-day trial |
| `convex/schema.ts:502-516` | subscriptions table (has `by_status` index) |
| `convex/schema.ts:540-573` | scanCredits + scanCreditTransactions tables |
| `app/(app)/subscription.tsx` | Subscription UI page |

### Bugs Fixed (This Session)
1. **"Current Plan" badge during trial** — `subscription.tsx:451` now checks `status === "active"`
2. **handleCheckoutCompleted full table scan** — replaced `.collect().find()` with `ctx.db.get(userId)`, throws on failure instead of silent return
3. **expireTrials full table scan** — added `by_status` index to schema, query uses `.withIndex("by_status")`
4. **Duplicate helpers** — `getFreeFeatures`, `getPlanFeatures`, `isEffectivelyPremium`, `effectiveStatus`, tier config all consolidated into `featureGating.ts`. `subscriptions.ts` and `stripe.ts` import from there
5. **partnerMode gating** — set to `false` in free features so `requireFeature()` correctly blocks free users
6. **Tier table duplication** — `stripe.ts:handleSubscriptionUpdated` now imports `getTierFromScans` from featureGating
7. **Scan credits never applied to Stripe** — implemented `invoice.created` webhook handler + `getAndMarkScanCredits` mutation. Adds negative invoice item for earned credits
8. **First invoice skipped** — `billing_reason` filter now includes both `subscription_cycle` AND `subscription_create`
9. **No scanCredits at checkout** — `handleCheckoutCompleted` now creates initial scanCredits record, carrying forward trial-period lifetime scans
10. **stripeInvoiceId dead field** — now populated when credits are applied to invoice

### Before Going Live — Checklist
- [ ] Enable `invoice.created` event in Stripe Dashboard webhook settings
- [ ] Verify `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_MONTHLY`, `STRIPE_PRICE_ANNUAL` in Convex Dashboard
- [ ] Live test: signup → trial → scan receipts → subscribe → verify first invoice has credit discount
- [ ] Live test: monthly renewal → verify credits reset and apply to next invoice
- [ ] Live test: cancel → verify features drop to free tier
- [ ] Consider: trial-period credits — currently they accumulate but only apply if user subscribes before trial ends and `invoice.created` fires
- [ ] Consider: Stripe↔Convex reconciliation cron (no sync exists if webhooks are missed)
- [ ] Finalize voice/AI request rate limiting — currently only monthly caps (20 free / 200 premium) + 6s client throttle. Decide if daily caps are needed (e.g., max 30/day to prevent burning all 200 in one session). Client-side daily limit was removed as redundant; add server-side daily enforcement here if desired

## Admin Dashboard Improvement Project (ACTIVE)

> **Status:** IN PROGRESS (Started: 2025-02-25)
> **Current Phase:** Verification & Quick Wins
> **Next Milestone:** Complete E2E verification → Start Quick Wins → Phase 1 (Security & Performance)

### 📋 Required Reading for New Sessions

**Before doing ANY admin work, read these files in order:**

1. **`ADMIN-ANALYSIS-2025.md`** (Reference Document - READ FIRST)
   - Comprehensive analysis of current admin dashboard
   - Critical gaps vs. industry standards (2025 benchmarks)
   - Feature comparison matrix
   - Competitive analysis (Instacart, DoorDash, etc.)
   - WHY changes are needed
   - **Purpose:** Context and justification
   - **Status:** Reference only (mostly read-only)

2. **`ADMIN-IMPROVEMENT-PLAN.md`** (Working Document - USE THIS)
   - Step-by-step implementation plan with checkboxes
   - Quick Wins (9 items - 1-2 days each)
   - Phase 1-4 (detailed tasks with test steps)
   - **End-to-End Feature Verification** section (CRITICAL)
   - Progress tracking
   - **Purpose:** Daily execution and progress tracking
   - **Status:** Actively updated - check off items as you complete them

### 🎯 Current Workflow

```
┌─────────────────────────────────────────┐
│ 1. READ: ADMIN-ANALYSIS-2025.md        │ ← Context
├─────────────────────────────────────────┤
│ 2. OPEN: ADMIN-IMPROVEMENT-PLAN.md     │ ← Working doc
├─────────────────────────────────────────┤
│ 3. START: End-to-End Verification      │ ← Test baseline
│    - Test ALL current features          │
│    - Check off passing tests            │
│    - Fix any failing tests FIRST        │
├─────────────────────────────────────────┤
│ 4. EXECUTE: Quick Wins (9 items)       │ ← High ROI
│    - Implement feature                  │
│    - Test end-to-end                    │
│    - Check off in plan                  │
│    - Commit at checkpoint               │
├─────────────────────────────────────────┤
│ 5. PROCEED: Phase 1 → 2 → 3 → 4        │ ← Systematic
│    - Follow same test-implement-verify  │
│    - Run integration tests after phase  │
│    - Commit at each checkpoint          │
└─────────────────────────────────────────┘
```

### 🚨 Critical Instructions for Continuation

#### Before Starting ANY Work:

1. **Check progress in `ADMIN-IMPROVEMENT-PLAN.md`**
   - Look for checked boxes (✅) - these are DONE
   - Look for unchecked boxes (☐) - these are TODO
   - Start from first unchecked item in current section

2. **Verify baseline works**
   - If no E2E verification checkboxes are checked yet:
     - **START HERE:** Test all current features (Overview, Users, Receipts, Catalog, Settings tabs)
     - Check off each passing test
     - Fix any failing tests BEFORE building new features
   - If E2E verification is partially done:
     - Continue from where previous session stopped
     - Don't skip verification tests

3. **Never build on broken foundation**
   - If a test fails → FIX IT before moving forward
   - Don't accumulate broken features
   - Don't skip integration tests

#### When Implementing Features:

1. **Read the feature checklist in ADMIN-IMPROVEMENT-PLAN.md**
2. **Implement the feature** (follow code examples provided)
3. **Test end-to-end** (use test steps provided)
4. **Check off the box** in ADMIN-IMPROVEMENT-PLAN.md
5. **Commit at checkpoints** (marked in plan)
6. **Update progress counters** if needed

#### When User Asks "Where are we?" or "What's next?":

```bash
# 1. Read the plan file
cat ADMIN-IMPROVEMENT-PLAN.md

# 2. Find first unchecked box in each section
# 3. Report status like this:
```

**Example Status Report:**
```
Current Status:
✅ Quick Wins: 3/9 completed (33%)
  - [x] Auto-refresh
  - [x] Date range filtering
  - [x] User pagination
  - [ ] Receipt search ← NEXT

✅ Phase 1: Not started (0/4 sections)
✅ E2E Verification: 15/50 tests passing (30%)
  - Overview tab: ✅ Verified
  - Users tab: 🔄 In progress
  - Receipts tab: ⏳ Not started

Next Steps:
1. Complete Users tab verification
2. Continue with Quick Win #4: Receipt search
3. Then Quick Win #5: Feature flag enhancements
```

### 📁 File Structure (Admin Project)

```
oja/
├── ADMIN-ANALYSIS-2025.md          # Analysis (reference)
├── ADMIN-IMPROVEMENT-PLAN.md       # Implementation plan (active)
├── app/(app)/admin.tsx             # Admin UI (1,032 lines)
├── convex/admin.ts                 # Admin backend (953 lines)
└── convex/schema.ts                # Database schema
```

### 🔍 Key Findings (From Analysis)

**Current Maturity:** ⭐⭐⭐ (3/5 stars)
**Target:** ⭐⭐⭐⭐⭐ (5/5 stars - industry-leading)

**Critical Gaps Identified:**
1. ❌ **Security:** No RBAC (only binary admin flag), no MFA, no IP restrictions
2. ❌ **Performance:** Full table scans (will break at 50K+ users)
3. ❌ **Analytics:** No cohort analysis, no funnel tracking, no churn metrics
4. ❌ **Support:** No ticket system, no user impersonation for debugging
5. ❌ **Monitoring:** No real-time alerts, manual refresh only
6. ❌ **Hard-coded metrics:** Subscription prices (£2.99, £21.99) hard-coded in 4 locations

**Current Features (Working):**
- ✅ 5-tab admin panel (Overview, Users, Receipts, Catalog, Settings)
- ✅ User management (search, detail, toggle admin, extend trial, suspend)
- ✅ Receipt moderation (flagged receipts, price anomalies, bulk approve)
- ✅ Store normalization (duplicate detection, merging)
- ✅ Feature flags (toggle, create)
- ✅ Announcements (create, toggle active)
- ✅ Audit logging (all admin actions tracked)

### 🎯 Implementation Phases (8-Week Plan)

**Week 1 (CURRENT):**
- ✅ Quick Wins (9 items) - auto-refresh, pagination, search, filters, dynamic pricing
- ✅ Phase 1.1: Database indexes (fix full table scans)

**Week 2:**
- ✅ Phase 1.2: RBAC (role-based access control)
- ✅ Phase 1.3: Session tracking
- ✅ Phase 1.4: Rate limiting

**Week 3-4:**
- ✅ Phase 2: Analytics (cohorts, funnels, churn, LTV, segments, exports)

**Week 5-6:**
- ✅ Phase 3: Support (tickets, impersonation, bulk ops, activity timeline)

**Week 7-8:**
- ✅ Phase 4: Advanced (real-time monitoring, A/B testing, workflows, CMS)

### ⚠️ Testing Protocol (MANDATORY)

**Before ANY implementation:**
1. Complete E2E verification for current features (baseline)
2. Ensure all existing tests pass
3. Fix broken features BEFORE building new ones

**After EACH Quick Win:**
1. Run relevant verification tests (from E2E section)
2. Check integration points
3. Update checkbox in plan
4. Commit

**After EACH Phase:**
1. Run full integration test suite
2. Performance testing (query times, load)
3. Security testing (auth, permissions, audit)
4. Update progress counters
5. Commit at checkpoint

**Before Production Deploy:**
1. Complete ENTIRE E2E verification checklist
2. All integration tests passing
3. Performance acceptable (queries <2s)
4. Security sign-off
5. Stakeholder approval

### 🚫 Hard-Coded Values to Fix (PRIORITY)

Found in analysis - these MUST be replaced with dynamic config:

```typescript
// ❌ BAD (Hard-coded in 4 locations):
convex/admin.ts:179         → const mrr = monthlyCount * 2.99 + ...
convex/subscriptions.ts:259 → price: 2.99,
convex/subscriptions.ts:270 → price: 21.99,
convex/subscriptions.ts:332 → const basePrice = isAnnual ? 21.99 : 2.99;

// ✅ GOOD (Dynamic from pricingConfig table):
const pricing = await ctx.db.query("pricingConfig").collect();
const monthlyPrice = pricing.find(p => p.planId === "premium_monthly")?.priceAmount ?? 0;
```

**Fix checklist:** See "Fix Hard-Coded Metrics & Prices" in Quick Wins section

### 📊 Progress Tracking

**How to check progress:**
1. Open `ADMIN-IMPROVEMENT-PLAN.md`
2. Scroll to "## 📊 Progress Tracking" section
3. Check completion percentages
4. Look for first unchecked box in each phase
5. That's where to continue

**How to update progress:**
1. Check off completed items: `- [x] Task description`
2. Update percentage counts manually
3. Commit changes with descriptive message
4. Update "Last Updated" timestamp at bottom of file

### 🔄 Session Handoff Protocol

**When ENDING a session:**
1. Check off all completed items in ADMIN-IMPROVEMENT-PLAN.md
2. Update progress percentages
3. Commit changes: `git commit -m "feat(admin): completed X, Y, Z"`
4. Update "Last Updated" timestamp in plan file
5. Leave clear note about next steps

**When STARTING a session (NEW LLM):**
1. Read this section in CLAUDE.md (you're doing it now ✅)
2. Read ADMIN-ANALYSIS-2025.md for context
3. Open ADMIN-IMPROVEMENT-PLAN.md
4. Find first unchecked box
5. Continue from there
6. **NEVER skip E2E verification tests**

### 🚨 Common Pitfalls to Avoid

1. ❌ **Skipping verification tests** → Always test baseline before building
2. ❌ **Building without testing** → Test each feature immediately after implementing
3. ❌ **Accumulating broken features** → Fix failures before moving forward
4. ❌ **Ignoring performance** → Check query times, use indexes
5. ❌ **Skipping integration tests** → Features must work together, not just in isolation
6. ❌ **Not updating checkboxes** → Always check off completed items (tracking progress)
7. ❌ **Not committing at checkpoints** → Commit after each major milestone
8. ❌ **Forgetting audit logs** → Every admin mutation must log to adminLogs table

### 💡 Pro Tips for Efficiency

1. ✅ **Read code examples in plan** - Don't reinvent the wheel
2. ✅ **Use test steps provided** - They're comprehensive and thorough
3. ✅ **Test in Convex Functions tab** - Faster than UI testing for backend
4. ✅ **Run queries manually first** - Verify logic before wiring to UI
5. ✅ **Check Convex dashboard** - Monitor query performance in real-time
6. ✅ **Use existing patterns** - Follow audit log pattern, Glass UI components
7. ✅ **Parallelize when possible** - Multiple sub-agents for complex tasks
8. ✅ **Ask user for approval** - Before fixing things they didn't request

### 📞 Quick Reference Commands

```bash
# Check what's completed
grep -c "\[x\]" ADMIN-IMPROVEMENT-PLAN.md

# Find next unchecked item
grep -n "\[ \]" ADMIN-IMPROVEMENT-PLAN.md | head -5

# View analysis summary
head -100 ADMIN-ANALYSIS-2025.md

# Test admin panel locally
npx convex dev          # Terminal 1
npx expo start          # Terminal 2
# Navigate to (app)/admin in app
```

---

## BMAD Workflow

Artifacts in `_bmad-output/`. Sprint status in `_bmad-output/implementation-artifacts/sprint-status.yaml`.
