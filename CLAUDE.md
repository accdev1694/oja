# Oja - Claude Code Project Configuration

> Budget-First Shopping Confidence - A mobile app that gives shoppers control over their spending before, during, and after shopping trips.

---

## Project Lead

**John (PM Agent)** leads this project through the BMAD product development lifecycle, orchestrating the right specialist agents at each phase.

To invoke the project lead:
```
/bmad:bmm:agents:pm
```

### Critical Instruction for All Agents

**ALWAYS reference the Product Brief** (`_bmad-output/planning-artifacts/product-brief.md`) as the foundational source of truth for this project. All decisions, requirements, and implementations must align with the vision, features, and technical decisions documented there.

---

## Progress Tracking

Project progress is tracked through multiple mechanisms:

### 1. Workflow Status (Quick Check)
```
/bmad:bmm:workflows:workflow-status
```
Answers "What should I do now?" - reads current state and recommends next action.

### 2. Sprint Status File
Location: `_bmad-output/implementation-artifacts/sprint-status.yaml`

Tracks:
- Current sprint number
- Active epic and story
- Story statuses (pending, in_progress, completed, blocked)
- Blockers and notes

### 3. Document Frontmatter
Each BMAD document (PRD, Architecture, etc.) contains `stepsCompleted` in its frontmatter, showing workflow progress.

### 4. CLAUDE.md Workflow Phases Table
The table in this file shows high-level phase completion status. Update status to "IN PROGRESS" or "COMPLETE" as phases finish.

---

## BMAD Workflow Phases

| Phase | Agent | Command | Status |
|-------|-------|---------|--------|
| 1. Product Brief | PM + Analyst | `/bmad:bmm:workflows:create-product-brief` | COMPLETE |
| 2. PRD | PM | `/bmad:bmm:workflows:prd` | COMPLETE |
| 3. Architecture | Architect | `/bmad:bmm:workflows:create-architecture` | COMPLETE |
| 4. UX Design | UX Designer | `/bmad:bmm:workflows:create-ux-design` | COMPLETE |
| 5. Epics & Stories | Scrum Master | `/bmad:bmm:workflows:create-epics-and-stories` | COMPLETE |
| 6. Test Strategy | Test Architect | `/bmad:bmm:workflows:testarch-test-design` | COMPLETE |
| 7. Sprint Planning | Scrum Master | `/bmad:bmm:workflows:sprint-planning` | COMPLETE |
| 8. Story Development | Developer | `/bmad:bmm:workflows:dev-story` | Pending |
| 9. Code Review | Developer | `/bmad:bmm:workflows:code-review` | Pending |
| 10. Test Automation | Test Architect | `/bmad:bmm:workflows:testarch-automate` | Pending |

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| **Framework** | Next.js 14 (App Router) |
| **Platform** | Progressive Web App (PWA) |
| **Language** | TypeScript (strict mode) |
| **Styling** | Tailwind CSS |
| **State** | Zustand (client) + TanStack Query (server) |
| **Animations** | Framer Motion |
| **Icons** | Phosphor Icons (@phosphor-icons/react) |
| **Backend** | Supabase (Postgres + Auth + Realtime + Edge Functions) |
| **PWA** | next-pwa + Workbox |
| **OCR** | Tesseract.js (client-side) |
| **AI** | Gemini 1.5 Flash (receipt parsing) |
| **Payments** | Stripe Checkout (direct, ~3% fees) |
| **Hosting** | Vercel |

---

## Project Structure

```
oja/
├── app/                          # Next.js App Router
│   ├── (app)/                    # Authenticated app routes
│   │   ├── pantry/              # Stock tracker (home)
│   │   ├── list/                # Shopping lists
│   │   ├── list/[id]/           # Individual list detail
│   │   ├── scan/                # Receipt scanner
│   │   ├── insights/            # Weekly/monthly insights
│   │   └── settings/            # User settings
│   ├── (auth)/                   # Auth routes
│   │   ├── login/
│   │   └── register/
│   ├── (marketing)/              # Public pages
│   ├── api/                      # API routes
│   │   ├── receipts/parse/      # Receipt parsing
│   │   └── webhooks/stripe/     # Stripe webhooks
│   ├── layout.tsx
│   └── manifest.ts               # PWA manifest
├── components/
│   ├── ui/                       # Design system primitives
│   ├── stock/                    # Stock tracker components
│   ├── list/                     # Shopping list components
│   ├── receipt/                  # Receipt scanning
│   └── insights/                 # Analytics components
├── lib/
│   ├── supabase/                 # Supabase client
│   │   ├── client.ts
│   │   ├── server.ts
│   │   └── middleware.ts
│   ├── stores/                   # Zustand stores
│   ├── hooks/                    # Custom hooks
│   ├── ai/                       # AI utilities
│   └── utils/                    # General utilities
├── public/
│   ├── icons/                    # PWA icons (192, 512)
│   └── sounds/                   # UI sound effects
├── styles/
│   └── globals.css               # Tailwind imports
├── supabase/
│   ├── migrations/               # Database migrations
│   └── functions/                # Edge functions
├── next.config.js                # Next.js + PWA config
├── tailwind.config.ts
└── _bmad-output/                 # BMAD artifacts
    ├── planning-artifacts/
    └── implementation-artifacts/
```

---

## Key Commands

```bash
# Development
npm run dev                       # Start dev server (localhost:3000)
npm run build                     # Production build
npm run start                     # Start production server

# Testing
npm test                          # Run unit tests
npm run test:watch                # Watch mode
npm run test:coverage             # Coverage report

# Linting & Formatting
npm run lint                      # ESLint
npm run format                    # Prettier

# PWA
npm run build                     # Generates SW + manifest
# Test PWA: build, then serve with `npx serve out`

# Database
npx supabase start                # Local Supabase
npx supabase db push              # Push migrations
npx supabase gen types typescript # Generate types

# Deployment
vercel                            # Deploy to Vercel
vercel --prod                     # Production deploy
```

---

## Design System

### Colors

```typescript
// Primary
orange: '#FF6B35'        // Energy, confidence, action
grey: '#F5F5F5'          // Clean, spacious, calm
charcoal: '#2D3436'      // Grounding, trust, readability

// Semantic
success: '#10B981'       // Under budget
warning: '#F59E0B'       // Approaching limit
danger: '#EF4444'        // Over budget

// Warm tones
peach: '#FFE8E0'         // Card highlights
warmWhite: '#FFFAF8'     // Base background
```

### Typography

- **Headings:** Inter (700)
- **Body:** Inter (400, 500)
- **Numbers/Prices:** JetBrains Mono (monospace alignment)

### Icons

Use Phosphor Icons (@phosphor-icons/react) with appropriate weights:
- **Navigation:** Duotone weight
- **Actions:** Bold weight
- **Stock states:** Fill (full) → Thin (empty)

---

## Testing Strategy

Testing is integrated throughout development, led by **Murat (Test Architect)**:

1. **Unit Tests** - Every component and utility function
2. **Integration Tests** - Store interactions, API calls
3. **E2E Tests** - Critical user flows (Maestro or Detox)

**Test execution points:**
- Before each PR/story completion
- After each sprint
- Before release

**Invoke test workflows:**
```
/bmad:bmm:workflows:testarch-test-design    # Test strategy
/bmad:bmm:workflows:testarch-automate       # Generate tests
/bmad:bmm:workflows:testarch-test-review    # Review test quality
```

---

## Code Conventions

### File Naming
- Components: `PascalCase.tsx` (e.g., `BudgetRing.tsx`)
- Utilities: `camelCase.ts` (e.g., `formatCurrency.ts`)
- Types: `PascalCase` in `types/index.ts`
- Hooks: `useCamelCase.ts` (e.g., `useStockLevel.ts`)

### Component Structure
```typescript
// 1. Imports
// 2. Types/Interfaces
// 3. Component
// 4. Styles (if colocated)
// 5. Export
```

### State Management
- **Local UI state:** `useState`
- **Complex local state:** `useReducer`
- **Global client state:** Zustand stores
- **Server state:** TanStack Query

---

## Environment Variables

Required in `.env.local`:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=

# Google Places
NEXT_PUBLIC_GOOGLE_PLACES_API_KEY=

# AI
GEMINI_API_KEY=

# Stripe
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=

# Analytics
NEXT_PUBLIC_POSTHOG_API_KEY=
NEXT_PUBLIC_POSTHOG_HOST=

# Error Tracking
NEXT_PUBLIC_SENTRY_DSN=
```

---

## Important Patterns

### Offline-First (PWA)
- IndexedDB for local data (via `idb` library)
- Service Worker caches static assets and API responses
- Sync queue for offline operations (uses Background Sync API)
- Receipt photos stored in IndexedDB, processed when online

### Budget Calculations
- Always use decimal arithmetic (avoid floating point)
- Store prices in smallest currency unit (pence) internally
- Display formatted with proper locale

### Stock State Machine
```
STOCKED → GOOD → LOW → OUT → (auto-add to next list)
```

### Receipt Processing Pipeline
```
Camera capture → Tesseract.js OCR → Gemini parse → User confirm → Save
```

### PWA Install Flow
- Detect `beforeinstallprompt` event
- Show custom "Add to Home Screen" prompt in onboarding
- Track install via `appinstalled` event

---

## BMAD Artifacts Location

| Artifact | Path |
|----------|------|
| Product Brief | `_bmad-output/planning-artifacts/product-brief.md` |
| PRD | `_bmad-output/planning-artifacts/prd.md` |
| Architecture | `_bmad-output/planning-artifacts/architecture.md` |
| UX Design | `_bmad-output/planning-artifacts/ux-design-specification.md` |
| Epics & Stories | `_bmad-output/planning-artifacts/epics/` |
| Sprint Status | `_bmad-output/implementation-artifacts/sprint-status.yaml` |
| Story Files | `_bmad-output/implementation-artifacts/stories/` |

---

## Quick Start for New Session

1. **Check current phase:**
   ```
   /bmad:bmm:workflows:workflow-status
   ```

2. **Continue where you left off:**
   - Review sprint-status.yaml for current story
   - Load the appropriate agent for the phase

3. **Start fresh planning session:**
   ```
   /bmad:bmm:agents:pm
   ```

---

## Target Market

- **Primary:** United Kingdom
- **Architecture:** Location-agnostic (global ready)
- **Currency:** Auto-detect based on location
- **Stores:** UK supermarkets (Tesco, Sainsbury's, Asda, Aldi, etc.)

---

## Current Session Progress (Resume Here)

**Last Updated:** 2026-01-25

### Epic 1 Progress

| Story | Status | Notes |
|-------|--------|-------|
| 1-1: Initialize Next.js Project | review | Complete |
| 1-2: Configure Serwist PWA | review | Complete |
| 1-3: Set Up Supabase | review | Complete |
| 1-4: Configure DexieJS | review | Complete |
| 1-5: TanStack Query + Zustand | review | Complete |
| **1-6: Design System Foundation** | **backlog** | **NEXT STORY** |
| 1-7: CI/CD and Dev Tooling | backlog | |

### Next Steps

**Ready to start Story 1-6: Design System Foundation**

To continue development, either:
1. Manually start Story 1-6 implementation
2. Run code review on completed stories: `/bmad:bmm:workflows:code-review`
3. Check workflow status: `/bmad:bmm:workflows:workflow-status`

---

*This file configures Claude Code for the Oja project. Maintained by BMAD workflow.*
