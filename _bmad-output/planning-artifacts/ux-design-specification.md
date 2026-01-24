---
stepsCompleted: ['step-01-init', 'step-02-discovery', 'step-03-core-experience', 'step-04-emotional-response', 'step-05-inspiration', 'step-06-design-system', 'step-07-defining-experience', 'step-08-visual-foundation', 'step-09-design-directions', 'step-10-user-journeys', 'step-11-component-strategy', 'step-12-ux-patterns', 'step-13-responsive-accessibility', 'step-14-complete']
workflowComplete: true
completedAt: '2026-01-24'
inputDocuments: ['_bmad-output/planning-artifacts/product-brief.md', '_bmad-output/planning-artifacts/prd.md']
---

# UX Design Specification - Oja

**Author:** Diloc
**Date:** 2026-01-24

---

## Executive Summary

### Project Vision

Oja is a budget-first shopping PWA that transforms grocery shopping from an anxiety-inducing guessing game into a controlled, confident experience. The core innovation is simple but profound: know your total before entering the store, not after.

Unlike traditional shopping apps that are glorified notepads, Oja combines:
- **Stock tracking** that auto-populates lists (you never forget essentials)
- **Budget simulation** that shows your total in real-time
- **Receipt intelligence** that learns actual prices for better estimates
- **Emotional UX** that makes staying under budget feel like winning, not restricting

The platform is a Progressive Web App (PWA) targeting UK shoppers, with Stripe payments avoiding 15-30% app store fees.

### Target Users

**Primary Personas:**

1. **Sarah (Anxious Overspender)** - Needs to feel in control without feeling deprived. Success metric: walks out under budget and feels empowered.

2. **Marcus (Sceptical New User)** - Expects to delete the app within a week. Needs frictionless onboarding (<90 seconds) with immediate value (pre-populated pantry).

3. **Priya (Power User)** - Shopping is precision operation. Needs advanced features (impulse fund, shopping mode) without cluttering the basic experience.

4. **James (Tech-Struggling)** - Not tech-savvy, needs forgiving UX with graceful recovery from mistakes and no dead ends.

5. **David (Data-Focused)** - Dislikes flashy apps. Values clean data presentation over celebration. Test case for "mature gamification."

### Key Design Challenges

1. **Budget Visualization** - The "Safe Zone" glow must reduce anxiety, not create it. Color transitions (green → amber → red) need to feel informative, not alarming.

2. **Stock Level Interaction** - Tap-and-hold with liquid drain animation must feel satisfying enough to encourage regular updates. This is the pantry's stickiness factor.

3. **Receipt Scanning Flow** - Camera → OCR → AI parsing is technically complex. UX must hide complexity while maintaining user control over corrections.

4. **Onboarding Friction** - Pre-seeded products + budget dial must deliver "ready to shop" feeling in under 90 seconds. Any more and Marcus deletes.

5. **Offline Trust** - Users in stores with poor connectivity must feel confident their data is safe. No loading spinners that create uncertainty.

6. **Mature Gamification** - Loyalty points and celebrations that feel adult, not childish. David's test: would an accountant use this without embarrassment?

### Design Opportunities

1. **Safe Zone as Brand Signature** - Ambient glow showing budget status is unique in the market. Competitors show numbers; Oja shows *feeling*.

2. **Liquid Animation System** - Stock levels that drain like containers create visceral satisfaction. Updates feel good instead of obligatory.

3. **Pre-Shop Confidence** - Running total before leaving home is the killer feature. No competitor offers "know your total before you shop."

4. **Quiet Celebration Philosophy** - Brief confetti (1 second, muted colors, fades quickly) creates premium feel. Victory is acknowledged, not announced.

5. **Community Contribution Feedback** - "Your prices helped 12 shoppers this month" creates belonging without leaderboards or competition.

---

## Core User Experience

### Defining Experience

The core Oja experience is the **in-store shopping loop**: checking off items while watching the budget respond in real-time. This interaction must feel instant (<100ms) and satisfying. If users don't feel in control during this loop, the entire product fails.

**Core Loop:**
```
Pantry (Out) → Shopping List → In-Store Checkout → Receipt Scan → Pantry (Stocked)
```

Each stage flows naturally into the next. Stock running out creates the list. The list guides shopping. Shopping creates receipts. Receipts update stock and prices. The cycle reinforces itself.

### Platform Strategy

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Platform | PWA (Mobile-First) | Avoid app store fees, instant updates |
| Primary Input | Touch | In-store, one-handed use |
| Offline | 100% Core Features | Store connectivity is unreliable |
| Camera | Required | Receipt scanning |
| Location | Optional | Store detection, not required |
| Touch Targets | 44x44px minimum | Accessibility, thumb-friendly |

**Shopping Mode:** When user begins checking items, interface adapts:
- Larger touch targets
- Budget bar more prominent
- Simplified actions (check/uncheck focus)
- Auto-mute option in detected stores

### Effortless Interactions

**Automated:**
- "Out" stock items → automatically added to next list
- Trip completion → stock levels reset to "Stocked"
- Cross-device sync → happens invisibly
- Shopping Mode → activates based on context

**One-Tap:**
- Check/uncheck items
- Confirm AI-parsed receipt
- Accept budget suggestion
- Dismiss celebrations

**Gesture-Based:**
- Swipe left/right → change item priority
- Tap-and-hold → change stock level
- Pull-to-refresh → manual sync (rarely needed)

### Critical Success Moments

| Moment | Target User | Success Indicator |
|--------|-------------|-------------------|
| Under-budget checkout | Sarah | Brief celebration, feels empowered not deprived |
| Onboarding complete | Marcus | <90 seconds, feels "ready to shop" |
| Receipt scan works | Priya | Camera to confirmed items <10 seconds |
| Error recovery | James | Clear path forward, no dead ends |
| Monthly review | David | Clean data, no forced celebration |

### Experience Principles

1. **Budget Visibility, Not Anxiety** - Safe Zone glow is supportive, not judgmental

2. **Instant Feedback, Always** - Every interaction produces immediate response (<100ms for budget)

3. **Progressive Disclosure** - Simple for new users, powerful for experts

4. **Offline-First Confidence** - No spinners, no waiting, it just works

5. **Celebration Without Cringe** - Brief, muted, adult-appropriate feedback

---

## Desired Emotional Response

### Primary Emotional Goals

**Core Feeling:** In control, confident, empowered - but never restricted or deprived.

Users should feel like they've gained a superpower: knowing their total before checkout. The anxiety that comes from uncertainty should be replaced by calm confidence.

**The Moment That Creates Advocates:**
Walking out of a store under budget and feeling *good* about it - not like they sacrificed, but like they succeeded.

### Emotional Journey Mapping

| Stage | Before Oja | With Oja |
|-------|------------|----------|
| Pre-shopping | Anxiety, uncertainty | Confidence, preparedness |
| In-store | Stress, mental math | Control, visibility |
| Checkout | Dread, hope | Calm expectation |
| Post-shopping | Regret or relief | Accomplishment |
| Long-term | Hopelessness | Measurable progress |

### Micro-Emotions

**Positive emotions to cultivate:**
- Reassurance (Safe Zone green)
- Alertness without panic (Safe Zone amber)
- Problem-solving mode (Safe Zone red)
- Satisfaction (stock updates, item checks)
- Quiet pride (under-budget completion)
- Trust (offline reliability)
- Belonging (community contribution)

**Negative emotions to prevent:**
- Shame (budget exceeded)
- Overwhelm (feature overload)
- Embarrassment (childish gamification)
- Distrust (sync uncertainty)
- Deprivation (budget as cage)
- Nagging (excessive notifications)

### Design Implications

| Emotion Goal | Design Decision |
|--------------|-----------------|
| Confidence | Budget always visible, instant updates |
| Control | User sets all limits, never auto-adjusted |
| Satisfaction | Tactile animations, subtle sounds |
| Progress | Data presentation, not grades or scores |
| Trust | Offline-first, no loading spinners |
| Calm | Warm palette, soft animations |

### Emotional Design Principles

1. **Support, Never Judge** - Helpful friend tone, not disapproving parent
2. **Celebrate Quietly** - Acknowledge wins without fanfare
3. **Visibility Builds Confidence** - Show status constantly, update instantly
4. **Graceful Failure** - Easy recovery, no dead ends
5. **Reliability Earns Trust** - Works offline, syncs invisibly

---

## UX Pattern Analysis & Inspiration

### Inspiring Products Analysis

**Monzo (Banking)**
- Spending visualization with color-coded categories
- Supportive, non-judgmental messaging about spending
- Instant transaction feedback
- Inspiration: Safe Zone glow, budget messaging tone

**Apple Reminders**
- Satisfying swipe-to-complete animations
- Swipe actions for different operations
- Clean, minimal visual hierarchy
- Inspiration: Item check-off, priority swipe gestures

**Headspace (Meditation)**
- Warm, calming color palette
- Progress tracking without pressure
- "It's okay" messaging for missed sessions
- Inspiration: Color system, over-budget tone

**Shazam (Music Recognition)**
- One-tap to core action
- Clear processing feedback
- Offline capability with later sync
- Inspiration: Receipt scan flow, offline queuing

**Revolut (Finance)**
- Weekly spending summaries
- Animated number transitions
- Category breakdown charts
- Inspiration: Insights format, number animations

### Transferable UX Patterns

**Navigation:**
- Bottom tab bar (standard, learnable)
- Floating action button for quick-add
- Pull-down-to-dismiss for sheets
- Swipe-to-action for item operations

**Interaction:**
- Long-press for context menus (stock levels)
- Radial dial for budget setting
- Swipe left/right for priority
- Animated progress rings for budget status

**Feedback:**
- Haptic on round numbers
- Subtle sounds on completion
- Color pulse for status changes
- Confetti for under-budget wins

**Visual:**
- Card-based layouts
- Ambient color backgrounds (Safe Zone)
- Progress as data, not gamification
- Illustrated empty states

### Anti-Patterns to Avoid

| Anti-Pattern | Prevention |
|--------------|------------|
| Aggressive upsells | Subscription prompt only in settings |
| Gamification overload | Data-focused progress, no XP/badges |
| Loading spinners | Offline-first, instant responses |
| Shame-based red warnings | Supportive amber/red messaging |
| Mandatory tutorials | Progressive disclosure, learn-by-doing |
| Notification spam | User-controlled, smart defaults |

### Design Inspiration Strategy

**Adopt:** Monzo's supportive tone, Apple's swipe gestures, progress rings, card layouts

**Adapt:** Headspace colors (faster for Oja), Revolut charts (simpler), Shazam processing (for OCR)

**Avoid:** Duolingo gamification, YNAB complexity, shame-based warnings, onboarding tutorials

---

## Design System Foundation

### Design System Choice

**Approach:** Themeable Custom System
**Foundation:** Tailwind CSS + shadcn/ui components
**Animation:** Framer Motion
**Icons:** Phosphor Icons

This gives us the speed of proven components with full control over Oja's emotional UX.

### Rationale for Selection

| Requirement | How This System Delivers |
|-------------|--------------------------|
| Emotional UX | Full customization of every component |
| Development Speed | shadcn/ui provides starting points |
| Accessibility | Built on Radix primitives (WCAG AA) |
| Animation Control | Framer Motion integrates seamlessly |
| Offline Performance | Tailwind is lightweight, no runtime |
| Brand Consistency | Design tokens ensure cohesion |

### Implementation Approach

**Layer 1 - Foundation:**
- Tailwind CSS for utilities and responsive design
- CSS Variables for design tokens
- Framer Motion for animation primitives

**Layer 2 - Primitives (shadcn/ui):**
- Button, Card, Dialog, Sheet, Toast
- Input, Select, Checkbox, Switch
- Tabs, Tooltip, Progress

**Layer 3 - Oja Custom Components:**
- BudgetRing (circular progress with Safe Zone glow)
- StockItem + StockLevelPicker (liquid animation)
- SwipeableListItem (priority gestures)
- SafeZoneGlow (ambient background effect)
- ConfettiCelebration (under-budget win)
- ReceiptScanner + ReconciliationView
- WeeklyDigest + CategoryChart

### Customization Strategy

**Design Tokens:**
- Brand colors (orange palette, warm neutrals)
- Safe Zone colors (green, amber, red)
- Animation durations (fast: 100ms, normal: 300ms, slow: 500ms)
- Touch targets (minimum 44px)
- Card styling (16px padding, 12px radius)

**Component Styling:**
- All shadcn/ui components customized with Oja personality
- Warm, rounded aesthetic (border-radius: 12px+)
- Orange accent for primary actions
- Subtle shadows (no harsh borders)
- Framer Motion for all state transitions

---

## Defining Experience Deep Dive

### The Core Interaction

**"Check off items and watch your budget respond in real-time."**

This is the Tinder-swipe moment for Oja. The defining action users will describe to friends: *"I know my total before I reach the checkout."*

Like Tinder reduced dating to a simple gesture, Oja reduces budget anxiety to a single visual feedback loop: tap item → see budget change → feel in control. If we nail this interaction, everything else follows.

### User Mental Model

**How Users Currently Solve This:**
- Mental math while shopping (exhausting, inaccurate)
- Paper lists with price estimates (tedious, quickly forgotten)
- Checking basket total at checkout (anxiety-inducing surprise)
- Existing apps as glorified notepads (no budget awareness)

**The Mental Model Shift:**
| Before Oja | With Oja |
|------------|----------|
| Shopping lists are passive | Lists talk back with budget |
| Budget discovered at checkout | Budget known in real-time |
| Price tracking is tedious | Price learning is automatic |
| Overspending is failure | Budget status is visible control |

**Potential Confusion Points:**
- Safe Zone glow needs instant recognition without tutorial
- Price estimate accuracy must build trust quickly
- Red zone must support decision-making, not induce shame

### Success Criteria for Core Experience

| Criterion | Target | Rationale |
|-----------|--------|-----------|
| Check-off response | <100ms | Instant feels magical; any delay feels broken |
| Budget comprehension | <2 seconds | Glance at Safe Zone = instant status understanding |
| First-time glow recognition | 90%+ | New users understand Safe Zone without explanation |
| Total accuracy | ±£2 or 85%+ | Estimates must be close enough to build confidence |
| Emotional outcome | Calm, not anxious | Safe Zone reduces stress, never creates it |

**Success Indicators:**
- User checks item and immediately glances at budget (feedback loop working)
- User says "I can afford one more thing" with confidence (control achieved)
- User reaches checkout within predicted range (trust established)
- User shows friend the Safe Zone glow (advocacy moment created)

### Novel UX Patterns

**Established Patterns Adopted:**
- Checkbox lists (universal understanding)
- Bottom tab navigation (thumb-zone familiar)
- Pull-to-refresh (learned behaviour)
- Card-based layouts (scannable, modern)
- Swipe gestures (priority changes)

**The Safe Zone Innovation:**
Unlike competitors showing numbers, Oja shows *feeling* through ambient glow:

| Zone | Colour | Meaning | User Feeling |
|------|--------|---------|--------------|
| Safe | Green | Well under budget | Confidence, freedom |
| Caution | Amber | Approaching limit | Alertness, mindfulness |
| Over | Red | Budget exceeded | Decision mode (not shame) |

**Familiar Metaphor:** Traffic lights - everyone understands green/amber/red. But instead of harsh indicators, ambient glows make the screen itself breathe the budget status.

**Learning Method:** Onboarding dial sets budget with instant Safe Zone preview. Users learn by experiencing, not reading tutorials.

### Experience Mechanics

**Initiation:**
- App opens → shopping list with budget bar always visible
- Safe Zone glow subtly colours background
- "Shopping Mode" auto-activates when checking begins or store detected
- Touch targets enlarge, interface simplifies

**Interaction:**
- Primary action: Tap checkbox (44x44px minimum)
- Item slides to checked state with satisfying animation
- Budget ring animates simultaneously (<100ms)
- Safe Zone colour adjusts in real-time

**Feedback System:**
| Type | Implementation | Purpose |
|------|----------------|---------|
| Visual | Budget ring fills, Safe Zone shifts | Primary feedback |
| Haptic | Subtle vibration on round numbers | Milestone awareness |
| Audio | Optional soft tick (user-controlled) | Confirmation |
| Numerical | Running total animates | Precision for data-focused users |

**Completion Flow:**
1. All items checked → "Trip Complete" prompt
2. Under budget → Brief confetti (1 second, muted, adult-appropriate)
3. Receipt scan prompt appears
4. Stock levels auto-reset to "Stocked"

**Error Recovery:**
- Accidental tap → Easy undo (tap again or shake)
- Over budget → Supportive message: "Let's review what's important"
- Connection loss → Full offline function, invisible later sync
- Incorrect item → Swipe to edit or remove

---

## Visual Design Foundation

### Color System

**Brand Colors:**
| Token | Hex | Usage |
|-------|-----|-------|
| `--color-orange` | #FF6B35 | Primary actions, CTAs, brand identity |
| `--color-orange-light` | #FF8A5C | Hover states, secondary emphasis |
| `--color-orange-dark` | #E55A2B | Active/pressed states |
| `--color-charcoal` | #2D3436 | Primary text, headings |
| `--color-warm-white` | #FFFAF8 | Backgrounds, surfaces |
| `--color-cream` | #FFF5F0 | Card backgrounds, subtle containers |

**Safe Zone Colors (Emotional Feedback):**
| Token | Hex | Meaning | Background Opacity |
|-------|-----|---------|-------------------|
| `--safe-zone-green` | #10B981 | Under budget, safe | 15% |
| `--safe-zone-amber` | #F59E0B | Approaching limit | 15% |
| `--safe-zone-red` | #EF4444 | Over budget | 15% |

**Semantic Colors:**
- Success: #10B981 (confirmations)
- Warning: #F59E0B (caution states)
- Error: #EF4444 (supportive error messaging)
- Info: #3B82F6 (informational)
- Muted: #9CA3AF (secondary text)
- Border: #E5E7EB (subtle dividers)

### Typography System

**Font Stack:**
```css
--font-primary: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
--font-mono: 'JetBrains Mono', 'SF Mono', Consolas, monospace;
```

**Type Scale:**
| Level | Size | Weight | Usage |
|-------|------|--------|-------|
| Display | 32px | 700 | Hero headings |
| H1 | 24px | 600 | Page titles |
| H2 | 20px | 600 | Section headings |
| H3 | 18px | 500 | Card titles |
| Body | 16px | 400 | Primary content |
| Body Small | 14px | 400 | Secondary content |
| Caption | 12px | 400 | Labels, hints |
| Budget Display | 28px | 700 | Running total |

**Principles:** Readability first (16px minimum), weight hierarchy for structure, tabular figures for prices.

### Spacing & Layout Foundation

**Base Unit:** 4px

**Spacing Scale:**
| Token | Value | Usage |
|-------|-------|-------|
| `--space-2` | 8px | Component internal |
| `--space-4` | 16px | Default padding |
| `--space-6` | 24px | Card margins |
| `--space-8` | 32px | Section breaks |

**Touch Targets:**
- Buttons/Checkboxes: 44x44px minimum
- List items: 48px height
- Navigation tabs: 64px height

**Border Radius:**
- Small (badges): 8px
- Medium (cards, buttons): 12px
- Large (modals): 16px
- Full (pills): 9999px

### Accessibility Considerations

**Contrast Compliance (WCAG AA):**
- Charcoal on Warm White: 12.6:1 (AAA)
- Orange on Charcoal: 4.1:1 (AA)
- All Safe Zone colors meet AA on white backgrounds

**Accessibility Features:**
- Reduced motion respect (`prefers-reduced-motion`)
- High contrast mode with increased saturation
- rem-based typography for user scaling
- 2px orange focus indicators
- Safe Zone icons paired with colours (never colour-only)
- Screen reader announcements for budget status changes

---

## Design Direction Decision

### Design Directions Explored

Six comprehensive design directions were created and evaluated:

1. **Card-Heavy Layout** - Prominent cards, clear visual hierarchy, contained sections
2. **Minimal Clean** - Maximum white space, budget-dominant display, calm aesthetic
3. **Dashboard Focus** - Metrics-forward, priority indicators, data-rich interface
4. **List-Centric** - Sticky budget, drag handles, category groups, efficient scrolling
5. **Visual/Illustrated** - Category cards with icons, warm and inviting, playful elements
6. **Compact/Dense** - Information-dense, tab filtering, power-user optimized

Each direction applied the established design foundation (orange brand, Safe Zone system, warm aesthetic) in different ways to explore layout, density, and interaction approaches.

**Design Direction Visualizer:** `_bmad-output/planning-artifacts/ux-design-directions.html`

### Chosen Direction

**Primary: Card-Heavy Layout (Direction 1)** with adaptive elements

This direction was selected as the foundation because it:
- Provides clear visual hierarchy without overwhelming new users
- Features Safe Zone glow prominently as ambient background
- Uses budget ring for instant status comprehension
- Balances friendliness (Sarah, James) with structure (Priya, David)
- Maintains warm, supportive aesthetic aligned with emotional goals

**Adaptive Elements Incorporated:**
- Sticky budget bar (from Direction 4) activates in Shopping Mode
- Tab filtering (from Direction 6) available for power users
- Category grouping (from Direction 4) as optional organization view

### Design Rationale

| Persona | How This Direction Serves Them |
|---------|-------------------------------|
| Sarah (Anxious) | Cards feel contained and manageable, not overwhelming |
| Marcus (Sceptical) | Clean enough to feel simple, structured enough to trust |
| Priya (Power User) | Sticky budget + tabs give efficiency without changing core |
| James (Tech-Struggling) | Large touch targets, clear boundaries, forgiving UX |
| David (Data-Focused) | Budget ring shows clean data, no forced celebration |

**Safe Zone Integration:**
- Ambient background glow (15% opacity) creates emotional context
- Budget ring in header provides precise numeric feedback
- Both work together: feeling (glow) + data (ring)

### Implementation Approach

**Core Layout Structure:**
```
┌─────────────────────────────────┐
│  Header: Greeting + Budget Ring │
├─────────────────────────────────┤
│  Safe Zone Glow (background)    │
│  ┌───────────────────────────┐  │
│  │  Card: Shopping List      │  │
│  │  - Item rows with checks  │  │
│  └───────────────────────────┘  │
│  ┌───────────────────────────┐  │
│  │  Card: Running Low        │  │
│  └───────────────────────────┘  │
├─────────────────────────────────┤
│  Bottom Navigation (4 tabs)     │
└─────────────────────────────────┘
```

**Shopping Mode Adaptation:**
- Sticky budget bar appears at top
- Touch targets enlarge to 48px+
- Cards simplify to check/uncheck focus
- Safe Zone glow becomes more prominent

**Component Priorities:**
1. BudgetRing - Circular progress with Safe Zone colors
2. SafeZoneGlow - Animated background effect
3. ItemCard - Checkable list item with price
4. StickyBudgetBar - Compact budget display for scrolling

---

## User Journey Flows

### Onboarding Flow (Marcus - New User)

**Goal:** Ready to shop in under 90 seconds with no commitment walls.

**Flow Steps:**
1. App Launch → Welcome (no login wall)
2. UK Essentials Selection → Pre-populated, remove unwanted
3. Budget Dial → Haptic feedback on round numbers
4. Location Permission → Optional, "Maybe Later" available
5. First List Generated → From "Out" items
6. ✓ Ready to Shop (<90 seconds)
7. Account Creation → Deferred, optional

**Key Design Decisions:**
- No authentication required to start
- Pre-seeded items reduce setup friction
- Budget dial creates engaging first interaction
- Value proven before commitment requested

### Shopping Trip Flow (Sarah/Priya)

**Goal:** Check items with instant budget feedback, feel in control throughout.

**Flow Steps:**
1. Open List → Shopping Mode auto-activates in store
2. Check Item → Budget updates (<100ms)
3. Safe Zone Feedback → Green (safe) / Amber (caution) / Red (over)
4. Over Budget → Show priorities, swipe to defer
5. Trip Complete → Brief celebration if under budget
6. Receipt Scan Prompt → Stock auto-updates

**Key Design Decisions:**
- Shopping Mode enlarges touch targets
- Budget feedback must be instant (<100ms)
- Over-budget shows options, never shame
- Celebration is brief (1 second max)

### Receipt Scanning Flow (Sarah/James)

**Goal:** Camera to confirmed items in under 10 seconds.

**Flow Steps:**
1. Tap Scan → Camera with receipt frame guide
2. Auto-Capture → When receipt detected
3. AI Parsing → Brief processing animation
4. Review Matches → Green (matched), Yellow (partial), Red (failed)
5. Manual Fallback → Always available for failures
6. Confirm → Prices update, stock resets

**Key Design Decisions:**
- Auto-capture reduces taps
- Partial matches acceptable (not failure)
- Manual entry always available
- Community price update is silent

### Pantry Management Flow (Priya)

**Goal:** Keep pantry accurate with satisfying interactions.

**Flow Steps:**
1. Open Pantry → Items grouped by category
2. Long-Press Item → Stock level picker with liquid animation
3. Set Level → Stocked / Running Low / Out
4. Auto-List → "Out" items auto-add to shopping list
5. Swipe Actions → Edit (left), Add to List (right)

**Key Design Decisions:**
- Liquid drain animation creates satisfaction
- "Out" triggers automatic list addition
- Swipe gestures for power users
- Category grouping matches store layout

### Error Recovery Patterns (James)

**Design Principle:** No dead ends, graceful recovery from any state.

| Error Type | Recovery Method |
|------------|-----------------|
| Accidental tap | Shake or tap again to undo |
| Wrong item | Swipe to remove or edit |
| Scan failed | Manual entry option |
| Forgot budget | Set anytime, gentle prompt |
| Connection lost | Full offline functionality |

### Journey Design Patterns

**Navigation:**
- Bottom tab bar (List, Pantry, Scan, Insights)
- FAB for quick-add
- Swipe gestures for item actions

**Feedback:**
- Budget <100ms response
- Haptic on milestones
- Brief celebration (1s)
- Supportive messaging

**Recovery:**
- Undo always available
- Manual fallback for automation
- Offline-first architecture

---

## Component Strategy

### Design System Components

**Foundation (shadcn/ui + Tailwind):**
Button, Card, Checkbox, Dialog, Input, Sheet, Tabs, Toast, Progress, Tooltip

All foundation components customized with Oja tokens:
- Orange accent (#FF6B35) for primary actions
- 12px border radius for warmth
- 44px minimum touch targets
- Framer Motion transitions

### Custom Components

**P0 - Core Experience:**

| Component | Purpose | Key Feature |
|-----------|---------|-------------|
| BudgetRing | Circular budget progress | Safe Zone colors, <100ms updates |
| SafeZoneGlow | Ambient background | 15% opacity, subtle breathing |
| SwipeableListItem | Gesture-enabled list item | Swipe for edit/priority |
| ConfettiCelebration | Win acknowledgment | 1s duration, muted colors |

**P1 - Supporting Features:**

| Component | Purpose | Key Feature |
|-----------|---------|-------------|
| StockLevelPicker | Pantry stock selection | Liquid drain animation |
| StickyBudgetBar | Scroll-persistent budget | Compact, always visible |
| BudgetDial | Onboarding budget setter | Haptic on round numbers |

**P2 - Advanced Features:**

| Component | Purpose | Key Feature |
|-----------|---------|-------------|
| ReceiptScanner | Camera receipt capture | Auto-detect, frame guide |
| ReconciliationView | Receipt match review | Green/yellow/red indicators |
| WeeklyDigest | Summary card | Clean data, no gamification |
| CategoryChart | Spending breakdown | Simple bar chart |

### Component Specifications Summary

**BudgetRing:**
- Circular progress with Safe Zone colors (green/amber/red)
- Props: current, budget, size, animated
- Accessibility: role="progressbar" with full ARIA

**SafeZoneGlow:**
- Ambient gradient overlay (15% opacity)
- Props: status, intensity, animated
- Subtle pulse in caution/over states

**SwipeableListItem:**
- Swipe left for edit, right for priority
- 50px threshold, spring animation
- Keyboard accessible (E, P shortcuts)

**StockLevelPicker:**
- Radio group with liquid animation
- 300ms spring transition
- Full keyboard navigation

### Implementation Roadmap

**Phase 1 (MVP):** BudgetRing, SafeZoneGlow, SwipeableListItem, ConfettiCelebration
**Phase 2 (Pantry):** StockLevelPicker, StickyBudgetBar, BudgetDial
**Phase 3 (Advanced):** ReceiptScanner, ReconciliationView, WeeklyDigest, CategoryChart

---

## UX Consistency Patterns

### Budget Feedback Patterns

**Safe Zone System:**
| Status | Color | Trigger | Message Tone |
|--------|-------|---------|--------------|
| Safe | Green #10B981 | <80% budget | "You're on track" |
| Caution | Amber #F59E0B | 80-100% budget | "Getting close" |
| Over | Red #EF4444 | >100% budget | "Let's review" |

**Timing:** Budget updates <100ms, color transitions 200ms.
**Never:** Flash colors, use alarms, shame-based messages, block actions.

### Button Hierarchy

| Type | Appearance | Usage |
|------|------------|-------|
| Primary | Orange fill | One per screen, main action |
| Secondary | Orange outline | Supporting actions |
| Ghost | Text only | Tertiary actions |
| Destructive | Red outline | Delete/remove |

**Rules:** One primary per area, 44x44px minimum, primary on right.

### List Interactions

**Gestures:**
- Tap: Check/uncheck item
- Swipe left: Edit action
- Swipe right: Priority action
- Long press: Reorder

**Feedback:** Checked items fade to 60% with strikethrough.

### Navigation Patterns

**Bottom Tabs:** List, Pantry, Scan, Insights
- Active: Orange filled icon
- Instant switching, no animation delay
- Tabs always visible (except camera)

### Form Patterns

**Validation:** On blur, clear on typing, errors below field.
**States:** Default (grey) → Focused (orange) → Error (red).

### Empty & Loading States

**Empty:** Centered illustration + clear message + single action button.
**Loading:** <100ms none, 100-500ms skeleton, >500ms spinner.
**Offline:** Subtle badge, full functionality, "Will sync" message.

### Modal Patterns

**Bottom Sheets:** Drag handle, pull-down dismiss, 90% max height.
**Dialogs:** Destructive confirmations only, 2 buttons max, primary on right.

### Notification Patterns

**Toasts:** Success (green/3s), Info (blue/4s), Warning (amber/5s), Error (red/manual).
**Rules:** One at a time, swipe dismiss, include undo when applicable.
**Celebration:** 1 second confetti, muted colors, respects reduced motion.

---

## Responsive Design & Accessibility

### Responsive Strategy

**Device Priority:** Mobile (P0) → Tablet (P1) → Desktop (P2)

**Mobile (Primary):** Full-featured, bottom tabs, single column, 44px touch targets.
**Tablet:** Scaled mobile layout, larger spacing.
**Desktop:** Max-width 480px centered, mobile-app feel.

### Breakpoint Strategy

| Breakpoint | Range | Target |
|------------|-------|--------|
| `xs` | 0-374px | Small phones |
| `sm` | 375-767px | Standard phones (primary) |
| `md` | 768-1023px | Tablets |
| `lg` | 1024px+ | Desktop |

**Approach:** Mobile-first CSS, same layout constrained on larger screens.

### Accessibility Strategy

**Target:** WCAG 2.1 AA Compliance

**Key Requirements:**
- Color contrast: 4.5:1 (normal), 3:1 (large)
- Touch targets: 44x44px minimum
- Keyboard: Full navigation support
- Screen reader: ARIA labels, live regions
- Safe Zone: Icons + color (never color alone)
- Reduced motion: Respects `prefers-reduced-motion`

**Safe Zone Accessibility:**
| Visual | Alternative |
|--------|-------------|
| Green glow | ✓ icon + "Budget safe" |
| Amber glow | ⚠ icon + "Budget caution" |
| Red glow | ✕ icon + "Over budget" |

### Testing Strategy

**Responsive:** DevTools (every PR), real devices (weekly), BrowserStack (pre-release).
**Accessibility:** axe-core in CI, VoiceOver/NVDA testing, keyboard-only validation.

**Priority Devices:** iPhone 13+, Samsung Galaxy S21+, iPad, Desktop Chrome/Safari.

### Implementation Guidelines

**Responsive:**
- Mobile-first Tailwind classes
- Relative units (rem, %)
- Max-width 480px on desktop

**Accessibility:**
- Semantic HTML structure
- ARIA roles and labels
- Focus management
- Skip links
- Live regions for dynamic content
