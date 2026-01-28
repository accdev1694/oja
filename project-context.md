# Oja Project Context - Developer Reference

> **CRITICAL**: Read this document before implementing ANY code. This is the authoritative reference for architecture, patterns, and conventions.

---

## Quick Reference

| What | Where |
|------|-------|
| **Architecture** | `_bmad-output/planning-artifacts/architecture-v2-expo-convex.md` |
| **Coding Conventions** | `_bmad-output/planning-artifacts/coding-conventions-expo.md` |
| **Security Guidelines** | `_bmad-output/planning-artifacts/security-guidelines-expo.md` |
| **Product Brief** | `_bmad-output/planning-artifacts/product-brief.md` |
| **PRD** | `_bmad-output/planning-artifacts/prd.md` |
| **Epics & Stories** | `_bmad-output/planning-artifacts/epics/` |

---

## Tech Stack (v2)

```
MOBILE CLIENT                     BACKEND                    EXTERNAL
─────────────                     ───────                    ────────
Expo SDK 55+                      Convex                     Jina AI (embeddings)
 ├─ React Native                   ├─ Queries               Gemini (receipt parsing)
 ├─ Expo Router                    ├─ Mutations             Stripe
 ├─ TypeScript                     ├─ Actions               Google Places
 └─ Platform-Adaptive UI           ├─ File Storage
    ├─ iOS: Liquid Glass           └─ Vector Indexes
    └─ Android: Material You
Clerk (Auth)
 ├─ Sign In/Up
 ├─ Session Management
 └─ User Identity
```

---

## Critical Rules

### 1. Authentication is MANDATORY

```typescript
// ❌ NEVER do this
export const create = mutation({
  args: { name: v.string() },
  handler: async (ctx, args) => {
    // No auth check - VULNERABLE
    await ctx.db.insert("items", { name: args.name });
  },
});

// ✅ ALWAYS verify auth and ownership
export const create = mutation({
  args: { name: v.string() },
  handler: async (ctx, args) => {
    const user = await requireCurrentUser(ctx);
    await ctx.db.insert("items", {
      userId: user._id,
      name: args.name,
    });
  },
});
```

### 2. Use Indexes for Queries

```typescript
// ❌ NEVER scan full table
const items = await ctx.db.query("items").collect();
const userItems = items.filter(i => i.userId === userId);

// ✅ ALWAYS use index
const userItems = await ctx.db
  .query("items")
  .withIndex("by_user", (q) => q.eq("userId", userId))
  .collect();
```

### 3. Optimistic Updates for UX

```typescript
// ❌ Wait for server (sluggish UX)
const handleCheck = async () => {
  await checkItem({ id, isChecked: true });
  // UI updates only after server responds
};

// ✅ Optimistic update (instant UX)
const handleCheck = async () => {
  // Update UI immediately
  setLocalState(prev => ({ ...prev, isChecked: true }));
  try {
    await checkItem({ id, isChecked: true });
  } catch {
    // Revert on error
    setLocalState(prev => ({ ...prev, isChecked: false }));
  }
};
```

### 4. Platform-Adaptive UI

```typescript
import { Platform } from 'react-native';
import { BlurView } from 'expo-blur';

// iOS: Use BlurView for Liquid Glass
// Android: Use View with elevation
const CardComponent = Platform.select({
  ios: BlurView,
  android: View,
});

// Platform-specific styling
const styles = StyleSheet.create({
  card: Platform.select({
    ios: { borderRadius: 20 },
    android: { borderRadius: 16, elevation: 2 },
  }),
});
```

### 5. Haptic Feedback on Actions

```typescript
import * as Haptics from "expo-haptics";

// Light - toggles, taps
Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

// Medium - check item, add to list
Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

// Success - completed action
Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
```

### 6. Handle Loading and Error States

```typescript
// ✅ Always handle all states
const { data, isLoading, error } = useQuery(api.items.get, { id });

if (isLoading) return <LoadingScreen />;
if (error) return <ErrorState error={error} />;
if (!data) return <EmptyState />;

return <ItemView item={data} />;
```

---

## File Structure

```
oja/
├── app/                    # Expo Router pages
│   ├── _layout.tsx        # Root (providers)
│   ├── (app)/             # Authenticated routes
│   │   ├── (tabs)/        # Tab navigator
│   │   └── list/[id].tsx  # Dynamic routes
│   ├── (auth)/            # Auth routes
│   └── onboarding/        # Onboarding flow
├── components/            # Reusable components
│   ├── ui/               # Design primitives
│   ├── pantry/           # Pantry components
│   ├── lists/            # Shopping list components
│   └── receipt/          # Receipt components
├── hooks/                 # Custom hooks
├── lib/                   # Utilities
│   ├── utils/
│   └── constants/
├── convex/                # Backend
│   ├── schema.ts         # Database schema
│   ├── *.ts              # Functions
│   └── lib/              # Backend utils
└── project-context.md     # THIS FILE
```

---

## Convex Patterns

### Query (Read)

```typescript
export const getByUser = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("table")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();
  },
});
```

### Mutation (Write)

```typescript
export const create = mutation({
  args: { name: v.string() },
  handler: async (ctx, args) => {
    const user = await requireCurrentUser(ctx);
    return await ctx.db.insert("table", {
      userId: user._id,
      name: args.name,
      createdAt: Date.now(),
    });
  },
});
```

### Action (External API)

```typescript
export const generateEmbedding = action({
  args: { text: v.string() },
  handler: async (ctx, args) => {
    // Call Jina AI, Stripe, Gemini, etc.
    const result = await jinaAI.embeddings.create({ ... });
    return result.data[0].embedding;
  },
});
```

---

## Component Patterns

### Standard Component

```tsx
// 1. Imports
import { View, Text, StyleSheet } from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";

// 2. Types
interface Props {
  title: string;
  onPress?: () => void;
}

// 3. Component
export function MyComponent({ title, onPress }: Props) {
  return (
    <Animated.View entering={FadeIn.duration(300)}>
      <Text style={styles.title}>{title}</Text>
    </Animated.View>
  );
}

// 4. Styles
const styles = StyleSheet.create({
  title: { fontSize: 18, fontWeight: "600" },
});
```

### Hook Usage

```tsx
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";

export function ListScreen({ listId }) {
  const list = useQuery(api.shoppingLists.getById, { id: listId });
  const updateList = useMutation(api.shoppingLists.update);

  // Handle loading
  if (list === undefined) return <Loading />;

  return <ListView list={list} onUpdate={updateList} />;
}
```

---

## Gamification & Social Features

| Feature | Description |
|---------|-------------|
| **Budget Streak 🔥** | Consecutive under-budget trips |
| **Savings Jar 💰** | Animated jar with saved money |
| **Comprehensive Haptics ✨** | Unique vibrations for all actions |
| **Weekly Challenge 🏆** | One goal per week |
| **Smart Suggestions 🔮** | AI-powered "You might need..." |
| **Personal Best 📈** | Track lowest weekly spend |
| **Surprise Delight 🎁** | Random celebration toasts |
| **Partner Mode 👫** | Share lists, approve items, contest purchases |
| **Continent Seeding 🌍** | 200 culturally-appropriate items at onboarding |
| **Daily Reminder 🔔** | Push notification to update stock |
| **Mid-Shop Add 🛒** | 3 options: budget, impulse fund, or defer |

---

## Color Palette

```typescript
const colors = {
  primary: "#FF6B35",      // Orange
  background: "#FFFAF8",   // Warm white
  text: "#2D3436",         // Charcoal

  success: "#10B981",      // Under budget
  warning: "#F59E0B",      // Near limit
  danger: "#EF4444",       // Over budget

  stockStocked: "#10B981",
  stockGood: "#3B82F6",
  stockLow: "#F59E0B",
  stockOut: "#EF4444",
};
```

---

## Environment Variables

### Client (Expo)

```bash
EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_...
EXPO_PUBLIC_CONVEX_URL=https://...
```

### Server (Convex Dashboard)

```bash
OPENAI_API_KEY=sk_...
STRIPE_SECRET_KEY=sk_...
```

---

## Common Imports

```typescript
// Routing
import { useRouter, useLocalSearchParams } from "expo-router";

// Convex
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";

// UI
import { AdaptiveGlassView, GlassButton } from "@/components/ui";

// Utils
import { formatCurrency } from "@/lib/utils";

// Haptics
import * as Haptics from "expo-haptics";
```

---

## Testing Commands

```bash
# Run tests
npm test

# Run specific test file
npm test -- ShoppingListCard.test.tsx

# Run with coverage
npm test -- --coverage
```

---

## Before Starting Any Task

1. **Read the story file** completely
2. **Check this document** for patterns
3. **Verify auth requirements** in Convex functions
4. **Use indexes** for all queries
5. **Add haptic feedback** to interactions
6. **Handle loading/error states**
7. **Write tests** (red-green-refactor)

---

## Migration Notes (v1 → v2)

| v1 (Next.js PWA) | v2 (Expo/Convex) |
|------------------|------------------|
| Supabase Auth | Clerk |
| Supabase Postgres | Convex Documents |
| Supabase Edge Functions | Convex Actions |
| TanStack Query | Convex useQuery |
| Zustand | Local state + Convex |
| Tailwind CSS | StyleSheet + Liquid Glass |
| IndexedDB | Convex + Local Cache |

---

*This document is the single source of truth for implementation patterns. When in doubt, check here first.*
