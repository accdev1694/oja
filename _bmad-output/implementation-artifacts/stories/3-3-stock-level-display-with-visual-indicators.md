# Story 3.3: Stock Level Display with Visual Indicators

Status: review

## Story

As a **user**,
I want **to see visual indicators of stock levels**,
So that **I can quickly understand what needs restocking**.

## Acceptance Criteria

1. **"Stocked" items** show full indicator (green)
2. **"Good" items** show 75% indicator
3. **"Low" items** show 25% indicator (amber)
4. **"Out" items** show empty indicator (red)
5. **Phosphor Icons** used with appropriate fill weights

## Tasks / Subtasks

- [x] **Task 1: Review Existing Implementation** (AC: #1-4)
  - [x] Story 3-1 already implements progress bar with correct fill percentages
  - [x] Colors already follow Safe Zone palette (green, blue, amber, red)
  - [x] Stock level badges show current level

- [x] **Task 2: Create StockLevelIcon Component** (AC: #5)
  - [x] Create `src/components/stock/StockLevelIcon.tsx`
  - [x] Use Phosphor Icons with varying weights (Fill → Thin)
  - [x] Stocked: Fill weight (fully filled)
  - [x] Good: Regular weight
  - [x] Low: Light weight
  - [x] Out: Thin weight (empty)
  - [x] Colors match existing Safe Zone palette

- [x] **Task 3: Update PantryItem Component** (AC: #5)
  - [x] Add StockLevelIcon alongside existing progress bar
  - [x] Icon provides visual at-a-glance indication

- [x] **Task 4: Add Tests** (AC: all)
  - [x] Unit tests for StockLevelIcon component (24 tests)
  - [x] PantryItem tests still pass (20 tests)

- [x] **Task 5: Run build and verify** - All 577 tests passing, build successful

## Dev Notes

### Architecture Compliance

**From Architecture Document:**
- Components in `src/components/stock/`
- Use Phosphor Icons (@phosphor-icons/react)
- Stock states: Fill (full) → Thin (empty)

### Icon Selection

Using `Drop` icon from Phosphor as it represents liquid/fill levels:
- Stocked: `<Drop weight="fill" />` - Completely filled
- Good: `<Drop weight="regular" />` - Mostly filled
- Low: `<Drop weight="light" />` - Partially filled
- Out: `<Drop weight="thin" />` - Empty outline

### Phosphor Icon Weights

From Phosphor Icons library:
- **fill**: Solid filled shape
- **duotone**: Two-tone with 20% opacity secondary
- **bold**: Heavier stroke
- **regular**: Default stroke weight (1.5px)
- **light**: Lighter stroke (1px)
- **thin**: Thinnest stroke (0.5px)

### File Structure

```
src/
├── components/
│   └── stock/
│       ├── StockLevelIcon.tsx     # NEW
│       ├── __tests__/
│       │   └── StockLevelIcon.test.tsx # NEW
│       ├── PantryItem.tsx         # UPDATE
│       └── index.ts               # UPDATE
```

### References

- [Source: epics.md#Story-3.3] - Acceptance criteria
- [Source: CLAUDE.md] - Icon weight guidance
- [Source: ux-design-specification.md] - Safe Zone colors

## Dev Agent Record

### Agent Model Used

Claude Opus 4.5

### Debug Log References

### Completion Notes List

- Created StockLevelIcon component using Phosphor Icons `Drop` icon
- Icon weights vary by stock level: fill (stocked), regular (good), light (low), thin (out)
- Colors match Safe Zone palette from design system
- Added StockLevelIcon to PantryItem alongside category emoji
- 24 new tests for StockLevelIcon covering weights, colors, sizes, accessibility
- All 577 tests passing, production build successful

### File List

- `src/components/stock/StockLevelIcon.tsx` (NEW)
- `src/components/stock/__tests__/StockLevelIcon.test.tsx` (NEW)
- `src/components/stock/PantryItem.tsx` (UPDATED - added StockLevelIcon)
- `src/components/stock/index.ts` (UPDATED - added export)
