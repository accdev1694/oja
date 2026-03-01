# List Templates - Create New Lists from History

## Overview
Allow users to reuse completed/archived shopping lists as templates for new trips. This solves the common use case where users repeatedly buy the same items (weekly groceries, monthly stock-ups, recurring events).

## Problem
Users complete shopping trips and want to:
1. Start a fresh trip with the same items
2. Combine multiple past lists into one new list
3. Avoid manually re-adding items they buy regularly

Currently, there's no way to reuse old lists - users must create from scratch every time.

---

## Solution: Hybrid Approach (Swipe + Multi-Select)

### Phase 1: Single-List Template (Swipe Action) 🎯 START HERE
**Use Case:** "I want to recreate my Weekly Groceries list from last week"

**UX Flow:**
1. User goes to **History tab** in Lists screen
2. Swipes left on any history card
3. "Use as Template" action appears (green background)
4. Taps action → Modal opens with preview
5. User confirms → New active list created with all items

**Covers:** 80% of use cases with minimal complexity

---

### Phase 2: Multi-List Combination (Selection Mode) 🚀 FUTURE
**Use Case:** "I want to combine my Weekly Groceries + Dinner Party lists into one trip"

**UX Flow:**
1. User taps "Select" button in History tab header
2. Checkboxes appear on all history cards
3. User selects 2+ lists
4. Bottom sheet appears: "Create New List from 2 Selected"
5. Taps action → Preview modal shows merged items with deduplication
6. User confirms → New list created

**Covers:** Power users who frequently combine lists

---

## Files to Create/Modify

### Backend (Convex)

| File | Changes | New/Modified |
|------|---------|--------------|
| `convex/shoppingLists.ts` | Add `createFromTemplate` mutation | Modified |
| `convex/shoppingLists.ts` | Add `previewCombinedLists` query | Modified |
| `convex/lib/itemDeduplicator.ts` | **NEW** - Smart item deduplication logic | New |

### Frontend (React Native)

| File | Changes | New/Modified |
|------|---------|--------------|
| `components/lists/HistoryCard.tsx` | Add swipe gesture support | Modified |
| `components/lists/CreateFromTemplateModal.tsx` | **NEW** - Template preview & confirm UI | New |
| `components/lists/CombineListsModal.tsx` | **NEW** - Multi-list merge preview (Phase 2) | New |
| `app/(app)/(tabs)/index.tsx` | Add swipe handler & modal state | Modified |
| `app/(app)/(tabs)/index.tsx` | Add multi-select mode (Phase 2) | Modified |

---

## Phase 1 Implementation Plan

### Step 1: Backend - Create From Template Mutation

**File:** `convex/shoppingLists.ts`

**New Mutation:**
```typescript
export const createFromTemplate = mutation({
  args: {
    sourceListId: v.id("shoppingLists"),
    newListName: v.string(),
    newBudget: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await requireCurrentUser(ctx);

    // 1. Verify source list exists and belongs to user
    const sourceList = await ctx.db.get(args.sourceListId);
    if (!sourceList || sourceList.userId !== user._id) {
      throw new Error("List not found or unauthorized");
    }

    // 2. Get all items from source list
    const sourceItems = await ctx.db
      .query("listItems")
      .withIndex("by_list", (q) => q.eq("listId", args.sourceListId))
      .collect();

    // 3. Create new active list
    const now = Date.now();
    const newListId = await ctx.db.insert("shoppingLists", {
      userId: user._id,
      name: args.newListName,
      budget: args.newBudget ?? sourceList.budget ?? 50,
      status: "active",
      normalizedStoreId: sourceList.normalizedStoreId,
      storeName: sourceList.storeName,
      createdAt: now,
      updatedAt: now,
    });

    // 4. Copy all items to new list (unchecked)
    for (const item of sourceItems) {
      await ctx.db.insert("listItems", {
        listId: newListId,
        name: item.name,
        category: item.category,
        quantity: item.quantity,
        size: item.size,
        estimatedPrice: item.estimatedPrice,
        priceSource: item.priceSource,
        priceConfidence: item.priceConfidence,
        isChecked: false, // Important: start fresh
        priority: item.priority,
        createdAt: now,
        updatedAt: now,
      });
    }

    return {
      listId: newListId,
      itemCount: sourceItems.length,
    };
  },
});
```

**Query for Preview:**
```typescript
export const getTemplatePreview = query({
  args: { listId: v.id("shoppingLists") },
  handler: async (ctx, args) => {
    const user = await requireCurrentUser(ctx);

    const list = await ctx.db.get(args.listId);
    if (!list || list.userId !== user._id) {
      return null;
    }

    const items = await ctx.db
      .query("listItems")
      .withIndex("by_list", (q) => q.eq("listId", args.listId))
      .collect();

    const totalEstimated = items.reduce((sum, item) =>
      sum + (item.estimatedPrice || 0) * item.quantity, 0
    );

    return {
      list: {
        _id: list._id,
        name: list.name,
        budget: list.budget,
        storeName: list.storeName,
        completedAt: list.completedAt,
        createdAt: list.createdAt,
      },
      itemCount: items.length,
      totalEstimated,
      itemsByCategory: groupByCategory(items),
    };
  },
});

function groupByCategory(items: any[]) {
  const grouped = new Map<string, number>();
  for (const item of items) {
    const cat = item.category || "Uncategorized";
    grouped.set(cat, (grouped.get(cat) || 0) + 1);
  }
  return Array.from(grouped.entries()).map(([category, count]) => ({
    category,
    count,
  }));
}
```

---

### Step 2: Frontend - Add Swipe Gesture to HistoryCard

**File:** `components/lists/HistoryCard.tsx`

**Add Dependencies:**
```typescript
import { Swipeable } from "react-native-gesture-handler";
```

**Wrap Card with Swipeable:**
```typescript
interface HistoryCardProps {
  // ... existing props
  onUseAsTemplate: (id: Id<"shoppingLists">, name: string) => void;
}

export const HistoryCard = React.memo(function HistoryCard({
  list,
  onPress,
  formatDateTime,
  onUseAsTemplate, // NEW
}: HistoryCardProps) {

  const renderRightActions = useCallback(() => {
    return (
      <View style={styles.swipeAction}>
        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            onUseAsTemplate(list._id, list.name);
          }}
          style={styles.swipeButton}
        >
          <MaterialCommunityIcons
            name="content-copy"
            size={20}
            color="#fff"
          />
          <Text style={styles.swipeText}>Use as Template</Text>
        </Pressable>
      </View>
    );
  }, [list._id, list.name, onUseAsTemplate]);

  return (
    <Swipeable
      renderRightActions={renderRightActions}
      overshootRight={false}
      friction={2}
    >
      <Animated.View style={animatedStyle}>
        {/* ... existing card content */}
      </Animated.View>
    </Swipeable>
  );
});
```

**Add Styles:**
```typescript
swipeAction: {
  backgroundColor: colors.semantic.success,
  justifyContent: "center",
  alignItems: "center",
  width: 120,
  borderRadius: borderRadius.lg,
  marginBottom: spacing.md,
},
swipeButton: {
  flex: 1,
  justifyContent: "center",
  alignItems: "center",
  paddingHorizontal: spacing.md,
},
swipeText: {
  ...typography.labelSmall,
  color: "#fff",
  fontWeight: "600",
  marginTop: spacing.xs,
  textAlign: "center",
},
```

---

### Step 3: Create Template Preview Modal

**File:** `components/lists/CreateFromTemplateModal.tsx` (NEW)

```typescript
import React, { useState } from "react";
import { View, Text, StyleSheet, TextInput, ScrollView } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import {
  GlassModal,
  GlassButton,
  GlassInput,
  colors,
  typography,
  spacing,
} from "@/components/ui/glass";

interface CreateFromTemplateModalProps {
  visible: boolean;
  sourceListId: Id<"shoppingLists"> | null;
  sourceListName: string;
  onClose: () => void;
  onConfirm: (newName: string, budget?: number) => Promise<void>;
}

export function CreateFromTemplateModal({
  visible,
  sourceListId,
  sourceListName,
  onClose,
  onConfirm,
}: CreateFromTemplateModalProps) {
  const [newName, setNewName] = useState(`${sourceListName} (Copy)`);
  const [isCreating, setIsCreating] = useState(false);

  const preview = useQuery(
    api.shoppingLists.getTemplatePreview,
    sourceListId ? { listId: sourceListId } : "skip"
  );

  const handleCreate = async () => {
    if (!newName.trim()) return;

    setIsCreating(true);
    try {
      await onConfirm(newName.trim());
      onClose();
    } finally {
      setIsCreating(false);
    }
  };

  if (!preview) {
    return null;
  }

  return (
    <GlassModal visible={visible} onClose={onClose} title="Create from Template">
      <ScrollView style={styles.content}>
        {/* Source list info */}
        <View style={styles.sourceInfo}>
          <MaterialCommunityIcons
            name="clipboard-check"
            size={20}
            color={colors.text.tertiary}
          />
          <Text style={styles.sourceText}>
            From: {sourceListName}
          </Text>
        </View>

        {/* Stats */}
        <View style={styles.stats}>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{preview.itemCount}</Text>
            <Text style={styles.statLabel}>Items</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statValue}>
              £{preview.totalEstimated.toFixed(2)}
            </Text>
            <Text style={styles.statLabel}>Estimated</Text>
          </View>
          {preview.list.storeName && (
            <View style={styles.stat}>
              <MaterialCommunityIcons
                name="store"
                size={16}
                color={colors.text.tertiary}
              />
              <Text style={styles.statLabel}>{preview.list.storeName}</Text>
            </View>
          )}
        </View>

        {/* Category breakdown */}
        <View style={styles.categories}>
          <Text style={styles.sectionTitle}>Categories</Text>
          {preview.itemsByCategory.map(({ category, count }) => (
            <View key={category} style={styles.categoryRow}>
              <Text style={styles.categoryName}>{category}</Text>
              <Text style={styles.categoryCount}>{count} items</Text>
            </View>
          ))}
        </View>

        {/* New list name input */}
        <View style={styles.inputSection}>
          <Text style={styles.inputLabel}>New List Name</Text>
          <GlassInput
            value={newName}
            onChangeText={setNewName}
            placeholder="Enter list name"
            autoFocus
          />
        </View>
      </ScrollView>

      {/* Actions */}
      <View style={styles.actions}>
        <GlassButton
          variant="secondary"
          onPress={onClose}
          style={styles.actionButton}
          disabled={isCreating}
        >
          Cancel
        </GlassButton>
        <GlassButton
          variant="primary"
          onPress={handleCreate}
          style={styles.actionButton}
          disabled={!newName.trim() || isCreating}
          loading={isCreating}
        >
          Create List
        </GlassButton>
      </View>
    </GlassModal>
  );
}

const styles = StyleSheet.create({
  content: {
    maxHeight: 500,
  },
  sourceInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: spacing.lg,
    padding: spacing.md,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderRadius: 8,
  },
  sourceText: {
    ...typography.bodyMedium,
    color: colors.text.secondary,
  },
  stats: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: spacing.lg,
    padding: spacing.md,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderRadius: 8,
  },
  stat: {
    alignItems: "center",
    gap: spacing.xs,
  },
  statValue: {
    ...typography.headlineSmall,
    color: colors.accent.primary,
    fontWeight: "700",
  },
  statLabel: {
    ...typography.bodySmall,
    color: colors.text.tertiary,
  },
  categories: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    ...typography.labelMedium,
    color: colors.text.secondary,
    marginBottom: spacing.sm,
  },
  categoryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.1)",
  },
  categoryName: {
    ...typography.bodyMedium,
    color: colors.text.primary,
  },
  categoryCount: {
    ...typography.bodySmall,
    color: colors.text.tertiary,
  },
  inputSection: {
    marginBottom: spacing.lg,
  },
  inputLabel: {
    ...typography.labelMedium,
    color: colors.text.secondary,
    marginBottom: spacing.sm,
  },
  actions: {
    flexDirection: "row",
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  actionButton: {
    flex: 1,
  },
});
```

---

### Step 4: Integrate into Lists Screen

**File:** `app/(app)/(tabs)/index.tsx`

**Add State:**
```typescript
const [showTemplateModal, setShowTemplateModal] = useState(false);
const [selectedTemplateId, setSelectedTemplateId] = useState<Id<"shoppingLists"> | null>(null);
const [selectedTemplateName, setSelectedTemplateName] = useState("");
```

**Add Mutation:**
```typescript
const createFromTemplate = useMutation(api.shoppingLists.createFromTemplate);
```

**Add Handler:**
```typescript
const handleUseAsTemplate = useCallback((listId: Id<"shoppingLists">, listName: string) => {
  setSelectedTemplateId(listId);
  setSelectedTemplateName(listName);
  setShowTemplateModal(true);
}, []);

const handleConfirmTemplate = useCallback(async (newName: string) => {
  if (!selectedTemplateId) return;

  try {
    const result = await createFromTemplate({
      sourceListId: selectedTemplateId,
      newListName: newName,
    });

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    // Navigate to new list
    router.push(`/list/${result.listId}`);
  } catch (error) {
    console.error("Failed to create from template:", error);
    alert("Error", "Failed to create list from template");
  }
}, [selectedTemplateId, createFromTemplate, router]);
```

**Update HistoryCard Usage:**
```typescript
<HistoryCard
  list={list}
  onPress={handleHistoryPress}
  formatDateTime={stableFormatDateTime}
  onUseAsTemplate={handleUseAsTemplate} // NEW
/>
```

**Add Modal:**
```typescript
{/* Template Modal */}
<CreateFromTemplateModal
  visible={showTemplateModal}
  sourceListId={selectedTemplateId}
  sourceListName={selectedTemplateName}
  onClose={() => setShowTemplateModal(false)}
  onConfirm={handleConfirmTemplate}
/>
```

---

## Phase 2 Implementation Plan (Multi-List Combination)

### Step 1: Item Deduplication Logic

**File:** `convex/lib/itemDeduplicator.ts` (NEW)

```typescript
import { matchReceiptItems } from "./itemMatcher";

interface ListItem {
  name: string;
  category?: string;
  quantity: number;
  size?: string;
  estimatedPrice?: number;
}

interface DeduplicationResult {
  items: ListItem[];
  duplicates: Array<{
    name: string;
    sources: string[];
    keptFrom: string;
    reason: string;
  }>;
}

export async function deduplicateItems(
  ctx: any,
  itemsByList: Map<string, { listName: string; items: ListItem[] }>,
  storeId?: string
): Promise<DeduplicationResult> {
  const allItems: ListItem[] = [];
  const itemSources = new Map<string, string[]>(); // item key -> list names

  // Collect all items with source tracking
  for (const [listName, { items }] of itemsByList.entries()) {
    for (const item of items) {
      allItems.push({ ...item, _sourcelist: listName });
      const key = item.name.toLowerCase().trim();
      if (!itemSources.has(key)) {
        itemSources.set(key, []);
      }
      itemSources.get(key)!.push(listName);
    }
  }

  // Use item matcher to find duplicates
  const uniqueItems: ListItem[] = [];
  const duplicates: DeduplicationResult["duplicates"] = [];
  const processed = new Set<string>();

  for (let i = 0; i < allItems.length; i++) {
    const item = allItems[i];
    const key = item.name.toLowerCase().trim();

    if (processed.has(key)) continue;

    // Find all items that match this one
    const matches = allItems.filter((other, j) => {
      if (i === j || processed.has(other.name.toLowerCase().trim())) return false;

      // Use fuzzy matching
      const score = calculateMatchScore(item, other);
      return score > 0.7; // 70% similarity threshold
    });

    if (matches.length === 0) {
      // No duplicates, keep as-is
      uniqueItems.push(item);
      processed.add(key);
    } else {
      // Duplicates found - merge intelligently
      const merged = mergeItems([item, ...matches]);
      uniqueItems.push(merged.item);

      duplicates.push({
        name: merged.item.name,
        sources: itemSources.get(key) || [],
        keptFrom: merged.keptFrom,
        reason: merged.reason,
      });

      // Mark all as processed
      processed.add(key);
      matches.forEach(m => processed.add(m.name.toLowerCase().trim()));
    }
  }

  return {
    items: uniqueItems,
    duplicates,
  };
}

function mergeItems(items: any[]): { item: ListItem; keptFrom: string; reason: string } {
  // Strategy: Keep highest quantity, best price, most complete info
  let best = items[0];
  let reason = "first occurrence";

  for (const item of items) {
    if (item.quantity > best.quantity) {
      best = item;
      reason = `higher quantity (${item.quantity} vs ${best.quantity})`;
    } else if (item.estimatedPrice && (!best.estimatedPrice || item.estimatedPrice < best.estimatedPrice)) {
      best = item;
      reason = `better price (£${item.estimatedPrice} vs £${best.estimatedPrice || 0})`;
    }
  }

  return {
    item: best,
    keptFrom: best._sourcelist,
    reason,
  };
}

function calculateMatchScore(a: ListItem, b: ListItem): number {
  // Use same logic as itemMatcher.ts
  // For simplicity, just do token overlap here
  const tokensA = a.name.toLowerCase().split(/\s+/);
  const tokensB = b.name.toLowerCase().split(/\s+/);

  const intersection = tokensA.filter(t => tokensB.includes(t)).length;
  const union = new Set([...tokensA, ...tokensB]).size;

  return intersection / union;
}
```

---

### Step 2: Backend Mutation for Multi-List

**File:** `convex/shoppingLists.ts`

```typescript
export const createFromMultipleLists = mutation({
  args: {
    sourceListIds: v.array(v.id("shoppingLists")),
    newListName: v.string(),
    newBudget: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await requireCurrentUser(ctx);

    // Collect items from all lists
    const itemsByList = new Map();
    let totalBudget = 0;

    for (const listId of args.sourceListIds) {
      const list = await ctx.db.get(listId);
      if (!list || list.userId !== user._id) continue;

      const items = await ctx.db
        .query("listItems")
        .withIndex("by_list", (q) => q.eq("listId", listId))
        .collect();

      itemsByList.set(listId, {
        listName: list.name,
        items: items.map(i => ({
          name: i.name,
          category: i.category,
          quantity: i.quantity,
          size: i.size,
          estimatedPrice: i.estimatedPrice,
        })),
      });

      totalBudget += list.budget || 0;
    }

    // Deduplicate
    const { items: uniqueItems, duplicates } = await deduplicateItems(
      ctx,
      itemsByList
    );

    // Create new list
    const now = Date.now();
    const newListId = await ctx.db.insert("shoppingLists", {
      userId: user._id,
      name: args.newListName,
      budget: args.newBudget ?? totalBudget,
      status: "active",
      createdAt: now,
      updatedAt: now,
    });

    // Add merged items
    for (const item of uniqueItems) {
      await ctx.db.insert("listItems", {
        listId: newListId,
        name: item.name,
        category: item.category,
        quantity: item.quantity,
        size: item.size,
        estimatedPrice: item.estimatedPrice,
        isChecked: false,
        createdAt: now,
        updatedAt: now,
      });
    }

    return {
      listId: newListId,
      itemCount: uniqueItems.length,
      duplicatesFound: duplicates.length,
      duplicates,
    };
  },
});
```

---

## Testing Checklist

### Phase 1: Single-List Template
- [ ] Swipe left on history card reveals "Use as Template" action
- [ ] Tapping action opens modal with correct preview data
- [ ] Modal shows item count, estimated total, categories
- [ ] Can edit new list name in modal
- [ ] Creating template navigates to new list
- [ ] New list has all items from source (unchecked)
- [ ] New list has same budget and store as source
- [ ] Original list remains unchanged in history

### Phase 2: Multi-List Combination
- [ ] "Select" button appears in History tab header
- [ ] Tapping "Select" enables multi-select mode
- [ ] Can select/deselect multiple lists with checkboxes
- [ ] Bottom sheet shows "X lists selected"
- [ ] Tapping "Create New List" opens combine modal
- [ ] Modal previews all items and shows duplicates
- [ ] Deduplication keeps highest quantity when duplicates found
- [ ] Can edit new list name and budget
- [ ] Creating combined list works correctly
- [ ] Duplicates are removed intelligently

---

## Edge Cases

1. **Empty list template** - Should warn user "This list has no items"
2. **Very large lists** - Show loading state while copying 100+ items
3. **List limit reached (free tier)** - Show upgrade prompt
4. **Template from shared list** - Only owner can create template, or allow partners?
5. **Deleted items in template** - Skip archived items when copying
6. **Price staleness** - Show "Prices from X days ago" warning if old
7. **Store mismatch when combining** - Prompt user to select store for combined list

---

## Success Metrics

Track in analytics:
- **Template creation rate** - % of history items used as templates
- **Multi-list combination rate** - % of templates using multiple sources
- **Template retention** - Do templated lists get completed more often?
- **Time saved** - Compare list creation time (template vs manual)

---

## Status: 📋 READY FOR PHASE 1 IMPLEMENTATION

Start with Phase 1 (swipe action) - solves 80% of use cases with minimal complexity. Phase 2 can be added later based on user feedback.
