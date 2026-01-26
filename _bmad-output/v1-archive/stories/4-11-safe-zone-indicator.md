# Story 4-11: Safe Zone Indicator

## Story

**As a** user,
**I want** to see a visual indicator of my budget status,
**So that** I feel in control without doing mental math.

## Status

- **Status:** review
- **Epic:** 4 - Shopping Lists & Budget Control
- **Created:** 2026-01-26
- **Completed:** 2026-01-26

## Acceptance Criteria

**Given** I have set a budget for my list
**When** my running total is under 80% of budget
**Then** the Safe Zone glows green (#10B981)
**And** the BudgetRing shows green progress

**Given** my running total is 80-100% of budget
**When** I view the list
**Then** the Safe Zone shifts to amber (#F59E0B)
**And** I see "Getting close" message

**Given** my running total exceeds budget
**When** I view the list
**Then** the Safe Zone turns red (#EF4444)
**And** I see "Let's review" message (supportive, not shaming)
**And** icons accompany colors for accessibility (NFR-A3)

## Technical Notes

### Existing Resources

- Running total bar already shows colored progress
- Safe Zone colors defined in UX spec: Green (#10B981), Amber (#F59E0B), Red (#EF4444)
- Budget percentage calculation already exists in list detail page

### Implementation Approach

1. Create `BudgetRing` component - circular progress indicator with glow
2. Create `SafeZoneIndicator` component - combines ring, message, and icon
3. Update running total bar to use SafeZoneIndicator
4. Add status-specific icons (checkmark, warning, alert)
5. Add glow effect for visual emphasis

### Design Decisions

- Use circular ring for visual appeal and clear progress indication
- Glow effect subtle but noticeable (not overwhelming)
- Messages are supportive, not shaming ("Let's review" not "Over budget!")
- Icons required alongside colors for accessibility (NFR-A3)

## Tasks/Subtasks

- [x] Create story file
- [x] Create BudgetRing component with glow effect
- [x] Create SafeZoneIndicator component
- [x] Add status messages (On track, Getting close, Let's review)
- [x] Add accessibility icons (check, warning, alert)
- [x] Update list detail page to use SafeZoneBar
- [x] Write tests (34 tests)
- [ ] Manual testing

## Dev Agent Record

### Implementation Plan
- Create BudgetRing as circular SVG progress ring
- SafeZoneIndicator wraps ring + message + icon
- Integrate into list detail page header

### Debug Log


### Completion Notes

- Created BudgetRing component with animated circular progress and glow effect
- Created SafeZoneIndicator and SafeZoneBar components
- Three status levels: safe (green, <80%), warning (amber, 80-100%), danger (red, >100%)
- Status messages: "On track", "Getting close", "Let's review" (supportive, not shaming)
- Icons accompany colors for accessibility (NFR-A3): checkmark, warning, alert
- Animated glow effect with reduced motion support
- SafeZoneBar integrated into list detail page (replaces simple progress bar when budget set)
- 34 comprehensive tests covering all components and accessibility
- All 1011 tests passing, build successful

## File List

*Files created/modified during implementation:*

- `_bmad-output/implementation-artifacts/stories/4-11-safe-zone-indicator.md` (created)
- `src/components/lists/SafeZoneIndicator.tsx` (created - BudgetRing, SafeZoneIndicator, SafeZoneBar)
- `src/components/lists/__tests__/SafeZoneIndicator.test.tsx` (created - 34 tests)
- `src/components/lists/index.ts` (modified - added exports)
- `src/app/(app)/lists/[id]/page.tsx` (modified - integrated SafeZoneBar)

## Change Log

- 2026-01-26: Story file created
- 2026-01-26: Implementation complete, 34 tests passing
