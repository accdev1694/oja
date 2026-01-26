# Story 4-4: Search and Add from Pantry

## Story

**As a** user,
**I want** to search my pantry when adding items,
**So that** I can quickly add tracked items with price estimates.

## Status

- **Status:** review
- **Epic:** 4 - Shopping Lists & Budget Control
- **Created:** 2026-01-25

## Acceptance Criteria

**Given** I am adding items to a list
**When** I type a search term
**Then** matching pantry items appear in results (<200ms) (NFR-P9)
**And** pantry items show their last known price if available
**And** I can tap to add them to the list

## Technical Notes

### Changes Required

1. **StockItem Interface** - Add `lastKnownPrice` field
2. **AddItemToListSheet** - Display last known prices on pantry suggestions
3. **Price Update Utility** - Function to update pantry item prices

### Dependencies

- Story 4-3: Add Items to Shopping List (completed)
- onboardingStorage utilities
- shoppingListStorage utilities

### Note on Scope

Much of the search functionality was implemented in Story 4-3. This story focuses on:
- Adding price tracking to pantry items
- Displaying those prices in the search suggestions
- Ensuring search performance meets <200ms requirement

## Implementation Tasks

- [x] Create story file
- [x] Add lastKnownPrice field to StockItem interface
- [x] Update AddItemToListSheet to display last known prices
- [x] Add utility function to update pantry item prices
- [x] Write tests for new functionality (11 new tests)
- [x] Manual testing

## Test Coverage

- Pantry items display last known price in suggestions
- Search results appear within performance budget
- Price updates correctly when set
- Items without prices show appropriate fallback
