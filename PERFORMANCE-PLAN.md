# Shopping List Performance Optimization Plan

> **Target file:** `app/(app)/list/[id].tsx` (3,313 lines)
> **Problem:** List becomes slow with many items due to zero virtualization, broken memoization, and cascading re-renders.

---

## Step 1: Remove Dead `scale` Shared Value

**Risk:** None (dead code removal)

- [x] Delete `const scale = useSharedValue(1)` (~line 2189 in `ShoppingListItem`)
- [x] Remove `{ scale: scale.value }` from `animatedStyle` transform array (~line 2242)
- [x] Verify typecheck passes

---

## Step 2: Fix Memoization

**Risk:** Low | **Impact:** Very High

`memo(ShoppingListItem)` exists but is defeated by unstable prop references. Every parent re-render causes ALL items to re-render even when their data hasn't changed.

### 2a: Stabilize `commentCounts` query result

- [x] Create `hooks/useStableValue.ts` (~15 lines) -- a hook that compares previous/new values with shallow record equality, only returning a new reference when data actually differs
- [x] Apply `useStableValue` to the `commentCounts` query result (~line 174)

### 2b: Stabilize `onOpenComments` prop

- [x] Replace inline ternary `hasPartners ? openCommentThread : undefined` (~line 1572) with a `useMemo` that only recalculates when `hasPartners` or `openCommentThread` changes

### 2c: Add custom comparator to `memo()`

- [x] Add an explicit equality function to `memo(ShoppingListItem)` (~line 2171) that compares all 16 props by reference/value
- [ ] Verify with `console.log` or React DevTools that toggling one item does NOT re-render other items

---

## Step 3: Extract `ShoppingListItem` to Its Own File

**Risk:** Medium (refactor) | **Impact:** Medium (DX, enables Step 4)

The component is defined inline in the 3,313-line god file. Extracting it reduces the file by ~900 lines and makes Step 4 cleaner.

- [x] Create `components/list/ShoppingListItem.tsx` containing:
  - `ShoppingListItemProps` interface (lines 2074-2092)
  - `PRIORITY_CONFIG` constant (lines 2049-2066)
  - `PRIORITY_ORDER` constant (lines 2068-2072)
  - `ShoppingListItem` component (lines 2171-2391)
  - Item-specific styles
- [x] Create `components/list/ShoppingTypewriterHint.tsx` (~60 lines, lines 2098-2152)
- [x] Create `lib/list/helpers.ts` with shared helpers:
  - `normalizeForComparison` (lines 66-87)
  - `areItemsSimilar` (lines 92-108)
  - `getPriceLabel` (lines 115-131)
- [x] Update imports in `app/(app)/list/[id].tsx`
- [x] Verify typecheck passes
- [ ] Test all item interactions (tap, swipe, edit, delete, select)

---

## Step 4: Install FlashList and Virtualize the List

**Risk:** Medium-High | **Impact:** Very High

Replace `ScrollView` + `.map()` with `@shopify/flash-list`. Only ~10 items stay mounted at a time instead of all N. Gesture handlers and animated values are recycled, not destroyed/recreated.

### 4a: Install dependency

- [x] Run `npx expo install @shopify/flash-list`

### 4b: Restructure scroll layout

Current structure nests everything inside one `Animated.ScrollView`. FlashList must be the sole scroll container.

- [x] Move all content above the items (budget dial, approval banner, action buttons, add form, category filter, selection bar) into a memoized `ListHeaderComponent`
- [x] Move bottom spacer into `ListFooterComponent`
- [x] Create `ListEmptyComponent` for the empty state
- [x] Replace `Animated.ScrollView` + `displayItems.map()` with `<FlashList data={displayItems} ... />`

### 4c: Configure FlashList

- [x] Create `renderItem` callback with `useCallback`
- [x] Set `estimatedItemSize={72}` (current card height) -- used `drawDistance={250}` for FlashList v2 API
- [x] Set `keyExtractor={(item) => item._id}`
- [x] Wire `onScroll={scrollHandler}` for the sticky mini budget bar
- [x] Set `scrollEventThrottle={16}`, `keyboardShouldPersistTaps="handled"`

### 4d: Fix LayoutAnimation conflict

- [x] Replace `LayoutAnimation.configureNext()` (~line 987, add form toggle) with Reanimated `Layout` animation or remove it -- LayoutAnimation conflicts with FlashList (removed)

### 4e: Verify

- [x] Typecheck passes
- [ ] Scroll smoothly with 30+ items
- [ ] Sticky mini budget bar still works on scroll
- [ ] All item interactions work (tap, swipe, edit, delete, select, approve/reject)
- [ ] Convex real-time updates still reflect (e.g. partner adds an item)

---

## Step 5: Isolate Parent Re-renders

**Risk:** Medium | **Impact:** High

### 5a: Move `selectedItems` to ref-based pattern

Currently `selectedItems` is `useState<Set>` (~line 265). Every toggle creates a new Set, triggering parent re-render and re-evaluation of all item props.

- [x] Replace with `useRef` + a `selectionVersion` counter state
- [x] `selectionVersion` triggers parent re-render for the selection count UI
- [x] `isSelected` per item derived from the ref -- combined with memo comparator, only the toggled item re-renders

### 5b: Extract `AddItemForm` to its own component

The add form has ~10 state hooks (`newItemName`, `newItemQuantity`, `newItemPrice`, etc.). Typing in the input currently re-renders ALL list items.

- [x] Create `components/list/AddItemForm.tsx` (833 lines, fully self-contained)
- [x] Move the 10 form-related state hooks into the new component
- [ ] Verify typing in the add form does NOT cause list item re-renders

---

## Step 6: Further Decomposition (Lower Priority)

Do after Steps 1-5 are stable and tested.

- [x] Extract budget dial section to `components/list/BudgetSection.tsx` (151 lines)
- [x] Extract modal components into `components/list/modals/`:
  - `EditBudgetModal.tsx` (170 lines)
  - `MidShopModal.tsx` (275 lines)
  - `ActualPriceModal.tsx` (320 lines)
  - `EditItemModal.tsx` (209 lines)
  - `ListPickerModal.tsx` (147 lines)
- [ ] Create `useListDetailState` hook to encapsulate Convex queries/mutations (skipped -- diminishing returns at current file size)

---

## Event Delegation Note

React Native has **no DOM event bubbling**. Each `Pressable` must have its own handler -- this is correct and not the bottleneck. The 5 Pressables per item are fine. The real problem is having all items mounted at once. FlashList (Step 4) solves this by keeping only ~10 items mounted, reducing total Pressable instances from ~250 to ~50.

---

## Files Modified/Created

| File | Action | Step |
|------|--------|------|
| `app/(app)/list/[id].tsx` | Major refactor | All |
| `hooks/useStableValue.ts` | **New** | 2a |
| `components/list/ShoppingListItem.tsx` | **New** | 3 |
| `components/list/ShoppingTypewriterHint.tsx` | **New** | 3 |
| `lib/list/helpers.ts` | **New** | 3 |
| `components/list/AddItemForm.tsx` | **New** | 5b |
| `package.json` | Add `@shopify/flash-list` | 4a |
