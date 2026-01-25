# Story 1.1: Initialize Next.js Project with Core Dependencies

Status: review

## Story

**As a** developer,
**I want** a properly initialized Next.js 16 project with all core dependencies,
**So that** I have a solid foundation for building the Oja PWA.

## Acceptance Criteria

1. **AC1**: Next.js 16 project created with TypeScript, Tailwind CSS, ESLint, App Router, and src directory structure
2. **AC2**: All core dependencies installed and verified in package.json
3. **AC3**: Project structure matches the Architecture document (src/, app/, lib/, components/, features/)
4. **AC4**: `npm run dev` starts the development server without errors on localhost:3000
5. **AC5**: `npm run build` completes successfully with no TypeScript or ESLint errors

## Tasks / Subtasks

- [x] **Task 1: Initialize Next.js Project** (AC: 1)
  - [x] 1.1 Run create-next-app with correct flags
  - [x] 1.2 Verify TypeScript, Tailwind, ESLint configured
  - [x] 1.3 Verify App Router and src directory structure
  - [x] 1.4 Verify import alias `@/*` is configured

- [x] **Task 2: Install Core Dependencies** (AC: 2)
  - [x] 2.1 Install Supabase packages (@supabase/supabase-js, @supabase/ssr)
  - [x] 2.2 Install state management (zustand, @tanstack/react-query)
  - [x] 2.3 Install UI packages (framer-motion, @phosphor-icons/react)
  - [x] 2.4 Install validation (zod)
  - [x] 2.5 Install offline storage (dexie)
  - [x] 2.6 Install payments (stripe, @stripe/stripe-js)
  - [x] 2.7 Install analytics (posthog-js)
  - [x] 2.8 Install OCR/AI (tesseract.js, @google/generative-ai)
  - [x] 2.9 Install PWA (serwist, @serwist/next as dev dependency)

- [x] **Task 3: Create Project Structure** (AC: 3)
  - [x] 3.1 Create `src/components/ui/` directory with index.ts
  - [x] 3.2 Create `src/features/` directory structure
  - [x] 3.3 Create `src/lib/` directory structure (supabase/, stores/, query/, db/, sync/, stripe/, analytics/, utils/)
  - [x] 3.4 Create `src/types/` directory with index.ts
  - [x] 3.5 Create `public/icons/` and `public/sounds/` directories
  - [x] 3.6 Create `supabase/migrations/` directory
  - [x] 3.7 Create `e2e/journeys/` directory

- [x] **Task 4: Create Environment Configuration** (AC: 3)
  - [x] 4.1 Create `.env.example` with all required environment variables
  - [x] 4.2 Create `.env.local` with placeholder values (gitignored)
  - [x] 4.3 Update `.gitignore` for environment files

- [x] **Task 5: Verify Development Server** (AC: 4)
  - [x] 5.1 Run `npm run dev` and verify server starts
  - [x] 5.2 Access localhost:3000 and verify page renders
  - [x] 5.3 Verify no console errors

- [x] **Task 6: Verify Production Build** (AC: 5)
  - [x] 6.1 Run `npm run build` and verify success
  - [x] 6.2 Verify no TypeScript errors
  - [x] 6.3 Verify no ESLint errors

## Dev Notes

### Critical Commands (EXACT - DO NOT MODIFY)

**Initialize Project:**
```bash
npx create-next-app@latest oja --typescript --tailwind --eslint --app --src-dir --turbopack --import-alias "@/*"
```

**Install Dependencies (run in order):**
```bash
# Core
npm install @supabase/supabase-js @supabase/ssr zustand @tanstack/react-query framer-motion zod

# Offline Storage
npm install dexie

# UI Icons (NOTE: package is @phosphor-icons/react, NOT phosphor-react)
npm install @phosphor-icons/react

# Payments & Analytics
npm install stripe @stripe/stripe-js posthog-js

# OCR & AI
npm install tesseract.js @google/generative-ai

# PWA (Serwist)
npm install @serwist/next
npm install -D serwist
```

### Architecture Compliance

| Requirement | Implementation |
|-------------|----------------|
| Framework | Next.js 16.x with App Router |
| Language | TypeScript (strict mode) |
| React | React 19.x |
| Styling | Tailwind CSS 4.x |
| Build (dev) | Turbopack |
| Import Alias | `@/*` mapping to `src/*` |
| Directory | `src/` structure |

### Project Structure (create these directories)

```
src/
├── app/                    # Next.js App Router (created by create-next-app)
├── components/
│   └── ui/
│       └── index.ts        # Barrel export
├── features/
│   ├── stock/
│   ├── lists/
│   ├── budget/
│   ├── receipts/
│   ├── prices/
│   ├── insights/
│   ├── subscription/
│   ├── location/
│   ├── onboarding/
│   ├── feedback/
│   └── auth/
├── lib/
│   ├── supabase/
│   ├── stores/
│   ├── query/
│   ├── db/
│   ├── sync/
│   ├── stripe/
│   ├── analytics/
│   └── utils/
└── types/
    └── index.ts

public/
├── icons/
└── sounds/

supabase/
└── migrations/

e2e/
└── journeys/
```

### Environment Variables (.env.example)

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key

# Google Places (optional for Story 1.1)
NEXT_PUBLIC_GOOGLE_PLACES_API_KEY=

# AI - Gemini
GEMINI_API_KEY=

# Stripe
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=

# Analytics - PostHog
NEXT_PUBLIC_POSTHOG_API_KEY=
NEXT_PUBLIC_POSTHOG_HOST=https://app.posthog.com

# Error Tracking - Sentry
NEXT_PUBLIC_SENTRY_DSN=
```

### Testing Requirements

For this story, testing is limited to:
1. `npm run dev` starts without errors
2. `npm run build` completes successfully
3. Page renders at localhost:3000

No unit tests required for this infrastructure story.

### Common Pitfalls to Avoid

1. **Wrong Icon Package**: Use `@phosphor-icons/react` NOT `phosphor-react` (deprecated)
2. **Serwist Installation**: Install `@serwist/next` as regular dep, `serwist` as dev dep
3. **TanStack Query v5**: Uses new API - do NOT use v4 patterns
4. **Turbopack Limitations**: Some features may require `--webpack` flag for production builds
5. **TypeScript Strict**: Enabled by default in Next.js 16 - no `any` types allowed

### References

- [Source: architecture.md#Starter-Template-Evaluation]
- [Source: architecture.md#Complete-Project-Directory-Structure]
- [Source: architecture.md#Architectural-Decisions-from-Starter]
- [Source: epics.md#Story-1.1]

---

## Dev Agent Record

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5-20251101)

### Debug Log References

- Next.js initialized via create-next-app in temp directory, then merged with existing BMAD structure
- All 15 core dependencies installed successfully with npm
- Dev server verified: Next.js 16.1.4 with Turbopack, ready in 2.2s
- Production build completed successfully with static page generation

### Completion Notes List

- **Task 1**: Next.js 16.1.4 initialized with TypeScript strict mode, Tailwind CSS 4.x, ESLint 9.x, App Router, src/ directory, import alias @/*
- **Task 2**: All dependencies installed - @supabase/supabase-js@2.91.1, zustand@5.0.10, @tanstack/react-query@5.90.20, framer-motion@12.29.0, zod@4.3.6, dexie@4.2.1, @phosphor-icons/react@2.1.10, stripe@20.2.0, @stripe/stripe-js@8.6.4, posthog-js@1.335.2, tesseract.js@7.0.0, @google/generative-ai@0.24.1, @serwist/next@9.5.0
- **Task 3**: All directories created per Architecture document - 11 feature modules, 8 lib modules, ui components, types, public assets, supabase migrations, e2e tests
- **Task 4**: Environment configuration created with all required variables for Supabase, Stripe, Gemini, PostHog, Sentry
- **Task 5**: Dev server starts successfully on localhost:3000, Turbopack enabled, 2.2s startup
- **Task 6**: Production build passes - TypeScript compilation success, ESLint success, static pages generated

### File List

**Created:**
- `src/app/layout.tsx`
- `src/app/page.tsx`
- `src/app/globals.css`
- `src/app/favicon.ico`
- `src/components/ui/index.ts`
- `src/types/index.ts`
- `src/features/` (11 feature directories)
- `src/lib/` (8 lib directories)
- `public/icons/`
- `public/sounds/`
- `supabase/migrations/`
- `e2e/journeys/`
- `.env.example`
- `.env.local`
- `next.config.ts`
- `tsconfig.json`
- `postcss.config.mjs`
- `eslint.config.mjs`

**Modified:**
- `package.json` - Added all dependencies and Next.js scripts
- `.gitignore` - Added Next.js and environment ignores
