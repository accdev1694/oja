---
stepsCompleted: ['step-01-init', 'step-02-context', 'step-03-starter', 'step-04-decisions', 'step-05-patterns', 'step-06-structure', 'step-07-validation', 'step-08-complete']
inputDocuments: ['_bmad-output/planning-artifacts/product-brief.md', '_bmad-output/planning-artifacts/prd.md', '_bmad-output/planning-artifacts/ux-design-specification.md']
workflowType: 'architecture'
project_name: 'Oja'
user_name: 'Diloc'
date: '2026-01-24'
status: 'complete'
completedAt: '2026-01-24'
---

# Architecture Decision Document - Oja

_This document builds collaboratively through step-by-step discovery. Sections are appended as we work through each architectural decision together._

---

## Project Context Analysis

### Requirements Overview

**Functional Requirements: 190 FRs across 13 domains**

| Domain | Count | Key Concerns |
|--------|-------|--------------|
| User Account Management | 7 | Auth, trial, subscription, GDPR deletion |
| Pantry / Stock Tracking | 9 | 4-state system, gestures, auto-add to list |
| Shopping List Management | 15 | CRUD, check-off, priorities, running totals |
| Budget Control | 8 | Lock mode, impulse fund, Safe Zone indicator |
| Receipt Processing | 12 | Camera, OCR, AI parsing, validation rules |
| Price Intelligence | 6 | Personal history, crowdsourced DB, estimates |
| Insights & Analytics | 7 | Weekly/monthly reports, category breakdown |
| Subscription & Payments | 10 | Stripe, loyalty points, discount tiers |
| Location & Store Intelligence | 5 | Country/currency detection, store association |
| Cross-Device & Offline | 5 | Real-time sync, offline queue, conflict resolution |
| Onboarding | 5 | Animated welcome, seeded products, permissions |
| Feedback & Celebrations | 6 | Sounds, haptics, confetti, quiet mode |
| Admin Dashboard | 95 | Full back-office: analytics, support, content, config |

**Non-Functional Requirements: 59 NFRs across 7 categories**

| Category | Count | Critical Targets |
|----------|-------|------------------|
| Performance | 10 | <100ms budget updates, <2s cold start, 60fps animations |
| Security | 12 | AES-256 at rest, TLS 1.3, JWT httpOnly, GDPR compliance |
| Scalability | 7 | 1K initial → 10K at 12 months, 1M+ price records |
| Reliability | 10 | 99.5% uptime, zero data loss sync, 99.5% crash-free |
| Accessibility | 8 | WCAG AA, 44px touch targets, screen reader support |
| Integration | 6 | Stripe webhooks <5s, Supabase Realtime <1s |
| PWA-Specific | 6 | Lighthouse 100, <50MB IndexedDB, background sync |

### Scale & Complexity Assessment

**Project Classification:** Low-Medium Complexity PWA (Greenfield)

| Factor | Assessment |
|--------|------------|
| User Scale | 1K → 10K concurrent (12-month growth) |
| Data Volume | 1M+ crowdsourced prices, 100GB+ receipts |
| Integration Points | 5 (Supabase, Stripe, Tesseract.js, Gemini, PostHog) |
| Offline Complexity | High - full functionality required in-store |
| Real-time Requirements | Medium - sync, budget updates, Safe Zone |
| Security Sensitivity | Medium-High - payment data, GDPR, personal spending |

### Technical Constraints (from PRD)

| Constraint | Source | Impact |
|------------|--------|--------|
| PWA Platform | Business decision | Service Workers, Web APIs, iOS limitations |
| Next.js 14 | PRD Tech Stack | App Router, SSR, next-pwa |
| Supabase Backend | PRD Tech Stack | Postgres, Auth, Realtime, Edge Functions |
| Stripe Payments | Direct payments | No app store fees, webhook handling |
| Client-side OCR | Tesseract.js | Browser processing, <5s target |
| Gemini AI | Receipt parsing | Free tier, API latency considerations |
| UK Market | Initial scope | GDPR, GBP currency, UK product seeding |

### Cross-Cutting Concerns

| Concern | Domains Affected | Architectural Impact |
|---------|------------------|---------------------|
| **Offline-First** | Stock, Lists, Budget, Sync | IndexedDB, Service Workers, sync queue |
| **Optimistic Updates** | All CRUD operations | Local-first with background sync |
| **Real-time Sync** | Stock, Lists, Prices | Supabase Realtime subscriptions |
| **Error Boundaries** | Receipt, Payments, Sync | Graceful degradation, retry logic |
| **Authentication** | All protected routes | Supabase Auth, session management |
| **GDPR Compliance** | User data, Receipts, Analytics | Data export, deletion, consent |
| **Performance Budget** | All UI interactions | <100ms updates, 60fps animations |
| **Accessibility** | All UI components | WCAG AA, screen readers, touch targets |

---

## Starter Template Evaluation

### Primary Technology Domain

**Full-stack PWA** combining:
- Rich client-side interactions (offline, animations, gestures)
- Real-time data sync (Supabase Realtime)
- Subscription payments (Stripe direct)

### Starter Options Considered

| Option | What It Provides | Assessment |
|--------|------------------|------------|
| create-next-app with-supabase | Next.js + Supabase Auth | Official, minimal - missing PWA, state libs |
| Vercel Supabase Template | Next.js + Supabase + shadcn/ui | Good UI base - missing PWA, Framer Motion |
| T3 Stack (create-t3-app) | Next.js + tRPC + Drizzle | Conflicts with PRD (uses tRPC vs TanStack Query) |
| Nextbase Community | Next.js 16 + Supabase + Tailwind | Comprehensive but community-maintained |
| **create-next-app (vanilla)** | Next.js + TypeScript + Tailwind | **Selected** - Maximum flexibility |

### Selected Starter: create-next-app (vanilla)

**Rationale:**
PRD's specific stack (Zustand, TanStack Query, Framer Motion, Supabase Auth) doesn't match any existing starter. Starting vanilla provides:
1. No conflicting opinions
2. Exact dependency control
3. Latest versions guaranteed
4. Clear architecture ownership

**Initialization Command:**

```bash
npx create-next-app@latest oja --typescript --tailwind --eslint --app --src-dir --turbopack --import-alias "@/*"
```

**Post-Initialization Dependencies:**

```bash
# Core
npm install @supabase/supabase-js @supabase/ssr zustand @tanstack/react-query framer-motion

# PWA (Serwist for offline-first)
npm install @serwist/next && npm install -D serwist

# Payments & Analytics
npm install stripe @stripe/stripe-js posthog-js

# UI
npm install phosphor-react

# OCR & AI
npm install tesseract.js @google/generative-ai
```

### Version Update Notice

**PRD specifies Next.js 14, current stable is Next.js 16.1.2**

Key implications:
- Turbopack default (use `--webpack` for Serwist builds)
- Native PWA manifest support via `app/manifest.ts`
- React 19 support

**Decision:** Target Next.js 16 for latest features and security.

### PWA Strategy

| Package | Status | Decision |
|---------|--------|----------|
| next-pwa | Unmaintained | ❌ |
| @ducanh2912/next-pwa | Maintained fork | ⚠️ Recommends Serwist |
| **Serwist** | Active successor | ✅ Selected |

**Serwist** provides: Workbox-based service workers, full offline capability, runtime caching, precaching.

### Architectural Decisions from Starter

| Category | Decision | Version |
|----------|----------|---------|
| Language | TypeScript (strict) | 5.x |
| Framework | Next.js App Router | 16.x |
| React | React 19 | 19.x |
| Styling | Tailwind CSS | 4.x |
| Build (dev) | Turbopack | Bundled |
| Build (prod) | Webpack | Bundled |
| Import Alias | `@/*` | - |
| Directory | `src/` | - |

**Note:** Project initialization is the first implementation story.

---

## Core Architectural Decisions

### Decision Priority Analysis

**Critical Decisions (Block Implementation):**
- Data modeling approach
- Authorization strategy
- Offline storage solution
- Mutation strategy (Server Actions vs API Routes)

**Important Decisions (Shape Architecture):**
- Validation strategy
- Real-time subscription patterns
- Component architecture
- Form handling approach

**Deferred Decisions (Post-MVP):**
- Advanced caching strategies
- Multi-region deployment
- CDN configuration optimization

### Data Architecture

| Decision | Choice | Version | Rationale |
|----------|--------|---------|-----------|
| Data Modeling | Direct SQL + Supabase client | - | Simple data model, no ORM overhead, full Postgres power |
| Validation | Zod | 4.x | Shared schemas client/server, excellent TypeScript inference |
| Offline Storage | Dexie.js | 4.x | Clean IndexedDB wrapper, sync queue support |
| Migrations | Supabase Migrations | - | Native tooling, versioned SQL files |

**Validation Pattern:**
```typescript
// Shared schema definition (used client + server)
const stockItemSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(100),
  level: z.enum(['stocked', 'good', 'low', 'out']),
  category_id: z.string().uuid().nullable(),
  updated_at: z.string().datetime()
});
```

### Authentication & Security

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Auth Provider | Supabase Auth | PRD requirement, integrated with DB |
| Session Strategy | httpOnly cookies | NFR-S3 compliance, prevents XSS token theft |
| Authorization | RLS + Server middleware | Defense-in-depth, RLS as foundation |
| Admin 2FA | Supabase Auth MFA | Native support, NFR-S6 compliance |

**Authorization Layers:**
1. **RLS Policies** - Database-level security, user can only access own data
2. **Server Middleware** - Business logic validation (subscription status, loyalty rules)
3. **Client Guards** - UX-level route protection (redirects, feature flags)

### API & Communication Patterns

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Internal Mutations | Server Actions | Type-safe, co-located with components |
| External Endpoints | API Routes | Stripe webhooks, future mobile API |
| Real-time | Per-table Supabase subscriptions | Clean separation, efficient filtering |
| Error Handling | Structured error types | Consistent client handling |

**Mutation Strategy Matrix:**

| Operation | Method | Example |
|-----------|--------|---------|
| Stock update | Server Action | `updateStockLevel(itemId, level)` |
| List CRUD | Server Action | `createList(data)`, `addListItem(data)` |
| Receipt process | Server Action | `processReceipt(imageData)` |
| Stripe webhook | API Route | `POST /api/webhooks/stripe` |
| GDPR export | API Route | `GET /api/user/export` |

### Frontend Architecture

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Client State | Zustand | PRD requirement, simple API |
| Server State | TanStack Query | PRD requirement, caching, background sync |
| Component Org | Hybrid (UI + Features) | Scalable, clear separation |
| Form Handling | React Hook Form + Zod | Complex forms (onboarding, receipt correction) |
| Simple Forms | Native + Zod | Lightweight for quick inputs |

**State Boundaries:**
- **Zustand**: UI state (modals, navigation, theme), offline queue status
- **TanStack Query**: Server data (stock, lists, prices, user profile)
- **URL State**: Active list ID, filters, pagination

### Infrastructure & Deployment

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Hosting | Vercel | Optimal Next.js integration |
| CI/CD | Vercel Git Integration | Auto-deploy, preview branches |
| Environments | Vercel Environment Variables | Right-sized for scale |
| Error Tracking | Sentry | Industry standard, free tier |
| Analytics | PostHog | PRD requirement, privacy-friendly |
| Database | Supabase (managed) | PRD requirement |

**Environment Structure:**
- `development` - Local dev, Supabase local/dev project
- `preview` - PR preview deployments, Supabase staging
- `production` - Live app, Supabase production

### Decision Impact Analysis

**Implementation Sequence:**
1. Project initialization (starter + dependencies)
2. Supabase project setup + RLS policies
3. Core Zustand stores + TanStack Query setup
4. Dexie.js offline layer
5. Serwist PWA configuration
6. Feature implementation begins

**Cross-Component Dependencies:**

| Decision | Affects |
|----------|---------|
| Zod schemas | API validation, form validation, TypeScript types |
| RLS policies | All data access, sync logic |
| Dexie.js schema | Offline operations, sync queue |
| TanStack Query keys | Cache invalidation, optimistic updates |

---

## Implementation Patterns & Consistency Rules

### Pattern Categories Defined

**Critical Conflict Points Identified:** 25+ areas where AI agents could make different choices

These patterns ensure all AI agents write compatible, consistent code.

### Naming Patterns

#### Database Naming (Supabase Postgres)

| Element | Convention | Example |
|---------|------------|---------|
| Tables | `snake_case`, plural | `stock_items`, `shopping_lists`, `list_items` |
| Columns | `snake_case` | `user_id`, `created_at`, `stock_level` |
| Foreign Keys | `{referenced_table_singular}_id` | `user_id`, `list_id`, `category_id` |
| Indexes | `idx_{table}_{columns}` | `idx_stock_items_user_id` |
| Enums | `snake_case` type, `snake_case` values | `stock_level_type`: `'stocked'`, `'good'`, `'low'`, `'out'` |

#### API Naming (Next.js Routes)

| Element | Convention | Example |
|---------|------------|---------|
| Route folders | `kebab-case` | `/api/shopping-lists/`, `/api/stripe-webhook/` |
| Route params | `[id]` format | `/api/lists/[id]/items` |
| Query params | `camelCase` | `?listId=123&includeItems=true` |
| Server Actions | `camelCase` verb+noun | `createList`, `updateStockLevel`, `processReceipt` |

#### Code Naming (TypeScript/React)

| Element | Convention | Example |
|---------|------------|---------|
| Components | `PascalCase` | `StockItem`, `BudgetRing`, `SafeZoneGlow` |
| Component files | `PascalCase.tsx` | `StockItem.tsx`, `BudgetRing.tsx` |
| Hooks | `camelCase` with `use` prefix | `useStock`, `useShoppingList`, `useOfflineSync` |
| Hook files | `camelCase.ts` | `useStock.ts`, `useOfflineSync.ts` |
| Utilities | `camelCase` | `formatCurrency`, `calculateBudgetStatus` |
| Constants | `SCREAMING_SNAKE_CASE` | `STOCK_LEVELS`, `MAX_RECEIPT_SIZE` |
| Types/Interfaces | `PascalCase` | `StockItem`, `ShoppingList`, `ReceiptData` |
| Zod schemas | `camelCase` + `Schema` suffix | `stockItemSchema`, `shoppingListSchema` |

### Format Patterns

#### API Response Format

```typescript
// Server Action return type
type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: { code: string; message: string } };
```

#### Error Codes

```typescript
const ERROR_CODES = {
  UNAUTHORIZED: 'UNAUTHORIZED',
  SESSION_EXPIRED: 'SESSION_EXPIRED',
  VALIDATION_FAILED: 'VALIDATION_FAILED',
  BUDGET_EXCEEDED: 'BUDGET_EXCEEDED',
  RECEIPT_DUPLICATE: 'RECEIPT_DUPLICATE',
  RECEIPT_EXPIRED: 'RECEIPT_EXPIRED',
  DAILY_LIMIT_REACHED: 'DAILY_LIMIT_REACHED',
  NETWORK_ERROR: 'NETWORK_ERROR',
  SERVER_ERROR: 'SERVER_ERROR',
} as const;
```

#### Data Exchange Format

| Data Type | Format | Example |
|-----------|--------|---------|
| Dates (JSON) | ISO 8601 string | `"2026-01-24T14:30:00.000Z"` |
| Money | Integer (pence) | `399` for £3.99 |
| UUIDs | Lowercase string | `"a1b2c3d4-e5f6-..."` |
| Booleans | `true`/`false` | Never `1`/`0` |
| Nulls | Explicit `null` | Never omit field |

### Communication Patterns

#### TanStack Query Keys

```typescript
export const queryKeys = {
  stock: {
    all: ['stock'] as const,
    list: () => [...queryKeys.stock.all, 'list'] as const,
    detail: (id: string) => [...queryKeys.stock.all, 'detail', id] as const,
  },
  lists: {
    all: ['lists'] as const,
    list: () => [...queryKeys.lists.all, 'list'] as const,
    detail: (id: string) => [...queryKeys.lists.all, 'detail', id] as const,
    items: (listId: string) => [...queryKeys.lists.all, 'items', listId] as const,
  },
  prices: {
    all: ['prices'] as const,
    search: (query: string) => [...queryKeys.prices.all, 'search', query] as const,
  },
  user: {
    profile: ['user', 'profile'] as const,
    subscription: ['user', 'subscription'] as const,
    loyaltyPoints: ['user', 'loyalty'] as const,
  },
} as const;
```

#### Zustand Store Pattern

```typescript
// Store naming: use{Domain}Store
interface UIStore {
  isOffline: boolean;
  activeModal: ModalType | null;
  setOffline: (offline: boolean) => void;
  openModal: (modal: ModalType) => void;
  closeModal: () => void;
}
```

#### Supabase Realtime Pattern

```typescript
const channel = supabase
  .channel(`stock:${userId}`)
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'stock_items',
    filter: `user_id=eq.${userId}`,
  }, handleStockChange)
  .subscribe();
```

### Process Patterns

#### Loading States

- TanStack Query provides: `isLoading`, `isFetching`, `isError`
- Mutations: use `mutation.isPending`
- Skeleton loaders for initial load
- Subtle spinner for background refresh
- Disable buttons during mutation (spinner inside button)

#### Error Handling

- Global error boundary at app root
- Feature-level error boundaries per route segment
- Toast for transient errors (network, server issues)
- Inline for validation errors (field-level)
- Full-page for auth errors (redirect to login)

#### Optimistic Updates Pattern

```typescript
const mutation = useMutation({
  mutationFn: updateStockLevel,
  onMutate: async (newLevel) => {
    await queryClient.cancelQueries({ queryKey: queryKeys.stock.detail(id) });
    const previous = queryClient.getQueryData(queryKeys.stock.detail(id));
    queryClient.setQueryData(queryKeys.stock.detail(id), (old) => ({
      ...old, level: newLevel,
    }));
    return { previous };
  },
  onError: (err, newLevel, context) => {
    queryClient.setQueryData(queryKeys.stock.detail(id), context?.previous);
  },
  onSettled: () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.stock.detail(id) });
  },
});
```

### Enforcement Guidelines

**All AI Agents MUST:**

1. Follow naming conventions exactly (no variations)
2. Use the query key factory for all TanStack Query operations
3. Return `ActionResult<T>` from all Server Actions
4. Use Zod schemas for all data validation
5. Store money as integers (pence)
6. Use ISO 8601 for all date strings
7. Implement optimistic updates for user-facing mutations
8. Handle offline scenarios with queue fallback

**Pattern Verification:**
- ESLint rules enforce naming conventions
- TypeScript strict mode catches type mismatches
- PR reviews verify pattern compliance

---

## Project Structure & Boundaries

### Requirements to Structure Mapping

| PRD Domain | Feature Module | Key Files |
|------------|----------------|-----------|
| User Account (FR1-7) | `features/auth/` | Auth flows, profile |
| Pantry/Stock (FR8-16) | `features/stock/` | Stock grid, level controls |
| Shopping Lists (FR17-31) | `features/lists/` | List CRUD, item management |
| Budget Control (FR32-39) | `features/budget/` | Budget ring, Safe Zone |
| Receipt Processing (FR40-51) | `features/receipts/` | Camera, OCR, AI parsing |
| Price Intelligence (FR52-57) | `features/prices/` | Price history, estimates |
| Insights (FR58-64) | `features/insights/` | Weekly/monthly reports |
| Subscription (FR65-74) | `features/subscription/` | Stripe, loyalty points |
| Location (FR75-79) | `features/location/` | Store detection, currency |
| Offline/Sync (FR80-84) | `lib/sync/` | Dexie, queue, conflicts |
| Onboarding (FR85-89) | `features/onboarding/` | Welcome flow, seeding |
| Feedback (FR90-95) | `features/feedback/` | Sounds, haptics |
| Admin Dashboard (FR96-190) | `app/(admin)/` | Full back-office |

### Complete Project Directory Structure

```
oja/
├── README.md
├── package.json
├── next.config.ts
├── tailwind.config.ts
├── tsconfig.json
├── serwist.config.ts
├── .env.example
├── .eslintrc.json
├── .prettierrc
│
├── .github/workflows/ci.yml
│
├── public/
│   ├── icons/                    # PWA icons
│   ├── sounds/                   # UI sounds
│   └── images/
│
├── supabase/
│   ├── config.toml
│   ├── seed.sql
│   └── migrations/
│
├── e2e/                          # Playwright E2E
│   ├── playwright.config.ts
│   └── journeys/
│
└── src/
    ├── app/
    │   ├── manifest.ts           # PWA manifest
    │   ├── sw.ts                 # Service worker
    │   ├── layout.tsx
    │   ├── globals.css
    │   │
    │   ├── (marketing)/          # Public pages
    │   │   └── page.tsx
    │   │
    │   ├── (auth)/               # Auth flows
    │   │   ├── login/
    │   │   ├── register/
    │   │   └── forgot-password/
    │   │
    │   ├── (app)/                # Authenticated app
    │   │   ├── layout.tsx
    │   │   ├── pantry/
    │   │   ├── lists/
    │   │   │   ├── [id]/
    │   │   │   └── new/
    │   │   ├── scan/
    │   │   │   └── [receiptId]/
    │   │   ├── insights/
    │   │   ├── settings/
    │   │   └── onboarding/
    │   │
    │   ├── (admin)/              # Admin dashboard
    │   │   ├── dashboard/
    │   │   ├── users/
    │   │   ├── receipts/
    │   │   ├── prices/
    │   │   └── analytics/
    │   │
    │   └── api/
    │       ├── webhooks/stripe/
    │       ├── user/export/
    │       └── health/
    │
    ├── components/ui/            # Design system
    │   ├── Button.tsx
    │   ├── Card.tsx
    │   ├── Input.tsx
    │   ├── Modal.tsx
    │   └── index.ts
    │
    ├── features/
    │   ├── stock/
    │   │   ├── components/
    │   │   ├── hooks/
    │   │   ├── actions/
    │   │   └── schemas/
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
    │
    ├── lib/
    │   ├── supabase/
    │   │   ├── client.ts
    │   │   ├── server.ts
    │   │   └── middleware.ts
    │   ├── stores/               # Zustand
    │   ├── query/                # TanStack Query
    │   │   ├── client.ts
    │   │   └── keys.ts
    │   ├── db/                   # Dexie.js
    │   ├── sync/                 # Offline sync
    │   ├── stripe/
    │   ├── analytics/
    │   ├── sentry/
    │   └── utils/
    │
    ├── types/
    │
    └── middleware.ts
```

### Architectural Boundaries

#### API Boundaries

| Boundary | Server Actions | API Routes |
|----------|----------------|------------|
| User Mutations | ✓ | |
| Data Fetching | ✓ | |
| Stripe Webhooks | | ✓ |
| GDPR Requests | | ✓ |

#### Component Boundaries

| Layer | Imports From |
|-------|--------------|
| `app/` pages | `features/`, `components/ui/` |
| `features/` | `lib/`, `components/ui/` |
| `components/ui/` | `lib/utils/` only |
| `lib/` | External packages only |

**Rule:** Features NEVER import from other features.

#### Data Boundaries

| Store | Purpose | Sync |
|-------|---------|------|
| Supabase | Source of truth | Realtime |
| Dexie.js | Offline cache | Background sync |
| TanStack Query | Server cache | SWR |
| Zustand | UI state | Not synced |

### Integration Points

#### External Services

| Service | Location | Purpose |
|---------|----------|---------|
| Supabase | `lib/supabase/` | Auth, DB, Realtime |
| Stripe | `lib/stripe/`, `/api/webhooks/stripe` | Payments |
| Gemini | `features/receipts/lib/aiParser.ts` | Receipt parsing |
| Tesseract.js | `features/receipts/lib/ocr.ts` | Client OCR |
| PostHog | `lib/analytics/` | Analytics |
| Sentry | `lib/sentry/` | Error tracking |

### Data Flow

```
User Action
    │
    ▼
React Component
    │
    ├─► TanStack Query ──► Server Action ──► Supabase
    │        │
    │        └─► Cache (optimistic update)
    │
    └─► Zustand (UI state)
         │
         └─► Dexie.js (offline queue)
              │
              └─► Background Sync ──► Server Action
```

---

## Architecture Validation Results

### Coherence Validation ✅

**Decision Compatibility:**
All technology choices work together without conflicts. Next.js 16 + Serwist (with webpack), Supabase + Dexie.js for offline, TanStack Query + Zustand for state, Server Actions + API Routes for mutations.

**Pattern Consistency:**
All patterns align with technology choices. Naming conventions flow logically from database (snake_case) through API (kebab-case) to code (camelCase/PascalCase).

**Structure Alignment:**
Project structure fully supports all architectural decisions. Feature modules map 1:1 to PRD domains.

### Requirements Coverage ✅

**Functional Requirements:**
All 190 FRs across 13 domains have clear architectural homes with specific feature modules and file locations.

**Non-Functional Requirements:**
All 59 NFRs addressed through technology choices (performance via optimistic updates, security via RLS + httpOnly cookies, reliability via offline-first architecture).

### Implementation Readiness ✅

**Decision Completeness:**
All critical decisions documented with specific versions. Technology stack fully verified via web search.

**Pattern Completeness:**
25+ potential conflict points addressed with naming conventions, query key factories, error handling patterns, and state boundaries.

**Structure Completeness:**
Complete directory tree with all files specified, route structure mapped, and integration points defined.

### Architecture Completeness Checklist

- [x] Project context thoroughly analyzed (190 FRs, 59 NFRs)
- [x] Scale and complexity assessed (Low-Medium, 1K→10K users)
- [x] Technical constraints identified (PWA, UK market, GDPR)
- [x] Cross-cutting concerns mapped (8 concerns)
- [x] Critical decisions documented with versions
- [x] Implementation patterns established
- [x] Project structure complete
- [x] Validation confirming coherence

---

## Architecture Completion Summary

### Workflow Completion

**Architecture Decision Workflow:** COMPLETED ✅
**Total Steps Completed:** 8
**Date Completed:** 2026-01-24
**Document Location:** `_bmad-output/planning-artifacts/architecture.md`

### Final Architecture Deliverables

**📋 Complete Architecture Document**
- All architectural decisions documented with specific versions
- Implementation patterns ensuring AI agent consistency
- Complete project structure with all files and directories
- Requirements to architecture mapping
- Validation confirming coherence and completeness

**🏗️ Implementation Ready Foundation**
- 25+ architectural decisions made
- 15+ implementation patterns defined
- 13 feature modules specified
- 190 FRs + 59 NFRs fully supported

### Implementation Handoff

**For AI Agents:**
This architecture document is your complete guide for implementing Oja. Follow all decisions, patterns, and structures exactly as documented.

**First Implementation Priority:**

```bash
npx create-next-app@latest oja --typescript --tailwind --eslint --app --src-dir --turbopack --import-alias "@/*"
```

**Development Sequence:**
1. Initialize project using documented starter template
2. Install dependencies per architecture
3. Set up Supabase project + RLS policies
4. Configure Serwist for PWA
5. Build features following established patterns

---

**Architecture Status:** READY FOR IMPLEMENTATION ✅

**Next Phase:** Create Epics & Stories for implementation using this architecture as the foundation.

