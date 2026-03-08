# Tutorial Hints Implementation Plan

## Overview

**Approach:** Progressive Discovery - Lightweight, action-triggered hints that appear when users need them, not when we want to teach them.

**Philosophy:**
- Oja is a **utility app** - users open it with urgent tasks ("Add milk," "Check budget at shelf")
- Hints should **never block** immediate user goals
- Show hints **in context** when users naturally discover features
- Keep sequences **brutally short** (max 3 hints per page)

**User Experience:**
- Hints appear 2 seconds after page load (or on first interaction with feature)
- Single tap to dismiss (no "Next" chains)
- Offline-first: Works without network, syncs to Convex later
- Global "Disable All Hints" toggle in Profile
- Non-intrusive: 50% background dim, soft glow (not pulsing ring)

**Total Coverage:** 6 core pages, 18 hints, ~3 minutes total (spread across weeks of usage)

---

## Core Principles

### 1. The "Rule of 3"
- **Maximum 3 hints per page**
- If a page needs more, the UI is too complex or we're over-explaining
- Focus on the **one critical action** per screen

### 2. Action-Triggered, Not Page-Triggered
**Bad:** Show hints immediately when page loads (blocks user task)
**Good:** Delay 2 seconds OR trigger when user interacts with specific feature

**Examples:**
- Lists Tab: Wait 2 seconds after page load (don't slam users)
- List Detail Budget: Show AFTER user adds first item (not on empty list)
- Scan Tab: Show when user opens camera picker (not on page focus)

### 3. Instructional, Not Promotional
**Bad:** "🛒 Smart Shopping Lists: Create unlimited lists and track spending in real-time!"
**Good:** "Tap '+' to create your first list"

Users already installed the app. Teach actions, not features.

### 4. Offline-First Persistence
- Write to local storage (`react-native-mmkv`) immediately
- Sync to Convex in background (fails gracefully if offline)
- Check local storage first for zero-latency response

### 5. Always Escapable
- Single tap dismisses any hint
- "Disable All Hints" toggle in Profile settings
- No forced sequences or mandatory completions

---

## Visual Design

### Lightweight Hint Component (Not Modal)

**Background Dimming:**
- `rgba(13, 21, 40, 0.50)` - 50% opacity (was 90%)
- Users need to see app context underneath

**Spotlight Effect:**
- Soft teal glow (4px blur) around target element
- No pulsing ring (feels like error/emergency)
- Use `#00D4AA` with 40% opacity

**Hint Card:**
- Small GlassCard (max 280px width)
- Auto-positioned relative to target (above/below/left/right)
- Single "Got it" button (no "Next" chains)
- No progress indicators (1/3, 2/3) - each hint is independent

**Typography:**
- Title: Body/Medium (16px, 500 weight)
- Content: Body/Regular (14px, 400 weight)
- Max 2 lines of text (brief!)

**Haptics:**
- Light impact on hint appear
- No haptics on dismiss

---

## Page-by-Page Hint Sequences

### 1. Lists Tab (Main Screen)
**File:** `app/(app)/(tabs)/index.tsx`

**Trigger:** 2 seconds after page focus (first visit only)

**Hints (3 total, shown one at a time over 3 sessions):**

#### Hint 1: Create Your First List
- **Target:** "+" FAB button
- **Position:** Above button
- **Trigger:** Page load (first visit), 2-second delay
- **Content:**
  ```
  Create a List

  Tap + to start your first shopping list.

  [Got it]
  ```

#### Hint 2: Set a Budget
- **Target:** First list item (or "Budget" field if visible)
- **Position:** Right side
- **Trigger:** User creates their first list
- **Content:**
  ```
  Add a Budget

  Set a budget to track spending as you shop.

  [Got it]
  ```

#### Hint 3: Templates Save Time
- **Target:** Template icon/button
- **Position:** Below icon
- **Trigger:** User creates their 3rd list
- **Content:**
  ```
  Quick Tip

  Save frequent lists as templates for one-tap reuse.

  [Got it]
  ```

**Total time:** ~45 seconds (spread across multiple sessions)

---

### 2. List Detail Page
**File:** `app/(app)/list/[id].tsx`

**Trigger:** Contextual (based on user actions)

**Hints (3 total):**

#### Hint 1: Add Items
- **Target:** Search bar / Add item input
- **Position:** Below search
- **Trigger:** Page focus (first visit), 2-second delay
- **Content:**
  ```
  Add Items

  Type to search or tap 🎤 to use voice.

  [Got it]
  ```

#### Hint 2: Budget Tracking
- **Target:** CircularBudgetDial
- **Position:** Right of dial
- **Trigger:** User adds their first item to list
- **Content:**
  ```
  Live Budget

  Your budget updates as you add items.

  [Got it]
  ```

#### Hint 3: Health Analysis
- **Target:** Health/heart icon
- **Position:** Left of icon
- **Trigger:** User opens health analysis modal for first time
- **Content:**
  ```
  Healthier Choices

  Get AI-powered swaps for better nutrition or savings.

  [Got it]
  ```

**Total time:** ~45 seconds

---

### 3. Stock Tab (Pantry)
**File:** `app/(app)/(tabs)/stock.tsx`

**Trigger:** Contextual

**Hints (3 total):**

#### Hint 1: Track Your Pantry
- **Target:** Screen header
- **Position:** Below header
- **Trigger:** Page focus (first visit), 2-second delay
- **Content:**
  ```
  Your Pantry

  Track what you have at home to avoid overbuying.

  [Got it]
  ```

#### Hint 2: Low Stock Alerts
- **Target:** "Attention Needed" section or first low-stock item
- **Position:** Right side
- **Trigger:** User first sees a low/out-of-stock item
- **Content:**
  ```
  Low Stock Alert

  Red/amber badges show items running low.

  [Got it]
  ```

#### Hint 3: Auto-Add to Lists
- **Target:** Auto-add toggle or first item with auto-add enabled
- **Position:** Above toggle
- **Trigger:** User toggles auto-add for first time
- **Content:**
  ```
  Auto-Add

  Low items automatically go to your next list.

  [Got it]
  ```

**Total time:** ~45 seconds

---

### 4. Scan Tab
**File:** `app/(app)/(tabs)/scan.tsx`

**Trigger:** User interaction

**Hints (3 total):**

#### Hint 1: Receipt vs Product
- **Target:** "Receipt" and "Product" buttons
- **Position:** Below buttons
- **Trigger:** User opens scan tab (first visit), 2-second delay
- **Content:**
  ```
  Two Scan Types

  Receipt: Track spending. Product: Check prices.

  [Got it]
  ```

#### Hint 2: Review Before Saving
- **Target:** First scanned receipt (on confirm screen)
- **Position:** Above item list
- **Trigger:** User scans their first receipt
- **Content:**
  ```
  Review Items

  Check prices and quantities before confirming.

  [Got it]
  ```

#### Hint 3: Earn Points
- **Target:** Points indicator or tier badge
- **Position:** Below indicator
- **Trigger:** User completes their first receipt scan
- **Content:**
  ```
  Scan Rewards

  Scanning receipts earns points toward your subscription.

  [Got it]
  ```

**Total time:** ~45 seconds

---

### 5. Insights Tab
**File:** `app/(app)/insights.tsx`

**Trigger:** Page focus (first visit), 2-second delay

**Hints (3 total):**

#### Hint 1: Your Progress
- **Target:** Hero stats card (savings/points)
- **Position:** Below card
- **Trigger:** Page focus (first visit), 2-second delay
- **Content:**
  ```
  Track Your Progress

  See how much you've saved and earned this month.

  [Got it]
  ```

#### Hint 2: Achievements
- **Target:** Achievements section
- **Position:** Right side
- **Trigger:** User scrolls to achievements section (first time)
- **Content:**
  ```
  Unlock Achievements

  Complete challenges to earn bonus points.

  [Got it]
  ```

#### Hint 3: Tier Benefits
- **Target:** Tier progress card
- **Position:** Above card
- **Trigger:** User first earns enough points to see tier progress
- **Content:**
  ```
  Climb Tiers

  Higher tiers = bigger scan credits for your subscription.

  [Got it]
  ```

**Total time:** ~45 seconds

---

### 6. Profile Tab
**File:** `app/(app)/(tabs)/profile.tsx`

**Trigger:** Page focus (first visit), 2-second delay

**Hints (3 total):**

#### Hint 1: Your Account
- **Target:** Profile header
- **Position:** Below header
- **Trigger:** Page focus (first visit), 2-second delay
- **Content:**
  ```
  Account Settings

  Manage your subscription, preferences, and data.

  [Got it]
  ```

#### Hint 2: Dietary Preferences
- **Target:** "Dietary Preferences" row
- **Position:** Right side
- **Trigger:** User taps dietary preferences for first time
- **Content:**
  ```
  Personalize Health Tips

  Set your diet to get better food swap suggestions.

  [Got it]
  ```

#### Hint 3: Disable Hints
- **Target:** "Tutorial Hints" toggle (new setting)
- **Position:** Above toggle
- **Trigger:** Never auto-shown (user discovers organically)
- **Content:**
  ```
  Control Hints

  Turn off hints anytime if you prefer to explore solo.

  [Got it]
  ```

**Total time:** ~45 seconds

---

## Technical Implementation

### 1. Database Schema

**New Convex Table: `tutorialHints`**
```typescript
tutorialHints: defineTable({
  userId: v.id("users"),
  hintId: v.string(), // "lists_create", "list_detail_budget", "stock_low_alert"
  viewedAt: v.number(), // timestamp
  dismissedAt: v.number(), // timestamp
})
  .index("by_user", ["userId"])
  .index("by_user_hint", ["userId", "hintId"]);
```

**New User Setting:**
```typescript
users: defineTable({
  // ... existing fields
  showTutorialHints: v.optional(v.boolean()), // Default: true
})
```

### 2. Local Storage (Offline-First)

**Install dependency:**
```bash
npm install react-native-mmkv
```

**Create storage utility: `lib/storage/hintStorage.ts`**
```typescript
import { MMKV } from 'react-native-mmkv';

export const hintStorage = new MMKV({ id: 'tutorial-hints' });

export function markHintAsViewed(hintId: string) {
  hintStorage.set(`hint_${hintId}`, true);
}

export function hasViewedHint(hintId: string): boolean {
  return hintStorage.getBoolean(`hint_${hintId}`) ?? false;
}

export function isHintsEnabled(): boolean {
  return hintStorage.getBoolean('hints_enabled') ?? true;
}

export function setHintsEnabled(enabled: boolean) {
  hintStorage.set('hints_enabled', enabled);
}

export function resetAllHints() {
  hintStorage.clearAll();
}
```

### 3. Core Hook: `useHint`

**Create: `hooks/useHint.ts`**
```typescript
import { useState, useEffect, useCallback } from 'react';
import { useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { hintStorage, hasViewedHint, markHintAsViewed, isHintsEnabled } from '@/lib/storage/hintStorage';

export function useHint(hintId: string, trigger: 'immediate' | 'delayed' | 'manual' = 'delayed') {
  const [shouldShow, setShouldShow] = useState(false);
  const recordHint = useMutation(api.tutorialHints.recordView);

  useEffect(() => {
    // Check if hints are globally disabled
    if (!isHintsEnabled()) {
      return;
    }

    // Check local storage first (instant, offline-friendly)
    if (hasViewedHint(hintId)) {
      return;
    }

    // Trigger logic
    if (trigger === 'immediate') {
      setShouldShow(true);
    } else if (trigger === 'delayed') {
      const timer = setTimeout(() => setShouldShow(true), 2000);
      return () => clearTimeout(timer);
    }
    // 'manual' triggers require explicit showHint() call
  }, [hintId, trigger]);

  const dismiss = useCallback(() => {
    setShouldShow(false);

    // Write to local storage immediately
    markHintAsViewed(hintId);

    // Sync to Convex in background (fails gracefully if offline)
    recordHint({ hintId }).catch(console.warn);
  }, [hintId, recordHint]);

  const showHint = useCallback(() => {
    if (!isHintsEnabled() || hasViewedHint(hintId)) {
      return;
    }
    setShouldShow(true);
  }, [hintId]);

  return {
    shouldShow,
    dismiss,
    showHint, // For manual triggers
  };
}
```

### 4. Hint Component: `HintOverlay`

**Create: `components/tutorial/HintOverlay.tsx`**
```typescript
import React, { useRef, useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet, Dimensions, Animated } from 'react-native';
import { GlassCard } from '@/components/ui/glass/GlassCard';
import { GlassButton } from '@/components/ui/glass/GlassButton';
import { glassTokens } from '@/lib/design/glassTokens';
import { safeHaptics } from '@/lib/haptics/safeHaptics';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export function HintOverlay({
  visible,
  targetRef,
  position = 'below',
  title,
  content,
  onDismiss,
}) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [targetLayout, setTargetLayout] = useState(null);

  useEffect(() => {
    if (visible) {
      // Measure target element
      targetRef?.current?.measureInWindow((x, y, width, height) => {
        setTargetLayout({ x, y, width, height });
      });

      // Fade in
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();

      // Haptic feedback
      safeHaptics.light();
    } else {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  if (!visible || !targetLayout) return null;

  // Calculate hint card position
  const hintPosition = calculatePosition(targetLayout, position);

  return (
    <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
      {/* Dimmed background - 50% opacity */}
      <Pressable style={styles.backdrop} onPress={onDismiss} />

      {/* Spotlight glow around target */}
      <View
        style={[
          styles.spotlight,
          {
            left: targetLayout.x - 8,
            top: targetLayout.y - 8,
            width: targetLayout.width + 16,
            height: targetLayout.height + 16,
          },
        ]}
      />

      {/* Hint card */}
      <View style={[styles.hintCard, hintPosition]}>
        <GlassCard style={styles.card}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.content}>{content}</Text>
          <GlassButton
            variant="primary"
            size="sm"
            onPress={onDismiss}
            style={styles.button}
          >
            Got it
          </GlassButton>
        </GlassCard>
      </View>
    </Animated.View>
  );
}

function calculatePosition(target, position) {
  const cardWidth = 280;
  const cardHeight = 120; // Approximate
  const spacing = 16;

  switch (position) {
    case 'above':
      return {
        left: Math.max(16, Math.min(SCREEN_WIDTH - cardWidth - 16, target.x + target.width / 2 - cardWidth / 2)),
        top: target.y - cardHeight - spacing,
      };
    case 'below':
      return {
        left: Math.max(16, Math.min(SCREEN_WIDTH - cardWidth - 16, target.x + target.width / 2 - cardWidth / 2)),
        top: target.y + target.height + spacing,
      };
    case 'left':
      return {
        left: target.x - cardWidth - spacing,
        top: Math.max(16, target.y + target.height / 2 - cardHeight / 2),
      };
    case 'right':
      return {
        left: target.x + target.width + spacing,
        top: Math.max(16, target.y + target.height / 2 - cardHeight / 2),
      };
    default:
      return { left: 16, top: target.y + target.height + spacing };
  }
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 9999,
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(13, 21, 40, 0.50)', // 50% dimming
  },
  spotlight: {
    position: 'absolute',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: glassTokens.colors.accent.primary,
    backgroundColor: 'transparent',
    shadowColor: glassTokens.colors.accent.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
  },
  hintCard: {
    position: 'absolute',
    width: 280,
  },
  card: {
    padding: glassTokens.spacing.lg,
  },
  title: {
    fontSize: 16,
    fontWeight: '500',
    color: glassTokens.colors.text.primary,
    marginBottom: glassTokens.spacing.xs,
  },
  content: {
    fontSize: 14,
    fontWeight: '400',
    color: glassTokens.colors.text.secondary,
    lineHeight: 20,
    marginBottom: glassTokens.spacing.md,
  },
  button: {
    alignSelf: 'flex-start',
  },
});
```

### 5. Convex Mutations

**Create: `convex/tutorialHints.ts`**
```typescript
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireCurrentUser } from "./lib/auth";

export const recordView = mutation({
  args: {
    hintId: v.string(),
  },
  handler: async (ctx, { hintId }) => {
    const user = await requireCurrentUser(ctx);

    // Check if already recorded
    const existing = await ctx.db
      .query("tutorialHints")
      .withIndex("by_user_hint", (q) =>
        q.eq("userId", user._id).eq("hintId", hintId)
      )
      .first();

    if (!existing) {
      await ctx.db.insert("tutorialHints", {
        userId: user._id,
        hintId,
        viewedAt: Date.now(),
        dismissedAt: Date.now(),
      });
    }
  },
});

export const hasViewedHint = query({
  args: {
    hintId: v.string(),
  },
  handler: async (ctx, { hintId }) => {
    const user = await requireCurrentUser(ctx);

    const hint = await ctx.db
      .query("tutorialHints")
      .withIndex("by_user_hint", (q) =>
        q.eq("userId", user._id).eq("hintId", hintId)
      )
      .first();

    return !!hint;
  },
});
```

### 6. User Settings Toggle

**Add to: `app/(app)/(tabs)/profile.tsx`**
```typescript
import { useState } from 'react';
import { Switch } from 'react-native';
import { useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { setHintsEnabled, isHintsEnabled } from '@/lib/storage/hintStorage';
import { GlassCard } from '@/components/ui/glass/GlassCard';

export default function ProfileScreen() {
  const [hintsEnabled, setHintsEnabledLocal] = useState(isHintsEnabled());
  const updateSettings = useMutation(api.users.updateSettings);

  return (
    <GlassCard style={styles.settingsSection}>
      <Text style={styles.settingLabel}>Tutorial Hints</Text>
      <Text style={styles.settingDescription}>
        Show helpful tips as you explore the app
      </Text>
      <Switch
        value={hintsEnabled}
        onValueChange={(value) => {
          setHintsEnabledLocal(value);
          setHintsEnabled(value); // Local storage
          updateSettings({ showTutorialHints: value }).catch(console.warn); // Convex sync
        }}
        trackColor={{
          false: glassTokens.colors.border.subtle,
          true: glassTokens.colors.accent.primary
        }}
      />
    </GlassCard>
  );
}
```

---

## Usage Example: Lists Tab

**File: `app/(app)/(tabs)/index.tsx`**
```typescript
import { useRef } from 'react';
import { View } from 'react-native';
import { useHint } from '@/hooks/useHint';
import { HintOverlay } from '@/components/tutorial/HintOverlay';
import { GlassButton } from '@/components/ui/glass/GlassButton';

export default function ListsScreen() {
  const fabRef = useRef(null);
  const createListHint = useHint('lists_create', 'delayed'); // 2s delay

  return (
    <View>
      {/* Main content */}

      {/* FAB button */}
      <GlassButton ref={fabRef} onPress={handleCreateList}>
        +
      </GlassButton>

      {/* Hint overlay */}
      <HintOverlay
        visible={createListHint.shouldShow}
        targetRef={fabRef}
        position="above"
        title="Create a List"
        content="Tap + to start your first shopping list."
        onDismiss={createListHint.dismiss}
      />
    </View>
  );
}
```

---

## Implementation Timeline

### **Phase 1: Foundation (Week 1)**
- [ ] Install `react-native-mmkv`
- [ ] Create `hintStorage.ts` utility (local persistence)
- [ ] Create `tutorialHints` Convex table
- [ ] Implement `recordView` and `hasViewedHint` mutations
- [ ] Create `useHint` hook
- [ ] Create `HintOverlay` component
- [ ] Add "Tutorial Hints" toggle to Profile settings

### **Phase 2: Core Journey (Week 2)**
- [ ] Implement Lists Tab hints (3 hints)
- [ ] Implement List Detail hints (3 hints)
- [ ] QA: Test offline persistence, trigger timing
- [ ] Analytics: Track view/dismiss events

### **Phase 3: Analytics Review (Week 3)**
- [ ] Monitor skip rate for Lists + List Detail
- [ ] **Decision point:** If skip rate >20%, revise content/timing before continuing
- [ ] If skip rate <20%, proceed to Phase 4

### **Phase 4: Expand Coverage (Week 4)**
- [ ] Implement Stock Tab hints (3 hints)
- [ ] Implement Scan Tab hints (3 hints)
- [ ] QA: Test trigger conditions, visual positioning

### **Phase 5: Complete Core Pages (Week 5)**
- [ ] Implement Insights hints (3 hints)
- [ ] Implement Profile hints (3 hints)
- [ ] Add "Reset All Hints" option in Profile settings
- [ ] Accessibility audit (VoiceOver, TalkBack)

### **Phase 6: Polish & Launch (Week 6)**
- [ ] Performance optimization (lazy render, animation smoothness)
- [ ] Cross-device testing (iOS/Android, small/large screens)
- [ ] A/B test: 50% see hints, 50% don't
- [ ] Monitor feature discovery metrics
- [ ] Iterate based on completion rates

---

## Success Metrics

**Target KPIs:**
- **Skip Rate:** <20% (users dismiss before reading)
- **Completion Rate:** >80% (users tap "Got it" vs. tapping backdrop)
- **Feature Discovery:** +40% usage of hinted features vs. control group
- **Support Tickets:** -30% "how do I..." tickets
- **Retention Impact:** +15% D7 retention for users who see 5+ hints

**Analytics Events to Track:**
```typescript
// On hint appear
analytics.track('hint_shown', { hintId, pageId, trigger });

// On hint dismiss
analytics.track('hint_dismissed', { hintId, timeOnScreen });

// On feature first use (after hint)
analytics.track('feature_discovered', { featureId, hadHint: true });
```

---

## User Testing Plan

**Before Launch:**
1. **Internal Testing:** Team tests all 6 pages, validate triggers work offline
2. **Beta Testing:** 15 external users, observe skip rate
3. **Usability Sessions:** 3 recorded sessions, watch for "annoyed" dismissals
4. **Feedback Survey:** "Were hints helpful?" (1-5 scale + open text)

**Post-Launch:**
1. **A/B Test:** 50% control (no hints), 50% treatment (hints)
2. **Cohort Analysis:** Compare feature adoption rates between groups
3. **Heatmaps:** Track which hints are skipped most (remove low-value ones)
4. **Iterate:** If hint skip rate >30%, reduce content length or remove entirely

---

## Accessibility

**VoiceOver / TalkBack Support:**
- Hint overlay announces title + content automatically
- "Got it" button is focusable and labeled
- Backdrop dismissal has accessibilityLabel: "Dismiss hint"

**Example:**
```typescript
<View
  accessible={true}
  accessibilityLabel={`Hint: ${title}. ${content}`}
  accessibilityRole="alert"
>
  <GlassCard>
    <Text accessible={false}>{title}</Text>
    <Text accessible={false}>{content}</Text>
    <GlassButton
      accessibilityLabel="Dismiss hint"
      accessibilityHint="Double tap to close this hint"
      onPress={onDismiss}
    >
      Got it
    </GlassButton>
  </GlassCard>
</View>
```

---

## Appendix: Complete Hint List

| Page | Hint ID | Title | Trigger | Time |
|------|---------|-------|---------|------|
| **Lists Tab** |
| | `lists_create` | Create a List | Page focus + 2s delay | 15s |
| | `lists_budget` | Add a Budget | First list created | 15s |
| | `lists_templates` | Templates Save Time | 3rd list created | 15s |
| **List Detail** |
| | `list_detail_add` | Add Items | Page focus + 2s delay | 15s |
| | `list_detail_budget` | Live Budget | First item added | 15s |
| | `list_detail_health` | Healthier Choices | Health modal opened | 15s |
| **Stock Tab** |
| | `stock_intro` | Your Pantry | Page focus + 2s delay | 15s |
| | `stock_low_alert` | Low Stock Alert | First low stock seen | 15s |
| | `stock_auto_add` | Auto-Add | Auto-add toggled | 15s |
| **Scan Tab** |
| | `scan_types` | Two Scan Types | Page focus + 2s delay | 15s |
| | `scan_review` | Review Before Saving | First receipt scanned | 15s |
| | `scan_rewards` | Scan Rewards | First receipt confirmed | 15s |
| **Insights** |
| | `insights_progress` | Track Your Progress | Page focus + 2s delay | 15s |
| | `insights_achievements` | Unlock Achievements | Achievements scrolled | 15s |
| | `insights_tiers` | Climb Tiers | Tier progress visible | 15s |
| **Profile** |
| | `profile_intro` | Account Settings | Page focus + 2s delay | 15s |
| | `profile_diet` | Personalize Health Tips | Diet settings opened | 15s |
| | `profile_hints` | Control Hints | (User discovers) | 15s |
| **TOTAL** | **18 hints** | | | **~4.5 mins** |

**Note:** Users will only see hints for pages they visit and features they use. Typical user sees 6-10 hints over their first month.

---

## Why This Works

### Gemini's Critiques Addressed:

1. **"Clippy" Problem** → Solved with 2-second delays and action-based triggers
2. **Cognitive Overload** → Reduced from 69→18 hints, max 3 per page
3. **Visual Blockage** → 50% dimming (not 90%), soft glow (not pulsing ring)
4. **Promotional Tone** → Rewritten to instructional ("Tap +" not "Create unlimited lists!")
5. **Offline Gaps** → Local-first with mmkv, syncs to Convex in background
6. **No Escape Hatch** → Global "Disable All Hints" toggle in Profile
7. **Tutorial Overload** → Deleted: Admin, Subscription, AI Usage, Receipt flows, Trip Summary, Buy It Again

### UX Philosophy Shift:

**Old Approach:** "Teach users everything upfront"
**New Approach:** "Let users discover features naturally, hint when stuck"

**Result:** Non-intrusive, helpful, respects user urgency.

---

## Final Notes

- **Never block user tasks** - Hints should feel optional, not mandatory
- **Context over timing** - Show budget hint after first item, not on empty list
- **Brevity is respect** - 2 lines max, single button
- **Local-first** - Works offline, syncs later
- **Always escapable** - Global disable, single tap dismiss
- **Measure ruthlessly** - If skip rate >20%, remove or shorten

**Implementation Priority:** Build foundation → Ship Lists+List Detail → Wait for analytics → Expand carefully.

This is a **Progressive Discovery** system, not a tutorial walkthrough. Users learn by doing, hints just accelerate the "aha" moments.
