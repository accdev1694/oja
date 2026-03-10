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
npm test                          # Jest unit tests (42 test files)
npm run test:watch                # Watch mode
npm run e2e                       # Playwright E2E (16 specs)
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
- `onboarding/` - welcome → cuisine → store → pantry-seeding → review
- `(app)/` - Protected routes (signed in + onboarding complete)

**Key Routes:**
- `list/[id].tsx` - Shopping list detail (1,279 lines)
- `receipt/[id]/confirm.tsx` + `reconciliation.tsx` - Receipt processing
- `admin.tsx` + `admin/*` - 9-tab modular admin dashboard
- `insights.tsx` - Gamification/analytics (1,620 lines)
- `subscription.tsx` - Stripe payment flow
- `ai-usage.tsx` - Voice/scan usage tracking

**Tab Bar Behavior:**
- Custom `PersistentTabBar` (not Expo Router's native Tabs)
- Hidden on focused flows: receipt processing, trip summary, onboarding
- Stock tab shows badge: count of low + out-of-stock items

### Backend (Convex)

**47 tables** organized by feature area:
- **Core:** users, pantryItems, shoppingLists, listItems, receipts
- **Pricing:** currentPrices, priceHistory, priceHistoryMonthly, itemVariants
- **Collaboration:** listPartners, inviteCodes, listMessages, itemComments
- **Gamification:** achievements, streaks, weeklyChallenges, pointsBalance, pointsTransactions
- **Subscriptions:** subscriptions, scanCredits, scanCreditTransactions, aiUsage
- **Admin:** adminRoles, adminLogs, adminSessions, adminAlerts, slaMetrics
- **Analytics:** platformMetrics, cohortMetrics, funnelEvents, churnMetrics, ltvMetrics
- **Marketing:** nurtureMessages, referralCodes, notifications, announcements

**Key Files:**
| File | Lines | Purpose |
|------|-------|---------|
| `admin.ts` | 3,157 | 9-tab admin API with RBAC, MFA, SIEM |
| `ai.ts` | 2,241 | Gemini 2.0 Flash + OpenAI fallback |
| `shoppingLists.ts` | 2,319 | List CRUD, health analysis, multi-store |
| `listItems.ts` | 1,924 | Item CRUD, price resolution, variant matching |
| `pantryItems.ts` | 1,616 | Pantry CRUD, auto-archiving (90d idle) |
| `insights.ts` | 1,117 | Gamification engine |
| `lib/voiceTools.ts` | 2,099 | 30 voice assistant function tools |
| `lib/featureGating.ts` | 227 | Single source of truth for features/tiers |

**Auth Pattern:** Every mutation calls `requireCurrentUser(ctx)`. Admin functions call `requireAdmin(ctx)`.

**Cron Jobs:** 20+ scheduled tasks for data retention, analytics, nurture, monitoring (see `crons.ts`)

### Price Intelligence (Zero-Blank Prices)

**Every item shows a price.** Three-layer cascade:
1. **Personal History** - User's own receipts (Highest trust: **< 3 days old**)
2. **Crowdsourced** - Community data (Overrides personal if personal is **> 3 days old** and community data is fresher)
3. **AI Estimate** - Gemini with OpenAI fallback (Baseline)

**Key files:** `lib/priceResolver.ts`, `currentPrices.ts`, `itemVariants.ts`, `priceHistory.ts`

### Glass UI Design System

**27 Glass components** in `@/components/ui/glass/`:
- **Core:** GlassCard, GlassButton, GlassInput, GlassSearchInput
- **Navigation:** GlassSegmentedControl, GlassTabBar, GlassHeader
- **Visualization:** CircularBudgetDial, GlassProgressBar
- **State:** GlassSkeleton (9 variants), GlassErrorState, Empty states
- **Animations:** AnimatedPressable, AnimatedListItem, AnimatedSection, ShimmerEffect

**Design Tokens** (`lib/design/glassTokens.ts`):
- Background: #0D1528 → #1B2845 → #101A2B (gradient)
- Primary accent: #00D4AA (teal) - **CTAs only**
- Warm accent: #FFB088 (celebrations)
- Typography: 5 scales (Display, Headlines, Body, Labels, Numbers)
- Spacing: 4px base unit (xs: 4 → 6xl: 64)
- Device tiers: Premium (iOS blur), Enhanced (Material), Baseline (solid)

**UI/UX Patterns:**
- **Page Load Animation:** `pageAnimationKey` (on focus) + `animationKey` (on tab/filter switches) with `AnimatedSection` staggered delays
- **Haptics:** Always provide feedback (`Light` for taps, `Medium` for success/deletions)
- **Consistency:** 16px horizontal margins (`spacing.lg`) for all main containers
- **Loading States:** Early returns with `SkeletonCard` while data is `undefined`

### Voice Assistant (Tobi)

**30 function tools** for full CRUD via Gemini 2.0 Flash:
- STT: `expo-speech-recognition` (on-device)
- TTS cascade: Google Cloud Neural2 → expo-speech
- Hook: `hooks/useVoiceAssistant.ts`
- Tools: `convex/lib/voiceTools.ts`

Requires dev build (native modules).

### Key Hooks & Utilities

| Hook/Utility | Purpose |
|--------------|---------|
| `useVoiceAssistant` | Voice assistant lifecycle |
| `useVariantPrefetch` | Size/Price modal cache warming (debounced, TTL-based) |
| `usePartnerRole` | List permissions (viewer/editor/approver) |
| `useDelightToast` | Gamification celebrations |
| `useCurrentUser` | Clerk user context + admin/impersonation |
| `lib/haptics/safeHaptics` | Safe haptic feedback (device detection) |
| `lib/sizes/sizeNormalizer` | UK size parsing (pints, ml, kg) |
| `lib/icons/iconMatcher` | 106 validated MaterialCommunityIcons |
| `lib/keyboard/safeKeyboardController` | Safe keyboard wrapper (dev build fallback) |
| `lib/text/fuzzyMatch` | Levenshtein similarity for deduplication |
| **`lib/itemNameParser`** | **Item name/size parser (MANDATORY for all item creation)** |

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
   - Shows size at BEGINNING: "500ml Milk" ✅
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
  - Frontend: PersonalizedSuggestions, HealthAnalysisModal, AddItemsModal ✅
  - Backend queries: personalization.ts (getBuyItAgainSuggestions) ✅
  - AI responses: ai.ts (analyzeListHealth swaps and bonuses) ✅
  - Voice assistant: voiceTools.ts ✅
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

**Never call `Dimensions.get()` inside a worklet** — capture on JS thread and close over it.

**Windows build:** `android/app/build.gradle` has `buildStagingDirectory = file("C:/b")` to avoid 260-char path limit.

## Admin Dashboard (Production Ready)

**Access:** `app/(app)/admin.tsx` - Feature-gated via `isAdmin` and `role` (super_admin, admin, moderator)

**9 Tabs:**
1. **OVERVIEW** - Platform KPIs, hero metrics, activity timeline
2. **USERS** - Lifecycle management, trial/premium granting, impersonation
3. **ANALYTICS** - Cohort retention, MRR/ARR/churn, LTV predictions
4. **RECEIPTS** - Moderation queue, anomaly detection, price overrides
5. **CATALOG** - Store variant merging, price history auditing
6. **MONITORING** - Real-time health, SLA tracking, alerts
7. **WEBHOOKS** - Stripe, Clerk, internal event management
8. **SUPPORT** - Integrated ticketing system
9. **SETTINGS** - Feature flags, announcements, admin management

**Features:**
- RBAC with granular permissions
- Global search (Cmd+K command palette)
- Keyboard navigation (1-9 tab switching)
- Multi-layer caching, precomputed metrics
- MFA integration (14-day grace period)
- Immutable audit logging (SIEM)

## Critical Rules

1. **Read `project-context.md` first** - If it exists, always read before implementation
2. **Use indexes** - Never scan full Convex tables (every query has `.withIndex()`)
3. **Optimistic updates** - For instant UX feedback
4. **Haptic feedback** - On all interactions via `safeHaptics.ts`
5. **Handle all states** - Loading, error, empty, success
6. **Zero-Blank Prices** - Every item must show a price (3-layer cascade)
7. **Validated icons only** - Use `iconMatcher.ts` for MaterialCommunityIcons
8. **NEVER kill node.exe** - Kills Claude Code itself. Use `npx kill-port <port>` instead
9. **NEVER use types** - Never use TypeScript type annotations (`: any`, `: string`, interfaces, type casts) when writing code
10. **Parallel sub-agents** - Deploy multiple sub-agents in parallel where possible
11. **Never fix without approval** - Present analysis and proposed solution first
12. **Size/Weight formatting (MANDATORY UTILITY USAGE):**
    ```typescript
    // ❌ WRONG - Never create items without utility
    await createItem({ name: "500ml Milk", size: "per item" })
    await createItem({ name: "Milk", size: "500ml" }) // NO UNIT - UNACCEPTABLE!

    // ✅ CORRECT - Always use cleanItemForStorage
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
    - See **"Item Name Parser (MANDATORY)"** section below for full documentation
    - Import: `@/convex/lib/itemNameParser` (works in frontend & backend)
    - Reference: `PersonalizedSuggestions.tsx`, `HealthAnalysisModal.tsx`, `voiceTools.ts`
13. **Convex cross-function calls:**
    - Import `api` from `./_generated/api`: `import { api } from "./_generated/api";`
    - Use `ctx.runQuery(api.module.functionName, args)` or `ctx.runMutation(api.module.functionName, args)`
    - Example: `await ctx.runQuery(api.admin.getAnalytics, {})` ✅ not `await ctx.runQuery(query.getAnalytics, {})` ❌
14. **Post-Refactor Validation (CRITICAL):**
    - **ALWAYS run `npx expo start`** after completing any refactor to verify no syntax errors
    - **Check JSX tag matching** - Every `<View>` must close with `</View>`, not `</Animated.View>` or vice versa
    - **Run `npm run typecheck`** to catch TypeScript errors
    - **Test the affected feature** manually in the app
    - **DO NOT mark refactor complete** until the app loads successfully without errors
    - Common mistake after major refactors: JSX tag mismatches (e.g., opening `<View>` but closing with `</Animated.View>`)
    - This validation step is MANDATORY - skipping it leads to runtime errors that break development

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

**Unit Tests (42 files in `__tests__/`):**
- Admin, insights, partners, subscriptions, sizes, components
- Jest with ts-jest, mocked Convex/Clerk/Expo
- Test factories for realistic data

**E2E Tests (16 specs in `e2e/tests/`):**
- Playwright with Expo Web (http://localhost:8081)
- Full user journeys: auth → onboarding → pantry → lists → receipts → insights
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

## Subscription System (Pinned)

**Status:** Core bugs fixed (Feb 2025). Needs Stripe Dashboard config + end-to-end live testing before production.

**Architecture:**
- **Trial:** 7 days, auto-started in `convex/users.ts:completeOnboarding()`. Sets `plan: "premium_monthly"`, `status: "trial"`
- **Feature Gating:** Single source in `convex/lib/featureGating.ts`
  - Free: 3 lists, 50 pantry, 3 scans/mo, 20 voice/mo, partnerMode: false
  - Premium: unlimited (voice capped at 200/mo)
- **Tier System:** Bronze→Silver(20)→Gold(50)→Platinum(100) based on lifetime scans
- **Scan Credits:** Premium users earn £0.25-0.30/scan, capped per tier, applied as negative invoice item via `invoice.created` webhook
- **Stripe Flow:** createCheckoutSession → Stripe Checkout → `checkout.session.completed` webhook → subscription active + scanCredits record created

**Before Going Live:**
- [ ] Enable `invoice.created` event in Stripe Dashboard webhook settings
- [ ] Verify `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_MONTHLY`, `STRIPE_PRICE_ANNUAL` in Convex Dashboard
- [ ] End-to-end live testing (signup → trial → scan → subscribe → credit discount)
- [ ] Test monthly renewal → verify credits reset and apply
- [ ] Test cancel → verify features drop to free tier
- [ ] Consider: Stripe↔Convex reconciliation cron (no sync exists if webhooks are missed)

## Data Retention & Scaling

**Personal Data:**
- Pantry: 150 max active items (LIFO archiving), 90-day idle auto-archiving (non-pinned, out-of-stock)
- Deduplication: 85% Levenshtein + unit normalization (1L = 1000ml)
- Notifications: deleted after 30 days

**Global Catalog:**
- Price history: Raw entries >1yr aggregated into monthly buckets, then deleted (monthly cron)
- Current prices: Products unseen 12mo deleted (monthly cron)
- Receipt images: Deleted after 6mo, metadata kept (monthly cron on 15th)
- Item variants: Admin merge tool available

**Cron Schedule:**
```
1st of month, 1:30am UTC - compress-old-price-history
1st of month, 2:00am UTC - prune-stale-products
15th of month, 3:00am UTC - cleanup-old-receipt-images
```

## Recent Features (2025)

- ✅ AI health analysis with dietary preferences + swaps
- ✅ Dietary restrictions + health concerns in user profile
- ✅ Data retention crons (price compression, image cleanup, stale pruning)
- ✅ Push notification settings with quiet hours
- ✅ AI usage monitoring dashboard (voice/scan caps)
- ✅ Personalization settings for health analysis
- ✅ **Centralized item name/size parser** (`lib/itemNameParser.ts`) - Mandatory for all item creation routes
- ✅ **Latest Price Enforcement:** New lists from templates/old lists MUST resolve fresh prices via `resolveVariantWithPrice()` (never copy stale data)
- ✅ **3-Day Recency-Aware Pricing:** Community prices automatically override stale personal history (> 3 days) for maximum accuracy.

## BMAD Workflow

Artifacts in `_bmad-output/`. Sprint status in `_bmad-output/implementation-artifacts/sprint-status.yaml`.
