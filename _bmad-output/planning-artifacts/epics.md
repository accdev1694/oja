---
stepsCompleted: ['step-01-validate-prerequisites', 'step-02-design-epics', 'step-03-create-stories']
inputDocuments: ['_bmad-output/planning-artifacts/prd.md', '_bmad-output/planning-artifacts/architecture.md', '_bmad-output/planning-artifacts/ux-design-specification.md']
---

# Oja - Epic Breakdown

## Overview

This document provides the complete epic and story breakdown for Oja, decomposing the requirements from the PRD, UX Design, and Architecture requirements into implementable stories.

## Requirements Inventory

### Functional Requirements

**User Account Management (FR1-7)**
- FR1: Users can create an account with email and password
- FR2: Users can sign in to their existing account
- FR3: Users can sign out from any device
- FR4: Users can reset their password via email
- FR5: New users receive a 7-day free trial with full access
- FR6: Users can view and manage their subscription status
- FR7: Users can delete their account and all associated data

**Pantry / Stock Tracking (FR8-16)**
- FR8: Users can view all tracked stock items in a pantry grid
- FR9: Users can add new items to their pantry
- FR10: Users can set stock level for any item (Stocked, Good, Low, Out)
- FR11: Users can change stock level via tap-and-hold interaction
- FR12: Users can quick-decrease stock level via swipe gesture
- FR13: System auto-adds "Out" items to the next shopping list
- FR14: Users can assign categories to stock items
- FR15: Users can remove items from their pantry
- FR16: New users see pre-seeded UK staple items in their pantry

**Shopping List Management (FR17-31)**
- FR17: Users can create new shopping lists
- FR18: Users can view all their shopping lists
- FR19: Users can add items to a shopping list
- FR20: Users can remove items from a shopping list
- FR21: Users can search and add items from their pantry to a list
- FR22: Users can check off items as they shop
- FR23: Users can uncheck items if needed
- FR24: Users can set priority for items (must-have vs nice-to-have)
- FR25: Users can change item priority via swipe gesture
- FR26: Users can edit estimated price for any list item
- FR27: Users can edit actual price when checking off items
- FR28: Users can view running total of their shopping list
- FR29: Users can archive completed shopping lists
- FR30: Users can view archived shopping lists (trip history)
- FR31: System auto-updates pantry stock to "Stocked" when list is completed

**Budget Control (FR32-39)**
- FR32: Users can set a total budget for each shopping list
- FR33: Users can enable Budget Lock Mode (hard cap)
- FR34: System warns user before adding items that exceed budget
- FR35: Users can set a separate Impulse Fund budget
- FR36: Users can add impulse items charged against impulse fund
- FR37: Users can view Safe Zone indicator showing budget status
- FR38: System suggests removing nice-to-have items when over budget
- FR39: Users can see real-time budget status while shopping

**Receipt Processing (FR40-51)**
- FR40: Users can capture receipt photos using device camera
- FR41: System performs OCR on captured receipts
- FR42: System extracts structured data from receipt text (store, date, items, prices, total)
- FR43: Users can review and correct AI-parsed receipt data
- FR44: Users can manually add missing items to parsed receipt
- FR45: Users can view reconciliation of planned vs actual spending
- FR46: System identifies items bought but not on list ("missed items")
- FR47: System identifies items on list but not bought ("skipped items")
- FR48: Users can save receipt without points if validation fails
- FR49: System validates receipt freshness (<=3 days from purchase date)
- FR50: System validates receipt legibility (>=60% OCR confidence)
- FR51: System detects duplicate receipts (same store+date+total)

**Price Intelligence (FR52-57)**
- FR52: System maintains personal price history per user
- FR53: System provides price estimates when adding items to lists
- FR54: System contributes validated prices to crowdsourced database
- FR55: System shows price confidence level for estimates
- FR56: Users can view price history for specific items
- FR57: System filters crowdsourced prices by recency (weighted average)

**Insights & Analytics (FR58-64)**
- FR58: Users can view weekly spending digest
- FR59: Users can view monthly trend reports
- FR60: Users can view category breakdown of spending
- FR61: Users can view budget adherence statistics (trips under/over budget)
- FR62: Users can view total savings achieved
- FR63: System displays progress indicators (trips under budget, streaks)
- FR64: Users can view their price contribution count

**Subscription & Payments (FR65-74)**
- FR65: Users can subscribe to monthly plan (GBP3.99/mo)
- FR66: Users can subscribe to annual plan (GBP29.99/yr)
- FR67: Users can cancel their subscription
- FR68: System enforces feature limits for expired free tier
- FR69: Users can earn loyalty points for valid receipt scans
- FR70: System applies loyalty point discounts to subscription (up to 50%)
- FR71: Users can view their loyalty point balance
- FR72: Users can view point earning history
- FR73: System enforces daily receipt scan cap (5/day)
- FR74: System expires unused points after 12 months

**Location & Store Intelligence (FR75-79)**
- FR75: System auto-detects user's country
- FR76: System auto-detects user's currency based on location
- FR77: Users can manually set their preferred currency
- FR78: System can detect when user is in a known store (optional)
- FR79: Users can associate shopping lists with specific stores

**Cross-Device & Offline (FR80-84)**
- FR80: Users can access their data from multiple devices
- FR81: System syncs data across devices in real-time
- FR82: Users can use core features while offline
- FR83: System queues changes made offline for sync when online
- FR84: System resolves sync conflicts gracefully

**Onboarding (FR85-89)**
- FR85: New users see animated welcome experience
- FR86: New users can customize seeded products (remove unwanted items)
- FR87: New users can set default weekly budget
- FR88: Users can optionally grant location permission
- FR89: Users can skip optional onboarding steps

**Feedback & Celebrations (FR90-95)**
- FR90: System plays subtle sounds for key actions (configurable)
- FR91: System provides haptic feedback for interactions (configurable)
- FR92: System displays celebration when trip completed under budget
- FR93: Users can enable/disable sounds
- FR94: Users can enable/disable haptics
- FR95: System can auto-mute in detected store locations

**Admin Dashboard - Access & Security (FR96-100)**
- FR96: Admins can sign in to a separate admin interface with enhanced security
- FR97: Admin accounts require two-factor authentication
- FR98: System logs all admin actions in an audit trail
- FR99: Super-admins can create and manage other admin accounts
- FR100: Admins have role-based permissions (viewer, support, manager, super-admin)

**Admin Dashboard - Business Analytics (FR101-109)**
- FR101: Admins can view real-time user count (total, active, new today)
- FR102: Admins can view DAU/WAU/MAU metrics with trends
- FR103: Admins can view user retention cohort analysis
- FR104: Admins can view onboarding funnel completion rates
- FR105: Admins can view trial-to-paid conversion rate
- FR106: Admins can view churn rate and churn reasons
- FR107: Admins can view feature adoption metrics (% using each feature)
- FR108: Admins can filter analytics by date range
- FR109: Admins can compare metrics period-over-period

**Admin Dashboard - Revenue & Financial (FR110-117)**
- FR110: Admins can view Monthly Recurring Revenue (MRR)
- FR111: Admins can view Annual Recurring Revenue (ARR)
- FR112: Admins can view revenue growth trends
- FR113: Admins can view subscriber breakdown (monthly vs annual)
- FR114: Admins can view average revenue per user (ARPU)
- FR115: Admins can view customer lifetime value (LTV) estimates
- FR116: Admins can view loyalty point discount impact on revenue
- FR117: Admins can view total loyalty points liability (outstanding points)

**Admin Dashboard - Stripe Integration (FR118-126)**
- FR118: Admins can view all payment transactions
- FR119: Admins can view failed payment attempts
- FR120: Admins can view payment retry status
- FR121: Admins can issue refunds for specific transactions
- FR122: Admins can view subscription lifecycle events
- FR123: Admins can view upcoming renewals
- FR124: Admins can view revenue by payment method
- FR125: System syncs payment data from Stripe webhooks in real-time
- FR126: Admins can manually reconcile payment discrepancies

**Admin Dashboard - User Management (FR127-138)**
- FR127: Admins can search users by email, name, or ID
- FR128: Admins can view detailed user profile
- FR129: Admins can view user's subscription history
- FR130: Admins can view user's loyalty point history
- FR131: Admins can view user's receipt scan history
- FR132: Admins can extend user's trial period
- FR133: Admins can grant complimentary subscription
- FR134: Admins can add loyalty points manually
- FR135: Admins can reset user's password
- FR136: Admins can deactivate user account
- FR137: Admins can reactivate previously deactivated accounts
- FR138: Admins can view user's activity timeline

**Admin Dashboard - Receipt & Price Management (FR139-150)**
- FR139: Admins can view receipt scan volume metrics
- FR140: Admins can view OCR success rate metrics
- FR141: Admins can view AI parsing accuracy metrics
- FR142: Admins can view rejected receipts and rejection reasons
- FR143: Admins can review flagged/suspicious receipts
- FR144: Admins can manually approve or reject flagged receipts
- FR145: Admins can view crowdsourced price database
- FR146: Admins can search prices by item, store, or region
- FR147: Admins can edit incorrect crowdsourced prices
- FR148: Admins can delete spam or fraudulent price entries
- FR149: Admins can view price outlier reports
- FR150: Admins can bulk approve/reject price entries

**Admin Dashboard - Product & Content (FR151-157)**
- FR151: Admins can view and manage seeded UK staple products
- FR152: Admins can add new seeded products
- FR153: Admins can edit seeded product details
- FR154: Admins can remove seeded products
- FR155: Admins can manage product categories
- FR156: Admins can manage store name normalization rules
- FR157: Admins can view and edit item name canonicalization rules

**Admin Dashboard - System Health (FR158-166)**
- FR158: Admins can view system uptime metrics
- FR159: Admins can view API response time metrics
- FR160: Admins can view error rate trends
- FR161: Admins can view recent error logs
- FR162: Admins can view third-party service status
- FR163: Admins can view database storage usage
- FR164: Admins can view sync queue status
- FR165: Admins can view background job status
- FR166: System sends alerts to admins when error thresholds exceeded

**Admin Dashboard - Customer Support (FR167-173)**
- FR167: Admins can view support ticket queue
- FR168: Admins can impersonate user view (read-only)
- FR169: Admins can view user's recent shopping lists
- FR170: Admins can view user's stock tracker state
- FR171: Admins can trigger password reset email for user
- FR172: Admins can export user's data (GDPR request)
- FR173: Admins can permanently delete user's data (GDPR request)

**Admin Dashboard - Communication (FR174-178)**
- FR174: Admins can create in-app announcements
- FR175: Admins can schedule announcements for future dates
- FR176: Admins can target announcements to user segments
- FR177: Admins can view announcement read/dismiss rates
- FR178: Admins can create email campaigns (future)

**Admin Dashboard - Configuration (FR179-185)**
- FR179: Admins can toggle feature flags on/off
- FR180: Admins can enable features for specific user segments
- FR181: Admins can configure loyalty point earning rules
- FR182: Admins can configure receipt validation thresholds
- FR183: Admins can configure subscription pricing
- FR184: Admins can configure trial period length
- FR185: Admins can configure daily receipt scan cap

**Admin Dashboard - Reporting (FR186-190)**
- FR186: Admins can export user list to CSV
- FR187: Admins can export revenue reports to CSV
- FR188: Admins can export analytics data to CSV
- FR189: Admins can schedule automated weekly reports via email
- FR190: Admins can export audit logs

### NonFunctional Requirements

**Performance (NFR-P1 to NFR-P10)**
- NFR-P1: App cold start to usable <2 seconds
- NFR-P2: Budget bar update on item change <100ms
- NFR-P3: List item check/uncheck <50ms visual response
- NFR-P4: Receipt camera to preview <1 second
- NFR-P5: Receipt OCR processing <5 seconds
- NFR-P6: AI receipt parsing <3 seconds (API call)
- NFR-P7: Animation frame rate 60fps consistent
- NFR-P8: Offline mode activation <500ms detection
- NFR-P9: Search/filter response <200ms
- NFR-P10: Lighthouse Performance score >90

**Security (NFR-S1 to NFR-S12)**
- NFR-S1: Data encryption at rest AES-256 (Supabase default)
- NFR-S2: Data encryption in transit TLS 1.3
- NFR-S3: Authentication tokens JWT with secure httpOnly cookies
- NFR-S4: Password requirements Min 8 chars, complexity check
- NFR-S5: Session timeout 30 days (remember me) / 24hr (default)
- NFR-S6: Admin 2FA Required for all admin accounts
- NFR-S7: Payment data handling Never store card data (Stripe handles)
- NFR-S8: Receipt photo storage Encrypted, user-owned, deletable
- NFR-S9: Rate limiting 100 requests/min per user
- NFR-S10: GDPR data export <48 hours fulfillment
- NFR-S11: GDPR data deletion <30 days complete removal
- NFR-S12: Audit logging All admin actions logged with timestamp

**Scalability (NFR-SC1 to NFR-SC7)**
- NFR-SC1: Initial capacity 1,000 concurrent users
- NFR-SC2: 12-month capacity 10,000 concurrent users
- NFR-SC3: Database growth Handle 1M+ price records
- NFR-SC4: Receipt storage 100GB+ image storage
- NFR-SC5: Graceful degradation Core features work if non-critical services down
- NFR-SC6: Horizontal scaling Vercel auto-scales on demand
- NFR-SC7: Database connection pooling Supabase managed

**Reliability (NFR-R1 to NFR-R10)**
- NFR-R1: System uptime 99.5% (excl. planned maintenance)
- NFR-R2: Offline functionality 100% core features (stock, list, budget)
- NFR-R3: Data sync reliability Zero data loss on sync
- NFR-R4: Conflict resolution Last-write-wins with merge for lists
- NFR-R5: Crash-free sessions 99.5%+
- NFR-R6: Receipt processing retry Auto-retry 3x on failure
- NFR-R7: Payment webhook reliability Idempotent processing
- NFR-R8: Backup frequency Daily database backups
- NFR-R9: Recovery point objective (RPO) <24 hours
- NFR-R10: Recovery time objective (RTO) <4 hours

**Accessibility (NFR-A1 to NFR-A8)**
- NFR-A1: WCAG compliance Level AA
- NFR-A2: Screen reader support Full navigation and actions
- NFR-A3: Color contrast ratio 4.5:1 minimum (text)
- NFR-A4: Touch target size 44x44px minimum
- NFR-A5: Keyboard navigation Full functionality
- NFR-A6: Reduced motion support Respect prefers-reduced-motion
- NFR-A7: Font scaling Support up to 200%
- NFR-A8: Error messaging Clear, actionable error states

**Integration (NFR-I1 to NFR-I6)**
- NFR-I1: Stripe webhook latency Process within 5 seconds
- NFR-I2: Supabase Realtime <1 second sync propagation
- NFR-I3: Gemini API fallback Graceful degradation if unavailable
- NFR-I4: Google Places timeout 3 second timeout, fallback to manual
- NFR-I5: Third-party monitoring Alert on integration failures
- NFR-I6: API versioning Support deprecated APIs for 6 months

**PWA-Specific (NFR-PWA1 to NFR-PWA6)**
- NFR-PWA1: Lighthouse PWA score 100
- NFR-PWA2: Service Worker coverage All critical routes cached
- NFR-PWA3: Install prompt Show after 2 sessions
- NFR-PWA4: IndexedDB storage <50MB typical usage
- NFR-PWA5: Cache invalidation Version-based, max 7-day stale
- NFR-PWA6: Background sync queue Persist across app restarts

### Additional Requirements

**From Architecture - Starter Template (CRITICAL for Epic 1 Story 1):**
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

**Technology Decisions from Architecture:**
- Next.js 16 (App Router) - updated from PRD's 14
- Serwist for PWA (replaces unmaintained next-pwa)
- Dexie.js for IndexedDB (offline storage)
- Zod for validation (shared client/server)
- Server Actions for internal mutations
- API Routes for external endpoints (Stripe webhooks, GDPR)
- Feature module organization (13 modules mapped to PRD domains)

**Implementation Patterns from Architecture:**
- Database naming: snake_case, plural tables
- API routes: kebab-case
- Code: PascalCase components, camelCase utilities
- Money stored as integers (pence)
- Dates as ISO 8601 strings
- ActionResult<T> return type for all Server Actions
- Query key factory for TanStack Query
- Optimistic updates for user-facing mutations

**From UX Design Specification:**
- Mobile-first responsive strategy (Mobile P0, Tablet P1, Desktop P2)
- WCAG 2.1 AA compliance required
- Touch targets 44x44px minimum
- Safe Zone colors: Green (#10B981), Amber (#F59E0B), Red (#EF4444)
- Safe Zone requires icons + color (never color alone for accessibility)
- Animations via Framer Motion (respect prefers-reduced-motion)
- Celebrations: 1 second max, muted colors, adult-appropriate
- Sound design: subtle, confirmatory, never attention-demanding

**Custom Components from UX (Priority Order):**
- P0: BudgetRing, SafeZoneGlow, SwipeableListItem, ConfettiCelebration
- P1: StockLevelPicker, StickyBudgetBar, BudgetDial
- P2: ReceiptScanner, ReconciliationView, WeeklyDigest, CategoryChart

**Design System:**
- Tailwind CSS + shadcn/ui foundation
- Phosphor Icons
- Orange brand color (#FF6B35)
- Inter font (headings 700, body 400/500)
- JetBrains Mono for prices/numbers
- 12px border radius for warmth
- Card-heavy layout (Direction 1) selected

### FR Coverage Map

| FR Range | Epic | Domain |
|----------|------|--------|
| FR1-7 | Epic 2 | User Account Management |
| FR8-15 | Epic 3 | Pantry Stock Tracking |
| FR16 | Epic 2 | Onboarding (seeded products) |
| FR17-31 | Epic 4 | Shopping List Management |
| FR32-39 | Epic 4 | Budget Control |
| FR40-51 | Epic 6 | Receipt Processing |
| FR52-57 | Epic 6 | Price Intelligence |
| FR58-64 | Epic 7 | Insights & Analytics |
| FR65-74 | Epic 8 | Subscription & Payments |
| FR75-79 | Epic 9 | Location & Store Intelligence |
| FR80-84 | Epic 5 | Cross-Device & Offline |
| FR85-89 | Epic 2 | Onboarding |
| FR90-95 | Epic 7 | Feedback & Celebrations |
| FR96-190 | Epic 10 | Admin Dashboard |

**Coverage Summary:** 190/190 FRs mapped (100%)

---

## Epic List

### Epic 1: Project Foundation & PWA Setup
**Goal:** Establish the technical foundation with a fully configured Next.js 16 PWA, Supabase backend, and offline-first architecture ready for feature development.

**User Outcome:** Installable PWA shell with auth infrastructure, offline capability foundation, and complete project structure per Architecture document.

**Technical Scope:**
- Project initialization via create-next-app
- All dependencies installed per Architecture
- Supabase project with database schema and RLS policies
- Serwist PWA configuration with service worker
- Dexie.js offline storage layer
- TanStack Query + Zustand state management setup
- Design system foundation (Tailwind + shadcn/ui)
- CI/CD pipeline configuration

**FRs Covered:** Infrastructure (enables all FRs)
**NFRs Addressed:** NFR-P1, NFR-P10, NFR-PWA1-6, NFR-S1-3

---

### Epic 2: User Authentication & Onboarding
**Goal:** Enable users to create accounts, sign in securely, and complete an engaging onboarding experience in under 90 seconds.

**User Outcome:** Users can register, login, reset passwords, and start with a pre-populated pantry of UK staples after completing the animated onboarding flow.

**FRs Covered:** FR1-7, FR16, FR85-89 (13 FRs)
**NFRs Addressed:** NFR-S3-5, NFR-A1-8

---

### Epic 3: Pantry Stock Tracker
**Goal:** Enable users to track their home inventory with satisfying interactions and automatic list population.

**User Outcome:** Users can view pantry grid, tap-and-hold to change stock levels with liquid drain animation, swipe to quick-decrease, and see "Out" items automatically added to shopping lists.

**FRs Covered:** FR8-15 (8 FRs)
**NFRs Addressed:** NFR-P7, NFR-A4

---

### Epic 4: Shopping Lists & Budget Control
**Goal:** Enable users to create shopping lists with real-time budget tracking and the signature Safe Zone experience.

**User Outcome:** Users can create lists, set budgets, see Safe Zone glow (green/amber/red), check off items with <100ms budget updates, manage impulse fund, and receive smart suggestions when over budget.

**FRs Covered:** FR17-39 (23 FRs)
**NFRs Addressed:** NFR-P2-3, NFR-P7, NFR-A1-8

---

### Epic 5: Offline-First Experience
**Goal:** Enable full app functionality in stores with poor connectivity through robust offline support and seamless sync.

**User Outcome:** Users can use all core features (pantry, lists, budget) offline. Changes queue automatically and sync when online. Cross-device access works seamlessly.

**FRs Covered:** FR80-84 (5 FRs)
**NFRs Addressed:** NFR-P8, NFR-R2-4, NFR-PWA4-6, NFR-I2

---

### Epic 6: Receipt Processing & Price Intelligence
**Goal:** Enable users to scan receipts and build personal + crowdsourced price intelligence for better estimates.

**User Outcome:** Users can capture receipts with camera, see AI-parsed items, correct mistakes, view planned vs actual reconciliation, and get increasingly accurate price estimates over time.

**FRs Covered:** FR40-57 (18 FRs)
**NFRs Addressed:** NFR-P4-6, NFR-R6, NFR-I3, NFR-SC3

---

### Epic 7: Insights & Progress Tracking
**Goal:** Enable users to understand their spending patterns and feel rewarded for staying under budget.

**User Outcome:** Users can view weekly/monthly spending insights, category breakdowns, budget adherence stats, streaks, and experience satisfying celebrations (confetti, sounds, haptics) when completing trips under budget.

**FRs Covered:** FR58-64, FR90-95 (13 FRs)
**NFRs Addressed:** NFR-P7, NFR-A6

---

### Epic 8: Subscription & Monetization
**Goal:** Enable sustainable monetization through Stripe subscriptions with loyalty point incentives.

**User Outcome:** Users can subscribe (monthly/annual), earn loyalty points from receipt scans, get discounts up to 50%, and manage their subscription status.

**FRs Covered:** FR65-74 (10 FRs)
**NFRs Addressed:** NFR-S7, NFR-I1, NFR-R7

---

### Epic 9: Location & Store Intelligence
**Goal:** Enable smart location-based features for currency detection and store association.

**User Outcome:** App auto-detects country and currency, users can associate lists with specific stores, and optionally enable store detection for auto-features.

**FRs Covered:** FR75-79 (5 FRs)
**NFRs Addressed:** NFR-I4

---

### Epic 10: Admin Dashboard
**Goal:** Provide complete back-office capabilities for managing users, content, analytics, and system configuration.

**User Outcome:** Admins can manage users, view analytics, handle support requests, manage prices/receipts, configure features, and export reports.

**FRs Covered:** FR96-190 (95 FRs)
**NFRs Addressed:** NFR-S6, NFR-S10-12, NFR-SC1-2

---
---

# Detailed Stories by Epic

## Epic 1: Project Foundation & PWA Setup

### Story 1.1: Initialize Next.js Project with Core Dependencies

**As a** developer,
**I want** a properly initialized Next.js 16 project with all core dependencies,
**So that** I have a solid foundation for building the Oja PWA.

**Acceptance Criteria:**

**Given** a clean development environment
**When** I run the project initialization commands
**Then** a Next.js 16 project is created with TypeScript, Tailwind CSS, ESLint, App Router, and src directory structure
**And** all core dependencies are installed (@supabase/supabase-js, @supabase/ssr, zustand, @tanstack/react-query, framer-motion, zod, dexie, phosphor-react, stripe, @stripe/stripe-js, posthog-js, tesseract.js, @google/generative-ai)
**And** the project structure matches the Architecture document
**And** `npm run dev` starts the development server without errors
**And** `npm run build` completes successfully

---

### Story 1.2: Configure Serwist PWA with Service Worker

**As a** user,
**I want** to install Oja as a PWA on my device,
**So that** I can access it like a native app with offline capabilities.

**Acceptance Criteria:**

**Given** the initialized Next.js project
**When** Serwist PWA is configured
**Then** `app/manifest.ts` exports a valid PWA manifest with app name "Oja", orange theme color (#FF6B35), and required icons
**And** `src/app/sw.ts` configures the service worker with precaching for static assets
**And** `serwist.config.ts` is properly configured for Next.js integration
**And** Lighthouse PWA audit scores 100
**And** the app can be installed on mobile devices via "Add to Home Screen"
**And** the app works offline (shows cached shell)

---

### Story 1.3: Set Up Supabase Project with Core Schema

**As a** developer,
**I want** a Supabase project with the core database schema,
**So that** I have authentication and data storage ready for feature development.

**Acceptance Criteria:**

**Given** the Next.js project with Supabase dependencies
**When** Supabase is configured
**Then** `.env.local` contains NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY
**And** `lib/supabase/client.ts` exports a browser Supabase client
**And** `lib/supabase/server.ts` exports a server Supabase client using cookies
**And** `middleware.ts` handles session refresh for authenticated routes
**And** Supabase Auth is configured with email/password provider
**And** initial migration creates `profiles` table with RLS policies (users can only read/update their own profile)
**And** TypeScript types are generated from the database schema

---

### Story 1.4: Configure Dexie.js Offline Storage Layer

**As a** user,
**I want** my data to be available offline,
**So that** I can use Oja in stores with poor connectivity.

**Acceptance Criteria:**

**Given** the configured Supabase project
**When** Dexie.js is set up
**Then** `lib/db/index.ts` exports a Dexie database instance with versioned schema
**And** `lib/db/syncQueue.ts` implements a queue for offline changes
**And** offline changes are persisted to IndexedDB
**And** the sync queue processes when the app comes online
**And** IndexedDB storage usage is under 50MB for typical usage

---

### Story 1.5: Set Up TanStack Query and Zustand State Management

**As a** developer,
**I want** configured state management libraries,
**So that** I can efficiently manage server and client state.

**Acceptance Criteria:**

**Given** the offline storage layer
**When** state management is configured
**Then** `lib/query/client.ts` exports a QueryClient with default options (staleTime, gcTime, retry logic)
**And** `lib/query/keys.ts` exports a query key factory following Architecture patterns
**And** `lib/query/QueryProvider.tsx` wraps the app with QueryClientProvider
**And** `lib/stores/uiStore.ts` creates a Zustand store for UI state (offline status, modals)
**And** optimistic update patterns are documented and ready for use

---

### Story 1.6: Establish Design System Foundation

**As a** developer,
**I want** a configured design system with core UI components,
**So that** I can build consistent, accessible interfaces.

**Acceptance Criteria:**

**Given** the state management setup
**When** the design system is established
**Then** `tailwind.config.ts` includes Oja brand colors (orange #FF6B35, charcoal #2D3436, warm-white #FFFAF8, Safe Zone colors)
**And** `globals.css` imports Inter and JetBrains Mono fonts
**And** `components/ui/Button.tsx` implements primary, secondary, ghost, and destructive variants with 44px minimum touch targets
**And** `components/ui/Card.tsx` implements the card component with 12px border radius
**And** `components/ui/Input.tsx` implements accessible form inputs
**And** all components support reduced motion preferences
**And** color contrast meets WCAG AA (4.5:1 minimum)

---

### Story 1.7: Configure CI/CD and Development Tooling

**As a** developer,
**I want** automated testing and deployment pipelines,
**So that** I can maintain code quality and deploy confidently.

**Acceptance Criteria:**

**Given** the design system foundation
**When** CI/CD is configured
**Then** `.github/workflows/ci.yml` runs linting, type checking, and tests on pull requests
**And** Vercel project is connected for automatic preview deployments
**And** Environment variables are configured for development, preview, and production
**And** `.env.example` documents all required environment variables
**And** ESLint and Prettier are configured with Architecture naming conventions enforced
**And** Husky pre-commit hooks run linting

---

## Epic 2: User Authentication & Onboarding

### Story 2.1: User Registration with Email

**As a** new user,
**I want** to create an account with my email and password,
**So that** I can start using Oja to manage my shopping.

**Acceptance Criteria:**

**Given** I am on the registration page
**When** I enter a valid email and password (min 8 chars, complexity check)
**Then** my account is created in Supabase Auth
**And** a profile record is created in the profiles table
**And** I receive a 7-day free trial with full access (FR5)
**And** I am redirected to the onboarding flow
**And** validation errors display inline for invalid inputs (NFR-A8)

**Given** I enter an email that already exists
**When** I submit the form
**Then** I see a helpful error message suggesting to sign in instead

---

### Story 2.2: User Login with Password

**As a** returning user,
**I want** to sign in to my account,
**So that** I can access my pantry and shopping lists.

**Acceptance Criteria:**

**Given** I am on the login page
**When** I enter valid credentials
**Then** I am authenticated and redirected to the pantry (home)
**And** my session is stored in httpOnly cookies (NFR-S3)
**And** "Remember me" extends session to 30 days (NFR-S5)

**Given** I enter invalid credentials
**When** I submit the form
**Then** I see a generic error message (not revealing which field is wrong)
**And** I can retry after a brief delay (rate limiting)

---

### Story 2.3: Password Reset Flow

**As a** user who forgot my password,
**I want** to reset it via email,
**So that** I can regain access to my account.

**Acceptance Criteria:**

**Given** I am on the forgot password page
**When** I enter my registered email
**Then** a password reset email is sent
**And** I see confirmation that email was sent (even if email doesn't exist, for security)

**Given** I click the reset link in my email
**When** I enter a new valid password
**Then** my password is updated
**And** I am redirected to login with success message

---

### Story 2.4: User Sign Out

**As a** signed-in user,
**I want** to sign out from my current device,
**So that** I can secure my account on shared devices.

**Acceptance Criteria:**

**Given** I am signed in
**When** I tap "Sign Out" in settings
**Then** my session is invalidated
**And** I am redirected to the login page
**And** my local cached data remains (for offline access if I sign back in)

---

### Story 2.5: Animated Welcome Experience

**As a** new user,
**I want** an engaging welcome experience,
**So that** I feel excited to use Oja and understand its value.

**Acceptance Criteria:**

**Given** I have just registered
**When** I enter the onboarding flow
**Then** I see an animated welcome screen with Oja branding
**And** animations use Framer Motion at 60fps (NFR-P7)
**And** animations respect prefers-reduced-motion (NFR-A6)
**And** I can proceed to the next step with a single tap

---

### Story 2.6: Seeded Products Selection

**As a** new UK user,
**I want** to start with pre-populated pantry items,
**So that** I don't have to manually add common staples.

**Acceptance Criteria:**

**Given** I am in the onboarding flow
**When** I reach the products selection step
**Then** I see a list of UK staple items (milk, bread, eggs, etc.) pre-selected
**And** I can tap to deselect items I don't buy
**And** I can search/filter the list
**And** selected items will be added to my pantry after onboarding

**Given** I complete product selection
**When** I proceed
**Then** the `stock_items` table is created with my selected items at "Stocked" level
**And** each item has a default category assigned

---

### Story 2.7: Budget Setting with Haptic Dial

**As a** new user,
**I want** to set my default weekly budget,
**So that** Oja can help me stay within my spending limits.

**Acceptance Criteria:**

**Given** I am in the onboarding flow
**When** I reach the budget setting step
**Then** I see a dial/slider to set my weekly budget
**And** haptic feedback triggers on round numbers (10, 20, etc.) (FR91)
**And** the dial shows the Safe Zone preview (green glow)
**And** I can skip this step if I prefer (FR89)

**Given** I set a budget and continue
**When** I complete onboarding
**Then** my default budget is saved to my profile

---

### Story 2.8: Location Permission Request

**As a** new user,
**I want** to optionally enable location services,
**So that** Oja can auto-detect my currency and nearby stores.

**Acceptance Criteria:**

**Given** I am in the onboarding flow
**When** I reach the location permission step
**Then** I see a clear explanation of why location is useful
**And** I can grant permission with one tap
**And** I can select "Maybe Later" to skip (FR88, FR89)
**And** if granted, my country/currency is auto-detected

---

### Story 2.9: Onboarding Completion

**As a** new user,
**I want** to complete onboarding in under 90 seconds,
**So that** I can start using Oja immediately.

**Acceptance Criteria:**

**Given** I have completed all onboarding steps
**When** I finish the flow
**Then** I see a "Ready to Shop!" confirmation
**And** my pantry is populated with selected seeded items
**And** I am redirected to the pantry screen
**And** total onboarding time is under 90 seconds for typical user

---

### Story 2.10: Subscription Status Management

**As a** user,
**I want** to view and manage my subscription status,
**So that** I know what features I have access to.

**Acceptance Criteria:**

**Given** I am signed in
**When** I navigate to Settings > Subscription
**Then** I see my current plan (Trial, Free, Monthly, Annual)
**And** I see trial days remaining if applicable
**And** I see which features are available/restricted
**And** I can navigate to upgrade options

---

### Story 2.11: Account Deletion

**As a** user,
**I want** to delete my account and all associated data,
**So that** I can exercise my GDPR rights.

**Acceptance Criteria:**

**Given** I am in Settings > Account
**When** I tap "Delete Account"
**Then** I see a confirmation dialog explaining consequences
**And** I must type "DELETE" to confirm

**Given** I confirm deletion
**When** the process completes
**Then** my account is deactivated immediately
**And** all my data is queued for permanent deletion within 30 days (NFR-S11)
**And** I am signed out and redirected to the landing page

---

## Epic 3: Pantry Stock Tracker

### Story 3.1: View Pantry Grid

**As a** user,
**I want** to view all my tracked stock items in a grid,
**So that** I can see what I have at home at a glance.

**Acceptance Criteria:**

**Given** I am signed in and on the Pantry tab
**When** the page loads
**Then** I see all my stock items displayed in a responsive grid
**And** each item shows name, category icon, and current stock level indicator
**And** items are grouped by category (optionally)
**And** the grid loads in under 2 seconds (NFR-P1)
**And** empty state shows helpful message with "Add Item" CTA

---

### Story 3.2: Add New Pantry Item

**As a** user,
**I want** to add new items to my pantry,
**So that** I can track more of my household inventory.

**Acceptance Criteria:**

**Given** I am on the Pantry screen
**When** I tap the "+" FAB button
**Then** I see an "Add Item" sheet/modal

**Given** I enter item name
**When** I submit the form
**Then** the item is added to my pantry with "Stocked" level
**And** the item appears in the grid immediately (optimistic update)
**And** the `stock_items` table is updated
**And** I can optionally set category and initial stock level

---

### Story 3.3: Stock Level Display with Visual Indicators

**As a** user,
**I want** to see visual indicators of stock levels,
**So that** I can quickly understand what needs restocking.

**Acceptance Criteria:**

**Given** I am viewing the pantry grid
**When** items have different stock levels
**Then** "Stocked" items show full indicator (green)
**And** "Good" items show 75% indicator
**And** "Low" items show 25% indicator (amber)
**And** "Out" items show empty indicator (red)
**And** indicators use Phosphor Icons with appropriate fill weights

---

### Story 3.4: Change Stock Level via Tap-and-Hold

**As a** user,
**I want** to change stock levels with a tap-and-hold gesture,
**So that** updating my pantry feels satisfying and intuitive.

**Acceptance Criteria:**

**Given** I am viewing a pantry item
**When** I tap and hold on the item
**Then** a StockLevelPicker appears with liquid drain animation (UX spec)
**And** I can select Stocked, Good, Low, or Out
**And** the animation runs at 60fps (NFR-P7)
**And** haptic feedback confirms selection (FR91)

**Given** I select a new stock level
**When** I release
**Then** the item updates immediately (optimistic)
**And** the change syncs to the database

---

### Story 3.5: Quick-Decrease Stock via Swipe

**As a** user,
**I want** to quickly decrease stock level with a swipe,
**So that** I can rapidly update multiple items.

**Acceptance Criteria:**

**Given** I am viewing a pantry item
**When** I swipe left on the item
**Then** the stock level decreases by one step (Stocked to Good to Low to Out)
**And** visual feedback shows the change
**And** I can undo with a shake gesture or undo button

---

### Story 3.6: Auto-Add Out Items to Shopping List

**As a** user,
**I want** "Out" items to automatically appear on my next shopping list,
**So that** I never forget to buy essentials.

**Acceptance Criteria:**

**Given** I have items marked as "Out" in my pantry
**When** I create a new shopping list
**Then** all "Out" items are automatically added to the list
**And** these items are marked as "auto-added" visually
**And** I can remove auto-added items if I don't want them

**Given** an item changes to "Out" status
**When** I have an active (non-completed) shopping list
**Then** the item is added to that list automatically
**And** I receive subtle notification of the addition

---

### Story 3.7: Assign Categories to Items

**As a** user,
**I want** to categorize my pantry items,
**So that** I can organize and find items easily.

**Acceptance Criteria:**

**Given** I am adding or editing a pantry item
**When** I tap the category field
**Then** I see a list of preset categories (Dairy, Produce, Meat, Bakery, Frozen, Pantry, Beverages, Household, Personal Care)
**And** I can select one category per item

**Given** I have categorized items
**When** I view the pantry
**Then** I can toggle category grouping on/off
**And** items display their category icon

---

### Story 3.8: Remove Pantry Item

**As a** user,
**I want** to remove items from my pantry,
**So that** I can keep my inventory accurate.

**Acceptance Criteria:**

**Given** I am viewing a pantry item
**When** I swipe right or tap edit and select "Remove"
**Then** I see a confirmation prompt
**And** if confirmed, the item is removed from my pantry
**And** the item is soft-deleted (can be restored within 7 days)

---

## Epic 4: Shopping Lists & Budget Control

### Story 4.1: Create New Shopping List

**As a** user,
**I want** to create a new shopping list,
**So that** I can plan my next shopping trip.

**Acceptance Criteria:**

**Given** I am on the Lists tab
**When** I tap "New List"
**Then** a new list is created with today's date as default name
**And** "Out" items from pantry are auto-added (FR13)
**And** I am taken to the list detail view
**And** the `shopping_lists` table is created/updated

**Given** I create a list
**When** I view the Lists tab
**Then** I see all my lists sorted by most recent

---

### Story 4.2: View All Shopping Lists

**As a** user,
**I want** to view all my shopping lists,
**So that** I can select which one to use or review past trips.

**Acceptance Criteria:**

**Given** I am on the Lists tab
**When** the page loads
**Then** I see all my active lists with name, item count, and budget status
**And** completed lists are shown separately or filtered
**And** I can tap a list to open its detail view

---

### Story 4.3: Add Items to Shopping List

**As a** user,
**I want** to add items to my shopping list,
**So that** I remember what to buy.

**Acceptance Criteria:**

**Given** I am viewing a shopping list
**When** I tap the "+" button
**Then** I can type to add a new item
**And** I see suggestions from my pantry items
**And** I see suggestions from price database with estimates

**Given** I add an item
**When** it appears on the list
**Then** it shows the item name and estimated price
**And** the running total updates immediately (<100ms) (NFR-P2)
**And** the `list_items` table is updated

---

### Story 4.4: Search and Add from Pantry

**As a** user,
**I want** to search my pantry when adding items,
**So that** I can quickly add tracked items with price estimates.

**Acceptance Criteria:**

**Given** I am adding items to a list
**When** I type a search term
**Then** matching pantry items appear in results (<200ms) (NFR-P9)
**And** pantry items show their last known price if available
**And** I can tap to add them to the list

---

### Story 4.5: Remove Items from Shopping List

**As a** user,
**I want** to remove items from my list,
**So that** I can adjust my shopping plan.

**Acceptance Criteria:**

**Given** I am viewing a shopping list
**When** I swipe left on an item and tap "Remove"
**Then** the item is removed from the list
**And** the running total updates immediately
**And** I can undo within 5 seconds

---

### Story 4.6: Check Off Items While Shopping

**As a** user,
**I want** to check off items as I shop,
**So that** I can track my progress and spending.

**Acceptance Criteria:**

**Given** I am viewing my shopping list
**When** I tap the checkbox on an item
**Then** the item is marked as checked with strikethrough
**And** the item fades to 60% opacity
**And** visual response is under 50ms (NFR-P3)
**And** the running total updates based on actual price (if different from estimate)

**Given** I check off an item
**When** I tap it again
**Then** it unchecks and returns to normal state

---

### Story 4.7: Edit Item Prices

**As a** user,
**I want** to edit estimated and actual prices,
**So that** my budget tracking is accurate.

**Acceptance Criteria:**

**Given** I am viewing a list item
**When** I tap the price
**Then** I can edit the estimated price before shopping
**And** I can edit the actual price when checking off

**Given** I update a price
**When** I save
**Then** the running total recalculates immediately
**And** my personal price history is updated

---

### Story 4.8: Set Item Priority

**As a** user,
**I want** to mark items as must-have or nice-to-have,
**So that** I know what to cut if I'm over budget.

**Acceptance Criteria:**

**Given** I am viewing a list item
**When** I swipe right
**Then** the item toggles between must-have (default) and nice-to-have
**And** nice-to-have items show a visual indicator (lighter styling)

**Given** I have prioritized items
**When** I view the list
**Then** must-have items appear at the top
**And** nice-to-have items appear in a separate section

---

### Story 4.9: View Running Total

**As a** user,
**I want** to see my running total at all times,
**So that** I know how much I'm spending.

**Acceptance Criteria:**

**Given** I am viewing a shopping list with items
**When** items are added, removed, or checked
**Then** the running total updates in under 100ms (NFR-P2)
**And** the total is displayed prominently (StickyBudgetBar when scrolling)
**And** checked items use actual prices, unchecked use estimates

---

### Story 4.10: Set Budget for Shopping List

**As a** user,
**I want** to set a budget for my shopping trip,
**So that** I can control my spending.

**Acceptance Criteria:**

**Given** I am viewing or creating a shopping list
**When** I tap "Set Budget"
**Then** I see a budget input with my default budget pre-filled
**And** I can adjust the amount
**And** the Safe Zone indicator appears once budget is set

---

### Story 4.11: Safe Zone Indicator

**As a** user,
**I want** to see a visual indicator of my budget status,
**So that** I feel in control without doing mental math.

**Acceptance Criteria:**

**Given** I have set a budget for my list
**When** my running total is under 80% of budget
**Then** the Safe Zone glows green (#10B981)
**And** the BudgetRing shows green progress

**Given** my running total is 80-100% of budget
**When** I view the list
**Then** the Safe Zone shifts to amber (#F59E0B)
**And** I see "Getting close" message

**Given** my running total exceeds budget
**When** I view the list
**Then** the Safe Zone turns red (#EF4444)
**And** I see "Let's review" message (supportive, not shaming)
**And** icons accompany colors for accessibility (NFR-A3)

---

### Story 4.12: Budget Lock Mode

**As a** user,
**I want** to enable a hard budget cap,
**So that** I physically cannot add items that exceed my budget.

**Acceptance Criteria:**

**Given** I have set a budget
**When** I enable Budget Lock Mode
**Then** a lock icon appears on the budget display

**Given** Budget Lock is enabled
**When** I try to add an item that would exceed budget
**Then** I see a warning before adding
**And** the system suggests removing nice-to-have items first

---

### Story 4.13: Impulse Fund

**As a** user,
**I want** a separate "impulse fund" budget,
**So that** I can buy unplanned items without breaking my main budget.

**Acceptance Criteria:**

**Given** I am setting up my shopping list
**When** I tap "Add Impulse Fund"
**Then** I can set a separate amount (e.g., 10)

**Given** I have an impulse fund
**When** I add an item and mark it as "impulse"
**Then** it deducts from impulse fund, not main budget
**And** both budgets display separately

---

### Story 4.14: Smart Suggestions When Over Budget

**As a** user,
**I want** the app to suggest what to remove when over budget,
**So that** I can quickly get back under budget.

**Acceptance Criteria:**

**Given** I am over budget
**When** I view the list
**Then** nice-to-have items are highlighted as removal candidates
**And** I see "Remove X to save Y" suggestions
**And** I can tap to remove suggested items quickly

---

### Story 4.15: Archive Completed Shopping List

**As a** user,
**I want** to mark my shopping trip as complete,
**So that** I can archive it and update my pantry.

**Acceptance Criteria:**

**Given** I have checked off items on my list
**When** I tap "Complete Trip"
**Then** the list is archived with completion timestamp
**And** checked items update pantry to "Stocked" level (FR31)
**And** I see brief celebration if under budget (1 second confetti)

---

### Story 4.16: View Archived Lists (Trip History)

**As a** user,
**I want** to view my past shopping trips,
**So that** I can review my spending history.

**Acceptance Criteria:**

**Given** I have completed shopping trips
**When** I navigate to Lists > History
**Then** I see archived lists with date, store, total spent, and budget status
**And** I can tap to view full details
**And** I can search/filter by date range

---

## Epic 5: Offline-First Experience

### Story 5.1: Offline Detection and Status

**As a** user,
**I want** to know when I'm offline,
**So that** I understand my data will sync later.

**Acceptance Criteria:**

**Given** my device loses internet connection
**When** the app detects offline status (<500ms detection) (NFR-P8)
**Then** a subtle offline indicator appears (not alarming)
**And** the indicator says "Offline - changes will sync"
**And** all core features remain functional

**Given** my device reconnects
**When** the app detects online status
**Then** the offline indicator disappears
**And** queued changes begin syncing

---

### Story 5.2: Offline Pantry Operations

**As a** user,
**I want** to update my pantry while offline,
**So that** I can track stock in stores with bad signal.

**Acceptance Criteria:**

**Given** I am offline
**When** I change a stock level
**Then** the change is saved to IndexedDB immediately
**And** the change is added to the sync queue
**And** the UI updates optimistically

**Given** I come back online
**When** the sync queue processes
**Then** my changes are synced to Supabase
**And** conflicts are resolved with last-write-wins

---

### Story 5.3: Offline Shopping List Operations

**As a** user,
**I want** to use my shopping list while offline,
**So that** I can shop even without internet.

**Acceptance Criteria:**

**Given** I am offline with a shopping list loaded
**When** I check off items
**Then** changes persist to IndexedDB
**And** running total updates correctly
**And** Safe Zone indicator works

**Given** I add or remove items offline
**When** I come back online
**Then** all changes sync to the server
**And** the list merges correctly with any server changes

---

### Story 5.4: Cross-Device Sync

**As a** user,
**I want** my data to sync across devices,
**So that** I can start on my phone and continue on my tablet.

**Acceptance Criteria:**

**Given** I am signed in on multiple devices
**When** I make a change on Device A
**Then** the change appears on Device B within 1 second (NFR-I2)
**And** Supabase Realtime subscriptions handle the sync

**Given** I make changes on both devices simultaneously
**When** changes sync
**Then** conflicts are resolved gracefully
**And** no data is lost (NFR-R3)

---

### Story 5.5: Sync Queue Management

**As a** user,
**I want** my offline changes to sync reliably,
**So that** I never lose data.

**Acceptance Criteria:**

**Given** I made changes while offline
**When** I come online
**Then** the sync queue processes in order
**And** failed syncs retry up to 3 times
**And** I can see sync status in settings if needed

**Given** a sync permanently fails
**When** retries are exhausted
**Then** I am notified of the failure
**And** I can manually retry or discard the change
**And** the queue persists across app restarts (NFR-PWA6)

---

## Epic 6: Receipt Processing & Price Intelligence

### Story 6.1: Capture Receipt Photo

**As a** user,
**I want** to take a photo of my receipt,
**So that** I can automatically extract purchase data.

**Acceptance Criteria:**

**Given** I am on the Scan tab or completing a trip
**When** I tap "Scan Receipt"
**Then** the camera opens with a receipt frame guide
**And** camera preview appears in under 1 second (NFR-P4)

**Given** the camera is active
**When** a receipt is detected
**Then** the photo auto-captures
**And** I can also manually tap to capture

---

### Story 6.2: OCR Processing

**As a** user,
**I want** the app to read text from my receipt,
**So that** I don't have to type everything manually.

**Acceptance Criteria:**

**Given** I have captured a receipt photo
**When** processing begins
**Then** Tesseract.js performs OCR on the image
**And** processing completes in under 5 seconds (NFR-P5)
**And** I see a progress indicator

**Given** OCR confidence is below 60%
**When** processing completes
**Then** I am warned about low quality
**And** I can retake or proceed with manual entry

---

### Story 6.3: AI Receipt Parsing

**As a** user,
**I want** AI to structure the receipt data,
**So that** items and prices are automatically extracted.

**Acceptance Criteria:**

**Given** OCR text is extracted
**When** AI parsing runs (Gemini 1.5 Flash)
**Then** store name, date, items, prices, and total are extracted
**And** parsing completes in under 3 seconds (NFR-P6)

**Given** AI parsing fails or is unavailable
**When** I see the error
**Then** I can proceed with manual entry
**And** the receipt photo is saved for later processing (NFR-I3)

---

### Story 6.4: Review and Correct Parsed Data

**As a** user,
**I want** to review and correct AI-parsed receipt data,
**So that** my price history is accurate.

**Acceptance Criteria:**

**Given** AI has parsed my receipt
**When** I see the reconciliation view
**Then** items show: green (matched to list), yellow (partial match), red (not matched)
**And** I can tap any item to edit name or price
**And** I can add missing items manually (FR44)

---

### Story 6.5: Planned vs Actual Reconciliation

**As a** user,
**I want** to see what I planned vs what I bought,
**So that** I can learn from my shopping behavior.

**Acceptance Criteria:**

**Given** a receipt is matched to a shopping list
**When** I view reconciliation
**Then** I see items bought but not on list ("missed items") (FR46)
**And** I see items on list but not bought ("skipped items") (FR47)
**And** I see price variance (estimated vs actual)

---

### Story 6.6: Receipt Validation Rules

**As the** system,
**I want** to validate receipts before awarding points,
**So that** the price database maintains quality.

**Acceptance Criteria:**

**Given** a receipt is submitted
**When** validation runs
**Then** receipts older than 3 days are rejected (FR49)
**And** receipts with <60% OCR confidence are rejected (FR50)
**And** duplicate receipts (same store+date+total) are rejected (FR51)
**And** rejected receipts can still be saved without points (FR48)
**And** clear rejection reasons are shown to the user

---

### Story 6.7: Personal Price History

**As a** user,
**I want** to build my personal price history,
**So that** I get better estimates over time.

**Acceptance Criteria:**

**Given** I confirm a receipt
**When** items are saved
**Then** prices are stored in my personal price history (FR52)
**And** prices are associated with store and date

**Given** I add an item to a shopping list
**When** the item has price history
**Then** my personal price is used for the estimate (FR53)

---

### Story 6.8: Price Estimates with Confidence

**As a** user,
**I want** to see how confident the price estimate is,
**So that** I can adjust if needed.

**Acceptance Criteria:**

**Given** I add an item to a list
**When** a price estimate is shown
**Then** I see a confidence indicator (high/medium/low) (FR55)
**And** high confidence = my recent personal price
**And** medium confidence = crowdsourced average
**And** low confidence = generic estimate

---

### Story 6.9: Contribute to Crowdsourced Prices

**As a** user,
**I want** my prices to help other shoppers,
**So that** we all get better estimates.

**Acceptance Criteria:**

**Given** I confirm a validated receipt
**When** prices are saved
**Then** valid prices are contributed to the crowdsourced database (FR54)
**And** contribution is anonymous
**And** prices include store and date

---

### Story 6.10: View Item Price History

**As a** user,
**I want** to see price history for specific items,
**So that** I can track price changes over time.

**Acceptance Criteria:**

**Given** I am viewing an item in my pantry or list
**When** I tap "Price History"
**Then** I see a list of prices I've paid with dates and stores
**And** I see the average and range
**And** I see crowdsourced average for comparison

---

### Story 6.11: Recency-Weighted Price Averages

**As the** system,
**I want** to weight recent prices higher,
**So that** estimates reflect current market prices.

**Acceptance Criteria:**

**Given** crowdsourced price data exists for an item
**When** calculating the estimate
**Then** prices from last 7 days have highest weight
**And** prices older than 30 days have lowest weight
**And** stale prices (>90 days) are excluded (FR57)

---

## Epic 7: Insights & Progress Tracking

### Story 7.1: Weekly Spending Digest

**As a** user,
**I want** to see my weekly spending summary,
**So that** I can track my grocery spending habits.

**Acceptance Criteria:**

**Given** I have completed shopping trips
**When** I navigate to Insights tab
**Then** I see my weekly spending digest
**And** it shows total spent, trips count, and budget adherence
**And** data is presented cleanly without forced gamification (David persona)

---

### Story 7.2: Monthly Trend Reports

**As a** user,
**I want** to see monthly spending trends,
**So that** I can understand my long-term patterns.

**Acceptance Criteria:**

**Given** I have multiple weeks of data
**When** I view monthly insights
**Then** I see spending trend over weeks
**And** I see comparison to previous month
**And** I see average trip cost

---

### Story 7.3: Category Breakdown

**As a** user,
**I want** to see spending by category,
**So that** I know where my money goes.

**Acceptance Criteria:**

**Given** I have categorized purchases
**When** I view category breakdown
**Then** I see spending per category (Dairy, Produce, etc.)
**And** I see percentage of total
**And** visualization is a simple bar chart (CategoryChart component)

---

### Story 7.4: Budget Adherence Statistics

**As a** user,
**I want** to see how often I stay under budget,
**So that** I can track my improvement.

**Acceptance Criteria:**

**Given** I have completed trips with budgets set
**When** I view budget adherence stats
**Then** I see trips under budget / total trips (FR61)
**And** I see total savings achieved (FR62)
**And** I see current streak of under-budget trips

---

### Story 7.5: Progress Indicators

**As a** user,
**I want** to see my progress without childish gamification,
**So that** I feel motivated as an adult.

**Acceptance Criteria:**

**Given** I have usage history
**When** I view progress section
**Then** I see data-focused progress bars (not badges/XP)
**And** I see "4/5 trips under budget" format
**And** I see streak count (weeks)
**And** language is informative, not congratulatory (FR63)

---

### Story 7.6: Price Contribution Count

**As a** user,
**I want** to see how many prices I've contributed,
**So that** I feel part of the community.

**Acceptance Criteria:**

**Given** I have scanned receipts
**When** I view my contribution stats
**Then** I see "Your prices helped X shoppers this month" (FR64)
**And** I see total prices contributed
**And** message creates belonging without competition

---

### Story 7.7: Celebration on Under-Budget Completion

**As a** user,
**I want** a satisfying celebration when I finish under budget,
**So that** I feel rewarded for my discipline.

**Acceptance Criteria:**

**Given** I complete a shopping trip
**When** I am under budget
**Then** brief confetti animation plays (1 second max)
**And** a warm confirmation tone plays (if sounds enabled)
**And** I see "X.XX under budget" message
**And** confetti uses muted orange/grey colors
**And** animation respects prefers-reduced-motion (NFR-A6)

---

### Story 7.8: Sound and Haptic Feedback Settings

**As a** user,
**I want** to control sounds and haptics,
**So that** I can customize my experience.

**Acceptance Criteria:**

**Given** I am in Settings
**When** I view Feedback settings
**Then** I can toggle sounds on/off (FR93)
**And** I can toggle haptics on/off (FR94)
**And** I can enable "Quiet Mode" to auto-mute in stores (FR95)

---

### Story 7.9: Subtle Sound Design

**As a** user,
**I want** subtle, professional sounds,
**So that** the app feels premium, not gamey.

**Acceptance Criteria:**

**Given** sounds are enabled
**When** I perform actions
**Then** adding items plays a soft tap sound
**And** checking off items plays a gentle tick
**And** completing under budget plays a warm chord
**And** no sounds draw attention in public
**And** sounds are stored in `/public/sounds/`

---

### Story 7.10: Haptic Feedback on Key Interactions

**As a** user,
**I want** subtle haptic feedback,
**So that** interactions feel tactile and satisfying.

**Acceptance Criteria:**

**Given** haptics are enabled
**When** I interact with the app
**Then** stock level changes trigger haptic feedback
**And** budget dial triggers haptic on round numbers
**And** celebrations include brief vibration
**And** feedback is subtle, not jarring

---

## Epic 8: Subscription & Monetization

### Story 8.1: Stripe Integration Setup

**As a** developer,
**I want** Stripe properly integrated,
**So that** we can process subscription payments.

**Acceptance Criteria:**

**Given** the project configuration
**When** Stripe is set up
**Then** environment variables include STRIPE_SECRET_KEY and STRIPE_PUBLISHABLE_KEY
**And** `lib/stripe/client.ts` exports Stripe instance
**And** `api/webhooks/stripe/route.ts` handles webhook events
**And** webhook signature verification is implemented

---

### Story 8.2: Subscribe to Monthly Plan

**As a** user,
**I want** to subscribe to the monthly plan,
**So that** I get full access to all features.

**Acceptance Criteria:**

**Given** I am on the subscription page
**When** I tap "Subscribe Monthly"
**Then** Stripe Checkout opens with 3.99/month option
**And** my loyalty discount is applied if eligible (FR70)
**And** successful payment activates my subscription
**And** I see confirmation and return to the app

---

### Story 8.3: Subscribe to Annual Plan

**As a** user,
**I want** to subscribe to the annual plan,
**So that** I save money with the yearly discount.

**Acceptance Criteria:**

**Given** I am on the subscription page
**When** I tap "Subscribe Annually"
**Then** Stripe Checkout opens with 29.99/year option (37% savings shown)
**And** my loyalty discount is applied if eligible
**And** successful payment activates my subscription

---

### Story 8.4: Cancel Subscription

**As a** user,
**I want** to cancel my subscription,
**So that** I can stop paying if I no longer need the service.

**Acceptance Criteria:**

**Given** I am a paying subscriber
**When** I navigate to Settings > Subscription > Cancel
**Then** I see what I'll lose (sync, scanning, etc.)
**And** I can confirm cancellation

**Given** I confirm cancellation
**When** the process completes
**Then** my subscription remains active until the end of the billing period
**And** I receive confirmation email
**And** subscription status updates to "Cancelling"

---

### Story 8.5: Free Tier Feature Limits

**As the** system,
**I want** to enforce feature limits for expired trials,
**So that** free users have incentive to subscribe.

**Acceptance Criteria:**

**Given** a user's trial has expired and they haven't subscribed
**When** they use the app
**Then** they can only have 1 active shopping list (FR68)
**And** receipt scanning is disabled
**And** cross-device sync is disabled
**And** they still have full stock tracker access
**And** they see upgrade prompts in restricted areas

---

### Story 8.6: Earn Loyalty Points from Receipts

**As a** user,
**I want** to earn loyalty points when I scan receipts,
**So that** I can reduce my subscription cost.

**Acceptance Criteria:**

**Given** I am a subscriber
**When** I submit a valid receipt
**Then** I earn 10 points (FR69)
**And** first receipt bonus gives +20 points
**And** weekly streak (4+ scans) gives +10 bonus points
**And** points are credited to my account

---

### Story 8.7: Daily Receipt Cap

**As the** system,
**I want** to limit daily receipt scans for points,
**So that** the system isn't abused.

**Acceptance Criteria:**

**Given** a user has scanned receipts today
**When** they reach 5 scans
**Then** additional scans can be saved but earn 0 points (FR73)
**And** user is informed of the daily cap
**And** cap resets at midnight UK time

---

### Story 8.8: View Loyalty Point Balance

**As a** user,
**I want** to see my loyalty point balance,
**So that** I know how close I am to the next discount tier.

**Acceptance Criteria:**

**Given** I am a subscriber
**When** I navigate to Settings > Loyalty Points
**Then** I see my current point balance (FR71)
**And** I see my current discount tier (0%, 10%, 20%, 35%, 50%)
**And** I see points needed for next tier
**And** I see my effective subscription price

---

### Story 8.9: Loyalty Point History

**As a** user,
**I want** to see my point earning history,
**So that** I can track how I accumulated points.

**Acceptance Criteria:**

**Given** I am on the Loyalty Points screen
**When** I tap "History"
**Then** I see a list of point transactions (FR72)
**And** each entry shows date, action, and points earned
**And** I see referral bonuses if applicable

---

### Story 8.10: Apply Loyalty Discounts

**As the** system,
**I want** to apply loyalty discounts to subscriptions,
**So that** engaged users pay less.

**Acceptance Criteria:**

**Given** a user has loyalty points
**When** their subscription renews or they subscribe
**Then** the appropriate discount tier is applied (FR70):
- 0-99 points: 0% (3.99)
- 100-199 points: 10% (3.59)
- 200-299 points: 20% (3.19)
- 300-399 points: 35% (2.59)
- 400+ points: 50% (1.99)
**And** Stripe coupon is applied automatically

---

### Story 8.11: Point Expiration

**As the** system,
**I want** unused points to expire after 12 months,
**So that** the liability is bounded.

**Acceptance Criteria:**

**Given** points have been earned
**When** 12 months pass without use
**Then** points expire on a rolling basis (FR74)
**And** users are warned 30 days before expiration
**And** expired points are removed from balance

---

## Epic 9: Location & Store Intelligence

### Story 9.1: Auto-Detect Country

**As a** user,
**I want** the app to detect my country,
**So that** I see relevant products and currency.

**Acceptance Criteria:**

**Given** I have granted location permission
**When** the app detects my location
**Then** my country is identified (FR75)
**And** country is saved to my profile
**And** detection works without location via IP fallback

---

### Story 9.2: Auto-Detect Currency

**As a** user,
**I want** prices shown in my local currency,
**So that** budgets and totals make sense to me.

**Acceptance Criteria:**

**Given** my country is detected
**When** the app configures currency
**Then** the correct currency symbol is used (GBP for UK) (FR76)
**And** number formatting follows locale conventions
**And** all price displays use the detected currency

---

### Story 9.3: Manual Currency Setting

**As a** user,
**I want** to manually set my currency,
**So that** I can override auto-detection if needed.

**Acceptance Criteria:**

**Given** I am in Settings > Location
**When** I tap "Currency"
**Then** I see a list of supported currencies
**And** I can select my preferred currency (FR77)
**And** the app uses my selection instead of auto-detected

---

### Story 9.4: Store Detection (Optional)

**As a** user,
**I want** the app to detect when I'm in a store,
**So that** Shopping Mode can activate automatically.

**Acceptance Criteria:**

**Given** I have enabled store detection
**When** I enter a known store location
**Then** the app can detect I'm shopping (FR78)
**And** Shopping Mode can auto-activate
**And** Quiet Mode can auto-enable (FR95)

**Given** I don't want store detection
**When** I disable the feature
**Then** no store detection occurs
**And** I can still manually enable Shopping Mode

---

### Story 9.5: Associate List with Store

**As a** user,
**I want** to link my shopping list to a specific store,
**So that** I can track prices per store.

**Acceptance Criteria:**

**Given** I am creating or editing a list
**When** I tap "Set Store"
**Then** I can search for or select a store name
**And** the store is associated with the list (FR79)
**And** price estimates can be store-specific

**Given** I complete a trip with a store set
**When** prices are saved
**Then** they are tagged with the store name

---

## Epic 10: Admin Dashboard

### Story 10.1: Admin Authentication with 2FA

**As an** admin,
**I want** to sign in securely with two-factor authentication,
**So that** the admin dashboard is protected.

**Acceptance Criteria:**

**Given** I have admin credentials
**When** I sign in to `/admin`
**Then** I must complete 2FA verification (FR97)
**And** only users with admin role can access
**And** failed attempts are logged

---

### Story 10.2: Admin Role Management

**As a** super-admin,
**I want** to manage admin accounts and permissions,
**So that** I can control who has access to what.

**Acceptance Criteria:**

**Given** I am a super-admin
**When** I navigate to Admin > Accounts
**Then** I can create new admin accounts (FR99)
**And** I can assign roles: viewer, support, manager, super-admin (FR100)
**And** each role has specific permissions

---

### Story 10.3: Audit Trail Logging

**As the** system,
**I want** to log all admin actions,
**So that** there is accountability for changes.

**Acceptance Criteria:**

**Given** an admin performs any action
**When** the action completes
**Then** an audit log entry is created (FR98)
**And** it includes admin ID, action, timestamp, and details
**And** logs cannot be modified or deleted by admins

---

### Story 10.4: User Analytics Dashboard

**As an** admin,
**I want** to view user metrics,
**So that** I can understand app usage.

**Acceptance Criteria:**

**Given** I am on the admin dashboard
**When** I view User Analytics
**Then** I see real-time user count (total, active, new today) (FR101)
**And** I see DAU/WAU/MAU with trends (FR102)
**And** I can filter by date range (FR108)
**And** I can compare period-over-period (FR109)

---

### Story 10.5: Retention and Conversion Metrics

**As an** admin,
**I want** to track retention and conversion,
**So that** I can measure product health.

**Acceptance Criteria:**

**Given** I am viewing analytics
**When** I select retention metrics
**Then** I see cohort analysis (FR103)
**And** I see onboarding funnel completion rates (FR104)
**And** I see trial-to-paid conversion rate (FR105)
**And** I see churn rate and reasons (FR106)

---

### Story 10.6: Feature Adoption Metrics

**As an** admin,
**I want** to see which features are used,
**So that** I can prioritize development.

**Acceptance Criteria:**

**Given** I am viewing analytics
**When** I select feature adoption
**Then** I see percentage of users using each feature (FR107)
**And** features include: stock tracker, lists, budget, receipts, insights

---

### Story 10.7: Revenue Dashboard

**As an** admin,
**I want** to view revenue metrics,
**So that** I can track business health.

**Acceptance Criteria:**

**Given** I am on the admin dashboard
**When** I view Revenue
**Then** I see MRR and ARR (FR110, FR111)
**And** I see revenue growth trends (FR112)
**And** I see subscriber breakdown by plan (FR113)
**And** I see ARPU and LTV estimates (FR114, FR115)

---

### Story 10.8: Loyalty Points Financial Impact

**As an** admin,
**I want** to understand loyalty program financials,
**So that** I can manage the program sustainably.

**Acceptance Criteria:**

**Given** I am viewing revenue
**When** I select loyalty analysis
**Then** I see discount impact on revenue (FR116)
**And** I see total outstanding points liability (FR117)

---

### Story 10.9: Payment Transaction Management

**As an** admin,
**I want** to view and manage payment transactions,
**So that** I can handle billing issues.

**Acceptance Criteria:**

**Given** I am on the Payments tab
**When** I view transactions
**Then** I see all payment transactions (FR118)
**And** I see failed attempts (FR119)
**And** I see retry status (FR120)
**And** I can issue refunds (FR121)
**And** data syncs from Stripe webhooks in real-time (FR125)

---

### Story 10.10: User Search and Management

**As an** admin,
**I want** to find and manage specific users,
**So that** I can handle support requests.

**Acceptance Criteria:**

**Given** I am on Users tab
**When** I search by email, name, or ID
**Then** I find matching users (FR127)
**And** I can view detailed profile (FR128)
**And** I can view subscription history (FR129)
**And** I can view loyalty point history (FR130)
**And** I can view receipt scan history (FR131)

---

### Story 10.11: User Account Actions

**As an** admin,
**I want** to perform actions on user accounts,
**So that** I can provide customer support.

**Acceptance Criteria:**

**Given** I am viewing a user profile
**When** I access account actions
**Then** I can extend trial period (FR132)
**And** I can grant complimentary subscription (FR133)
**And** I can add loyalty points manually (FR134)
**And** I can reset password (FR135)
**And** I can deactivate/reactivate account (FR136, FR137)

---

### Story 10.12: Receipt Quality Metrics

**As an** admin,
**I want** to monitor receipt processing quality,
**So that** I can ensure data accuracy.

**Acceptance Criteria:**

**Given** I am on Receipts tab
**When** I view metrics
**Then** I see scan volume metrics (FR139)
**And** I see OCR success rate (FR140)
**And** I see AI parsing accuracy (FR141)
**And** I see rejection reasons breakdown (FR142)

---

### Story 10.13: Receipt Moderation

**As an** admin,
**I want** to review flagged receipts,
**So that** I can prevent fraud.

**Acceptance Criteria:**

**Given** receipts are flagged as suspicious
**When** I view the moderation queue
**Then** I see flagged receipts (FR143)
**And** I can approve or reject them (FR144)
**And** rejected receipts have points revoked

---

### Story 10.14: Price Database Management

**As an** admin,
**I want** to manage the crowdsourced price database,
**So that** prices remain accurate.

**Acceptance Criteria:**

**Given** I am on Prices tab
**When** I view the database
**Then** I can browse all prices (FR145)
**And** I can search by item, store, or region (FR146)
**And** I can edit incorrect prices (FR147)
**And** I can delete fraudulent entries (FR148)
**And** I can view outlier reports (FR149)
**And** I can bulk approve/reject (FR150)

---

### Story 10.15: Seeded Products Management

**As an** admin,
**I want** to manage UK staple products for onboarding,
**So that** new users get relevant suggestions.

**Acceptance Criteria:**

**Given** I am on Products tab
**When** I view seeded products
**Then** I can view all seeded items (FR151)
**And** I can add new products (FR152)
**And** I can edit details (FR153)
**And** I can remove products (FR154)
**And** I can manage categories (FR155)

---

### Story 10.16: Store and Item Normalization

**As an** admin,
**I want** to manage data normalization rules,
**So that** stores and items are consistently named.

**Acceptance Criteria:**

**Given** I am on Products tab
**When** I view normalization
**Then** I can manage store name rules (FR156)
**And** I can manage item canonicalization rules (FR157)
**And** rules apply to new receipt data

---

### Story 10.17: System Health Monitoring

**As an** admin,
**I want** to monitor system health,
**So that** I can identify and resolve issues.

**Acceptance Criteria:**

**Given** I am on System tab
**When** I view health metrics
**Then** I see uptime metrics (FR158)
**And** I see API response times (FR159)
**And** I see error rate trends (FR160)
**And** I can view recent error logs (FR161)
**And** I see third-party service status (FR162)

---

### Story 10.18: Infrastructure Monitoring

**As an** admin,
**I want** to monitor infrastructure,
**So that** I can plan capacity.

**Acceptance Criteria:**

**Given** I am viewing system health
**When** I check infrastructure
**Then** I see database storage usage (FR163)
**And** I see sync queue status (FR164)
**And** I see background job status (FR165)
**And** alerts fire when thresholds exceeded (FR166)

---

### Story 10.19: Customer Support Tools

**As an** admin,
**I want** support tools to help users,
**So that** I can resolve issues efficiently.

**Acceptance Criteria:**

**Given** I am on Support tab
**When** I access support tools
**Then** I can view support ticket queue (FR167)
**And** I can impersonate user view (read-only) (FR168)
**And** I can view user's shopping lists (FR169)
**And** I can view user's stock tracker (FR170)
**And** I can trigger password reset (FR171)

---

### Story 10.20: GDPR Compliance Tools

**As an** admin,
**I want** GDPR compliance tools,
**So that** we can handle data requests legally.

**Acceptance Criteria:**

**Given** I receive a GDPR request
**When** I use compliance tools
**Then** I can export user's data (FR172)
**And** export completes within 48 hours (NFR-S10)
**And** I can permanently delete user's data (FR173)
**And** deletion completes within 30 days (NFR-S11)

---

### Story 10.21: In-App Announcements

**As an** admin,
**I want** to create in-app announcements,
**So that** I can communicate with users.

**Acceptance Criteria:**

**Given** I am on Communication tab
**When** I create an announcement
**Then** I can write announcement content (FR174)
**And** I can schedule for future dates (FR175)
**And** I can target user segments (FR176)
**And** I can view read/dismiss rates (FR177)

---

### Story 10.22: Feature Flags and Configuration

**As an** admin,
**I want** to configure app settings,
**So that** I can adjust behavior without deployments.

**Acceptance Criteria:**

**Given** I am on Configuration tab
**When** I manage settings
**Then** I can toggle feature flags (FR179)
**And** I can enable features for segments (FR180)
**And** I can configure loyalty point rules (FR181)
**And** I can configure receipt validation thresholds (FR182)
**And** I can configure subscription pricing (FR183)
**And** I can configure trial period length (FR184)
**And** I can configure daily scan cap (FR185)

---

### Story 10.23: Reporting and Export

**As an** admin,
**I want** to export data and reports,
**So that** I can analyze data externally.

**Acceptance Criteria:**

**Given** I am on any data view
**When** I export data
**Then** I can export user list to CSV (FR186)
**And** I can export revenue reports (FR187)
**And** I can export analytics data (FR188)
**And** I can schedule automated weekly reports (FR189)
**And** I can export audit logs (FR190)

---

## Story Summary

| Epic | Stories | FRs Covered |
|------|---------|-------------|
| 1. Project Foundation | 7 | Infrastructure |
| 2. Authentication & Onboarding | 11 | FR1-7, FR16, FR85-89 |
| 3. Pantry Stock Tracker | 8 | FR8-15 |
| 4. Shopping Lists & Budget | 16 | FR17-39 |
| 5. Offline-First Experience | 5 | FR80-84 |
| 6. Receipt & Price Intelligence | 11 | FR40-57 |
| 7. Insights & Progress | 10 | FR58-64, FR90-95 |
| 8. Subscription & Monetization | 11 | FR65-74 |
| 9. Location & Store Intelligence | 5 | FR75-79 |
| 10. Admin Dashboard | 23 | FR96-190 |
| **Total** | **107 stories** | **190 FRs** |
