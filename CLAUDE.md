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
| UX. Emotional Design | ✅ Complete (14/15 recommendations implemented) |
| 4. Partner Mode | 🔄 In Progress (backend + UI done, push notification integration pending) |
| 5. Receipt Intelligence | ✅ Complete |
| 5.5. Zero-Blank Price Intelligence | ✅ Phases 1-4, 6 Complete (Phase 5 bracket matcher pending validation) |
| 6. Insights & Gamification | 🔄 In Progress (UI + backend done, push notifications pending) |
| E2E. Bug Sweep | ✅ Complete (10 bugs found and fixed — commit `97907eb`) |
| E2E. Playwright Tests | 🔄 In Progress (72 passed, 10 failed — see E2E Testing section) |
| 7. Subscription & Payments | ✅ Complete (Stripe integration, webhooks, free trial) |
| 8. Admin Dashboard | 🔄 In Progress (backend done in `convex/admin.ts`) |
| 9. Voice Assistant | ✅ Complete (Gemini 2.0 Flash Exp with 25 tools — full CRUD) |
| 10. List Item Editing | ✅ Complete (edit name, quantity, price via modal) |
| 11. AI Usage Metering | ✅ Complete (voice limits, usage tracking, push notifications) |
| 12. Push Notifications | ✅ Complete (Expo Notifications, usage alerts, deep linking) |
| 13. Nurture Sequence | ✅ Complete (activity tracking, day-based nudges, contextual tips) |

**Current Priorities:**
1. **Dev Build + Voice QA** — Test voice assistant on iOS/Android dev builds (requires native modules)
2. ~~Push Notification Integration~~ ✅ Complete — Expo Notifications wiring done
3. **Android Builds** — Using local builds + manual Play Console upload (EAS free tier exhausted, resets March 1st).
4. **Price Bracket Matcher Validation** — Test against 19 real receipts (target >80% accuracy)
5. ~~First-Week Nurture Sequence~~ ✅ Complete — Day 1-5 nudges, trial reminders, contextual tips
6. **E2E Test Fixes** — 10 failures blocking ~35 cascade-skipped tests

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
| **AI/ML** | Gemini 2.5 Flash + OpenAI GPT-4o-mini (fallback) | Receipt parsing + Price estimation + Voice assistant |
| **Voice STT** | expo-speech-recognition | On-device speech-to-text (free, native engines) |
| **Voice TTS** | Google Cloud TTS → Azure → expo-speech | Neural British voices with cascade fallback |
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

## Shopping List UX

**Updated:** 2026-02-08

### Planning vs Shopping Mode

The shopping list has two distinct states with different UX:

| Mode | Status | Checkbox | Tap Action | Visual Hint |
|------|--------|----------|------------|-------------|
| **Planning** | `active` | Hidden (bullet point) | Opens edit modal | None |
| **Shopping** | `shopping` | Visible | Checks off item | Typewriter hint |

### Shopping Mode Features

- **Tap anywhere on item card** to check off (not just checkbox)
- **Typewriter hint**: "Shopping in Progress. Tap item to check off." animates above Complete button
- **Full-width Complete Shopping button** below the hint
- **Simplified badges**: Only "must-have" priority shown (alert icon), removed "Auto" badge
- **Swipe to change priority** still works in both modes

### Key Implementation

```typescript
// Tap gesture for checking off in shopping mode
const tapGesture = Gesture.Tap()
  .onEnd(() => {
    if (isShopping) {
      runOnJS(onToggle)();
    }
  });

// Composed with pan gesture for priority changes
const composedGesture = Gesture.Simultaneous(tapGesture, panGesture);
```

### Bulk Selection

Selection checkboxes are always visible on every list item (no toggle mode):

- **Checkbox on every item** — Always visible, tap to select/deselect
- **"All" button** — Always visible in items header, selects all items
- **"Clear" button** — Appears only when items selected, deselects all
- **Selection bar** — Appears at bottom when any items selected
  - Shows count: "3 selected"
  - Delete button with confirmation haptic
  - Uses `removeMultiple` mutation for batch delete

```typescript
// Selection state (always active, no toggle mode)
const [selectedItems, setSelectedItems] = useState<Set<Id<"listItems">>>(new Set());

// Bulk delete
const removeMultiple = useMutation(api.listItems.removeMultiple);
await removeMultiple({ ids: Array.from(selectedItems) });
```

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

**Analysis date:** 31 January 2026 | **Updated:** 8 February 2026

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
| 7 | ✅ | Smart push notifications (3 types) | 2 |
| 8 | ✅ | Weekly Insights narrative | 2 |
| 9 | ✅ | Warm accent color (#FFB088) | 2 |
| 10 | ✅ | Profile simplification | 2 |
| 11 | ✅ | First-week nurture sequence | 3 |
| 12 | ❌ | **Price intelligence surface** | 3 |
| 13 | ✅ | Journey prompts between tabs | 3 |
| 14 | ✅ | Visible investment counter | 3 |
| 15 | ✅ | Savings milestone celebrations | 3 |

**14/15 done. 1 remaining:** price intelligence surface (#12).

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
│   │   ├── RemoveButton.tsx
│   │   └── TipBanner.tsx        # Contextual tips banner (dismissible)
│   ├── pantry/                  # Pantry components
│   ├── voice/                   # Voice assistant components
│   │   ├── VoiceFAB.tsx         # Floating mic button (global, above tab bar)
│   │   ├── VoiceSheet.tsx       # Conversation bottom sheet
│   │   └── MessageBubble.tsx    # Chat bubble component
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
│   ├── useVoiceAssistant.ts     # Voice assistant lifecycle (STT, API, TTS, rate limiting)
│   ├── useActivityTracking.ts   # Session tracking for nurture sequence
│   └── useDelightToast.ts
│
├── lib/                          # Utilities
│   ├── design/glassTokens.ts   # Glass design tokens
│   ├── design/tokens.ts        # Additional design tokens
│   ├── icons/iconMatcher.ts    # Client-side icon mapping
│   ├── capabilities/deviceTier.ts  # Device capability tiers
│   ├── haptics/safeHaptics.ts  # Haptic feedback utilities
│   ├── voice/voiceTypes.ts    # Voice assistant shared TypeScript types
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
│   ├── nurture.ts               # First-week nurture sequence + activity tracking
│   ├── tips.ts                  # Contextual tips system
│   ├── partners.ts              # Partner mode backend
│   ├── notifications.ts         # Notification management
│   ├── stripe.ts                # Stripe integration
│   ├── subscriptions.ts         # Subscription lifecycle
│   ├── crons.ts                 # Scheduled jobs
│   ├── cronHandlers.ts          # Cron job handlers
│   ├── http.ts                  # HTTP endpoints
│   ├── auth.config.ts           # Clerk auth config
│   └── lib/                     # Backend utilities
│       ├── featureGating.ts     # Feature gates + plan limits
│       └── voiceTools.ts        # Voice assistant: 17 Gemini function declarations + dispatcher
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

## Nurture Sequence & Contextual Tips

**Status:** ✅ Implemented | **Built:** 2026-02-07

### Purpose

Help new users discover app value during their critical first week. Uses push notifications, in-app notifications, and contextual tips to guide users through key features.

### Architecture

```
User Activity → recordActivity mutation (session tracking)
  ↓
Daily Cron (10am UTC) → processNurtureSequence
  ↓
Check eligibility: signup day, trial status, last activity
  ↓
Send push + in-app notification → mark as sent
```

### Nurture Messages (Day-Based)

| Key | Day | Title | Trigger |
|-----|:---:|-------|---------|
| `day_1_welcome` | 1 | Welcome to Oja! | First-time user |
| `day_2_pantry` | 2 | Your pantry's looking good! | Has pantry items |
| `day_3_lists` | 3 | Ready to shop? | Engaged users |
| `day_5_scan` | 5 | Let Oja do the maths | Users with lists |
| `trial_ending_3d` | - | 3 days left on your trial | Trial ending soon |
| `trial_ending_1d` | - | Last day of your trial | Trial ends tomorrow |
| `trial_ended` | - | Your trial has ended | Trial expired |
| `inactive_7d` | - | We miss you! | 7+ days inactive |

### Contextual Tips System

Tips are context-aware and dismissible. Once dismissed, a tip won't show again.

| Context | Tips Available |
|---------|---------------|
| `pantry` | Stock levels, swipe gestures, search |
| `lists` | Budget tracking, list sharing |
| `list_detail` | Check off items, price estimates |
| `scan` | Receipt scanning tips |
| `profile` | Settings, subscription |
| `voice` | Voice commands intro |

### Key Files

| File | Role |
|------|------|
| `convex/nurture.ts` | Nurture sequence logic, cron handler, activity tracking |
| `convex/tips.ts` | Contextual tips queries and mutations |
| `convex/crons.ts` | Daily nurture-sequence cron (10am UTC) |
| `hooks/useActivityTracking.ts` | Client-side session tracking (foreground/background) |
| `components/ui/TipBanner.tsx` | Reusable dismissible tip component |

### Dynamic Trial Messages

Trial messages now calculate actual days remaining instead of hardcoded "7 days":

```typescript
const trialDays = Math.ceil((trialEndsAt - now) / (24 * 60 * 60 * 1000));
// "You have 5 days of full access to all features"
```

### Schema Updates

```typescript
// Added to users table:
lastActiveAt: v.optional(v.number()),
sessionCount: v.optional(v.number()),
lastSessionAt: v.optional(v.number()),

// New tables:
nurtureMessages: { userId, messageKey, sentAt, channel }
  .index("by_user"), .index("by_user_message")

tipsDismissed: { userId, tipKey, dismissedAt }
  .index("by_user"), .index("by_user_tip")
```

### Usage

**Display contextual tips:**
```tsx
import { TipBanner } from "@/components/ui/TipBanner";

// In your screen component:
<TipBanner context="pantry" />
```

**Track user activity (already wired in app layout):**
```tsx
import { useActivityTracking } from "@/hooks/useActivityTracking";

// In AppLayout:
useActivityTracking(); // Records sessions automatically
```

---

## Remaining Work

### High Priority — Retention & Engagement

| Item | Description | Effort |
|------|-------------|--------|
| ~~Push Notifications~~ | ✅ Complete — 3 types: stock reminder, streak motivation, weekly digest | ~~High~~ |
| ~~First-Week Nurture Sequence~~ | ✅ Complete — Day 1-5 nudges, trial reminders, contextual tips | ~~Medium~~ |
| **Price Intelligence Surface** | "Milk is 12% cheaper at Aldi this month" | High |

### Validation — Price Intelligence

| Item | Description | Status |
|------|-------------|--------|
| **Bracket Matcher Accuracy** | Test against 19 receipts in `receipts/` | Target: >80% |
| **Admin Receipt Seeding Portal** | Bulk scan 50-100 receipts before launch | Not started |

### In Progress

| Item | Description | Status |
|------|-------------|--------|
| **Voice Assistant QA** | Test on dev builds with real speech, diverse accents | Implementation done |
| ~~Partner Mode~~ | ✅ Complete — Push notification integration done | ~~Backend + UI done~~ |
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

## Voice Assistant — Tobi (Context-Aware Conversational AI)

**Status:** ✅ Implemented | **Built:** 2026-02-04 | **Updated:** 2026-02-06
**Approach:** Gemini 2.0 Flash Exp function-calling (not simple NLU — full conversational AI)
**Name:** Tobi — warm British-Nigerian personality, male voice

### Architecture

```
User taps FAB → VoiceSheet opens → on-device STT (free, expo-speech-recognition)
  → transcript → Convex `voiceAssistant` action
    → Gemini 2.0 Flash Exp with 25 function declarations
    → Gemini returns functionCall → action runs ctx.runQuery(...)
    → results sent back as functionResponse → Gemini composes answer
    → (loop max 3 function calls per turn)
  → response displayed in sheet
  → Neural TTS (Azure RyanNeural → Google Neural2-D → expo-speech fallback)
  → Auto-resume listening (continuous conversation mode)
```

**Write operations**: User intent = permission. If user says "create a list", assistant asks for missing info conversationally, then executes. No redundant "Would you like me to..." confirmations.

**Multi-turn**: Conversation history kept on client (max 6 turns = 12 messages), sent with each request.

**Continuous mode**: After TTS finishes, listening auto-resumes if sheet is open. Soft haptic on auto-resume vs stronger for manual tap.

**Fallback**: On Gemini failure → degraded OpenAI prompt (no function calling, just context-based answer).

### TTS Cascade (Neural Voices)

```
1. Azure Speech Services (RyanNeural, en-GB male) — British accent, warm tone
2. Google Cloud TTS (Neural2-D, en-GB male) — fallback
3. expo-speech (device TTS, enhanced British voice) — final fallback
```

**Free tiers:**
- Google Cloud: 1M chars/month (Neural2)
- Azure: 500K chars/month (Free F0)
- expo-speech: Unlimited (device engine)

### What the Assistant Can Do

**READ (15 tools):**
- `get_pantry_items` — pantry stock with filter (stocked/low/out)
- `get_active_lists` — all active shopping lists
- `get_list_items` — items on a specific list
- `get_list_details` — comprehensive list info (items, budget, spent, remaining)
- `get_budget_status` — budget status (spent, remaining, percentage)
- `get_app_summary` — app-wide overview (lists count, low stock, savings)
- `get_price_estimate` — current price for any item
- `get_price_stats` — price history and cheapest store
- `get_price_trend` — is price rising or falling
- `get_item_variants` — size options with prices (e.g., milk 1pt, 2pt, 4pt)
- `get_weekly_digest` — this week's spending summary
- `get_savings_jar` — cumulative savings
- `get_streaks` — activity streaks
- `get_achievements` — unlocked badges
- `get_monthly_trends` — 6-month spending trends

**WRITE (10 tools):**
- `create_shopping_list` — create new list with optional name/budget
- `add_items_to_list` — add items to a list
- `update_list_budget` — change a list's budget
- `update_stock_level` — mark pantry items stocked/low/out
- `check_off_item` — check off items while shopping
- `add_pantry_item` — add new items to pantry
- `delete_list` — delete a shopping list (requires confirmation)
- `remove_list_item` — remove item from a list
- `remove_pantry_item` — remove item from pantry
- `clear_checked_items` — clear all checked items from a list

### Example Conversations

| User says | What happens |
|-----------|-------------|
| "What am I running low on?" | Calls `get_pantry_items` with stockFilter → lists low/out items |
| "How much is milk?" | Calls `get_price_estimate` → shows price with confidence label |
| "How much room is left in my budget?" | Calls `get_budget_status` → "You've spent £32 of your £50 budget" |
| "Create a list called Aldi with £40 budget" | Calls `create_shopping_list` → creates list with budget |
| "Add eggs and bread to my list" | Calls `add_items_to_list` → adds items with price estimates |
| "Remove eggs from my list" | Calls `remove_list_item` → removes item |
| "Delete my Aldi list" | Calls `delete_list` → asks confirmation → deletes |
| "How much did I spend this week?" | Calls `get_weekly_digest` → summarises spending |
| "Give me an overview" | Calls `get_app_summary` → lists count, low stock, savings |

### Key Files

| File | Lines | Role |
|------|-------|------|
| `convex/lib/voiceTools.ts` | ~1250 | 25 function declarations, system prompt builder, tool dispatcher |
| `convex/ai.ts` (voiceAssistant) | +150 | Gemini function-call loop (max 3), OpenAI fallback |
| `lib/voice/voiceTypes.ts` | 44 | Shared TypeScript types |
| `hooks/useVoiceAssistant.ts` | 317 | STT lifecycle, API calls, TTS, rate limiting, conversation history |
| `components/voice/VoiceFAB.tsx` | 253 | Draggable floating mic button with pulse animation + position persistence |
| `components/voice/VoiceSheet.tsx` | 377 | Bottom sheet: conversation bubbles, status, action confirmation |
| `components/voice/MessageBubble.tsx` | 85 | Glass-styled chat bubbles (user right, assistant left) |

### Rate Limiting

- **Per-request throttle**: 1 request per 6 seconds (client-side)
- **Daily cap**: 200 requests/day (via AsyncStorage)
- **Friendly error messages**: "Give me a moment" / "I'll be back tomorrow"

### Personality (Tobi)

- Name is **Tobi** — uses it when introducing himself
- Warm, British-Nigerian, concise (like a knowledgeable market friend raised in London)
- Uses £ formatting, celebrates wins ("Nice one, mate!")
- Never shows raw data — always summarises conversationally
- Empathetic about budget struggles

### VoiceFAB (Draggable)

- **Draggable** — Users can drag the mic button anywhere on screen
- **Position persisted** — Saved to AsyncStorage, restored on app launch
- **Edge snapping** — Snaps to left or right edge when released
- **Respects safe areas** — Stays within screen bounds and above tab bar

### Requirements

- **Dev build required** — `expo-speech-recognition` and `expo-av` use native modules (not Expo Go compatible)
- **Microphone permission** — requested on first use with friendly error if denied
- **Gemini API key** — set in Convex dashboard as `GEMINI_API_KEY`

**Optional (for neural TTS):**
- `GOOGLE_CLOUD_API_KEY` — Google Cloud TTS API key (enable Text-to-Speech API)
- `AZURE_SPEECH_KEY` — Azure Cognitive Services Speech key
- `AZURE_SPEECH_REGION` — Azure region (e.g., `uksouth`)

### Next Steps — Voice Assistant

| Item | Description | Priority |
|------|-------------|----------|
| **Dev build QA** | Test on iOS/Android dev builds with real speech + neural TTS | High |
| **TTS toggle** | Add toggle in VoiceSheet header to disable TTS | Medium |
| **Navigation actions** | "Go to my pantry" → navigate to screen | Medium |
| **Voice-initiated receipt scan** | "Scan my receipt" → open camera | Low |
| **Unit tests** | Mock Gemini, test 30+ command variations | Medium |
| **Multi-language** | Support for non-English STT | Low |

---

## AI Usage Metering

**Status:** ✅ Implemented | **Built:** 2026-02-07

### Philosophy

- **Receipts are unlimited for paid users** — they feed the data flywheel (more scans = better prices for everyone) and earn subscription discounts
- **Voice is metered** — pure LLM cost with no data value back to the platform
- **User consent** — users can disable AI features or usage alerts in settings

### Usage Limits

| Feature | Free | Premium |
|---------|:----:|:-------:|
| Voice requests | 20/month | 200/month |
| Receipt scans | 3/month | Unlimited |

### Notification Thresholds

Push + in-app notifications sent at:
- **50%** — "Halfway through your voice allowance"
- **80%** — "80% of voice used, X remaining"
- **100%** — "Voice limit reached — upgrade for more!"

### Key Files

| File | Role |
|------|------|
| `convex/aiUsage.ts` | Usage tracking: increment, check limits, send notifications |
| `convex/lib/featureGating.ts` | AI_LIMITS configuration (20/200 voice, 3/unlimited receipts) |
| `convex/schema.ts` | `aiUsage` table + `aiSettings` on users |
| `app/(app)/ai-usage.tsx` | UI screen: progress bars, stats, settings toggles |

### Schema

```typescript
// aiUsage table
aiUsage: defineTable({
  userId: v.id("users"),
  feature: v.string(),           // "voice" or "receipt"
  periodStart: v.number(),       // Start of billing period
  periodEnd: v.number(),         // End of billing period
  requestCount: v.number(),      // Requests used
  limit: v.number(),             // Monthly limit (999999 = unlimited)
  lastNotifiedThreshold: v.optional(v.number()),
  ...timestamps
})
  .index("by_user_feature_period", ["userId", "feature", "periodEnd"])

// User aiSettings
aiSettings: v.optional(v.object({
  voiceEnabled: v.boolean(),     // Can toggle off voice entirely
  usageAlerts: v.boolean(),      // Push notifications at thresholds
}))
```

### API

```typescript
// Check if feature is available (without incrementing)
api.aiUsage.canUseFeature({ feature: "voice" })
// → { allowed: true, usage: 15, limit: 200, percentage: 8 }

// Increment usage (returns allowed status)
api.aiUsage.incrementUsage({ feature: "voice" })
// → { allowed: true, usage: 16, limit: 200, percentage: 8 }
// → { allowed: false, message: "...", ... } // at limit

// Get usage summary for current month
api.aiUsage.getUsageSummary()
// → { voice: { usage, limit, percentage }, receipts: {...}, aiSettings }

// Update settings
api.aiUsage.updateAiSettings({ voiceEnabled: false })
```

---

## Push Notifications

**Status:** ✅ Implemented | **Built:** 2026-02-07

### Architecture

```
App loads → usePushNotifications hook
  → Request permission (physical device only)
  → Get Expo push token
  → Save to backend (registerPushToken mutation)
  → Listen for incoming notifications (foreground)
  → Listen for notification taps (deep linking)
```

### Key Files

| File | Role |
|------|------|
| `convex/notifications.ts` | Token management + sendPush action |
| `hooks/usePushNotifications.ts` | Client hook: register, listen, deep link |
| `app/(app)/_layout.tsx` | Wires usePushNotifications on app load |

### API

```typescript
// Register push token (called automatically)
api.notifications.registerPushToken({ token: "ExponentPushToken[...]" })

// Remove token (on logout)
api.notifications.removePushToken()

// Send push (internal action)
internal.notifications.sendPush({
  userId,
  title: "Voice limit reached",
  body: "You've used all 200 voice requests this month.",
  data: { type: "ai_usage", screen: "ai-usage" }
})
```

### Deep Linking

When user taps a notification:
- `data.screen` → navigate to `/(app)/${screen}`
- `data.type === "ai_usage"` → navigate to `/(app)/ai-usage`
- `data.listId` → navigate to `/(app)/list/${listId}`

### Android Channel

```typescript
Notifications.setNotificationChannelAsync("default", {
  name: "default",
  importance: Notifications.AndroidImportance.MAX,
  vibrationPattern: [0, 250, 250, 250],
  lightColor: "#00D4AA",
});
```

### Notification Types

| Type | Trigger | Deep Link |
|------|---------|-----------|
| `ai_usage` | 50%, 80%, 100% voice usage | `/ai-usage` |
| `comment_added` | Partner comments on item | `/list/[id]` |
| `list_message` | Partner sends list message | `/list/[id]` |
| `list_approval_*` | Approval workflow updates | `/list/[id]` |

---

_Updated 2026-02-08. Shopping list UX improvements (tap-to-check, typewriter hint, simplified badges). VoiceFAB now draggable with position persistence. Price fallback cascade for list items. Border radius consistency across screens._

---

## Comprehensive Codebase Audit

**Audit Date:** 2026-02-06 | **Status:** Complete | **Findings:** 47 items across 5 categories

### Audit Summary

| Category | Files Audited | Critical Issues | High Issues | Medium Issues | Low Issues |
|----------|:-------------:|:---------------:|:-----------:|:-------------:|:----------:|
| Screens & Navigation | 25 | 2 | 3 | 5 | 4 |
| Design System & Components | 35+ | 0 | 2 | 8 | 5 |
| Backend (Convex) | 23 tables, 180+ functions | 1 | 5 | 4 | 3 |
| Hooks, Utilities, Dependencies | 6 hooks, 9 modules, 42 deps | 0 | 1 | 3 | 2 |
| Testing & Code Quality | 177 E2E, 25 unit files | 0 | 4 | 6 | 3 |

---

### 1. Screens & Navigation Audit

**Total Screens:** 25 (17 authenticated + 4 auth + 4 onboarding)

#### Critical Files Requiring Refactoring

| File | Lines | Issue | Recommendation |
|------|:-----:|-------|----------------|
| `app/(app)/list/[id].tsx` | 3,023 | God component — handles shopping mode, budget, items, partners, comments, approvals | Extract: `ShoppingModeView`, `BudgetSection`, `ItemsList`, `PartnerApproval`, `CommentThread` |
| `app/(app)/(tabs)/index.tsx` | 1,792 | Pantry screen with too many responsibilities | Extract: `PantryHeader`, `ViewToggle`, `ItemsList`, `AddItemModal` |
| `app/(app)/receipt/[id]/confirm.tsx` | 876 | Receipt confirmation complexity | Extract: `ParsedItemsList`, `StoreEditor`, `TotalComparison` |
| `app/onboarding/review-items.tsx` | 743 | Review items with inline editing | Extract: `ItemEditor`, `CategoryGroup` |
| `app/(app)/insights.tsx` | 689 | Six collapsible sections inline | Extract: `DigestSection`, `SpendingChart`, `AchievementsGrid` |
| `app/(app)/(tabs)/profile.tsx` | 654 | Settings + stats + subscription | Extract: `StatsCards`, `SettingsList`, `SubscriptionBanner` |

#### Navigation Architecture

```
Root Layout (app/_layout.tsx)
├── (auth)/ — Sign in, Sign up, Forgot password
├── onboarding/ — Welcome → Cuisine → Seeding → Review
└── (app)/ — Protected layout with Clerk auth guard
    ├── (tabs)/ — Bottom tab navigator
    │   ├── index.tsx — Pantry (home)
    │   ├── lists.tsx — Shopping lists
    │   ├── scan.tsx — Receipt scanner
    │   └── profile.tsx — User profile
    ├── list/[id].tsx — List detail
    ├── receipt/[id]/ — Confirm, Reconciliation
    ├── insights.tsx — Gamification
    ├── partners.tsx — Partner management
    ├── subscription.tsx — Stripe subscription
    ├── notifications.tsx — Notification center
    ├── admin.tsx — Admin dashboard
    └── join-list.tsx — Accept partner invite
```

#### Screen State Management Patterns

| Screen | State Source | Mutations | Issues |
|--------|-------------|-----------|--------|
| Pantry | `useQuery` + local `useState` | 5 mutations | View state not persisted |
| Lists | `useQuery` + optimistic updates | 4 mutations | ✅ Good pattern |
| List Detail | `useQuery` + complex local state | 8 mutations | Too much state coupling |
| Scan | Camera state + `useState` | 3 mutations | No error boundary |
| Profile | `useQuery` + settings state | 2 mutations | ✅ Clean |
| Insights | `useQuery` + collapsible state | 0 mutations | ✅ Read-only |

---

### 2. Design System & Components Audit

**Total Components:** 35+ across 4 directories

#### Glass Components (`components/ui/glass/`)

| Component | Lines | Props | Variants | Accessibility |
|-----------|:-----:|:-----:|:--------:|:-------------:|
| GlassCard | 89 | 8 | 4 (standard, elevated, sunken, bordered) | ❌ Missing `accessibilityRole` |
| GlassButton | 156 | 12 | 4 (primary, secondary, ghost, danger) × 3 sizes | ⚠️ Has `accessibilityLabel` |
| GlassInput | 134 | 14 | 2 (default, error) | ❌ Missing `accessibilityHint` |
| GlassListItem | 78 | 9 | 3 (default, compact, settings) | ❌ No testID |
| GlassCheckItem | 112 | 11 | 2 (standard, circular) | ❌ Missing role |
| GlassProgressBar | 67 | 6 | 3 (default, budget, loading) | ❌ No progress announcement |
| BudgetDial | 245 | 8 | N/A | ❌ Complex — no screen reader support |
| GlassModal | 98 | 7 | 2 (bottom, center) | ⚠️ Basic accessibility |
| GlassCollapsible | 134 | 6 | N/A | ❌ Missing expanded state |
| GlassToast | 89 | 6 | 4 (success, error, warning, info) | ❌ No live region |
| GlassSkeleton | 56 | 4 | 3 (card, listItem, text) | ✅ Decorative |
| GlassHeader | 78 | 5 | 2 (default, simple) | ⚠️ Basic |
| GlassTabBar | 167 | 4 | N/A | ❌ No tab role |
| GlassScreen | 45 | 3 | N/A | ✅ Layout only |
| GlassErrorState | 67 | 5 | N/A | ❌ No alert role |
| GlassAnimations | 189 | N/A | SuccessCheck, Pulse, Shimmer | ✅ Decorative |

**Accessibility Gap:** 90%+ components missing proper accessibility attributes (testID, accessibilityRole, accessibilityLabel, accessibilityHint).

#### Design Token Usage

| File | Purpose | Lines | Issue |
|------|---------|:-----:|-------|
| `lib/design/glassTokens.ts` | Master design tokens | 461 | ✅ Well-structured |
| `lib/design/tokens.ts` | Legacy tokens | 314 | ⚠️ Some overlap — consider consolidating |
| `PantryItemCard.tsx` | Pantry item | 234 | ❌ Uses hardcoded colors, NOT glass tokens |

#### Component Consistency Issues

1. **PantryItemCard** — Uses old light color palette, doesn't import from glassTokens
2. **CategoryFilter** — Mixes inline styles with token imports
3. **AddToListButton** — Has 3 different teal shades (should use `accent.primary`)
4. **RemoveButton** — Uses hardcoded `#EF4444` instead of `semantic.error`

---

### 3. Backend (Convex) Audit

**Total:** 23 tables, 180+ functions (80 queries, 85 mutations, 15 actions)

#### Database Schema Overview

| Table | Indexes | Relations | Audit Status |
|-------|:-------:|:---------:|:------------:|
| users | 3 | - | ✅ |
| pantryItems | 4 | → users | ✅ |
| shoppingLists | 5 | → users | ⚠️ See security |
| listItems | 4 | → shoppingLists | ✅ |
| listPartners | 3 | → shoppingLists, users | ⚠️ See security |
| receipts | 4 | → users, shoppingLists | ✅ |
| receiptItems | 2 | → receipts | ✅ |
| itemVariants | 2 | - | ✅ |
| currentPrices | 3 | - | ✅ |
| priceHistory | 5 | → users, receipts | ✅ |
| inviteCodes | 2 | → shoppingLists, users | ⚠️ See security |
| listMessages | 2 | → shoppingLists, users | ✅ |
| itemComments | 2 | → listItems, users | ✅ |
| notifications | 3 | → users | ⚠️ See security |
| achievements | 2 | → users | ✅ |
| streaks | 2 | → users | ✅ |
| weeklyChallenges | 2 | → users | ✅ |
| weeklyDigests | 2 | → users | ✅ |
| subscriptions | 3 | → users | ✅ |
| stripeCustomers | 2 | → users | ✅ |
| featureFlags | 1 | - | ✅ |
| announcements | 1 | - | ✅ |
| adminLogs | 2 | → users | ✅ |

#### HIGH Security Issues

| # | File | Function | Issue | Risk | Fix |
|---|------|----------|-------|:----:|-----|
| 1 | `partners.ts` | `acceptInvite()` | No check for duplicate partnerships — user can accept same invite multiple times | HIGH | Add unique constraint check before insert |
| 2 | `notifications.ts` | `markAsRead()` | Marks notification by ID without verifying ownership | HIGH | Add `userId` check: `n.userId === user._id` |
| 3 | `receipts.ts` | `linkToList()` | Links receipt to list without verifying list ownership | HIGH | Add list ownership or partner check |
| 4 | `admin.ts` | `resetUserByEmail()` | Admin function that bypasses normal auth checks | MEDIUM | Add admin role verification + audit log |
| 5 | `currentPrices.ts` | `overridePrice()` | No bounds validation on price (negative prices possible) | MEDIUM | Add `price > 0` validation |

#### N+1 Query Patterns Detected

| File | Function | Pattern | Fix |
|------|----------|---------|-----|
| `itemVariants.ts` | `setPreferredVariant()` | Fetches pantry item then updates separately | Use `ctx.db.patch()` directly |
| `itemVariants.ts` | `getWithPrices()` | Loop fetches prices per variant | Batch query with `Promise.all` or index |
| `insights.ts` | `getWeeklyDigest()` | 6 separate queries for stats | Combine into single aggregation query |
| `lib/featureGating.ts` | `canCreateList()` | Counts all lists, then filters | Use filtered count query |
| `lib/featureGating.ts` | `canAddPantryItem()` | Same pattern | Use filtered count query |

#### Backend Code Quality

| Metric | Current | Target | Status |
|--------|:-------:|:------:|:------:|
| Functions with auth check | 78/85 mutations | 85/85 | ⚠️ 7 missing |
| Functions using indexes | 95% | 100% | ⚠️ 5 table scans |
| Error handling coverage | 70% | 100% | ⚠️ Some actions throw raw errors |
| Optimistic update support | 60% | 80% | ⚠️ |

---

### 4. Hooks, Utilities & Dependencies Audit

#### Custom Hooks

| Hook | Lines | Dependencies | Issues |
|------|:-----:|:------------:|--------|
| `useCurrentUser.ts` | 45 | Clerk, Convex | ✅ Clean |
| `useVoiceAssistant.ts` | 317 | expo-speech-recognition, Convex, AsyncStorage | ⚠️ Large — consider splitting STT/TTS |
| `usePartnerRole.ts` | 67 | Convex | ✅ Clean |
| `useNotifications.ts` | 89 | Expo Notifications, Convex | ⚠️ No error handling for permission denial |
| `useDeviceCapabilities.ts` | 123 | expo-device, expo-constants | ✅ Clean |
| `useDelightToast.ts` | 45 | Custom toast context | ✅ Clean |

#### Utility Modules

| Module | Lines | Purpose | Issues |
|--------|:-----:|---------|--------|
| `lib/design/glassTokens.ts` | 461 | Design tokens | ✅ |
| `lib/icons/iconMatcher.ts` | 234 | Item → icon mapping | ⚠️ 3 invalid icons (bacon, quinoa, couscous) |
| `lib/capabilities/deviceTier.ts` | 156 | Device capability detection | ✅ |
| `lib/haptics/safeHaptics.ts` | 67 | Safe haptic feedback | ⚠️ Duplicate file exists |
| `lib/utils/safeHaptics.ts` | 67 | Duplicate | ❌ DELETE — duplicate |
| `lib/location/detectLocation.ts` | 89 | Location detection | ✅ |
| `lib/voice/voiceTypes.ts` | 44 | Voice TypeScript types | ✅ |
| `convex/lib/featureGating.ts` | 134 | Plan limits | ⚠️ N+1 queries |
| `convex/lib/voiceTools.ts` | 1,250 | Voice assistant tools | ⚠️ Large — well-structured but could split |

#### Dependencies Analysis

**Direct Dependencies:** 42 | **Dev Dependencies:** 10

| Category | Package | Version | Status |
|----------|---------|---------|:------:|
| Framework | expo | ~54.0.0 | ✅ Current |
| Framework | react-native | 0.81.5 | ✅ Current |
| Auth | @clerk/clerk-expo | ^4.0.0 | ✅ Current |
| Backend | convex | ^1.17.0 | ✅ Current |
| Payments | @stripe/stripe-react-native | ^0.38.0 | ⚠️ Check for updates |
| AI | @google/generative-ai | ^0.21.0 | ✅ Current |
| AI | openai | ^4.73.0 | ✅ Current |
| Charts | react-native-chart-kit | ^6.12.0 | ⚠️ Unmaintained — consider victory-native |
| Voice | expo-speech-recognition | ~0.2.0 | ✅ Current |
| Animations | react-native-reanimated | ~3.17.0 | ✅ Current |

**Unused Dependencies (candidates for removal):**
- `@react-native-async-storage/async-storage` — Expo provides this via `expo-secure-store`
- `react-native-gesture-handler` — Only if not using complex gestures

---

### 5. Testing & Code Quality Audit

#### E2E Test Coverage (Playwright)

| Spec File | Tests | Passed | Failed | Skipped |
|-----------|:-----:|:------:|:------:|:-------:|
| 01-auth.spec.ts | 12 | 12 | 0 | 0 |
| 02-onboarding.spec.ts | 15 | 15 | 0 | 0 |
| 03-pantry.spec.ts | 18 | 16 | 2 | 0 |
| 04-lists.spec.ts | 14 | 12 | 1 | 1 |
| 05-list-detail.spec.ts | 12 | 10 | 1 | 1 |
| 06-receipt.spec.ts | 11 | 9 | 2 | 0 |
| 07-budget.spec.ts | 9 | 7 | 1 | 1 |
| 08-insights.spec.ts | 8 | 6 | 1 | 1 |
| 09-partners.spec.ts | 10 | 8 | 1 | 1 |
| 10-profile.spec.ts | 7 | 6 | 1 | 0 |
| 11-subscription.spec.ts | 5 | 5 | 0 | 0 |
| 12-voice.spec.ts | 6 | 0 | 0 | 6 |
| 13-cross-cutting.spec.ts | 50 | 38 | 2 | 10 |
| **Total** | **177** | **144** | **12** | **21** |

**E2E Coverage:** 81% pass rate | **Target:** 95%

#### Unit Test Coverage (Jest)

| Directory | Files | Tests | Coverage |
|-----------|:-----:|:-----:|:--------:|
| `__tests__/convex/` | 12 | 89 | 65% |
| `__tests__/hooks/` | 4 | 23 | 40% |
| `__tests__/components/` | 6 | 34 | 25% |
| `__tests__/utils/` | 3 | 18 | 80% |
| **Total** | **25** | **164** | **~45%** |

**Unit Coverage:** 45% | **Target:** 80%

#### Code Quality Metrics

| Metric | Current | Target | Status |
|--------|:-------:|:------:|:------:|
| TypeScript strict mode | ✅ Enabled | - | ✅ |
| ESLint errors | 0 | 0 | ✅ |
| ESLint warnings | 23 | 0 | ⚠️ |
| Files with `as any` | 27 | 0 | ❌ |
| Files over 500 lines | 6 | 0 | ❌ |
| Functions over 50 lines | 34 | 0 | ⚠️ |
| Cyclomatic complexity >10 | 8 | 0 | ⚠️ |
| Console.log statements | 12 | 0 | ⚠️ |

#### Code Smells Detected

| Type | Count | Files |
|------|:-----:|-------|
| God components (>1000 lines) | 2 | list/[id].tsx, (tabs)/index.tsx |
| Large files (>500 lines) | 6 | See "Critical Files" above |
| Magic numbers | 34 | Various — should use constants |
| Duplicate code | 5 pairs | haptics utils, icon mapping |
| Missing error boundaries | 100% | No ErrorBoundary wrapper |
| Inconsistent naming | 12 | Mix of camelCase/PascalCase in utils |
| Dead code | 8 functions | Unused exports in utils |

---

## Recommended Improvements

### 1. Clean Code Principles

#### 1.1 File Size & Component Extraction

**Priority: HIGH** | **Effort: Medium** | **Impact: High**

| Task | Current | Target | Action |
|------|:-------:|:------:|--------|
| list/[id].tsx | 3,023 lines | <500 lines | Extract 6 components (see audit) |
| (tabs)/index.tsx | 1,792 lines | <400 lines | Extract 4 components |
| receipt/[id]/confirm.tsx | 876 lines | <300 lines | Extract 3 components |
| review-items.tsx | 743 lines | <300 lines | Extract 2 components |
| insights.tsx | 689 lines | <300 lines | Extract 5 section components |
| profile.tsx | 654 lines | <300 lines | Extract 3 components |

**Refactoring Pattern:**
```typescript
// BEFORE: God component
export default function ListDetailScreen() {
  // 3000 lines of mixed concerns
}

// AFTER: Composition
export default function ListDetailScreen() {
  return (
    <GlassScreen>
      <ListHeader />
      <BudgetSection />
      <ItemsListSection />
      <ShoppingModeBar />
      <PartnerApprovalBanner />
    </GlassScreen>
  );
}
```

#### 1.2 Remove `as any` Patterns

**Priority: MEDIUM** | **Effort: Low** | **Impact: Medium**

27 files contain `as any` type assertions. Replace with proper types:

```typescript
// BAD
const data = response as any;

// GOOD
interface ResponseData {
  items: PantryItem[];
  total: number;
}
const data = response as ResponseData;
```

#### 1.3 Extract Magic Numbers to Constants

**Priority: LOW** | **Effort: Low** | **Impact: Low**

```typescript
// BAD
if (items.length > 50) { ... }
setTimeout(() => {}, 600);

// GOOD
const MAX_FREE_PANTRY_ITEMS = 50;
const SUCCESS_ANIMATION_DURATION = 600;

if (items.length > MAX_FREE_PANTRY_ITEMS) { ... }
setTimeout(() => {}, SUCCESS_ANIMATION_DURATION);
```

---

### 2. Security Improvements

#### 2.1 Fix HIGH Security Issues

**Priority: CRITICAL** | **Effort: Low** | **Impact: Critical**

| Issue | File | Fix |
|-------|------|-----|
| Duplicate partnership | `partners.ts:acceptInvite` | Add: `const existing = await ctx.db.query("listPartners").withIndex("by_list_user", q => q.eq("listId", invite.listId).eq("userId", user._id)).first(); if (existing) throw new Error("Already a partner");` |
| Notification ownership | `notifications.ts:markAsRead` | Add: `if (notification.userId !== user._id) throw new Error("Not authorized");` |
| Receipt link ownership | `receipts.ts:linkToList` | Add list ownership check before linking |
| Admin bypass | `admin.ts:resetUserByEmail` | Add admin role verification + audit logging |
| Price bounds | `currentPrices.ts:overridePrice` | Add: `if (args.price <= 0) throw new Error("Price must be positive");` |

#### 2.2 Add Missing Auth Checks

**Priority: HIGH** | **Effort: Low** | **Impact: High**

7 mutations missing `requireCurrentUser()`:
- `notifications.ts:clearAll`
- `admin.ts:toggleFeatureFlag`
- `admin.ts:createAnnouncement`
- `insights.ts:dismissChallenge`
- `partners.ts:updatePartnerNickname`
- `receipts.ts:retryParsing`
- `subscriptions.ts:syncStatus`

---

### 3. Performance Improvements

#### 3.1 Fix N+1 Query Patterns

**Priority: HIGH** | **Effort: Medium** | **Impact: High**

```typescript
// BAD: N+1 in getWithPrices
for (const variant of variants) {
  const price = await ctx.db.query("currentPrices")
    .withIndex("by_item", q => q.eq("itemName", variant.variantName))
    .first();
}

// GOOD: Batch query
const variantNames = variants.map(v => v.variantName);
const prices = await ctx.db.query("currentPrices")
  .filter(q => q.or(...variantNames.map(name =>
    q.eq(q.field("itemName"), name)
  )))
  .collect();
const priceMap = new Map(prices.map(p => [p.itemName, p]));
```

#### 3.2 Add Error Boundaries

**Priority: MEDIUM** | **Effort: Low** | **Impact: High**

```typescript
// Create: components/ErrorBoundary.tsx
class ErrorBoundary extends React.Component {
  state = { hasError: false, error: null };

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return <GlassErrorState
        title="Something went wrong"
        onRetry={() => this.setState({ hasError: false })}
      />;
    }
    return this.props.children;
  }
}

// Wrap in app/_layout.tsx
<ErrorBoundary>
  <Stack />
</ErrorBoundary>
```

---

### 4. Accessibility Improvements

#### 4.1 Add Accessibility Attributes

**Priority: HIGH** | **Effort: Medium** | **Impact: High**

Every interactive component needs:
- `accessibilityRole` — button, checkbox, link, etc.
- `accessibilityLabel` — Screen reader text
- `accessibilityHint` — Action description
- `testID` — For E2E testing

```typescript
// BEFORE
<Pressable onPress={handlePress}>
  <Text>Add Item</Text>
</Pressable>

// AFTER
<Pressable
  onPress={handlePress}
  accessibilityRole="button"
  accessibilityLabel="Add item to pantry"
  accessibilityHint="Opens the add item form"
  testID="pantry-add-item-button"
>
  <Text>Add Item</Text>
</Pressable>
```

#### 4.2 Screen Reader Support for Complex Components

| Component | Missing | Fix |
|-----------|---------|-----|
| BudgetDial | Live region for updates | Add `accessibilityLiveRegion="polite"` |
| GlassCollapsible | Expanded state | Add `accessibilityState={{ expanded }}` |
| GlassTabBar | Tab role | Add `accessibilityRole="tab"` to each tab |
| GlassToast | Alert role | Add `accessibilityRole="alert"` |
| SuccessCheck | Animation announcement | Add `accessibilityLabel="Success"` |

---

### 5. Testing Improvements

#### 5.1 Fix 10 Failing E2E Tests

**Priority: HIGH** | **Effort: Low** | **Impact: High**

| Test | Root Cause | Fix |
|------|------------|-----|
| 3.15 Pantry add | GlassButton click not triggering | Create `clickPressable()` helper |
| 4.7 List card nav | `networkidle` timeout | Use `waitForConvex()` |
| 5.0 Create list | Assertion timing | Remove catch fallback, explicit wait |
| 6.3 Receipt upload | Timeout too short | Increase to 10s |
| 7.0 Budget list | Same as 5.0 | Same fix |
| 8.3 Insights | Scroll needed | Add scroll before click |
| 9.0 Shared list | Same as 5.0 | Same fix |
| 10.2 Profile identity | CSS selectors | Use text selectors |
| 13.13 White backgrounds | /scan camera timeout | Skip scan tab |
| 13.18 JS errors | Same as 13.13 | Skip scan tab |

#### 5.2 Increase Unit Test Coverage

**Priority: MEDIUM** | **Effort: High** | **Impact: High**

| Area | Current | Target | Priority Tests |
|------|:-------:|:------:|----------------|
| Convex functions | 65% | 90% | Auth checks, mutations, price cascade |
| Hooks | 40% | 80% | useVoiceAssistant, usePartnerRole |
| Components | 25% | 70% | Glass components, BudgetDial |
| Utils | 80% | 95% | iconMatcher, formatters |

#### 5.3 Add Missing Test Types

- [ ] **Snapshot tests** — For all 23 glass components
- [ ] **Integration tests** — Auth flow, onboarding flow
- [ ] **API contract tests** — Convex function signatures
- [ ] **Accessibility tests** — Using @testing-library/react-native

---

### 6. Code Organization Improvements

#### 6.1 Remove Duplicate Files

| Keep | Delete | Reason |
|------|--------|--------|
| `lib/haptics/safeHaptics.ts` | `lib/utils/safeHaptics.ts` | Exact duplicate |

#### 6.2 Consolidate Design Tokens

Merge `lib/design/tokens.ts` into `lib/design/glassTokens.ts` and update all imports.

#### 6.3 Fix Inconsistent Naming

| Current | Should Be | Location |
|---------|-----------|----------|
| `iconMatcher.ts` | `iconMatcher.ts` | ✅ Correct |
| `safeHaptics.ts` | `haptics.ts` | lib/haptics/ |
| `detectLocation.ts` | `location.ts` | lib/location/ |
| `voiceTypes.ts` | `types.ts` | lib/voice/ |

---

### 7. Documentation Improvements

#### 7.1 Add JSDoc Comments

All exported functions should have JSDoc:

```typescript
/**
 * Estimates price for an item using the 3-layer cascade.
 * @param itemName - Normalized item name
 * @param region - Optional region for regional pricing
 * @returns Price estimate with source and confidence
 * @example
 * const price = await estimateItemPrice("milk", "UK");
 * // { price: 1.15, source: "crowdsourced", confidence: "high" }
 */
export async function estimateItemPrice(
  itemName: string,
  region?: string
): Promise<PriceEstimate> { ... }
```

#### 7.2 Create Component Storybook

Document all glass components with:
- All variants
- All sizes
- Interactive props
- Accessibility examples

---

_CLAUDE.md Updated: 2026-02-08_
_Comprehensive Codebase Audit Added: 2026-02-06 (47 findings across 5 categories)_
_Recommended Improvements Section Added: 2026-02-06 (7 improvement areas)_
