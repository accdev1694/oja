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

## BMAD Workflow

Artifacts in `_bmad-output/`. Sprint status in `_bmad-output/implementation-artifacts/sprint-status.yaml`.
