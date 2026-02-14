# Multi-Store Shopping & Multi-Receipt Support — Execution Plan

**Context:** Users sometimes shop at multiple stores in one trip. The current architecture is single-store-per-list and single-receipt-per-list. This plan adds: (A) lightweight mid-shopping store switching, (B) multi-receipt support per list, and (C) receipt-time store mismatch detection so price intelligence stays clean.

**Key design principle:** Zero added friction during item check-off. Store context is ambient (one switch per store visit, not per item). Receipts are the authoritative correction mechanism.

---

## Phase 1: Schema — Per-Item Store + Multi-Receipt Support

Foundation changes that everything else depends on.

- [ ] Add `purchasedAtStoreId: v.optional(v.string())` to `listItems` in `convex/schema.ts` — records which store the item was actually bought at (auto-filled from list's current store at check-off time)
- [ ] Add `purchasedAtStoreName: v.optional(v.string())` to `listItems` in `convex/schema.ts` — display name for the store
- [ ] Change `receiptId: v.optional(v.id("receipts"))` to `receiptIds: v.optional(v.array(v.id("receipts")))` on `shoppingLists` in `convex/schema.ts`
- [ ] Add `storeSegments: v.optional(v.array(v.object({ storeId: v.string(), storeName: v.string(), switchedAt: v.number() })))` to `shoppingLists` — tracks the chronological list of stores visited during the trip
- [ ] Add index `by_list` on `receipts` table if not already present (already exists — verify)

**Files:** `convex/schema.ts`

---

## Phase 2: Backend — Store-Aware Check-Off + Mid-Shop Switch

- [ ] Update `toggleChecked` in `convex/listItems.ts` — when checking an item ON (not unchecking), auto-fill `purchasedAtStoreId` and `purchasedAtStoreName` from the parent list's current `normalizedStoreId` and `storeName`
- [ ] Create `switchStoreMidShop` mutation in `convex/shoppingLists.ts` — lightweight store switch during shopping:
  - Only works when `status === "shopping"`
  - Updates `normalizedStoreId` and `storeName` on the list
  - Appends to `storeSegments` array: `{ storeId, storeName, switchedAt: Date.now() }`
  - Does NOT re-price any items (unlike `switchStore` which is for planning mode)
  - Does NOT touch checked items at all
- [ ] Update `completeShopping` in `convex/shoppingLists.ts` — calculate per-store subtotals from `purchasedAtStoreId` on checked items and return them
- [ ] Update `getTripStats` query — add `storeBreakdown` to response: `Array<{ storeId: string, storeName: string, itemCount: number, subtotal: number }>`

**Files:** `convex/listItems.ts`, `convex/shoppingLists.ts`

---

## Phase 3: Backend — Multi-Receipt Linking

- [ ] Update `linkToList` in `convex/receipts.ts`:
  - Instead of patching `list.receiptId = receiptId`, push to `list.receiptIds` array (or create array with single element if first receipt)
  - Keep `receipt.listId` as-is (each receipt still points to one list)
  - During item matching, also set `purchasedAtStoreId` on matched items from the receipt's `normalizedStoreId`
- [ ] Update `archiveList` in `convex/shoppingLists.ts` — accept optional `receiptId` and push to `receiptIds` array instead of overwriting
- [ ] Update `getTripSummary` query — fetch all receipts via `receiptIds` array, aggregate totals per store
- [ ] Migrate existing data: add an internal mutation that converts any existing `receiptId` (single) to `receiptIds` (array) for backward compatibility. Run once.

**Files:** `convex/receipts.ts`, `convex/shoppingLists.ts`

---

## Phase 4: Backend — Receipt Store Mismatch Detection

- [ ] Add `detectStoreMismatch` query in `convex/receipts.ts`:
  - Args: `{ receiptId, listId }`
  - Compares `receipt.normalizedStoreId` vs `list.normalizedStoreId`
  - Also checks against `list.storeSegments` — if the receipt's store matches ANY segment, it's not a mismatch
  - Returns `{ isMismatch: boolean, receiptStore: string, listStore: string, isKnownSegment: boolean }`
- [ ] Use this in the reconciliation flow (Phase 6) to show a warning/prompt

**Files:** `convex/receipts.ts`

---

## Phase 5: UI — Mid-Shopping Store Switch

- [ ] Add a "Switch Store" button to the shopping mode UI in `list/[id].tsx`:
  - Place it in the shopping mode button row (alongside "Edit List", "Add Item", "Complete")
  - Use `store-marker` or `swap-horizontal` icon, secondary variant
  - On press, open a lightweight store picker (reuse `StoreDropdownSheet`)
- [ ] Wire up `switchStoreMidShop` mutation — on store selection:
  - Call mutation
  - Show toast: "Switched to Sainsbury's"
  - Update the `ShoppingTypewriterHint` to reflect new store name
  - Budget dial store label updates automatically (already reactive from list query)
- [ ] Update `ShoppingTypewriterHint` — it already accepts `storeName` prop; just ensure it updates reactively when store changes mid-session

**Files:** `app/(app)/list/[id].tsx`, `components/list/StoreDropdownSheet.tsx` (if changes needed)

---

## Phase 6: UI — Receipt Store Mismatch Warning

- [ ] Update `reconciliation.tsx` — before completing the trip, check `detectStoreMismatch`:
  - If receipt store matches list store (or any store segment): proceed normally
  - If mismatch: show a warning card:
    - "This receipt is from **Sainsbury's**, but your list was for **Tesco**."
    - Option A: "Tag matched items as bought at Sainsbury's" (sets `purchasedAtStoreId` on matched items)
    - Option B: "Ignore — keep all items as Tesco"
  - This ensures price intelligence data stays clean without requiring user action during shopping
- [ ] Update the scan tab (`scan.tsx`) — when user selects a list to link, show the list's store name so they can see if it matches the receipt they're about to scan

**Files:** `app/(app)/receipt/[id]/reconciliation.tsx`, `app/(app)/(tabs)/scan.tsx`

---

## Phase 7: UI — Trip Summary Per-Store Breakdown

- [ ] Update `TripSummaryModal` — if `storeBreakdown` has more than one store, show a per-store section:
  - "Tesco: £32.50 (8 items)"
  - "Sainsbury's: £7.20 (2 items)"
  - Total: £39.70
  - Keep the existing budget result card (total vs budget) as the hero
- [ ] Update `useTripSummary` hook — add formatted `storeBreakdownLabels` from raw `storeBreakdown` data
- [ ] Update the reconciliation screen — show per-store totals when multiple receipts are linked

**Files:** `components/list/modals/TripSummaryModal.tsx`, `hooks/useTripSummary.ts`, `app/(app)/receipt/[id]/reconciliation.tsx`

---

## Phase 8: Backward Compatibility + Migration

- [ ] Handle `receiptId` → `receiptIds` migration:
  - Update all reads of `list.receiptId` across the codebase to check both `receiptId` (legacy) and `receiptIds` (new)
  - Search for all usages: `receiptId` in shoppingLists queries, getTripSummary, reconciliation, archive flow
  - Create a helper: `getReceiptIds(list)` that returns `list.receiptIds ?? (list.receiptId ? [list.receiptId] : [])`
- [ ] Update `listItems` queries/mutations that reference pricing — ensure `purchasedAtStoreId` is optional and backward-compatible (undefined = inherited from list store)
- [ ] Run existing test suite to verify no regressions

**Files:** Multiple — grep for `receiptId` across `convex/` and `app/`

---

## Phase 9: Testing & Verification

- [ ] Test: Single-store trip (unchanged behavior, no regressions)
- [ ] Test: Start at Tesco → switch to Aldi mid-shop → check items → complete → verify per-store breakdown
- [ ] Test: Scan Tesco receipt for Tesco list → no mismatch warning
- [ ] Test: Scan Sainsbury's receipt for Tesco list → mismatch warning shown → tag items correctly
- [ ] Test: Scan two receipts (Tesco + Sainsbury's) for same list → both linked, per-store totals correct
- [ ] Test: Price intelligence — verify receipt-scanned prices from Sainsbury's receipt go into currentPrices under Sainsbury's, not Tesco
- [ ] Test: `purchasedAtStoreId` populated correctly on checked items during shopping
- [ ] Test: Legacy lists with `receiptId` (not array) still display correctly
- [ ] Run `npm run typecheck` and `npm run lint`
- [ ] Run existing E2E suite

**Files:** `__tests__/`, E2E specs

---

## Execution Notes

- **Phases 1-2** are the core: schema + store-aware check-off + mid-shop switch mutation. Ship together.
- **Phase 3** (multi-receipt) is the highest-value backend change — enables receipt-time correction.
- **Phase 4** (mismatch detection) is what makes multi-receipt useful — without it, mismatched receipts silently corrupt data.
- **Phase 5** (mid-shop switch UI) is the user-facing feature — simple UI change since the backend is ready.
- **Phase 6** (mismatch warning) is the safety net for users who don't manually switch stores.
- **Phase 7** (per-store breakdown) is polish that makes multi-store trips visible.
- **Phase 8** must run alongside every phase — backward compatibility is critical.
- **Phase 9** after each phase, not just at the end.
