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

**Key versions:** React 19.1, React Native 0.81, Convex 1.32, TypeScript 5.9, Playwright 1.58

## Commands

```bash
# Development
npx expo start                    # Start dev server
npx convex dev                    # Start Convex backend (required)

# Testing
npm test                          # Jest unit tests (46 test files)
npm run test:watch                # Watch mode
npm run e2e                       # Playwright E2E (17 specs)
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

**Safe wrappers for native modules:**
- `lib/keyboard/safeKeyboardController.tsx` - Wraps `react-native-keyboard-controller` with fallback to `KeyboardAvoidingView` if native module isn't linked
- Always use `SafeKeyboardProvider` and `SafeKeyboardAwareScrollView` instead of importing directly
- This allows development to continue even if the APK hasn't been rebuilt yet

## Architecture

### Navigation (Expo Router)

**4 Main Tabs:**
- **Lists** (`/(app)/(tabs)/index.tsx`) - Shopping lists, templates, shared lists
- **Stock** (`/(app)/(tabs)/stock.tsx`) - Pantry management (attention view / all items)
- **Scan** (`/(app)/(tabs)/scan.tsx`) - Receipt + product scanning
- **Profile** (`/(app)/(tabs)/profile.tsx`) - User settings, account, admin access

**Route Groups:**
- `(auth)/` - Sign in/up/forgot-password (unauthenticated only)
- `onboarding/` - welcome -> cuisine -> store -> pantry-seeding -> review
- `(app)/` - Protected routes (signed in + onboarding complete)

**Key Routes:**
- `list/[id].tsx` - Shopping list detail (~350 lines, modularized)
- `receipt/[id]/confirm.tsx` + `reconciliation.tsx` - Receipt processing
- `admin.tsx` + `admin/*` - 10-tab modular admin dashboard (292 lines hub + tab components)
- `insights.tsx` - Gamification/analytics (~354 lines, card components extracted)
- `subscription.tsx` - Stripe payment flow
- `ai-usage.tsx` - Voice/scan usage tracking
- `support.tsx` - User support ticket submission
- `pantry-pick.tsx` - Bulk add pantry items to list
- `create-list-from-receipt.tsx` - Create shopping list from scanned receipt
- `trip-summary.tsx` - Post-shopping trip summary

**Tab Bar Behavior:**
- Custom `PersistentTabBar` (not Expo Router's native Tabs)
- Hidden on focused flows: receipt processing, trip summary, onboarding
- Stock tab shows badge: count of low + out-of-stock items

### Backend (Convex) - Fully Modularized

**60+ tables** organized across 11 schema files in `convex/schema/`:

| Schema File | Tables |
|-------------|--------|
| `core.ts` | users, pantryItems, shoppingLists, listItems |
| `pricing.ts` | currentPrices, priceHistory, priceHistoryMonthly, itemVariants |
| `collaboration.ts` | listPartners, inviteCodes, listMessages, itemComments |
| `gamification.ts` | achievements, streaks, weeklyChallenges, pointsBalance, pointsTransactions, seasonalEvents, loyaltyPoints, pointTransactions |
| `subscriptions.ts` | subscriptions, revenueMetrics, scanCredits, scanCreditTransactions, pricingConfig |
| `analytics.ts` | platformMetrics, cohortMetrics, funnelEvents, churnMetrics, ltvMetrics, userSegments, activityEvents, aiUsage |
| `admin.ts` | adminLogs, archivedAdminLogs, adminRoles, rolePermissions, userRoles, adminSessions, adminRateLimits, supportTickets, ticketMessages, impersonationTokens, adminDashboardPreferences, adminAlerts, slaMetrics, savedFilters |
| `receipts.ts` | receipts, receiptHashes, itemMappings, pendingItemMatches |
| `content.ts` | notifications, featureFlags, announcements, nurtureMessages, tipsDismissed, helpArticles, helpCategories, tutorialHints |
| `experiments.ts` | experiments, experimentVariants, experimentAssignments, experimentEvents, automationWorkflows, webhooks, processedWebhooks |
| `utils.ts` | referralCodes, rateLimits, pointsReservations, discrepancies, scheduledReports, reportHistory, userTags |

**Backend modules (modularized into subdirectories):**

| Module | Directory | Total Lines | Purpose |
|--------|-----------|-------------|---------|
| `ai/` | `convex/ai/` | ~1,125 | Gemini 2.0 Flash + OpenAI fallback (vision, health, pantry, pricing, voice, suggestions) |
| `shoppingLists/` | `convex/shoppingLists/` | ~1,362 | List CRUD, health analysis, multi-store, sharing, trips |
| `pantry/` | `convex/pantry/` | ~891 | Pantry CRUD, lifecycle, auto-archiving, restock |
| `listItems/` | `convex/listItems/` | ~700 | Item CRUD, price resolution, variant matching |
| `insights/` | `convex/insights/` | ~418 | Weekly digest, monthly trends, challenges, personal bests |
| `admin/` | `convex/admin/` | ~613 | RBAC, receipt management, helpers |
| `voice/` | `convex/lib/voice/` | ~779 | Voice assistant declarations, prompts, dispatcher |

**Root barrel files** (`convex/ai.ts`, `convex/listItems.ts`, `convex/pantryItems.ts`, etc.) re-export from subdirectories for backward compatibility with `api.*` imports.

**Other key backend files:**
| File | Lines | Purpose |
|------|-------|---------|
| `users.ts` | 764 | User CRUD, onboarding, getOrCreate |
| `points.ts` | 600 | Points system, fraud detection, earning |
| `partners.ts` | 579 | Collaboration, sharing, invites |
| `subscriptions.ts` | 435 | Subscription management, trial handling |
| `notifications.ts` | 379 | Push notifications, in-app alerts |
| `lib/priceResolver.ts` | 349 | 3-layer price cascade logic |
| `lib/itemNameParser.ts` | 256 | Item name/size parser (MANDATORY) |
| `lib/featureGating.ts` | 228 | Feature limits, tier system, plan checks |

**Auth Pattern:** Every mutation calls `requireCurrentUser(ctx)`. Admin functions call `requireAdmin(ctx)`.

**Cron Jobs:** 30+ scheduled tasks in `crons.ts`:
- **Daily:** trial expiry, notifications prune, pantry auto-archive, metrics compute, user segments, cohort retention, churn risk, workflows, health analysis prune, Stripe reconciliation
- **Hourly:** admin session cleanup, fraud alerts
- **Every 15-30min:** receipt health, API latency, security anomalies, price anomalies
- **Weekly:** admin log archiving, summary reports, stock reminders (Wed/Fri)
- **Monthly:** analytics, points expiry, price history compression, stale product prune, receipt image cleanup, webhook cleanup, financial reports

### Price Intelligence (Zero-Blank Prices)

**Every item shows a price.** Three-layer cascade:
1. **Personal History** - User's own receipts (Highest trust: **< 3 days old**)
2. **Crowdsourced** - Community data (Overrides personal if personal is **> 3 days old** and community data is fresher)
3. **AI Estimate** - Gemini with OpenAI fallback (Baseline)

**Key files:** `lib/priceResolver.ts`, `currentPrices.ts`, `itemVariants.ts`, `priceHistory.ts`

### Glass UI Design System

**27 Glass components** in `@/components/ui/glass/`:
- **Core:** GlassCard, GlassButton, GlassInput, GlassModal, GlassListItem
- **Navigation:** GlassSegmentedControl, GlassTabBar, GlassHeader, GlassCapsuleSwitcher
- **Visualization:** CircularBudgetDial, GlassProgressBar, GlassCheckbox
- **Feedback:** GlassAlert, GlassToast, GlassErrorState, GlassDropdown
- **Layout:** GlassCollapsible, GlassSkeleton, GradientBackground, GuidedBorder
- **Utility:** KeyboardAwareGlassScreen, SafeDateRangePicker, GlassDateRangePicker
- **Banners:** TrialNudgeBanner, ImpersonationBanner, OfflineBanner
- **Animation:** GlassAnimations (AnimatedPressable, AnimatedListItem, AnimatedSection, ShimmerEffect)

**Design Tokens** (`lib/design/glassTokens.ts`):
- Background: #0D1528 -> #1B2845 -> #101A2B (gradient)
- Primary accent: #00D4AA (teal) - **CTAs only**
- Warm accent: #FFB088 (celebrations)
- Typography: 5 scales (Display, Headlines, Body, Labels, Numbers)
- Spacing: 4px base unit (xs: 4 -> 6xl: 64)
- Device tiers: Premium (iOS blur), Enhanced (Material), Baseline (solid)

**UI/UX Patterns:**
- **Page Load Animation:** `pageAnimationKey` (on focus) + `animationKey` (on tab/filter switches) with `AnimatedSection` staggered delays
- **Haptics:** Always provide feedback (`Light` for taps, `Medium` for success/deletions)
- **Consistency:** 16px horizontal margins (`spacing.lg`) for all main containers
- **Loading States:** Early returns with `SkeletonCard` while data is `undefined`

### Voice Assistant (Tobi)

**Modularized** into `convex/lib/voice/`:
- `declarations.ts` (617 lines) - Function tool definitions
- `prompts.ts` (115 lines) - System prompts
- `dispatcher.ts` (42 lines) - Tool execution dispatch

**Infrastructure:**
- STT: `expo-speech-recognition` (on-device)
- TTS cascade: Google Cloud Neural2 -> expo-speech
- Hook: `hooks/useVoiceAssistant.ts` (582 lines)
- AI engine: Gemini 2.0 Flash

Requires dev build (native modules).

### Key Hooks & Utilities

| Hook/Utility | Purpose |
|--------------|---------|
| `useHintSequence` | Sequential tutorial hint management |
| `useVoiceAssistant` | Voice assistant lifecycle |
| `useVariantPrefetch` | Size/Price modal cache warming (debounced, TTL-based) |
| `usePartnerRole` | List permissions (member role) |
| `useDelightToast` | Gamification celebrations |
| `useCurrentUser` | Clerk user context + admin/impersonation |
| `useShoppingList` | Shopping list data + trip logic |
| `useTripLogic` | Shopping trip state management |
| `useScanLogic` | Receipt/product scanning orchestration |
| `useReceiptScanner` | Receipt image processing |
| `useProductScanner` | Barcode/product scanning |
| `useItemSuggestions` | Autocomplete suggestions for item input |
| `useUserSubscription` | Subscription status + feature access |
| `useNotifications` | Push notification management |
| `usePushNotifications` | Expo push token registration |
| `useImpersonation` | Admin user impersonation |
| `useHint` | Single tutorial hint display |
| `lib/haptics/safeHaptics` | Safe haptic feedback (device detection) |
| `convex/lib/priceValidator` | Shared price confidence and emergency estimation |
| `lib/sizes/sizeNormalizer` | UK size parsing (pints, ml, kg) |
| `lib/icons/iconMatcher` | 106 validated MaterialCommunityIcons |
| `lib/keyboard/safeKeyboardController` | Safe keyboard wrapper (dev build fallback) |
| `lib/text/fuzzyMatch` | Levenshtein similarity for deduplication |
| **`convex/lib/itemNameParser`** | **Item name/size parser (MANDATORY for all item creation)** |

### Item Name Parser (MANDATORY)

**Location:** `convex/lib/itemNameParser.ts`

**Critical:** MUST be used for ALL item creation/update operations across the entire codebase.

**UNACCEPTABLE:** Size without unit. The utility will REJECT any size without a unit completely.

**Three core functions:**

1. **`cleanItemForStorage(name, size, unit)`** - Use BEFORE saving to database
   - **CRITICAL:** Rejects size without unit completely (returns both as undefined)
   - Filters vague sizes ("per item", "each", "unit", "piece")
   - Validates size has number + unit
   - Extracts size from beginning of name
   - Auto-extracts unit from size string if not provided
   - Returns: `{ name: string, size?: string, unit?: string }`
   - Guarantee: If size is present, unit is ALWAYS present. If unit missing, size is rejected.

2. **`formatItemDisplay(name, size, unit)`** - Use for UI display
   - Shows size at BEGINNING: "500ml Milk"
   - Filters invalid sizes automatically
   - Requires both size AND unit to display size
   - Returns: formatted string

3. **`isValidSize(size, unit)`** - Validate size/unit pair
   - **CRITICAL:** Returns false if size exists but unit is missing
   - Validates unit is a known UK grocery unit (ml, l, g, kg, pt, pint, pack, etc.)
   - Returns boolean
   - Use for conditional logic

**Usage Examples:**

```typescript
// FRONTEND (React Native components)
import { cleanItemForStorage, formatItemDisplay } from "@/convex/lib/itemNameParser";

// Example 1: Size at beginning with vague unit - auto-extracts unit
const cleaned1 = cleanItemForStorage("500ml Milk", "per item", "each");
// Result: { name: "Milk", size: "500ml", unit: "ml" }

// Example 2: Size without unit - REJECTED completely
const cleaned2 = cleanItemForStorage("Milk", "500", undefined);
// Result: { name: "Milk", size: undefined, unit: undefined }

// Example 3: Valid size and unit
const cleaned3 = cleanItemForStorage("Rice", "2kg", "kg");
// Result: { name: "Rice", size: "2kg", unit: "kg" }

await createItem({
  listId,
  name: cleaned.name,
  size: cleaned.size,  // Always present with unit, or undefined
  unit: cleaned.unit,  // Always present with size, or undefined
  // ...
});

// For display
const displayText = formatItemDisplay(item.name, item.size, item.unit);
// "500ml Milk" (never "Milk 500ml" or "Milk per item" or "Milk 500")
```

```typescript
// BACKEND (Convex mutations/actions)
import { cleanItemForStorage } from "./lib/itemNameParser";

export const addItem = mutation({
  handler: async (ctx, args) => {
    const cleaned = cleanItemForStorage(args.name, args.size, args.unit);

    await ctx.db.insert("listItems", {
      name: cleaned.name,
      size: cleaned.size,
      unit: cleaned.unit,
      // ...
    });
  },
});
```

**Enforcement:**
- **Size without unit is UNACCEPTABLE** - utility will reject completely
- **ALL data sources cleaned:**
  - Frontend: PersonalizedSuggestions, HealthAnalysisModal, AddItemsModal
  - Backend queries: personalization.ts (getBuyItAgainSuggestions)
  - AI responses: ai/health.ts (analyzeListHealth swaps and bonuses)
  - Voice assistant: lib/voice/declarations.ts
- **ALL future routes MUST use this utility:**
  - Before saving items to database
  - Before returning suggestions from queries
  - Before displaying items to users
- Code review will reject:
  - Item creation without this utility
  - Query results without cleaning
  - Any attempt to save size without unit
  - Bypassing the utility validation
- Utility includes fail-safe: throws error if size without unit somehow passes through

### Keyboard Awareness Pattern

Use `react-native-keyboard-controller` (NOT Reanimated's `useAnimatedKeyboard`).

Reference implementation: `list/[id].tsx` - dynamic overlap algorithm using `useReanimatedKeyboardAnimation` + `useReanimatedFocusedInput` + `useKeyboardHandler({ onEnd })`.

**Never call `Dimensions.get()` inside a worklet** -- capture on JS thread and close over it.

**Windows build:** `android/app/build.gradle` has `buildStagingDirectory = file("C:/b")` to avoid 260-char path limit.

## Admin Dashboard (Production Ready)

**Access:** `app/(app)/admin.tsx` (292 lines) - Hub that loads tab components from `app/(app)/admin/`

**10 Tabs** (each a separate component file):
1. **OVERVIEW** (`OverviewTab.tsx`) - Platform KPIs, hero metrics, activity timeline
2. **USERS** (`UsersTab.tsx`) - Lifecycle management, trial/premium granting, impersonation
3. **ANALYTICS** (`AnalyticsTab.tsx`) - Cohort retention, MRR/ARR/churn, LTV predictions
4. **RECEIPTS** (`ReceiptsTab.tsx`) - Moderation queue, anomaly detection, price overrides
5. **CATALOG** (`CatalogTab.tsx`) - Store variant merging, price history auditing
6. **MONITORING** (`MonitoringTab.tsx`) - Real-time health, SLA tracking, alerts
7. **WEBHOOKS** (`WebhooksTab.tsx`) - Stripe, Clerk, internal event management
8. **SUPPORT** (`SupportTab.tsx`) - Integrated ticketing system
9. **POINTS** (`PointsTab.tsx`) - Points management and fraud monitoring
10. **SETTINGS** (`SettingsTab.tsx`) - Feature flags, announcements, admin management

**Shared admin components** in `app/(app)/admin/components/`:
- `AdminTabBar.tsx`, `Breadcrumbs.tsx`, `GlobalSearchModal.tsx`, `MetricCard.tsx`
- `RetentionCell.tsx`, `SavedFilterPills.tsx`, `SupportTicketView.tsx`, `ToastProvider.tsx`

**Features:**
- RBAC with granular permissions (adminRoles, rolePermissions, userRoles tables)
- Global search (Cmd+K command palette)
- Keyboard navigation (1-9 tab switching)
- Multi-layer caching, precomputed metrics
- MFA integration (14-day grace period)
- Immutable audit logging (SIEM) with cold storage archiving

## Critical Rules

1. **Read `project-context.md` first** - If it exists, always read before implementation
2. **Use indexes** - Never scan full Convex tables (every query has `.withIndex()`)
3. **Optimistic updates** - For instant UX feedback
4. **Haptic feedback** - On all interactions via `safeHaptics.ts`
5. **Handle all states** - Loading, error, empty, success
6. **Zero-Blank Prices** - Every item must show a price (3-layer cascade)
7. **Validated icons only** - Use `iconMatcher.ts` for MaterialCommunityIcons
8. **NEVER kill node.exe** - Kills Claude Code itself. Use `npx kill-port <port>` instead
9. **NEVER use types** - Never use TypeScript type annotations (`: any`, `: string`, interfaces, type casts, `type` aliases) when writing NEW code. No `interface`, no `type X = ...`, no `: string` parameter annotations. Existing typed code may remain but NEW code must be type-free.
10. **Max 400 lines per file** - No single file may exceed 400 lines. If a file approaches this limit, extract components, helpers, or logic into separate files. This applies to all new and modified files.
11. **Parallel sub-agents** - Deploy multiple sub-agents in parallel where possible
12. **Never fix without approval** - Present analysis and proposed solution first
13. **Size/Weight formatting (MANDATORY UTILITY USAGE):**
    ```typescript
    // WRONG - Never create items without utility
    await createItem({ name: "500ml Milk", size: "per item" })
    await createItem({ name: "Milk", size: "500ml" }) // NO UNIT - UNACCEPTABLE!

    // CORRECT - Always use cleanItemForStorage
    import { cleanItemForStorage } from "@/convex/lib/itemNameParser";
    const cleaned = cleanItemForStorage("500ml Milk", "per item", "each");
    await createItem({
      name: cleaned.name,      // "Milk"
      size: cleaned.size,      // "500ml"
      unit: cleaned.unit       // "ml" - ALWAYS present if size exists
    })
    ```
    - **CRITICAL:** Size without unit is UNACCEPTABLE and will be rejected
    - **EVERY item creation/update** must call `cleanItemForStorage()` first
    - **EVERY item display** should use `formatItemDisplay()` for consistency
    - Utility ensures: Size + Unit always together, or both undefined
    - See **"Item Name Parser (MANDATORY)"** section for full documentation
    - Import: `@/convex/lib/itemNameParser` (works in frontend & backend)
    - Reference: `PersonalizedSuggestions.tsx`, `HealthAnalysisModal.tsx`, `lib/voice/declarations.ts`
14. **Convex cross-function calls:**
    - Import `api` from `./_generated/api`: `import { api } from "./_generated/api";`
    - Use `ctx.runQuery(api.module.functionName, args)` or `ctx.runMutation(api.module.functionName, args)`
    - Example: `await ctx.runQuery(api.admin.getAnalytics, {})` -- not `await ctx.runQuery(query.getAnalytics, {})}`
15. **Post-Refactor Validation (CRITICAL):**
    - **ALWAYS run `npx expo start`** after completing any refactor to verify no syntax errors
    - **Check JSX tag matching** - Every `<View>` must close with `</View>`, not `</Animated.View>` or vice versa
    - **Run `npm run typecheck`** to catch TypeScript errors
    - **Test the affected feature** manually in the app
    - **DO NOT mark refactor complete** until the app loads successfully without errors
    - Common mistake after major refactors: JSX tag mismatches (e.g., opening `<View>` but closing with `</Animated.View>`)
    - This validation step is MANDATORY - skipping it leads to runtime errors that break development
16. **Modular backend pattern:**
    - Large backend modules are split into subdirectories (e.g., `convex/ai/`, `convex/pantry/`, `convex/listItems/`, `convex/shoppingLists/`, `convex/insights/`, `convex/admin/`, `convex/lib/voice/`)
    - Root barrel files (e.g., `convex/ai.ts`) re-export from the subdirectory for API compatibility
    - New functions go in the appropriate subfile, NOT the barrel
    - Schema is split across `convex/schema/*.ts` files -- add new tables to the correct domain file

## Feature Development Workflow

### 1. Planning Phase
- Run **ultrathink session in party mode** (`/party-mode`) with relevant BMAD agents
- Discuss architecture, edge cases, implementation approach
- Identify affected files and potential risks

### 2. Create Implementation Plan
- Create `FEATURE-NAME-IMPLEMENTATION.md` in project root
- Structure with **numbered phases** (Phase 1, Phase 2, etc.)
- Each phase has **checkboxes** for tracking progress

### 3. Execution
- User tells Claude which phase to execute
- Spawn **parallel sub-agents** where possible
- Check off completed items as work progresses
- Run tests after each phase

### 4. Cleanup
- Delete the implementation `.md` file when complete
- Update this CLAUDE.md if feature adds new patterns

## Testing

**Unit Tests (46 files in `__tests__/`):**
- Admin (dashboard, audit, analytics, user management, maintenance)
- Insights (streaks, challenges, trends, achievements)
- Partners (comments, contest-flow, notifications, permissions)
- Subscriptions (stripe-webhook, points-earning, point-expiry, tier-calculation)
- Sizes (normalizer, matching, store queries, scan enrichment)
- Components (GlassCard, ContestModal, NotificationBell, VoiceFAB, keyboard)
- Lib (fuzzyMatch, itemDeduplicator, itemNameParser, points-logic, priceResolver, priceValidator, listItems)
- Schema validation, budget logic, price bracket matcher, community helpers, store normalizer, titleCase, variant-aware-dedup

**E2E Tests (17 specs in `e2e/tests/`):**
- Playwright with Expo Web (http://localhost:8081)
- Full user journeys: auth -> onboarding -> pantry -> lists -> list-items -> receipt-scanning -> budget-prices -> gamification -> partner-mode -> profile -> subscription -> admin -> cross-cutting -> store-selection -> size-display -> store-switch
- Shared Clerk auth state (serial execution)
- 19 real UK receipt images for scanning tests
- Page Object Model (7 pages)

**Known E2E quirks:**
- `AnimatedPressable` clicks need `page.evaluate()` JS click via `clickPressable()` helper
- `networkidle` never fires (Convex WebSocket) - use `waitForConvex()` helper
- Receipt upload via hidden `<input type="file">` (expo-image-picker on web)

## Environment Variables

**Client (.env.local):**
```
EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_...
EXPO_PUBLIC_CONVEX_URL=https://...
```

**Server (Convex Dashboard):**
```
GEMINI_API_KEY, OPENAI_API_KEY, STRIPE_SECRET_KEY, CLERK_SECRET_KEY
```

**E2E (.env.e2e):**
```
E2E_CLERK_USER_USERNAME, E2E_CLERK_USER_PASSWORD
```

## Subscription & Points System (Pinned)

**Status:** Core bugs fixed (Feb 2025). Needs Stripe Dashboard config + end-to-end live testing before production.

**Architecture:**
- **Trial:** 7 days, auto-started in `convex/users.ts:completeOnboarding()`. Sets `plan: "premium_monthly"`, `status: "trial"`
- **Feature Gating:** Single source in `convex/lib/featureGating.ts`
  - Free: 2 lists, 30 pantry items, unlimited receipt scans (tracking), 10 voice/mo, partnerMode: false
  - Premium: unlimited lists/pantry (voice capped at 200/mo)
- **Points System:** Receipt scans earn points (not GBP credits)
  - Bronze (0 scans): 150 pts/scan, max 4 earning scans/mo
  - Silver (20 scans): 175 pts/scan, max 5/mo
  - Gold (50 scans): 200 pts/scan, max 6/mo
  - Platinum (100 scans): 225 pts/scan, max 6/mo
  - Free users: 100 pts/scan, max 1 earning scan/mo
- **Stripe Flow:** createCheckoutSession -> Stripe Checkout -> `checkout.session.completed` webhook -> subscription active
- **Fraud Prevention:** receiptHashes table, image hash dedup, fraud flags on receipts, hourly fraud alert cron
- **Points Reconciliation:** Daily Stripe points reconciliation cron, atomic reservation system for redemptions

**Before Going Live:**
- [ ] Enable `invoice.created` event in Stripe Dashboard webhook settings
- [ ] Verify `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_MONTHLY`, `STRIPE_PRICE_ANNUAL` in Convex Dashboard
- [ ] End-to-end live testing (signup -> trial -> scan -> subscribe -> points)
- [ ] Test monthly renewal -> verify earning scan count resets
- [ ] Test cancel -> verify features drop to free tier
- [ ] Consider: Stripe<->Convex reconciliation cron (exists at `stripe.reconcilePointRedemptions`)

## Provider Order (Root Layout)

The root layout (`app/_layout.tsx`) has a specific provider order that MUST be maintained:

```
GestureHandlerRootView
  ClerkProvider
    ClerkLoaded
      SafeKeyboardProvider
        ConvexProviderWithClerk
          GlassAlertProvider
            InitialLayout (with UserSwitchContext)
```

**Never add providers outside ClerkProvider** that import native modules - the import failure will prevent Clerk from mounting, causing "useAuth outside ClerkProvider" errors.

**User switching:** `InitialLayout` tracks userId changes and temporarily blocks queries via `UserSwitchContext` to prevent cache leakage between accounts.

## Data Retention & Scaling

**Personal Data:**
- Pantry: 150 max active items (LIFO archiving), 90-day idle auto-archiving (non-pinned, out-of-stock)
- Deduplication: 85% Levenshtein + unit normalization (1L = 1000ml)
- Notifications: deleted after 30 days
- Health analyses: pruned after 30 days

**Global Catalog:**
- Price history: Raw entries >1yr aggregated into monthly buckets, then deleted (monthly cron)
- Current prices: Products unseen 12mo deleted (monthly cron)
- Receipt images: Deleted after 6mo, metadata kept (monthly cron on 15th)
- Item variants: Admin merge tool available
- Processed webhooks: Cleaned up after 90 days

**Key Cron Schedule:**
```
Daily 2:00am  - compute-daily-metrics
Daily 3:00am  - expire-trials, archive stale pantry, cohort retention
Daily 4:00am  - prune-old-notifications
Daily 10:00am - nurture-sequence (UK timing)
Hourly        - admin session cleanup, fraud alerts
Every 15min   - API latency, security anomalies
Every 30min   - receipt health, price anomalies
Weekly Sun    - archive-old-admin-logs
Weekly Mon    - weekly-admin-summary-report
Weekly Wed/Fri 6pm - stock-reminder push notifications
1st of month  - compress-old-price-history, prune-stale-products, monthly analytics, expire-old-points, cleanup webhooks
15th of month - cleanup-old-receipt-images
```

## Recent Changes (2025-2026)

- Full backend modularization (ai, shoppingLists, listItems, pantryItems, insights, admin, voice all split into subdirectories)
- Schema modularized into 11 domain files under `convex/schema/`
- Collapsed shopping modes into unified list experience
- Points-based reward system (replaced GBP scan credits)
- Seasonal events framework
- Receipt fraud prevention (image hashing, duplicate detection)
- Support ticket system
- A/B testing framework
- Automated workflow engine
- User segments and churn risk scoring
- Store-specific learned item mappings (crowdsourced)
- Content management system (help articles)
- Production hardening: security, payments, rate limiting

## BMAD Workflow

Artifacts in `_bmad-output/`. Sprint status in `_bmad-output/implementation-artifacts/sprint-status.yaml`.
