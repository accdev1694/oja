# Single Mode List Implementation Plan

## Overview

Remove `active`/`shopping`/`paused` status distinction while preserving trip completion events for gamification, price learning, and analytics.

## Core Concept

- All lists are "live" (users can check items anytime)
- Trip boundaries defined by explicit user actions:
  - **Trip Start:** First item checked OR manual "Start Trip" button (optional for partnerships)
  - **Trip Finish:** Explicit "Finish Trip" action → triggers gamification/price learning
- Checked items stay visible with strike-through (no separate section)

---

## Phase 1: Database Schema Updates

### 1.1 Update shoppingLists table schema

**File:** `convex/schema.ts`

- [ ] Change `status` field from enum to simplified version:
  ```typescript
  // OLD: v.union(v.literal("active"), v.literal("shopping"), v.literal("paused"), v.literal("completed"), v.literal("archived"))
  // NEW: v.union(v.literal("active"), v.literal("completed"), v.literal("archived"))
  ```
- [ ] Keep `shoppingStartedAt` (tracks first check or manual start)
- [ ] Keep `completedAt` (tracks trip finish)
- [ ] Remove `pausedAt` (no longer needed)
- [ ] Keep `activeShopperId` (optional for partnerships - "currently editing")

### 1.2 Migration script

**File:** `convex/migrations/collapseShoppingModes.ts`

- [ ] Create migration to update existing lists:
  ```typescript
  // "shopping" → "active"
  // "paused" → "active"
  // "completed" → "completed" (unchanged)
  ```
- [ ] Clear `pausedAt` field for all lists
- [ ] Test migration on dev data

---

## Phase 2: Backend API Updates

### 2.1 Update shoppingLists.ts mutations

**File:** `convex/shoppingLists.ts`

- [ ] Remove `startShopping` mutation (replaced by auto-detection)
- [ ] Remove `pauseShopping` mutation (no longer needed)
- [ ] Keep `completeShopping` mutation → rename to `finishTrip`
  - Still triggers gamification
  - Still locks actual prices
  - Still enables receipt scanning
- [ ] Add new `markTripStart` mutation (optional - for partnerships):
  ```typescript
  export const markTripStart = mutation({
    args: { id: v.id('shoppingLists') },
    handler: async (ctx, args) => {
      // Set shoppingStartedAt if not already set
      // Set activeShopperId to current user
    },
  })
  ```

### 2.2 Update listItems.ts - Auto trip start

**File:** `convex/listItems.ts`

- [ ] Modify `toggleChecked` mutation:
  - When item is checked AND list.shoppingStartedAt is null
  - Auto-set `shoppingStartedAt: Date.now()`
  - Auto-set `activeShopperId` (for partnerships)
- [ ] Keep actualPrice update logic (mid-shop modal still works)

### 2.3 Update query responses

**File:** `convex/shoppingLists.ts`

- [ ] Update `getById` to return calculated `isInProgress`:
  ```typescript
  isInProgress: list.shoppingStartedAt != null && list.completedAt == null
  ```
- [ ] Update `getAll` to include `isInProgress` flag
- [ ] Remove status-based filtering (everything is "active" or "completed")

---

## Phase 3: Frontend UI Updates

### 3.1 List detail screen (main refactor)

**File:** `app/(app)/list/[id].tsx`

#### Remove mode switching UI:

- [ ] Remove "Start Shopping" button (line ~1100)
- [ ] Remove "Pause Shopping" button (line ~1138)
- [ ] Remove pause banner (lines 1130-1142)
- [ ] Remove "Go Shopping" animation (goShoppingAnimStyle)

#### Update action row:

- [ ] Replace mode-aware actions with unified actions:
  - **Planning state** (no items checked): "Add Items", "Health Check", "Refresh Prices"
  - **In-progress state** (items checked, not finished): "Finish Trip", "Add Items", "Health Check"
  - **Completed state**: "View Receipt", "Copy List"
- [ ] Keep "Finish Trip" button prominent when items are checked

#### Update budget dial:

- [ ] Pass `mode: "active"` always (or remove mode prop entirely)
- [ ] Let dial show both planned + spent arcs simultaneously
- [ ] Update subtitle from mode-aware to: `"{checkedCount}/{totalCount} items"`

#### Checked items visibility:

- [ ] Remove "Checked Items" collapsible section logic (lines 391-456)
- [ ] Keep checked items in their categories with strike-through
- [ ] Add visual differentiation:
  ```typescript
  // In ShoppingListItem.tsx
  textDecorationLine: item.isChecked ? 'line-through' : 'none'
  opacity: item.isChecked ? 0.6 : 1.0
  ```
- [ ] Sort checked items to bottom of each category (optional)

### 3.2 Budget dial component

**File:** `components/ui/glass/CircularBudgetDial.tsx`

- [ ] Simplify mode logic:
  ```typescript
  // OLD: isPlanning = mode === 'active', isShopping = mode === 'shopping'
  // NEW: Always show both arcs, no opacity switching
  ```
- [ ] Update sentiment messages (remove mode-specific language):
  ```typescript
  // OLD: "Fits your budget — lots of room" (planning) vs "On track — stay focused" (shopping)
  // NEW: "Planned: £50 | Spent: £35 | Left: £15"
  ```
- [ ] Keep arc color logic (green → amber → red based on ratio)
- [ ] Remove transition animations between modes

### 3.3 Shopping list item component

**File:** `components/list/ShoppingListItem.tsx`

- [ ] Add strike-through style when checked:
  ```typescript
  const textStyle = [styles.itemName, item.isChecked && styles.checkedText]
  // styles.checkedText: { textDecorationLine: 'line-through', opacity: 0.6 }
  ```
- [ ] Keep checkbox animation (flash effect)
- [ ] Keep swipe-to-delete functionality
- [ ] Update toggle handler to auto-start trip if needed (backend handles this)

### 3.4 List card component

**File:** `components/lists/ListCard.tsx`

- [ ] Remove status badge ("Shopping", "Paused")
- [ ] Update progress indicator:
  ```typescript
  // Show checked/total instead of mode-specific text
  '{checkedCount}/{totalCount} items' + (isInProgress ? ' • In progress' : '')
  ```
- [ ] Update "Resume" action to just "Open" (no pause state)

### 3.5 Trip summary modal

**File:** `components/list/modals/TripSummaryModal.tsx`

- [ ] Update trigger condition:
  ```typescript
  // OLD: List status changes to "completed"
  // NEW: finishTrip mutation completes
  ```
- [ ] Keep all existing content (stats, receipt scan prompt, etc.)
- [ ] Update title from "Trip Complete!" to "Finish Shopping Trip?"
- [ ] Add confirmation step before actually finishing:
  - "Did you complete this shopping trip?"
  - "Yes, Finish Trip" → calls finishTrip()
  - "No, Keep Editing" → dismisses modal

---

## Phase 4: Partnership Features

### 4.1 Update active shopper indicator

**File:** `app/(app)/list/[id].tsx`

- [ ] Change from "Sarah is shopping" to "Sarah is editing"
- [ ] Show last activity timestamp: "Updated 2 min ago"
- [ ] Remove pause/resume in partnership context
- [ ] Keep real-time updates via `activeShopperId`

### 4.2 Update partner role logic

**File:** `hooks/usePartnerRole.ts`

- [ ] Remove mode-based permission checks
- [ ] Simplify to: viewer (read-only), editor (can check/add), approver (can finish trip)
- [ ] Update permission boundaries:
  - **Viewer:** Can't check items or finish trip
  - **Editor:** Can check items, can't finish trip
  - **Approver:** Can do everything

---

## Phase 5: Gamification & Analytics

### 5.1 Ensure trip completion still triggers rewards

**File:** `convex/insights.ts`

- [ ] Verify `updateStreak` is called from `finishTrip` (not `completeShopping`)
- [ ] Verify achievements check trip completion (search for "trip_completed" event)
- [ ] Test weekly challenges still track completed trips

### 5.2 Update analytics queries

**File:** `convex/analytics.ts`, `convex/analytics_advanced.ts`

- [ ] Replace status-based queries:
  ```typescript
  // OLD: .filter(q => q.eq(q.field("status"), "completed"))
  // NEW: .filter(q => q.neq(q.field("completedAt"), undefined))
  ```
- [ ] Update trip duration calculation (still uses shoppingStartedAt → completedAt)
- [ ] Update cohort metrics (completed trips per user)

### 5.3 Update admin dashboard

**File:** `convex/admin.ts`

- [ ] Remove "Paused Lists" metric
- [ ] Update "Active Trips" to "In-Progress Lists":
  ```typescript
  shoppingStartedAt != null && completedAt == null
  ```
- [ ] Update list moderation (remove status filtering)

---

## Phase 6: Voice Assistant & AI

### 6.1 Update voice tools

**File:** `convex/lib/voiceTools.ts`

- [ ] Remove "start shopping" / "pause shopping" intents
- [ ] Keep "finish trip" intent → calls finishTrip()
- [ ] Update "what's my progress" response:
  ```typescript
  // OLD: "You're shopping and have checked 5 of 12 items"
  // NEW: "You have 5 of 12 items checked. Ready to finish your trip?"
  ```

### 6.2 Update AI health analysis

**File:** `convex/ai.ts`

- [ ] Remove mode-specific suggestions (e.g., "Start shopping to track actual prices")
- [ ] Update prompts to be mode-agnostic

---

## Phase 7: Testing

### 7.1 Unit tests

**Files:** `__tests__/shoppingLists/*.test.ts`, `__tests__/listItems/*.test.ts`

- [ ] Update test factories to remove `status: "shopping"`
- [ ] Test auto trip start on first item check
- [ ] Test `finishTrip` triggers gamification
- [ ] Test migration script with sample data
- [ ] Test partnership permissions (editor can't finish trip)

### 7.2 E2E tests

**Files:** `e2e/tests/shopping-flow.spec.ts`

- [ ] Update shopping journey:
  ```typescript
  // OLD: Click "Start Shopping" → Check items → Click "Finish"
  // NEW: Check items → Click "Finish Trip"
  ```
- [ ] Test checked items stay visible with strike-through
- [ ] Test trip completion modal flow
- [ ] Test receipt scan after trip finish
- [ ] Test partnership: viewer can't finish trip

### 7.3 Manual testing checklist

- [ ] Create new list → check item → verify auto trip start
- [ ] Check all items → tap "Finish Trip" → verify modal appears
- [ ] Confirm trip finish → verify gamification (achievement toast)
- [ ] Scan receipt after trip → verify reconciliation view
- [ ] Partnership: Editor checks items, approver finishes trip
- [ ] Budget dial shows correct planned/spent arcs
- [ ] Analytics page shows correct trip stats

---

## Phase 8: Migration & Deployment

### 8.1 Pre-deployment

- [ ] Run migration script in staging environment
- [ ] Verify existing trips preserve completion timestamps
- [ ] Verify in-progress trips (status="shopping") convert to active
- [ ] Test backward compatibility (old receipts still link to trips)

### 8.2 Deployment sequence

1. [ ] Deploy backend changes (Convex schema + mutations)
2. [ ] Run migration script (convert shopping → active)
3. [ ] Deploy frontend changes (Expo update)
4. [ ] Monitor error logs for 24 hours
5. [ ] User announcement: "Simplified shopping mode - lists are always live!"

### 8.3 Post-deployment monitoring

- [ ] Track `finishTrip` mutation success rate
- [ ] Monitor gamification events (streaks, achievements)
- [ ] Check analytics dashboard for trip metrics
- [ ] User feedback: confusion about removed "Start Shopping" button?

---

## Edge Cases & Considerations

### Edge Case 1: User checks item by accident

**Solution:** Keep quick uncheck (tap checkbox again within 5 seconds)

### Edge Case 2: Trip started but never finished

**Solution:** Auto-archive lists with `shoppingStartedAt` > 30 days old and no `completedAt`

### Edge Case 3: Partnership - two users finish trip simultaneously

**Solution:** Optimistic locking - first finishTrip wins, second shows "Trip already completed"

### Edge Case 4: User wants to "pause" and resume later

**Solution:** No action needed - list stays in-progress, user can continue anytime

### Edge Case 5: Receipt scan without finishing trip

**Solution:** Receipt scan button triggers "Finish Trip" modal first, then proceeds to scan

---

## Rollback Plan

If critical issues arise:

1. **Backend rollback:**
   - Revert schema changes (restore `shopping`/`paused` status)
   - Revert migration (convert `active` → `shopping` for lists with shoppingStartedAt)
   - Restore `startShopping`/`pauseShopping` mutations

2. **Frontend rollback:**
   - Revert to previous Expo build
   - Restore "Start Shopping" button
   - Restore mode-aware budget dial

3. **Data integrity:**
   - No data loss (all fields preserved during migration)
   - Completed trips unchanged
   - Receipt links unchanged

---

## Success Metrics

After 2 weeks:

- [ ] Trip completion rate maintained (>80% of started trips finish)
- [ ] Gamification events unchanged (achievements, streaks)
- [ ] User confusion reports <5% (via support tickets)
- [ ] Budget dial engagement unchanged (taps on dial)
- [ ] Partnership usage unchanged (shared lists activity)

---

## Timeline Estimate

- **Phase 1-2 (Backend):** 2 days
- **Phase 3 (Frontend UI):** 3 days
- **Phase 4-6 (Partnerships, Gamification, Voice):** 2 days
- **Phase 7 (Testing):** 2 days
- **Phase 8 (Migration & Deployment):** 1 day

**Total:** ~10 days (with buffer for edge cases)

---

## Files Affected (Summary)

### Backend (Convex)

- `convex/schema.ts` - Simplify status enum
- `convex/shoppingLists.ts` - Remove startShopping/pauseShopping, rename completeShopping
- `convex/listItems.ts` - Auto trip start on first check
- `convex/insights.ts` - Verify gamification triggers
- `convex/analytics.ts` - Update status-based queries
- `convex/admin.ts` - Remove paused metrics
- `convex/lib/voiceTools.ts` - Remove mode intents
- `convex/ai.ts` - Remove mode-specific prompts
- `convex/migrations/collapseShoppingModes.ts` - NEW migration script

### Frontend (React Native)

- `app/(app)/list/[id].tsx` - Main refactor (remove mode UI)
- `components/list/ShoppingListItem.tsx` - Add strike-through style
- `components/ui/glass/CircularBudgetDial.tsx` - Simplify mode logic
- `components/lists/ListCard.tsx` - Remove status badge
- `components/list/modals/TripSummaryModal.tsx` - Update trigger
- `hooks/usePartnerRole.ts` - Remove mode permissions

### Tests

- `__tests__/shoppingLists/*.test.ts` - Update factories
- `e2e/tests/shopping-flow.spec.ts` - Update journey

**Total files:** ~18 files modified, 1 new migration file

---

## Next Steps

1. User reviews this plan and approves
2. Spawn parallel sub-agents for:
   - Backend changes (Phase 1-2)
   - Frontend changes (Phase 3)
   - Testing updates (Phase 7)
3. Execute phase by phase, checking off items
4. Delete this file when complete
