# Story 4-13: Impulse Fund

## Story

**As a** user,
**I want** a separate "impulse fund" budget,
**So that** I can buy unplanned items without breaking my main budget.

## Status

- **Status:** review
- **Epic:** 4 - Shopping Lists & Budget Control
- **Created:** 2026-01-26

## Acceptance Criteria

**Given** I am setting up my shopping list
**When** I tap "Add Impulse Fund"
**Then** I can set a separate amount (e.g., £10)

**Given** I have an impulse fund
**When** I add an item and mark it as "impulse"
**Then** it deducts from impulse fund, not main budget
**And** both budgets display separately

## Technical Notes

### Existing Resources

- `ShoppingList` interface in shoppingListStorage.ts
- `ItemPriority` type already includes 'impulse'
- `BudgetEditSheet` for editing budget
- `SafeZoneBar` for budget display
- `AddItemToListSheet` for adding items

### Implementation Approach

1. Add `impulseFund` field to ShoppingList type (nullable number in pence)
2. Update BudgetEditSheet to allow setting impulse fund
3. Update SafeZoneBar to display both budgets when impulse fund is set
4. Update AddItemToListSheet to allow marking items as "impulse"
5. Calculate impulse items total separately from main budget
6. Show impulse fund usage with its own indicator

### Design Decisions

- Impulse fund is optional (null when not set)
- Items with priority='impulse' use impulse fund
- Main budget excludes impulse items
- Both totals display in the SafeZoneBar when impulse fund is set
- Impulse fund has its own mini progress indicator

## Tasks/Subtasks

- [x] Create story file
- [x] Add impulseFund field to ShoppingList type
- [x] Update BudgetEditSheet to include impulse fund input
- [x] Update SafeZoneBar to show impulse fund separately
- [x] Update AddItemToListSheet to allow marking as impulse
- [x] Calculate impulse and main totals separately
- [x] Write tests
- [x] Manual testing

## Dev Agent Record

### Implementation Plan
- Add `impulseFund: number | null` to ShoppingList interface
- Add impulse fund input section to BudgetEditSheet
- Create ImpulseFundIndicator component (small, secondary to main SafeZone)
- Update running total calculations to separate impulse items
- Add "Mark as impulse" toggle in AddItemToListSheet

### Debug Log


### Completion Notes

All acceptance criteria met:
1. Users can tap "Add Impulse Fund" in BudgetEditSheet to set a separate amount (purple-themed UI)
2. Items marked as "impulse" priority deduct from impulse fund, not main budget
3. Both budgets display separately in SafeZoneBar - main budget shows non-impulse items, impulse fund shows its own progress bar
4. Impulse items section added to list detail page with purple theme
5. 1038 tests passing, build successful


## File List

*Files created/modified during implementation:*

- `_bmad-output/implementation-artifacts/stories/4-13-impulse-fund.md` (created)
- `src/lib/utils/shoppingListStorage.ts` (modified - added impulseFund field to ShoppingList)
- `src/components/lists/BudgetEditSheet.tsx` (modified - added impulse fund input)
- `src/components/lists/SafeZoneIndicator.tsx` (modified - added impulse fund display)
- `src/app/(app)/lists/[id]/page.tsx` (modified - impulse calculations and Impulse section)
- `src/components/lists/__tests__/BudgetEditSheet.test.tsx` (modified - added impulse fund tests)
- `src/components/lists/__tests__/SafeZoneIndicator.test.tsx` (modified - added impulse fund tests)

## Change Log

- 2026-01-26: Story file created
- 2026-01-26: Implementation complete - all acceptance criteria met
