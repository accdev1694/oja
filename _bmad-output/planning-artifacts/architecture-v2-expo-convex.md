# Oja Architecture v2 - Expo + Convex + Clerk

> **Budget-First Shopping Confidence** - A native mobile app giving shoppers control over spending before, during, and after shopping trips.

---

## Document Status

| Field | Value |
|-------|-------|
| Version | 2.0 |
| Status | Draft |
| Last Updated | 2026-01-26 |
| Architecture Type | Mobile-First Native (React Native/Expo) |

---

## Executive Summary

This document defines the new architecture for Oja, pivoting from a Next.js PWA to a **native mobile application** built with Expo (React Native), Clerk authentication, Convex real-time backend, and Jina AI embeddings. This architecture provides:

- **Native mobile experience** with platform-adaptive UI (iOS: Liquid Glass, Android: Material You)
- **Real-time data synchronization** via Convex
- **AI-powered features** using Jina AI embeddings
- **Seamless authentication** with Clerk
- **Offline-first capabilities** with optimistic updates

---

## Tech Stack Overview

| Layer | Technology | Purpose |
|-------|------------|---------|
| **Framework** | Expo SDK 55+ | React Native framework with native capabilities |
| **Language** | TypeScript (strict) | Type-safe development |
| **Routing** | Expo Router | File-based routing with native navigation |
| **UI Design** | Platform-Adaptive | iOS: Liquid Glass / Android: Material You |
| **Authentication** | Clerk | Managed auth with social providers |
| **Backend** | Convex | Real-time database + serverless functions |
| **AI/ML** | Jina AI | Embeddings (jina-embeddings-v3) |
| **State** | React hooks + Convex | Real-time reactive state |
| **Animations** | React Native Reanimated | Smooth native animations |
| **Icons** | Expo Symbols / SF Symbols | Native iOS icons |
| **Haptics** | Expo Haptics | Tactile feedback |

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        MOBILE CLIENT                             │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                    Expo App (React Native)                │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐   │   │
│  │  │   Screens   │  │  Components │  │     Hooks       │   │   │
│  │  │  (Routing)  │  │ (Liquid UI) │  │ (State/Logic)   │   │   │
│  │  └──────┬──────┘  └──────┬──────┘  └────────┬────────┘   │   │
│  │         │                │                   │            │   │
│  │  ┌──────┴────────────────┴───────────────────┴──────┐    │   │
│  │  │              Convex React Client                  │    │   │
│  │  │   useQuery() | useMutation() | useAction()       │    │   │
│  │  └──────────────────────┬───────────────────────────┘    │   │
│  └─────────────────────────┼────────────────────────────────┘   │
│                            │                                     │
│  ┌─────────────────────────┼────────────────────────────────┐   │
│  │         Clerk SDK       │      Authentication            │   │
│  │  ┌──────────────────────┴───────────────────────────┐    │   │
│  │  │   SignIn | SignUp | useUser | useAuth           │    │   │
│  │  └──────────────────────────────────────────────────┘    │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ HTTPS / WebSocket
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      CONVEX BACKEND                              │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                    Cloud Functions                        │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐   │   │
│  │  │   Queries   │  │  Mutations  │  │    Actions      │   │   │
│  │  │  (Read DB)  │  │ (Write DB)  │  │ (External API)  │   │   │
│  │  └──────┬──────┘  └──────┬──────┘  └────────┬────────┘   │   │
│  │         │                │                   │            │   │
│  │  ┌──────┴────────────────┴───────────────────┴──────┐    │   │
│  │  │              Convex Database                      │    │   │
│  │  │   Documents | Indexes | Vector Indexes           │    │   │
│  │  └──────────────────────────────────────────────────┘    │   │
│  │                                                           │   │
│  │  ┌──────────────────────────────────────────────────┐    │   │
│  │  │              File Storage                         │    │   │
│  │  │   Images | Receipts | Attachments                │    │   │
│  │  └──────────────────────────────────────────────────┘    │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ API Calls
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    EXTERNAL SERVICES                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │   Jina AI   │  │   Stripe    │  │   Google Places API     │  │
│  │ Embeddings  │  │  Payments   │  │   Store Locations       │  │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Platform-Adaptive UI Strategy

Oja uses **platform-specific design languages** to deliver native experiences on both iOS and Android.

### Design Languages

| Platform | Design System | Key Characteristics |
|----------|---------------|---------------------|
| **iOS 26+** | Liquid Glass | Translucent surfaces, blur, depth, vibrancy |
| **Android** | Material You | Dynamic color, elevation, shape morphing |

### Implementation Pattern

```typescript
// components/ui/AdaptiveCard.tsx
import { Platform, StyleSheet, View } from 'react-native';
import { BlurView } from 'expo-blur';

interface AdaptiveCardProps {
  children: React.ReactNode;
  intensity?: number;
}

export function AdaptiveCard({ children, intensity = 50 }: AdaptiveCardProps) {
  if (Platform.OS === 'ios') {
    // Liquid Glass: translucent blur effect
    return (
      <BlurView
        intensity={intensity}
        tint="light"
        style={styles.iosCard}
      >
        {children}
      </BlurView>
    );
  }

  // Material You: elevated surface with dynamic color
  return (
    <View style={styles.androidCard}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  iosCard: {
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  androidCard: {
    borderRadius: 16,
    backgroundColor: '#FFFAF8',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
});
```

### Shared vs Platform-Specific Components

| Component Type | Strategy |
|----------------|----------|
| **Cards/Surfaces** | Platform-specific (blur vs elevation) |
| **Buttons** | Shared with platform styling |
| **Icons** | SF Symbols (iOS) / Material Icons (Android) |
| **Navigation** | Native tab bars via Expo Router |
| **Modals/Sheets** | Platform-native bottom sheets |
| **Colors** | Shared palette, platform tints |
| **Typography** | System fonts (SF Pro / Roboto) |
| **Haptics** | Unified via Expo Haptics |

### Platform Detection Hook

```typescript
// hooks/usePlatformStyle.ts
import { Platform } from 'react-native';

export function usePlatformStyle() {
  const isIOS = Platform.OS === 'ios';
  const isAndroid = Platform.OS === 'android';

  return {
    isIOS,
    isAndroid,
    // Shared design tokens
    borderRadius: isIOS ? 20 : 16,
    elevation: isAndroid ? 2 : 0,
    useBlur: isIOS,
    iconFamily: isIOS ? 'sf-symbols' : 'material',
  };
}
```

### Color Palette (Cross-Platform)

```typescript
// lib/constants/colors.ts
export const colors = {
  // Primary - same on both platforms
  primary: '#FF6B35',
  background: '#FFFAF8',
  text: '#2D3436',

  // Semantic
  success: '#10B981',
  warning: '#F59E0B',
  danger: '#EF4444',

  // Platform-specific surface colors
  surface: Platform.select({
    ios: 'rgba(255,255,255,0.7)',    // Translucent for blur
    android: '#FFFFFF',              // Solid for elevation
  }),

  // Stock levels (shared)
  stockStocked: '#10B981',
  stockGood: '#3B82F6',
  stockLow: '#F59E0B',
  stockOut: '#EF4444',
};
```

---

## Graceful Degradation & Fallback Strategy

Oja uses a **3-tier progressive enhancement system** to ensure optimal experience across all device capabilities.

### Device Capability Tiers

```
┌─────────────────────────────────────────┐
│  PREMIUM TIER (High-end devices)         │
│  • Full Liquid Glass blur (iOS 13+)     │
│  • Complex animations (Reanimated)       │
│  • Comprehensive haptics                 │
│  • 60fps guaranteed                      │
└─────────────────────────────────────────┘
                 ↓ Degrades to
┌─────────────────────────────────────────┐
│  ENHANCED TIER (Mid-range devices)       │
│  • Gradient backgrounds (no blur)        │
│  • Simpler animations                    │
│  • Basic haptics                         │
│  • 30-60fps acceptable                   │
└─────────────────────────────────────────┘
                 ↓ Degrades to
┌─────────────────────────────────────────┐
│  BASELINE TIER (Low-end/old devices)     │
│  • Solid colors + simple shadows         │
│  • Minimal animations                    │
│  • No haptics (silent skip)              │
│  • 30fps minimum                         │
└─────────────────────────────────────────┘
```

### Tier Detection Logic

| Platform | Premium | Enhanced | Baseline |
|----------|---------|----------|----------|
| **iOS** | iOS 15+ (iPhone 12+) | iOS 13-14 (iPhone 8-11) | iOS <13 (iPhone 6s-7) |
| **Android** | 2022+, 6GB+ RAM | 2020+, 4GB+ RAM | Older/budget devices |

### UI Fallbacks

| Feature | Premium | Enhanced | Baseline |
|---------|---------|----------|----------|
| **Card Backgrounds** | BlurView (iOS only) | LinearGradient | Solid color |
| **Border Radius** | 20px (iOS) / 18px (Android) | 18px / 16px | 16px |
| **Shadows** | Deep (elevation 4-8) | Medium (elevation 2-4) | Light (elevation 1-2) |
| **Animations** | 300ms complex | 200ms simple | 150ms minimal |

### Haptics Fallbacks

```typescript
// lib/haptics/safeHaptics.ts
export async function haptic(type: HapticType): Promise<void> {
  // Triple safety check
  if (!deviceSupports || !isEnabled) return;

  try {
    // Trigger haptic
  } catch (error) {
    // Silent fail - haptics are decorative, not functional
  }
}
```

**Haptics Strategy:**
- ✅ Premium/Enhanced: Full haptic feedback
- ✅ Baseline: Silently skipped (no errors)
- ✅ User preference: Toggleable in settings
- ✅ Web platform: No haptics (graceful skip)

### Component Implementation

```typescript
// components/ui/AdaptiveCard.tsx
export function AdaptiveCard({ children, intensity = 50 }) {
  const { tier, supportsBlur, platform, tokens } = useDeviceCapabilities();

  // Premium iOS: Liquid Glass blur
  if (tier === 'premium' && supportsBlur && platform === 'ios') {
    return <BlurView intensity={intensity}>{children}</BlurView>;
  }

  // Enhanced: Gradient fallback (looks similar, no performance hit)
  if (tier === 'enhanced') {
    return <LinearGradient colors={[...]}>{children}</LinearGradient>;
  }

  // Baseline: Solid background
  return <View style={{ backgroundColor: '#FFFAF8' }}>{children}</View>;
}
```

### User Control

Users can view their device tier and manage preferences:

```typescript
// Settings Screen
<Section title="Visual Quality">
  <InfoRow
    label="Current Tier"
    value={tier.toUpperCase()}
    info={tierDescriptions[tier]}
  />
</Section>

<Section title="Haptic Feedback">
  {supportsHaptics && (
    <Switch
      label="Enable Haptics"
      value={hapticsEnabled}
      onValueChange={toggleHaptics}
    />
  )}
</Section>
```

### Design Tokens System

```typescript
// lib/design/tokens.ts
export function getTokensForTier(tier: DeviceTier, platform: Platform) {
  switch (tier) {
    case 'premium':
      return {
        borderRadius: { card: platform === 'ios' ? 20 : 18 },
        blur: { medium: 50 },
        shadow: { medium: { elevation: 4, shadowRadius: 12 } },
        animation: { normal: 300 },
      };
    case 'enhanced':
      return {
        borderRadius: { card: platform === 'ios' ? 18 : 16 },
        blur: { medium: 0 }, // No blur
        shadow: { medium: { elevation: 3, shadowRadius: 8 } },
        animation: { normal: 200 },
      };
    case 'baseline':
      return {
        borderRadius: { card: 16 },
        blur: { medium: 0 },
        shadow: { medium: { elevation: 2, shadowRadius: 4 } },
        animation: { normal: 150 },
      };
  }
}
```

### Capability Detection

```typescript
// lib/capabilities/deviceTier.ts
export async function getDeviceCapabilities(): Promise<DeviceCapabilities> {
  const tier = await detectDeviceTier();
  const platform = Platform.OS === 'ios' ? 'ios' : 'android';

  return {
    tier,
    platform,
    osVersion: parseInt(Platform.Version as string, 10),
    supportsBlur: platform === 'ios' && osVersion >= 13 && tier !== 'baseline',
    supportsHaptics: platform !== 'web' && tier !== 'baseline',
    supportsComplexAnimations: tier !== 'baseline',
  };
}
```

### Benefits

**For Users:**
- Premium devices get full visual experience
- Mid-range devices get good performance with simpler effects
- Old devices remain fast and responsive
- No crashes or errors on any device

**For Development:**
- Single codebase adapts automatically
- No platform-specific feature flags
- Testable with different tier settings
- Future-proof for new devices

---

## Gamification & Delight Features

Simple, fun features that make budget shopping feel rewarding.

### Feature Overview

| Feature | Description | Tech Used |
|---------|-------------|-----------|
| **Budget Streak 🔥** | Consecutive trips under budget | Convex counter + haptics |
| **Savings Jar 💰** | Animated jar filling with saved money | Reanimated + Convex |
| **Comprehensive Haptics ✨** | Unique vibrations for all actions | Expo Haptics |
| **Weekly Challenge 🏆** | One simple goal per week | Convex + confetti |
| **Smart Suggestions 🔮** | "You might need..." via AI | Jina AI embeddings |
| **Personal Best 📈** | Track your lowest weekly spend | Convex aggregation |
| **Surprise Delight 🎁** | Random celebrations for actions | Random triggers |
| **Partner Mode 👫** | Share lists, approve, contest items | Convex real-time + notifications |
| **Continent Seeding 🌍** | 200 culturally-appropriate pantry items | Gemini LLM |
| **Daily Reminder 🔔** | Push notification to update stock | Expo Notifications |
| **Mid-Shop Add 🛒** | Budget, impulse fund, or defer options | Convex mutations |

### 1. Budget Streak 🔥

```typescript
// convex/schema.ts - Add to users table
streakCount: v.number(),           // Current streak
longestStreak: v.number(),         // All-time best
lastTripUnderBudget: v.boolean(),  // For streak calculation

// convex/gamification.ts
export const updateStreak = mutation({
  args: { tripUnderBudget: v.boolean() },
  handler: async (ctx, args) => {
    const user = await requireCurrentUser(ctx);

    if (args.tripUnderBudget) {
      const newStreak = user.streakCount + 1;
      await ctx.db.patch(user._id, {
        streakCount: newStreak,
        longestStreak: Math.max(newStreak, user.longestStreak),
        lastTripUnderBudget: true,
      });
      return { streak: newStreak, isNewRecord: newStreak > user.longestStreak };
    } else {
      await ctx.db.patch(user._id, { streakCount: 0, lastTripUnderBudget: false });
      return { streak: 0, isNewRecord: false };
    }
  },
});
```

**UX:** Fire emoji 🔥 with number. Haptic burst on streak increase.

### 2. Savings Jar 💰

```typescript
// convex/schema.ts - Add to users table
totalSaved: v.number(),           // Lifetime savings
monthlySaved: v.number(),         // Current month
savingsGoal: v.optional(v.number()),

// Component: Animated jar that fills based on savings
// Uses Reanimated for smooth coin-drop animation
// Sound: Coin clink on each addition
```

**UX:** Visual jar fills 0-100%. Coins animate dropping in after each under-budget trip.

### 3. Comprehensive Haptics System ✨

```typescript
// lib/haptics/ojaHaptics.ts
import * as Haptics from 'expo-haptics';

const delay = (ms: number) => new Promise(r => setTimeout(r, ms));

export const ojaHaptics = {
  // ─── Navigation ───
  tabSwitch: () => Haptics.selectionAsync(),

  // ─── Stock Levels ───
  stockStocked: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy),
  stockGood: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium),
  stockLow: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light),
  stockOut: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning),
  flyToList: async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await delay(100);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  },

  // ─── List Interactions ───
  itemAdded: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light),
  itemChecked: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium),
  itemSwiped: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft),
  itemRemoved: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning),

  // ─── Budget Feedback ───
  budgetSafe: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light),
  budgetWarning: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning),
  budgetOver: async () => {
    // Triple pulse "uh oh"
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    await delay(80);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    await delay(80);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
  },

  // ─── Celebrations ───
  streakIncrease: async () => {
    // Rising pattern 🔥
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await delay(50);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await delay(50);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
  },
  underBudgetConfetti: async () => {
    // Fireworks pattern
    for (let i = 0; i < 5; i++) {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      await delay(100);
    }
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  },

  // ─── Partner Features ───
  partnerApproved: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success),
  partnerContested: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning),
  partnerCommented: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light),

  // ─── Price Entry ───
  priceDialTick: () => Haptics.selectionAsync(), // Each £1 increment
};

// Wrapper that respects user preferences
export const haptic = async (type: keyof typeof ojaHaptics) => {
  // Check user settings before triggering
  const settings = await AsyncStorage.getItem('haptics_enabled');
  if (settings !== 'false') {
    await ojaHaptics[type]();
  }
};
```

### 4. Weekly Challenge 🏆

```typescript
// convex/schema.ts
weeklyChallenges: defineTable({
  userId: v.id("users"),
  weekStart: v.number(),
  challengeType: v.union(
    v.literal("under_budget_percent"),  // "Stay 10% under budget"
    v.literal("no_impulse"),            // "No impulse purchases"
    v.literal("all_items_checked"),     // "Get everything on your list"
  ),
  target: v.number(),
  progress: v.number(),
  completed: v.boolean(),
  completedAt: v.optional(v.number()),
})
  .index("by_user_week", ["userId", "weekStart"]),
```

**UX:** Single card on home screen. Confetti burst + badge when completed.

### 5. Smart Suggestions 🔮

```typescript
// convex/ai.ts
export const getSuggestions = action({
  args: { listId: v.id("shoppingLists") },
  handler: async (ctx, args) => {
    // Get current list items
    const items = await ctx.runQuery(internal.listItems.getByList, { listId: args.listId });
    const itemNames = items.map(i => i.name).join(", ");

    // Generate embedding for current basket
    const embedding = await generateEmbedding(itemNames);

    // Find similar past purchases not in current list
    const suggestions = await ctx.runQuery(internal.priceIntelligence.findSimilar, {
      embedding,
      excludeItems: items.map(i => i.name),
      limit: 3,
    });

    return suggestions;
  },
});
```

**UX:** Subtle card: "You might need..." with 1-3 items. Tap to add.

### 6. Personal Best 📈

```typescript
// convex/schema.ts - Add to users table
personalBestSpend: v.optional(v.number()),
personalBestDate: v.optional(v.number()),
averageSpend: v.number(),

// Calculate on trip completion
// Show celebration when new personal best achieved
```

**UX:** "New personal best! £12 less than your average 🎉"

### 7. Surprise Delight 🎁

```typescript
// lib/delight/surpriseRewards.ts
const DELIGHT_TRIGGERS = [
  { action: 'item_checked', probability: 0.05, message: '10 items checked! 🎉' },
  { action: 'list_created', probability: 0.1, message: 'Planning ahead! Smart 🧠' },
  { action: 'stock_updated', probability: 0.03, message: 'Pantry pro! ✨' },
  { action: 'under_budget', probability: 0.2, message: 'Budget boss! 💪' },
];

export function maybeTriggerDelight(action: string): string | null {
  const trigger = DELIGHT_TRIGGERS.find(t => t.action === action);
  if (!trigger) return null;

  // Random chance based on probability
  if (Math.random() < trigger.probability) {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    return trigger.message;
  }
  return null;
}
```

**UX:** Toast notification with emoji. Unpredictable = more engaging.

### 8. Partner Approval & Contest Mode 👫

Share lists with partners, approve items together, or contest questionable purchases.

```typescript
// convex/schema.ts - Partner tables
listPartners: defineTable({
  listId: v.id("shoppingLists"),
  partnerUserId: v.id("users"),
  role: v.union(
    v.literal("viewer"),    // Can see list
    v.literal("approver"),  // Must approve items
    v.literal("editor"),    // Can add/remove items
  ),
  inviteCode: v.optional(v.string()),
  invitedAt: v.number(),
  acceptedAt: v.optional(v.number()),
})
  .index("by_list", ["listId"])
  .index("by_partner", ["partnerUserId"])
  .index("by_invite_code", ["inviteCode"]),

itemContests: defineTable({
  itemId: v.id("listItems"),
  contestedBy: v.id("users"),
  reason: v.optional(v.string()),
  status: v.union(
    v.literal("pending"),   // Awaiting resolution
    v.literal("kept"),      // Owner kept the item
    v.literal("removed"),   // Item was removed
    v.literal("modified"),  // Quantity changed
  ),
  createdAt: v.number(),
  resolvedAt: v.optional(v.number()),
})
  .index("by_item", ["itemId"])
  .index("by_list_status", ["listId", "status"]),

itemComments: defineTable({
  itemId: v.id("listItems"),
  userId: v.id("users"),
  text: v.string(),
  createdAt: v.number(),
})
  .index("by_item", ["itemId"]),
```

**Partner Flows:**
```typescript
// convex/partners.ts
export const invitePartner = mutation({
  args: { listId: v.id("shoppingLists"), partnerEmail: v.string(), role: v.string() },
  handler: async (ctx, args) => {
    const user = await requireCurrentUser(ctx);
    const inviteCode = generateInviteCode(); // 6-char code

    await ctx.db.insert("listPartners", {
      listId: args.listId,
      partnerUserId: null, // Filled when accepted
      role: args.role,
      inviteCode,
      invitedAt: Date.now(),
    });

    // Send invite notification/email
    return { inviteCode, shareLink: `oja://invite/${inviteCode}` };
  },
});

export const contestItem = mutation({
  args: { itemId: v.id("listItems"), reason: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const user = await requireCurrentUser(ctx);

    await ctx.db.insert("itemContests", {
      itemId: args.itemId,
      contestedBy: user._id,
      reason: args.reason,
      status: "pending",
      createdAt: Date.now(),
    });

    // Trigger push notification to list owner
    // Trigger partnerContested haptic on their device
  },
});

export const addComment = mutation({
  args: { itemId: v.id("listItems"), text: v.string() },
  handler: async (ctx, args) => {
    const user = await requireCurrentUser(ctx);

    await ctx.db.insert("itemComments", {
      itemId: args.itemId,
      userId: user._id,
      text: args.text,
      createdAt: Date.now(),
    });
  },
});
```

**UX States:**
- ✅ Approved item (green checkmark)
- ⏳ Pending approval (hourglass)
- 🔴 Contested item (red badge + comment thread)
- 💬 Has comments (speech bubble indicator)

### 9. Continent-Based Seeding 🌍

Generate 200 culturally-appropriate grocery items during onboarding.

```typescript
// convex/onboarding.ts
export const generateSeedItems = action({
  args: {
    continent: v.union(
      v.literal("africa"),
      v.literal("americas"),
      v.literal("asia"),
      v.literal("europe"),
      v.literal("oceania"),
      v.literal("middle_east"),
    ),
    dietaryPreferences: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const prompt = `Generate exactly 200 common grocery items for a household in ${args.continent}.

    Categories to include (roughly equal distribution):
    - Proteins: meat, fish, poultry, legumes, tofu
    - Dairy & alternatives: milk, cheese, yogurt, plant-based
    - Grains & carbs: rice, bread, pasta, cereals, local staples
    - Fresh produce: fruits, vegetables (seasonal, local)
    - Pantry essentials: oils, spices, condiments, sauces
    - Beverages: water, juice, tea, coffee, soft drinks
    - Snacks: chips, biscuits, nuts, local snacks
    - Household: cleaning supplies, toiletries, paper goods

    ${args.dietaryPreferences?.length ? `Dietary preferences: ${args.dietaryPreferences.join(", ")}` : ""}

    IMPORTANT: Use culturally appropriate items:
    - Africa: fufu, jollof rice ingredients, palm oil, egusi, plantains, garri
    - Americas: tortillas, black beans, corn, maple syrup, peanut butter
    - Asia: soy sauce, rice varieties, fish sauce, noodles, tofu, miso
    - Europe: olive oil, pasta, cheese varieties, bread types, wine vinegar
    - Oceania: Vegemite, lamb, pavlova ingredients, macadamia
    - Middle East: tahini, za'atar, chickpeas, pita, halloumi, dates

    Return ONLY valid JSON array (no markdown):
    [{"name": "Item Name", "category": "Category", "icon": "emoji"}, ...]`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.7 },
        }),
      }
    );

    const result = await response.json();
    const text = result.candidates[0].content.parts[0].text;
    const items = JSON.parse(text.replace(/```json\n?|\n?```/g, ""));

    return items.slice(0, 200); // Ensure max 200
  },
});

// Save selected items to pantry
export const saveSeedItems = mutation({
  args: {
    items: v.array(v.object({
      name: v.string(),
      category: v.string(),
      icon: v.optional(v.string()),
    })),
  },
  handler: async (ctx, args) => {
    const user = await requireCurrentUser(ctx);
    const now = Date.now();

    for (const item of args.items) {
      await ctx.db.insert("pantryItems", {
        userId: user._id,
        name: item.name,
        category: item.category,
        stockLevel: "stocked", // Start full
        autoAddToList: true,
        createdAt: now,
        updatedAt: now,
      });
    }
  },
});
```

**Onboarding Flow:**
1. Select continent (6 options with flag emojis)
2. Optional: dietary preferences (vegetarian, halal, kosher, vegan, gluten-free)
3. Loading animation while LLM generates items
4. Items cascade in with staggered animation
5. User taps X on items they don't want
6. "Done" saves remaining items to pantry

### 10. Daily Stock Reminder 🔔

Push notifications to maintain the stock update habit.

```typescript
// lib/notifications/stockReminder.ts
import * as Notifications from 'expo-notifications';

export const REMINDER_TIMES = [
  { label: "Morning (8am)", value: "08:00", icon: "🌅" },
  { label: "Lunch (12pm)", value: "12:00", icon: "☀️" },
  { label: "Evening (6pm)", value: "18:00", icon: "🌆" },
  { label: "Before bed (9pm)", value: "21:00", icon: "🌙" },
  { label: "Don't remind me", value: null, icon: "🔕" },
];

// Varied messages for engagement
const REMINDER_MESSAGES = [
  { title: "🏠 Quick pantry check?", body: "30 seconds keeps your list accurate" },
  { title: "📦 Running low on anything?", body: "Update now, shop smarter later" },
  { title: "🔍 Pantry peek time!", body: "Your future self will thank you" },
  { title: "✨ Stock check streak!", body: "Keep your streak going!" },
  { title: "🛒 Planning a shop soon?", body: "Make sure your stock is up to date" },
];

export async function scheduleStockReminder(time: string | null) {
  // Cancel existing reminders
  await Notifications.cancelAllScheduledNotificationsAsync();

  if (!time) return; // User disabled reminders

  const [hours, minutes] = time.split(':').map(Number);
  const message = REMINDER_MESSAGES[Math.floor(Math.random() * REMINDER_MESSAGES.length)];

  await Notifications.scheduleNotificationAsync({
    content: {
      title: message.title,
      body: message.body,
      data: { screen: 'pantry', action: 'stock_check' },
      sound: true,
    },
    trigger: {
      hour: hours,
      minute: minutes,
      repeats: true,
    },
  });
}

// Request permissions during onboarding
export async function requestNotificationPermissions() {
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}
```

**Schema addition:**
```typescript
// Add to users table
reminderTime: v.optional(v.string()),  // "08:00" or null
lastStockCheck: v.optional(v.number()), // For streak tracking
stockCheckStreak: v.number(),
```

### 11. Mid-Shop Add Flow 🛒💡

Handle forgotten items discovered during shopping.

```typescript
// convex/listItems.ts
export const addItemMidShop = mutation({
  args: {
    listId: v.id("shoppingLists"),
    name: v.string(),
    estimatedPrice: v.number(),
    source: v.union(
      v.literal("budget"),      // Add to main budget
      v.literal("impulse"),     // Use impulse fund
      v.literal("next_trip"),   // Defer to next list
    ),
  },
  handler: async (ctx, args) => {
    const user = await requireCurrentUser(ctx);
    const list = await ctx.db.get(args.listId);
    if (!list) throw new Error("List not found");

    const now = Date.now();

    if (args.source === "budget") {
      // Check budget lock
      const currentTotal = await calculateListTotal(ctx, args.listId);
      const newTotal = currentTotal + args.estimatedPrice;

      if (list.budgetLocked && list.budget && newTotal > list.budget) {
        throw new Error("BUDGET_LOCKED");
      }

      // Add to list
      await ctx.db.insert("listItems", {
        listId: args.listId,
        userId: user._id,
        name: args.name,
        quantity: 1,
        estimatedPrice: args.estimatedPrice,
        priority: "should-have",
        isChecked: false,
        autoAdded: false,
        isImpulse: false,
        addedMidShop: true,
        createdAt: now,
        updatedAt: now,
      });

    } else if (args.source === "impulse") {
      // Check impulse fund
      const impulseRemaining = list.impulseFund || 0;
      const impulseUsed = await calculateImpulseUsed(ctx, args.listId);
      const available = impulseRemaining - impulseUsed;

      if (args.estimatedPrice > available) {
        throw new Error("IMPULSE_EXCEEDED");
      }

      // Add as impulse item
      await ctx.db.insert("listItems", {
        listId: args.listId,
        userId: user._id,
        name: args.name,
        quantity: 1,
        estimatedPrice: args.estimatedPrice,
        priority: "nice-to-have",
        isChecked: false,
        autoAdded: false,
        isImpulse: true,
        addedMidShop: true,
        createdAt: now,
        updatedAt: now,
      });

    } else if (args.source === "next_trip") {
      // Add to pantry as "Out" - will auto-add to next list
      await ctx.db.insert("pantryItems", {
        userId: user._id,
        name: args.name,
        category: "Uncategorized",
        stockLevel: "out",
        autoAddToList: true,
        createdAt: now,
        updatedAt: now,
      });

      return { deferred: true };
    }

    return { added: true };
  },
});
```

**UX Flow:**
```
┌─────────────────────────────────────────┐
│  ➕ Add "Olive Oil" to list?            │
│                                         │
│  Current total: £67.40 / £80 budget     │
│  Olive Oil estimate: ~£4.50             │
│  New total: £71.90 ✅                   │
│                                         │
│  ┌─────────────────────────────────────┐│
│  │ ✅ Add to Budget                    ││
│  │    Counts toward £80 limit          ││
│  └─────────────────────────────────────┘│
│  ┌─────────────────────────────────────┐│
│  │ 🎁 Use Impulse Fund                 ││
│  │    £15.00 remaining                 ││
│  └─────────────────────────────────────┘│
│  ┌─────────────────────────────────────┐│
│  │ 📝 Add to Next Trip                 ││
│  │    Remember for later               ││
│  └─────────────────────────────────────┘│
└─────────────────────────────────────────┘
```

**Insights Integration:**
Track mid-shop adds for weekly digest:
```typescript
// Weekly insight calculation
const midShopItems = items.filter(i => i.addedMidShop);
const impulseItems = items.filter(i => i.isImpulse);

insights.push({
  type: "mid_shop_pattern",
  message: `You added ${midShopItems.length} items mid-shop this week`,
  detail: impulseItems.length > 0
    ? `${impulseItems.length} were impulse buys (${formatCurrency(impulseTotal)})`
    : "All were planned additions 👍",
});
```

---

## Database Schema (Convex)

### Core Tables

```typescript
// convex/schema.ts
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // User profiles
  users: defineTable({
    clerkId: v.string(),
    name: v.string(),
    email: v.optional(v.string()),
    avatarUrl: v.optional(v.string()),

    // Oja-specific
    defaultBudget: v.optional(v.number()),
    currency: v.string(),
    location: v.optional(v.object({
      latitude: v.number(),
      longitude: v.number(),
      city: v.optional(v.string()),
      region: v.optional(v.string()),
    })),

    // Settings
    preferences: v.optional(v.object({
      notifications: v.boolean(),
      haptics: v.boolean(),
      theme: v.string(),
    })),

    // AI embeddings for smart suggestions
    embedding: v.optional(v.array(v.float64())),

    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_clerk_id", ["clerkId"])
    .index("by_email", ["email"])
    .vectorIndex("by_embedding", {
      vectorField: "embedding",
      dimensions: 1024,
    }),

  // Pantry items (stock tracker)
  pantryItems: defineTable({
    userId: v.id("users"),
    name: v.string(),
    category: v.string(),

    // Stock levels
    stockLevel: v.union(
      v.literal("stocked"),
      v.literal("good"),
      v.literal("low"),
      v.literal("out")
    ),
    quantity: v.optional(v.number()),
    unit: v.optional(v.string()),

    // Price tracking
    lastPrice: v.optional(v.number()),
    priceHistory: v.optional(v.array(v.object({
      price: v.number(),
      store: v.optional(v.string()),
      date: v.number(),
    }))),

    // Smart features
    autoAddToList: v.boolean(),
    usualStore: v.optional(v.string()),
    purchaseFrequency: v.optional(v.number()), // days

    // Photos
    photos: v.optional(v.array(v.string())), // Storage IDs

    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_category", ["userId", "category"])
    .index("by_user_stock", ["userId", "stockLevel"]),

  // Shopping lists
  shoppingLists: defineTable({
    userId: v.id("users"),
    name: v.string(),
    status: v.union(
      v.literal("active"),
      v.literal("shopping"),
      v.literal("completed"),
      v.literal("archived")
    ),

    // Budget
    budget: v.optional(v.number()),
    budgetLocked: v.boolean(),
    impulseFund: v.optional(v.number()),

    // Store
    storeId: v.optional(v.string()),
    storeName: v.optional(v.string()),

    // Timestamps
    plannedDate: v.optional(v.number()),
    shoppingStartedAt: v.optional(v.number()),
    completedAt: v.optional(v.number()),

    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_status", ["userId", "status"])
    .index("by_user_date", ["userId", "plannedDate"]),

  // Shopping list items
  listItems: defineTable({
    listId: v.id("shoppingLists"),
    userId: v.id("users"),
    pantryItemId: v.optional(v.id("pantryItems")),

    name: v.string(),
    category: v.optional(v.string()),
    quantity: v.number(),
    unit: v.optional(v.string()),

    // Pricing
    estimatedPrice: v.optional(v.number()),
    actualPrice: v.optional(v.number()),

    // Priority
    priority: v.union(
      v.literal("must-have"),
      v.literal("should-have"),
      v.literal("nice-to-have")
    ),

    // Status
    isChecked: v.boolean(),
    checkedAt: v.optional(v.number()),

    // Auto-added indicator
    autoAdded: v.boolean(),

    // Notes
    notes: v.optional(v.string()),

    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_list", ["listId"])
    .index("by_user", ["userId"])
    .index("by_list_checked", ["listId", "isChecked"])
    .index("by_list_priority", ["listId", "priority"]),

  // Receipts
  receipts: defineTable({
    userId: v.id("users"),
    listId: v.optional(v.id("shoppingLists")),

    // Store info
    storeName: v.string(),
    storeAddress: v.optional(v.string()),

    // Totals
    subtotal: v.number(),
    tax: v.optional(v.number()),
    total: v.number(),

    // Items parsed from receipt
    items: v.array(v.object({
      name: v.string(),
      quantity: v.number(),
      unitPrice: v.number(),
      totalPrice: v.number(),
      category: v.optional(v.string()),
    })),

    // Receipt image
    imageStorageId: v.optional(v.string()),

    // Processing status
    processingStatus: v.union(
      v.literal("pending"),
      v.literal("processing"),
      v.literal("completed"),
      v.literal("failed")
    ),

    purchaseDate: v.number(),
    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_date", ["userId", "purchaseDate"])
    .index("by_list", ["listId"]),

  // Stores (for location intelligence)
  stores: defineTable({
    name: v.string(),
    chain: v.optional(v.string()),
    address: v.string(),
    location: v.object({
      latitude: v.number(),
      longitude: v.number(),
    }),

    // Average prices from user data
    priceLevel: v.optional(v.union(
      v.literal("budget"),
      v.literal("mid"),
      v.literal("premium")
    )),

    createdAt: v.number(),
  })
    .index("by_chain", ["chain"]),

  // Price intelligence (aggregated)
  priceIntelligence: defineTable({
    itemName: v.string(),
    normalizedName: v.string(),
    category: v.string(),

    // Price stats
    averagePrice: v.number(),
    minPrice: v.number(),
    maxPrice: v.number(),
    priceCount: v.number(),

    // By store
    storesPrices: v.optional(v.array(v.object({
      storeId: v.id("stores"),
      averagePrice: v.number(),
      lastUpdated: v.number(),
    }))),

    // Embedding for smart matching
    embedding: v.optional(v.array(v.float64())),

    updatedAt: v.number(),
  })
    .index("by_normalized_name", ["normalizedName"])
    .index("by_category", ["category"])
    .vectorIndex("by_embedding", {
      vectorField: "embedding",
      dimensions: 1024,
    }),
});
```

---

## Convex Function Patterns

### Query Pattern (Read Operations)

```typescript
// convex/shoppingLists.ts
import { query } from "./_generated/server";
import { v } from "convex/values";

// Public query - callable from client
export const getByUser = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("shoppingLists")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .order("desc")
      .collect();
  },
});

// Query with photo resolution
export const getWithItems = query({
  args: { listId: v.id("shoppingLists") },
  handler: async (ctx, args) => {
    const list = await ctx.db.get(args.listId);
    if (!list) return null;

    const items = await ctx.db
      .query("listItems")
      .withIndex("by_list", (q) => q.eq("listId", args.listId))
      .collect();

    return { ...list, items };
  },
});
```

### Mutation Pattern (Write Operations)

```typescript
// convex/shoppingLists.ts
import { mutation } from "./_generated/server";
import { v } from "convex/values";

export const create = mutation({
  args: {
    userId: v.id("users"),
    name: v.string(),
    budget: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    const listId = await ctx.db.insert("shoppingLists", {
      userId: args.userId,
      name: args.name,
      status: "active",
      budget: args.budget,
      budgetLocked: false,
      createdAt: now,
      updatedAt: now,
    });

    return listId;
  },
});

export const updateItem = mutation({
  args: {
    itemId: v.id("listItems"),
    updates: v.object({
      isChecked: v.optional(v.boolean()),
      actualPrice: v.optional(v.number()),
      quantity: v.optional(v.number()),
    }),
  },
  handler: async (ctx, args) => {
    const updates: any = { ...args.updates, updatedAt: Date.now() };

    if (args.updates.isChecked !== undefined) {
      updates.checkedAt = args.updates.isChecked ? Date.now() : undefined;
    }

    await ctx.db.patch(args.itemId, updates);
  },
});
```

### Action Pattern (External APIs)

```typescript
// convex/ai.ts
import { action } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";

// Jina AI embeddings - 1M tokens/month free tier
const JINA_API_URL = "https://api.jina.ai/v1/embeddings";

export const generateEmbedding = action({
  args: { text: v.string() },
  handler: async (ctx, args) => {
    const response = await fetch(JINA_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.JINA_API_KEY}`,
      },
      body: JSON.stringify({
        model: "jina-embeddings-v3",
        task: "text-matching",
        input: [args.text],
      }),
    });

    const data = await response.json();
    return data.data[0].embedding; // 1024 dimensions
  },
});

// For receipt parsing, use Google Gemini (free tier: 1500 req/day)
export const parseReceipt = action({
  args: { imageUrl: v.string() },
  handler: async (ctx, args) => {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: "Parse this receipt image and extract: store name, items (name, quantity, price), subtotal, tax, total. Return as JSON only." },
              { inline_data: { mime_type: "image/jpeg", data: args.imageUrl } },
            ],
          }],
        }),
      }
    );

    const result = await response.json();
    const text = result.candidates[0].content.parts[0].text;
    return JSON.parse(text.replace(/```json\n?|\n?```/g, ""));
  },
});
```

### Internal Functions (Backend Only)

```typescript
// convex/internal/users.ts
import { internalQuery, internalMutation } from "../_generated/server";
import { v } from "convex/values";

// Not exposed to client - only callable from other backend functions
export const getByClerkId = internalQuery({
  args: { clerkId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .first();
  },
});

export const updateEmbedding = internalMutation({
  args: {
    userId: v.id("users"),
    embedding: v.array(v.float64()),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.userId, {
      embedding: args.embedding,
      updatedAt: Date.now(),
    });
  },
});
```

---

## File Storage Pattern

```typescript
// convex/files.ts
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Generate upload URL for client
export const generateUploadUrl = mutation({
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl();
  },
});

// Get URL from storage ID
export const getUrl = query({
  args: { storageId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.storage.getUrl(args.storageId);
  },
});

// Resolve multiple photos
export const resolvePhotoUrls = async (
  ctx: any,
  photos: string[]
): Promise<string[]> => {
  return Promise.all(
    photos.map(async (photo) => {
      // If already a URL, return as-is
      if (photo.startsWith("http")) return photo;
      // Otherwise resolve from storage
      const url = await ctx.storage.getUrl(photo);
      return url || "";
    })
  );
};
```

---

## Authentication Integration (Clerk + Convex)

### Clerk Provider Setup

```typescript
// app/_layout.tsx
import { ClerkProvider, useAuth } from "@clerk/clerk-expo";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { ConvexReactClient } from "convex/react";

const convex = new ConvexReactClient(process.env.EXPO_PUBLIC_CONVEX_URL!);

export default function RootLayout() {
  return (
    <ClerkProvider publishableKey={process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY!}>
      <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
        <Stack />
      </ConvexProviderWithClerk>
    </ClerkProvider>
  );
}
```

### User Sync Hook

```typescript
// hooks/useCurrentUser.ts
import { useUser } from "@clerk/clerk-expo";
import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";

export function useCurrentUser() {
  const { user: clerkUser, isLoaded: isClerkLoaded } = useUser();

  const convexUser = useQuery(
    api.users.getByClerkId,
    clerkUser?.id ? { clerkId: clerkUser.id } : "skip"
  );

  return {
    clerkUser,
    user: convexUser,
    isLoading: !isClerkLoaded || convexUser === undefined,
    hasProfile: !!convexUser,
  };
}
```

---

## Optimistic Updates Pattern

```typescript
// hooks/useOptimisticListItems.ts
import { useState, useMemo, useCallback } from "react";
import { useMutation } from "convex/react";
import { api } from "../convex/_generated/api";
import { Id } from "../convex/_generated/dataModel";

interface OptimisticItem {
  _id: string;
  isOptimistic: true;
  status: "pending" | "failed";
}

export function useOptimisticListItems(listId: Id<"shoppingLists">, serverItems: any[]) {
  const [optimisticItems, setOptimisticItems] = useState<OptimisticItem[]>([]);
  const updateItem = useMutation(api.listItems.update);

  // Combine server items with optimistic items
  const items = useMemo(() => {
    const confirmedIds = new Set(serverItems.map(i => i._id));

    // Remove optimistic items that have been confirmed
    const pendingOptimistic = optimisticItems.filter(
      o => !confirmedIds.has(o._id)
    );

    return [...serverItems, ...pendingOptimistic];
  }, [serverItems, optimisticItems]);

  const checkItem = useCallback(async (itemId: Id<"listItems">, isChecked: boolean) => {
    // Optimistic update
    setOptimisticItems(prev => [...prev, {
      _id: itemId,
      isOptimistic: true,
      status: "pending",
      isChecked,
    }]);

    try {
      await updateItem({ itemId, updates: { isChecked } });
    } catch (error) {
      // Mark as failed
      setOptimisticItems(prev =>
        prev.map(o => o._id === itemId ? { ...o, status: "failed" } : o)
      );
    }
  }, [updateItem]);

  return { items, checkItem };
}
```

---

## Environment Variables

### Client-Side (Expo)

```bash
# .env
EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
EXPO_PUBLIC_CONVEX_URL=https://your-project.convex.cloud
EXPO_PUBLIC_GOOGLE_PLACES_API_KEY=...
```

### Convex Backend

Set via Convex Dashboard > Settings > Environment Variables:

```bash
JINA_API_KEY=jina_...           # Jina AI embeddings (1M tokens/month free)
GEMINI_API_KEY=...              # Google Gemini for receipt parsing (1500 req/day free)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

---

## Key Architectural Decisions

### 1. Convex vs Supabase

**Decision:** Use Convex for real-time, document-based backend.

**Rationale:**
- Real-time by default (no polling needed)
- TypeScript-first with auto-generated types
- Cloud functions co-located with schema
- Built-in file storage
- Vector indexes for AI features
- Simpler than managing Postgres + Edge Functions

### 2. Document Model vs Relational

**Decision:** Embrace document model, denormalize where appropriate.

**Rationale:**
- Faster reads (fewer joins)
- Natural fit for mobile apps
- Better offline support
- Convex handles consistency

### 3. Jina AI for Embeddings

**Decision:** Use `jina-embeddings-v3` for semantic search.

**Rationale:**
- 1024 dimensions (efficient and high quality)
- 1M tokens/month free tier (generous for MVP)
- High quality embeddings at zero cost
- Enables smart suggestions, receipt matching
- Convex has native vector index support

### 4. Expo over React Native CLI

**Decision:** Use Expo managed workflow with SDK 55+.

**Rationale:**
- Liquid Glass support (iOS 26)
- Easier native module integration
- OTA updates
- Expo Router for navigation
- Strong community and tooling

---

## Security Considerations

1. **Authentication:** Clerk handles all auth flows, tokens, and session management
2. **Authorization:** Convex functions verify user ownership before mutations
3. **API Keys:** Backend keys stored in Convex environment variables (never exposed to client)
4. **Data Validation:** Convex validators enforce schema at runtime
5. **File Uploads:** Signed URLs with expiration for uploads
6. **Rate Limiting:** Convex built-in rate limiting for functions

---

## Performance Optimizations

1. **Optimistic Updates:** Immediate UI feedback, reconcile with server
2. **Query Indexes:** All frequently-queried fields indexed
3. **Photo Resolution:** Only resolve URLs when needed
4. **Pagination:** Use cursor-based pagination for large lists
5. **Caching:** Convex caches query results automatically
6. **Code Splitting:** Lazy load screens and heavy components

---

## Migration Path from v1 (Next.js PWA)

### What Transfers

- Product Brief and PRD (requirements unchanged)
- UX flows and user journeys
- Business logic concepts
- Epic/Story structure (task details need updating)

### What Needs Rework

- All UI components (React Native primitives)
- Database schema (Postgres → Convex documents)
- Auth flow (Supabase Auth → Clerk)
- Offline storage (IndexedDB → Convex + local cache)
- API layer (REST/tRPC → Convex functions)

---

## Next Steps

1. Initialize Expo project with SDK 55+
2. Configure Clerk authentication
3. Set up Convex backend and schema
4. Implement core screens with Liquid Glass UI
5. Add Jina AI embeddings for smart features
6. Add Gemini integration for receipt parsing
7. Implement offline-first patterns
8. Add Stripe for subscriptions

---

*This architecture document serves as the technical foundation for Oja v2. All implementation should follow these patterns and conventions.*
