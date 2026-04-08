# CLAUDE.md

## Quick Reference

**Oja** — Budget-first shopping app for UK shoppers. Pantry tracking, shopping lists with budgets, receipt scanning, voice assistant (Tobi), gamification.

**Stack:** Expo SDK 54 · React 19.1 · React Native 0.81 · Convex 1.32 · Clerk (auth) · Stripe (payments) · TypeScript 5.9

```bash
# Dev
npx expo start          # Metro dev server
npx convex dev          # Convex backend (required)

# Quality
npm test                # Jest (45 test files, 1170 tests)
npm run lint            # ESLint (flat config)
npm run typecheck       # TypeScript
npm run e2e             # Playwright (18 specs)
```

## Dev Build

Uses a **development client**, NOT Expo Go. Metro bundles JS; the APK contains native code.

- Native modules require APK rebuild: `npx expo run:android` or `eas build --profile development --platform android`
- Use `SafeKeyboardProvider`/`SafeKeyboardAwareScrollView` from `lib/keyboard/safeKeyboardController.tsx` (fallback if native module unlinked)
- **Windows:** `android/app/build.gradle` uses `buildStagingDirectory = file("C:/b")` to avoid 260-char path limit

## Architecture

### Navigation (Expo Router)

**4 Tabs:** Lists (`index.tsx`) · Stock (`stock.tsx`) · Scan (`scan.tsx`) · Profile (`profile.tsx`)

**Route Groups:** `(auth)/` (unauthenticated) · `onboarding/` (welcome→cuisine→store→pantry-seeding→review) · `(app)/` (protected)

**Key Routes:** `list/[id].tsx` · `receipt/[id]/confirm.tsx` + `reconciliation.tsx` · `admin.tsx` + `admin/*` · `insights.tsx` · `subscription.tsx` · `pantry-pick.tsx` · `trip-summary.tsx` · `create-list-from-receipt.tsx` · `scan.tsx` (receipt + product scanning)

**Tab Bar:** Custom `PersistentTabBar`, hidden during focused flows. Stock tab badges low/out-of-stock count.

### Backend (Convex)

**60+ tables** across 11 schema files in `convex/schema/`: core, pricing, collaboration, gamification, subscriptions, analytics, admin, receipts, content, experiments, utils

**Modular subdirectories:**
- `convex/ai/` — Gemini 2.0 Flash + OpenAI fallback (vision, health, pantry, pricing, voice, suggestions)
- `convex/shoppingLists/` — List CRUD, health analysis, multi-store, sharing, trips
- `convex/pantry/` — Pantry CRUD, lifecycle, auto-archiving, restock
- `convex/listItems/` — Item CRUD, price resolution, variant matching
- `convex/insights/` — Weekly digest, monthly trends, challenges, personal bests
- `convex/admin/` — RBAC, receipt management, user management, analytics
- `convex/lib/voice/` — Voice assistant declarations, tools, prompts, dispatcher

Root barrel files (`convex/ai.ts`, `convex/listItems.ts`, etc.) re-export from subdirectories for `api.*` compatibility. **New functions go in the subfile, NOT the barrel.**

**Key standalone files:** `users.ts` · `points.ts` · `partners.ts` · `subscriptions.ts` · `notifications.ts` · `lib/priceResolver.ts` · `lib/itemNameParser.ts` · `lib/featureGating.ts`

**Auth:** Every mutation calls `requireCurrentUser(ctx)`. Admin functions call `requireAdmin(ctx)`.

**34 cron jobs** in `crons.ts` — daily metrics/trial expiry/pantry archiving, hourly session cleanup/fraud alerts, 15-30min monitoring, weekly admin logs/stock reminders, monthly price compression/cleanup.

### Price Intelligence (Zero-Blank Prices)

Every item shows a price via 3-layer cascade:
1. **Personal History** — User's receipts (highest trust if < 3 days old)
2. **Crowdsourced** — Community data (overrides stale personal data)
3. **AI Estimate** — Gemini with OpenAI fallback

Files: `lib/priceResolver.ts`, `currentPrices.ts`, `itemVariants.ts`, `priceHistory.ts`

### Store Tracking (List Detail)

Header subtitle shows stores the user shopped at. **Confirmed stores** = items checked off there (permanent, pipe-separated). **Tentative store** = active store with no check-offs yet (preview, replaced on switch). Each `listItem` records `purchasedAtStoreId`/`purchasedAtStoreName` on check-off via `toggleChecked`. Budget dial shows active store; header shows history.

### Glass UI Design System

29 components in `components/ui/glass/`. Design tokens in `lib/design/glassTokens.ts`.

**Tokens:** Background gradient (#0D1528→#1B2845→#101A2B) · Primary accent #00D4AA (CTAs only) · Warm accent #FFB088 · 4px spacing base · 3 device tiers (Premium/Enhanced/Baseline)

**Patterns:** `AnimatedSection` stagger animations on focus · haptics on all interactions · 16px horizontal margins · `SkeletonCard` loading states

### Voice Assistant (Tobi)

Modularized in `convex/lib/voice/` (13 files). STT: `expo-speech-recognition`. TTS: Azure Neural → expo-speech fallback. AI: Gemini 2.5 Flash Lite. Hook: `hooks/useVoiceAssistant.ts`. Requires dev build.

**Context injection:** `getUserVoiceContext()` in `convex/ai/voice.ts` runs 4 parallel queries to populate the system prompt with real user data: low/out-of-stock pantry items, active lists with budgets, subscription tier, preferred stores. Budget for active list is auto-resolved server-side.

### Key Utilities

| Utility | Purpose |
|---------|---------|
| `convex/lib/itemNameParser` | **MANDATORY** item name/size parser — see below |
| `convex/lib/priceResolver` | 3-layer price cascade |
| `convex/lib/featureGating` | Feature limits per tier |
| `convex/lib/priceValidator` | Price confidence + emergency estimation |
| `lib/sizes/sizeNormalizer` | UK size parsing (pints, ml, kg) |
| `lib/icons/iconMatcher` | 106 validated MaterialCommunityIcons |
| `lib/keyboard/safeKeyboardController` | Keyboard wrapper with dev build fallback |
| `lib/text/fuzzyMatch` | Levenshtein similarity for dedup |
| `lib/haptics/safeHaptics` | Safe haptic feedback (device detection) |

## Item Name Parser (MANDATORY)

**Location:** `convex/lib/itemNameParser.ts` — MUST be used for ALL item creation/update.

**Functions:**
- **`cleanItemForStorage(name, size, unit)`** — Before saving. Rejects size without unit. Filters vague sizes. Auto-extracts unit from size string. Guarantee: size+unit together or both undefined.
- **`formatItemDisplay(name, size, unit)`** — For UI. Shows size at beginning: "500ml Milk".
- **`isValidSize(size, unit)`** — Validates size/unit pair against known UK units.

```typescript
// Frontend
import { cleanItemForStorage, formatItemDisplay } from "@/convex/lib/itemNameParser";
const cleaned = cleanItemForStorage("500ml Milk", "per item", "each");
// { name: "Milk", size: "500ml", unit: "ml" }

// Backend
import { cleanItemForStorage } from "./lib/itemNameParser";
```

**Size without unit is UNACCEPTABLE** — the utility rejects it completely.

## Provider Order (Root Layout)

```
GestureHandlerRootView > ClerkProvider > ClerkLoaded > SafeKeyboardProvider > ConvexProviderWithClerk > GlassAlertProvider > InitialLayout (UserSwitchContext)
```

Never add providers outside ClerkProvider that import native modules. `InitialLayout` blocks queries during user switches to prevent cache leakage.

## Subscription & Points

- **Trial:** 7 days, auto-started on onboarding. Feature gating in `convex/lib/featureGating.ts`
- **Free:** 2 lists, 30 pantry items, 10 voice/mo. **Premium:** unlimited (voice capped 200/mo)
- **Points:** Receipt scans earn points (Bronze 150→Platinum 225 pts/scan). Fraud prevention via receipt hashing.
- **Stripe:** createCheckoutSession → Checkout → webhook → active

## Admin Dashboard

10-tab admin at `app/(app)/admin.tsx` loading from `app/(app)/admin/`: Overview, Users, Analytics, Receipts, Catalog, Monitoring, Webhooks, Support, Points, Settings. RBAC with granular permissions. Shared components in `admin/components/`.

## Testing

**Jest (46 files, 1243 tests):** Admin, insights, partners, subscriptions, sizes, components, voice, lib utilities, schema validation. Critical test files: `itemNameParser` (55 tests), `voiceContext` (43 tests), `fuzzyMatch` (31 tests), `priceResolver` (12 tests), `listItems` (5 tests).

**Playwright E2E (18 specs):** Full user journeys via Expo Web. Serial execution with shared Clerk auth. Page Object Model.

**E2E quirks:** `AnimatedPressable` needs JS click via `clickPressable()` · Convex WebSocket prevents `networkidle` — use `waitForConvex()` · Receipt upload via hidden file input

**Claude Code testing skills** (`.claude/skills/`): `test-coverage` (gap analysis + test writing), `test` (run/fix unit tests), `e2e` (run/debug E2E), `test-feature` (validate feature area end-to-end)

## Environment Variables

**Client:** `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY`, `EXPO_PUBLIC_CONVEX_URL`
**Server (Convex Dashboard):** `GEMINI_API_KEY`, `OPENAI_API_KEY`, `STRIPE_SECRET_KEY`, `CLERK_SECRET_KEY`
**E2E:** `E2E_CLERK_USER_USERNAME`, `E2E_CLERK_USER_PASSWORD`

## Critical Rules

1. **Read `FEATURE-RULES.md` before modifying features** — behavior contracts; new code must not break them
2. **Use indexes** — every Convex query needs `.withIndex()`
3. **Optimistic updates** — for instant UX feedback
4. **Haptic feedback** — on all interactions via `safeHaptics.ts`
5. **Handle all states** — loading, error, empty, success
6. **Zero-Blank Prices** — every item shows a price (3-layer cascade)
7. **Validated icons only** — use `iconMatcher.ts` for MaterialCommunityIcons
8. **NEVER kill node.exe** — use `npx kill-port <port>` instead
9. **No `any` type — EVER** — `any` is banned by ESLint (`error`). Always use the actual expected type: `Id<"shoppingLists">`, `Doc<"tableName">`, `unknown`, concrete types. For component props, use inline object types `}: { prop: Type }`. For callbacks, type every parameter. Use `unknown` + type narrowing instead of `any` when the type is truly dynamic. Import `Id` and `Doc` from `@/convex/_generated/dataModel` for Convex types.
10. **Max 400 lines per file** — extract into separate files if approaching limit
11. **Parallel sub-agents** — deploy multiple in parallel where possible
12. **Never fix without approval** — present analysis and proposed solution first
13. **MANDATORY `cleanItemForStorage()`** — every item creation/update. Size without unit = rejected.
14. **Convex cross-function calls:** `import { api } from "./_generated/api"` then `ctx.runQuery(api.module.fn, args)`
15. **Post-refactor validation:** run `npx expo start` + `npm run typecheck` before marking complete. Check JSX tag matching.
16. **Modular backend:** new functions go in subdirectory files, not barrel files. New tables go in correct `convex/schema/*.ts` domain file.
17. **Read feature-specific notes before validation** — Before running `/validate-feature`, read the FULL checklist row for that feature in `FEATURE-VALIDATION-CHECKLIST.md`. If there's a REMINDER, custom instruction, or Plan Mode requirement in the Notes column, follow it BEFORE the standard validation workflow. Explicit instructions override default workflow patterns.
18. **MANDATORY audit after fixes** — After applying fixes (Phase 4 of validate-feature), ALWAYS spawn a fresh `codebase-bug-scrutinizer` agent to independently verify the fixes before committing. The audit agent must have fresh context (no `resume` parameter) and explicitly list all modified files. Fix any issues found by the audit before proceeding to commit. Never skip this step.

## Keyboard Pattern

Use `react-native-keyboard-controller` (NOT Reanimated's `useAnimatedKeyboard`). Reference: `list/[id].tsx`. Never call `Dimensions.get()` inside a worklet.

## Feature Development Workflow

1. Plan with BMAD agents (`/party-mode`) if needed
2. Create `FEATURE-NAME-IMPLEMENTATION.md` with numbered phases + checkboxes
3. Execute phases with parallel sub-agents, run tests after each
4. Delete implementation file when complete; update CLAUDE.md if new patterns added

## BMAD Workflow

Artifacts in `_bmad-output/`. Sprint status in `_bmad-output/implementation-artifacts/sprint-status.yaml`.
