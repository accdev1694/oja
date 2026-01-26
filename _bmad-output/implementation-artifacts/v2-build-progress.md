# Oja v2 Build Progress

> **Last Updated:** 2026-01-26
> **Stack:** Expo + Clerk + Convex + Jina AI + Gemini

---

## Quick Status

| Phase | Status | Progress |
|-------|--------|----------|
| 0. Project Setup | 🔄 In Progress | 3/4 |
| 1. Foundation (Epic 1) | ⏳ Pending | 0/? |
| 2. Auth & Onboarding (Epic 2) | ⏳ Pending | 0/? |
| 3. Pantry Tracker (Epic 3) | ⏳ Pending | 0/? |
| 4. Shopping Lists (Epic 4) | ⏳ Pending | 0/? |
| 5. Receipt Intelligence (Epic 5) | ⏳ Pending | 0/? |
| 6. Insights & Gamification (Epic 6) | ⏳ Pending | 0/? |
| 7. Premium & Launch (Epic 7) | ⏳ Pending | 0/? |

---

## Phase 0: Project Setup

### Tasks

- [x] **0.1** Initialize Expo project (SDK 54, TypeScript)
- [x] **0.2** Set up Convex backend + schema (files ready, needs `npx convex dev`)
- [x] **0.3** Configure Clerk authentication (files ready, needs keys in .env.local)
- [ ] **0.4** Verify full stack integration (auth → db round-trip)

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

## Phase 1: Foundation (Epic 1)

### Stories (TBD - need to create for v2)

| ID | Story | Status | Notes |
|----|-------|--------|-------|
| 1-1 | Project structure & navigation | ⏳ | Expo Router setup |
| 1-2 | Design system (Platform-adaptive UI) | ⏳ | Liquid Glass / Material You |
| 1-3 | Convex schema & base functions | ⏳ | All tables from architecture |
| 1-4 | Global state & error handling | ⏳ | |
| 1-5 | Haptics system | ⏳ | Comprehensive haptics |

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
