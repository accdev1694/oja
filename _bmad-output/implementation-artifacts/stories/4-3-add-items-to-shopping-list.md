# Story 4-3: Add Items to Shopping List

## Story

**As a** user,
**I want** to add items to my shopping list,
**So that** I remember what to buy.

## Status

- **Status:** review
- **Epic:** 4 - Shopping Lists & Budget Control
- **Created:** 2026-01-25

## Acceptance Criteria

**Given** I am viewing a shopping list
**When** I tap the "+" button
**Then** I can type to add a new item
**And** I see suggestions from my pantry items
**And** I see suggestions from price database with estimates

**Given** I add an item
**When** it appears on the list
**Then** it shows the item name and estimated price
**And** the running total updates immediately (<100ms) (NFR-P2)
**And** the `list_items` table is updated

## Technical Notes

### Components to Create

1. **AddItemToListSheet** - Bottom sheet for adding items
2. **ItemSearchInput** - Search input with autocomplete
3. **SuggestionList** - List of suggestions from pantry/price DB
4. **ListItemCard** - Display item with name, price, checkbox

### Data Requirements

- Fetch pantry items for suggestions
- Calculate running total from list items
- Support estimated vs actual prices
- Store items in shoppingListStorage

### Dependencies

- Story 4-1: Create New Shopping List (completed)
- Story 4-2: View All Shopping Lists (completed)
- shoppingListStorage utilities (completed)
- Pantry items from onboardingStorage

## Implementation Tasks

- [x] Create story file
- [x] Create list detail page route (already existed)
- [x] Create AddItemToListSheet component
- [x] Add pantry item suggestions
- [x] Display list items with prices
- [x] Calculate and display running total
- [x] Write comprehensive tests (23 tests)
- [x] Manual testing

## Test Coverage

- AddItemToListSheet opens/closes correctly
- Pantry items appear as suggestions
- Adding item updates list immediately
- Running total calculates correctly
- Item displays name and estimated price
