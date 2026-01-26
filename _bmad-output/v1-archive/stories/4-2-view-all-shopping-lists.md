# Story 4-2: View All Shopping Lists

## Story

**As a** user,
**I want** to view all my shopping lists,
**So that** I can select which one to use or review past trips.

## Status

- **Status:** review
- **Epic:** 4 - Shopping Lists & Budget Control
- **Created:** 2026-01-25

## Acceptance Criteria

**Given** I am on the Lists tab
**When** the page loads
**Then** I see all my active lists with name, item count, and budget status
**And** completed lists are shown separately or filtered
**And** I can tap a list to open its detail view

## Technical Notes

### Components to Update/Create

1. **ShoppingListCard** - Add item count display
2. **ShoppingListGrid** - Add filtering for active/completed
3. **Lists page** - Add tab/filter UI for list status

### Data Requirements

- Fetch item count per list from shoppingListStorage
- Display budget vs spent for lists with budgets
- Filter lists by status (active, shopping, completed)

### Dependencies

- Story 4-1: Create New Shopping List (completed)
- shoppingListStorage utilities (completed)

## Implementation Tasks

- [x] Create story file
- [x] Update ShoppingListCard with item count (already implemented)
- [x] Add status filter tabs to Lists page (ListFilterTabs component)
- [x] Update ShoppingListGrid to support filtering
- [x] Write comprehensive tests (61 tests total)
- [x] Manual testing

## Test Coverage

- ShoppingListCard displays item count
- ShoppingListGrid filters by status
- Lists page shows active/completed tabs
- Tapping list navigates to detail view
