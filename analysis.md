# Oja UX/UI Deep Analysis

> **Analyst:** Sally (UX Designer Agent)
> **Date:** 31 January 2026
> **Scope:** Full app visual, interaction, and emotional audit against 6 core experience goals
> **Method:** Planning docs review + full codebase audit + E2E visual walkthrough of all screens

---

## Table of Contents

- [Executive Summary](#executive-summary)
- [Criterion 1: Simple](#criterion-1-simple)
- [Criterion 2: Easy to Use](#criterion-2-easy-to-use)
- [Criterion 3: Not Overwhelming or Info Heavy](#criterion-3-not-overwhelming-or-info-heavy)
- [Criterion 4: Emotional Experience](#criterion-4-emotional-experience)
- [Criterion 5: Make Users Want to Stay](#criterion-5-make-users-want-to-stay)
- [Criterion 6: Make Users Keep Coming Back](#criterion-6-make-users-keep-coming-back)
- [Cross-Cutting Analysis: Color](#cross-cutting-analysis-color)
- [Cross-Cutting Analysis: Typography](#cross-cutting-analysis-typography)
- [Cross-Cutting Analysis: Spacing & Layout](#cross-cutting-analysis-spacing--layout)
- [Cross-Cutting Analysis: Navigation](#cross-cutting-analysis-navigation)
- [Summary: Strengths to Protect](#summary-strengths-to-protect)
- [Summary: Critical Gaps to Address](#summary-critical-gaps-to-address)
- [Priority Recommendations](#priority-recommendations)

---

## Executive Summary

Oja has a **beautiful, premium visual identity**. The deep navy glassmorphism, teal accents, and smooth animation system create an app that *looks* like it belongs on a flagship phone next to banking and fintech apps. The design system is well-architected with consistent tokens, reusable glass components, and clear platform adaptations.

However, **looking premium and feeling simple are in tension right now.** Several key screens show too much information at once. The app feels like a powerful *tool* more than a *companion*. Users will respect it but may not love it. The emotional design exists in the planning docs (quiet celebrations, warm micro-interactions, sound design) but is only partially realized in the current build. The trip summary screen is the one genuine emotional peak — the rest of the experience is transactional.

**The core risk:** Users adopt the app because it's useful, but don't form an emotional bond with it. They use it when they remember to, rather than reaching for it instinctively. The difference between a 3-month retention rate of 20% and 60% lives in this gap.

### Score Against 6 Criteria

| Criterion | Current Score | Target | Gap |
|-----------|:---:|:---:|:---:|
| 1. Simple | 6/10 | 9/10 | Individual components are clean, but screens accumulate too much |
| 2. Easy to Use | 7/10 | 9/10 | Core flows work, but discovery of gestures and some button purposes is weak |
| 3. Not Overwhelming | 5/10 | 9/10 | **Biggest gap.** Multiple screens are info-dense dashboards |
| 4. Emotional Experience | 4/10 | 8/10 | Premium look but cold feel. Trip summary is the only emotional moment |
| 5. Want to Stay On | 3/10 | 7/10 | Task-oriented design with no browse/discover/linger reward |
| 6. Keep Coming Back | 5/10 | 8/10 | Retention mechanics exist conceptually but aren't felt in the UI yet |

---

## Criterion 1: Simple

### What "Simple" Means for Oja

Simple doesn't mean fewer features. It means **each moment shows only what matters *right now*.** A user checking their pantry before heading to Tesco shouldn't see a search bar, category filters, 100 items across 5 categories, swipe hints, and a settings icon all at once. They should see: "Here's what you're running low on."

### Strengths

- **4-tab navigation** is a proven, intuitive pattern. Stock, Lists, Scan, Profile maps perfectly to the user's mental model of the shopping lifecycle
- **Empty states** are clean and well-messaged with single clear CTAs ("Create Your First List")
- **Single-purpose screens** — Scan is just scan, Trip Summary is just the summary
- **Glass card system** creates clear visual containers that separate content zones
- **Tab naming** is good: "Stock" and "Lists" are concrete, not abstract

### Concerns

**1. List Detail Screen — Too Many Zones**

This is the most complex screen in the app. In a single scroll viewport, users see:
- Circular Budget Dial (spent vs budget, tap to edit)
- Two action buttons ("Add from Pantry" + "Go Shopping")
- Add Item form (collapsed behind "+ Add Item" button; expands to name, qty, price inputs + variant picker + inline suggestions)
- Items list (with checkboxes, prices, status badges, comment/delete icons)

That's **4 distinct functional zones**, each with multiple interactive elements. The add-form progressive disclosure helps, but the screen still has high cognitive load. The user who just wants to add "Milk" to their list has to visually parse past the budget dial, understand two action buttons, and find the add button.

**2. Pantry at Scale — 100 Items is Inventory Management**

"100 of 100 items" grouped into categories of 20 creates a long scrolling list. Even with category collapsing, this feels like managing a database, not glancing at your kitchen. The category "Dairy (20)" alone requires scrolling. At this density, the pantry stops being a quick-check tool and becomes a chore to review.

**3. Shopping Lists Header — Bell Placement**

The header shows: title + notification bell + "+ New List" button. "Join a shared list" is an inline card in the list body (good). The bell still adds visual noise — consider whether it earns its header placement or could live elsewhere.

### Recommendations

- [x] **List Detail:** Surface suggestions only after the user starts typing (currently always visible in add-item section)
- [x] **Pantry:** Default to "Needs Attention" view (Low + Out). "All items" as secondary. *(Implemented.)*
- [x] **Stock Level Picker:** Reduced to 3 levels (Stocked / Low / Out). *(Implemented.)*
- [x] **Lists Header:** Move notification bell out of header to reduce clutter. Header should be: title + "+ New List" only

---

## Criterion 2: Easy to Use

### What "Easy to Use" Means for Oja

Easy to use means **every interaction is either obvious or taught.** Users should never think "How do I...?" If a gesture exists, it should be discoverable on first encounter — not buried in hint text.

### Strengths

- **Swipe left/right on pantry items** for stock adjustment is intuitive once discovered — the physical metaphor of "sliding" a level makes sense
- **One-tap check-off** on shopping list items is standard and expected
- **"Add from Pantry" button** bridges pantry to list creation — reduces manual entry
- **Receipt scan flow** is well-guided: tips for best results, camera, preview with retake option, confirmation with editable items. This is a multi-step flow done right
- **Budget auto-calculation** removes mental math — CircularBudgetDial shows spent vs budget at a glance
- **Create list modal** has sensible defaults (today's date as name, £50 budget) — reduces decision friction

### Concerns

**1. Budget Dial Discoverability**

The `CircularBudgetDial` is tappable to edit the budget, but there's no visible affordance that it's interactive. A subtle edit hint or pencil badge could help discoverability.

**2. Suggestions Origin is Unclear**

The "Suggestions" section shows chips like "cereal, coffee, tea, sugar, eggs." Where do these come from? Are they AI-generated? Based on history? Popular items? Without context, the user doesn't trust the suggestions — and untrusted suggestions get ignored.

### Recommendations

- [x] **Budget dial:** Add a subtle "tap to edit" hint on first view or a small pencil badge on the dial to signal editability
- [x] **Gesture onboarding:** Interactive swipe tutorial on first launch. *(Implemented — `SwipeOnboardingOverlay`.)*
- [x] **Button labels:** "Add from Pantry" and "Go Shopping". *(Implemented.)*
- [x] **Suggestions context:** Subtitle shown explaining suggestion source. *(Implemented.)*
- [x] **Gauge:** 3-segment vertical bar with green/amber/red. *(Implemented.)*

---

## Criterion 3: Not Overwhelming or Info Heavy

### What "Not Overwhelming" Means for Oja

The user should feel **calm confidence**, not data anxiety. Every piece of information shown must earn its place. If data exists but isn't actionable *right now*, it should be accessible but not visible by default.

### Strengths

- **Deep blue background** creates a visually calm environment — the dark palette reduces eye strain and feels less aggressive than bright white interfaces
- **Glass cards** create clear boundaries between information zones — your eye can focus on one card at a time
- **Typography hierarchy** is well-defined — 48px display → 28px item names → 14px body creates a scannable page
- **Color coding** (green/amber/red for budget, semantic tab colors) helps categorize without reading

### Concerns — This is the Biggest Gap

**1. Profile Screen is a Dashboard, Not a Profile**

The Profile screen shows: account card, 4 shopping stat cards (Total Lists, Completed, Active, Shopping) in a 2x2 grid, Total Spent card, Stock Overview card, and a Loyalty & Rewards section below the fold. That's **8 data cards** on what should be the user's personal space. This is a dashboard disguised as a profile. The user came to see their account — they're hit with 8 numbers.

Compare to Instagram's profile: avatar, name, bio, 3 stats, grid. That's it. The data serves the user's identity, not the system's analytics.

**2. Insights Screen — Vertical Data Dump**

Insights stacks: This Week (4 stat cards), Weekly Challenge, Savings Jar (with milestone), Streaks, and Personal Bests — all in a single scrollable column. Each section is a glass card with internal data. For a user who opened this tab thinking "How am I doing?", the answer requires parsing 5 different sections with different data formats. The information is valuable but the presentation is exhausting.

**3. List Detail Screen — Information Density**

The list detail screen shows 4 functional zones (budget dial, action buttons, add-item form, items list). Progressive disclosure on the add-form helps, but the cognitive load is still high. Each zone has its own visual hierarchy, interactive elements, and data types. The user's eye has no single resting point.

**4. Pantry Category Density**

"Dairy (20)" means 20 items in one category alone. Even if other categories are collapsed, an expanded Dairy section is a vertical list of 20 glass cards. The user's question is usually "Do I need milk?" not "Let me review all 20 dairy products." The scale of information is mismatched with the intent.

**5. Teal Overuse Creates Visual Noise**

Teal (#00D4AA) is used for: primary buttons, active tab indicators, progress bar fills, checkmarks, text highlights, card borders, icon accents, budget healthy state, "Go Shopping" button, add item (+) button, and link text. When the primary accent appears 10+ times per screen, it stops being a signal and becomes wallpaper. The eye can't distinguish "what's the main action here?" because everything glows the same teal.

### Recommendations

- [ ] **Profile:** Reduce to: Account card + one "Quick Stats" summary line ("3 lists this month · £48 saved") + navigation links (Insights, Subscription, Settings). Move detailed stats to the Insights screen where they belong
- [ ] **Insights:** Lead with one emotional headline ("You saved £48 this month") with a single visual. Collapse detailed sections behind expandable cards. Let the user choose what to drill into rather than dumping everything
- [x] **List Detail:** Progressive disclosure — add-item form hidden behind "+ Add Item" button. *(Implemented.)*
- [x] **Pantry:** "Needs Attention" default view with "All Items" as secondary. *(Implemented.)*
- [ ] **Teal usage:** Reserve teal exclusively for **primary CTAs and active states.** Use the secondary color (indigo #6366F1) or white/gray for secondary interactive elements. Budget healthy state can use green (#10B981) without teal. Checkmarks can be white on teal background (smaller teal surface area). The rule: if you can only tap one thing on screen, THAT thing is teal

---

## Criterion 4: Emotional Experience

### What "Emotional Experience" Means for Oja

An emotional experience means **the app makes you feel something beyond utility.** It's the difference between a calculator and a game. The user should feel: proud when they save money, relieved when they're under budget, delighted by small surprises, and warmly supported when things don't go perfectly.

### Strengths

- **Trip Summary "Saved £30.15"** — This is the emotional crown jewel. The trophy icon, the large teal number, the "60% under budget" subtitle. This is a genuine moment of pride. The user feels like they won something. This screen alone proves the team understands emotional design. It just needs to happen more
- **Glass design creates premium feel** — The depth, blur effects, and dark palette feel like a luxury product. Users will feel like they're using something high-end, which creates a baseline of respect and trust
- **Gauge indicators add personality** — The 3-segment vertical bar gauge is a characterful stock visualization. It gives pantry items a "face" — each item feels like it has a status, not just data. The color progression (green → amber → red) communicates urgency at a glance
- **Empty state messaging** — "Your stock is empty — Add items to keep track of what you have at home" is warm and guiding, not clinical. This is good emotional grounding

### Concerns — The Emotional Gap is Real

**1. The App Looks Premium but Feels Cold**

Deep navy + teal + white is the color palette of financial technology. It says "trust" and "precision." It does not say "warmth," "care," or "your kitchen companion." There's no warm color in the primary palette. No amber glow (except for warnings), no soft coral, no creamy off-white. The app feels like it was designed by an accountant who went to design school — technically perfect, emotionally reserved.

Compare to apps with high emotional engagement: Headspace (warm gradients, illustrations, personality), Duolingo (bright colors, character mascot, playful animations), or even Apple Health (clean but with motivating green rings and celebration moments). Oja has the "clean" but not the "motivating."

**2. Day-to-Day Usage Has No Delight Moments**

The trip summary is great — but it happens once per shopping trip (weekly for most users). In between, the daily interactions are: open pantry → check stock → maybe adjust a level → close. That loop has zero delight. No "You've been stocked up for 5 days!" celebration. No "Good morning, you're well-stocked today" greeting. No subtle animation when everything is green. The daily touchpoints are purely transactional.

**3. Checking Off Items Should Feel Satisfying**

Checking items off a shopping list is one of the most frequent interactions. The current implementation shows a checkbox animation (scale bounce) and strikethrough text. But this should be a *moment*. Think of the satisfaction of crossing something off a paper list. The haptic feedback is there (code confirms medium impact), but visually, the item just gets a line through it. There's no "done" feeling — no color shift, no gentle slide, no sense of progress.

**4. Budget Tracker is Informational, Not Emotional**

The CircularBudgetDial shows spent vs budget as a visual ring — an improvement over a flat progress bar. But it's still purely numerical. What the user actually feels is: "I'm doing great, loads of room left." The emotional version would add a one-line sentiment below: "Looking good — lots of room left" (green), "Getting close" (amber), "Over budget" (red). The data is correct; the narrative is missing.

**5. Savings Jar at £0.00 Feels Discouraging**

For a new user, the Insights screen shows: £0.00 spent, 0% vs last week, 0 trips, £0.00 saved. The Savings Jar shows "£0.00 saved across 0 trips." This is technically accurate but emotionally deflating. It's like opening a piggy bank and seeing it's empty. A new user should see aspiration, not absence: "Your savings jar is ready — complete your first trip to start saving!"

**6. No Personality in the Voice**

The app's copy is functional and clear, but it has no personality. Compare:
- Current: "Add items to keep track of what you have at home"
- Warmer: "Let's fill your pantry — what's in the kitchen?"
- Current: "No shopping lists"
- Warmer: "Ready for your first shop?"

The glass design gives a visual identity. But the voice gives emotional identity. Right now, the app speaks like a manual, not a friend.

### Recommendations

- [ ] **Add a warm accent color** to the palette — a soft amber or coral (#FFB088 or similar) used sparingly for celebration moments, milestones, and encouraging text. Not replacing teal, but complementing it with warmth
- [ ] **Micro-celebrations on check-off** — When checking off a list item, briefly flash the item row green, show a subtle checkmark burst animation, and update the progress indicator with a smooth fill. The physical equivalent: the satisfying click of a pen checking a box
- [x] **Budget tracker emotional mode** — Below or instead of the numbers, show a one-line sentiment: "Looking good — lots of room left" (green), "Getting close — stay focused" (amber), "Over budget — time to review" (red). Lead with feeling, support with data ✅ Sentiment line added below dial, color-matched to budget state
- [ ] **Savings jar warmth** — At £0.00, show an illustration of an empty jar with "Your first savings are just one trip away." At any positive amount, show the jar filling with animated coins/notes. The visual metaphor makes the abstract (savings) feel tangible
- [x] **Voice audit** — Review all empty states, button labels, and section headers. Replace functional language with warm-but-clear alternatives. The goal: if the app could talk, it would sound like a supportive friend who's good with money, not a financial advisor ✅ Warmed up all empty state copy across pantry, lists, list detail, receipts

---

## Criterion 5: Make Users Want to Stay

### What "Want to Stay" Means for Oja

This doesn't mean addictive dark patterns. It means **the app rewards time spent beyond the immediate task.** The user opens the app to check their list, but stays because they discover something interesting, feel good about their progress, or find value in exploring.

### Strengths

- **Glass aesthetic is genuinely pleasant** — Users will enjoy looking at the app, which buys some passive dwell time
- **Insights gamification** (challenges, streaks, savings jar) creates a secondary reason to browse beyond task completion
- **Category browsing** in pantry could invite exploration if items had richer data (price history, substitutes)

### Concerns

**1. The App is Purely Task-Oriented**

Every screen serves a single task: manage stock, manage lists, scan receipt, view profile. There's no discovery surface, no content to browse, no "while you're here" engagement. This is correct for a utility app, but it means sessions are short: open → do task → close. Average session: 30-90 seconds.

**2. No Reward for Exploring**

If a user navigates to Insights out of curiosity, they see data. If they check their Savings Jar, they see a number. There's no "aha" moment for exploring — no "You didn't know this, but you've saved £12 more than last month" insight that makes the user feel smart for looking. Data without narrative is just noise.

**3. Insights Are Zeroes for New Users**

A new user who explores the Insights screen sees: £0.00, 0%, 0 trips, £0.00 saved. Every gamification element reads "you haven't done anything." This is the opposite of sticky — it tells the user "there's nothing for you here yet." Early users should see potential and aspiration, not emptiness.

**4. No Social or Community Layer**

Partner mode exists for shared lists, but there's no broader community. No "shoppers in your area saved an average of £42 this week." No "Your price contributions helped 15 people." The crowdsource data exists in the backend (price history from receipt scans) but the community value isn't surfaced to users. Community creates belonging; belonging creates stickiness.

**5. Dark Color Scheme — Functional, Not Inviting**

Dark themes are excellent for reducing eye strain and battery usage. They're less excellent for creating warmth and invitation to linger. A dark room is a room you work in. A warm, well-lit room is a room you stay in. The deep navy palette is functional elegance — it doesn't invite browsing the way a warmer palette might.

### Recommendations

- [ ] **Weekly Insights Narrative:** Instead of raw numbers, generate a 2-3 sentence insight: "This week you made 2 trips and stayed under budget on both. Your dairy spending dropped 15%. You're building a solid streak!" This gives users a reason to check Insights regularly
- [ ] **Price Intelligence:** Show users interesting price data from their history and community: "Milk is 12% cheaper at Aldi this month" or "You pay an average of £2.10 for bread — the best local price is £1.85." This turns a utility into an advisor
- [ ] **New User State:** Replace all zeroes with aspirational messaging and projected milestones: "Most users save £30 in their first month." Show a visual "path" of what's coming: first trip → first receipt → first savings → first streak
- [ ] **Community Contribution Visibility:** After scanning a receipt, show: "Your prices will help X shoppers in [city]." After a few scans: "You've contributed 23 prices — you're helping build the UK's most accurate grocery database." Pride in contribution = reason to scan = reason to return
- [ ] **Warm "Discovery" Zone:** Consider a dedicated content area (maybe within Insights or a fifth tab) that surfaces tips, price trends, seasonal savings advice, or meal planning hints. Content that rewards browsing

---

## Criterion 6: Make Users Keep Coming Back

### What "Coming Back" Means for Oja

Retention is the ultimate test. A user who downloads the app, sets up their pantry, makes one list, and never returns is a failure regardless of how beautiful the glass effects are. Coming back requires: a **trigger** (something prompts them), an **expectation** (they know what they'll get), and a **reward** (they got what they expected + a small surprise).

### Strengths

- **Stock levels naturally decay** — As users consume items, stock drops to Low/Out, creating a natural trigger to check the app ("What do I need?")
- **Shopping cadence** — Most people shop weekly, creating a natural weekly loop
- **Budget tracking** — Users who set budgets want to see if they hit targets
- **Streaks and challenges** exist in the Insights framework (even if placeholder)
- **Loyalty points system** — Documented in planning, offering subscription discounts for engagement

### Concerns

**1. No Active Triggers (Push Notifications)**

The app relies entirely on the user remembering to open it. There are no visible push notifications that say "Your stock is running low on 5 items — time to plan your shop?" or "You're 1 trip away from a 4-week streak!" The notification system exists in code (notifications screen is built), but the trigger loop — the thing that makes the phone buzz and reminds the user the app exists — isn't evident.

**2. First-Week Experience Doesn't Create Habit**

The habit formation window is the first 7 days. Currently: Day 1 = set up pantry, maybe create a list. Day 2-6 = ...nothing happens unless the user shops. Day 7 = maybe they shop and use the list. That's 5 dead days where the app provides zero value and sends zero signals. In those 5 days, the app slides off the user's mental radar.

A competing app (or just a paper list) can capture those users in the gap.

**3. Savings Jar Milestone Path is Hidden**

The Savings Jar shows "Next milestone: £50, 0%." But there's no visible path of milestones. What happens at £50? £100? £500? If the user could see "£50 = Bronze Saver, £100 = Silver Saver, £500 = Savings Champion" with a visual journey, they'd have a concrete goal to work toward. Goals drive return visits.

**4. Weekly Digest Isn't Compelling Yet**

The planned weekly digest ("You're 2/4 trips under budget") is a good concept but isn't realized. When it is, the content needs to be emotionally compelling, not just informational. "You saved £23 this week — that's a coffee every day" is more compelling than "You were 85% budget adherent."

**5. No Investment Loop**

The habit model works best when users invest something that becomes more valuable over time. In Oja, the investment is: pantry items added, price history built, and shopping patterns learned. But the user doesn't see this investment growing. There's no "Your price database has 234 items — the more you scan, the smarter your estimates get." Without visible investment, there's nothing to lose by switching to a simpler app.

### Recommendations

- [ ] **Smart Push Notifications (Priority 1):** Implement 3 trigger types:
  - *Stock reminder:* "5 items are running low — ready to plan your next shop?" (trigger: N items at Low/Out)
  - *Streak motivation:* "You're on a 3-week streak! Don't break it — shop before Sunday" (trigger: approaching streak deadline)
  - *Weekly digest:* "Your week in review: 2 trips, £34 saved, 12 prices contributed" (trigger: every Monday morning)
- [ ] **First-Week Nurture Sequence:** Even if the user doesn't shop, send helpful nudges:
  - Day 2: "Tip: Long-press any pantry item to set its stock level"
  - Day 3: "Did you know? You can swipe items in your pantry to quickly adjust stock"
  - Day 5: "Weekend coming up — create a shopping list to stay on budget"
- [ ] **Visible Investment:** Show users their data value: "Your pantry: 42 items tracked. Your prices: 67 data points. Your savings: £48 total." This creates switching cost — leaving Oja means losing this history
- [ ] **Milestone Celebrations:** When hitting savings milestones (£10, £25, £50, £100), show a celebration screen similar to the trip summary. Make the milestone feel earned and visible
- [ ] **Social Proof in Empty States:** Instead of "0 trips" for new users, show: "Join 12,000 UK shoppers saving an average of £35/month." Community numbers create FOMO and validation

---

## Cross-Cutting Analysis: Color

### Current Palette Assessment

| Color | Hex | Usage | Emotional Effect |
|-------|-----|-------|------------------|
| Deep Navy | #0B1426 | Background | Trust, stability, sophistication — but coldness |
| Mid Navy | #1A2744 | Gradient endpoint | Depth — enhances the "premium" feel |
| Teal | #00D4AA | Primary accent (everything) | Energy, modernity — but overused, becomes noise |
| Indigo | #6366F1 | Secondary (Lists tab) | Calm intelligence — underused |
| Amber | #F59E0B | Warning / Scan tab | Attention, caution — appropriate |
| Red | #EF4444 | Error / Danger | Urgency — appropriate |
| Green | #10B981 | Success / Budget healthy | Positive reinforcement — appropriate |
| Pink | #EC4899 | Profile tab only | Warmth, personality — severely underused |
| White 70% | rgba(255,255,255,0.7) | Secondary text | Readability — appropriate |

### Key Issue: Emotional Temperature

The palette is **emotionally cold.** Navy + teal is the color language of fintech, crypto dashboards, and enterprise SaaS. It communicates precision and capability. It does not communicate warmth, care, or the homey comfort of kitchen/food/family.

For an app about *groceries* — something deeply tied to home, family, nourishment, and daily ritual — the palette is disconnected from the subject matter. The user is managing their *kitchen* through what feels like a stock trading terminal.

### Key Issue: Teal Saturation

Teal appears in:
- Primary action buttons ("Create List," "Start Shopping," "Take Photo," "Confirm," "Subscribe")
- Active tab indicator
- Budget progress fill (healthy state)
- Checkmarks and checkboxes
- Card accent borders
- Text links and highlights
- Add item (+) button
- Category icons
- Badge indicators

When a single color carries this much weight, it loses its ability to signal priority. The user can't distinguish "this is the main thing to tap" from "this is a decorative accent" because they're the same color. Primary actions should *pop*; decorative elements should recede.

### Recommendations

- [ ] **Introduce a warm accent** — A soft amber/coral (#FFB088 or #FF9F6A) for celebration moments, milestone badges, and encouraging text. Not replacing teal, but adding warmth
- [ ] **Reduce teal usage by 50%** — Reserve teal for: primary CTA buttons, active tab indicator, and budget "healthy" state. Everything else (checkmarks, borders, secondary buttons, text links) should use white, gray, or indigo
- [ ] **Tab color personality** — Currently each tab has a semantic color, but it only appears in the tab icon. Consider tinting the header or a subtle accent element on each screen to match its tab color. This creates visual variety across the app without breaking consistency
- [ ] **Dark mode with warmth** — Consider shifting the background gradient very slightly warm: from pure cold navy toward a deep warm navy (#0F1526 → #1A2240). The difference is subtle but the subconscious effect is real

---

## Cross-Cutting Analysis: Typography

### Current Type Scale Assessment

The type scale is well-structured with clear hierarchy. The system-font choice (SF Pro / Roboto) is smart — no custom font loading, native feel on both platforms.

### Key Issue: Item Name Dominance

Pantry item names are rendered at **28px bold.** This is larger than most section headers (24px) and creates an unusual hierarchy where the item name — the least actionable piece of information on the card — is the loudest visual element. "Whole Milk" doesn't need to shout. The user knows what's in their pantry; what they need to *see quickly* is the stock level.

Compare: In a supermarket, the product label is small. The price tag (actionable info) is large. Oja inverts this — the label is huge, the stock level is small secondary text.

### Key Issue: Number Typography in Budget

Budget amounts use the Numbers typography scale (24-36px bold tabular figures). This is appropriate for the trip summary where "Saved £30.15" is the hero. But on the list detail budget tracker, showing "£2.70" at high visual weight alongside "£47.30 left" creates a data-heavy feel. The numbers compete for attention rather than telling a clear story.

### Recommendations

- [ ] **Reduce item name size** from 28px to 20-22px. Increase stock level indicator size or visual weight. The hierarchy should be: stock status (visual/icon) → item name → details. The user's eye should land on "is this item OK?" before "what is this item?"
- [ ] **Budget typography narrative** — On the list detail, consider showing *one* number prominently: the remaining amount or budget percentage. Supporting figures can be smaller. The user's question is "How much can I still spend?" — answer that loudly, explain it quietly
- [x] **Micro-copy styling** — Helper text, hint text, and tertiary labels (12px, 50% opacity white) are technically readable but practically invisible on the dark background. Consider bumping these to 60-70% opacity for better accessibility without sacrificing hierarchy ✅ Bumped to 65% opacity

---

## Cross-Cutting Analysis: Spacing & Layout

### Current Spacing Assessment

The 4px base grid is well-implemented. Screen padding (20px), card padding (12-20px), and section gaps (32px) create comfortable breathing room in isolation.

### Key Issue: Cumulative Density

Individual components are well-spaced. But when 5+ well-spaced components stack on one screen (List Detail, Profile, Insights), the cumulative effect is density. Each card is comfortable internally, but the page as a whole feels packed. This is because section gaps (32px) between major zones aren't aggressive enough to create clear "chapters" in the page.

### Key Issue: Vertical Scrolling Fatigue

Several screens require extensive vertical scrolling: Pantry (100 items), List Detail (budget + form + items), Profile (stats + overview + loyalty), Insights (weekly + challenges + jar + streaks + bests). On mobile, vertical scrolling is natural, but when every screen is a long scroll, the app starts to feel like reading a document rather than using a tool.

### Recommendations

- [x] **Increase section gaps** between major functional zones from 32px to 48-56px. This creates visual "chapters" that let the user process one zone before encountering the next ✅ Token bumped to 48px (screens to adopt `layout.sectionGap` progressively)
- [ ] **Limit visible zones** — No screen should show more than 3 major sections without scrolling. If more exists, use progressive disclosure (collapsed sections, "See more" links)
- [ ] **Fixed action areas** — For screens with a primary action (List Detail: adding items, Pantry: reviewing stock), pin the primary action at the bottom of the screen so it's always accessible without scrolling. The content above can scroll; the action stays fixed

---

## Cross-Cutting Analysis: Navigation

### Current Navigation Assessment

4-tab bottom navigation is the gold standard for mobile apps with 4-5 primary features. The persistent tab bar with semantic colors per tab is well-executed.

### Key Issue: No Journey Narration

The four tabs (Stock → Lists → Scan → Profile) represent the shopping lifecycle, but the app doesn't guide users through this journey. There's no visual or interactive thread that says "Your stock is low → Create a list → Go shopping → Scan receipt → See your savings." Each tab is an independent silo.

The "From Stock" button on List Detail is the one bridge between silos, but the broader narrative flow is missing. A user could easily use the Lists tab without ever touching Stock, or Scan without connecting to Lists. The features are interconnected in design but disconnected in experience.

### Key Issue: Deep Navigation Stacking

Some flows go 3+ levels deep: Lists → List Detail → Partners, or Profile → Insights → (detail). On each deeper level, the only way back is the back button. There's no breadcrumb, no shortcut, no gesture to jump back to a tab. Deep navigation on mobile creates "where am I?" disorientation.

### Recommendations

- [ ] **Journey prompts** — After scanning a receipt, show "Update your stock levels?" to bridge Scan → Stock. When stock items go to "Out," show a banner: "3 items are out — add to your next list?" to bridge Stock → Lists. These gentle prompts narrate the lifecycle without forcing it
- [ ] **Smart tab badges** — Show a badge on the Stock tab when items are Low/Out ("3"). Show a badge on Lists when a list is in "Shopping" mode. These badges act as passive navigation cues: "Something needs your attention here"
- [ ] **Shallow navigation preference** — Limit stack depth to 2 levels where possible. Partners, Insights, Subscription can be modal overlays or sheets rather than pushed screens, reducing the feeling of being "deep" in the app

---

## Summary: Strengths to Protect

These elements are working well and should not be changed:

- [x] **The glass design system** — The visual identity is distinctive, premium, and well-implemented. Don't simplify it away
- [x] **Trip Summary screen** — The emotional peak of the app. Protect and enhance it
- [x] **4-tab navigation** — Intuitive, standard, well-labeled. Don't add more tabs
- [x] **Receipt scan flow** — Multi-step but well-guided. Tips → Camera → Preview → Confirm is solid
- [x] **Empty states** — Clean messaging with clear CTAs. Keep the pattern
- [x] **Budget auto-calculation + CircularBudgetDial** — Smart feature that reduces cognitive load. Clean circular dial showing spent vs budget
- [x] **Haptic feedback system** — The code shows consistent haptics on all interactions. This is invisible but powerful
- [x] **Swipe gestures on pantry** — Intuitive once discovered. The interaction itself is right; the discovery is what needs work

---

## Summary: Critical Gaps to Address

These are the areas that need the most attention:

- [~] **Information overload on key screens** — Profile and Insights still dense. List Detail and Pantry addressed.
- [ ] **Emotional coldness** — The app looks premium but feels clinical. No warmth, no personality, no moments of delight in daily usage
- [ ] **Teal saturation** — Primary accent color is overused to the point where it loses signaling power
- [ ] **No active return triggers** — The app relies on the user remembering it exists. No push notification strategy
- [ ] **First-week dead zone** — Between setup and first shopping trip, the app provides zero value or engagement
- [x] **Gesture discovery** — Fixed with `SwipeOnboardingOverlay`.
- [ ] **Voice and personality** — Copy is functional but lacks warmth

---

## Priority Recommendations

### Tier 1 — High Impact, Aligns With All 6 Criteria

| # | Status | Recommendation | Criteria Served | Effort |
|---|:---:|----------------|-----------------|--------|
| 1 | [x] | **Pantry "Needs Attention" default view** — Show only Low + Out items by default. "All Items" is secondary. | Simple, Not Overwhelming, Easy | Medium |
| 2 | [x] | **List Detail progressive disclosure** — Collapse add-form behind "+ Add Item" button | Simple, Not Overwhelming | Medium |
| 3 | [ ] | **Teal reduction** — Reserve for primary CTAs only. Use white/gray/indigo for secondary elements | Not Overwhelming, Simple | Low |
| 4 | [ ] | **Micro-celebrations on check-off and stock change** — Brief color flash, subtle animation, satisfying haptic | Emotional, Stay On | Low-Medium |
| 5 | [ ] | **Voice audit** — Rewrite all empty states, section headers, and helper text with warm personality | Emotional, Come Back | Low |

### Tier 2 — Medium Impact, Strong Emotional/Retention Value

| # | Status | Recommendation | Criteria Served | Effort |
|---|:---:|----------------|-----------------|--------|
| 6 | [x] | **Gesture onboarding** — One-time interactive swipe tutorial for pantry items | Easy to Use | Low |
| 7 | [ ] | **Smart push notifications** (3 types: stock reminder, streak, weekly digest) | Come Back | High |
| 8 | [ ] | **Weekly Insights narrative** — Replace raw numbers with a 2-3 sentence "your week" story | Emotional, Stay On, Come Back | Medium |
| 9 | [ ] | **Warm accent color** — Introduce soft amber/coral for celebrations and milestones | Emotional | Low |
| 10 | [ ] | **Profile simplification** — Remove stat dashboard, add navigation links to Insights | Not Overwhelming, Simple | Medium |

### Tier 3 — Strategic, Longer-Term

| # | Status | Recommendation | Criteria Served | Effort |
|---|:---:|----------------|-----------------|--------|
| 11 | [ ] | **First-week nurture sequence** — Daily helpful nudges for new users | Come Back | Medium |
| 12 | [ ] | **Price intelligence surface** — Show users interesting price data from their history and community | Stay On, Come Back | High |
| 13 | [ ] | **Journey prompts** between tabs (Scan → Stock, Stock → Lists) | Easy to Use, Come Back | Medium |
| 14 | [ ] | **Visible investment counter** — Show data value: items tracked, prices contributed, total saved | Come Back | Low |
| 15 | [ ] | **Savings milestone celebrations** — Trophy screens at £10, £25, £50, £100 milestones | Emotional, Come Back | Medium |

---

*This analysis is based on planning documentation, full codebase audit of the glass design system and all UI components, and visual review of 20+ screen states captured via E2E testing. It represents the current state as of 31 January 2026.*

---

## Implementation Item: Zero-Blank Price Intelligence — Size-Aware Pricing & Crowdsourced Data

> **Priority:** CRITICAL — This is the core value proposition. Without accurate prices, budget tracking is fiction.
> **Status:** Partially implemented (schema + variant seeding done; zero-blank guarantee + bracket matcher + AI fallback pending)
> **Agreed:** 31 January 2026 (Party Mode session with Architect, PM, Developer, Analyst)
> **Updated:** 1 February 2026 (Party Mode session — added zero-blank guarantee, AI fallback, price-bracket matcher, implementation plan)

### The Core Problem

The app promises "Budget-First Shopping Confidence." But when a user adds "Milk" to a shopping list, the app cannot provide an accurate price because:

1. **"Milk" is not a purchasable item — it's a category.** What you buy is "Whole Milk 2 Pints" (£0.95) or "Semi-Skimmed 4 Pints" (£2.50). A 2.5x price range within one item name.
2. **The entire price pipeline is size-blind.** Receipt parsing drops item size/unit info. `"Milk 2L at £1.80"` and `"Milk 500ml at £0.95"` both normalize to `"milk"` and overwrite each other in the price database.
3. **75% of UK receipt items have NO size data.** Morrisons prints virtually zero sizes. Aldi includes size on ~30% of items. Lidl ~15%. The AI can't extract what isn't there.
4. **Pantry items seeded during onboarding now have AI-estimated prices.** `pantryItems.bulkCreate` writes `lastPrice: item.estimatedPrice` with `priceSource: "ai_estimate"`. Items added *after* onboarding (manually or via auto-restock) may still lack price data until a receipt is scanned — addressed by the Zero-Blank Guarantee (Steps 3a-3c below).

**Impact:** If the budget estimate for a 20-item list is off by £1-2 per item, the total could be wrong by £20-40. The budget dial becomes decoration. The app is useless for its stated purpose.

---

### Receipt Analysis — Real UK Store Patterns

Analysis of 19 real receipts from 7 stores (High Wycombe / Slough area, Oct 2025 – Jan 2026):

| Store | Size Included? | Approximate % | Format Example |
|-------|---------------|---------------|----------------|
| **Aldi** | Liquids, weighed goods, multi-packs | ~30-35% | `MILK WHOLE 2PT`, `SWEET POTATOES 1KG`, `QUILTED TP SPLY 4` |
| **Lidl** | Almost only milk | ~15-20% | `Whole Milk 4 Pints` |
| **Morrisons** | Virtually never | ~0-5% | `M TABLE SALT`, `COFRESH CARAMEL/NUTS` |
| **Tesco** | Branded/premium items | ~30% | `Protein Yoghurt 200g`, `Greek Style Pasta Salad 250g` |
| **Sainsbury's** | Branded items | ~33% | `CHIN CHIN 148G`, `JS VEGETABLE OIL` |
| **Independent (Ol Sorts)** | Bulk items | ~40% | `SELLA 5KG`, `BLACK EYE BEANS 4KG`, `DUCROS CURRIED OIL 1LTR` |

**Key observations from receipt data:**

1. **Store name is ALWAYS available** — every receipt has it. Per-store price tracking works.
2. **SKU codes precede items on Aldi** — 6-digit numbers need stripping (e.g., `415772 MILK WHOLE 2PT`).
3. **VAT codes follow prices** — A/B/D suffixes on Aldi/Lidl need ignoring.
4. **Discount/promo lines exist** — `Price Crunch -£0.10`, `50p off with Lidl Plus`. Must not be treated as items.
5. **Multi-buy pricing** — `2 x £2.19` needs parsing as quantity: 2, unitPrice: 2.19.
6. **Abbreviations are extreme** — `QUILTED TP SPLY 4` = Quilted Toilet Paper 4-pack. `SQUEEZY MALR FR 12PK` = Squeezy Malt 12-pack. AI must expand these.
7. **Same product, wildly different names across stores** — "Whole Milk 2 Pints" appears as `MILK WHOLE 2PT` (Aldi), `Whole Milk 4 Pints` (Lidl), and just `MILK` or similar (Morrisons). Cross-store matching by name alone is unreliable.
8. **Non-grocery receipts exist** — Primark, Hobbycraft, Asda non-food. The system must handle or reject non-grocery receipts gracefully.

---

### Architecture: Three-Layer Price Intelligence

```
LAYER 1: AI Estimates (cold start, lowest confidence)
  ↓ replaced by ↓
LAYER 2: Crowdsourced Prices (all users' receipts, by region)
  ↓ personalized by ↓
LAYER 3: Personal History (user's own receipts, highest confidence)
```

Display priority: **Personal > Crowdsourced > AI Estimate.** The user always sees SOMETHING. Never a blank price.

#### The Flywheel

```
More users → More receipt scans → Better price data
→ More accurate budgets → Better user experience
→ More users → ...
```

Every user who scans a receipt contributes training data. Every new user benefits from everyone who came before. The cold start problem dissolves over time.

#### Data Moat Timeline

- **0-100 users:** AI estimates dominate, prices are approximate
- **100-1,000 users:** Crowdsourced layer covers major stores in top cities
- **1,000-10,000 users:** Most common items at most stores have real prices
- **10,000+ users:** Regional pricing becomes accurate, AI is genuinely trained

---

### Architecture: Smart Variant Resolution

**Problem:** User types "milk." App needs to map this to a purchasable product with an accurate price.

**Solution:** Item Variant system — AI-seeded, receipt-refined.

```
LAYER 1: Item Name (what user types)
  "milk"
    ↓
LAYER 2: Variant Options (what we know about)
  ├─ Whole Milk 1 Pint    → £0.95  (Aldi receipt, 3 reports)
  ├─ Whole Milk 2 Pints   → £1.15  (Tesco receipt, 7 reports) ← "Your usual"
  ├─ Semi-Skimmed 4 Pints → £2.50  (Sainsbury's receipt, 2 reports)
  └─ Oat Milk 1L          → £1.80  (AI estimate)
    ↓
LAYER 3: Selected Variant (what goes on the list)
  "Milk" with estimatedPrice: £1.15, variant: "Whole 2pt"
```

**Variant picker UX (first time adding an item with variants):**

```
┌─────────────────────────────────┐
│ 🥛 Milk                         │
│                                 │
│ Which one do you usually get?   │
│                                 │
│ ○ 1 pint        ~£0.95         │
│ ● 2 pints       ~£1.15  ★      │  ← ★ = "Your usual" after first pick
│ ○ 4 pints       ~£1.75         │
│ ○ 2 litres      ~£1.35         │
│ ○ Other / not sure              │
│                                 │
│         [Add to list]           │
└─────────────────────────────────┘
```

After first pick: auto-selects "2 pints" next time with "Change size" link. Shows `Milk (2pt) — £1.15`. One tap to add. No friction.

**"Other / not sure" behavior:** When selected, the item is added with the base-item average price from `currentPrices` (or `pantryItem.lastPrice` if available). No `preferredVariant` is set — the picker will show again next time. The user can also type a custom variant name (e.g., "Oat Milk 1L") which creates a new ad-hoc variant. This ensures zero-blank (a price is always assigned) while not forcing a choice.

**Not all items need variants.** Only items where size materially affects price (~30-40% of grocery items):
- **Need variants:** Milk, juice, oil, water, rice, pasta, flour, sugar, eggs, toilet paper, meat, bread
- **Don't need variants:** Bananas (per-item), onions (per-item), butter (standard 250g), salt (one size), tinned beans (standard 400g)

AI determines which items need variants during seeding. Single-size items just show one price — no picker.

#### Resolution Algorithm (when user adds item to list) — ZERO-BLANK GUARANTEED

```
USER TYPES "milk" ON LIST
         │
         ▼
    ┌─────────────────────────────────────────┐
    │  1. Check pantryItem.preferredVariant    │
    │     → Found? Show that variant + price.  │
    │       Also show "Change size" link.      │
    │       Price cascade (see below).         │
    │     → Not found? Step 2.                 │
    └──────────────────┬──────────────────────┘
                       ▼
    ┌─────────────────────────────────────────┐
    │  2. Query itemVariants for "milk"       │
    │     → Has variants? Show picker with    │
    │       prices from 5-layer cascade:      │
    │                                         │
    │       For EACH variant:                 │
    │       a. priceHistory (personal)        │
    │       b. currentPrices (crowdsourced)   │
    │       c. variant.estimatedPrice (AI)    │
    │       d. ← NEVER null. AI always fills. │
    │                                         │
    │     → No variants? Step 3.              │
    └──────────────────┬──────────────────────┘
                       ▼
    ┌─────────────────────────────────────────┐
    │  3. No variants known for this item.    │
    │     This is a "simple item" OR          │
    │     a completely unknown item.          │
    │                                         │
    │     a. pantryItem.lastPrice exists?     │
    │        → Use it. Show "~£X.XX"          │
    │     b. currentPrices has it?            │
    │        → Use cheapest. Show store name. │
    │     c. Nothing?                         │
    │        → REAL-TIME AI ESTIMATE.         │
    │          Call AI: "What does {item}      │
    │          cost in a UK supermarket?"      │
    │          + Does it have size variants?   │
    │          Cache result in currentPrices   │
    │          + itemVariants if applicable.   │
    │          Show "~£X.XX est."              │
    │          Store for next user lookup.     │
    └─────────────────────────────────────────┘

EVERY BRANCH TERMINATES WITH A PRICE. NO BRANCH RETURNS NULL.
```

**Price cascade for each variant/item (ordered by trust):**

```
1. Personal priceHistory (user's own receipts) → highest trust
     Label: "£1.15 at Aldi"
     Query: priceHistory by_user_item for current user + normalizedName
     NOTE: This layer requires a priceHistory lookup in getWithPrices
           (currently NOT queried — see Phase 1 Step 1.5 below)
2. currentPrices for user's region → crowdsourced
     Label: "~£1.15 avg (3 stores)"
3. currentPrices any region → fallback crowdsourced
     Label: "~£1.15 avg"
4. variant.estimatedPrice (AI-seeded) → baseline
     Label: "~£1.15 est."
5. Real-time AI estimate → cold start safety net
     Label: "~£1.15 est."
     → Caches to layer 4 for next lookup
```

**Important implementation note:** Currently `getWithPrices` only queries `currentPrices` (layers 2-3). Layer 1 (personal priceHistory) is NOT queried. To show "£1.15 at Aldi" (personal, highest trust), `getWithPrices` needs a userId param and a `priceHistory` lookup. See Phase 1 Step 1.5.

---

### Schema Changes

#### Status of Schema Changes

Most schema changes from the original plan are **already implemented**. The remaining changes are marked NEW below.

#### `itemVariants` — EXISTS, needs `estimatedPrice`

```typescript
itemVariants: defineTable({
  baseItem: v.string(),            // "milk" (normalized) ✅
  variantName: v.string(),         // "Whole Milk 2 Pints" ✅
  size: v.string(),                // "2 pints" ✅
  unit: v.string(),                // "pint" ✅
  category: v.string(),            // "Dairy" ✅
  source: v.string(),              // "ai_seeded" | "receipt_discovered" ✅
  commonality: v.optional(v.number()), // ✅
  estimatedPrice: v.optional(v.number()), // 🆕 AI-generated price for this variant
})
  .index("by_base_item", ["baseItem"])
```

#### `currentPrices` — EXISTS with all enhanced fields ✅

Already has: `variantName`, `size`, `unit`, `averagePrice`, `minPrice`, `maxPrice`, `confidence`, `region`. No changes needed.

#### `priceHistory` — EXISTS with `size`/`unit` ✅

Already has optional `size` and `unit` fields. No changes needed.

#### `receipts.items[]` — EXISTS with `size`/`unit` ✅

Already has optional `size` and `unit` fields. No changes needed.

#### `pantryItems` — EXISTS, needs `defaultSize`/`defaultUnit`

```typescript
// Already exists:
lastPrice: v.optional(v.number()),            // ✅
priceSource: v.optional(v.string()),          // ✅ "ai_estimate" | "receipt" | "user"
preferredVariant: v.optional(v.string()),     // ✅ "Whole Milk 2 Pints"
lastStoreName: v.optional(v.string()),        // ✅ Store name from last receipt price

// NEW — for non-variant items (hasVariants: false):
defaultSize: v.optional(v.string()),          // 🆕 "250g", "400g", "per item"
defaultUnit: v.optional(v.string()),          // 🆕 "g", "each", "tin"
```

Note: `lastPrice` and `unit` fields already exist on pantryItems and are populated via receipt flow.

---

### AI Prompt Changes

#### Receipt Parsing — ✅ ALREADY IMPLEMENTED

The receipt parsing prompt in `convex/ai.ts:parseReceipt` already extracts `size`, `unit`, expands abbreviations, ignores discounts/VAT/SKUs, and handles multi-buy pricing. No changes needed.

#### Onboarding Seeding — ✅ ALREADY IMPLEMENTED

`SeedItem` type and `generateHybridSeedItems` already include `estimatedPrice` and `hasVariants`. No changes needed.

#### Onboarding Seeding — 🆕 ADD `defaultSize`/`defaultUnit` for non-variant items

Update `SeedItem` type:

```typescript
type SeedItem = {
  name: string;
  category: string;
  stockLevel: string;
  estimatedPrice: number;        // ✅ exists
  hasVariants: boolean;           // ✅ exists
  defaultSize?: string;           // 🆕 for hasVariants=false items: "250g", "per item", "400g tin"
  defaultUnit?: string;           // 🆕 for hasVariants=false items: "g", "each", "tin"
};
```

Prompt addition: *"For items where hasVariants is false, include defaultSize (e.g., '250g', '400g tin', 'per item', 'bunch') and defaultUnit (e.g., 'g', 'tin', 'each'). Every item must have either hasVariants=true OR defaultSize+defaultUnit populated. No item should lack size context."*

#### Variant Seeding — ✅ ALREADY IMPLEMENTED

`generateItemVariants` action already generates variants with `estimatedPrice`. The gap is that `bulkUpsert` in `itemVariants.ts` does not persist `estimatedPrice` — it accepts it but doesn't store it (see Implementation Step 1).

#### 🆕 NEW: Real-Time AI Price Estimation Action (`estimateItemPrice`)

For completely unknown items (not in pantry, no variants, no currentPrices). This is the Step 3c safety net.

```typescript
type ItemEstimate = {
  name: string;                   // "Quinoa"
  estimatedPrice: number;         // 2.50
  hasVariants: boolean;           // true
  defaultSize?: string;           // "500g" (if hasVariants=false)
  defaultUnit?: string;           // "g" (if hasVariants=false)
  variants?: Array<{              // (if hasVariants=true)
    variantName: string;          // "Quinoa 500g"
    size: string;                 // "500g"
    unit: string;                 // "g"
    estimatedPrice: number;       // 2.50
  }>;
  category: string;               // "Grains & Pasta"
};
```

Prompt: *"What does '{item}' cost in a UK supermarket? Return the most common price in GBP. If this item comes in multiple sizes where the size materially affects price, set hasVariants=true and return 3-5 common size variants with prices. If it's a standard single-size item, set hasVariants=false and include defaultSize/defaultUnit."*

**Call pattern in Convex:**
- This is an `action` (not a `query`), since it calls external AI
- UI triggers it when `getWithPrices` returns empty AND pantryItem has no lastPrice
- Convex reactive model: action writes to `currentPrices` + `itemVariants`, original `useQuery` auto-refreshes
- User sees brief loading state (~300ms), then variants/price appear
- **This only fires once per unknown item, ever.** First user pays the latency; all subsequent users get instant cached results

### AI Fallback Strategy

**Problem:** Gemini is the sole AI provider. Single point of failure for receipt parsing, seeding, variant generation, and price estimation.

**Solution:** Add OpenAI GPT-4o-mini as a fallback provider with identical prompts.

```
Primary:   Gemini 2.0 Flash (fast, cheap, already integrated)
Fallback:  OpenAI GPT-4o-mini (comparable speed/cost, different failure domain)
```

**Implementation: `withAIFallback` wrapper in `convex/ai.ts`:**

```typescript
async function withAIFallback<T>(
  primary: () => Promise<T>,
  fallback: () => Promise<T>,
  operationName: string
): Promise<T> {
  try {
    return await primary();          // Gemini
  } catch (primaryError) {
    console.warn(`[${operationName}] Primary AI (Gemini) failed, trying fallback (OpenAI):`, primaryError);
    try {
      return await fallback();       // OpenAI
    } catch (fallbackError) {
      console.error(`[${operationName}] Both AI providers failed:`, { primaryError, fallbackError });
      throw fallbackError;
    }
  }
}
```

**Apply to all AI functions:**
- `parseReceipt` — most critical (user waiting with camera in hand)
- `generateHybridSeedItems` — onboarding (user waiting)
- `generateItemVariants` — onboarding (background, less urgent)
- `estimateItemPrice` (new) — real-time unknown item lookup
- `generateListSuggestions` — list planning

**Dependencies:**
- Add `openai` npm package
- Set `OPENAI_API_KEY` in Convex dashboard environment variables (already spec'd in CLAUDE.md)
- Prompts are model-agnostic (JSON-in/JSON-out) — same prompt works for both providers

---

### Admin Receipt Scanning Portal (Pre-Launch Seeding)

**Purpose:** Before launch day, admin bulk-scans receipts from major UK stores to pre-populate the crowdsourced price database. New users get real receipt-verified prices on day one, not just AI guesses.

**Implementation:**
- Reuse the existing receipt scan flow (`app/(app)/(tabs)/scan.tsx` → `receipt/[id]/confirm.tsx`)
- Add an admin flag: `isAdminSeed: true` on the receipt record
- Admin-seeded receipts bypass user association — prices flow directly to `currentPrices` pool
- Target: 50-100 receipts across Aldi, Lidl, Tesco, Morrisons, Sainsbury's covering major product categories
- Outcome: ~500+ items with real prices and discovered variants before any real user signs up

**Admin access:** Simple flag on user record (`isAdmin: true`) or separate admin route. No need for a full admin dashboard — just the existing scan flow with the admin flag.

---

### Receipt Freshness & Date Handling

**30-day freshness window** — aligns with UK grocery pricing cycles:
- UK supermarkets typically change promotional prices every 3-6 weeks
- Base prices change less frequently (quarterly or less)
- 30 days ensures prices reflect current reality without being too aggressive

**Implementation:**
- `purchaseDate` from receipt (already stored) is the anchor timestamp
- `currentPrices.lastSeenDate` tracks when the price was last verified
- Prices older than 30 days get lower weight in the weighted average but are NOT deleted
- `priceHistory` keeps everything forever for trend analysis
- The existing receipt rejection rule (must be within 3 days of scan date) prevents stale receipts from entering the system

**Weighted average formula:**

```
weight = max(0, 1 - (daysSincePurchase / 30))
weightedPrice = sum(price * weight) / sum(weight)
```

Receipts from today have weight 1.0. Receipts from 15 days ago have weight 0.5. Receipts from 30+ days ago have weight ~0.

---

### Data Flow: Complete Pipeline

```
                    ┌──────────────────────────────┐
                    │     ADMIN PRE-LAUNCH          │
                    │  Bulk scan 50-100 receipts    │
                    │  → Seeds currentPrices pool   │
                    │  → Discovers real variants    │
                    └──────────────┬───────────────┘
                                   │
┌──────────────────────────────────▼───────────────────────────┐
│                     RECEIPT SCAN FLOW                         │
│                                                              │
│  Photo → Gemini parses → extracts:                           │
│    storeName, date, items[{name, size, unit, qty, price}]    │
│                                                              │
│  User confirms on review screen (can edit items/prices)      │
│                                                              │
│  On save, THREE parallel writes:                             │
│                                                              │
│  ┌─────────────────┐  ┌──────────────────┐  ┌────────────┐  │
│  │  priceHistory    │  │  currentPrices   │  │  pantry    │  │
│  │  (personal log)  │  │  (crowdsourced)  │  │  Items     │  │
│  │                  │  │                  │  │            │  │
│  │  userId          │  │  normalizedName  │  │  lastPrice │  │
│  │  itemName        │  │  variantName     │  │  priceSource│ │
│  │  size, unit      │  │  size, unit      │  │  ="receipt"│  │
│  │  unitPrice       │  │  storeName       │  │            │  │
│  │  storeName       │  │  averagePrice    │  │  (matched  │  │
│  │  purchaseDate    │  │  reportCount++   │  │   items    │  │
│  │                  │  │  confidence++    │  │   only)    │  │
│  └─────────────────┘  └──────────────────┘  └────────────┘  │
│                                                              │
│  ALSO: Discover new variants from receipt item names/sizes   │
│  → Insert into itemVariants if not already known             │
└──────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│                    LIST PLANNING FLOW                         │
│                                                              │
│  User types "milk" → resolve variants:                       │
│                                                              │
│  1. Check pantryItem.preferredVariant                        │
│     → Found? Auto-select, show price. Done.                  │
│     → Not found? Step 2.                                     │
│                                                              │
│  2. Query itemVariants by baseItem                           │
│     → Has variants? Show picker with prices.                 │
│     → No variants? Show single estimate. Done.               │
│                                                              │
│  3. Price lookup cascade (per variant):                       │
│     a. priceHistory (personal, by userId) → highest trust    │
│        → Shows "£1.15 at Aldi" (requires Step 1.5)           │
│     b. currentPrices (crowdsourced) → good trust             │
│        → Shows "~£1.15 avg" or "£1.15 at Store"              │
│     c. variant.estimatedPrice (AI-seeded) → fallback         │
│        → Shows "~£1.15 est."                                 │
│                                                              │
│  4. Save preferredVariant on user's pantry item              │
│     → Next time: auto-selects, no picker                     │
└──────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│                    ONBOARDING FLOW                            │
│                                                              │
│  AI seeds 200 pantry items with:                             │
│    name, category, icon, stockLevel,                         │
│    estimatedPrice ✅, priceSource: "ai_estimate" ✅           │
│                                                              │
│  For items with hasVariants=true:                            │
│    AI generates 3-5 common size variants with prices         │
│    → Stored in itemVariants table                            │
│                                                              │
│  Review screen shows estimated prices per item (NEW)         │
│  User confirms → bulkCreate includes lastPrice + priceSource │
└──────────────────────────────────────────────────────────────┘
```

---

### Edge Cases & Considerations

#### 1. Receipt items with NO size data (~75% of items) — ENHANCED with Price-Bracket Matcher

**Original approach:** Store price against base item name as-is. Do NOT guess.

**Enhanced approach (Price-Bracket Matcher):** For sizeless receipt items, attempt to match the receipt price to the closest variant using AI-seeded estimated prices as reference data.

```
Receipt: "MILK" at £1.15 from Morrisons (no size on receipt)

Known variants (from itemVariants with estimatedPrice):
  Whole Milk 1 Pint    → estimatedPrice: £0.65
  Whole Milk 2 Pints   → estimatedPrice: £1.15  ← closest match (0% diff)
  Whole Milk 4 Pints   → estimatedPrice: £1.55
  Whole Milk 2 Litres  → estimatedPrice: £1.35

Match logic:
  1. Find variant whose estimatedPrice is closest to receipt price
  2. If within 20% tolerance → associate price with that variant
  3. If multiple variants within tolerance → DO NOT guess, store as base-item
  4. If no variants within tolerance → store as base-item price
```

**Implementation in `currentPrices.ts:upsertFromReceipt`:**

```typescript
// Existing: if (item.size && item.unit) → exact variant match
// NEW else branch:
if (!item.size && !item.unit) {
  // Price-bracket matcher: find closest variant by estimated price
  const variants = await ctx.db
    .query("itemVariants")
    .withIndex("by_base_item", (q) => q.eq("baseItem", baseItem))
    .collect();

  const variantsWithPrices = variants.filter((v) => v.estimatedPrice != null);
  if (variantsWithPrices.length > 0) {
    const tolerance = 0.20; // 20%
    const matches = variantsWithPrices.filter((v) => {
      const diff = Math.abs(v.estimatedPrice! - item.unitPrice) / item.unitPrice;
      return diff <= tolerance;
    });
    if (matches.length === 1) {
      // Unambiguous match → associate with this variant
      // Update currentPrices with variantName, size, unit from match
    }
    // else: ambiguous or no match → store as base-item price (existing behavior)
  }
}
```

**Validation requirement:** Before shipping, run the bracket matcher against the 19 real receipts in `receipts/`. Take items WITH size data, strip the size, run the matcher, measure accuracy. Target: >80% correct. If <60%, refine tolerance or disable matcher.

- If the user has a `preferredVariant`, that takes priority over the bracket matcher
- Over time, receipts WITH size data build the variant knowledge; sizeless receipts + bracket matcher contribute more precise price data

#### 2. Same item, different names across stores

- Aldi: `MILK WHOLE 2PT`, Lidl: `Whole Milk 4 Pints`, Morrisons: `MILK`
- For MVP: Gemini normalizes names during parsing (expand abbreviations)
- `normalizedName` is lowercase trimmed: `"milk"`, `"whole milk"`, etc.
- Phase 2: Jina AI embeddings for semantic matching across stores

#### 3. Non-grocery receipts

- Primark, Hobbycraft, Asda non-food sections exist in real receipt data
- AI parsing prompt should flag non-grocery items
- User can remove non-grocery items during receipt confirmation
- Non-grocery items should NOT feed into grocery price intelligence

#### 4. Discount/promo lines on receipts

- `Price Crunch -£0.10`, `50p off with Lidl Plus`, `Clubcard Price`
- AI prompt explicitly instructs to ignore these
- Store the pre-discount price (what the item costs without loyalty/promo)
- Reason: discounts are personal/temporary, base prices are universal

#### 5. Multi-buy pricing

- `2 x £2.19 = £4.38` — parse as quantity: 2, unitPrice: 2.19
- `3 for £5` — harder, need to infer unitPrice: 1.67
- AI handles this in parsing; user can correct during confirmation

#### 6. Weighted/loose items

- `YAM £14.93` — price is for a specific weight, not a standard unit
- `BANANA £2.69` — price for a bunch, varies each time
- These items should NOT have size variants — price is inherently variable
- Store as per-purchase price, show as "~£14.93 last time" not "£14.93/kg"

#### 7. AI price estimates becoming stale

- AI-seeded prices are snapshots of training data (may be months old)
- Once ANY receipt-verified price exists for an item, it takes priority
- AI estimates should decay in confidence over time (after 90 days, flag as "may be outdated")
- Phase 2: re-run AI estimation periodically to refresh cold-start data

#### 8. Price confidence display

Display is driven by `reportCount` (returned by `getWithPrices` — see Step 1.5), NOT by a stored `priceSource` field:

- `reportCount: 0` (AI estimate) → `~£1.15 est.` (tilde = approximate)
- `reportCount: 1-2` (early receipt data) → `£1.15 at Aldi` (store name from source record)
- `reportCount: 3-9` (growing confidence) → `£1.15 avg` (weighted average across reports)
- `reportCount: 10+` (high confidence) → `£1.15` (no qualifier — data speaks for itself)

This matches the Confidence Labels table in the Zero-Blank Guarantee section. User should always know WHY the app thinks an item costs what it does.

#### 9. Regional pricing differences

- Same Tesco charges different prices in London vs Manchester
- For MVP: use global crowdsourced prices (all regions mixed)
- Phase 2: extract postcode area from store address, filter prices by region
- Store addresses are on receipts — data is already being captured

#### 10. Price alert threshold

- Existing system alerts on >15% price change
- With variants, alerts should only compare same variant (don't alert when "2pt milk" and "4pt milk" have different prices)
- Cross-variant alerts are noise, not signal

---

### The Zero-Blank Guarantee — Product Principle

> **Every item in Oja — in pantry, on lists, during shopping — always shows a price estimate and size context. Never a blank. Never a "?". AI provides the floor. Receipts raise the ceiling.**

This is not just a technical pattern — it's a product promise. The user experience consequence:

| Scenario | Before (blanks possible) | After (zero-blank) |
|----------|--------------------------|---------------------|
| New user adds "Milk" to list | "Milk" with no price | "Milk — Which size?" → 4 variants with ~prices |
| New user adds "Butter" to list | "Butter" with no price | "Butter · 250g · ~£1.85 est." |
| User adds unknown item "Quinoa" | "Quinoa" with no price | Brief loading → "Quinoa · 500g · ~£2.50 est." |
| Pantry item after onboarding | "Cheddar Cheese" (no context) | "Cheddar Cheese · ~£2.50 · AI est." |
| After one receipt scan | "Milk £1.15" (no size) | "Milk (2pt) £1.15 Aldi" |

**Confidence labels (what the user sees):**

| Source | Display | Example |
|--------|---------|---------|
| AI estimate | `~£X.XX est.` | ~£1.15 est. |
| AI estimate + store context | `~£X.XX est.` | ~£1.15 est. |
| Receipt (1-2 reports) | `£X.XX at Store` | £1.15 at Aldi |
| Receipt (3-9 reports) | `£X.XX avg` | £1.15 avg |
| Receipt (10+ reports) | `£X.XX` (no qualifier) | £1.15 |

**The tilde (~) is the user's signal that this is an estimate.** As receipts accumulate, tildes disappear. The user watches their data get more precise over time — this is visible investment.

---

### Files to Modify

| File | Changes | Status |
|------|---------|--------|
| `convex/schema.ts` | ~~Add `estimatedPrice` to `itemVariants`.~~ Add `defaultSize`, `defaultUnit` to `pantryItems`. | ✅ Done |
| `convex/ai.ts` | Add `withAIFallback` wrapper. Add `estimateItemPrice` action. Add OpenAI fallback provider. Update seed prompt for `defaultSize`/`defaultUnit`. | ✅ Done |
| `convex/itemVariants.ts` | Persist `estimatedPrice` in `upsert` and `bulkUpsert`. 3-layer cascade in `getWithPrices` with personal priceHistory lookup, reportCount, priceSource. | ✅ Done |
| `convex/currentPrices.ts` | Add price-bracket matcher in `upsertFromReceipt` for sizeless receipt items. Add `upsertAIEstimate` mutation. | ✅ Done |
| `convex/pantryItems.ts` | Accept and store `defaultSize`/`defaultUnit` in `bulkCreate`. | ✅ Done |
| `app/(app)/list/[id].tsx` | Enhanced variant picker: confidence labels, "Your usual" badge, selected state, "Not sure" option. Trigger `estimateItemPrice` for unknown items. Confidence-based price hints. | ✅ Done |
| `app/onboarding/review-items.tsx` | Pass `defaultSize`/`defaultUnit` through to `bulkCreate`. | ✅ Done (spread operator passes them through) |
| `package.json` | Add `openai` dependency. | ✅ Done |

**Already complete (from v1 implementation):**
- `convex/schema.ts` — `itemVariants` table, `currentPrices` enhanced fields, `priceHistory` size/unit, `receipts.items[]` size/unit, `pantryItems` lastPrice/priceSource/preferredVariant/lastStoreName ✅
- `convex/ai.ts` — Receipt parsing with size/unit extraction, seed prompt with estimatedPrice/hasVariants, `generateItemVariants` action ✅
- `convex/currentPrices.ts` — Weighted average, confidence score, variant discovery from receipts ✅
- `convex/itemVariants.ts` — CRUD, getByBaseItem, getWithPrices, upsert, bulkUpsert ✅
- `convex/pantryItems.ts` — lastPrice + priceSource wiring from receipts ✅

---

### Formalized Implementation Plan

> Legend: `[x]` = done, `[ ]` = pending, `[~]` = partially done

#### Phase 1: Foundation — Persist AI Variant Prices (REQUIRED FIRST)

- [x] **Step 1.1: Schema — Add `estimatedPrice` to `itemVariants`**
  - File: `convex/schema.ts:280-289`
  - Change: Add `estimatedPrice: v.optional(v.number())` to `itemVariants` table definition
  - Risk: None (additive, optional field)

- [x] **Step 1.2: Persist `estimatedPrice` in variant mutations**
  - File: `convex/itemVariants.ts`
  - Change: Update `upsert` (line 103) and `bulkUpsert` (line 152) to accept and store `estimatedPrice`
  - `generateItemVariants` in `ai.ts:520` already returns `estimatedPrice` — it's being dropped silently in `bulkUpsert`
  - `review-items.tsx:115` calls `bulkUpsertVariants` with variant data but `estimatedPrice` is stripped

- [x] **Step 1.3: Fallback to `estimatedPrice` in `getWithPrices`**
  - File: `convex/itemVariants.ts:80-84`
  - Current code: `price: bestPrice` (null if no `currentPrices` match)
  - New code: `price: bestPrice ?? variant.estimatedPrice ?? null`

- [x] **Step 1.4: Re-run variant seeding for existing users**
  - One-time migration: for items already in `itemVariants` with `source: "ai_seeded"` and no `estimatedPrice`, re-generate prices via `generateItemVariants`
  - Or: for new installations only, this happens naturally during onboarding

- [x] **Step 1.5: Add personal priceHistory lookup to `getWithPrices`**
  - File: `convex/itemVariants.ts:26-97`
  - Currently queries `currentPrices` only (crowdsourced, layers 2-3)
  - Add: accept optional `userId` param. If provided, query `priceHistory` (index `by_user_item`) for personal receipt prices (layer 1)
  - Personal price takes priority over crowdsourced: `personalPrice ?? crowdsourcedPrice ?? variant.estimatedPrice`
  - Return alongside `price`: `priceSource` (computed string: `"personal"` | `"crowdsourced"` | `"ai_estimate"` based on which cascade layer provided the price), `reportCount` (from `currentPrices.reportCount`, or `0` for AI estimates), and `storeName` (from the source record)
  - Note: `priceSource` is NOT a stored DB field — it's computed at query time from which cascade layer returned the price. `currentPrices` has no `priceSource` column.
  - `reportCount` is essential for the confidence label system: 0 = "~est.", 1-2 = "at Store", 3-9 = "avg", 10+ = no qualifier

#### Phase 2: Zero-Blank for Non-Variant Items

- [x] **Step 2.1: Schema — Add `defaultSize`/`defaultUnit` to `pantryItems`**
  - File: `convex/schema.ts:40-74`
  - Change: Add `defaultSize: v.optional(v.string())` and `defaultUnit: v.optional(v.string())`

- [x] **Step 2.2: Update AI seeding prompt**
  - File: `convex/ai.ts`
  - Change: Update `SeedItem` type and `generateHybridSeedItems` prompt to return `defaultSize`/`defaultUnit` for `hasVariants: false` items
  - Prompt addition: "For items where hasVariants is false, include defaultSize and defaultUnit. No item should lack size context."

- [x] **Step 2.3: Wire `defaultSize`/`defaultUnit` through onboarding**
  - File: `convex/pantryItems.ts:9-24` — accept `defaultSize`/`defaultUnit` in `bulkCreate` args
  - File: `app/onboarding/review-items.tsx` — pass through from AI response

- [x] **Step 2.4: Update fallback items**
  - File: `convex/ai.ts:529-610` — update `getFallbackItems()` to include `defaultSize`/`defaultUnit` on all non-variant items

#### Phase 3: AI Fallback Provider

- [x] **Step 3.1: Add OpenAI dependency**
  - Run: `npm install openai`
  - Set `OPENAI_API_KEY` in Convex dashboard

- [x] **Step 3.2: Implement `withAIFallback` wrapper**
  - File: `convex/ai.ts`
  - Add OpenAI client initialization alongside Gemini
  - Implement `withAIFallback<T>` helper function
  - Create OpenAI-equivalent prompt runner for each function

- [x] **Step 3.3: Wrap all AI functions with fallback**
  - `parseReceipt` (line 249) — wrap Gemini call, add OpenAI equivalent
  - `generateHybridSeedItems` (line 22) — wrap Gemini call, add OpenAI equivalent
  - `generateItemVariants` (line 415) — wrap Gemini call, add OpenAI equivalent
  - `generateListSuggestions` (line 140) — wrap Gemini call, add OpenAI equivalent

#### Phase 4: Real-Time AI Estimation (Cold Start Safety Net)

- [x] **Step 4.1: Create `estimateItemPrice` action**
  - File: `convex/ai.ts`
  - New action: accepts item name, returns price + variants/defaultSize + category
  - Uses `withAIFallback` (Gemini primary, OpenAI fallback)
  - On success: writes results to `currentPrices` (with `storeName: "AI Estimate"`, `confidence: 0.05`, `reportCount: 0`) and `itemVariants` (if variants discovered)
  - `reportCount: 0` is critical — it distinguishes AI-seeded prices from receipt-verified prices in the confidence label system
  - Added `upsertAIEstimate` mutation in `convex/currentPrices.ts`

- [x] **Step 4.2: Wire into list-add flow**
  - File: `app/(app)/list/[id].tsx`
  - When user adds an item and `getWithPrices` returns empty AND no `pantryItem.lastPrice`:
    - Show brief loading indicator
    - Call `estimateItemPrice` action
    - Convex reactive query auto-refreshes with new data
    - Variant picker or single price appears

#### Phase 5: Price-Bracket Matcher

- [ ] **Step 5.1: Validate bracket matcher accuracy**
  - Use 19 receipts in `receipts/` as test corpus
  - Parse receipts with Gemini, isolate items WITH size data
  - Strip size, run bracket matcher against `itemVariants.estimatedPrice`
  - Measure accuracy — target >80%
  - If <60%, adjust tolerance or defer this phase

- [x] **Step 5.2: Implement bracket matcher in `upsertFromReceipt`**
  - File: `convex/currentPrices.ts:129-206`
  - In `upsertFromReceipt`, when `item.size` and `item.unit` are null:
    - Query `itemVariants` for matching baseItem
    - Find variant with closest `estimatedPrice` within 20% tolerance
    - If exactly one match: associate receipt price with that variant
    - If ambiguous or no match: store as base-item price (existing behavior)
  - If user has `preferredVariant`: always prefer that over bracket matching

#### Phase 6: Variant Picker UI

- [x] **Step 6.1: Variant picker in list detail** (basic implementation exists)
  - File: `app/(app)/list/[id].tsx:916-955`
  - Queries `itemVariants.getWithPrices` (line 166)
  - Shows variant chips with name, price, store name
  - Persists `preferredVariant` on pantry item (line 934-937)
  - **Missing:** "Your usual" star badge, "Change size" link, confidence labels (tilde for estimates), loading state for unknown items

- [x] **Step 6.2: Enhanced variant picker with zero-blank UX**
  - Add tilde (~) prefix for AI-estimated prices vs exact for receipt-verified
  - Add "Your usual" badge on personal priceSource variants
  - Add "est." / "avg" / store name confidence labels (from `priceSource` returned by Step 1.5)
  - Add selected state highlighting on variant chips
  - Add "Not sure" option that uses base-item average price
  - Trigger `estimateItemPrice` for completely unknown items (depends on Phase 4)

- [x] **Step 6.3: Non-variant item display with size context**
  - Price hint shows tilde prefix for low-confidence estimates (~£1.85 est.)
  - Confidence-based display: AI estimates vs receipt-verified prices

---

### Pre-Existing Infrastructure (already built, verified by codebase audit)

- [x] `itemVariants` table with `baseItem`, `variantName`, `size`, `unit`, `category`, `source`, `commonality` — `convex/schema.ts:279-289`
- [x] `currentPrices` table with `variantName`, `size`, `unit`, `averagePrice`, `minPrice`, `maxPrice`, `confidence` — `convex/schema.ts:224-247`
- [x] `priceHistory` table with `size`, `unit` pass-through — `convex/schema.ts:250-277`, `convex/priceHistory.ts:44-46`
- [x] `receipts.items[]` with `size`, `unit` fields — `convex/schema.ts:186-196`
- [x] `pantryItems` with `lastPrice`, `priceSource`, `preferredVariant`, `lastStoreName` — `convex/schema.ts:61-64`
- [x] Receipt parsing extracts `size`/`unit` with abbreviation expansion — `convex/ai.ts:249-408`
- [x] AI seeding returns `estimatedPrice` and `hasVariants` — `convex/ai.ts:7-130`
- [x] `generateItemVariants` action generates variants with `estimatedPrice` — `convex/ai.ts:415-527`
- [x] `itemVariants.getWithPrices` queries variants + `currentPrices` — `convex/itemVariants.ts:26-97`
- [x] `itemVariants.upsert` and `bulkUpsert` for CRUD — `convex/itemVariants.ts:103-197`
- [x] `currentPrices.upsertFromReceipt` with weighted average, confidence, variant discovery — `convex/currentPrices.ts:39-162`
- [x] `pantryItems.autoRestockFromReceipt` writes `lastPrice`, `priceSource: "receipt"`, `lastStoreName` — `convex/pantryItems.ts:451+`
- [x] `pantryItems.bulkCreate` accepts `estimatedPrice` and `hasVariants`, writes `lastPrice: estimatedPrice` with `priceSource: "ai_estimate"` — `convex/pantryItems.ts:9-24,65-68`
- [x] Onboarding `review-items.tsx` calls `generateItemVariants` + `bulkUpsertVariants` — `app/onboarding/review-items.tsx:22-23,115`
- [x] List detail page queries `itemVariants.getWithPrices` and shows basic variant chips — `app/(app)/list/[id].tsx:165-167,916-955`
- [x] Variant chip selection persists `preferredVariant` on pantry item — `app/(app)/list/[id].tsx:934-937`
- [x] Receipt-to-pantry price pipeline fully wired — receipts update `priceHistory`, `currentPrices`, and `pantryItems`
- [x] Weighted 30-day average price computation — `convex/currentPrices.ts:18-31`
- [x] Confidence score computation — `convex/currentPrices.ts:5-11`
- [x] Variant discovery from receipt items with size data — `convex/currentPrices.ts:129-157`

---

### Verification Plan

#### Core Functionality

- [ ] 1. **Onboarding zero-blank** — Create new account. Confirm ALL 200 seeded items have both a price AND size context (either variants for `hasVariants=true` or `defaultSize` for `hasVariants=false`). No blanks.
- [ ] 2. **Variant prices persisted** — Confirm items with `hasVariants: true` have 3-5 variants in `itemVariants` table, each with `estimatedPrice` populated.
- [ ] 3. **Add item to list (cold start)** — Add "milk" to a shopping list. Confirm variant picker appears with AI-estimated prices and tilde (~) prefix. Select a variant. Confirm `estimatedPrice` is set on the list item.
- [ ] 4. **Add same item again** — Add "milk" again. Confirm preferred variant is auto-selected with star badge, no picker shown.
- [ ] 5. **Add unknown item** — Add "quinoa" (not in pantry, no variants). Confirm brief loading state, then AI estimate appears with variants or single price. Confirm data cached in `currentPrices` + `itemVariants`.
- [ ] 6. **Non-variant item display** — Add "butter" to list. Confirm shows "Butter · 250g · ~£1.85 est." with no variant picker.

#### Receipt Flow

- [x] 7. **Scan receipt with sizes** — Scan an Aldi receipt. Confirm AI extracts size when visible. Confirm prices flow to `priceHistory`, `currentPrices`, and matched `pantryItems.lastPrice`. *(Pipeline exists and is wired. Confidence labels not yet shown in UI.)*
- [ ] 8. **Scan receipt without sizes (bracket matcher)** — Scan a Morrisons receipt. Confirm bracket matcher attempts to associate prices with variants. Confirm unambiguous matches are stored with variant data. Confirm ambiguous matches fall back to base-item.
- [ ] 9. **Price cascade verification** — After scanning a receipt, add same item to a new list. Confirm receipt-verified price (no tilde) takes priority over AI estimate (with tilde). Confirm personal priceHistory label shows "£X.XX at Store" (layer 1) when user has receipt data, and crowdsourced label shows "~£X.XX avg" (layer 2) when only other users have data.
- [ ] 10. **Crowdsourced accumulation** — Simulate multiple receipt scans for same item. Confirm `reportCount` increases. Confirm `averagePrice` is weighted by recency. Confirm confidence label progression.

#### AI Fallback

- [ ] 11. **Gemini failure → OpenAI fallback** — Temporarily break Gemini API key. Scan a receipt. Confirm OpenAI handles parsing successfully. Confirm fallback logged in console.
- [ ] 12. **Both providers fail** — Break both API keys. Confirm graceful error handling, no crash. Confirm user sees appropriate error message.

#### Edge Cases

- [x] 13. **Discount handling** — Scan receipt with loyalty discounts. Confirm discount lines excluded. *(AI prompt already instructs to ignore discounts/promos.)*
- [ ] 14. **Non-grocery rejection** — Scan a Primark receipt. Confirm graceful handling.
- [x] 15. **30-day freshness** — Verify old prices get lower weight. *(Weighted average implemented in `currentPrices.ts:18-31`.)*
- [ ] 16. **Admin seeding** — Use admin flow to scan receipts. Confirm prices populate `currentPrices`.
- [ ] 17. **Budget accuracy** — Create 10-item list with variant-selected prices. Confirm budget dial reflects accurate total.

#### Invariant Tests (CI Gate)

- [ ] 18. **Zero-blank invariant** — For every code path returning an item to UI, assert `price !== null && price !== undefined`. Automated test.
- [ ] 19. **Bracket matcher accuracy** — Run against 19 real receipts. Assert >80% accuracy on items with known sizes.
- [ ] 20. **All existing tests pass** — Confirm no regressions.

---

*Implementation plan formalized 1 February 2026. Party Mode session with Architect (Winston), PM (John), Analyst (Mary), Developer (Amelia), Test Architect (Murat).*
