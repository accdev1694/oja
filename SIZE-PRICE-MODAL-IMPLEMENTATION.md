# Size/Price Modal Implementation Plan

> **Status:** In Progress
> **Created:** 2026-02-10
> **Approved by:** Diloc
> **Deliberated in:** BMAD Party Mode Session

---

## IMPORTANT: Multi-Agent Execution Strategy

**This implementation should use parallel sub-agents to preserve context window.**

When implementing, spawn multiple agents for independent work streams:

```
Main Agent (Orchestrator)
├── Agent 1: Schema & Database (Phase 1.1-1.4)
├── Agent 2: Size Utilities (Phase 1.5-1.8)
├── Agent 3: UI Components (Phase 2.1-2.3, 3.1-3.2)
├── Agent 4: Convex Queries/Mutations (Phase 2.4-2.7, 3.3-3.4)
├── Agent 5: Store Comparison (Phase 4)
├── Agent 6: Store Switch Logic (Phase 5)
└── Agent 7: Voice Integration (Phase 6)
```

**Execution Pattern:**
1. Main agent reads this file and understands full context
2. Main agent spawns sub-agents with specific phase instructions
3. Sub-agents report completion back to main agent
4. Main agent checks off completed items in this file
5. Main agent coordinates dependencies between phases

---

## Overview

Implement a mandatory size/price selection modal that appears before any item is added to a shopping list. This ensures every list item has complete price intelligence with size, price, and store data.

---

## Decision Rationale (Why We Made These Choices)

### Why Store Selection at List Level (Not Per-Item)?

**Problem with per-item store selection:**
- User picks store for milk, then different store for bread = cognitive overload
- Forces 15+ micro-decisions per shopping list
- Users already know which store they're going to

**Solution:** Store is selected ONCE when creating the list. All items inherit this store context.

### Why "Compare After, Not During"?

**Problem with per-item price hints:**
- "Psst: This is cheaper at Asda" on every item → decision fatigue
- If user switches store mid-list → ALL items need re-pricing (cascade nightmare)
- Breaks flow of adding items

**Solution:** User adds all items focused on SIZE only. After list complete, show one comparison: "Same list at Asda: £43 (save £4)". User can switch stores as a single batch operation.

### Why Auto-Match Closest Size on Store Switch?

**Problem:** User picked "250g butter" at Tesco. Asda only has 227g and 500g.

**Solution:** Auto-match to closest size (227g, which is within 10% of 250g). Show "was 250g" indicator. User can manually edit if needed.

### Why Users Can Always Edit Size/Price?

**Principle:** System makes smart defaults, user has final control. Manual overrides are respected on future store switches.

---

## Wireframes

### 1. List Creation (Add Store Selection)

```
┌─────────────────────────────────────────┐
│  Create New List                        │
├─────────────────────────────────────────┤
│                                         │
│  List name:                             │
│  ┌─────────────────────────────────┐   │
│  │ Weekly Shop                      │   │
│  └─────────────────────────────────┘   │
│                                         │
│  Budget (optional):                     │
│  ┌─────────────────────────────────┐   │
│  │ £ 50.00                          │   │
│  └─────────────────────────────────┘   │
│                                         │
│  Where are you shopping?                │
│  ┌────────┐ ┌────────┐ ┌────────┐     │
│  │ Tesco  │ │  Asda  │ │  Aldi  │ ... │
│  │   ✓    │ │        │ │        │     │
│  └────────┘ └────────┘ └────────┘     │
│  (Shows user's preferred stores from    │
│   onboarding, sorted by their usage)    │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │         Create List             │   │
│  └─────────────────────────────────┘   │
│                                         │
└─────────────────────────────────────────┘
```

### 2. Size/Price Modal (Bottom Sheet)

```
┌─────────────────────────────────────────┐
│  🥛 Adding: Milk                        │
│  ─────────────────────────────────────  │
│                                         │
│  TESCO prices:                          │
│                                         │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐  │
│  │  1 pt   │ │  2 pt   │ │  4 pt   │  │
│  │  £0.85  │ │  £1.45  │ │  £2.75  │  │
│  │ £0.85/pt│ │£0.73/pt⭐│ │ £0.69/pt│  │
│  └─────────┘ └────✓────┘ └─────────┘  │
│                                         │
│  ⭐ = Best value (lowest price/unit)    │
│  ✓  = Your usual (from purchase history)│
│                                         │
│  ┌─────────────────────────────────┐   │
│  │  Cancel  │      Add £1.45       │   │
│  └─────────────────────────────────┘   │
│                                         │
└─────────────────────────────────────────┘
```

### 3. Edit Item Modal

```
┌─────────────────────────────────────────┐
│  ✏️ Edit: Butter                        │
├─────────────────────────────────────────┤
│                                         │
│  Size:                                  │
│  ○ 227g    ● 250g    ○ 500g    ○ Custom │
│                                         │
│  Price:                                 │
│  ┌─────────────────────────────────┐   │
│  │ £ 2.50                           │   │
│  └─────────────────────────────────┘   │
│  (Editing price marks as manual override)│
│                                         │
│  Quantity:                              │
│  ┌───┐                                  │
│  │ 1 │  [-]  [+]                        │
│  └───┘                                  │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │  Cancel  │    Save Changes      │   │
│  └─────────────────────────────────┘   │
│                                         │
└─────────────────────────────────────────┘
```

### 4. List Comparison Summary

```
┌─────────────────────────────────────────┐
│  📊 Your List Summary                   │
├─────────────────────────────────────────┤
│                                         │
│  Current: Tesco                         │
│  Total: £47.50                          │
│                                         │
│  ┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄  │
│  💡 Same items at other stores:         │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │ Asda     £43.20    Save £4.30 ⭐│   │
│  │          [Switch to Asda]       │   │
│  └─────────────────────────────────┘   │
│  ┌─────────────────────────────────┐   │
│  │ Aldi     £41.85    Save £5.65  │   │
│  │          [Switch to Aldi]       │   │
│  └─────────────────────────────────┘   │
│                                         │
│  12/15 items compared                   │
│  (3 items have no price data elsewhere) │
│                                         │
└─────────────────────────────────────────┘
```

### 5. Store Switch Preview

```
┌─────────────────────────────────────────┐
│  🔄 Switch to Asda?                     │
├─────────────────────────────────────────┤
│                                         │
│  ✓ Milk (2pt)          £1.45 → £1.35   │
│  ✓ Bread (800g)        £1.20 → £1.15   │
│  ✓ Eggs (6pk)          £2.10 → £1.95   │
│  ⚡ Butter (250g→227g)  £2.50 → £2.35   │
│     └─ Closest size auto-matched        │
│  ✓ Cheese (400g)       £3.50 → £3.25   │
│  ⏸ Jam (manual price)  £2.00 → £2.00   │
│     └─ Your price kept (manual override)│
│                                         │
│  ─────────────────────────────────────  │
│  Tesco Total:    £47.50                 │
│  Asda Total:     £43.20                 │
│  You Save:       £4.30 ✨               │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │  Cancel  │   Switch to Asda     │   │
│  └─────────────────────────────────┘   │
│                                         │
└─────────────────────────────────────────┘
```

---

## Current Schema State (Before Changes)

### shoppingLists (relevant fields)
```typescript
shoppingLists: defineTable({
  userId: v.id("users"),
  name: v.string(),
  status: v.union(v.literal("active"), v.literal("shopping"), v.literal("completed"), v.literal("archived")),
  budget: v.optional(v.number()),
  storeName: v.optional(v.string()),           // ← Display name only
  normalizedStoreId: v.optional(v.string()),   // ← Already exists! Use this
  // ... other fields
})
```

### listItems (relevant fields)
```typescript
listItems: defineTable({
  listId: v.id("shoppingLists"),
  userId: v.id("users"),
  pantryItemId: v.optional(v.id("pantryItems")),
  name: v.string(),
  category: v.optional(v.string()),
  quantity: v.number(),
  size: v.optional(v.string()),           // ← Already exists
  unit: v.optional(v.string()),           // ← Already exists
  estimatedPrice: v.optional(v.number()), // ← Already exists
  actualPrice: v.optional(v.number()),
  priority: v.union(...),
  isChecked: v.boolean(),
  // ... other fields
})
```

### users.storePreferences (already exists)
```typescript
storePreferences: v.optional(v.object({
  favorites: v.array(v.string()),      // ["tesco", "aldi", "lidl"]
  defaultStore: v.optional(v.string()), // "tesco"
})),
```

---

## Schema Changes Required

### shoppingLists - No changes needed!
The `normalizedStoreId` field already exists. Just make it required for new lists.

### listItems - Add tracking fields
```typescript
listItems: defineTable({
  // ... existing fields ...

  // NEW: Track size/price source and overrides
  originalSize: v.optional(v.string()),       // Size before auto-match on store switch
  priceOverride: v.optional(v.boolean()),     // User manually edited price
  sizeOverride: v.optional(v.boolean()),      // User manually edited size
  priceSource: v.optional(v.union(
    v.literal("personal"),      // From user's own receipts
    v.literal("crowdsourced"),  // From other users' receipts
    v.literal("ai"),            // AI estimate
    v.literal("manual")         // User typed it
  )),
  priceConfidence: v.optional(v.number()),    // 0-1 confidence score
})
```

---

## API Response Types

### getSizesForStore Response
```typescript
interface SizesForStoreResponse {
  itemName: string;
  store: string;
  sizes: Array<{
    size: string;              // "2pt", "500ml"
    sizeNormalized: string;    // "2pt", "500ml" (abbreviated)
    price: number;             // 1.45
    pricePerUnit: number;      // 0.73
    unitLabel: string;         // "/pt", "/100ml"
    source: "personal" | "crowdsourced" | "ai";
    confidence: number;        // 0.0-1.0
    isUsual: boolean;          // User's typical purchase
  }>;
  defaultSize: string;         // Pre-selected size
}
```

### compareListAcrossStores Response
```typescript
interface ListComparisonResponse {
  currentStore: string;
  currentTotal: number;
  alternatives: Array<{
    store: string;
    storeDisplayName: string;
    storeColor: string;
    total: number;
    savings: number;
    itemsCompared: number;
    itemsWithIssues: number;   // Size mismatches, missing items
  }>;
}
```

### switchStore Mutation Args & Response
```typescript
// Args
interface SwitchStoreArgs {
  listId: Id<"shoppingLists">;
  newStore: string;  // UKStoreId
}

// Response
interface SwitchStoreResponse {
  success: boolean;
  previousStore: string;
  newStore: string;
  itemsUpdated: number;
  sizeChanges: Array<{
    itemId: Id<"listItems">;
    itemName: string;
    oldSize: string;
    newSize: string;
  }>;
  priceChanges: Array<{
    itemId: Id<"listItems">;
    itemName: string;
    oldPrice: number;
    newPrice: number;
  }>;
  manualOverridesPreserved: number;
  newTotal: number;
  savings: number;
}
```

---

## Size Conversion Reference Table

```typescript
// lib/sizes/sizeNormalizer.ts

const UNIT_CONVERSIONS = {
  // Volume (normalize to ml)
  pt: 568,        // 1 pint = 568ml
  pint: 568,
  pints: 568,
  L: 1000,        // 1 litre = 1000ml
  l: 1000,
  litre: 1000,
  liter: 1000,
  litres: 1000,
  liters: 1000,
  ml: 1,
  millilitre: 1,
  milliliter: 1,

  // Weight (normalize to grams)
  kg: 1000,       // 1 kg = 1000g
  kilogram: 1000,
  kilograms: 1000,
  g: 1,
  gram: 1,
  grams: 1,
  oz: 28.35,      // 1 oz = 28.35g
  ounce: 28.35,
  ounces: 28.35,
  lb: 453.6,      // 1 lb = 453.6g
  pound: 453.6,
  pounds: 453.6,

  // Count (normalize to 1)
  pk: 1,
  pack: 1,
  packs: 1,
  each: 1,
  ea: 1,
};

// Common size aliases (different names, same volume/weight)
const SIZE_ALIASES = {
  "2pt": ["2 pints", "2pint", "2 pint", "1.136L", "1136ml"],
  "4pt": ["4 pints", "4pint", "4 pint", "2.272L", "2272ml"],
  "1L": ["1 litre", "1 liter", "1000ml", "1.76pt"],
  "500ml": ["0.5L", "half litre"],
  "250g": ["0.25kg"],
  "500g": ["0.5kg", "half kilo"],
};
```

---

## Existing Code to Reuse

### VariantPicker Component (components/items/VariantPicker.tsx)
- Already handles size chip display with prices
- Has loading skeleton, empty state
- Shows "Your usual" badge
- Shows price-per-unit
- Shows AI indicator for estimates
- **Reuse:** Wrap in a modal, add store context

### Voice Tool: add_items_to_list (convex/lib/voiceTools.ts)
```typescript
// Current implementation (lines 254-284, 1018-1101)
{
  name: "add_items_to_list",
  parameters: {
    items: [{
      name: string,
      quantity: number,
      unit: string  // ← Already accepts unit
    }]
  }
}
// Need to add: size parameter, use list's store for price lookup
```

### Store Normalizer (convex/lib/storeNormalizer.ts)
- 20 UK stores with colors, types, aliases
- `normalizeStoreName()` - converts "Tesco Express" → "tesco"
- `getStoreInfo()` - returns display name, color, type
- `getAllStores()` - for store selection UI
- **Fully reusable as-is**

### User Store Preferences (convex/stores.ts)
- `getUserPreferences()` - returns user's favorite stores
- Already integrated with onboarding
- **Fully reusable as-is**

---

## Implementation Phases

### Phase 1: Foundation (Database + Utilities) ✅

- [x] **1.1** Update `listItems` schema - add `originalSize`, `priceOverride`, `sizeOverride`, `priceSource`, `priceConfidence`
- [x] **1.2** Update `shoppingLists.create` mutation - require `normalizedStoreId`
- [x] **1.3** Update list creation UI to show store selector
- [x] **1.4** Migration: existing lists without store get user's default store
- [x] **1.5** Create `lib/sizes/sizeNormalizer.ts` - parse "2pt" → {value: 2, unit: "pt", normalizedMl: 1136}
- [x] **1.6** Create `lib/sizes/sizeMatching.ts` - find closest size within 20% tolerance
- [x] **1.7** Unit tests for sizeNormalizer (pint/litre/ml conversions)
- [x] **1.8** Unit tests for sizeMatching (exact, close, no match scenarios)

### Phase 2: Add Item Flow ✅

- [x] **2.1** Create `components/lists/SizePriceModal.tsx` - bottom sheet with size chips
- [x] **2.2** Create `components/lists/SizeOptionCard.tsx` - individual size card component
- [x] **2.3** Style with Glass UI tokens, add haptic feedback
- [x] **2.4** Create `convex/itemVariants.ts` - `getSizesForStore` query
- [x] **2.5** Implement price cascade: personal → crowdsourced → AI
- [x] **2.6** Integrate modal into `app/(app)/list/[id].tsx` add-item flow
- [x] **2.7** Update `listItems.create` mutation - require size, price, store
- [x] **2.8** Handle "no variants found" - show manual size/price input

### Phase 3: Edit Flow ✅

- [x] **3.1** Create `components/lists/EditItemModal.tsx`
- [x] **3.2** Add edit button to list item rows
- [x] **3.3** Create `listItems.updateItem` mutation with override tracking
- [x] **3.4** List total recalculation on edit
- [x] **3.5** Show "was X" indicator for changed sizes
- [x] **3.6** Visual indicator for manual price overrides

### Phase 4: Store Comparison ✅

- [x] **4.1** Create `shoppingLists.compareListAcrossStores` query
- [x] **4.2** Implement total calculation per store with size matching
- [x] **4.3** Create `components/lists/ListComparisonSummary.tsx`
- [x] **4.4** Integrate into list view (show after 3+ items)
- [x] **4.5** Add "Compare Prices" button/section

### Phase 5: Store Switch ✅

- [x] **5.1** Create `components/lists/StoreSwitchPreview.tsx`
- [x] **5.2** Create `shoppingLists.switchStore` mutation
- [x] **5.3** Implement closest-size matching in switch
- [x] **5.4** Preserve user overrides (`priceOverride`, `sizeOverride`)
- [x] **5.5** Handle items with no data at new store
- [x] **5.6** Handle custom/manual items (keep price)
- [x] **5.7** Handle switch back to original store
- [x] **5.8** Recalculate list totals after switch

### Phase 6: Voice Integration

- [ ] **6.1** Update `add_items_to_list` voice tool - add size parameter
- [ ] **6.2** Implement smart default size selection (history → common → middle)
- [ ] **6.3** Voice feedback: "Added 2 pints of milk at £1.45"
- [ ] **6.4** Add "change size of [item]" voice command
- [ ] **6.5** Add "edit last item" voice command
- [ ] **6.6** Update voice assistant prompts

### Phase 7: Testing

- [ ] **7.1** Unit tests: `sizeNormalizer.ts`
- [ ] **7.2** Unit tests: `sizeMatching.ts`
- [ ] **7.3** Unit tests: `getSizesForStore` query
- [ ] **7.4** Unit tests: `switchStore` mutation
- [ ] **7.5** E2E: Update `15-size-display.spec.ts` - modal tests
- [ ] **7.6** E2E: Create `16-store-switch.spec.ts`
- [ ] **7.7** E2E: Voice add with size

### Phase 8: Polish

- [ ] **8.1** Loading states for variant fetching
- [ ] **8.2** Error handling for API failures
- [ ] **8.3** Offline behavior (queue for sync)
- [ ] **8.4** Empty state when no sizes available
- [ ] **8.5** Accessibility audit
- [ ] **8.6** Performance: prefetch variants on input focus
- [ ] **8.7** Analytics events

---

## Files Reference

### Files to Create
| File | Purpose |
|------|---------|
| `lib/sizes/sizeNormalizer.ts` | Parse and normalize size strings |
| `lib/sizes/sizeMatching.ts` | Find closest matching sizes |
| `components/lists/SizePriceModal.tsx` | Bottom sheet for size selection |
| `components/lists/SizeOptionCard.tsx` | Individual size option display |
| `components/lists/EditItemModal.tsx` | Edit item size/price |
| `components/lists/ListComparisonSummary.tsx` | Store comparison view |
| `components/lists/StoreSwitchPreview.tsx` | Preview before switching |
| `e2e/tests/16-store-switch.spec.ts` | E2E tests for store switching |

### Files to Modify
| File | Changes |
|------|---------|
| `convex/schema.ts` | Add fields to listItems |
| `convex/shoppingLists.ts` | Require store, add comparison/switch |
| `convex/listItems.ts` | Update create/update mutations |
| `convex/itemVariants.ts` | Add getSizesForStore query |
| `convex/lib/voiceTools.ts` | Update add_items_to_list |
| `app/(app)/list/[id].tsx` | Integrate modals |
| `app/(app)/lists.tsx` | Add store selection to creation |
| `e2e/tests/15-size-display.spec.ts` | Add modal tests |

### Files to Read First (Context)
| File | Why |
|------|-----|
| `convex/schema.ts` | Understand current data model |
| `components/items/VariantPicker.tsx` | Reusable size picker logic |
| `convex/lib/storeNormalizer.ts` | Store data and normalization |
| `convex/lib/voiceTools.ts` | Voice tool structure |
| `lib/design/glassTokens.ts` | UI design tokens |

---

## Progress Tracking

| Phase | Status | Tasks Done |
|-------|--------|------------|
| Phase 1: Foundation | ✅ Complete | 8/8 |
| Phase 2: Add Item Flow | ✅ Complete | 8/8 |
| Phase 3: Edit Flow | ✅ Complete | 6/6 |
| Phase 4: Store Comparison | ✅ Complete | 5/5 |
| Phase 5: Store Switch | ✅ Complete | 8/8 |
| Phase 6: Voice Integration | Not Started | 0/6 |
| Phase 7: Testing | Not Started | 0/7 |
| Phase 8: Polish | Not Started | 0/7 |
| **Total** | **In Progress** | **35/55** |

---

## Notes for Implementing Agent

1. **Read CLAUDE.md first** - Contains project conventions
2. **Use Glass UI** - All components use `@/lib/design/glassTokens.ts`
3. **Haptic feedback** - Use `@/lib/haptics/safeHaptics.ts` on all interactions
4. **Optimistic updates** - Use for instant UX feedback
5. **Zero-blank prices** - Every item MUST have a price (AI fallback if needed)
6. **Test on web first** - Playwright E2E tests run against web build
7. **Check existing patterns** - Look at similar components before creating new ones
