# Story 4-6: Check Off Items While Shopping

## Story

**As a** user,
**I want** to check off items as I shop,
**So that** I can track my progress and spending.

## Status

- **Status:** review
- **Epic:** 4 - Shopping Lists & Budget Control
- **Created:** 2026-01-25

## Acceptance Criteria

**Given** I am viewing my shopping list
**When** I tap the checkbox on an item
**Then** the item is marked as checked with strikethrough
**And** the item fades to 60% opacity
**And** visual response is under 50ms (NFR-P3)
**And** the running total updates based on actual price (if different from estimate)

**Given** I check off an item
**When** I tap it again
**Then** it unchecks and returns to normal state

## Technical Notes

### Existing Resources

- `ListItemRow` component already displays visual states
- `updateShoppingListItem` function in shoppingListStorage
- Running total calculation already handles actualPrice

### Implementation Approach

- Add `onToggleCheck` callback to ListItemRow
- Make checkbox clickable with haptic feedback
- Checked items move to bottom (already sorted)
- Running total recalculates using actualPrice when checked

## Implementation Tasks

- [x] Create story file
- [x] Make checkbox interactive in ListItemRow
- [x] Add handleToggleCheck function in page
- [x] Add haptic feedback on toggle
- [x] Write tests (14 tests)
- [x] Manual testing

## Test Coverage

- Tapping checkbox toggles isChecked state
- Checked items show strikethrough and reduced opacity
- Running total updates when item is checked
- Unchecking restores normal state
- Checked items sort to bottom
