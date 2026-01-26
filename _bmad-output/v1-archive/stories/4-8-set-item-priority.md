# Story 4-8: Set Item Priority

## Story

**As a** user,
**I want** to mark items as must-have or nice-to-have,
**So that** I know what to cut if I'm over budget.

## Status

- **Status:** review
- **Epic:** 4 - Shopping Lists & Budget Control
- **Created:** 2026-01-26

## Acceptance Criteria

**Given** I am viewing a list item
**When** I swipe right
**Then** the item toggles between must-have (default) and nice-to-have
**And** nice-to-have items show a visual indicator (lighter styling)

**Given** I have prioritized items
**When** I view the list
**Then** must-have items appear at the top
**And** nice-to-have items appear in a separate section

## Technical Notes

### Existing Resources

- `ItemPriority` type already exists: `'need' | 'want' | 'impulse'`
- `SwipeableListItem` component (currently swipe-left for remove)
- Sorting by priority already implemented in list detail page
- `updateShoppingListItem` function in shoppingListStorage

### Implementation Approach

- Add swipe-right functionality to `SwipeableListItem` component
- Map "must-have" = `need` and "nice-to-have" = `want` priorities
- Show lighter styling (opacity, border) for `want` priority items
- Add visual section separator between must-have and nice-to-have items
- Haptic feedback on priority toggle

### Design Decisions

- Using existing priority values: `need` (must-have) and `want` (nice-to-have)
- `impulse` priority reserved for future Impulse Fund feature (Story 4-13)
- Swipe-right threshold same as swipe-left (80px)
- Visual indicator: lighter text color, subtle left border

## Tasks/Subtasks

- [x] Create story file
- [x] Add swipe-right functionality to SwipeableListItem
  - [x] Add onSwipeRight callback prop
  - [x] Add right-side action indicator (priority icon)
  - [x] Implement swipe-right gesture detection
  - [x] Add haptic feedback on swipe threshold
- [x] Update ListItemRow for priority visual indicator
  - [x] Add lighter styling for want priority
  - [x] Add priority icon/indicator (star icon, amber border)
- [x] Update list detail page
  - [x] Add section headers for must-have and nice-to-have
  - [x] Handle priority toggle via swipe
  - [x] Add "Checked Off" section for completed items
- [x] Write tests (13 tests)
  - [x] Test swipe-right toggles priority
  - [x] Test visual indicator appears for want items
  - [x] Test sorting groups items correctly
  - [x] Test section headers display correctly

## Dev Agent Record

### Implementation Plan
- Story file created
- SwipeableListItem updated with bidirectional swipe support
- ListItemRow updated with visual indicators for priority
- List detail page updated with section headers and grouping

### Debug Log
- All 934 tests passing

### Completion Notes
- Swipe right on an item toggles between "need" (must-have) and "want" (nice-to-have)
- Nice-to-have items have: lighter text color, amber border on checkbox, star icon badge
- Items are grouped into three sections: Must-Have, Nice-to-Have, Checked Off
- Section headers show item counts

## File List

*Files created/modified during implementation:*

- `_bmad-output/implementation-artifacts/stories/4-8-set-item-priority.md` (created)
- `src/components/lists/SwipeableListItem.tsx` (modified - added swipe-right support)
- `src/app/(app)/lists/[id]/page.tsx` (modified - added priority toggle, section headers, visual indicators)
- `src/components/lists/__tests__/ItemPriority.test.tsx` (created - 13 tests)

## Change Log

- 2026-01-26: Story file created, implementation starting
- 2026-01-26: Implementation completed - all acceptance criteria met
