---
stepsCompleted: ['step-01-init', 'step-02-discovery', 'step-03-success', 'step-04-journeys', 'step-05-domain-skipped', 'step-06-innovation', 'step-07-project-type', 'step-08-scoping', 'step-09-functional', 'step-10-nonfunctional', 'step-11-polish', 'step-12-complete']
status: complete
completedAt: '2026-01-24'
inputDocuments: ['_bmad-output/planning-artifacts/product-brief.md']
workflowType: 'prd'
documentCounts:
  briefs: 1
  research: 0
  brainstorming: 0
  projectDocs: 0
classification:
  projectType: native_mobile
  domain: general_consumer_retail
  complexity: low-medium
  projectContext: greenfield
  keyConcerns:
    - Offline functionality (Convex + optimistic updates)
    - Receipt OCR accuracy (Gemini AI parsing)
    - Crowdsourced data quality
    - Native mobile performance
    - GDPR compliance (UK)
---

# Product Requirements Document - Oja

**Author:** Diloc
**Date:** 2026-01-24

---

## 🚨 ARCHITECTURE PIVOT NOTICE (2026-01-26)

**This PRD was originally written for v1 (PWA/Next.js/Supabase). As of 2026-01-26, Oja has pivoted to v2:**

| Aspect | v1 (Original PRD) | v2 (Current Implementation) |
|--------|-------------------|------------------------------|
| Platform | Progressive Web App | **Native Mobile (iOS/Android)** |
| Framework | Next.js 14 | **Expo SDK 55+** |
| Backend | Supabase | **Convex (real-time serverless)** |
| Auth | Supabase Auth | **Clerk** |
| Styling | Tailwind CSS | **Liquid Glass (iOS) / Material You (Android)** |
| State | TanStack Query + Zustand | **Convex hooks + React** |
| Offline | Service Workers + IndexedDB | **Convex + optimistic updates** |

**What remains valid:**
- All user journeys, requirements, and success criteria
- Product vision, monetization model, and target market
- Functional requirements (FR1-FR190) and NFRs

**For v2 technical architecture, see:** `architecture-v2-expo-convex.md`

---

## Executive Summary

**Oja** is a budget-first shopping mobile app that gives UK shoppers control over their spending *before* checkout, not tracking *after*. Unlike traditional shopping list apps that are glorified notepads, Oja combines stock tracking, pre-shop budget simulation, and crowdsourced price intelligence to eliminate checkout anxiety.

**Core Innovation:** Know your total before entering the store. Stay under budget with real-time visual feedback. Learn from every trip through AI-powered receipt scanning.

**Platform:** Native Mobile App (Expo + Convex + Clerk)
**Target Market:** United Kingdom (architecture: global-ready)
**Monetization:** £3.99/mo subscription with loyalty points earning up to 50% discount

---

## Success Criteria

### User Success

**The Emotional Win:**
Users feel oja has solved their problem when:
- They walk out of a store **under budget** and feel in control, not deprived
- They stop experiencing checkout anxiety because they knew their total beforehand
- They never forget essentials because stock tracking caught items before they ran out
- They see their spending behavior improving over weeks/months

**Measurable User Outcomes:**

| Outcome | Target | Measurement |
|---------|--------|-------------|
| Onboarding completion | >70% | Users completing all onboarding steps |
| Weekly active retention | 40% of signups | Activity within 7-day window |
| Lists created | 2+ per user/month | Average lists per active user |
| Budget adherence | 60% trips under budget | Completed trips within set budget |
| Stock feature adoption | 50% of users | Users with 5+ stock items tracked |
| Receipt scan adoption | 30% of trips | Users scanning at least 1 receipt |

### Business Success

**3-Month Post-Launch (Validation):**
- 1,000+ active users in UK market
- 40% week-over-week retention
- User satisfaction: NPS score 40+ (via in-app survey)
- Organic growth signals (word of mouth, social shares)

**12-Month Success (Growth):**
- 10,000+ monthly active users
- Receipt scanning adoption: 30%+ of completed trips
- Crowdsourced price database: 500+ verified UK product prices
- Clear path to monetization identified

### Technical Success

| Metric | Target | Rationale |
|--------|--------|-----------|
| Offline functionality | 90% of core features | Stores have poor connectivity |
| Receipt OCR accuracy | 80%+ item detection | Below this, users abandon feature |
| Budget bar update | <100ms | Must feel instant |
| PWA load time | <2 seconds | Cold start to usable |
| Crash-free sessions | 99.5%+ | Standard mobile quality bar |

---

## Product Scope

### MVP - Minimum Viable Product (P0)

**Full Oja Experience - Ship complete:**

**Core Infrastructure:**
- User authentication (Supabase)
- Offline-first architecture (works in stores with bad signal)
- Location intelligence (auto-detect country, currency, store)

**Stock Tracker (Pantry):**
- 4 stock states: Stocked → Good → Low → Out
- Tap & hold with liquid drain animation
- Auto-add "Out" items to next shopping list
- Seeded UK staples for new users

**Shopping List with Budget Lock:**
- List CRUD (create, edit, delete lists & items)
- Budget setting per trip
- Real-time running total
- Budget Lock Mode (hard cap, warns before exceeding)
- Impulse Fund (separate flex budget for unplanned items)
- Safe Zone Indicator (green/amber/red glow)
- Swipe priority (must-have vs nice-to-have)
- Auto-suggest dropping nice-to-haves when over budget

**Receipt Scanning & Reconciliation:**
- Camera capture with auto-detect
- Client-side OCR (Tesseract.js)
- AI parsing (Gemini 1.5 Flash)
- User confirmation/correction step
- Planned vs Actual reconciliation view
- Personal price history saved

**Price Intelligence:**
- Manual price entry (optional, pre-filled with estimates)
- Crowdsourced price database contributions
- Store-specific price tracking

**Completion & Archives:**
- List completion flow
- Shopping trip archiving
- Victory celebration (confetti when under budget)

**Onboarding:**
- Animated welcome flow
- Seeded products selection
- Budget setting with haptic dial
- Location permissions (optional)

### Growth Features - Post-MVP (P1)

**Based on User Feedback:**
- Push notifications (stock low alerts, weekly digest alerts)
- Family/household sharing
- Multiple store comparison view

### Vision Features - Future (P2+)

**Long-term Differentiation:**
- Predictive budgeting ("You usually overspend 15%")
- AI shopping suggestions
- Store aisle sorting (list ordered by store layout)
- Voice-add items while walking
- Integration with store loyalty cards

---

## User Experience: Sensory Design

### Sound Design (Mature & Minimal)

**Philosophy:** Sounds confirm actions, never demand attention. Think premium banking app, not mobile game.

| Action | Sound | Character |
|--------|-------|-----------|
| Add item | Soft tap | Brief, tactile |
| Check off item | Gentle tick | Subtle confirmation |
| Stock level change | Quiet tone shift | Ambient feedback |
| Budget warning | Low two-note | Calm alert |
| Receipt captured | Soft shutter | Professional |
| Trip complete (under budget) | Warm chord | Satisfying, not triumphant |

**What We Avoid:**
- Coin sounds / casino effects
- Fanfares or trumpets
- Repetitive jingles
- Sounds that draw attention in public

### Celebrations (Understated)

| Moment | Visual | Sound |
|--------|--------|-------|
| Under budget | Brief confetti (1s), fades quickly | Single warm tone |
| First trip complete | Subtle badge slide-in | Soft acknowledgment |
| Streak milestone | Small flame icon appears | None (visual only) |
| Monthly savings | Elegant number animation | None (visual only) |

**Confetti Rules:**
- Small particle count (not overwhelming)
- Muted colors (orange/grey palette)
- Fades within 1 second
- Only triggers on meaningful wins (not every action)

### Progress & Achievements (Adults, Not Gamers)

**No childish badges.** Instead: quiet progress indicators.

```
┌─────────────────────────────────────┐
│ This Month                          │
│                                     │
│ Trips under budget    ████████░░ 4/5│
│ Saved                       £48.20  │
│ Streak                      3 weeks │
└─────────────────────────────────────┘
```

**Achievement Philosophy:**
- No "levels" or "XP"
- No leaderboards
- Progress shown as personal milestones, not competition
- Language is informative, not congratulatory ("4 trips under budget" not "YOU'RE AMAZING!")

### Audio Settings (User Control)

```
Sounds         [On ●○ Off]
Haptics        [On ●○ Off]
Quiet Mode     [Auto-detect store]
```

---

## User Journeys

### Journey 1: Sarah - The Anxious Overspender

**Who is Sarah?**
34, marketing manager, Manchester. Earns well but consistently overspends on groceries. Tried budgeting apps before - they felt like homework.

**Opening Scene:**
Outside Tesco, £127 until payday. Dreading checkout anxiety.

**Rising Action:**
Opens oja. Pantry shows 6 "Out" items already on her list with estimates. Sets budget: £50. App glows soft green. Adds wine (swipes left for nice-to-have). Budget bar shifts to amber at £52.

In-store, checks items off. Milk is £1.95 not £1.85 - taps to update. Running total adjusts instantly.

**Climax:**
Checkout: £47.20. No surprise. Scans receipt. Brief confetti, warm tone. "£2.80 under budget." Stock auto-updates.

**Resolution:**
Walking out, Sarah feels in control. Not deprived - informed. She'll do this again.

---

### Journey 2: Marcus - The New User

**Who is Marcus?**
28, first solo flat, Birmingham. Never tracked groceries. Sceptical of apps.

**Opening Scene:**
Downloads oja from Reddit recommendation. Expects to delete it within a week.

**Rising Action:**
No login wall. Warm welcome. "Set up your pantry with UK essentials." Items appear - he removes what he doesn't buy. Budget dial with haptic feedback at round numbers. Location prompt with easy "Maybe Later."

**Climax:**
Under 90 seconds: pantry ready, budget set, first list populated. App feels ready, not empty.

**Resolution:**
"That was actually easy." Opens pantry, updates an item. The interaction feels good. This might stick.

---

### Journey 3: Priya - The In-Store Power User

**Who is Priya?**
41, mother of two, Leeds. Using oja 3 months. Shopping is now precision.

**Opening Scene:**
Aldi car park. 14 items on list (8 auto-added, 6 manual). Budget: £70. Impulse fund: £10.

**Rising Action:**
Enters store - "Shopping Mode" activates (larger touch targets). Checks items, updates prices. Kids request biscuits - adds from impulse fund, budget stays green.

**Climax:**
Checkout: £67.40 vs £72 estimated. Receipt scan: 14/14 matched. Quiet confirmation.

**Resolution:**
"£12.60 under budget. £48 saved this month." Her pantry updates. Next week's list is already forming.

---

### Journey 4: James - Recovery from Failure

**Who is James?**
52, recently divorced, Bristol. Not tech-savvy. Daughter recommended oja.

**Opening Scene:**
In Sainsbury's, confused. About to give up and use paper list.

**Rising Action:**
Taps orange "+". Search works. Types "baked beans" - adds it. Slowly gets the hang of it. Forgets to set budget.

**Climax:**
Home. Prompt: "Scan receipt to track prices?" Tries it. Works. Items mostly correct. Confirms.

**Resolution:**
Didn't have perfect experience but didn't fail. App met him where he was. He'll try budget next time.

---

### Journey 5: The Quiet Win

**Who is David?**
45, accountant, Edinburgh. Methodical. Dislikes flashy apps. Values data over celebration.

**Opening Scene:**
David's been using oja for 2 months. He's never shared a screenshot or cared about streaks.

**Rising Action:**
He opens monthly summary. Clean layout. No fanfare.

```
November Summary
────────────────
Trips: 8
Under budget: 7/8
Total saved: £34.20
Avg trip: £62.40

Price updates contributed: 23
```

**Climax:**
He notices a small line: "Your price contributions helped 12 other shoppers this month."

**Resolution:**
David doesn't need confetti. He needs to know the system works. It does. He continues using it.

---

### Journey Requirements Summary

| Journey | Capabilities Revealed |
|---------|----------------------|
| **Sarah** | Budget tracking, real-time updates, quiet celebration |
| **Marcus** | Frictionless onboarding, quick setup, no commitment walls |
| **Priya** | Shopping mode, impulse fund, monthly progress |
| **James** | Forgiving UX, graceful recovery, gentle prompts |
| **David** | Clean data presentation, contribution feedback, no forced gamification |

---

## Innovation & Differentiation

### Core Innovation: Budget-First Philosophy

**Traditional assumption:** Shopping apps help you remember what to buy.
**Oja's challenge:** Shopping apps should help you stay in control of spending.

| Innovation | What's Novel |
|------------|--------------|
| **Budget-First** | Control spending BEFORE checkout, not track AFTER |
| **Stock → List Automation** | Pantry inventory auto-populates shopping lists |
| **Pre-Shop Simulation** | Know your total before entering store |
| **Crowdsourced Price Intel** | Community-built price database from receipts |
| **Emotional UX Design** | "Safe Zone" glow, anxiety reduction focus |

### Cross-Device Sync

All user data persists and syncs across devices in real-time:

| Data Type | Sync Behavior |
|-----------|---------------|
| Stock levels (pantry) | Real-time, last-write-wins |
| Shopping lists | Real-time, merge strategy |
| Price history | Sync on connection |
| User preferences | Real-time |
| Loyalty points | Server-authoritative |

**Technical:** Supabase Realtime + IndexedDB with sync queue (PWA).

---

## Monetization Model

### Subscription Tiers

| Tier | Duration | Price | Features |
|------|----------|-------|----------|
| **Free Trial** | 7 days | £0 | Full access |
| **Free (Expired)** | Indefinite | £0 | 1 list, no scan, no sync |
| **Monthly** | Per month | £3.99 | Full access + sync |
| **Annual** | Per year | £29.99 | Full access + sync (37% savings) |

### Loyalty Points System

**Earning Points:**

| Action | Points | Conditions |
|--------|--------|------------|
| Valid receipt scan | 10 pts | Within 3 days, legible, not duplicate |
| First receipt bonus | +20 pts | One-time |
| Weekly streak (4+ scans) | +10 pts | Per week |
| Referral | +100 pts | When friend subscribes |

**Daily cap:** 5 receipts (50 pts max/day)
**Point expiry:** 12 months rolling

**Discount Tiers:**

| Points | Discount | Effective Price |
|--------|----------|-----------------|
| 0-99 | 0% | £3.99/mo |
| 100-199 | 10% | £3.59/mo |
| 200-299 | 20% | £3.19/mo |
| 300-399 | 35% | £2.59/mo |
| 400+ | 50% (MAX) | £1.99/mo |

### Receipt Validation Rules

| Check | Threshold | Result if Failed |
|-------|-----------|------------------|
| **Freshness** | ≤3 days from purchase | Rejected, 0 points |
| **Legibility** | OCR confidence ≥60% | Rejected, retry prompt |
| **Duplicate** | Same store+date+total | Rejected, 0 points |
| **Daily cap** | ≤5 receipts/day | No points beyond cap |

**Rejection UX:** Always explain why, give actionable advice, offer to save without points.

### Feature Access by Tier

| Feature | Free (expired) | Subscriber |
|---------|----------------|------------|
| Shopping lists | 1 only | Unlimited |
| Stock tracker | ✓ | ✓ |
| Budget tracking | ✓ | ✓ |
| Receipt scanning | ✗ | ✓ |
| Cross-device sync | ✗ | ✓ |
| Loyalty points | ✗ | ✓ |
| Price history | ✗ | ✓ |
| Archives & insights | ✗ | ✓ |

### Validation Approach

| Innovation | How to Validate |
|------------|-----------------|
| Stock auto-add | % of list items from "Out" state |
| Budget adherence | Trips under budget vs over |
| Receipt adoption | % scanning at least 1 receipt |
| Loyalty engagement | Points earned per active user |
| Conversion rate | Trial → paid subscription % |

### Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Users don't update stock | Frictionless one-tap, gentle prompts |
| Budget lock feels restrictive | Impulse fund provides flexibility |
| Receipt OCR fails | Graceful fallback, user correction |
| Stale price data | 3-day freshness rule, recency weighting |
| Points fraud | Receipt fingerprinting, daily caps |

---

## Technical Architecture

### ⚠️ Architecture Section Outdated

**The technical architecture section below describes v1 (PWA/Next.js/Supabase).**

**For current v2 architecture (Expo + Convex + Clerk), see:**
- **`architecture-v2-expo-convex.md`** - Complete v2 system architecture
- **`coding-conventions-expo.md`** - Project structure and patterns
- **`security-guidelines-expo.md`** - Security implementation

### v2 Tech Stack Summary

| Layer | Technology |
|-------|------------|
| **Framework** | Expo SDK 55+ (React Native) |
| **Language** | TypeScript (strict) |
| **Routing** | Expo Router (file-based) |
| **UI** | Liquid Glass (iOS) / Material You (Android) |
| **Auth** | Clerk |
| **Backend** | Convex (real-time serverless) |
| **AI** | Jina AI (embeddings) + Gemini (receipt parsing) |
| **Payments** | Stripe |
| **Animations** | React Native Reanimated |
| **Haptics** | Expo Haptics |
| **Offline** | Convex + optimistic updates |

---

## v1 Technical Architecture (Archived)

### Platform: Progressive Web App (PWA)

**Why PWA over Native Apps:**

| Factor | Native (App Store) | PWA (Direct) |
|--------|-------------------|--------------|
| Payment fees | 15-30% to Apple/Google | ~3% (Stripe) |
| On £3.99/mo | Keep £2.79-3.39 | Keep £3.87 |
| Updates | App review required | Instant deploy |
| Install friction | App store download | "Add to Home Screen" |
| Offline support | Full | Full (Service Workers) |
| Camera access | Full | Full (Web APIs) |

### v1 Tech Stack (PWA - Not Implemented)

| Layer | Technology | Rationale |
|-------|------------|-----------|
| **Framework** | Next.js 14 (App Router) | Best PWA support, SSR, excellent docs |
| **Language** | TypeScript (strict) | Type safety, AI-friendly |
| **Styling** | Tailwind CSS | Utility-first, rapid development |
| **Animations** | Framer Motion | 60fps, gesture support, emotional UX |
| **Icons** | Phosphor Icons | Warm, emotional, consistent |
| **PWA** | next-pwa + Workbox | Offline, install prompt, caching |
| **State** | Zustand | Simple, TypeScript-friendly |
| **Server State** | TanStack Query | Caching, background sync |
| **Backend** | Supabase | Postgres + Auth + Realtime + Edge Functions |
| **OCR** | Tesseract.js (client) | Free, runs in browser |
| **AI Parsing** | Gemini 1.5 Flash | Free tier, receipt parsing |
| **Payments** | Stripe Checkout | Direct payments, no app store fees |
| **Analytics** | PostHog | Privacy-friendly, generous free tier |

### v1 Project Structure (PWA - Not Implemented)

```
oja/
├── app/                          # Next.js App Router
│   ├── (app)/                    # Authenticated app routes
│   │   ├── pantry/              # Stock tracker
│   │   ├── list/                # Shopping lists
│   │   ├── list/[id]/           # Individual list
│   │   ├── scan/                # Receipt scanner
│   │   ├── insights/            # Weekly/monthly insights
│   │   └── settings/            # User settings
│   ├── (auth)/                   # Auth routes
│   │   ├── login/
│   │   └── register/
│   ├── (marketing)/              # Public pages
│   │   └── page.tsx             # Landing page
│   ├── api/                      # API routes
│   │   ├── receipts/parse/      # Receipt parsing
│   │   └── webhooks/stripe/     # Stripe webhooks
│   ├── layout.tsx
│   └── manifest.ts               # PWA manifest
├── components/
│   ├── ui/                       # Design system
│   │   ├── Button.tsx
│   │   ├── Card.tsx
│   │   ├── Input.tsx
│   │   └── BudgetRing.tsx
│   ├── stock/                    # Stock tracker
│   ├── list/                     # Shopping list
│   ├── receipt/                  # Receipt scanning
│   └── insights/                 # Analytics
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
│   ├── icons/                    # PWA icons
│   └── sounds/                   # UI sound effects
├── styles/
│   └── globals.css               # Tailwind imports
├── next.config.js
├── tailwind.config.ts
└── tsconfig.json
```

### PWA Capabilities

| Feature | Implementation | Notes |
|---------|----------------|-------|
| **Offline Mode** | Service Workers + IndexedDB | Full functionality offline |
| **Install Prompt** | beforeinstallprompt event | Native-feel installation |
| **Camera** | MediaDevices API | Receipt scanning |
| **Location** | Geolocation API | Store detection |
| **Push Notifications** | Web Push API | Full on Android, iOS 16.4+ (home screen required) |
| **Background Sync** | Background Sync API | Queue receipts when offline |

### Offline Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Browser (PWA)                        │
├─────────────────────────────────────────────────────────┤
│  IndexedDB (Local Storage)                             │
│  ├── stock_items                                       │
│  ├── shopping_lists                                    │
│  ├── list_items                                        │
│  ├── price_cache                                       │
│  └── sync_queue (pending changes)                      │
├─────────────────────────────────────────────────────────┤
│  Service Worker                                         │
│  ├── Cache API (static assets)                         │
│  ├── Background Sync (queued operations)               │
│  └── Push notifications                                │
└─────────────────────────────────────────────────────────┘
              │ Online                    │ Offline
              ▼                           ▼
┌─────────────────────────┐    ┌─────────────────────────┐
│  Supabase (Server)      │    │  Full local operation   │
│  ├── Realtime sync      │    │  Changes queued         │
│  └── Conflict resolve   │    │  Sync when online       │
└─────────────────────────┘    └─────────────────────────┘
```

### Device Permissions (Web APIs)

| Permission | Web API | Request Timing |
|------------|---------|----------------|
| Camera | `navigator.mediaDevices.getUserMedia()` | First receipt scan |
| Location | `navigator.geolocation.getCurrentPosition()` | Optional, on store detection |
| Notifications | `Notification.requestPermission()` | After onboarding, explain value |

### Performance Targets

| Metric | Target |
|--------|--------|
| Lighthouse PWA score | 100 |
| First Contentful Paint | <1.5s |
| Time to Interactive | <3s |
| Offline functionality | 100% core features |
| Camera → Preview | <1s |
| OCR processing | <5s (client-side) |

### iOS PWA Considerations

| Limitation | Mitigation |
|------------|------------|
| Push requires home screen install | Onboarding encourages "Add to Home Screen" |
| No background sync (limited) | Sync on app open |
| No badge count | Use in-app indicators |
| 50MB storage limit (older iOS) | Efficient data management, cloud sync |

### Stripe Integration

```typescript
// Subscription with loyalty discount
const checkout = await stripe.checkout.sessions.create({
  mode: 'subscription',
  line_items: [{
    price: 'price_monthly_399',
    quantity: 1,
  }],
  discounts: [{
    coupon: getLoyaltyCoupon(user.loyaltyPoints), // 10%, 20%, 35%, or 50%
  }],
  subscription_data: {
    trial_period_days: 7,
  },
});
```

---

## Project Scoping & Phased Development

### MVP Strategy & Philosophy

**MVP Approach:** Problem-Solving MVP
**Philosophy:** Complete solution to budget anxiety from day one - users should feel oja actually solves their problem immediately, not experience a feature skeleton.
**Resource Requirements:** 1 developer (Claude Code assisted), Convex backend, EAS hosting

### MVP Feature Set (Phase 1)

**Core User Journeys Supported:**
All 5 journeys (Sarah, Marcus, Priya, James, David) - full functionality for anxious overspenders AND data-focused users.

**Must-Have Capabilities:**

| # | Feature | Rationale |
|---|---------|-----------|
| 1 | User auth (Clerk) with 7-day trial | Core infrastructure |
| 2 | Stock tracker with 4 states | Auto-populates lists, reduces friction |
| 3 | Auto-add "Out" items to shopping list | Core value proposition |
| 4 | Shopping list CRUD | Basic functionality |
| 5 | Budget setting per trip | Core value proposition |
| 6 | Real-time running total | Anxiety reduction |
| 7 | Budget Lock Mode | Hard cap prevents overspending |
| 8 | Impulse Fund | Flexibility without breaking budget |
| 9 | Safe Zone Indicator (glow) | Emotional UX, instant visual feedback |
| 10 | Swipe priority (must-have/nice-to-have) | Smart budget management |
| 11 | Auto-suggest dropping nice-to-haves | Helps users stay under budget |
| 12 | Receipt scanning (Tesseract.js) | Price intelligence source |
| 13 | AI parsing (Gemini 1.5 Flash) | Structured data from receipts |
| 14 | User confirmation/correction | Data quality assurance |
| 15 | Planned vs Actual reconciliation | Learning from trips |
| 16 | Personal price history | Improves estimates over time |
| 17 | Crowdsource contribution | Community price database |
| 18 | Cross-device sync (Convex Realtime) | Multi-device households |
| 19 | Loyalty points system | Engagement, reduces churn |
| 20 | Subscription via Stripe | Revenue, ~3% fees |
| 21 | Seeded UK staples | Solves cold-start problem |
| 22 | Offline-first (Convex + optimistic updates) | Works in stores with bad signal |
| 23 | Mature animations (React Native Reanimated) | Emotional, premium UX |
| 24 | Subtle sounds | Tactile feedback |
| 25 | Understated celebrations | Motivates without being childish |
| 26 | Weekly spending digest | David's journey, data visibility |
| 27 | Monthly trend reports | Long-term behavior insights |
| 28 | Category breakdown analytics | Spending awareness |

### Post-MVP Features

**Phase 2 (Growth) - Based on User Feedback:**

| Feature | Value | Complexity |
|---------|-------|------------|
| Push notifications (stock alerts) | Proactive reminders | Medium |
| Weekly digest push alerts | Re-engagement | Low |
| Family/household sharing | Multi-user households | High |
| Multi-store price comparison | Smarter shopping decisions | Medium |

**Phase 3 (Expansion) - Long-term Vision:**

| Feature | Value | Complexity |
|---------|-------|------------|
| Predictive budgeting AI | "You usually overspend 15%" | High |
| AI shopping suggestions | Smart recommendations | High |
| Store aisle sorting | List ordered by store layout | High (needs store data) |
| Voice-add items | Hands-free while walking | Medium |
| Store loyalty card integration | Unified shopping experience | High (partnerships) |

### Risk Mitigation Strategy

**Technical Risks:**

| Risk | Impact | Mitigation |
|------|--------|------------|
| Gemini OCR accuracy | Bad prices in DB | User confirmation step + confidence threshold |
| Push notification limitations | Lower engagement | Onboarding guides notification permissions |
| Local storage limits | Data loss | Convex sync primary, efficient local caching |
| Animation performance | Janky animations | Test on low-end devices, use Reanimated worklets |

**Market Risks:**

| Risk | Impact | Mitigation |
|------|--------|------------|
| Users don't scan receipts | Sparse price data | Full functionality without scanning; scanning is bonus value |
| Existing app fatigue | Low adoption | Focus on emotional UX, not feature list |
| Price data too sparse | Poor estimates | Seed UK top 50 items, build quickly from early adopter scans |
| Subscription resistance | Low revenue | Generous free tier (stock + 1 list), loyalty points reduce barrier |

**Resource Risks:**

| Risk | Impact | Mitigation |
|------|--------|------------|
| Solo developer capacity | Slow delivery | Lean stack (Expo + Convex), AI-assisted development |
| Time to market | Competition | EAS = fast deploy, iterate fast, TestFlight for iOS |
| Cost overruns | Project failure | Free tiers for all services until revenue justifies upgrade |

---

## Functional Requirements

### User Account Management

- **FR1:** Users can create an account with email and password
- **FR2:** Users can sign in to their existing account
- **FR3:** Users can sign out from any device
- **FR4:** Users can reset their password via email
- **FR5:** New users receive a 7-day free trial with full access
- **FR6:** Users can view and manage their subscription status
- **FR7:** Users can delete their account and all associated data

### Pantry / Stock Tracking

- **FR8:** Users can view all tracked stock items in a pantry grid
- **FR9:** Users can add new items to their pantry
- **FR10:** Users can set stock level for any item (Stocked, Good, Low, Out)
- **FR11:** Users can change stock level via tap-and-hold interaction
- **FR12:** Users can quick-decrease stock level via swipe gesture
- **FR13:** System auto-adds "Out" items to the next shopping list
- **FR14:** Users can assign categories to stock items
- **FR15:** Users can remove items from their pantry
- **FR16:** New users see pre-seeded UK staple items in their pantry

### Shopping List Management

- **FR17:** Users can create new shopping lists
- **FR18:** Users can view all their shopping lists
- **FR19:** Users can add items to a shopping list
- **FR20:** Users can remove items from a shopping list
- **FR21:** Users can search and add items from their pantry to a list
- **FR22:** Users can check off items as they shop
- **FR23:** Users can uncheck items if needed
- **FR24:** Users can set priority for items (must-have vs nice-to-have)
- **FR25:** Users can change item priority via swipe gesture
- **FR26:** Users can edit estimated price for any list item
- **FR27:** Users can edit actual price when checking off items
- **FR28:** Users can view running total of their shopping list
- **FR29:** Users can archive completed shopping lists
- **FR30:** Users can view archived shopping lists (trip history)
- **FR31:** System auto-updates pantry stock to "Stocked" when list is completed

### Budget Control

- **FR32:** Users can set a total budget for each shopping list
- **FR33:** Users can enable Budget Lock Mode (hard cap)
- **FR34:** System warns user before adding items that exceed budget
- **FR35:** Users can set a separate Impulse Fund budget
- **FR36:** Users can add impulse items charged against impulse fund
- **FR37:** Users can view Safe Zone indicator showing budget status
- **FR38:** System suggests removing nice-to-have items when over budget
- **FR39:** Users can see real-time budget status while shopping

### Receipt Processing

- **FR40:** Users can capture receipt photos using device camera
- **FR41:** System performs OCR on captured receipts
- **FR42:** System extracts structured data from receipt text (store, date, items, prices, total)
- **FR43:** Users can review and correct AI-parsed receipt data
- **FR44:** Users can manually add missing items to parsed receipt
- **FR45:** Users can view reconciliation of planned vs actual spending
- **FR46:** System identifies items bought but not on list ("missed items")
- **FR47:** System identifies items on list but not bought ("skipped items")
- **FR48:** Users can save receipt without points if validation fails
- **FR49:** System validates receipt freshness (≤3 days from purchase date)
- **FR50:** System validates receipt legibility (≥60% OCR confidence)
- **FR51:** System detects duplicate receipts (same store+date+total)

### Price Intelligence

- **FR52:** System maintains personal price history per user
- **FR53:** System provides price estimates when adding items to lists
- **FR54:** System contributes validated prices to crowdsourced database
- **FR55:** System shows price confidence level for estimates
- **FR56:** Users can view price history for specific items
- **FR57:** System filters crowdsourced prices by recency (weighted average)

### Insights & Analytics

- **FR58:** Users can view weekly spending digest
- **FR59:** Users can view monthly trend reports
- **FR60:** Users can view category breakdown of spending
- **FR61:** Users can view budget adherence statistics (trips under/over budget)
- **FR62:** Users can view total savings achieved
- **FR63:** System displays progress indicators (trips under budget, streaks)
- **FR64:** Users can view their price contribution count

### Subscription & Payments

- **FR65:** Users can subscribe to monthly plan (£3.99/mo)
- **FR66:** Users can subscribe to annual plan (£29.99/yr)
- **FR67:** Users can cancel their subscription
- **FR68:** System enforces feature limits for expired free tier
- **FR69:** Users can earn loyalty points for valid receipt scans
- **FR70:** System applies loyalty point discounts to subscription (up to 50%)
- **FR71:** Users can view their loyalty point balance
- **FR72:** Users can view point earning history
- **FR73:** System enforces daily receipt scan cap (5/day)
- **FR74:** System expires unused points after 12 months

### Location & Store Intelligence

- **FR75:** System auto-detects user's country
- **FR76:** System auto-detects user's currency based on location
- **FR77:** Users can manually set their preferred currency
- **FR78:** System can detect when user is in a known store (optional)
- **FR79:** Users can associate shopping lists with specific stores

### Cross-Device & Offline

- **FR80:** Users can access their data from multiple devices
- **FR81:** System syncs data across devices in real-time
- **FR82:** Users can use core features while offline
- **FR83:** System queues changes made offline for sync when online
- **FR84:** System resolves sync conflicts gracefully

### Onboarding

- **FR85:** New users see animated welcome experience
- **FR86:** New users can customize seeded products (remove unwanted items)
- **FR87:** New users can set default weekly budget
- **FR88:** Users can optionally grant location permission
- **FR89:** Users can skip optional onboarding steps

### Feedback & Celebrations

- **FR90:** System plays subtle sounds for key actions (configurable)
- **FR91:** System provides haptic feedback for interactions (configurable)
- **FR92:** System displays celebration when trip completed under budget
- **FR93:** Users can enable/disable sounds
- **FR94:** Users can enable/disable haptics
- **FR95:** System can auto-mute in detected store locations

### Admin Dashboard - Access & Security

- **FR96:** Admins can sign in to a separate admin interface with enhanced security
- **FR97:** Admin accounts require two-factor authentication
- **FR98:** System logs all admin actions in an audit trail
- **FR99:** Super-admins can create and manage other admin accounts
- **FR100:** Admins have role-based permissions (viewer, support, manager, super-admin)

### Admin Dashboard - Business Analytics

- **FR101:** Admins can view real-time user count (total, active, new today)
- **FR102:** Admins can view DAU/WAU/MAU metrics with trends
- **FR103:** Admins can view user retention cohort analysis
- **FR104:** Admins can view onboarding funnel completion rates
- **FR105:** Admins can view trial-to-paid conversion rate
- **FR106:** Admins can view churn rate and churn reasons
- **FR107:** Admins can view feature adoption metrics (% using each feature)
- **FR108:** Admins can filter analytics by date range
- **FR109:** Admins can compare metrics period-over-period

### Admin Dashboard - Revenue & Financial

- **FR110:** Admins can view Monthly Recurring Revenue (MRR)
- **FR111:** Admins can view Annual Recurring Revenue (ARR)
- **FR112:** Admins can view revenue growth trends
- **FR113:** Admins can view subscriber breakdown (monthly vs annual)
- **FR114:** Admins can view average revenue per user (ARPU)
- **FR115:** Admins can view customer lifetime value (LTV) estimates
- **FR116:** Admins can view loyalty point discount impact on revenue
- **FR117:** Admins can view total loyalty points liability (outstanding points)

### Admin Dashboard - Stripe Integration

- **FR118:** Admins can view all payment transactions
- **FR119:** Admins can view failed payment attempts
- **FR120:** Admins can view payment retry status
- **FR121:** Admins can issue refunds for specific transactions
- **FR122:** Admins can view subscription lifecycle events
- **FR123:** Admins can view upcoming renewals
- **FR124:** Admins can view revenue by payment method
- **FR125:** System syncs payment data from Stripe webhooks in real-time
- **FR126:** Admins can manually reconcile payment discrepancies

### Admin Dashboard - User Management

- **FR127:** Admins can search users by email, name, or ID
- **FR128:** Admins can view detailed user profile
- **FR129:** Admins can view user's subscription history
- **FR130:** Admins can view user's loyalty point history
- **FR131:** Admins can view user's receipt scan history
- **FR132:** Admins can extend user's trial period
- **FR133:** Admins can grant complimentary subscription
- **FR134:** Admins can add loyalty points manually
- **FR135:** Admins can reset user's password
- **FR136:** Admins can deactivate user account
- **FR137:** Admins can reactivate previously deactivated accounts
- **FR138:** Admins can view user's activity timeline

### Admin Dashboard - Receipt & Price Management

- **FR139:** Admins can view receipt scan volume metrics
- **FR140:** Admins can view OCR success rate metrics
- **FR141:** Admins can view AI parsing accuracy metrics
- **FR142:** Admins can view rejected receipts and rejection reasons
- **FR143:** Admins can review flagged/suspicious receipts
- **FR144:** Admins can manually approve or reject flagged receipts
- **FR145:** Admins can view crowdsourced price database
- **FR146:** Admins can search prices by item, store, or region
- **FR147:** Admins can edit incorrect crowdsourced prices
- **FR148:** Admins can delete spam or fraudulent price entries
- **FR149:** Admins can view price outlier reports
- **FR150:** Admins can bulk approve/reject price entries

### Admin Dashboard - Product & Content

- **FR151:** Admins can view and manage seeded UK staple products
- **FR152:** Admins can add new seeded products
- **FR153:** Admins can edit seeded product details
- **FR154:** Admins can remove seeded products
- **FR155:** Admins can manage product categories
- **FR156:** Admins can manage store name normalization rules
- **FR157:** Admins can view and edit item name canonicalization rules

### Admin Dashboard - System Health

- **FR158:** Admins can view system uptime metrics
- **FR159:** Admins can view API response time metrics
- **FR160:** Admins can view error rate trends
- **FR161:** Admins can view recent error logs
- **FR162:** Admins can view third-party service status
- **FR163:** Admins can view database storage usage
- **FR164:** Admins can view sync queue status
- **FR165:** Admins can view background job status
- **FR166:** System sends alerts to admins when error thresholds exceeded

### Admin Dashboard - Customer Support

- **FR167:** Admins can view support ticket queue
- **FR168:** Admins can impersonate user view (read-only)
- **FR169:** Admins can view user's recent shopping lists
- **FR170:** Admins can view user's stock tracker state
- **FR171:** Admins can trigger password reset email for user
- **FR172:** Admins can export user's data (GDPR request)
- **FR173:** Admins can permanently delete user's data (GDPR request)

### Admin Dashboard - Communication

- **FR174:** Admins can create in-app announcements
- **FR175:** Admins can schedule announcements for future dates
- **FR176:** Admins can target announcements to user segments
- **FR177:** Admins can view announcement read/dismiss rates
- **FR178:** Admins can create email campaigns (future)

### Admin Dashboard - Configuration

- **FR179:** Admins can toggle feature flags on/off
- **FR180:** Admins can enable features for specific user segments
- **FR181:** Admins can configure loyalty point earning rules
- **FR182:** Admins can configure receipt validation thresholds
- **FR183:** Admins can configure subscription pricing
- **FR184:** Admins can configure trial period length
- **FR185:** Admins can configure daily receipt scan cap

### Admin Dashboard - Reporting

- **FR186:** Admins can export user list to CSV
- **FR187:** Admins can export revenue reports to CSV
- **FR188:** Admins can export analytics data to CSV
- **FR189:** Admins can schedule automated weekly reports via email
- **FR190:** Admins can export audit logs

---

## Non-Functional Requirements

### Performance

| Requirement | Target | Rationale |
|-------------|--------|-----------|
| **NFR-P1:** App cold start to usable | <2 seconds | In-store impatience |
| **NFR-P2:** Budget bar update on item change | <100ms | Must feel instant |
| **NFR-P3:** List item check/uncheck | <50ms visual response | Tactile satisfaction |
| **NFR-P4:** Receipt camera to preview | <1 second | Keep flow moving |
| **NFR-P5:** Receipt OCR processing | <5 seconds | Client-side acceptable |
| **NFR-P6:** AI receipt parsing | <3 seconds (API call) | User sees progress indicator |
| **NFR-P7:** Animation frame rate | 60fps consistent | Emotional UX requires smoothness |
| **NFR-P8:** Offline mode activation | <500ms detection | Seamless transition |
| **NFR-P9:** Search/filter response | <200ms | Instant feedback |
| **NFR-P10:** Lighthouse Performance score | >90 | PWA best practice |

### Security

| Requirement | Target | Rationale |
|-------------|--------|-----------|
| **NFR-S1:** Data encryption at rest | AES-256 (Convex/Clerk default) | Protect user data |
| **NFR-S2:** Data encryption in transit | TLS 1.3 | All API calls encrypted |
| **NFR-S3:** Authentication tokens | JWT with SecureStore (Expo) | Prevent XSS token theft |
| **NFR-S4:** Password requirements | Min 8 chars, complexity check | Basic security hygiene |
| **NFR-S5:** Session timeout | 30 days (remember me) / 24hr (default) | Balance security/convenience |
| **NFR-S6:** Admin 2FA | Required for all admin accounts | Protect admin access |
| **NFR-S7:** Payment data handling | Never store card data (Stripe handles) | PCI compliance |
| **NFR-S8:** Receipt photo storage | Encrypted, user-owned, deletable | GDPR compliance |
| **NFR-S9:** Rate limiting | 100 requests/min per user | Prevent abuse |
| **NFR-S10:** GDPR data export | <48 hours fulfillment | UK legal requirement |
| **NFR-S11:** GDPR data deletion | <30 days complete removal | UK legal requirement |
| **NFR-S12:** Audit logging | All admin actions logged with timestamp | Accountability |

### Scalability

| Requirement | Target | Rationale |
|-------------|--------|-----------|
| **NFR-SC1:** Initial capacity | 1,000 concurrent users | MVP launch |
| **NFR-SC2:** 12-month capacity | 10,000 concurrent users | Growth target |
| **NFR-SC3:** Database growth | Handle 1M+ price records | Crowdsourced DB scale |
| **NFR-SC4:** Receipt storage | 100GB+ image storage | Growing archive |
| **NFR-SC5:** Graceful degradation | Core features work if non-critical services down | Stripe down ≠ app unusable |
| **NFR-SC6:** Horizontal scaling | Convex auto-scales on demand | Traffic spikes (shopping seasons) |
| **NFR-SC7:** Database connection pooling | Convex managed | Handle concurrent queries |

### Reliability

| Requirement | Target | Rationale |
|-------------|--------|-----------|
| **NFR-R1:** System uptime | 99.5% (excl. planned maintenance) | Standard SaaS expectation |
| **NFR-R2:** Offline functionality | 100% core features (stock, list, budget) | Critical for in-store use |
| **NFR-R3:** Data sync reliability | Zero data loss on sync | User trust |
| **NFR-R4:** Conflict resolution | Last-write-wins with merge for lists | Predictable behavior |
| **NFR-R5:** Crash-free sessions | 99.5%+ | Quality mobile experience |
| **NFR-R6:** Receipt processing retry | Auto-retry 3x on failure | Don't lose user effort |
| **NFR-R7:** Payment webhook reliability | Idempotent processing | Handle Stripe retries |
| **NFR-R8:** Backup frequency | Daily database backups | Disaster recovery |
| **NFR-R9:** Recovery point objective (RPO) | <24 hours | Max data loss window |
| **NFR-R10:** Recovery time objective (RTO) | <4 hours | Max downtime window |

### Accessibility

| Requirement | Target | Rationale |
|-------------|--------|-----------|
| **NFR-A1:** WCAG compliance | Level AA | Inclusive design |
| **NFR-A2:** Screen reader support | Full navigation and actions | Vision-impaired users |
| **NFR-A3:** Color contrast ratio | 4.5:1 minimum (text) | Readability |
| **NFR-A4:** Touch target size | 44x44px minimum | Motor impairment, thumb-friendly |
| **NFR-A5:** Keyboard navigation | Full functionality | Accessibility + power users |
| **NFR-A6:** Reduced motion support | Respect prefers-reduced-motion | Motion sensitivity |
| **NFR-A7:** Font scaling | Support up to 200% | Vision impairment |
| **NFR-A8:** Error messaging | Clear, actionable error states | All users benefit |

### Integration

| Requirement | Target | Rationale |
|-------------|--------|-----------|
| **NFR-I1:** Stripe webhook latency | Process within 5 seconds | Subscription status accuracy |
| **NFR-I2:** Convex Realtime | <1 second sync propagation | Cross-device experience |
| **NFR-I3:** Gemini API fallback | Graceful degradation if unavailable | Receipt still saved, parsing queued |
| **NFR-I4:** Google Places timeout | 3 second timeout, fallback to manual | Don't block user |
| **NFR-I5:** Third-party monitoring | Alert on integration failures | Proactive issue detection |
| **NFR-I6:** API versioning | Support deprecated APIs for 6 months | Smooth migrations |

### Mobile-Native (v2)

| Requirement | Target | Rationale |
|-------------|--------|-----------|
| **NFR-M1:** Native performance | 60fps animations, instant feedback | Premium feel |
| **NFR-M2:** Platform-adaptive UI | Liquid Glass (iOS) / Material You (Android) | Native look/feel |
| **NFR-M3:** Offline-first | All core features work offline | Store connectivity unreliable |
| **NFR-M4:** Local storage | <50MB typical usage | Efficient data management |
| **NFR-M5:** Optimistic updates | Instant UI response | Perceived performance |
| **NFR-M6:** Background sync queue | Persist across app restarts via Convex | No lost changes |

