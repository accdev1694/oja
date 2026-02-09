# Codebase Performance Optimization Plan

> **Scope:** Five screens and one shared component identified after the `list/[id].tsx` optimization (3,313 → 1,119 lines).
> **Pattern:** Apply the same playbook — virtualize, memoize, extract, stabilize callbacks.

---

## Priority 1: Pantry Screen `app/(app)/(tabs)/index.tsx` (1,855 lines)

**Why first:** Second-largest god component. Same anti-patterns the list screen had before its fix. Every user hits this screen on launch.

---

### Step 1.1: Memoize `groupedItems` and `sections`

**Risk:** None | **Impact:** High

Currently computed in the render body (lines 544-556) — rebuilt on every render even if `filteredItems` hasn't changed.

- [x] Wrap `groupedItems` + `sections` construction in `useMemo` with dependency `[filteredItems]`
- [x] Compute `activeFilterCount` (line 558) inside the same memo or a separate `useMemo`
- [x] Memoize the `hasExpandedCategory` boolean (currently `Object.keys(groupedItems).some(...)` at lines 721 and 832, called twice per render)
- [ ] Verify typecheck passes

---

### Step 1.2: Extract and memoize `PantryItemRow`

**Risk:** Low | **Impact:** Very High

`PantryItemRow` (lines 1194-1281) is a plain function — not wrapped in `React.memo()`, so every parent re-render re-renders every visible item.

- [x] Move `PantryItemRow` to `components/pantry/PantryItemRow.tsx`
- [x] Define a `PantryItemRowProps` interface
- [x] Wrap with `React.memo()` and add a custom comparator (compare `item._id`, `item.stockLevel`, `item.icon`, `item.name` + callback references)
- [x] Extract `TypewriterHint` (lines 1287-1332) to `components/pantry/TypewriterHint.tsx`
- [x] Extract `SwipeOnboardingOverlay` (lines 1099-1147) to `components/pantry/SwipeOnboardingOverlay.tsx`
- [x] Extract `AddedToListToast` (lines 1335-1410) to `components/pantry/AddedToListToast.tsx`
- [x] Update imports in `index.tsx`
- [ ] Verify typecheck passes

---

### Step 1.3: Stabilize callbacks passed to `PantryItemRow`

**Risk:** Medium | **Impact:** Very High

Every item in `.map()` receives 5 inline arrow functions (lines 811-815, duplicated at 879-883), defeating any memoization from Step 1.2.

- [x] Create stable `handleSwipeDecrease` and `handleSwipeIncrease` with `useCallback` that take an item ID parameter, using the existing functions
- [x] Create stable `handleRemoveItem` and `handleAddToList` with `useCallback` that take item parameters
- [x] Removed `onMeasure` (no longer needed with SectionList virtualization)
- [x] Update `PantryItemRow` to call these with its own `item` prop internally
- [ ] Verify that toggling one item does NOT re-render other items

---

### Step 1.4: Deduplicate attention/all render logic

**Risk:** Medium | **Impact:** Medium (DX, reduces bug surface)

Lines 699-825 (attention mode) and 827-891 (all items mode) contain near-identical category+item rendering logic copy-pasted.

- [x] Create a single `CategoryHeader` component used by both modes
- [x] Stabilize `toggleCategory` callback (currently redefined inside `.map()` at lines 772-783 and 840-851) — move to `useCallback` with category parameter
- [x] Remove duplicate rendering blocks

---

### Step 1.5: Virtualize with SectionList or FlashList

**Risk:** High | **Impact:** Very High

Both modes use `ScrollView` + `Object.entries(groupedItems).map()` (lines 700-825, 827-891). With 80+ pantry items across categories, all items are mounted.

- [x] Replace both `ScrollView` blocks with a single `<SectionList>` (or `<FlashList>` with sticky headers)
  - `sections` data from Step 1.1's memoized value
  - `renderSectionHeader` for collapsible category headers
  - `renderItem` for `PantryItemRow` with `useCallback`
  - `keyExtractor={(item) => item._id}`
  - `stickySectionHeadersEnabled={false}`
- [x] Move journey prompt, hint row, and attention empty state into `ListHeaderComponent`
- [x] Move bottom spacer into `ListFooterComponent`
- [ ] Verify typecheck passes
- [ ] Scroll smoothly with 50+ items
- [ ] Category collapse/expand still works
- [ ] Swipe gestures still work on items

---

### Step 1.6: Extract modals and form state

**Risk:** Medium | **Impact:** Medium

The Add Item modal (lines 954-1032), Filter modal (lines 900-952), and List Picker modal (lines 1034-1086) live inline with ~8 useState hooks for form state. Typing in the add form re-renders all items.

- [x] Extract `AddPantryItemModal` to `components/pantry/AddPantryItemModal.tsx` — move `newItemName`, `newItemCategory`, `newItemStock`, `addModalVisible` state into it
- [x] Extract `StockFilterModal` to `components/pantry/StockFilterModal.tsx`
- [x] Extract `PantryListPickerModal` to `components/pantry/PantryListPickerModal.tsx` — move `addToListItem` state into it
- [x] Update imports in `index.tsx`
- [ ] Verify typecheck passes

---

### Expected result

~~`index.tsx` should drop from **1,855 → ~600-700 lines**.~~ **Actual: 1,855 → 1,079 lines (42% reduction).** Items render only when visible via `SectionList`. Typing in modals doesn't cascade. Callbacks stabilized with `useCallback`.

---

## Priority 2: Lists Tab `app/(app)/(tabs)/lists.tsx` (1,225 lines)

**Why second:** Every user navigates here frequently. Three card types rendered with `.map()`, none memoized.

---

### Step 2.1: Wrap card components in `React.memo()`

**Risk:** None | **Impact:** High

`ListCard` (line 568), `HistoryCard` (line 731), and `SharedListCard` (line 859) are plain functions. Each has its own `useSharedValue` for scale animation that gets recreated on parent re-render.

- [x] Wrap `ListCard` export with `React.memo()` — compare `list._id`, `list.status`, `list.budget`, `list.itemCount`, `list.totalEstimatedCost`, `list.createdAt`
- [x] Wrap `HistoryCard` export with `React.memo()` — compare `list._id`, `list.actualTotal`, `list.pointsEarned`, `list.completedAt`
- [x] Wrap `SharedListCard` export with `React.memo()` — compare `list._id`, `list.status`, `list.role`, `list.ownerName`
- [x] Verify typecheck passes

---

### Step 2.2: Stabilize callbacks passed to cards

**Risk:** Low | **Impact:** High

Lines 332-334: inline `onPress={() => router.push(...)}` and `onDelete={() => handleDeleteList(...)}`
Lines 354, 400: same pattern for shared/history cards.

- [x] Create `handleListPress = useCallback((id) => router.push(...), [router])`
- [x] Create `handleDeletePress = useCallback((id, name) => handleDeleteList(id, name), [handleDeleteList])`
- [x] Pass `listId` prop to cards and let them call the stable callback internally
- [x] Same for `SharedListCard` and `HistoryCard` onPress handlers

---

### Step 2.3: Extract cards to separate files (optional, if file feels large after 2.1-2.2)

**Risk:** Low | **Impact:** Medium (DX)

- [x] Move `ListCard` to `components/lists/ListCard.tsx`
- [x] Move `HistoryCard` to `components/lists/HistoryCard.tsx`
- [x] Move `SharedListCard` to `components/lists/SharedListCard.tsx`
- [x] Move `getRelativeListName` (lines 528-566) into `lib/list/helpers.ts`
- [x] Update imports in `lists.tsx`

---

### Step 2.4: Virtualize if list counts grow

**Risk:** Low | **Impact:** Low-Medium (future-proofing)

Most users have <10 active lists, so virtualization isn't critical yet. But history can grow.

- [x] Replace history tab's `ScrollView` + `.map()` with `<FlatList>` with stable `renderItem` and `keyExtractor`
- [x] Keep active tab as-is (typically <10 items)

### Expected result

**Actual: 1,225 → 740 lines (40% reduction).** Cards extracted to `components/lists/`, each wrapped in `React.memo()` with custom comparators. Callbacks stabilized with `useCallback`. History virtualized with `FlatList`. `getRelativeListName` moved to `lib/list/helpers.ts`. Static config objects (`STATUS_CONFIG`, `ROLE_CONFIG`) hoisted outside components.

---

## Priority 3: Insights Screen `app/(app)/insights.tsx` (1,281 lines)

**Why third:** Contains an O(n²) bug and unmemoized render-path computations.

---

### Step 3.1: Fix O(n²) category breakdown

**Risk:** None | **Impact:** High

Lines 497-501: `.reduce()` called INSIDE `.map()` — recomputes the total for every category row.

- [x] Compute `totalAll` once before the `.map()`:
  ```tsx
  const totalAll = useMemo(() =>
    monthlyTrends.categoryBreakdown.reduce((s, c) => s + c.total, 0),
    [monthlyTrends]
  );
  ```
- [x] Use `totalAll` inside the `.map()` at line 502

---

### Step 3.2: Memoize `generateWeeklyNarrative` and `getSeasonalTip`

**Risk:** None | **Impact:** Low-Medium

`generateWeeklyNarrative(digest)` (line 173) and `getSeasonalTip()` (line 687) are called in the render path every re-render.

- [x] Wrap `generateWeeklyNarrative(digest)` result in `useMemo` with dependency `[digest]`
- [x] Wrap `getSeasonalTip()` result in `useMemo` with dependency `[]` (changes daily, stable within a session)

---

### Step 3.3: Memoize sub-components

**Risk:** None | **Impact:** Low

`StatBox` (line 793) and `BestItem` (line 813) are small but called 4x each.

- [x] Wrap `StatBox` and `BestItem` in `React.memo()` — all props are primitives, default comparator is fine
- [ ] Achievement grid items (lines 641-657) are inline JSX inside `.map()` — extract to a memoized `AchievementBadge` component if achievement count grows large (deferred — only needed if achievement count grows)

---

### Step 3.4: Fix stale closure in achievement effect

**Risk:** Low | **Impact:** Correctness

Line 67-77: `onAchievementUnlock` is missing from the `useEffect` dependency array.

- [x] Add `onAchievementUnlock` to the dependency array (it's already stable from `useDelightToast`'s `useCallback`)

---

## Priority 4: Tab Bar `app/(app)/_layout.tsx` (351 lines)

**Why fourth:** Renders on every route change. Small file but high-frequency component.

---

### Step 4.1: Wrap `PersistentTabBar` in `React.memo()`

**Risk:** None | **Impact:** Medium

`PersistentTabBar` (line 143) is a plain function. It re-renders on every route change because `AppLayout` re-renders.

- [x] Wrap `PersistentTabBar` in `React.memo()`
- [x] Note: it uses `usePathname()` internally, so it will still update when the route changes — but it won't re-render from unrelated `AppLayout` state changes

---

### Step 4.2: Stabilize `handleTabPress` callback

**Risk:** None | **Impact:** Low-Medium

Line 189: `onPress={() => handleTabPress(tabName)}` creates a new function for each tab on every render.

- [x] Change `handleTabPress` to `useCallback` (line 169)
- [x] Pass `tabName` as a prop to `TabItem` and have `TabItem` call `onPress(tabName)` internally
- [x] ~~Or: create 4 stable callbacks with `useCallback` (small fixed set)~~ (not needed — single stable callback + tabName prop approach used)

---

### Step 4.3: Wrap `TabItem` in `React.memo()`

**Risk:** None | **Impact:** Low

`TabItem` (line 77) re-renders all 4 tabs on every route change even though only 2 tabs change focus state.

- [x] Wrap `TabItem` in `React.memo()` — compare `isFocused`, `badge`, `config` (config is a static object, reference-stable)
- [x] With stable `onPress` from Step 4.2, only the previously-focused and newly-focused tabs re-render

### Expected result

`TabItem` and `PersistentTabBar` wrapped in `React.memo()`. `handleTabPress` stabilized with `useCallback`. `TAB_ROUTES` and `TABS` hoisted to module-level constants. Inline arrow functions removed — only previously-focused and newly-focused tabs re-render on navigation.

---

## Priority 5: Receipt Confirm `app/(app)/receipt/[id]/confirm.tsx` (965 lines)

**Why fifth:** Used less frequently (only after scanning), but has clear performance issues.

---

### Step 5.1: Memoize derived values

**Risk:** None | **Impact:** Medium

Several calculations run on every render without memoization.

- [x] Wrap `pantrySuggestions` filter/slice/map chain (lines 332-340) in `useMemo` with dependencies `[pantryItems, editValue, editingField]`
- [x] Wrap `lowConfidenceItems` filter (lines 136-138) in `useMemo` with dependency `[editedItems]`
- [x] Wrap `subtotal` and `total` calculations (lines 141-143) in `useMemo` with dependency `[editedItems, tax]`

---

### Step 5.2: Memoize `EditableItemRow`

**Risk:** Low | **Impact:** Medium

`EditableItemRow` (line 666) is a function component without `React.memo()`. Receives inline closures from lines 423-425.

- [x] Wrap `EditableItemRow` in `React.memo()` with a custom comparator
- [x] Stabilize `onEditName`, `onEditPrice`, `onDelete` callbacks:
  - Pass `index` as a prop to `EditableItemRow`
  - Create stable `openEditNameModal`, `openEditPriceModal`, `handleDeleteItem` with `useCallback`
  - Have `EditableItemRow` call `onEditName(index)` internally
- [x] Verify that editing one item doesn't re-render all items

---

### Step 5.3: Memoize `renderRightActions` inside `EditableItemRow`

**Risk:** None | **Impact:** Low

Lines 675-688: `renderRightActions` is a closure recreated on every `EditableItemRow` render.

- [x] Wrap `renderRightActions` in `useCallback` with dependency `[handleDelete]`

### Expected result

`EditableItemRow` wrapped in `React.memo()`. Parent callbacks (`openEditNameModal`, `openEditPriceModal`, `handleDeleteItem`) stabilized with `useCallback`. Derived values (`lowConfidenceItems`, `subtotal`, `total`, `pantrySuggestions`) memoized with `useMemo`. `renderRightActions` inside `EditableItemRow` memoized with `useCallback`. Editing one item no longer re-renders all items.

---

## Files Modified/Created Summary

| File | Action | Priority |
|------|--------|----------|
| `app/(app)/(tabs)/index.tsx` | Major refactor | 1 |
| `components/pantry/PantryItemRow.tsx` | **New** | 1.2 |
| `components/pantry/TypewriterHint.tsx` | **New** | 1.2 |
| `components/pantry/SwipeOnboardingOverlay.tsx` | **New** | 1.2 |
| `components/pantry/AddedToListToast.tsx` | **New** | 1.2 |
| `components/pantry/AddPantryItemModal.tsx` | **New** | 1.6 |
| `components/pantry/StockFilterModal.tsx` | **New** | 1.6 |
| `components/pantry/PantryListPickerModal.tsx` | **New** | 1.6 |
| `app/(app)/(tabs)/lists.tsx` | Memoize cards + stabilize callbacks | 2 |
| `components/lists/ListCard.tsx` | **New** (optional) | 2.3 |
| `components/lists/HistoryCard.tsx` | **New** (optional) | 2.3 |
| `components/lists/SharedListCard.tsx` | **New** (optional) | 2.3 |
| `app/(app)/insights.tsx` | Fix O(n²), memoize computations | 3 |
| `app/(app)/_layout.tsx` | Memoize tab bar + tab items | 4 |
| `app/(app)/receipt/[id]/confirm.tsx` | Memoize row + derived values | 5 |
