# Oja Shopping List Re-Architecture: Screen Flows

**Date:** 2026-02-12
**Scope:** Steps 6-13 of the app flow (list creation through item addition)
**Principle:** Convex is the anti-leakage layer. Every action is a mutation. Route params carry only IDs.

---

## Table of Contents

1. [List Creation Entry](#1-list-creation-entry)
2. [List Creation Page (Empty State)](#2-list-creation-page-empty-state)
3. [Store Selection Dropdown](#3-store-selection-dropdown)
4. [After Store Selected](#4-after-store-selected)
5. [Add Items Modal (Progressive)](#5-add-items-modal-progressive)
6. [List With Items Added](#6-list-with-items-added)
7. [Pantry Pick Screen](#7-pantry-pick-screen)
8. [Individual Pantry Add (1 Item)](#8-individual-pantry-add-1-item)
9. [Bulk Pantry Add (2+ Items)](#9-bulk-pantry-add-2-items)
10. [Complete Flow Map](#10-complete-flow-map)
11. [Data Contracts](#11-data-contracts)
12. [Component Inventory](#12-component-inventory)

---

## 1. List Creation Entry

**Screen:** `lists.tsx` (existing lists screen)

```
+-------------------------------------+
|  LISTS SCREEN                       |
|                                     |
|  My Shopping Lists                  |
|                                     |
|  +-----------------------------+    |
|  | Shopping icon               |    |
|  | Weekly Shop       GBP42/50 |    |
|  | Tesco - 8 items - active    |    |
|  +-----------------------------+    |
|                                     |
|  +-----------------------------+    |
|  | Shopping icon               |    |
|  | Midweek Top-up   GBP18/30 |    |
|  | Aldi - 4 items - active     |    |
|  +-----------------------------+    |
|                                     |
|                                     |
|         +---------------+           |
|         |  + New List   |           |
|         +-------+-------+           |
+-----------------|-------------------+
                  |
                  | user taps
                  v
+-------------------------------------+
|  QUICK CREATE (Bottom Sheet)        |
|  ---------------------------------- |
|                                     |
|  List Name                          |
|  +-----------------------------+    |
|  | Shopping List            x  |    |
|  +-----------------------------+    |
|  (auto-focused, keyboard up)        |
|                                     |
|  +-----------------------------+    |
|  |       Create List -->       |    |
|  +-----------------------------+    |
|                                     |
+-------------------------------------+
```

**Action on submit:**

- Mutation: `shoppingLists.create({ name, budget: 50 })`
- Navigate to: `/list/[id]`

---

## 2. List Creation Page (Empty State)

**Screen:** `list/[id].tsx` (redesigned header area)

```
+-------------------------------------+
|  <-- Back        Shopping List  Ed  |
|                                     |
|             +---------+             |
|            /           \            |
|           |    GBP50    |           |
|           |  --------   |           |
|           |   BUDGET    |           |
|           |    DIAL     |           |
|            \  -------  /            |
|             +---------+             |
|          "Lots of room"             |
|           (tap to edit)             |
|                                     |
|  +---------+----------+----------+  |
|  |         |          |          |  |
|  |   GBP   |  Store   |  + Add  |  |
|  |  Budget  |   (v)    |  Items  |  |
|  |         |          | (greyed)|  |
|  +---------+----------+----------+  |
|                |                    |
|          "Pick a store              |
|           to see prices"            |
|                                     |
|  + - - - - - - - - - - - - - - +   |
|  |                              |   |
|  |   Shopping cart icon         |   |
|  |   Add items to start        |   |
|  |   building your list        |   |
|  |                              |   |
|  + - - - - - - - - - - - - - - +   |
|                                     |
+-------------------------------------+
```

**Key behaviours:**

- Budget dial = EXISTING `CircularBudgetDial` component (no changes)
  - Props: `planned: 0, budget: 50, mode: "active"`
- `[GBP Budget]` button tap --> opens EXISTING `EditBudgetModal`
- Budget dial tap --> opens SAME `EditBudgetModal`
- `[+ Add Items]` is DISABLED until store is selected
- `[Store v]` opens store selection bottom sheet

---

## 3. Store Selection Dropdown

**Component:** `StoreDropdownSheet.tsx` (NEW - bottom sheet)

**Triggered by:** User taps `[Store v]` in action row

```
+-------------------------------------+
|  <-- Back        Shopping List  Ed  |
|             +---------+             |
|            |  GBP50   |             |
|            |  BUDGET  |             |
|             +---------+             |
|  +---------+----------+----------+  |
|  |  GBP   |  Store   |  + Add  |  |
|  |  Budget  |   (v)    |  Items  |  |
|  +---------+----+-----+----------+  |
| -----------------+----------------- |
| //////////////////////////////////////////// |
| //                                      // |
| //  Select Store                        // |
| //                                      // |
| //  YOUR STORES (from onboarding)       // |
| //  +-------------------------------+   // |
| //  | [blue]   Tesco                |   // |
| //  +-------------------------------+   // |
| //  | [orange] Sainsbury's          |   // |
| //  +-------------------------------+   // |
| //  | [yellow] Aldi                 |   // |
| //  +-------------------------------+   // |
| //                                      // |
| //  ALL STORES                          // |
| //  +-------------------------------+   // |
| //  | [green]  Morrisons            |   // |
| //  +-------------------------------+   // |
| //  | [purple] Waitrose             |   // |
| //  +-------------------------------+   // |
| //  | [brown]  Lidl                 |   // |
| //  +-------------------------------+   // |
| //  | ...12 more stores...          |   // |
| //  +-------------------------------+   // |
| //                                      // |
| //////////////////////////////////////////// |
+-------------------------------------+
```

**Data source:**

- "YOUR STORES" = `user.storePreferences.favorites` (set during onboarding)
- "ALL STORES" = remaining stores from the 20 UK stores in `storeNormalizer.ts`
- Each row shows store brand colour dot + display name

**On selection:**

- Mutation: `shoppingLists.setStore({ id, normalizedStoreId })`
- Bottom sheet dismisses
- `[Store v]` button updates to show: `[brand colour] StoreName v`
- `[+ Add Items]` button becomes ACTIVE (teal accent)

---

## 4. After Store Selected

**Screen:** `list/[id].tsx` (store set, ready for items)

```
+-------------------------------------+
|  <-- Back        Shopping List  Ed  |
|                                     |
|             +---------+             |
|            /           \            |
|           |    GBP50    |           |
|           |   BUDGET    |           |
|           |    DIAL     |           |
|            \           /            |
|             +---------+             |
|          "Lots of room"             |
|                                     |
|  +---------+----------+----------+  |
|  |         | [blue]   |          |  |
|  |   GBP   |  Tesco   |  + Add  |  |
|  |  Budget  |   (v)    |  Items  |  |
|  |         |          |  (TEAL) |  |
|  +---------+----------+----------+  |
|       ^         ^           ^       |
|       |     shows brand     |       |
|       |     colour + name   |       |
|       |                  NOW ACTIVE  |
|                                     |
|  + - - - - - - - - - - - - - - +   |
|  |   Add items to start        |   |
|  |   building your list        |   |
|  + - - - - - - - - - - - - - - +   |
|                                     |
+-------------------------------------+
```

**User now taps `[+ Add Items]` to proceed.**

---

## 5. Add Items Modal (Progressive)

**Component:** `AddItemsModal.tsx` (NEW)

**The search field is dual-purpose:** it searches existing items (pantry + variants)
AND allows adding brand new items not yet in the system. If the user types something
with no matches and submits, they get a confirmation prompt before adding.

### State A: Initial (empty search)

```
+-------------------------------------+
|  ADD ITEMS                     [x]  |
|                                     |
|  +-----------------------------+    |
|  | Search icon  Search or add  |    |
|  |              items...       |    |
|  +-----------------------------+    |
|                                     |
|                                     |
|         (empty state)               |
|   Type to search existing items     |
|   or add something new              |
|                                     |
|                                     |
|  +-----------------------------+    |
|  |  Box icon  Add from Pantry  |    |
|  +-----------------------------+    |
|                                     |
+-------------------------------------+
```

### State B: User types search term

```
+-------------------------------------+
|  ADD ITEMS                     [x]  |
|                                     |
|  +-----------------------------+    |
|  | Search icon  mil            |    |
|  +-----------------------------+    |
|                                     |
|  Suggestions:                       |
|  +-----------------------------+    |
|  | Milk icon   Milk            | <--+
|  +-----------------------------+    |
|  | Milk icon   Milk (Semi-Sk) |    |
|  +-----------------------------+    |
|  | Coconut     Coconut Milk    |    |
|  +-----------------------------+    |
|                                     |
|  Lightbulb "Did you mean: Millet?" |
|                                     |
|  +-----------------------------+    |
|  |  Box icon  Add from Pantry  |    |
|  +-----------------------------+    |
|                                     |
+-------------------------------------+
```

**Notes:**

- Suggestions powered by fuzzy matching (existing logic from `AddItemForm`)
- "Did you mean?" chip for typo correction (existing feature, moved here)
- `useVariantPrefetch` hook warms cache as user types (existing, moved here)

### State C: No matches -- new item flow

When the user types an item name that does NOT match any existing pantry items
or known variants, the modal shows a prompt to add it as a new item.

```
+-------------------------------------+
|  ADD ITEMS                     [x]  |
|                                     |
|  +-----------------------------+    |
|  | Search icon  Plantain chips |    |
|  +-----------------------------+    |
|                                     |
|  No matching items found.           |
|                                     |
|  +-----------------------------+    |
|  |                             |    |
|  |  "Plantain Chips" is not    |    |
|  |  in your pantry.            |    |
|  |                             |    |
|  |  Add as new item?           |    |
|  |                             |    |
|  |  +----------+ +----------+  |    |
|  |  |    No    | |   Yes    |  |    |
|  |  +----------+ +----------+  |    |
|  |                             |    |
|  +-----------------------------+    |
|                                     |
|  +-----------------------------+    |
|  |  Box icon  Add from Pantry  |    |
|  +-----------------------------+    |
|                                     |
+-------------------------------------+
```

**If user taps "No":**

- Prompt dismissed, search field stays as-is
- User can refine their search or clear it

**If user taps "Yes" -- manual entry expands:**

```
+-------------------------------------+
|  ADD ITEMS                     [x]  |
|                                     |
|  +-----------------------------+    |
|  | Search icon  Plantain Chips |    |
|  +-----------------------------+    |
|                                     |
|  NEW ITEM: Plantain Chips           |
|                                     |
|  Category:                          |
|  +-----------------------------+    |
|  | Snacks                  (v) |    |
|  +-----------------------------+    |
|  (auto-suggested from item name,    |
|   user can change via dropdown)     |
|                                     |
|  Size (optional):                   |
|  +-----------------------------+    |
|  | e.g. 150g, 6 pack          |    |
|  +-----------------------------+    |
|                                     |
|  Price:                             |
|  +-----------------------------+    |
|  | GBP                         |    |
|  +-----------------------------+    |
|  (AI estimate shown as hint if      |
|   available, user types their own)  |
|                                     |
|  Qty:  [ - ]   1   [ + ]           |
|                                     |
|  +-----------------------------+    |
|  |      Add to List  -->       |    |
|  +-----------------------------+    |
|                                     |
|  +-----------------------------+    |
|  |  Box icon  Add from Pantry  |    |
|  +-----------------------------+    |
|                                     |
+-------------------------------------+
```

**On "Add to List" for a new item:**

- Mutation: `listItems.add({ listId, name, size, estimatedPrice, priceSource: "manual", quantity })`
- Optionally: `pantryItems.create({ name, category, stockLevel: "out" })` to seed the
  pantry with the new item for future use (user chose to add, so it belongs in their world)
- Item appears in list via Convex reactivity
- Modal stays open, search clears for next item

**Behaviour logic:**

| Search Result        | Action                                       |
|----------------------|----------------------------------------------|
| Matches found        | Show suggestion list (State B)               |
| User taps suggestion | Show size cards for that item (State D)      |
| No matches + submit  | Show "not in pantry, add?" prompt (State C)  |
| User confirms "Yes"  | Show manual entry fields (State C continued) |
| User confirms "No"   | Dismiss prompt, stay in search               |

### State D: User taps item -- size cards appear

```
+-------------------------------------+
|  ADD ITEMS                     [x]  |
|                                     |
|  +-----------------------------+    |
|  | Search icon  Milk        x  |    |
|  +-----------------------------+    |
|                                     |
|  Sizes at Tesco:                    |
|  +--------+  +--------+  +--------+|
|  |  1pt   |  | star   |  |  4pt   ||
|  | GBP0.95|  |  2pt   |  | GBP2.50||
|  |        |  |GBP1.45 |  |        ||
|  |        |  | usual  |  |        ||
|  +--------+  +--------+  +--------+|
|       ^         ^              ^    |
|    selectable  pre-selected        |
|                if "usual"           |
|                                     |
|  Or enter your price:               |
|  +------------------+               |
|  | GBP              |               |
|  +------------------+               |
|                                     |
|  Qty:  [ - ]   1   [ + ]           |
|                                     |
|  +-----------------------------+    |
|  |      Add to List  -->       |    |
|  +-----------------------------+    |
|                                     |
|  +-----------------------------+    |
|  |  Box icon  Add from Pantry  |    |
|  +-----------------------------+    |
|                                     |
+-------------------------------------+
```

**Data source for size cards:**

- Query: `itemVariants.getSizesForStore({ itemName, store: list.normalizedStoreId })`
- Star badge = user's most frequently purchased size (`isUsual: true`)
- Price from 3-layer cascade: personal receipts --> crowdsourced --> AI estimate

**Custom price behaviour:**

- User types their own price --> `priceOverride: true`, `priceSource: "manual"`
- Custom price overrides any size card selection

**On "Add to List" (known item with size cards):**

- Mutation: `listItems.add({ listId, name, size, estimatedPrice, priceSource, quantity })`
- Item appears in list below via Convex reactivity
- Modal STAYS OPEN -- search field clears for next item
- User can keep adding items without leaving the modal

**On "Add to List" (new item via State C):**

- Mutation: `listItems.add({ listId, name, size, estimatedPrice, priceSource: "manual", quantity })`
- Side effect: `pantryItems.create({ name, category, stockLevel: "out" })` to seed pantry
- Same modal behaviour -- stays open, clears for next item

**"Add from Pantry" is always visible at the bottom.**

---

## 6. List With Items Added

**Screen:** `list/[id].tsx` (after closing Add Items modal)

```
+-------------------------------------+
|  <-- Back        Shopping List  Ed  |
|                                     |
|             +---------+             |
|            / ========= \            |
|           |    GBP50    |           |
|           |  --------   |           |
|           |  planned:   |           |
|           |   GBP5.90   |           |
|            \ ========= /  <-- outer |
|             +---------+    arc now  |
|       "Fits your budget"   shows   |
|                             total   |
|                                     |
|  +---------+----------+----------+  |
|  |   GBP   | [blue]   |  + Add  |  |
|  |  Budget  |  Tesco v |  Items  |  |
|  +---------+----------+----------+  |
|                                     |
|  ----------- 3 items ------------- |
|                                     |
|  [ ] Milk icon   Milk   2pt  1.45  |
|  [ ] Bread icon  Bread  800g 1.20  |
|  [ ] Rice icon   Rice   1kg  3.25  |
|                                     |
|  (tap any item to edit size/price)  |
|                                     |
|                                     |
|  +-----------------------------+    |
|  |       Go Shopping -->       |    |
|  +-----------------------------+    |
|                                     |
|  ===================================|
|  EXISTING FLOW CONTINUES BELOW      |
|  - Shopping mode (check off items)  |
|  - Mid-shop add                     |
|  - Complete --> restock pantry      |
|  - Receipt scan + reconciliation    |
|  - Store comparison (at 3+ items)   |
|  ===================================|
|                                     |
+-------------------------------------+
```

**Notes:**

- Budget dial = EXISTING `CircularBudgetDial`, unchanged
  - Reads `list.budget` and `estimatedTotal` from items automatically
- Item rows = EXISTING `ShoppingListItem` components, unchanged
- "Go Shopping" = EXISTING flow, completely unchanged
- Store comparison appears automatically at 3+ items = EXISTING

---

## 7. Pantry Pick Screen

**Screen:** `/pantry-pick` (modified for dual-mode)

**Triggered by:** User taps `[Add from Pantry]` in `AddItemsModal`

**Navigation:** Modal closes, navigate to `/pantry-pick?listId=X&storeId=tesco`

```
+-------------------------------------+
|  <-- Back to List  Add from Pantry  |
|                                     |
|  +-----------------------------+    |
|  | Search  Filter pantry...    |    |
|  +-----------------------------+    |
|                                     |
|  LOW STOCK -----------------------  |
|  +-----------------------------+    |
|  | [ ] Milk icon   Milk   low |    |
|  | [ ] Bread icon  Bread  low |    |
|  | [ ] Butter icon Butter low |    |
|  +-----------------------------+    |
|                                     |
|  OUT OF STOCK --------------------  |
|  +-----------------------------+    |
|  | [ ] Rice icon   Rice   out |    |
|  | [ ] Eggs icon   Eggs   out |    |
|  | [ ] Onion icon  Onions out |    |
|  | [ ] Oil icon    Olive  out |    |
|  | [ ] Tomato icon Tomato out |    |
|  +-----------------------------+    |
|                                     |
|  STOCKED (collapsed) -------> tap   |
|                                     |
|  +-----------------------------+    |
|  |    Add Selected (0) -->     |    |
|  +-----------------------------+    |
|                                     |
+-------------------------------------+
```

**Sorting:**

- "Out" items shown first (most likely to need buying)
- "Low" items next
- "Stocked" items collapsed by default (expandable)

---

## 8. Individual Pantry Add (1 Item)

**Trigger:** User selects exactly 1 item and taps "Add Selected (1)"

```
  User checks 1 item: Milk
          |
          v

+-------------------------------------+
|  <-- Back to List  Add from Pantry  |
|                                     |
|  | [x] Milk icon  Milk   low  |    |
|  | [ ] Bread icon Bread  low  |    |
|  | ...                         |    |
|                                     |
|  +-----------------------------+    |
|  |    Add Selected (1) -->     |    |
|  +-------------+---------------+    |
+-----------------|-------------------+
                  |
                  | selectedItems.length === 1
                  | system opens SizePriceModal
                  v

+-------------------------------------+
|  SIZE / PRICE MODAL (EXISTING)      |
|  ---------------------------------- |
|                                     |
|  Milk icon  Milk at Tesco           |
|                                     |
|  +--------+  +--------+  +--------+|
|  |  1pt   |  | star   |  |  4pt   ||
|  | GBP0.95|  |  2pt   |  | GBP2.50||
|  |        |  |GBP1.45 |  |        ||
|  |        |  | usual  |  |        ||
|  +--------+  +--------+  +--------+|
|                                     |
|  Best value: 4pt (GBP0.06/100ml)   |
|                                     |
|  +-----------------------------+    |
|  |      Add to List  -->       |    |
|  +-----------------------------+    |
|                                     |
+-------------------------------------+
                  |
                  | listItems.add() mutation
                  | router.back() to list detail
                  | item appears via Convex reactivity
                  v

+-------------------------------------+
|  LIST DETAIL (item now visible)     |
|  ...                                |
|  [ ] Milk icon   Milk  2pt   1.45  |
|  ...                                |
+-------------------------------------+
```

**Notes:**

- `SizePriceModal` is the EXISTING component, no changes
- Store context read from route param `storeId`
- After add, user returns to list detail (not back to pantry)

---

## 9. Bulk Pantry Add (2+ Items)

**Trigger:** User selects 2 or more items and taps "Add Selected (N)"

```
  User checks 4 items
          |
          v

+-------------------------------------+
|  <-- Back to List  Add from Pantry  |
|                                     |
|  | [x] Milk icon   Milk   low |    |
|  | [x] Bread icon  Bread  low |    |
|  | [ ] Butter icon Butter low |    |
|  | [x] Rice icon   Rice   out |    |
|  | [x] Eggs icon   Eggs   out |    |
|  | ...                         |    |
|                                     |
|  +-----------------------------+    |
|  |    Add Selected (4) -->     |    |
|  +-------------+---------------+    |
+-----------------|-------------------+
                  |
                  | selectedItems.length > 1
                  | call addFromPantryBulk mutation
                  v

+-------------------------------------+
|  ADDING ITEMS (brief loading)       |
|                                     |
|  Adding 4 items with best prices... |
|                                     |
|  +-----------------------------+    |
|  | tick  Milk  -- 2pt, GBP1.45|    |
|  | tick  Bread -- 800g, 1.20  |    |
|  | tick  Rice  -- 1kg, 3.25   |    |
|  | tick  Eggs  -- 6pk, 1.90   |    |
|  +-----------------------------+    |
|                                     |
|  Sizes: most popular at Tesco       |
|  Prices: best available data        |
|                                     |
+-------------------------------------+
                  |
                  | mutation completes
                  | router.back() to list detail
                  v
```

**Result: List detail with bulk-added items**

```
+-------------------------------------+
|  <-- Back        Shopping List  Ed  |
|                                     |
|             +---------+             |
|            / ========= \            |
|           |    GBP50    |           |
|           |  planned:   |           |
|           |   GBP7.80   |           |
|            \ ========= /            |
|             +---------+             |
|       "Fits your budget"            |
|                                     |
|  +---------+----------+----------+  |
|  |   GBP   | [blue]   |  + Add  |  |
|  |  Budget  |  Tesco v |  Items  |  |
|  +---------+----------+----------+  |
|                                     |
|  ----------- 4 items ------------- |
|                                     |
|  [ ] Milk icon   Milk   2pt  1.45  |
|  [ ] Bread icon  Bread  800g 1.20  |
|  [ ] Rice icon   Rice   1kg  3.25  |
|  [ ] Eggs icon   Eggs   6pk  1.90  |
|       ^                       ^     |
|    tap any item to edit size/price  |
|    (EXISTING inline edit)           |
|                                     |
|  +-----------------------------+    |
|  |       Go Shopping -->       |    |
|  +-----------------------------+    |
|                                     |
+-------------------------------------+
```

**Bulk size resolution logic (server-side):**

| Priority | Condition                  | Size Used                       | Price Used              |
|----------|----------------------------|---------------------------------|-------------------------|
| 1        | Variants exist with scores | Highest commonality at store    | Price cascade           |
| 2        | Variants exist, no scores  | Cheapest variant                | Price cascade           |
| 3        | No variants, has defaults  | Pantry item defaultSize + unit  | Pantry item lastPrice   |
| 4        | No data at all             | None (user must set)            | AI estimate or "?"      |

---

## 10. Complete Flow Map

```
                        +------------+
                        |   LISTS    |
                        |   SCREEN   |
                        +-----+------+
                              |
                              | "New List" tap
                              v
                        +------------+
                        |   QUICK    |
                        |   CREATE   |
                        |   SHEET    |
                        |  (name)    |
                        +-----+------+
                              |
                              | create mutation
                              | { name, budget: 50 }
                              |
                              v
                +-------------------------+
                |                         |
                |    LIST DETAIL PAGE     |
                |                         |
                |    [Budget Dial GBP50]  |<-----------+
                |                         |            |
                |    [GBP] [Store] [+]    |            |
                |                         |            |
                +---+--------+-------+----+            |
                    |        |       |                 |
           +--------+   +---+---+   +--------+        |
           |            |       |            |        |
           v            v       v            v        |
     +---------+  +---------+  +-----------+          |
     |  EDIT   |  | STORE   |  |   ADD     |          |
     | BUDGET  |  | DROP-   |  |  ITEMS    |          |
     | MODAL   |  | DOWN    |  |  MODAL    |          |
     |         |  | SHEET   |  |           |          |
     |(EXISTING|  | (NEW)   |  |  (NEW)    |          |
     +---------+  +---------+  +--+-----+--+          |
         |            |           |     |              |
         |            |      +----+     +----+         |
         | update     | set  |               |         |
         | budget     | store|               |         |
         | mutation   | mut. |               |         |
         |            |      v               |         |
         |            |  +----------+        |         |
         |            |  | KNOWN    |  "Add from       |
         |            |  | ITEM:    |   Pantry"        |
         |            |  | size     |        |         |
         |            |  | cards    |        v         |
         |            |  +----+-----+  +----------+    |
         |            |       |        |  PANTRY  |    |
         |            |       |        |   PICK   |    |
         |            |       |        |  SCREEN  |    |
         |            |  +----+-----+  +--+----+--+    |
         |            |  | NEW ITEM |     |    |       |
         |            |  | "Not in  |  1 item  2+     |
         |            |  | pantry,  |     |    items   |
         |            |  |  add?"   |     v    |       |
         |            |  | YES: manual +----+  |       |
         |            |  | entry +  | SIZE/|  |       |
         |            |  | pantry   | PRICE|  |       |
         |            |  | seed     | MODAL|  |       |
         |            |  +----+-----+ (EX) |  |       |
         |            |       |     +--+---+  |       |
         |            |       |        |      |       |
         +------------+-------+--------+------+       |
                      |                               |
                      v                               |
               +---------------------------+           |
               |                           |           |
               |   listItems.add()         |           |
               |   or addFromPantryBulk()  |-----------+
               |   MUTATIONS               |
               |   + pantryItems.create()  |
               |     (for new items)       | Convex reactivity
               +---------------------------+ updates list
                              |
                              v
                +-------------------------+
                |                         |
                |    EXISTING FLOW        |
                |    =================    |
                |    Go Shopping -->      |
                |    Check off items      |
                |    Mid-shop add         |
                |    Complete shopping    |
                |    Restock pantry       |
                |    Receipt scan         |
                |    Reconciliation       |
                |                         |
                +-------------------------+
```

---

## 11. Data Contracts

### What NEW code produces (writes to Convex):

| Field                  | Table          | Set By                  |
|------------------------|----------------|-------------------------|
| `name`                 | shoppingLists  | Quick Create sheet      |
| `budget` (default 50)  | shoppingLists  | Quick Create + EditBudgetModal |
| `normalizedStoreId`    | shoppingLists  | StoreDropdownSheet      |
| `name, size, unit`     | listItems      | AddItemsModal or PantryBulk |
| `estimatedPrice`       | listItems      | AddItemsModal or PantryBulk |
| `priceSource`          | listItems      | AddItemsModal or PantryBulk |
| `priceOverride`        | listItems      | AddItemsModal (custom price or new item) |
| `pantryItemId`         | listItems      | PantryBulk mutation or new item seed |
| `name, category`       | pantryItems    | AddItemsModal (new item seed, stockLevel: "out") |

### What EXISTING code consumes (reads from Convex, unchanged):

| Consumer                  | Reads                                    |
|---------------------------|------------------------------------------|
| `CircularBudgetDial`      | `list.budget`, `estimatedTotal` from items |
| `StickyBudgetBar`         | Same as dial                             |
| `ShoppingListItem`        | `listItems.*` fields                     |
| `ListComparisonSummary`   | `listItems` + `normalizedStoreId`        |
| Shopping mode              | `list.status`, `listItems.isChecked`     |
| Receipt reconciliation    | `listItems` matching                     |
| Pantry restock            | `listItems.pantryItemId`                 |

### Route parameters (the ONLY data crossing screen boundaries):

| Navigation                     | Params Passed      |
|--------------------------------|--------------------|
| Lists --> List Detail          | `listId` (in URL)  |
| List Detail --> Pantry Pick    | `listId`, `storeId`|
| Pantry Pick --> List Detail    | None (router.back) |

**No objects, prices, or selections are passed via route params.**
**All state is read from Convex queries on each screen.**

---

## 12. Component Inventory

### Existing Components (NO changes needed)

| Component              | File                                  | Role                    |
|------------------------|---------------------------------------|-------------------------|
| `CircularBudgetDial`   | `components/ui/glass/`                | Budget visualisation    |
| `StickyBudgetBar`      | `app/(app)/list/[id].tsx`             | Scrolled budget bar     |
| `EditBudgetModal`      | `app/(app)/list/[id].tsx`             | Budget editing          |
| `SizePriceModal`       | `components/lists/SizePriceModal.tsx`  | Size/price selection    |
| `ShoppingListItem`     | `components/list/ShoppingListItem.tsx` | Item row rendering      |
| Shopping mode flow     | `app/(app)/list/[id].tsx`             | Check-off, complete     |
| `MidShopModal`         | `app/(app)/list/[id].tsx`             | Mid-shop item add       |
| Receipt flow           | `app/(app)/receipt/`                  | Scan + reconciliation   |

### New Components

| Component              | File                                        | Lines (est.) |
|------------------------|---------------------------------------------|--------------|
| `ListActionRow`        | `components/list/ListActionRow.tsx`          | ~80          |
| `StoreDropdownSheet`   | `components/list/StoreDropdownSheet.tsx`     | ~150         |
| `AddItemsModal`        | `components/list/AddItemsModal.tsx`          | ~350         |

**`AddItemsModal` handles three paths:**

1. Known item (matches found) --> size cards --> add to list
2. New item (no matches) --> "Not in pantry, add?" --> manual entry --> add to list + seed pantry
3. Add from Pantry button --> navigate to pantry pick screen

### New Backend

| File                        | Purpose                                     |
|-----------------------------|---------------------------------------------|
| `convex/lib/priceResolver.ts` | Shared price cascade logic (extracted)      |

### Modified Files

| File                          | Change Scope                              |
|-------------------------------|-------------------------------------------|
| `app/(app)/(tabs)/lists.tsx`  | Simplify creation modal (remove store chips) |
| `app/(app)/list/[id].tsx`     | Replace AddItemForm with action row + modal triggers (header section only) |
| `convex/shoppingLists.ts`     | Add `setStore` mutation                   |
| `convex/listItems.ts`         | Add `addFromPantryBulk` mutation          |
| `convex/pantryItems.ts`       | Add or reuse `create` mutation for new item seeding from AddItemsModal |
| Pantry pick screen            | Add mode detection (1 vs 2+ items)        |
