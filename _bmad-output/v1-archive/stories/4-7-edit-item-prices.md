# Story 4-7: Edit Item Prices

## Story

**As a** user,
**I want** to edit estimated and actual prices,
**So that** my budget tracking is accurate.

## Status

- **Status:** review
- **Epic:** 4 - Shopping Lists & Budget Control
- **Created:** 2026-01-25

## Acceptance Criteria

**Given** I am viewing a list item
**When** I tap the price
**Then** I can edit the estimated price before shopping
**And** I can edit the actual price when checking off

**Given** I update a price
**When** I save
**Then** the running total recalculates immediately
**And** my personal price history is updated

## Technical Notes

### Components to Create/Modify

1. **PriceEditSheet** - Bottom sheet for editing prices
2. **ListItemRow** - Make price tappable, open PriceEditSheet

### Existing Resources

- `updateShoppingListItem` function in shoppingListStorage
- `updatePantryItemPrice` function in onboardingStorage
- Running total already recalculates from state

### Implementation Approach

- Tap price displays edit sheet with input
- Edit estimated price (before checked) or actual price (when checking/after checked)
- Save updates storage and local state
- If item has pantryItemId, update lastKnownPrice in pantry

## Implementation Tasks

- [x] Create story file
- [x] Create PriceEditSheet component
- [x] Make price tappable in ListItemRow
- [x] Add price editing state and handler in page
- [x] Update pantry item price when applicable
- [x] Write tests (18 tests)
- [x] Manual testing

## Test Coverage

- Tapping price opens edit sheet
- Can edit estimated price
- Can edit actual price
- Running total updates after save
- Pantry item price history updated
