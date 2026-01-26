# Story 4-9: View Running Total

## Story

**As a** user,
**I want** to see my running total at all times,
**So that** I know how much I'm spending.

## Status

- **Status:** review
- **Epic:** 4 - Shopping Lists & Budget Control
- **Created:** 2026-01-26

## Acceptance Criteria

**Given** I am viewing a shopping list with items
**When** items are added, removed, or checked
**Then** the running total updates in under 100ms (NFR-P2)
**And** the total is displayed prominently (StickyBudgetBar when scrolling)
**And** checked items use actual prices, unchecked use estimates

## Technical Notes

### Existing Implementation

Much of this functionality already exists:
- Running total calculation: ✅ Already uses actualPrice for checked, estimatedPrice for unchecked
- Sticky bar when scrolling: ✅ Budget bar is sticky (top-[73px])
- Updates under 100ms: ✅ Uses local React state, updates synchronously

### What Needs Enhancement

1. **Running total should show even without a budget** - Currently only shows when budget is set
2. **Visual distinction** - Show running total prominently even when no budget
3. **Accessibility** - Ensure screen readers announce total changes

### Implementation Approach

- Always show a running total bar (not just when budget is set)
- When budget exists: show total vs budget with progress bar
- When no budget: show just the running total
- Add aria-live region for accessibility

## Tasks/Subtasks

- [x] Create story file
- [x] Update running total bar to always display
- [x] Add visual styling for no-budget state
- [x] Add aria-live for accessibility
- [x] Write tests (21 tests)
- [x] Manual testing

## Dev Agent Record

### Implementation Plan
- Modify the Budget Bar section to show running total even without budget
- Add different visual states for with/without budget
- Add ARIA attributes for screen reader accessibility

### Debug Log
- All 955 tests passing

### Completion Notes
- Running total bar now shows whenever there are items (not just when budget is set)
- When budget is set: shows total vs budget with progress bar
- When no budget: shows just the running total
- Added `aria-live="polite"` for screen reader announcements
- Added `role="progressbar"` with proper ARIA attributes for budget bar
- Running total updates synchronously (<100ms) via React state

## File List

*Files created/modified during implementation:*

- `_bmad-output/implementation-artifacts/stories/4-9-view-running-total.md` (created)
- `src/app/(app)/lists/[id]/page.tsx` (modified - always show running total, added ARIA)
- `src/components/lists/__tests__/RunningTotal.test.tsx` (created - 21 tests)

## Change Log

- 2026-01-26: Story file created
- 2026-01-26: Implementation completed - all acceptance criteria met
