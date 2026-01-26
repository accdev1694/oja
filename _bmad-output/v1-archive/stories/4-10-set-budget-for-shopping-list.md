# Story 4-10: Set Budget for Shopping List

## Story

**As a** user,
**I want** to set a budget for my shopping trip,
**So that** I can control my spending.

## Status

- **Status:** review
- **Epic:** 4 - Shopping Lists & Budget Control
- **Created:** 2026-01-26
- **Completed:** 2026-01-26

## Acceptance Criteria

**Given** I am viewing or creating a shopping list
**When** I tap "Set Budget"
**Then** I see a budget input with my default budget pre-filled
**And** I can adjust the amount
**And** the Safe Zone indicator appears once budget is set

## Technical Notes

### Existing Resources

- `updateShoppingList` function to update budget
- `getDefaultBudget()` from onboardingStorage for pre-fill
- `PriceEditSheet` as reference for bottom sheet pattern
- Budget already stored in ShoppingList interface

### Implementation Approach

1. Create `BudgetEditSheet` component (similar to PriceEditSheet)
2. Add "Set Budget" button to list detail header
3. Pre-fill with default budget from onboarding or current list budget
4. Update list budget on save
5. Safe Zone indicator already exists in running total bar (colors)

### Design Decisions

- Use bottom sheet pattern consistent with PriceEditSheet
- Show current budget if set, otherwise show default from settings
- Allow clearing budget (set to null)
- Budget input in pounds, stored in pence

## Tasks/Subtasks

- [x] Create story file
- [x] Create BudgetEditSheet component
- [x] Add "Set Budget" button to list detail header
- [x] Pre-fill with default budget or current budget
- [x] Update list budget on save
- [x] Write tests (22 tests)
- [ ] Manual testing

## Dev Agent Record

### Implementation Plan
- Create BudgetEditSheet following PriceEditSheet pattern
- Add budget edit button near the running total
- Integrate with updateShoppingList

### Debug Log


### Completion Notes

- BudgetEditSheet component created following PriceEditSheet pattern
- Running total bar now clickable to open budget edit sheet
- Pre-fills with current budget or default from onboarding settings
- "Remove budget limit" option available when budget is set
- 22 tests covering rendering, interactions, validation, and accessibility
- All 977 tests passing, build successful

## File List

*Files created/modified during implementation:*

- `_bmad-output/implementation-artifacts/stories/4-10-set-budget-for-shopping-list.md` (created)
- `src/components/lists/BudgetEditSheet.tsx` (created)
- `src/components/lists/__tests__/BudgetEditSheet.test.tsx` (created)
- `src/components/lists/index.ts` (modified - added BudgetEditSheet export)
- `src/app/(app)/lists/[id]/page.tsx` (modified - integrated budget editing)

## Change Log

- 2026-01-26: Story file created
- 2026-01-26: Implementation complete, 22 tests passing
