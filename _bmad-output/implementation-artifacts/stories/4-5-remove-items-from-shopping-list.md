# Story 4-5: Remove Items from Shopping List

## Story

**As a** user,
**I want** to remove items from my list,
**So that** I can adjust my shopping plan.

## Status

- **Status:** review
- **Epic:** 4 - Shopping Lists & Budget Control
- **Created:** 2026-01-25

## Acceptance Criteria

**Given** I am viewing a shopping list
**When** I swipe left on an item and tap "Remove"
**Then** the item is removed from the list
**And** the running total updates immediately
**And** I can undo within 5 seconds

## Technical Notes

### Components to Create/Modify

1. **SwipeableListItem** - Wrapper component with swipe-to-reveal actions
2. **List Detail Page** - Integrate swipe and undo functionality

### Existing Resources

- `removeShoppingListItem` function already exists in shoppingListStorage
- `useSwipe` hook from Epic 3
- `Toast` component with undo support from Epic 3

### Implementation Approach

- Use swipe gesture to reveal "Remove" button (similar to PantryItem)
- On remove: store item temporarily, remove from list, show undo toast
- Undo restores item to original position
- Running total updates via React state

## Implementation Tasks

- [x] Create story file
- [x] Create SwipeableListItem component
- [x] Integrate swipe-to-remove in list detail page
- [x] Add undo toast functionality (5 second timeout)
- [x] Write tests (11 tests)
- [x] Manual testing

## Test Coverage

- Swipe left reveals remove action
- Tapping remove deletes item from list
- Running total updates after removal
- Undo within 5 seconds restores item
- Undo after timeout does not restore item
