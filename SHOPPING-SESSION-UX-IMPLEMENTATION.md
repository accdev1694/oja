# Shopping Session UX Improvements - Execution Plan

**Goal:** Make list creation → shopping → completion boundaries clearer, softer, and more ceremonial so users always know where they are in the flow.

---

## Phase 1: Backend - `pauseShopping` + `resumeShopping` Mutations & Schema Update

Add the ability to pause/resume a shopping trip and revert to planning mode.

- [ ] Add `pausedAt` optional field to `shoppingLists` schema in `convex/schema.ts`
- [ ] Add `pauseShopping` mutation to `convex/shoppingLists.ts` — sets `status: "active"`, preserves `shoppingStartedAt`, records `pausedAt` timestamp
- [ ] Add `resumeShopping` mutation to `convex/shoppingLists.ts` — sets `status: "shopping"` from `active` when `shoppingStartedAt` already exists (i.e., a resumed trip, not a fresh start)
- [ ] Update `startShopping` to distinguish "first start" vs "resume" — if `shoppingStartedAt` already exists and `pausedAt` is set, clear `pausedAt` instead of overwriting `shoppingStartedAt`
- [ ] Add `getTripStats` query to `convex/shoppingLists.ts` — returns `{ checkedCount, uncheckedCount, uncheckedItems[], estimatedTotal, actualSpent, budgetRemaining, savings, tripDuration }` for use by the completion summary screen

**Files touched:** `convex/schema.ts`, `convex/shoppingLists.ts`

---

## Phase 2: "Back to Planning" — Make Shopping Mode Reversible

Allow users to exit shopping mode without completing.

- [ ] Add "Back to Planning" option to the shopping mode header in `app/(app)/list/[id].tsx` — an icon button (e.g., `pencil-outline`) in the GlassHeader that calls `pauseShopping`
- [ ] When paused, show a subtle banner at the top: "Paused trip — X items checked. Resume or keep editing." with a "Resume Shopping" button
- [ ] Wire up the resumed state: if `list.shoppingStartedAt` exists and `list.status === "active"`, show the resume banner instead of "Go Shopping"
- [ ] Ensure checked items and actual prices are preserved when pausing (they already are — just verify no data is lost on status revert)

**Files touched:** `app/(app)/list/[id].tsx`

---

## Phase 3: "Go Shopping" Confirmation Interstitial

Replace the instant mode switch with a brief confirmation that gives users a moment to verify readiness.

- [ ] Create `components/list/modals/StartShoppingModal.tsx` — a GlassCard bottom sheet showing:
  - List name + store name
  - Item count + estimated total vs budget
  - Warnings if: no store selected, budget not set, 0 items
  - "Start Shopping" primary CTA + "Not Yet" secondary
- [ ] Wire up in `list/[id].tsx`: "Go Shopping" button opens this modal instead of calling `startShopping` directly
- [ ] Export from `components/list/modals/index.ts`
- [ ] Add haptic feedback (medium on open, success on confirm)

**Files touched:** `components/list/modals/StartShoppingModal.tsx` (new), `components/list/modals/index.ts`, `app/(app)/list/[id].tsx`

---

## Phase 4: Shopping Completion Summary Screen

Replace the basic `alert()` with a proper full-screen summary showing trip results.

- [ ] Create `components/list/modals/TripSummaryModal.tsx` — a full-screen modal with:
  - **Header:** "Trip Complete" with a celebratory icon
  - **Stats row:** Items checked (X/Y), time in store, budget used
  - **Budget result:** Animated dial or bar showing spent vs budget (under/over with color coding)
  - **Savings callout:** "You saved £X vs estimates" (green) or "£X over estimates" (red)
  - **Unchecked items section** (if any):
    - Each unchecked item with 3 options: "Keep for next trip" / "Remove" / "Move to [other list]"
    - "Select All" to batch-handle unchecked items
  - **Pantry restock summary:** "X items restocked to pantry"
  - **Receipt prompt:** "Scan your receipt for exact prices" button → navigates to scan tab
  - **Finish button:** Primary CTA "Done" that commits the completion
- [ ] Create `hooks/useTripSummary.ts` — hook that calls `getTripStats` query and computes derived display values (duration formatting, savings percentage, etc.)
- [ ] Wire up in `list/[id].tsx`: "Complete" button opens `TripSummaryModal` instead of the alert dialog
- [ ] Handle unchecked item actions:
  - "Keep for next trip" — no action needed (items stay on list; a future list-clone feature could use them)
  - "Remove" — calls `removeItem` mutation
  - "Move to list" — reuses existing `ListPickerModal` + `addItem` flow
- [ ] After "Done" is pressed: call `completeShopping` + `restockFromCheckedItems`, then `router.back()`
- [ ] Export from `components/list/modals/index.ts`

**Files touched:** `components/list/modals/TripSummaryModal.tsx` (new), `hooks/useTripSummary.ts` (new), `components/list/modals/index.ts`, `app/(app)/list/[id].tsx`

---

## Phase 5: Visual Transition Polish

Add visual ceremony to the mode transitions so they feel like real-world moments.

- [ ] Add a brief animated transition when entering shopping mode:
  - Budget dial animates from "planned" color scheme to "tracking" color scheme (label changes from "planned" to "spent")
  - The dial should pulse once with a subtle glow on transition
- [ ] Update `CircularBudgetDial` to accept a `transitioning` prop that triggers a 600ms entrance animation (scale pulse + label crossfade)
- [ ] Update `ShoppingTypewriterHint` to include store name: "Shopping at **Tesco**... check items as you go"
- [ ] Add a subtle confetti/celebration animation on the Trip Summary modal when user is under budget (reuse `GlassAnimations` if applicable, or a lightweight Reanimated sequence)

**Files touched:** `components/ui/glass/CircularBudgetDial.tsx`, `components/list/ShoppingTypewriterHint.tsx`, `components/list/modals/TripSummaryModal.tsx`

---

## Phase 6: List Card Status Indicators

Improve the lists tab so users can see at a glance which lists are in which state.

- [ ] Update `ListCard.tsx` to show distinct visual states:
  - `active` — default glass card, "Planning" badge in teal
  - `active` + `shoppingStartedAt` set (paused) — "Paused" badge in amber/warning with progress indicator (e.g., "3/8 checked")
  - `shopping` — "Shopping" badge in orange with a subtle animated pulse dot
  - `completed` — "Completed" badge in gray with total spent
- [ ] Show item progress on card: "5/12 items" for active/shopping lists
- [ ] Show budget status on card: "£32 / £50" mini progress bar

**Files touched:** `components/lists/ListCard.tsx`

---

## Phase 7: Testing & Edge Cases

- [ ] Test: Start shopping → pause → add items → resume → complete (data integrity)
- [ ] Test: Start shopping → pause → edit budget → resume (budget changes reflected)
- [ ] Test: Complete with 0 checked items (should show "You didn't check any items" warning)
- [ ] Test: Complete with all items checked (no unchecked items section shown)
- [ ] Test: Partner adds item while owner is shopping → item appears in real-time
- [ ] Test: Multiple lists — one paused, one shopping (both shown correctly on lists tab)
- [ ] Test: Offline behavior — pause/resume with spotty connectivity
- [ ] Verify voice assistant (Tobi) works correctly with paused lists — "resume my shopping" voice command
- [ ] Run existing E2E suite to verify no regressions
- [ ] Run `npm run typecheck` and `npm run lint` — fix any issues

**Files touched:** `__tests__/` (new test files), existing E2E specs

---

## Execution Notes

- **Phases 1-2** are the core behavioral changes (backend + reversibility). Ship these first.
- **Phase 3** is a quick win that improves the "Go Shopping" moment.
- **Phase 4** is the highest-impact UX change — the Trip Summary screen.
- **Phases 5-6** are polish that can ship incrementally.
- **Phase 7** runs after each phase, not just at the end.
- Each phase should be tested before moving to the next.
