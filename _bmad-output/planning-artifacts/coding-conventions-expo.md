# Oja Coding Conventions - Expo + Convex

> Standards and patterns for consistent, maintainable code in the Oja mobile application.

---

## File Naming Conventions

| Type | Convention | Example |
|------|------------|---------|
| **Components** | PascalCase.tsx | `ShoppingListCard.tsx` |
| **Screens/Pages** | kebab-case.tsx | `shopping-list.tsx`, `[id].tsx` |
| **Hooks** | useCamelCase.ts | `useCurrentUser.ts` |
| **Utilities** | camelCase.ts | `formatCurrency.ts` |
| **Constants** | camelCase.ts | `preferences.ts` |
| **Convex Functions** | camelCase.ts | `shoppingLists.ts` |
| **Types** | PascalCase | `ShoppingList`, `ListItem` |

---

## Project Structure

```
oja/
├── app/                          # Expo Router (file-based routing)
│   ├── _layout.tsx              # Root layout (providers)
│   ├── (app)/                   # Authenticated routes
│   │   ├── _layout.tsx          # Protected layout
│   │   ├── (tabs)/              # Tab navigator
│   │   │   ├── _layout.tsx      # Tab configuration
│   │   │   ├── index.tsx        # Pantry (home)
│   │   │   ├── lists.tsx        # Shopping lists
│   │   │   ├── scan.tsx         # Receipt scanner
│   │   │   └── profile.tsx      # User profile
│   │   ├── list/
│   │   │   └── [id].tsx         # List detail
│   │   ├── item/
│   │   │   └── [id].tsx         # Item detail
│   │   └── edit-profile.tsx     # Edit profile screen
│   ├── (auth)/                   # Auth routes (unauthenticated)
│   │   ├── _layout.tsx
│   │   ├── sign-in.tsx
│   │   └── sign-up.tsx
│   └── onboarding/               # Onboarding flow
│       ├── _layout.tsx
│       ├── name.tsx
│       ├── budget.tsx
│       ├── currency.tsx
│       └── complete.tsx
│
├── components/                   # Reusable components
│   ├── ui/                      # Design system primitives
│   │   ├── AdaptiveGlassView.tsx
│   │   ├── GlassButton.tsx
│   │   ├── GlassInput.tsx
│   │   ├── GlassChip.tsx
│   │   ├── EmptyState.tsx
│   │   ├── LoadingScreen.tsx
│   │   └── index.ts             # Barrel export
│   ├── pantry/                  # Pantry-specific components
│   │   ├── PantryItemCard.tsx
│   │   ├── StockLevelIndicator.tsx
│   │   └── index.ts
│   ├── lists/                   # Shopping list components
│   │   ├── ShoppingListCard.tsx
│   │   ├── ListItemRow.tsx
│   │   ├── BudgetRing.tsx
│   │   └── index.ts
│   ├── receipt/                 # Receipt scanning
│   │   ├── CameraView.tsx
│   │   ├── ReceiptPreview.tsx
│   │   └── index.ts
│   └── onboarding/              # Onboarding components
│       ├── OnboardingHeader.tsx
│       ├── QuestionHeader.tsx
│       └── index.ts
│
├── hooks/                        # Custom React hooks
│   ├── useCurrentUser.ts
│   ├── usePhotoPicker.ts
│   ├── useOptimisticUpdates.ts
│   ├── useLocation.ts
│   └── index.ts
│
├── lib/                          # Utilities and helpers
│   ├── utils/
│   │   ├── formatCurrency.ts
│   │   ├── dateUtils.ts
│   │   └── index.ts
│   ├── constants/
│   │   ├── categories.ts
│   │   ├── stockLevels.ts
│   │   └── index.ts
│   └── location.ts
│
├── convex/                       # Convex backend
│   ├── _generated/              # Auto-generated (don't edit)
│   ├── schema.ts                # Database schema
│   ├── users.ts                 # User functions
│   ├── pantryItems.ts           # Pantry functions
│   ├── shoppingLists.ts         # List functions
│   ├── listItems.ts             # List item functions
│   ├── receipts.ts              # Receipt functions
│   ├── files.ts                 # File storage
│   ├── ai.ts                    # AI/OpenAI functions
│   ├── seed.ts                  # Development seeding
│   └── lib/                     # Backend utilities
│       ├── openai.ts
│       ├── photos.ts
│       └── validators.ts
│
├── assets/                       # Static assets
│   ├── images/
│   └── sounds/
│
└── types/                        # TypeScript types (if needed beyond Convex)
    └── index.ts
```

---

## Component Structure

### Standard Component Template

```tsx
// components/lists/ShoppingListCard.tsx

// 1. Imports (grouped: React, External, Internal, Types)
import { View, Text, Pressable, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import Animated, { FadeIn } from "react-native-reanimated";
import * as Haptics from "expo-haptics";

import { AdaptiveGlassView } from "@/components/ui";
import { formatCurrency } from "@/lib/utils";
import type { Doc } from "@/convex/_generated/dataModel";

// 2. Types/Interfaces
interface ShoppingListCardProps {
  list: Doc<"shoppingLists">;
  itemCount: number;
  totalSpent?: number;
  onPress?: () => void;
}

// 3. Component
export function ShoppingListCard({
  list,
  itemCount,
  totalSpent,
  onPress,
}: ShoppingListCardProps) {
  const router = useRouter();

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (onPress) {
      onPress();
    } else {
      router.push(`/list/${list._id}`);
    }
  };

  const budgetProgress = list.budget && totalSpent
    ? (totalSpent / list.budget) * 100
    : 0;

  return (
    <Animated.View entering={FadeIn.duration(300)}>
      <Pressable onPress={handlePress}>
        <AdaptiveGlassView style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.title}>{list.name}</Text>
            <Text style={styles.itemCount}>{itemCount} items</Text>
          </View>

          {list.budget && (
            <View style={styles.budgetSection}>
              <Text style={styles.budgetText}>
                {formatCurrency(totalSpent || 0)} / {formatCurrency(list.budget)}
              </Text>
              <View style={styles.progressBar}>
                <View
                  style={[
                    styles.progressFill,
                    { width: `${Math.min(budgetProgress, 100)}%` },
                    budgetProgress > 90 && styles.progressDanger,
                  ]}
                />
              </View>
            </View>
          )}
        </AdaptiveGlassView>
      </Pressable>
    </Animated.View>
  );
}

// 4. Styles
const styles = StyleSheet.create({
  container: {
    padding: 16,
    marginBottom: 12,
    borderRadius: 16,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  title: {
    fontSize: 18,
    fontWeight: "600",
    color: "#2D3436",
  },
  itemCount: {
    fontSize: 14,
    color: "#636E72",
  },
  budgetSection: {
    marginTop: 12,
  },
  budgetText: {
    fontSize: 14,
    color: "#2D3436",
    marginBottom: 4,
  },
  progressBar: {
    height: 6,
    backgroundColor: "rgba(0,0,0,0.1)",
    borderRadius: 3,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#10B981",
    borderRadius: 3,
  },
  progressDanger: {
    backgroundColor: "#EF4444",
  },
});

// 5. Export (default or named based on convention)
export default ShoppingListCard;
```

---

## Convex Function Conventions

### Query Functions

```typescript
// convex/shoppingLists.ts
import { query } from "./_generated/server";
import { v } from "convex/values";

// Use descriptive names: verb + noun
export const getByUser = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    // Always use indexes for queries
    return await ctx.db
      .query("shoppingLists")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .order("desc")
      .collect();
  },
});

// For single item lookups
export const getById = query({
  args: { id: v.id("shoppingLists") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});
```

### Mutation Functions

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

    // Return the created ID
    return await ctx.db.insert("shoppingLists", {
      ...args,
      status: "active",
      budgetLocked: false,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("shoppingLists"),
    updates: v.object({
      name: v.optional(v.string()),
      budget: v.optional(v.number()),
      status: v.optional(v.string()),
    }),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      ...args.updates,
      updatedAt: Date.now(),
    });
  },
});

export const remove = mutation({
  args: { id: v.id("shoppingLists") },
  handler: async (ctx, args) => {
    // Soft delete or hard delete based on requirements
    await ctx.db.delete(args.id);
  },
});
```

### Action Functions (External APIs)

```typescript
// convex/ai.ts
import { action } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";

export const generateSmartSuggestions = action({
  args: {
    userId: v.id("users"),
    listId: v.id("shoppingLists"),
  },
  handler: async (ctx, args) => {
    // 1. Fetch data using internal queries
    const user = await ctx.runQuery(internal.users.getById, { id: args.userId });
    const pantryItems = await ctx.runQuery(internal.pantryItems.getLowStock, {
      userId: args.userId,
    });

    // 2. Call external API
    const suggestions = await generateSuggestionsFromAI(user, pantryItems);

    // 3. Save results using internal mutation
    await ctx.runMutation(internal.suggestions.save, {
      listId: args.listId,
      suggestions,
    });

    return suggestions;
  },
});
```

---

## Hook Patterns

### Data Fetching Hook

```typescript
// hooks/useShoppingList.ts
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

export function useShoppingList(listId: Id<"shoppingLists">) {
  const list = useQuery(api.shoppingLists.getById, { id: listId });
  const items = useQuery(api.listItems.getByList, { listId });

  const addItem = useMutation(api.listItems.create);
  const updateItem = useMutation(api.listItems.update);
  const removeItem = useMutation(api.listItems.remove);
  const checkItem = useMutation(api.listItems.toggleChecked);

  const isLoading = list === undefined || items === undefined;

  const totals = items?.reduce(
    (acc, item) => ({
      estimated: acc.estimated + (item.estimatedPrice || 0) * item.quantity,
      actual: acc.actual + (item.actualPrice || 0) * item.quantity,
      checked: acc.checked + (item.isChecked ? 1 : 0),
    }),
    { estimated: 0, actual: 0, checked: 0 }
  );

  return {
    list,
    items: items || [],
    isLoading,
    totals,
    addItem,
    updateItem,
    removeItem,
    checkItem,
  };
}
```

### Optimistic Update Hook

```typescript
// hooks/useOptimisticCheckItem.ts
import { useState, useCallback, useMemo } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id, Doc } from "@/convex/_generated/dataModel";

type ListItem = Doc<"listItems">;

export function useOptimisticCheckItem(serverItems: ListItem[]) {
  const [optimisticChecks, setOptimisticChecks] = useState<
    Record<string, boolean>
  >({});

  const checkItemMutation = useMutation(api.listItems.toggleChecked);

  // Merge server state with optimistic state
  const items = useMemo(() => {
    return serverItems.map((item) => ({
      ...item,
      isChecked: optimisticChecks[item._id] ?? item.isChecked,
    }));
  }, [serverItems, optimisticChecks]);

  const checkItem = useCallback(
    async (itemId: Id<"listItems">, isChecked: boolean) => {
      // Optimistic update
      setOptimisticChecks((prev) => ({ ...prev, [itemId]: isChecked }));

      try {
        await checkItemMutation({ id: itemId, isChecked });
        // Clear optimistic state on success (server state will reflect change)
        setOptimisticChecks((prev) => {
          const { [itemId]: _, ...rest } = prev;
          return rest;
        });
      } catch (error) {
        // Revert on failure
        setOptimisticChecks((prev) => {
          const { [itemId]: _, ...rest } = prev;
          return rest;
        });
        throw error;
      }
    },
    [checkItemMutation]
  );

  return { items, checkItem };
}
```

---

## Styling Conventions

### Liquid Glass Components

```typescript
// components/ui/AdaptiveGlassView.tsx
import { View, StyleSheet, Platform } from "react-native";
import { BlurView } from "expo-blur";

interface AdaptiveGlassViewProps {
  children: React.ReactNode;
  style?: any;
  intensity?: number;
}

export function AdaptiveGlassView({
  children,
  style,
  intensity = 50,
}: AdaptiveGlassViewProps) {
  // Use native blur on iOS 26+, fallback for others
  if (Platform.OS === "ios" && parseInt(Platform.Version as string) >= 26) {
    return (
      <BlurView intensity={intensity} style={[styles.glass, style]}>
        {children}
      </BlurView>
    );
  }

  // Fallback with semi-transparent background
  return <View style={[styles.fallback, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  glass: {
    overflow: "hidden",
    borderRadius: 16,
  },
  fallback: {
    backgroundColor: "rgba(255, 255, 255, 0.8)",
    borderRadius: 16,
  },
});
```

### Color Palette

```typescript
// lib/constants/colors.ts
export const colors = {
  // Primary
  primary: "#FF6B35",       // Orange - energy, action
  primaryLight: "#FF8A5C",
  primaryDark: "#E55A2B",

  // Neutral
  background: "#FFFAF8",    // Warm white
  surface: "#FFFFFF",
  border: "#E5E5E5",

  // Text
  textPrimary: "#2D3436",   // Charcoal
  textSecondary: "#636E72",
  textMuted: "#B2BEC3",

  // Semantic
  success: "#10B981",       // Under budget
  warning: "#F59E0B",       // Approaching limit
  danger: "#EF4444",        // Over budget

  // Stock levels
  stockStocked: "#10B981",
  stockGood: "#3B82F6",
  stockLow: "#F59E0B",
  stockOut: "#EF4444",

  // Glass effect
  glassBackground: "rgba(255, 255, 255, 0.7)",
  glassBorder: "rgba(255, 255, 255, 0.3)",
};
```

---

## Error Handling

### Try-Catch Pattern for Mutations

```typescript
const handleAddItem = async () => {
  try {
    await addItem({
      listId,
      name: itemName,
      quantity: 1,
      priority: "should-have",
    });
    setItemName("");
  } catch (error) {
    console.error("Failed to add item:", error);
    Alert.alert("Error", "Failed to add item. Please try again.");
  }
};
```

### Loading States

```typescript
// Always handle loading state
if (list === undefined) {
  return <LoadingScreen message="Loading list..." />;
}

// Handle not found
if (list === null) {
  return <EmptyState title="List not found" />;
}
```

---

## Haptic Feedback Guidelines

```typescript
import * as Haptics from "expo-haptics";

// Light - UI interactions (tap, toggle)
Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

// Medium - Important actions (check item, add to list)
Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

// Heavy - Destructive/major actions (delete, complete list)
Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

// Success - Positive confirmation
Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

// Error - Failed action
Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
```

---

## Import Order

```typescript
// 1. React/React Native
import { useState, useEffect, useMemo } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";

// 2. External libraries
import { useRouter, useLocalSearchParams } from "expo-router";
import Animated, { FadeIn } from "react-native-reanimated";
import * as Haptics from "expo-haptics";

// 3. Convex
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";

// 4. Internal components
import { AdaptiveGlassView, GlassButton } from "@/components/ui";
import { ListItemRow } from "@/components/lists";

// 5. Hooks
import { useCurrentUser } from "@/hooks";

// 6. Utilities
import { formatCurrency, formatDate } from "@/lib/utils";
import { colors } from "@/lib/constants";

// 7. Types (if separate)
import type { Id, Doc } from "@/convex/_generated/dataModel";
```

---

## Testing Conventions

```typescript
// __tests__/components/ShoppingListCard.test.tsx
import { render, fireEvent } from "@testing-library/react-native";
import { ShoppingListCard } from "../ShoppingListCard";

const mockList = {
  _id: "list123" as any,
  name: "Weekly Shop",
  status: "active",
  budget: 5000, // pence
  // ...other fields
};

describe("ShoppingListCard", () => {
  it("renders list name correctly", () => {
    const { getByText } = render(
      <ShoppingListCard list={mockList} itemCount={5} />
    );
    expect(getByText("Weekly Shop")).toBeTruthy();
  });

  it("shows item count", () => {
    const { getByText } = render(
      <ShoppingListCard list={mockList} itemCount={5} />
    );
    expect(getByText("5 items")).toBeTruthy();
  });

  it("calls onPress when tapped", () => {
    const onPress = jest.fn();
    const { getByTestId } = render(
      <ShoppingListCard
        list={mockList}
        itemCount={5}
        onPress={onPress}
        testID="list-card"
      />
    );
    fireEvent.press(getByTestId("list-card"));
    expect(onPress).toHaveBeenCalled();
  });
});
```

---

## Barrel Exports

Every component folder should have an `index.ts`:

```typescript
// components/lists/index.ts
export { ShoppingListCard } from "./ShoppingListCard";
export { ListItemRow } from "./ListItemRow";
export { BudgetRing } from "./BudgetRing";
export { SafeZoneIndicator } from "./SafeZoneIndicator";

// Allow default imports too
export { default as ShoppingListCard } from "./ShoppingListCard";
```

---

*Follow these conventions for consistent, maintainable code across the Oja codebase.*
