# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Quick Reference

**What is Oja?** Budget-first shopping app for UK shoppers - track pantry, create shopping lists with budgets, scan receipts, voice assistant.

**Tech Stack:** Expo SDK 54 + TypeScript + Expo Router + Convex (backend) + Clerk (auth) + Stripe (payments)

## Commands

```bash
# Development
npx expo start                    # Start dev server
npx expo start --ios              # iOS simulator
npx expo start --android          # Android emulator
npx convex dev                    # Start Convex backend (required for app to work)

# Building (requires dev build for native modules like voice)
npx expo run:ios                  # iOS dev build
npx expo run:android              # Android dev build

# Testing
npm test                          # Jest unit tests
npm run test:watch                # Watch mode
npm run e2e                       # Playwright E2E (requires Convex + Expo web at localhost:8081)
npm run e2e:ui                    # Playwright UI mode

# Code Quality
npm run lint                      # ESLint
npm run typecheck                 # TypeScript check
```

## Architecture

### Navigation (Expo Router - file-based)

```
app/
├── _layout.tsx          # Root: providers (Clerk, Convex)
├── (auth)/              # Sign in/up flows
├── onboarding/          # Welcome → Cuisine → Seeding → Review
└── (app)/               # Protected (requires auth)
    ├── (tabs)/          # Bottom tabs: Pantry, Lists, Scan, Profile
    ├── list/[id].tsx    # Shopping list detail (3000+ lines - needs refactoring)
    ├── insights.tsx     # Gamification/stats
    └── receipt/[id]/    # Receipt confirmation flow
```

### Backend (Convex)

All backend in `convex/`. Key files:
- `schema.ts` - Database schema (23 tables)
- `pantryItems.ts`, `shoppingLists.ts`, `listItems.ts` - Core CRUD
- `receipts.ts` - Receipt scanning + parsing
- `ai.ts` - Gemini + OpenAI fallback for parsing/estimates
- `lib/voiceTools.ts` - Voice assistant (25 Gemini function tools)
- `lib/featureGating.ts` - Plan limits (free vs premium)

**Pattern:** Every mutation must call `requireCurrentUser(ctx)` for auth.

### Price Intelligence (Zero-Blank Prices)

Every item shows a price. Three-layer cascade:
1. **Personal History** - User's own receipts
2. **Crowdsourced** - All users' receipt data by region
3. **AI Estimate** - Gemini with OpenAI fallback

Key files: `convex/itemVariants.ts`, `convex/currentPrices.ts`, `convex/priceHistory.ts`

### Glass UI Design System

Import from `@/components/ui/glass/`. Design tokens in `@/lib/design/glassTokens.ts`.

Colors:
- Background gradient: #0D1528 → #1B2845 → #101A2B
- Primary accent (CTAs only): #00D4AA (teal)
- Warm accent (celebrations): #FFB088
- Reserve teal for primary actions; secondary elements use white/gray/indigo

### Voice Assistant (Tobi)

Uses Gemini 2.0 Flash with function calling. 25 tools for full CRUD.
- STT: `expo-speech-recognition` (on-device, free)
- TTS cascade: Azure → Google Cloud → expo-speech
- Key files: `hooks/useVoiceAssistant.ts`, `convex/lib/voiceTools.ts`

Requires dev build (native modules).

## Critical Rules

1. **Read `project-context.md` first** - If it exists, always read before implementation
2. **Use indexes** - Never scan full Convex tables
3. **Optimistic updates** - For instant UX feedback
4. **Haptic feedback** - On all user interactions via `@/lib/haptics/safeHaptics.ts`
5. **Handle all states** - Loading, error, empty, success
6. **Zero-Blank Prices** - Every item must show a price estimate
7. **Validated icons only** - Use `@/lib/icons/iconMatcher.ts` for MaterialCommunityIcons

## Known Issues

### E2E Tests (Playwright + React Native Web)

- `AnimatedPressable` clicks don't trigger `onPress` - use `page.evaluate()` JS click
- `networkidle` never fires (Convex WebSocket) - use custom `waitForConvex()` helper
- `/scan` tab requires camera - skip in headless tests

### God Components Needing Refactoring

- `app/(app)/list/[id].tsx` (3000+ lines)
- `app/(app)/(tabs)/index.tsx` (1800+ lines)

## Environment Variables

**Client (.env):**
```
EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_...
EXPO_PUBLIC_CONVEX_URL=https://...
```

**Server (Convex Dashboard):**
```
GEMINI_API_KEY=...
OPENAI_API_KEY=sk_...
STRIPE_SECRET_KEY=sk_...
CLERK_SECRET_KEY=sk_...
```

## BMAD Workflow (if using)

Artifacts in `_bmad-output/`. Sprint status in `_bmad-output/implementation-artifacts/sprint-status.yaml`.
