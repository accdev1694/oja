# Oja v2 Build Progress

> **Last Updated:** 2026-01-27
> **Stack:** Expo + Clerk + Convex + Jina AI + Gemini

---

## Quick Status

| Phase | Status | Progress |
|-------|--------|----------|
| 0. Project Setup | ✅ Complete | 4/4 |
| 0.5. Epic & Story Design | ✅ Complete | 2/3 |
| 1. Foundation & Authentication (Epic 1) | ⏳ Pending | 0/? |
| 2. Pantry Stock Tracker (Epic 2) | ⏳ Pending | 0/? |
| 3. Shopping Lists with Budget Control (Epic 3) | ⏳ Pending | 0/? |
| 4. Partner Mode & Collaboration (Epic 4) | ⏳ Pending | 0/? |
| 5. Receipt Intelligence & Price History (Epic 5) | ⏳ Pending | 0/? |
| 6. Insights, Gamification & Progress (Epic 6) | ⏳ Pending | 0/? |
| 7. Subscription, Payments & Loyalty (Epic 7) | ⏳ Pending | 0/? |
| 8. Admin Dashboard & Operations (Epic 8) | ⏳ Pending | 0/? |

---

## Phase 0: Project Setup

### Tasks

- [x] **0.1** Initialize Expo project (SDK 54, TypeScript)
- [x] **0.2** Set up Convex backend + schema (deployed to dev:curious-sockeye-134)
- [x] **0.3** Configure Clerk authentication (JWT issuer configured)
- [x] **0.4** Verify full stack integration (auth → db round-trip)

### What's Done

**Expo Project:**
- `package.json` - All dependencies configured (Expo 54, Clerk, Convex, Reanimated, etc.)
- `app.json` - Expo config with iOS/Android settings
- `tsconfig.json` - TypeScript strict mode with path aliases
- `babel.config.js` - Reanimated plugin configured

**App Structure (Expo Router):**
- `app/_layout.tsx` - Root layout with ClerkProvider + ConvexProviderWithClerk
- `app/index.tsx` - Entry redirect based on auth state
- `app/(auth)/_layout.tsx` - Auth layout
- `app/(auth)/sign-in.tsx` - Sign in screen with email/password
- `app/(auth)/sign-up.tsx` - Sign up with email verification
- `app/(app)/_layout.tsx` - Protected app layout
- `app/(app)/(tabs)/_layout.tsx` - Tab navigator (Pantry, Lists, Scan, Profile)
- `app/(app)/(tabs)/index.tsx` - Pantry placeholder
- `app/(app)/(tabs)/lists.tsx` - Lists placeholder
- `app/(app)/(tabs)/scan.tsx` - Scan placeholder
- `app/(app)/(tabs)/profile.tsx` - Profile with sign out
- `app/onboarding/_layout.tsx` - Onboarding layout
- `app/onboarding/welcome.tsx` - Welcome screen

**Convex Backend:**
- `convex/schema.ts` - Full database schema (users, pantryItems, shoppingLists, listItems, receipts)
- `convex/auth.config.ts` - Clerk JWT configuration
- `convex/users.ts` - User queries/mutations (getOrCreate, getCurrent, update, completeOnboarding)

**Environment:**
- `.env.local` - Template with placeholder keys

### Next Steps (Manual)

1. **Create Clerk Account & Project:**
   - Go to https://dashboard.clerk.com
   - Create new application
   - Copy `Publishable Key` to `.env.local` as `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY`

2. **Create Convex Project:**
   - Run `npx convex dev` in terminal
   - Follow prompts to create/link project
   - Copy the URL to `.env.local` as `EXPO_PUBLIC_CONVEX_URL`

3. **Configure Clerk JWT Template in Convex:**
   - In Clerk Dashboard: JWT Templates → Create "convex" template
   - Copy Issuer URL
   - In Convex Dashboard: Settings → Environment Variables
   - Add `CLERK_JWT_ISSUER_DOMAIN` with the issuer URL

4. **Test Integration:**
   - Run `npm start` to start Expo
   - Open on simulator/device
   - Test sign up → verify → see Pantry screen

---

## Phase 0.5: Epic & Story Design

### Tasks

- [x] **0.5.1** Validate prerequisites (PRD, Architecture, UX Design)
- [x] **0.5.2** Design epic structure (8 user-value-focused epics)
- [ ] **0.5.3** Create user stories for all epics

### What's Done

**Requirements Extraction:**
- Validated 7 input documents (PRD, Architecture v2, UX Design, Coding Conventions, Security Guidelines, Guidelines.md, Epic template)
- Extracted and organized 321 total requirements:
  - 205 Functional Requirements (FR1-FR205)
  - 54 Non-Functional Requirements (NFR1-NFR54)
  - 62 Additional Requirements (GD1-GD8, DT1-DT10, etc.)

**Epic Structure (8 Epics):**
1. **Epic 1: Foundation & Authentication** (20 FRs)
   - Expo project setup, Clerk auth, Convex backend, adaptive UI system

2. **Epic 2: Pantry Stock Tracker** (20 FRs)
   - Pantry grid, stock levels, categories, auto-add to shopping list

3. **Epic 3: Shopping Lists with Budget Control** (25 FRs)
   - Create lists, budget control, running total, safe zone, impulse fund

4. **Epic 4: Partner Mode & Collaboration** (15 FRs)
   - Multi-user lists, approval workflow, contest flow, real-time sync

5. **Epic 5: Receipt Intelligence & Price History** (18 FRs)
   - Receipt scanning, Gemini parsing, price tracking, reconciliation

6. **Epic 6: Insights, Gamification & Progress** (7 FRs)
   - Weekly digest, budget streaks, savings jar, challenges

7. **Epic 7: Subscription, Payments & Loyalty** (12 FRs)
   - Stripe integration, £2.99/mo subscription, loyalty points system

8. **Epic 8: Admin Dashboard & Operations** (95 FRs)
   - Admin panel, user management, analytics, content moderation

**Key Decisions:**
- Pricing: £2.99/mo, £21.99/yr (38% savings)
- Loyalty system: Receipt scans earn points → up to 50% off subscription
- Partner Mode: 3 roles (viewer, approver, editor) with approval/contest workflow
- MCP servers configured: Clerk, Convex, Stripe, GitHub, Context7, Neon, Playwright
- Documentation-first implementation: ALWAYS use Context7 + Expo Skills before coding

### Next Steps

1. **Create User Stories (Step 3):**
   - Break down each epic into detailed user stories
   - Define acceptance criteria for each story
   - Estimate story points
   - Create story files in `_bmad-output/implementation-artifacts/stories/`

---

## Phase 1: Foundation & Authentication (Epic 1)

### Stories (TBD - need to create for v2)

| ID | Story | Status | Notes |
|----|-------|--------|-------|
| 1-1 | Project structure & navigation | ⏳ | Expo Router setup |
| 1-2 | Design system (Platform-adaptive UI) | ⏳ | Liquid Glass / Material ui |
| 1-3 | Convex schema & base functions | ⏳ | All tables from architecture |
| 1-4 | Global state & error handling | ⏳ | |
| 1-5 | Haptics system | ⏳ | Comprehensive haptics |
| 1-6 | Add react-native-reanimated + worklets | ⏳ | **IMPORTANT: Temporarily removed in Phase 0 to fix bundle error. Must add back with proper configuration for animations.** |

---

## Phase 2: Auth & Onboarding (Epic 2)

### Stories (TBD)

| ID | Story | Status | Notes |
|----|-------|--------|-------|
| 2-1 | Clerk sign-up/sign-in | ⏳ | Social providers |
| 2-2 | User profile creation | ⏳ | Convex user sync |
| 2-3 | Continent selection | ⏳ | 6 regions |
| 2-4 | LLM seed items generation | ⏳ | 200 items via Gemini |
| 2-5 | Seed item review & save | ⏳ | Cascade animation |
| 2-6 | Default budget setup | ⏳ | |
| 2-7 | Daily reminder setup | ⏳ | Notification permissions |
| 2-8 | Onboarding complete | ⏳ | Confetti! |

---

## Phase 3: Pantry Tracker (Epic 3)

### Stories (TBD)

| ID | Story | Status | Notes |
|----|-------|--------|-------|
| 3-1 | Pantry grid view | ⏳ | Categories, search |
| 3-2 | Stock level picker | ⏳ | 4 states + haptics |
| 3-3 | Quick swipe to decrease | ⏳ | |
| 3-4 | Auto-add "Out" to list | ⏳ | Fly animation |
| 3-5 | Add new pantry item | ⏳ | |
| 3-6 | Edit/delete pantry item | ⏳ | |
| 3-7 | Stock check streak | ⏳ | Gamification |

---

## Phase 4: Shopping Lists (Epic 4)

### Stories (TBD)

| ID | Story | Status | Notes |
|----|-------|--------|-------|
| 4-1 | Create new list | ⏳ | |
| 4-2 | View all lists | ⏳ | |
| 4-3 | Add items to list | ⏳ | |
| 4-4 | Search & add from pantry | ⏳ | |
| 4-5 | Remove items | ⏳ | |
| 4-6 | Check off items | ⏳ | |
| 4-7 | Edit item prices | ⏳ | |
| 4-8 | Set item priority | ⏳ | Swipe gestures |
| 4-9 | Running total | ⏳ | |
| 4-10 | Set budget | ⏳ | |
| 4-11 | Safe zone indicator | ⏳ | Color glow |
| 4-12 | Budget lock mode | ⏳ | |
| 4-13 | Impulse fund | ⏳ | |
| 4-14 | Mid-shop add flow | ⏳ | 3 options |
| 4-15 | Smart suggestions | ⏳ | Jina AI |
| 4-16 | Partner invite | ⏳ | |
| 4-17 | Contest item | ⏳ | |
| 4-18 | Item comments | ⏳ | |
| 4-19 | Archive list | ⏳ | |

---

## Phase 5: Receipt Intelligence (Epic 5)

### Stories (TBD)

| ID | Story | Status | Notes |
|----|-------|--------|-------|
| 5-1 | Camera capture | ⏳ | |
| 5-2 | Receipt parsing (Gemini) | ⏳ | |
| 5-3 | Item confirmation UI | ⏳ | |
| 5-4 | Price history save | ⏳ | |
| 5-5 | Reconciliation view | ⏳ | Planned vs actual |
| 5-6 | Auto-restock pantry | ⏳ | |

---

## Phase 6: Insights & Gamification (Epic 6)

### Stories (TBD)

| ID | Story | Status | Notes |
|----|-------|--------|-------|
| 6-1 | Weekly digest | ⏳ | |
| 6-2 | Monthly trends | ⏳ | |
| 6-3 | Budget streak | ⏳ | Fire emoji |
| 6-4 | Savings jar | ⏳ | Animated |
| 6-5 | Weekly challenge | ⏳ | |
| 6-6 | Personal best | ⏳ | |
| 6-7 | Surprise delight | ⏳ | Random rewards |

---

## Phase 7: Premium & Launch (Epic 7)

### Stories (TBD)

| ID | Story | Status | Notes |
|----|-------|--------|-------|
| 7-1 | Stripe integration | ⏳ | |
| 7-2 | Premium features | ⏳ | |
| 7-3 | App store prep | ⏳ | |
| 7-4 | Launch checklist | ⏳ | |

---

## Changelog

| Date | Change |
|------|--------|
| 2026-01-27 | **Phase 0.5 Epic Design COMPLETE** - 8 epics designed with 205 FRs mapped |
| 2026-01-27 | Added Partner Mode requirements (FR191-FR205) - multi-user lists with approval/contest workflow |
| 2026-01-27 | Added Development Tooling requirements (DT1-DT10) - MCP servers + Expo Skills |
| 2026-01-27 | Updated pricing: £2.99/mo, £21.99/yr (38% savings, minimum £1.49/mo with loyalty) |
| 2026-01-27 | Epic structure finalized: 8 user-value-focused epics covering all 205 FRs |
| 2026-01-26 | **⚠️ TODO Phase 1:** Re-add react-native-reanimated + worklets (temporarily removed to fix bundle error) |
| 2026-01-26 | **Phase 0 COMPLETE** - All services initialized and tested |
| 2026-01-26 | Convex project created: `dev:curious-sockeye-134` at https://curious-sockeye-134.convex.cloud |
| 2026-01-26 | Clerk authentication configured with JWT issuer: https://tolerant-python-28.clerk.accounts.dev |
| 2026-01-26 | Integration test passed - Clerk + Convex + Schema verified |
| 2026-01-26 | Fixed expo-haptics plugin configuration issue in app.json |
| 2026-01-26 | Environment variables configured in .env.local |
| 2026-01-26 | MCP servers configured (Clerk, Convex, Stripe, GitHub) |
| 2026-01-26 | v1 artifacts archived to `_bmad-output/v1-archive/` (38 stories + planning docs) |
| 2026-01-26 | Phase 0 tasks 0.1-0.3 completed (code ready, needs service setup) |
| 2026-01-26 | Created app/ folder with Expo Router structure |
| 2026-01-26 | Created Convex schema and user functions |
| 2026-01-26 | Created v2 build progress tracker |
| 2026-01-26 | v1 code deleted, architecture docs updated |
| 2026-01-26 | Added gamification features (11 total) |

---

*Updated by: Amelia (Dev Agent)*
