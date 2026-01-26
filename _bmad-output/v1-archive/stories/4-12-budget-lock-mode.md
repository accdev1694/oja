# Story 4-12: Budget Lock Mode

## Story

**As a** user,
**I want** to enable a hard budget cap,
**So that** I physically cannot add items that exceed my budget.

## Status

- **Status:** review
- **Epic:** 4 - Shopping Lists & Budget Control
- **Created:** 2026-01-26
- **Completed:** 2026-01-26

## Acceptance Criteria

**Given** I have set a budget
**When** I enable Budget Lock Mode
**Then** a lock icon appears on the budget display

**Given** Budget Lock is enabled
**When** I try to add an item that would exceed budget
**Then** I see a warning before adding
**And** the system suggests removing nice-to-have items first

## Technical Notes

### Existing Resources

- `ShoppingList` interface in shoppingListStorage.ts
- `SafeZoneBar` component for budget display
- `AddItemToListSheet` for adding items
- Nice-to-have items already tracked via priority='want'

### Implementation Approach

1. Add `budgetLocked` boolean to ShoppingList type
2. Add lock toggle button to SafeZoneBar
3. Create BudgetLockWarning dialog component
4. Intercept item addition when locked and would exceed budget
5. Show suggestions to remove nice-to-have items

### Design Decisions

- Lock toggle only visible when budget is set
- Lock icon clearly indicates locked state
- Warning is supportive, not blocking (user can still proceed)
- Suggestions prioritize nice-to-have items for removal

## Tasks/Subtasks

- [x] Create story file
- [x] Add budgetLocked field to ShoppingList type and storage
- [x] Add lock toggle to SafeZoneBar
- [x] Create BudgetLockWarning dialog
- [x] Intercept item addition when over budget
- [x] Show removal suggestions
- [x] Write tests (17 tests)
- [x] Manual testing

## Dev Agent Record

### Implementation Plan
- Extend ShoppingList interface with budgetLocked
- Add lock/unlock toggle in SafeZoneBar header
- Create warning dialog shown when adding would exceed locked budget
- Calculate nice-to-have items that could be removed

### Debug Log


### Completion Notes

All acceptance criteria met:
- Lock toggle button added to SafeZoneBar (visible when budget is set)
- Lock/unlock icons indicate state clearly
- BudgetLockWarning dialog shown when adding item would exceed locked budget
- Dialog suggests nice-to-have items that could be removed (sorted by price, limited to 3)
- User can proceed anyway or cancel
- 17 tests covering all functionality
- 1028 total tests passing

## File List

*Files created/modified during implementation:*

- `src/lib/utils/shoppingListStorage.ts` - Added budgetLocked field to ShoppingList interface
- `src/components/lists/SafeZoneIndicator.tsx` - Added LockIcon, UnlockIcon, lock toggle to SafeZoneBar
- `src/components/lists/BudgetLockWarning.tsx` (created) - Warning dialog component
- `src/components/lists/index.ts` - Added export for BudgetLockWarning
- `src/app/(app)/lists/[id]/page.tsx` - Integrated budget lock functionality
- `src/components/lists/__tests__/BudgetLockWarning.test.tsx` (created) - 17 tests

## Change Log

- 2026-01-26: Story file created
- 2026-01-26: Implementation complete
