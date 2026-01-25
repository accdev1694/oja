# Story 3.8: Remove Pantry Item

Status: review

## Story

As a **user**,
I want **to remove items from my pantry**,
So that **I can keep my inventory accurate**.

## Acceptance Criteria

1. **Given** I am viewing a pantry item
   **When** I swipe right on the item
   **Then** I see a confirmation prompt
   **And** if confirmed, the item is removed from my pantry

2. **Given** I have removed an item
   **When** the item is deleted
   **Then** it is soft-deleted (can be restored within 7 days)
   **And** I see a success message with undo option

3. **Given** I accidentally deleted an item
   **When** I click the undo button within 5 seconds
   **Then** the item is restored to my pantry

## Tasks / Subtasks

- [x] **Task 1: Add Swipe Right Gesture**
  - [x] useSwipe hook already supports swipe right
  - [x] Add swipe right handler to PantryItem
  - [x] Visual feedback during swipe (red background, trash icon)

- [x] **Task 2: Create Confirmation Dialog**
  - [x] Create ConfirmDialog component
  - [x] Show item name in confirmation message
  - [x] Confirm/Cancel buttons

- [x] **Task 3: Implement Soft-Delete**
  - [x] Add deletedAt field to StockItem type
  - [x] Update removePantryItem to soft-delete
  - [x] Add restorePantryItem function
  - [x] Add cleanupDeletedItems function for items older than 7 days
  - [x] Update getPantryItems to filter deleted items

- [x] **Task 4: Add Undo Functionality**
  - [x] Show toast with undo option after delete
  - [x] Restore item when undo is clicked
  - [x] Auto-dismiss toast after 5 seconds

- [x] **Task 5: Add Tests**
  - [x] Tests for ConfirmDialog component (20 tests)
  - [x] All existing tests still pass (783 total)

- [x] **Task 6: Run build and verify**

## Dev Notes

### Architecture Compliance

**From Architecture Document:**
- Reusable components in `src/components/stock/`
- Follow existing swipe pattern from swipe-left (decrease stock)
- Use existing Toast component for undo messaging

### Existing Implementation

The following already works:
- Swipe left to decrease stock level (useSwipe hook)
- Toast with undo for swipe actions
- PantryItem component with gesture handlers

### What's Missing

1. Swipe right gesture support in useSwipe
2. Confirmation dialog component
3. Soft-delete implementation in storage
4. Restore functionality

### References

- [Source: epics.md#Story-3.8] - Acceptance criteria
- [Source: PantryItem.tsx] - Swipe gesture integration
- [Source: useSwipe.ts] - Swipe hook to extend
- [Source: Toast.tsx] - Undo pattern

## Dev Agent Record

### Agent Model Used

Claude Sonnet 4.5

### Debug Log References

### Completion Notes List

- Swipe right gesture fully implemented with visual feedback (red background, trash icon)
- ConfirmDialog component created with danger/primary variants and loading states
- Soft-delete functionality with 7-day restore window
- Toast with undo functionality restores deleted items
- All 783 tests passing (20 new tests for ConfirmDialog)
- Build successful with no TypeScript errors

### File List

- `src/lib/hooks/useSwipe.ts` (VERIFIED - already supported swipe right)
- `src/components/stock/PantryItem.tsx` (UPDATED - added swipe right handler and visual indicator)
- `src/components/stock/PantryGrid.tsx` (UPDATED - pass onItemSwipeRight through)
- `src/components/ui/ConfirmDialog.tsx` (CREATED - reusable confirmation dialog)
- `src/components/ui/index.ts` (UPDATED - export ConfirmDialog)
- `src/lib/utils/onboardingStorage.ts` (UPDATED - soft-delete, restore, cleanup functions)
- `src/app/(app)/pantry/page.tsx` (UPDATED - delete confirmation and undo handlers)
- `src/components/ui/__tests__/ConfirmDialog.test.tsx` (CREATED - 20 comprehensive tests)
