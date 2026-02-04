# Oja - Claude Code Project Configuration

> Budget-First Shopping Confidence - A native mobile app giving shoppers control over spending before, during, and after shopping trips.

---

## Build Progress Tracker

**Full build progress:** `_bmad-output/implementation-artifacts/v2-build-progress.md`

| Phase | Status |
|-------|--------|
| 0. Project Setup | ✅ Complete |
| 1. Foundation & Auth | ✅ Complete |
| 2. Pantry Tracker | ✅ Complete |
| 3. Shopping Lists | ✅ Complete |
| UI. Glass Redesign | ✅ Complete |
| UX. Emotional Design | ✅ Complete (12/15 recommendations implemented) |
| 4. Partner Mode | 🔄 In Progress (backend + UI done, push notification integration pending) |
| 5. Receipt Intelligence | ✅ Complete |
| 5.5. Zero-Blank Price Intelligence | ✅ Phases 1-4, 6 Complete (Phase 5 bracket matcher pending validation) |
| 6. Insights & Gamification | 🔄 In Progress (UI + backend done, push notifications pending) |
| E2E. Bug Sweep | ✅ Complete (10 bugs found and fixed — commit `97907eb`) |
| E2E. Playwright Tests | 🔄 In Progress (72 passed, 10 failed — see E2E Testing section) |
| 7. Subscription & Payments | ✅ Complete (Stripe integration, webhooks, free trial) |
| 8. Admin Dashboard | 🔄 In Progress (backend done in `convex/admin.ts`) |
| 9. Voice Recognition | 📋 Planned (Native STT + Gemini NLU — see implementation plan below) |

**Current Priorities:**
1. **Push Notification Integration** — Expo Notifications wiring (backend + UI components already built)
2. **Price Bracket Matcher Validation** — Test against 19 real receipts (target >80% accuracy)
3. **First-Week Nurture Sequence** — Daily helpful nudges for new users (Day 2, 3, 5)
4. **E2E Test Fixes** — 10 failures blocking ~35 cascade-skipped tests

---

## Quick Start for New Session

1. Read `project-context.md` — developer quick reference
2. Check current phase: `/bmad:bmm:workflows:workflow-status`
3. Review `_bmad-output/implementation-artifacts/sprint-status.yaml` for current story
4. Load the Developer agent: `/bmad:bmm:agents:dev`

**CRITICAL**: All agents MUST read `project-context.md` before writing ANY code.

---

## Tech Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| **Framework** | Expo SDK 54 | React Native with native capabilities |
| **Language** | TypeScript (strict) | Type-safe development |
| **Routing** | Expo Router | File-based native navigation |
| **UI Design** | Glass Design System | Glassmorphism with deep blue gradients |
| **Authentication** | Clerk | Managed auth with social providers |
| **Backend** | Convex | Real-time database + serverless functions |
| **AI/ML** | Gemini 2.0 Flash + OpenAI GPT-4o-mini (fallback) | Receipt parsing + Price estimation |
| **State** | React hooks + Convex | Real-time reactive state |
| **Animations** | React Native Reanimated | Smooth native animations |
| **Haptics** | Expo Haptics | Tactile feedback |
| **Payments** | Stripe | Subscription management |
| **Charting** | react-native-chart-kit | Budget visualization + Insights graphs |
| **Celebrations** | react-native-confetti-cannon | Milestone animations |
| **Notifications** | Expo Notifications | Push notification infrastructure |
| **Camera** | Expo Camera | Receipt scanning |

---

## Glass UI Design System

The app uses a glassmorphism-inspired design with:
- **Deep blue gradient backgrounds** (#0D1528 → #1B2845 → #101A2B) — 3-color gradient, shifted slightly warm from original cold navy
- **Semi-transparent glass cards** with blur effects
- **Teal accent color** (#00D4AA) reserved for primary CTAs only
- **Warm accent color** (#FFB088) for celebrations and milestones
- **Validated MaterialCommunityIcons** only

```
Import glass components from: @/components/ui/glass
Import design tokens from:    @/lib/design/glassTokens
Import warm tokens from:      glassTokens.colors.accent.warm
```

---

## Emotional Design System

| Pattern | Implementation |
|---------|---------------|
| **Micro-celebrations** | Teal success check (600ms) + haptic on check-off (`SuccessCheck` in `GlassAnimations.tsx`) |
| **Budget sentiment** | One-line mood below dial: "Looking good — lots of room left" / "On track — doing well" / "Getting close — stay focused" / "Over budget — time to review" |
| **Savings jar warmth** | £0: aspirational copy. Positive: milestone encouragement ("Great start!", "Triple digits!") |
| **Weekly narrative** | `generateWeeklyNarrative()` — 2-3 sentence story from digest data |
| **Journey prompts** | Scan → Stock banner, Stock → Lists banner for out-of-stock items |
| **Collapsible insights** | `GlassCollapsible` wraps 6 insight sections (collapsed by default) |
| **Social proof** | Empty states show community stats ("Join 12,000 UK shoppers...") |
| **Warm accent** | #FFB088 for celebrations, milestones, encouraging text |
| **Teal reduction** | Reserved for primary CTAs; chips/filters/badges use white/indigo |

---

## Zero-Blank Price Intelligence

**CRITICAL ARCHITECTURE**: Every item in Oja shows a price estimate. Never blank. Never "?".

### Three-Layer Price Cascade

```
Layer 1: Personal History (user's own receipts) → highest trust → "£1.15 at Aldi"
Layer 2: Crowdsourced Prices (all users' receipts, by region) → "~£1.15 avg"
Layer 3: AI Estimates (Gemini-seeded, OpenAI fallback) → "~£1.15 est."
```

### Key Files

| File | Role |
|------|------|
| `convex/itemVariants.ts` | Variant management + `getWithPrices` cascade |
| `convex/currentPrices.ts` | Crowdsourced price aggregation + bracket matcher |
| `convex/ai.ts` | `estimateItemPrice` action + `withAIFallback` wrapper |
| `convex/priceHistory.ts` | Personal receipt price log |

### Variant Picker UX

- Items with size variants (milk, oil, pasta) show picker on first add
- User's preferred variant remembered via `pantryItem.preferredVariant`
- "Your usual" star badge on previously selected variant
- "Not sure" option uses base-item average price

### Confidence Labels

| Source | reportCount | Display |
|--------|:-----------:|---------|
| AI estimate | 0 | `~£1.15 est.` |
| Early receipt data | 1-2 | `£1.15 at Aldi` |
| Growing confidence | 3-9 | `£1.15 avg` |
| High confidence | 10+ | `£1.15` (no qualifier) |

### Resolution Algorithm (when user adds item to list)

```
USER TYPES "milk" ON LIST
  │
  ▼ 1. Check pantryItem.preferredVariant → auto-select + price cascade
  ▼ 2. Query itemVariants → show picker with prices per variant
  ▼ 3. No variants known:
       a. pantryItem.lastPrice → use it
       b. currentPrices → use cheapest
       c. Nothing → REAL-TIME AI ESTIMATE → cache for all users
  │
  EVERY BRANCH TERMINATES WITH A PRICE. NO BRANCH RETURNS NULL.
```

### AI Fallback Strategy

```
Primary:   Gemini 2.0 Flash (fast, cheap)
Fallback:  OpenAI GPT-4o-mini (different failure domain)
Wrapper:   withAIFallback() in convex/ai.ts
Applied:   parseReceipt, generateHybridSeedItems, generateItemVariants,
           estimateItemPrice, generateListSuggestions
```

### Price-Bracket Matcher (Phase 5 — pending validation)

For sizeless receipt items (~75% of UK receipts), matches receipt price to closest variant by `estimatedPrice` within 20% tolerance. Unambiguous match → associate with variant. Ambiguous → store as base-item.

**Validation:** Run against 19 receipts in `receipts/`. Target: >80% accuracy. If <60%, adjust tolerance or disable.

### Data Flywheel

```
More users → More receipt scans → Better price data
→ More accurate budgets → Better user experience → More users
```

- **0-100 users:** AI estimates dominate
- **100-1,000:** Crowdsourced covers major stores in top cities
- **1,000-10,000:** Most common items at most stores have real prices
- **10,000+:** Regional pricing becomes accurate

---

## UX Analysis Summary

**Analysis date:** 31 January 2026 | **Updated:** 2 February 2026

| Criterion | Score | Target | Status |
|-----------|:-----:|:------:|--------|
| Simple | 6→8/10 | 9/10 | Pantry default view + progressive disclosure implemented |
| Easy to Use | 7→8/10 | 9/10 | Swipe onboarding + budget dial hints added |
| Not Overwhelming | 5→7/10 | 9/10 | Profile simplified, insights collapsible, teal reduced |
| Emotional Experience | 4→7/10 | 8/10 | Warm palette, micro-celebrations, sentiment, voice audit |
| Want to Stay On | 3→5/10 | 7/10 | Weekly narrative, discovery tips, community visibility |
| Keep Coming Back | 5→7/10 | 8/10 | Milestones, streaks, investment counters, journey prompts |

### Recommendation Status (15 items)

| # | Done | Recommendation | Tier |
|---|:----:|----------------|:----:|
| 1 | ✅ | Pantry "Needs Attention" default view | 1 |
| 2 | ✅ | List Detail progressive disclosure | 1 |
| 3 | ✅ | Teal reduction — reserved for primary CTAs | 1 |
| 4 | ✅ | Micro-celebrations on check-off | 1 |
| 5 | ✅ | Voice audit — warm personality in all copy | 1 |
| 6 | ✅ | Gesture onboarding (SwipeOnboardingOverlay) | 2 |
| 7 | ❌ | **Smart push notifications** (3 types) | 2 |
| 8 | ✅ | Weekly Insights narrative | 2 |
| 9 | ✅ | Warm accent color (#FFB088) | 2 |
| 10 | ✅ | Profile simplification | 2 |
| 11 | ❌ | **First-week nurture sequence** | 3 |
| 12 | ❌ | **Price intelligence surface** | 3 |
| 13 | ✅ | Journey prompts between tabs | 3 |
| 14 | ✅ | Visible investment counter | 3 |
| 15 | ✅ | Savings milestone celebrations | 3 |

**12/15 done. 3 remaining:** push notifications (#7), nurture sequence (#11), price intelligence surface (#12).

---

## E2E Bug Sweep (2026-02-02)

10 bugs found and fixed in commit `97907eb`:

| # | Severity | Bug | Fix |
|---|----------|-----|-----|
| 1 | Low | Onboarding said "200 items" but AI generates ~101 | Removed hardcoded number |
| 2 | Low | AI seeding produced duplicate items | Dedup by normalized name in `parseSeedResponse` |
| 3 | Medium | Out-of-stock banner didn't add items to list | Wired to `addFromPantryOut` mutation + navigate |
| 4 | Medium | Suggestion items added with no price | Calls `estimateItemPrice` before adding |
| 5 | Low | Invalid "bacon" icon crashed rendering | Replaced with "pig" in client + server icon maps |
| 6 | High | Pantry items added to list had no budget impact | Passes `lastPrice` as `estimatedPrice` |
| 7 | High | Budget reset to £0 in shopping mode | Blended total (actual for checked + estimated for unchecked) |
| 8 | Critical | Receipt parse failure → infinite spinner | Reset `isParsing` immediately, delete failed receipt, cancel button |
| 9 | High | Failed receipts counted in milestones | Filter by `processingStatus === "completed"` |
| 10 | High | Failed receipts counted in stats | Same filter applied |

---

## E2E Playwright Testing (2026-02-03)

**87 tests implemented** across 13 spec files. **72 passed, 10 failed, 5 skipped** on last run (25m 30s).

### Setup

```bash
# Prerequisites: Convex dev server running, Expo Web at localhost:8081
# Auth state saved in e2e/.auth/user.json (Clerk cookies)

npx playwright test                    # Run all E2E tests (headless)
npx playwright test --ui               # Playwright UI mode
npx playwright test e2e/tests/03-pantry.spec.ts  # Single spec
```

Test plan: `testing.md` (398 planned test cases, 87 implemented).

### React Native Web + Playwright Gotchas

| Issue | Impact | Workaround |
|-------|--------|------------|
| **`AnimatedPressable` click** | Playwright `.click()` on text inside RNW `Pressable` does NOT trigger `onPress` | Use `page.evaluate()` JS click — walk up DOM to `cursor: pointer` ancestor (see `ListsPage.createList()`) |
| **`Alert.alert` is a no-op** | Delete confirmations, any `Alert.alert()` calls silently do nothing on web | Use `window.confirm()` for web, or skip delete tests |
| **`networkidle` never fires** | Convex WebSocket keeps connection alive | Use `waitForConvex(page)` helper instead of `waitForLoadState("networkidle")` |
| **Controlled inputs** | `fill()` works but `pressSequentially()` more reliable for React state sync | Use `press("Control+A") → press("Backspace") → pressSequentially(text, { delay: 30 })` |
| **Feature gating** | Free plan limits block E2E (e.g., 3 list cap) | `featureGating.ts` `maxLists` raised to 10 for testing. Run `npx convex dev --once` after changes. |

### 10 Remaining Failures & Recommended Fixes

| # | Test | Root Cause | Fix |
|---|------|-----------|-----|
| 1 | **3.15** Pantry add item | `GlassButton` click not triggering `onPress` | Create `clickPressable(page, text)` helper; apply to "Add Item" button |
| 2 | **4.7** List card → detail | `openList()` uses `networkidle` (never resolves with Convex) | Replace with `waitForConvex(page)` |
| 3 | **5.0** Create test list | `createList` navigated but assertion fired too early (false failure) | Remove `waitForURL` catch fallback; use explicit URL wait |
| 4 | **6.3** Receipt upload | "Use Photo" visible but assertion timeout | Increase timeout from 5s → 10s |
| 5 | **7.0** Create budget list | Same as 5.0 — false failure, list created successfully | Same fix as 5.0 |
| 6 | **8.3** Insights screen | `openInsights()` can't find link on profile page | Add scroll before click; verify selector |
| 7 | **9.0** Create shared list | Same as 5.0/7.0 | Same fix as 5.0 |
| 8 | **10.2** Profile identity | CSS class selectors don't work on RNW (hashed classes) | Use text content selectors for email/name |
| 9 | **13.13** White backgrounds | `/scan` tab timeout in headless (camera permissions) | Skip Scan tab in cross-cutting tests |
| 10 | **13.18** JS errors check | Same `/scan` timeout | Skip Scan tab |

### Systemic Patterns

1. **`clickPressable` helper needed** — Extract JS evaluate click into `e2e/fixtures/base.ts`. All `GlassButton` interactions require it.
2. **`createList` post-nav timing** — Fixing 5.0/7.0/9.0 unblocks ~18 cascade-skipped tests (serial `describe` blocks).
3. **Scan tab** requires camera — skip in headless cross-cutting tests.

### Estimated Fix Impact

Fixing these 10 failures (mostly low effort) would recover **~35-40 tests** (from cascade skips), bringing the pass count from 72 to **~95-105+**.

### Key Files

| File | Role |
|------|------|
| `e2e/fixtures/base.ts` | Shared helpers: `navigateToTab()`, `waitForConvex()` |
| `e2e/fixtures/auth.setup.ts` | Clerk auth setup (saves cookies) |
| `e2e/pages/*.ts` | Page Object Models (ListsPage, PantryPage, ScanPage, etc.) |
| `e2e/tests/01-13*.spec.ts` | Test specs (serial describe blocks) |
| `playwright.config.ts` | Playwright config (Chromium, localhost:8081) |
| `convex/lib/featureGating.ts` | Free plan limits (raised for E2E) |

---

## Critical Rules for All Agents

1. **Read `project-context.md` first** — Before ANY implementation
2. **Standard practices only** — Never recommend or implement a process, pattern, or method that is not industry-standard. Always use standard methodologies and best coding practices. If a shortcut exists but is non-standard, use the proper approach instead. When multiple approaches exist, choose the one most widely adopted in production systems.
3. **Verify authentication** — Every mutation must check user ownership
4. **Use indexes** — Never scan full tables
5. **Optimistic updates** — For instant UX feedback
6. **Haptic feedback** — On all user interactions
7. **Handle all states** — Loading, error, empty, success
8. **Zero-Blank Prices** — Every item must show a price estimate (cascade: personal → crowdsourced → AI)
9. **Warm Tone in Copy** — Friendly, supportive language (not clinical/functional)
10. **Progressive Disclosure** — Collapsible sections, don't show everything at once
11. **Teal for CTAs only** — Reserve teal for primary actions; secondary elements use white/gray/indigo

---

## Project Structure

```
oja/
├── app/                          # Expo Router (file-based routing)
│   ├── _layout.tsx              # Root layout (providers)
│   ├── index.tsx                # Entry redirect
│   ├── (app)/                   # Authenticated routes
│   │   ├── _layout.tsx          # Protected layout
│   │   ├── (tabs)/              # Tab navigator
│   │   │   ├── _layout.tsx      # Tab configuration
│   │   │   ├── index.tsx        # Pantry (home)
│   │   │   ├── lists.tsx        # Shopping lists
│   │   │   ├── scan.tsx         # Receipt scanner
│   │   │   └── profile.tsx      # User profile
│   │   ├── list/[id].tsx        # List detail (+ partner approval UI)
│   │   ├── admin.tsx            # Admin dashboard
│   │   ├── partners.tsx         # Partner management
│   │   ├── insights.tsx         # Insights & gamification
│   │   ├── notifications.tsx    # Notifications
│   │   ├── subscription.tsx     # Subscription management
│   │   ├── join-list.tsx        # Accept partner invite
│   │   ├── pantry-pick.tsx      # Pantry item picker
│   │   ├── trip-summary.tsx     # Post-shopping summary
│   │   ├── price-history/[itemName].tsx  # Price history detail
│   │   └── receipt/[id]/        # Receipt flow
│   │       ├── confirm.tsx      # Receipt confirmation
│   │       └── reconciliation.tsx # Receipt reconciliation
│   ├── (auth)/                   # Auth routes
│   │   ├── sign-in.tsx
│   │   ├── sign-up.tsx
│   │   └── forgot-password.tsx
│   └── onboarding/               # Onboarding flow
│       ├── _layout.tsx
│       ├── welcome.tsx          # Welcome screen
│       ├── cuisine-selection.tsx # Cuisine preferences
│       ├── pantry-seeding.tsx   # AI pantry seeding
│       └── review-items.tsx     # Review seeded items
│
├── components/                   # Reusable components
│   ├── ui/                      # Design system
│   │   ├── glass/               # Glass components (19 files)
│   │   ├── AdaptiveCard.tsx
│   │   ├── AddToListButton.tsx
│   │   ├── CategoryFilter.tsx
│   │   └── RemoveButton.tsx
│   ├── pantry/                  # Pantry components
│   └── partners/                # Partner mode components
│       ├── ApprovalActions.tsx
│       ├── ApprovalBadge.tsx
│       ├── CommentThread.tsx
│       ├── NotificationBell.tsx
│       └── NotificationDropdown.tsx
│
├── hooks/                        # Custom React hooks
│   ├── useCurrentUser.ts
│   ├── useDeviceCapabilities.ts
│   ├── usePartnerRole.ts
│   ├── useNotifications.ts
│   └── useDelightToast.ts
│
├── lib/                          # Utilities
│   ├── design/glassTokens.ts   # Glass design tokens
│   ├── design/tokens.ts        # Additional design tokens
│   ├── icons/iconMatcher.ts    # Client-side icon mapping
│   ├── capabilities/deviceTier.ts  # Device capability tiers
│   ├── haptics/safeHaptics.ts  # Haptic feedback utilities
│   └── location/detectLocation.ts  # Location detection
│
├── convex/                       # Convex backend
│   ├── _generated/              # Auto-generated (don't edit)
│   ├── schema.ts                # Database schema
│   ├── users.ts                 # User functions
│   ├── pantryItems.ts           # Pantry functions
│   ├── shoppingLists.ts         # List functions
│   ├── listItems.ts             # List item functions
│   ├── receipts.ts              # Receipt functions
│   ├── itemVariants.ts          # Size variant management
│   ├── currentPrices.ts         # Crowdsourced prices
│   ├── priceHistory.ts          # Personal price log
│   ├── ai.ts                    # AI functions (Gemini + OpenAI fallback)
│   ├── iconMapping.ts           # Server-side icon mapping
│   ├── admin.ts                 # Admin dashboard backend
│   ├── insights.ts              # Weekly digest + gamification
│   ├── partners.ts              # Partner mode backend
│   ├── notifications.ts         # Notification management
│   ├── stripe.ts                # Stripe integration
│   ├── subscriptions.ts         # Subscription lifecycle
│   ├── crons.ts                 # Scheduled jobs
│   ├── cronHandlers.ts          # Cron job handlers
│   ├── http.ts                  # HTTP endpoints
│   ├── auth.config.ts           # Clerk auth config
│   └── lib/                     # Backend utilities
│       └── featureGating.ts     # Feature gates + plan limits
│
├── e2e/                          # E2E Playwright tests
│   ├── fixtures/                # Test helpers (base.ts, auth.setup.ts)
│   ├── pages/                   # Page Object Models
│   └── tests/                   # 13 spec files (01-13*.spec.ts)
│
├── __tests__/                    # Unit tests (Jest)
├── receipts/                     # 19 real UK store receipts for validation
│
├── project-context.md            # Developer reference (READ FIRST)
├── CLAUDE.md                     # This file
├── testing.md                    # E2E test plan (398 cases)
├── playwright.config.ts          # Playwright configuration
│
└── _bmad-output/                 # BMAD artifacts
    ├── planning-artifacts/
    │   ├── product-brief.md
    │   ├── prd.md
    │   ├── architecture-v2-expo-convex.md
    │   ├── coding-conventions-expo.md
    │   ├── security-guidelines-expo.md
    │   ├── ui-redesign-glass-system.md
    │   └── epics/
    └── implementation-artifacts/
        ├── sprint-status.yaml
        └── stories/
```

---

## Key Commands

```bash
# Development
npx expo start                    # Start Expo dev server
npx expo start --ios              # iOS simulator
npx expo start --android          # Android emulator

# Build
npx expo run:ios                  # Development build (iOS)
npx expo run:android              # Development build (Android)
eas build --platform ios          # Production build (iOS)
eas build --platform android      # Production build (Android)

# Convex
npx convex dev                    # Start Convex dev server
npx convex deploy                 # Deploy to production

# Testing
npm test                          # Run unit tests
npm run test:watch                # Watch mode

# Linting
npm run lint                      # ESLint
npm run format                    # Prettier
```

---

## Convex Backend Patterns

### Query (Read)

```typescript
export const getByUser = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("items")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();
  },
});
```

### Mutation (Write)

```typescript
export const create = mutation({
  args: { name: v.string() },
  handler: async (ctx, args) => {
    const user = await requireCurrentUser(ctx); // ALWAYS verify auth
    return await ctx.db.insert("items", {
      userId: user._id,
      name: args.name,
      createdAt: Date.now(),
    });
  },
});
```

### Action (External API)

```typescript
export const estimateItemPrice = action({
  args: { itemName: v.string(), region: v.optional(v.string()) },
  handler: async (ctx, args) => {
    return await withAIFallback(
      () => geminiEstimate(args.itemName),
      () => openaiEstimate(args.itemName),
      "estimateItemPrice"
    );
  },
});
```

---

## Environment Variables

### Client (Expo)

```bash
EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_...
EXPO_PUBLIC_CONVEX_URL=https://...
```

### Server (Convex Dashboard)

```bash
GEMINI_API_KEY=...              # Primary AI (receipt parsing, seeding, suggestions)
OPENAI_API_KEY=sk_...           # Fallback AI (when Gemini fails)
STRIPE_SECRET_KEY=sk_...
CLERK_SECRET_KEY=sk_...
```

---

## Remaining Work

### High Priority — Retention & Engagement

| Item | Description | Effort |
|------|-------------|--------|
| **Push Notifications** | 3 types: stock reminder, streak motivation, weekly digest | High |
| **First-Week Nurture Sequence** | Day 2/3/5 helpful nudges for new users | Medium |
| **Price Intelligence Surface** | "Milk is 12% cheaper at Aldi this month" | High |

### Validation — Price Intelligence

| Item | Description | Status |
|------|-------------|--------|
| **Bracket Matcher Accuracy** | Test against 19 receipts in `receipts/` | Target: >80% |
| **Admin Receipt Seeding Portal** | Bulk scan 50-100 receipts before launch | Not started |

### In Progress

| Item | Description | Status |
|------|-------------|--------|
| **Partner Mode** | Push notification integration remaining | Backend + UI done |
| **Admin Dashboard** | Frontend UI needed | Backend done (`convex/admin.ts`) |
| **E2E Test Fixes** | 10 failures blocking ~35 cascade-skipped tests | See E2E section |

### Verification Plan (20 test cases)

**Core Functionality:**
- [ ] 1. Onboarding zero-blank — all seeded items have price + size context
- [ ] 2. Variant prices persisted — `hasVariants: true` items have 3-5 variants with `estimatedPrice`
- [ ] 3. Add "milk" to list — variant picker with AI prices + tilde prefix
- [ ] 4. Add "milk" again — preferred variant auto-selected, no picker
- [ ] 5. Add "quinoa" (unknown) — loading state → AI estimate → cached
- [ ] 6. Non-variant "butter" — shows "Butter · 250g · ~£1.85 est."

**Receipt Flow:**
- [x] 7. Scan receipt with sizes — prices flow to priceHistory + currentPrices + pantryItems
- [ ] 8. Scan sizeless receipt — bracket matcher attempts variant association
- [ ] 9. Price cascade — receipt-verified > crowdsourced > AI estimate
- [ ] 10. Crowdsourced accumulation — reportCount increases, weighted average

**AI Fallback:**
- [ ] 11. Gemini failure → OpenAI handles parsing
- [ ] 12. Both fail → graceful error, no crash

**Edge Cases:**
- [x] 13. Discount lines excluded from receipt parsing
- [ ] 14. Non-grocery receipt (Primark) — graceful handling
- [x] 15. 30-day freshness weighting implemented
- [ ] 16. Admin seeding — prices populate `currentPrices`
- [ ] 17. Budget accuracy — 10-item list with variant prices

**Invariant Tests:**
- [ ] 18. Zero-blank invariant — assert `price !== null` for all UI paths
- [ ] 19. Bracket matcher accuracy >80% against 19 receipts
- [ ] 20. No test regressions

---

## Receipt Analysis — Real UK Store Patterns

19 real receipts from 7 stores (High Wycombe / Slough area, Oct 2025 – Jan 2026):

| Store | Size Included? | ~% | Format Example |
|-------|:-:|:--:|----------------|
| Aldi | Liquids, weighed, multi-packs | 30-35% | `MILK WHOLE 2PT`, `SWEET POTATOES 1KG` |
| Lidl | Almost only milk | 15-20% | `Whole Milk 4 Pints` |
| Morrisons | Virtually never | 0-5% | `M TABLE SALT` |
| Tesco | Branded/premium | 30% | `Protein Yoghurt 200g` |
| Sainsbury's | Branded items | 33% | `CHIN CHIN 148G` |
| Independent | Bulk items | 40% | `SELLA 5KG`, `BLACK EYE BEANS 4KG` |

**Key patterns:** Store name always available. SKU codes on Aldi (strip). VAT codes on Aldi/Lidl (ignore). Discount lines exist (ignore). Multi-buy pricing needs unit price extraction. Abbreviations are extreme (AI expands). Same product has wildly different names across stores.

---

## Schema: Price Intelligence Tables

```typescript
// Item size variants (AI-seeded + receipt-discovered)
itemVariants: { baseItem, variantName, size, unit, category, source,
                estimatedPrice, commonality }
  .index("by_base_item", ["baseItem"])

// Crowdsourced prices (weighted 30-day average)
currentPrices: { normalizedName, itemName, variantName, size, unit, storeName,
                 unitPrice, averagePrice, minPrice, maxPrice, confidence,
                 reportCount, region, lastSeenDate, lastReportedBy, updatedAt }
  .index("by_item"), .index("by_item_store"), .index("by_store")

// Personal price log (from user's own receipts)
priceHistory: { userId, receiptId, itemName, normalizedName, size, unit,
                price, quantity, unitPrice, storeName, storeAddress,
                purchaseDate, createdAt }
  .index("by_user"), .index("by_user_item"), .index("by_user_item_date"), .index("by_receipt")

// Pantry items (with price + variant tracking)
pantryItems: { ..., lastPrice, priceSource, preferredVariant, lastStoreName,
               defaultSize, defaultUnit }
```

---

## Implementation Plan Status — Zero-Blank Price Intelligence

| Phase | Description | Status |
|-------|-------------|--------|
| 1. Foundation | Persist AI variant prices, 3-layer cascade in `getWithPrices` | ✅ Done |
| 2. Non-Variant Items | `defaultSize`/`defaultUnit` on pantry items, AI prompt update | ✅ Done |
| 3. AI Fallback | `withAIFallback` wrapper, OpenAI as fallback provider | ✅ Done |
| 4. Real-Time Estimation | `estimateItemPrice` action for unknown items | ✅ Done |
| 5. Bracket Matcher | Validate accuracy against real receipts | ❌ Pending validation |
| 6. Variant Picker UI | Enhanced picker with confidence labels, "Your usual" badge | ✅ Done |

---

## BMAD Workflow & Artifacts

### Project Lead

**John (PM Agent)** — invoke with `/bmad:bmm:agents:pm`

**ALWAYS reference the Product Brief** (`_bmad-output/planning-artifacts/product-brief.md`) as the foundational source of truth.

### Workflow Phases

| Phase | Agent | Command | Status |
|-------|-------|---------|--------|
| 1. Product Brief | PM + Analyst | `/bmad:bmm:workflows:create-product-brief` | COMPLETE |
| 2. PRD | PM | `/bmad:bmm:workflows:prd` | COMPLETE |
| 3. Architecture | Architect | `/bmad:bmm:workflows:create-architecture` | NEEDS UPDATE (v2) |
| 4. UX Design | UX Designer | `/bmad:bmm:workflows:create-ux-design` | COMPLETE |
| 5. Epics & Stories | Scrum Master | `/bmad:bmm:workflows:create-epics-and-stories` | NEEDS UPDATE |
| 6. Test Strategy | Test Architect | `/bmad:bmm:workflows:testarch-test-design` | Pending |
| 7-10. Sprint/Dev/Review/Test | Various | Various | Pending |

### Artifact Locations

| Artifact | Path |
|----------|------|
| Product Brief | `_bmad-output/planning-artifacts/product-brief.md` |
| PRD | `_bmad-output/planning-artifacts/prd.md` |
| Architecture v2 | `_bmad-output/planning-artifacts/architecture-v2-expo-convex.md` |
| Coding Conventions | `_bmad-output/planning-artifacts/coding-conventions-expo.md` |
| Security Guidelines | `_bmad-output/planning-artifacts/security-guidelines-expo.md` |
| Glass UI Design | `_bmad-output/planning-artifacts/ui-redesign-glass-system.md` |
| Epics & Stories | `_bmad-output/planning-artifacts/epics/` |
| Sprint Status | `_bmad-output/implementation-artifacts/sprint-status.yaml` |
| Developer Reference | `project-context.md` |
| Glass Tokens | `lib/design/glassTokens.ts` |
| Glass Components | `components/ui/glass/` |
| Real Receipts | `receipts/` — 19 receipts for bracket matcher validation |

---

## MCP Servers

| Service | Type | Description |
|---------|------|-------------|
| **Clerk** | URL | Authentication SDK snippets and user management |
| **Convex** | CLI | Backend deployment queries, table schemas, function metadata |
| **Stripe** | URL | Payment processing — customers, products, invoices, subscriptions |
| **GitHub** | CLI | Repository management — repos, PRs, issues |

Config location: `C:\Users\diloc\AppData\Roaming\Claude\claude_desktop_config.json`

---

## Target Market

- **Primary:** United Kingdom
- **Architecture:** Location-agnostic (global ready)
- **Currency:** Auto-detect based on location
- **Stores:** UK supermarkets (Tesco, Sainsbury's, Asda, Aldi, Lidl, Morrisons, etc.)

---

---

## Voice Recognition Feature — Implementation Plan

**Status:** Planning Complete | **Priority:** High — Retention & Engagement
**Decided:** 2026-02-04 (Party Mode brainstorm with full BMAD team)

### Architecture

```
Native STT + Gemini NLU (Hybrid Approach)

┌─────────────┐     ┌──────────────────┐     ┌─────────────────┐     ┌──────────────┐
│ Tap FAB     │────▶│ Native STT       │────▶│ Gemini NLU      │────▶│ Execute      │
│ (any screen)│     │ @react-native-   │     │ parseVoiceCmd   │     │ Convex       │
└─────────────┘     │ voice/voice      │     │ in convex/ai.ts │     │ mutations    │
                    │                  │     │                 │     │              │
                    │ Streaming partial│     │ Returns JSON:   │     │ createList() │
                    │ results (free,   │     │ {action, name,  │     │ addItems()   │
                    │ on-device)       │     │  items[], ctx}  │     │ navigate()   │
                    └──────────────────┘     │                 │     └──────────────┘
                                            │ withAIFallback: │
                                            │ Gemini → OpenAI │
                                            └─────────────────┘
```

**Why this approach:**
- **Native STT is FREE** — uses Apple Speech (iOS) / Google Speech (Android), zero API cost
- **Streaming feedback** — real-time transcription as user speaks (no loading spinner)
- **Gemini 2.0 Flash free tier** — 15 RPM, more than enough for voice commands
- **`withAIFallback` reuse** — OpenAI GPT-4o-mini fallback already wired in `convex/ai.ts`
- **Dev build compatible** — already using dev builds for `expo-camera` and Stripe

### MVP Scope

**Two intents only:**
1. **Create list + add items** — "Create a grocery list with milk, bread, and eggs"
2. **Add items to existing list** — "Add chicken and rice to my weekly shop"

**Explicitly NOT in MVP:**
- Voice editing/deleting items
- Voice navigation ("go to my pantry")
- Continuous listening mode
- Offline voice (requires on-device model)
- Multi-language STT (English first)

### UX Flow

```
1. User taps glass FAB (mic icon, bottom-right, all screens)
2. Bottom sheet (40% height) slides up with pulsing teal ring
3. Real-time transcription appears as user speaks
4. Silence detection (1.5s) OR "Done" tap → auto-stop
5. Processing state: "Understanding your request..."
6. Confirmation sheet shows parsed result:
   ┌─────────────────────────────────┐
   │ 🎤 Voice Command                │
   │                                 │
   │ Creating "Dinner List"          │
   │                                 │
   │ ☐ Chicken thighs  ~£3.50 est.  │
   │ ☐ Garlic           ~£0.45 est. │
   │ ☐ Coconut milk     ~£1.65 est. │
   │                                 │
   │ [✓ Add All]        [✎ Edit]     │
   └─────────────────────────────────┘
7. "Add All" → success haptic + celebration (first use: confetti!)
8. Navigate to created/updated list
```

### Context-Aware Command Resolution

The voice parser receives context to resolve ambiguous commands:

| User says | Current screen | Resolution |
|-----------|---------------|------------|
| "Add milk" | List detail (id: X) | Add to list X |
| "Add milk" | Lists tab | Add to most recent list |
| "Add milk" | Pantry / Profile / Scan | Add to most recent list |
| "Add milk" | No lists exist | Create "Shopping List" + add milk |
| "Add to weekly shop" | Any screen | Fuzzy match list name → "Weekly Shop" |
| "Create party supplies list" | Any screen | Create new list named "Party Supplies" |

### Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| `components/ui/glass/VoiceFAB.tsx` | **CREATE** | Global floating mic button (glass style, animated states) |
| `components/ui/glass/VoiceSheet.tsx` | **CREATE** | Bottom sheet: transcription, confirmation, error states |
| `hooks/useVoiceRecognition.ts` | **CREATE** | Hook wrapping `@react-native-voice/voice` (states, streaming) |
| `convex/ai.ts` | **MODIFY** | Add `parseVoiceCommand` action with `withAIFallback` |
| `app/(app)/_layout.tsx` | **MODIFY** | Mount `<VoiceFAB />` globally above tab navigator |
| `lib/voice/voicePrompt.ts` | **CREATE** | Gemini prompt template for NLU intent parsing |
| `app.json` | **MODIFY** | Add `@react-native-voice/voice` plugin + mic permissions |

### Gemini NLU Prompt Design

The `parseVoiceCommand` action sends:

```
Input: { transcript: string, context: { currentScreen, activeListId?, activeListName?, recentLists[] } }

Output JSON: {
  action: "create_list" | "add_to_list" | "unsupported",
  listName?: string,           // For create_list or fuzzy-matched existing
  matchedListId?: string,      // If adding to existing list
  items: string[],             // Parsed item names
  confidence: number,          // 0-1 parse confidence
  rawTranscript: string,       // Original text for display
  error?: string               // If action is unsupported
}
```

### Challenges & Mitigations

| Challenge | Risk | Mitigation |
|-----------|------|------------|
| **Dev build requirement** | Low | Already on dev builds (camera, Stripe). No migration needed. |
| **Accent diversity** (UK, Nigerian, Caribbean, etc.) | Medium | Native STT engines handle diverse accents well. Gemini NLU is accent-agnostic (text-based). Test with diverse speakers. |
| **Ambiguous commands** ("add milk" — to which list?) | High | Context object sent to Gemini. Smart defaults: list detail → that list; no lists → create new; otherwise → most recent. Confirmation sheet catches errors. |
| **Gemini rate limits** | Low | Free tier: 15 RPM. Voice commands are infrequent. Monitor with usage counter. |
| **NLU prompt misparses** | High | 30+ test case matrix. Confirmation sheet before execution (never blind-execute). "chicken thighs" must parse as ONE item, not two. |
| **Microphone permissions denied** | Low | Standard OS permission flow. GlassAlert explaining benefit + settings deeplink. |
| **Battery drain** | Low | On-demand only (tap to activate). Not continuous listening. |
| **Scan tab camera conflict** | Low | Reduce FAB opacity on Scan tab. Still tappable but not occluding. |
| **Expo Go incompatibility** | Low | Dev builds required. Add clear error message if running in Expo Go. |
| **Items need prices** | Low | After parse, run existing `estimateItemPrice` per item. Zero-blank cascade already handles this. |

### Testing Strategy

**Unit Tests (Jest):**
- `useVoiceRecognition` hook — mock `@react-native-voice/voice`, test state transitions (idle → listening → processing → result → error)
- `parseVoiceCommand` — mock Gemini, test 30+ command variations
- `VoiceFAB` — render states, tap handling
- `VoiceSheet` — confirmation display, edit flow, error states

**NLU Prompt Test Matrix (minimum 30 cases):**

| # | Command | Expected Action | Expected Items |
|---|---------|----------------|----------------|
| 1 | "Create grocery list with milk and bread" | create_list("Grocery List") | milk, bread |
| 2 | "Add eggs to weekly shop" | add_to_list("Weekly Shop") | eggs |
| 3 | "Put chicken rice and beans on the list" | add_to_list(recent) | chicken, rice, beans |
| 4 | "Make a new list called birthday party" | create_list("Birthday Party") | [] |
| 5 | "Banana" | add_to_list(recent) | banana |
| 6 | "Add 2 pints of milk and a loaf of bread" | add_to_list(recent) | milk (2 pints), bread |
| 7 | "Create dinner list with chicken thighs garlic and coconut milk" | create_list("Dinner List") | chicken thighs, garlic, coconut milk |
| 8 | "Add semi-skimmed milk to Aldi list" | add_to_list("Aldi List") | semi-skimmed milk |
| 9 | "" (empty/silence) | error | - |
| 10 | "Delete everything" | unsupported | - |
| 11 | "What's on my list?" | unsupported | - |
| 12 | "Plantain, yam, scotch bonnet, and palm oil" | add_to_list(recent) | plantain, yam, scotch bonnet, palm oil |
| 13 | "New list for Sunday cook up rice chicken stew and jollof" | create_list("Sunday Cook Up") | rice, chicken stew, jollof |
| 14 | "Add toiletries shower gel toothpaste and deodorant" | add_to_list(recent) | shower gel, toothpaste, deodorant |
| 15 | "Weetabix" | add_to_list(recent) | Weetabix |

*(Expand to 30+ before shipping — include edge cases: numbers, units, UK-specific brands, African/Caribbean ingredients, compound items)*

**E2E (Playwright):**
- Skip voice-specific tests (no mic in headless browser)
- Test VoiceFAB visibility across all tabs (DOM presence check)
- Test VoiceSheet render with mocked data

### Implementation Checklist

#### Phase 1: Foundation
- [ ] 1.1 Install `@react-native-voice/voice` + config plugin in `app.json`
- [ ] 1.2 Add microphone + speech recognition permissions (iOS `Info.plist`, Android manifest)
- [ ] 1.3 Create `hooks/useVoiceRecognition.ts` — wrap native module with states (idle, listening, processing, result, error)
- [ ] 1.4 Write unit tests for `useVoiceRecognition` hook (mock native module, test all state transitions)
- [ ] 1.5 Verify dev build compiles with new native dependency

#### Phase 2: Gemini NLU
- [ ] 2.1 Create `lib/voice/voicePrompt.ts` — prompt template for intent parsing
- [ ] 2.2 Add `parseVoiceCommand` action in `convex/ai.ts` with `withAIFallback`
- [ ] 2.3 Implement context-aware resolution (current screen, active list, recent lists)
- [ ] 2.4 Write unit tests for `parseVoiceCommand` — minimum 30 test cases from matrix
- [ ] 2.5 Test with real Gemini API — verify JSON output structure and edge cases

#### Phase 3: UI Components
- [ ] 3.1 Create `components/ui/glass/VoiceFAB.tsx` — glass-styled mic button with animated states
- [ ] 3.2 Implement FAB states: idle (glass mic), listening (pulsing teal ring), processing (spinner)
- [ ] 3.3 Create `components/ui/glass/VoiceSheet.tsx` — bottom sheet with transcription + confirmation
- [ ] 3.4 Implement confirmation view: parsed list name, items with prices, "Add All" / "Edit" buttons
- [ ] 3.5 Implement error states: no permission, empty result, parse failure, offline
- [ ] 3.6 Add haptic feedback on all interactions (tap, success, error)
- [ ] 3.7 Add first-use micro-celebration (confetti + toast)
- [ ] 3.8 Write unit tests for VoiceFAB and VoiceSheet components

#### Phase 4: Integration
- [ ] 4.1 Mount `<VoiceFAB />` in `app/(app)/_layout.tsx` — global, above tab bar
- [ ] 4.2 Wire voice flow end-to-end: FAB tap → STT → NLU → confirmation → mutations
- [ ] 4.3 Integrate zero-blank price cascade — call `estimateItemPrice` for each parsed item
- [ ] 4.4 Implement navigation: after confirmation, navigate to created/updated list
- [ ] 4.5 Handle Scan tab: reduce FAB opacity when camera is active
- [ ] 4.6 Add context provider for current screen + active list tracking

#### Phase 5: Polish & QA
- [ ] 5.1 Silence detection (1.5s auto-stop) + manual "Done" button
- [ ] 5.2 Test with diverse accents (UK English, Nigerian English, Caribbean English)
- [ ] 5.3 Test edge cases: very long commands, single word, nonsense input, background noise
- [ ] 5.4 Verify Expo Go shows graceful error (not crash) if voice module unavailable
- [ ] 5.5 Performance check: measure latency from stop-speaking to confirmation display
- [ ] 5.6 Run full existing test suite — no regressions
- [ ] 5.7 Manual QA on iOS + Android devices
- [ ] 5.8 Update project-context.md with voice feature patterns

#### Phase 6: Documentation
- [ ] 6.1 Update CLAUDE.md project structure with new files
- [ ] 6.2 Add voice feature to Build Progress tracker
- [ ] 6.3 Document voice NLU prompt patterns for future maintenance

### Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| **Adoption** | 20%+ of active users try voice in first week | Track FAB tap events |
| **NLU accuracy** | >90% correct parses on test matrix | Unit test pass rate |
| **STT accuracy** | >95% word accuracy (native engines) | Manual QA with diverse speakers |
| **Latency** | <3s from stop-speaking to confirmation | Performance instrumentation |
| **Error rate** | <5% of voice sessions end in error | Error tracking |
| **Repeat usage** | 30%+ of first-time users use voice again | Analytics |

---

_Updated 2026-02-04. Added Voice Recognition feature implementation plan (Party Mode brainstorm). Full audit: fixed Expo version (54 not 55), removed Jina AI (never integrated), updated Stripe/Partner Mode status, rewrote project structure to match reality, updated schema docs, corrected gradient colors._
