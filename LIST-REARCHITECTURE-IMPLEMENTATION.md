# Shopping List Re-Architecture: Phased Implementation Plan

**Reference:** `screen-flows.md` (screen wireframes + data contracts)
**Scope:** Steps 6-13 (list creation page through pantry bulk add)
**Principle:** Convex is the anti-leakage layer. Surgical changes. Existing downstream flow untouched.

---

## Phase 1: Backend Foundations

Extract shared logic and add new mutations before touching any UI.
All existing tests must continue passing after each step.

- [ ] **1.1** Extract `convex/lib/priceResolver.ts` from `convex/itemVariants.ts`
  - Move the 3-layer price cascade logic (personal -> crowdsourced -> AI) into a shared helper
  - Helper must be callable from both queries and mutations
  - Existing `getSizesForStore` query should import from this new helper (no behaviour change)
  - Run tests: `npm test` -- all passing

- [ ] **1.2** Add `setStore` mutation to `convex/shoppingLists.ts`
  - Signature: `setStore({ id: Id<"shoppingLists">, normalizedStoreId: string })`
  - Must call `requireCurrentUser(ctx)` for auth
  - Sets `normalizedStoreId` and `storeName` (looked up from store normalizer)
  - Does NOT re-price existing items (that's `switchStore` -- only used when items already exist)
  - Write unit test for this mutation

- [ ] **1.3** Add `addFromPantryBulk` mutation to `convex/listItems.ts`
  - Signature: `addFromPantryBulk({ listId: Id<"shoppingLists">, pantryItemIds: Id<"pantryItems">[] })`
  - Reads `list.normalizedStoreId` server-side (no client param needed)
  - For each pantry item, resolve size and price using `priceResolver`:
    - Priority 1: Highest commonality variant at store -> price cascade
    - Priority 2: Cheapest variant -> price cascade
    - Priority 3: Pantry item `defaultSize` + `defaultUnit` -> `lastPrice`
    - Priority 4: Name only, no size, AI estimate or null price
  - Sets `pantryItemId` on each created `listItem` (for restock flow)
  - Write unit test covering all 4 priority paths

- [ ] **1.4** Add or verify `addAndSeedPantry` mutation to `convex/listItems.ts`
  - Signature: `addAndSeedPantry({ listId, name, category, size?, unit?, estimatedPrice, quantity })`
  - Creates the `listItem` entry with `priceSource: "manual"`
  - Creates a `pantryItem` with `{ name, category, stockLevel: "out", icon: getIconForItem(name, category) }`
  - Returns both IDs
  - Links `listItem.pantryItemId` to the new pantry item
  - Write unit test

- [ ] **1.5** Simplify `shoppingLists.create` mutation
  - Remove `normalizedStoreId` from required/expected params (store set separately now)
  - Keep `name` and `budget` (budget defaults to 50 on client side)
  - Verify existing creation tests still pass
  - Update any tests that pass `normalizedStoreId` to `create`

---

## Phase 2: List Creation Simplification

Modify the lists screen to use the simplified creation flow.

- [ ] **2.1** Modify creation modal in `app/(app)/(tabs)/lists.tsx`
  - Remove store selection chips (horizontal scroll) from the creation modal
  - Remove budget input from the creation modal (budget defaults to 50 via mutation)
  - Modal becomes: name input + "Create List" button only
  - On submit: `shoppingLists.create({ name, budget: 50 })` -> navigate to `/list/${id}`

- [ ] **2.2** Test the simplified creation flow
  - Manually verify: tap "New List" -> type name -> create -> lands on list detail
  - List detail shows budget dial at GBP50, no store selected
  - Verify existing list cards on lists screen still render correctly

---

## Phase 3: Action Row + Store Dropdown

Add the new header components to the list detail page.

- [ ] **3.1** Create `components/list/ListActionRow.tsx`
  - Three-button row: `[GBP Budget]` `[Store v]` `[+ Add Items]`
  - Props: `{ budget: number, storeName?: string, storeColor?: string, hasStore: boolean, onBudgetPress, onStorePress, onAddItemsPress }`
  - `[GBP Budget]` button calls `onBudgetPress` (opens existing `EditBudgetModal`)
  - `[Store v]` shows store name + brand colour dot when set, "Store" when unset
  - `[+ Add Items]` disabled (greyed, no haptic) when `hasStore` is false
  - Disabled state shows subtle hint text: "Pick a store to see prices"
  - Follow Glass UI design tokens for styling
  - Use `safeHaptics` for button feedback

- [ ] **3.2** Create `components/list/StoreDropdownSheet.tsx`
  - Bottom sheet using `@gorhom/bottom-sheet`
  - Props: `{ visible, onClose, onSelect: (storeId: string) => void, currentStoreId?: string, userFavorites: string[] }`
  - Two sections: "YOUR STORES" (user favorites) and "ALL STORES" (remaining from 20)
  - Each row: brand colour dot + store display name + checkmark if currently selected
  - Tapping a store from "ALL STORES" also adds it to user favorites
  - On select: calls `onSelect(storeId)` -> parent calls `setStore` mutation -> sheet closes
  - Glass UI styling, store colours from `storeNormalizer.ts`

- [ ] **3.3** Integrate action row into `app/(app)/list/[id].tsx` header
  - Add `ListActionRow` below the existing `CircularBudgetDial`
  - Wire `onBudgetPress` to existing `setShowEditBudgetModal(true)`
  - Wire `onStorePress` to new `showStoreSheet` state
  - Wire `onAddItemsPress` to new `showAddItemsModal` state (placeholder for Phase 4)
  - `hasStore` derived from `!!list?.normalizedStoreId`
  - `storeName` and `storeColor` derived from `list?.normalizedStoreId` via store lookup

- [ ] **3.4** Wire `StoreDropdownSheet` into `list/[id].tsx`
  - State: `showStoreSheet` boolean
  - On store select: call `setStore` mutation, close sheet
  - When store first set on a list with existing items: call `switchStore` instead (re-prices items)
  - When store set on empty list: call `setStore` (no items to re-price)

- [ ] **3.5** Test action row + store dropdown
  - Verify: budget button opens existing EditBudgetModal
  - Verify: store dropdown shows user favorites first, all stores below
  - Verify: selecting store updates button to show store name + colour
  - Verify: "+ Add Items" transitions from disabled to active after store selection
  - Verify: dial tap still opens EditBudgetModal (unchanged)
  - Verify: StickyBudgetBar still works on scroll (unchanged)

---

## Phase 4: Add Items Modal

The main new component. Replaces the inline `AddItemForm`.

- [ ] **4.1** Create `components/list/AddItemsModal.tsx` -- search + suggestions scaffold
  - Full-screen modal (or large bottom sheet)
  - Header: "ADD ITEMS" + close button
  - Dual-purpose search input: placeholder "Search or add items..."
  - "Add from Pantry" button pinned at bottom, always visible
  - Props: `{ visible, onClose, listId, listStoreName, listStoreId, existingItems }`
  - Initial state: empty search, empty state message

- [ ] **4.2** Add fuzzy search + suggestions (State B)
  - Move fuzzy matching logic from existing `AddItemForm` into this modal
  - As user types: query pantry items + `itemVariants` for matches
  - Show suggestion list with item icons
  - Move "Did you mean?" chip (existing feature) into this modal
  - Move `useVariantPrefetch` hook into this modal for cache warming

- [ ] **4.3** Add "no matches" new item flow (State C)
  - When search term has no matches and user submits (Return key or explicit button):
    - Show card: "[Item Name] is not in your pantry. Add as new item?"
    - Two buttons: "No" (dismiss) and "Yes" (expand manual entry)
  - On "Yes": expand form fields below:
    - Category dropdown (auto-suggested from item name via existing AI categorisation or heuristic)
    - Size input (optional, placeholder: "e.g. 150g, 6 pack")
    - Price input (GBP, AI estimate shown as hint if available)
    - Quantity stepper (default 1)
    - "Add to List" button
  - On "Add to List": call `addAndSeedPantry` mutation (Phase 1.4)
  - Clear search, ready for next item (modal stays open)

- [ ] **4.4** Add known item size cards (State D)
  - When user taps a suggestion from State B:
    - Query `itemVariants.getSizesForStore({ itemName, store: listStoreId })`
    - Animate size cards in below the search bar (Reanimated layout animation)
    - Pre-select "usual" size if exists (star badge)
    - Show "Or enter your price" input below cards
    - Show quantity stepper
    - Show "Add to List" button
  - On size card tap: select that size + price
  - On custom price entry: override selected price, set `priceOverride: true`
  - On "Add to List": call `listItems.add()` mutation
  - Clear search, collapse size cards, ready for next item

- [ ] **4.5** Wire "Add from Pantry" button
  - On tap: close modal, navigate to `/pantry-pick?listId=${listId}&storeId=${listStoreId}`
  - Navigation uses `router.push()` with only IDs as params

- [ ] **4.6** Test AddItemsModal
  - Test: type known item -> see suggestions -> tap -> see size cards -> add -> item clears, modal stays
  - Test: type unknown item -> submit -> see "not in pantry" prompt -> Yes -> fill fields -> add
  - Test: "not in pantry" -> No -> prompt dismissed, search remains
  - Test: custom price overrides size card price
  - Test: "Add from Pantry" navigates correctly with params
  - Test: modal stays open after adding, can add multiple items in sequence

---

## Phase 5: Pantry Pick Dual-Mode

Modify the pantry pick screen for individual vs bulk behaviour.

- [ ] **5.1** Update pantry pick screen for mode detection
  - Read `storeId` from route params (in addition to existing `listId`)
  - On "Add Selected" tap:
    - If `selectedItems.length === 1`: open `SizePriceModal` (EXISTING) for that item with store context
    - If `selectedItems.length > 1`: call `addFromPantryBulk` mutation (Phase 1.3)
  - Update the "Add Selected (N)" button text to reflect count

- [ ] **5.2** Wire individual add (1 item) flow
  - Open existing `SizePriceModal` with: `{ itemName, storeName, storeId }` from route params
  - On size/price select: call `listItems.add()` mutation with `pantryItemId`
  - On complete: `router.back()` to list detail
  - Item appears via Convex reactivity

- [ ] **5.3** Wire bulk add (2+ items) flow
  - Call `addFromPantryBulk({ listId, pantryItemIds })` mutation
  - Show brief loading state while mutation runs
  - On complete: `router.back()` to list detail
  - All items appear via Convex reactivity with default sizes/prices
  - User can tap any item to edit size/price inline (EXISTING ShoppingListItem behaviour)

- [ ] **5.4** Test pantry pick dual-mode
  - Test: select 1 item -> SizePriceModal opens -> add -> back to list, item visible
  - Test: select 3 items -> bulk add -> back to list, all 3 items visible with sizes/prices
  - Test: bulk add items with variants -> verify highest commonality size used
  - Test: bulk add items without variants -> verify defaultSize used
  - Test: bulk add items with no data -> verify they appear with name, no size, price TBD

---

## Phase 6: Remove Old Code + Integration Testing

Clean up replaced code and verify the full flow end-to-end.

- [ ] **6.1** Remove inline `AddItemForm` from `list/[id].tsx`
  - Remove the `AddItemForm` component usage from the list detail page
  - Remove related state: `addFormVisible`, any progressive disclosure logic for old form
  - Keep the import if `AddItemForm` is used elsewhere; delete file if not
  - Verify no dead imports remain

- [ ] **6.2** Remove store chips from `lists.tsx` creation modal (if not done in Phase 2)
  - Clean up any remaining store selection UI in the creation modal
  - Remove unused store-related state from the modal

- [ ] **6.3** Orphaned list cleanup
  - Add background logic (cron or on-load check) to clean up lists with no items and no store
    older than 24 hours
  - Or: handle on lists screen -- show "incomplete" state for lists with no items, allow delete

- [ ] **6.4** Full integration test: new list flow
  - Create new list -> lands on list detail with GBP50 budget
  - Select store via dropdown -> "+ Add Items" activates
  - Add known item via modal (search -> size card -> add)
  - Add new item via modal ("not in pantry" -> manual entry -> add)
  - Verify both items appear in list with correct prices
  - Verify budget dial updates correctly
  - Verify new item also appears in pantry (seeded)

- [ ] **6.5** Full integration test: pantry flow
  - From list detail, open AddItemsModal -> "Add from Pantry"
  - Select 1 item -> SizePriceModal -> add -> back to list
  - Re-open modal -> "Add from Pantry" again
  - Select 3 items -> bulk add -> back to list
  - Verify all 4 items in list, first with chosen size, last 3 with defaults

- [ ] **6.6** Full integration test: downstream flow preserved
  - With items in list, tap "Go Shopping" -> shopping mode works
  - Check off items -> budget dial updates spent
  - Mid-shop add -> works (MidShopModal unchanged)
  - Complete shopping -> pantry restocks for items with `pantryItemId`
  - Store comparison appears at 3+ items
  - Switch store via comparison -> items re-price correctly

- [ ] **6.7** Run full test suite
  - `npm test` -- all unit tests passing
  - `npm run typecheck` -- no type errors
  - `npm run lint` -- no lint errors
  - Manual smoke test on device via Metro

---

## Execution Notes

**Phase dependencies:**

```
Phase 1 (backend) ─────────────────────────────────────┐
                                                        │
Phase 2 (create simplify) ─── can run parallel ────────│
                                                        │
Phase 3 (action row + store) ── depends on 1.2 ────────┤
                                                        │
Phase 4 (add items modal) ── depends on 1.3, 1.4, 3.x ┤
                                                        │
Phase 5 (pantry dual-mode) ── depends on 1.3, 4.5 ─────┤
                                                        │
Phase 6 (cleanup + testing) ── depends on ALL above ────┘
```

**Parallel opportunities:**

- Phase 1 and Phase 2 can run in parallel (no dependencies between them)
- Phase 3.1 (ListActionRow) and Phase 3.2 (StoreDropdownSheet) can be built in parallel
- Phase 4.1-4.2 (search scaffold) and Phase 4.3 (new item flow) can be built in parallel
- Phase 5 can start once Phase 4.5 is done (pantry navigation wired)

**Files changed summary:**

| Phase | New Files | Modified Files |
|-------|-----------|----------------|
| 1     | `convex/lib/priceResolver.ts` | `convex/itemVariants.ts`, `convex/shoppingLists.ts`, `convex/listItems.ts` |
| 2     | -- | `app/(app)/(tabs)/lists.tsx` |
| 3     | `components/list/ListActionRow.tsx`, `components/list/StoreDropdownSheet.tsx` | `app/(app)/list/[id].tsx` |
| 4     | `components/list/AddItemsModal.tsx` | `app/(app)/list/[id].tsx` |
| 5     | -- | Pantry pick screen |
| 6     | -- | `app/(app)/list/[id].tsx`, `app/(app)/(tabs)/lists.tsx` |

**Risk mitigation:**

- Phase 1 is pure backend -- zero UI risk, fully testable in isolation
- Phase 3 adds components WITHOUT removing old ones -- old flow still works as fallback
- Phase 4 replaces `AddItemForm` -- this is the highest-risk phase, do it last before cleanup
- Phase 6 cleanup is the point of no return -- only do after all integration tests pass
