# Oja - Product Brief

> **Budget-First Shopping Confidence** - Not tracking what you spent (past tense), but CONTROLLING what you'll spend (future tense).

---

## Document Info

| Field | Value |
|-------|-------|
| **Product Name** | Oja |
| **Version** | 0.1.0 (MVP) |
| **Created** | 2026-01-24 |
| **Target Market** | United Kingdom (architecture: global) |
| **Platform** | Native Mobile (Expo) - iOS/Android |

---

## 🚨 ARCHITECTURE PIVOT NOTICE (2026-01-26)

**This Product Brief was originally written for v1 (PWA). The platform has pivoted to v2 (Native Mobile).**

| What Changed | v1 → v2 |
|--------------|---------|
| Platform | PWA → **Native Mobile (Expo/React Native)** |
| Backend | Convex → **Convex** |
| Auth | Convex Auth → **Clerk** |
| UI | Tailwind → **Liquid Glass (iOS) / Material You (Android)** |

**Product vision, features, and user journeys remain unchanged.**

**For v2 technical details, see:** `architecture-v2-expo-convex.md`

---

## 1. Problem Statement

Shoppers struggle to stay within budget because:

- They don't know prices until checkout
- Impulse purchases aren't pre-budgeted
- They feel embarrassed removing items at the register
- Existing apps are either glorified notepads OR complex budgeting tools that feel like homework
- Starting from a blank list creates friction and abandonment

**The emotional problem:** Anxiety before entering a store, uncertainty during shopping, regret after checkout.

---

## 2. Solution: Oja

A mobile shopping list app that gives shoppers **control and confidence** over their spending through:

1. **Pre-shop budget simulation** - Know your total before you leave home
2. **Active stock tracking** - Your pantry manages your list automatically
3. **AI-powered receipt reconciliation** - Learn actual vs planned spending
4. **Crowdsourced price intelligence** - Community-powered price estimates
5. **Behavioral insights** - Weekly/monthly spending improvement tracking

---

## 3. Core Features (MVP)

### 3.1 Active Stock Tracker

Track household inventory with visual states that auto-populate shopping lists.

| State | Visual | Behavior |
|-------|--------|----------|
| **Stocked** | Full container icon | Just purchased |
| **Good** | ¾ filled | Comfortable supply |
| **Low** | ¼ filled, amber tint | Heads-up warning |
| **Out** | Empty outline, red | Auto-adds to "Next Trip" list |

**Interaction:**
- Tap & hold item → liquid drain animation → select new level
- Quick-swipe down to decrease one level
- "Out" state triggers satisfying whoosh animation as item flies to Next Trip list

### 3.2 Shopping List with Budget Lock

| Feature | Description |
|---------|-------------|
| **Budget Setting** | Set total budget per shopping trip |
| **Running Total** | Live calculation as items added |
| **Budget Lock Mode** | Hard cap - warns before exceeding |
| **Impulse Fund** | Separate flex budget for unplanned items |
| **Safe Zone Indicator** | Visual glow: green (safe) → amber (close) → red (over) |
| **Swipe Priority** | Swipe right = must-have, left = nice-to-have |
| **Auto-Suggest Drops** | When over budget, suggest removing nice-to-haves |

### 3.3 Receipt Scanning & Reconciliation

```
User snaps receipt → OCR extracts text → AI parses to structured data →
User confirms/corrects → Prices saved to personal history + crowdsource DB
```

**Data extracted:**
- Store name (normalized)
- Date
- Item names (normalized)
- Quantities
- Unit prices
- Totals

**Reconciliation view:**
- Planned vs Actual comparison
- Variance highlighting
- "Missed items" (bought but not on list)
- "Skipped items" (on list but not bought)

### 3.4 Crowdsourced Price Database

| Aspect | Implementation |
|--------|----------------|
| **Data source** | User receipt scans across all users |
| **Partitioning** | By country → region → store |
| **Confidence scoring** | Multiple reports increase confidence |
| **Freshness** | Weighted average of last 30 days |
| **Outlier handling** | Auto-flag prices ±40% from median |

### 3.5 Smart Onboarding (Seeded Products)

New users see pre-populated staples with estimated prices instead of blank canvas.

**UK Seeded Categories:**
```
Proteins:    Eggs, Chicken breast, Beef mince, Salmon fillets
Dairy:       Milk (2L), Butter, Cheddar cheese, Greek yoghurt
Carbs:       Sliced bread, Basmati rice, Pasta, Potatoes
Produce:     Bananas, Tomatoes, Onions, Carrots, Broccoli
Pantry:      Olive oil, Salt, Black pepper, Stock cubes, Tinned tomatoes
Household:   Toilet roll, Kitchen roll, Washing up liquid, Bin bags
```

Users tap to remove unwanted items (editing > creating).

### 3.6 Shopping Archives & Insights

**Weekly/Monthly Digest - "Your Oja Week":**
```
This Week vs Last Week
├── Total Spent: £87.40 (↓ 12% from last week)
├── Budget Adherence: 3/4 trips stayed under budget
├── Most Overspent Category: Snacks (+£8.50)
└── Insight: "You save £4.20 avg when you shop on Tuesdays"

Monthly Trends
├── Spending trend graph
├── Category breakdown pie chart
├── Budget success rate
└── Price change alerts on staples
```

### 3.7 Location Intelligence

| Feature | Implementation |
|---------|----------------|
| **Auto-detect country** | GPS + IP fallback |
| **Auto-detect currency** | Based on country |
| **Store detection** | Google Places API when entering known stores |
| **Store-specific prices** | Same item, different prices per store |

---

## 4. Technical Architecture

### ⚠️ v1 Architecture Section (See v2 Notice Above)

**This section describes v1 (PWA). For v2 (Native Mobile), see `architecture-v2-expo-convex.md`**

### 4.1 v2 Platform: Native Mobile (Expo)

| Factor | v1 (PWA) | v2 (Native) |
|--------|----------|-------------|
| Performance | Good | **60fps native animations** |
| UI | Web-based | **Platform-adaptive (Liquid Glass/Material You)** |
| Offline | Service Workers | **Convex optimistic updates** |
| Haptics | Limited | **Comprehensive (Expo Haptics)** |

### 4.2 v2 Stack

| Layer | Technology |
|-------|------------|
| **Framework** | Expo SDK 55+ (React Native) |
| **Language** | TypeScript (strict) |
| **Routing** | Expo Router |
| **UI** | Liquid Glass (iOS) / Material You (Android) |
| **Auth** | Clerk |
| **Backend** | Convex |
| **AI** | Jina AI + Gemini |
| **Payments** | Stripe |
| **Animations** | React Native Reanimated |

---

## v1 Technical Architecture (Archived - Not Implemented)

### 4.1 v1 Platform Decision: Progressive Web App (PWA)

**Why PWA over Native Apps:**

| Factor | Native (App Store) | PWA (Direct) |
|--------|-------------------|--------------|
| Payment fees | 15-30% to Apple/Google | ~3% (Stripe) |
| On £3.99/mo | Keep £2.79-3.39 | Keep £3.87 |
| Updates | App review required | Instant deploy |
| Install | App store download | "Add to Home Screen" |

### 4.2 v1 Stack Decision (Not Implemented)

| Layer | Technology | Rationale |
|-------|------------|-----------|
| **Framework** | Next.js 14 (App Router) | Best PWA support, SSR, excellent AI docs |
| **Language** | TypeScript (strict) | Type safety, AI-friendly |
| **Styling** | Tailwind CSS | Utility-first, rapid development |
| **Animations** | Framer Motion | 60fps, gesture support, emotional UX |
| **Icons** | Phosphor Icons | Warm, emotional, duotone support |
| **PWA** | next-pwa + Workbox | Offline, install prompt, caching |
| **State** | Zustand | Simple, TypeScript-friendly |
| **Server State** | TanStack Query | Caching, background sync |
| **Backend** | Convex | Postgres + Auth + Realtime + Edge Functions |
| **OCR** | Tesseract.js | Client-side, free, runs in browser |
| **AI Parsing** | Gemini 1.5 Flash | Free tier (1500 req/day) |
| **Payments** | Stripe Checkout | Direct payments, no app store fees |
| **Analytics** | PostHog | Privacy-friendly, generous free tier |
| **Error Tracking** | Sentry | Industry standard, free tier |

### 4.3 Project Structure (PWA)

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
│   │   └── page.tsx             # Landing page
│   ├── api/                      # API routes
│   │   ├── receipts/parse/      # Receipt parsing
│   │   └── webhooks/stripe/     # Stripe webhooks
│   ├── layout.tsx
│   └── manifest.ts               # PWA manifest
├── components/
│   ├── ui/                       # Design system primitives
│   │   ├── Button.tsx
│   │   ├── Card.tsx
│   │   ├── Input.tsx
│   │   ├── Badge.tsx
│   │   └── BudgetRing.tsx
│   ├── stock/                    # Stock tracker components
│   │   ├── StockItem.tsx
│   │   ├── StockLevelPicker.tsx
│   │   └── PantryGrid.tsx
│   ├── list/                     # Shopping list components
│   │   ├── ListItem.tsx
│   │   ├── ListSummary.tsx
│   │   ├── BudgetBar.tsx
│   │   └── SwipeableItem.tsx
│   ├── receipt/                  # Receipt scanning
│   │   ├── CameraView.tsx
│   │   ├── ReceiptPreview.tsx
│   │   └── ReconciliationView.tsx
│   └── insights/                 # Analytics components
│       ├── WeeklyDigest.tsx
│       ├── SpendingChart.tsx
│       └── CategoryBreakdown.tsx
├── lib/
│   ├── supabase/                 # Convex client
│   │   ├── client.ts
│   │   ├── server.ts
│   │   └── middleware.ts
│   ├── stores/                   # Zustand stores
│   │   ├── useListStore.ts
│   │   ├── useStockStore.ts
│   │   └── useUserStore.ts
│   ├── hooks/                    # Custom hooks
│   │   ├── useLocation.ts
│   │   ├── useCurrency.ts
│   │   └── useReceiptScan.ts
│   ├── ai/                       # AI utilities
│   │   ├── parseReceipt.ts
│   │   └── normalizeItems.ts
│   └── utils/                    # General utilities
│       ├── currency.ts
│       └── date.ts
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
├── tsconfig.json
└── package.json
```

### 4.3 Database Schema (Convex/Postgres)

```sql
-- Users (handled by Convex Auth, extended)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  display_name TEXT,
  currency TEXT DEFAULT 'GBP',
  country TEXT DEFAULT 'GB',
  onboarding_completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Stock Items (Pantry)
CREATE TABLE stock_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT,
  stock_level TEXT CHECK (stock_level IN ('stocked', 'good', 'low', 'out')),
  icon TEXT,
  default_price DECIMAL(10,2),
  preferred_store TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Shopping Lists
CREATE TABLE shopping_lists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT DEFAULT 'Shopping List',
  budget DECIMAL(10,2),
  status TEXT CHECK (status IN ('active', 'shopping', 'completed', 'archived')),
  store_id UUID REFERENCES stores(id),
  completed_at TIMESTAMPTZ,
  actual_total DECIMAL(10,2),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- List Items
CREATE TABLE list_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  list_id UUID REFERENCES shopping_lists(id) ON DELETE CASCADE,
  stock_item_id UUID REFERENCES stock_items(id),
  name TEXT NOT NULL,
  estimated_price DECIMAL(10,2),
  actual_price DECIMAL(10,2),
  quantity INTEGER DEFAULT 1,
  priority TEXT CHECK (priority IN ('must_have', 'nice_to_have')),
  checked BOOLEAN DEFAULT FALSE,
  from_stock_auto BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Stores
CREATE TABLE stores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  name_normalized TEXT NOT NULL,
  chain TEXT,
  country TEXT NOT NULL,
  region TEXT,
  place_id TEXT UNIQUE,
  latitude DECIMAL(10,8),
  longitude DECIMAL(11,8),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Crowdsourced Prices
CREATE TABLE prices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_name_normalized TEXT NOT NULL,
  store_id UUID REFERENCES stores(id),
  country TEXT NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  currency TEXT NOT NULL,
  reported_by UUID REFERENCES profiles(id),
  confidence_score DECIMAL(3,2) DEFAULT 0.5,
  reported_at TIMESTAMPTZ DEFAULT NOW(),

  -- Composite index for lookups
  UNIQUE(item_name_normalized, store_id, reported_at)
);

-- Receipts (for history/reconciliation)
CREATE TABLE receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  list_id UUID REFERENCES shopping_lists(id),
  store_id UUID REFERENCES stores(id),
  image_url TEXT,
  raw_ocr_text TEXT,
  parsed_data JSONB,
  total DECIMAL(10,2),
  receipt_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Weekly Insights Cache
CREATE TABLE weekly_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  week_start DATE NOT NULL,
  total_spent DECIMAL(10,2),
  trips_count INTEGER,
  under_budget_count INTEGER,
  top_category TEXT,
  category_breakdown JSONB,
  insights JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id, week_start)
);

-- Indexes
CREATE INDEX idx_stock_items_user ON stock_items(user_id);
CREATE INDEX idx_stock_items_level ON stock_items(user_id, stock_level);
CREATE INDEX idx_list_items_list ON list_items(list_id);
CREATE INDEX idx_prices_lookup ON prices(item_name_normalized, country, store_id);
CREATE INDEX idx_prices_recent ON prices(reported_at DESC);
CREATE INDEX idx_shopping_lists_user ON shopping_lists(user_id, status);
```

### 4.4 External Services

| Service | Purpose | Free Tier |
|---------|---------|-----------|
| **Convex** | Database, Auth, Storage, Functions | 500MB DB, 1GB storage, 50K MAU |
| **Tesseract.js** | Client-side OCR | Unlimited (runs in browser) |
| **Gemini 1.5 Flash** | Receipt parsing AI | 1,500 requests/day |
| **Google Places API** | Store detection | $200/month credit |
| **exchangerate.host** | Currency conversion | Unlimited |
| **PostHog** | Analytics | 1M events/month |
| **Sentry** | Error tracking | 5K errors/month |
| **Vercel** | Hosting & Edge Functions | 100GB bandwidth/month |
| **Stripe** | Payments | Pay per transaction (~3%) |

---

## 5. Design System

### 5.1 Color Palette

```typescript
// constants/colors.ts

export const colors = {
  // Primary
  orange: {
    DEFAULT: '#FF6B35',
    light: '#FF8A5C',
    dark: '#E55A2B',
    muted: 'rgba(255, 107, 53, 0.2)',
  },

  // Neutrals
  grey: {
    50: '#FAFAFA',
    100: '#F5F5F5',    // Light grey (primary background)
    200: '#E5E5E5',
    300: '#D4D4D4',
    400: '#A3A3A3',
    500: '#737373',
    600: '#525252',
    700: '#404040',
    800: '#262626',
    900: '#171717',
  },

  charcoal: '#2D3436',  // Deep charcoal (text)

  // Warm tones
  peach: {
    light: '#FFFAF8',   // Warm white (base background)
    DEFAULT: '#FFE8E0', // Soft peach (card highlights)
  },

  // Semantic
  success: {
    DEFAULT: '#10B981', // Emerald - under budget
    light: '#D1FAE5',
    dark: '#059669',
  },

  warning: {
    DEFAULT: '#F59E0B', // Amber - approaching limit
    light: '#FEF3C7',
    dark: '#D97706',
  },

  danger: {
    DEFAULT: '#EF4444', // Red - over budget
    light: '#FEE2E2',
    dark: '#DC2626',
  },

  // Stock levels
  stock: {
    stocked: '#10B981',
    good: '#10B981',
    low: '#F59E0B',
    out: '#EF4444',
  },
} as const;
```

### 5.2 Typography

```typescript
// constants/typography.ts

export const typography = {
  fonts: {
    heading: 'Inter_700Bold',
    body: 'Inter_400Regular',
    bodyMedium: 'Inter_500Medium',
    mono: 'JetBrainsMono_400Regular', // For prices
  },

  sizes: {
    xs: 12,
    sm: 14,
    base: 16,
    lg: 18,
    xl: 20,
    '2xl': 24,
    '3xl': 30,
    '4xl': 36,
  },

  lineHeights: {
    tight: 1.25,
    normal: 1.5,
    relaxed: 1.75,
  },
} as const;
```

### 5.3 Icon System (Phosphor)

```typescript
// Icon usage guide

import {
  House,
  ListChecks,
  PlusCircle,
  ShieldCheck,
  Warning,
  Camera,
  Drop,
  ChartLineUp,
  Confetti,
  Storefront,
  GearSix,
  ShoppingCart,
  Receipt,
  Trash,
  Check,
  X,
  CaretRight,
  MagnifyingGlass,
} from '@phosphor-icons/react';

// Weight options: thin, light, regular, bold, fill, duotone

// Navigation (duotone, orange when active)
<House weight="duotone" size={24} color={isActive ? colors.orange.DEFAULT : colors.grey[400]} />

// Actions (bold)
<PlusCircle weight="bold" size={28} color={colors.orange.DEFAULT} />

// Stock levels (fill for full, light for empty)
<Drop weight="fill" color={colors.stock.stocked} />   // Stocked
<Drop weight="regular" color={colors.stock.good} />   // Good
<Drop weight="light" color={colors.stock.low} />      // Low
<Drop weight="thin" color={colors.stock.out} />       // Out
```

### 5.4 Animation Specifications

```typescript
// Animation timing using Framer Motion

export const animations = {
  // Micro-interactions
  stockDecrease: {
    duration: 0.3,
    ease: 'easeOut',
  },

  itemToNextList: {
    duration: 0.4,
    ease: [0.175, 0.885, 0.32, 1.275], // Spring-like
  },

  budgetPulse: {
    duration: 0.5,
    ease: 'easeInOut',
  },

  budgetWobble: {
    duration: 0.2,
    type: 'spring',
    stiffness: 300,
  },

  checkmarkDraw: {
    duration: 0.6,
    ease: 'easeOut',
  },

  cardFlip: {
    duration: 0.15,
    staggerChildren: 0.05,
  },

  confetti: {
    duration: 1,
    particleCount: 50,
  },
};

// Framer Motion variants
export const fadeIn = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
};

export const slideUp = {
  initial: { y: 20, opacity: 0 },
  animate: { y: 0, opacity: 1 },
  exit: { y: -20, opacity: 0 },
};

// Animation triggers
// - Stock decrease: liquid drains down
// - Item → Next List: card slides right with ghost trail
// - Budget safe: soft green pulse (once)
// - Over budget: gentle red wobble (subtle)
// - Receipt scanned: checkmark draws itself
// - Weekly insight: cards flip in sequence (staggered)
// - Trip complete under budget: confetti burst
```

### 5.5 Component Patterns

**Card Component:**
```
- Background: peach.light (#FFFAF8)
- Border: none (use shadow)
- Shadow: 0 1px 3px rgba(0,0,0,0.08)
- Border radius: 12px
- Padding: 16px
```

**Budget Ring:**
```
- Circular progress indicator
- Track: grey.200
- Fill: success.DEFAULT (under) → warning.DEFAULT (near) → danger.DEFAULT (over)
- Stroke width: 6px
- Size: 48px (nav) / 120px (detail)
```

**Safe Zone Glow:**
```
- Subtle outer glow on main container
- Under budget: success.light with 0.3 opacity
- Near limit: warning.light with 0.4 opacity
- Over budget: danger.light with 0.4 opacity
```

---

## 6. User Flows

### 6.1 Onboarding (New User)

```
1. Welcome Screen
   └── "Welcome to Oja" + animated shopping bag fills

2. Seeded Products
   └── Pre-populated staples cascade in
   └── "Tap to remove what you don't need"
   └── User taps X on unwanted items

3. Set Default Budget
   └── Dial/slider with haptic at round numbers
   └── "What's your typical weekly shop budget?"

4. Enable Location (optional)
   └── Explain benefit: auto-detect store, local prices
   └── Skip option available

5. Ready Screen
   └── Confetti burst (1 second)
   └── "You're ready to shop smarter"
   └── CTA: "Start my first list"
```

### 6.2 Stock Update Flow

```
1. User views Pantry (home screen)
   └── Grid of stock items with fill indicators

2. Long-press item
   └── Item lifts with shadow
   └── 4 level options appear below

3. Select new level
   └── Liquid animation adjusts
   └── Item settles with bounce

4. If "Out" selected
   └── Item waves goodbye
   └── Slides to "Next Trip" section
   └── Subtle haptic feedback
```

### 6.3 Shopping Trip Flow

```
1. Create/Open List
   └── See items (auto-added from "Out" stock + manual)
   └── Budget bar at top

2. At Store (location detected)
   └── "Shopping Mode" activates
   └── Larger checkboxes
   └── Running total prominent

3. Check Items
   └── Swipe or tap to check
   └── Price adjusts if different from estimate
   └── Budget bar updates in real-time

4. Complete Shopping
   └── Review summary
   └── Option to scan receipt

5. Receipt Scan (optional)
   └── Camera opens
   └── Auto-capture on receipt detection
   └── AI parses items
   └── User confirms/corrects
   └── Data saved to history + crowdsource

6. Trip Complete
   └── If under budget: confetti + savings shown
   └── Stock items auto-update to "Stocked"
   └── List archived
```

---

## 7. MVP Scope & Priorities

### Phase 1: Core Loop (MVP)

| Priority | Feature | Status |
|----------|---------|--------|
| P0 | User auth (Convex) | Pending |
| P0 | Basic shopping list CRUD | Pending |
| P0 | Budget setting & tracking | Pending |
| P0 | Stock tracker with 4 states | Pending |
| P0 | Auto-add "Out" items to list | Pending |
| P1 | Manual price entry | Pending |
| P1 | Seeded UK staples (manual) | Pending |
| P1 | List completion & archiving | Pending |

### Phase 2: Intelligence

| Priority | Feature | Status |
|----------|---------|--------|
| P1 | Receipt scanning (OCR) | Pending |
| P1 | AI receipt parsing | Pending |
| P1 | Personal price history | Pending |
| P2 | Receipt reconciliation view | Pending |
| P2 | Crowdsourced price DB | Pending |

### Phase 3: Insights

| Priority | Feature | Status |
|----------|---------|--------|
| P2 | Weekly spending digest | Pending |
| P2 | Monthly trends | Pending |
| P2 | Category breakdown | Pending |
| P3 | Predictive budgeting | Pending |
| P3 | Spending behavior insights | Pending |

### Phase 4: Location Intelligence

| Priority | Feature | Status |
|----------|---------|--------|
| P2 | Auto-detect currency | Pending |
| P2 | Store detection | Pending |
| P3 | Store-specific prices | Pending |
| P3 | Multi-store price comparison | Pending |

---

## 8. Success Metrics

| Metric | Target (MVP) | Measurement |
|--------|--------------|-------------|
| **Onboarding completion** | >70% | Users completing all onboarding steps |
| **Weekly active users** | 40% of signups | Users with activity in 7-day window |
| **Lists created** | 2+ per user/month | Average lists per active user |
| **Budget adherence** | 60% under budget | Trips completed within budget |
| **Receipt scans** | 30% of trips | Trips with receipt reconciliation |
| **Stock feature usage** | 50% of users | Users with 5+ stock items tracked |

---

## 9. UK Market Context

### Target Stores (Priority Order)

1. **Tesco** (27% market share)
2. **Sainsbury's** (15%)
3. **Asda** (14%)
4. **Aldi** (10%)
5. **Morrisons** (9%)
6. **Lidl** (7%)
7. Co-op
8. Waitrose
9. M&S Food
10. Iceland

### Market Opportunity

- 78% of UK households actively budget groceries (2024-2025)
- Cost of living concerns at record highs
- Aldi & Lidl growth indicates price-conscious behavior
- Digital receipt adoption increasing via loyalty apps

---

## 10. Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| **Poor OCR on receipts** | Bad prices in DB | User confirmation step + confidence scoring |
| **Store name variations** | Fragmented data | Fuzzy matching + normalization layer |
| **Item name chaos** | Inconsistent prices | AI canonicalization + manual curation |
| **Free tier limits** | Service disruption | Monitor usage, plan upgrade thresholds |
| **Cold start (no prices)** | Poor new user experience | Manual seed data for UK top 50 items |

---

## 11. Open Questions

1. **Offline support depth** - Full offline list management or online-required for prices?
2. **Family/household sharing** - Include in MVP or Phase 2?
3. **Notification strategy** - Stock low alerts? Weekly digest push?
4. **Monetization** - Freemium? Ads? Premium insights?

---

## Appendix A: Package Dependencies

```json
{
  "dependencies": {
    "next": "^14.2.0",
    "react": "^18.3.0",
    "react-dom": "^18.3.0",
    "@supabase/supabase-js": "^2.45.0",
    "@supabase/ssr": "^0.4.0",
    "@tanstack/react-query": "^5.50.0",
    "zustand": "^4.5.0",
    "framer-motion": "^11.3.0",
    "@phosphor-icons/react": "^2.1.0",
    "tesseract.js": "^5.1.0",
    "@stripe/stripe-js": "^4.1.0",
    "date-fns": "^3.6.0",
    "zod": "^3.23.0",
    "idb": "^8.0.0"
  },
  "devDependencies": {
    "typescript": "^5.5.0",
    "@types/react": "^18.3.0",
    "@types/node": "^20.14.0",
    "tailwindcss": "^3.4.0",
    "autoprefixer": "^10.4.0",
    "postcss": "^8.4.0",
    "next-pwa": "^5.6.0",
    "workbox-webpack-plugin": "^7.1.0"
  }
}
```

---

## Appendix B: Environment Variables

```bash
# .env.local

# Convex
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key

# Google (for Places API)
NEXT_PUBLIC_GOOGLE_PLACES_API_KEY=your_api_key

# Gemini AI
GEMINI_API_KEY=your_gemini_key

# Stripe
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your_stripe_pk
STRIPE_SECRET_KEY=your_stripe_sk
STRIPE_WEBHOOK_SECRET=your_webhook_secret

# PostHog
NEXT_PUBLIC_POSTHOG_API_KEY=your_posthog_key
NEXT_PUBLIC_POSTHOG_HOST=https://eu.posthog.com

# Sentry
NEXT_PUBLIC_SENTRY_DSN=your_sentry_dsn
```

---

*Document maintained by BMAD workflow. Last updated: 2026-01-24*
