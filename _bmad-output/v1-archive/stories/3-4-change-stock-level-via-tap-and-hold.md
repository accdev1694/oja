# Story 3.4: Change Stock Level via Tap-and-Hold

Status: review

## Story

As a **user**,
I want **to change stock levels with a tap-and-hold gesture**,
So that **updating my pantry feels satisfying and intuitive**.

## Acceptance Criteria

1. **Tap and hold** on a pantry item triggers the StockLevelPicker
2. **StockLevelPicker** appears with liquid drain animation
3. Can select **Stocked, Good, Low, or Out**
4. Animation runs at **60fps** (NFR-P7)
5. **Haptic feedback** confirms selection (FR91)
6. Item updates **immediately** (optimistic update)
7. Change syncs to localStorage (Supabase later)

## Tasks / Subtasks

- [x] **Task 1: Create useLongPress Hook**
  - [x] Create `src/lib/hooks/useLongPress.ts`
  - [x] Detect long-press gesture (500ms threshold)
  - [x] Handle touch and mouse events
  - [x] Cancel on move (drag threshold)
  - [x] Clean up listeners on unmount

- [x] **Task 2: Create StockLevelPicker Component** (AC: #2, #3)
  - [x] Create `src/components/stock/StockLevelPicker.tsx`
  - [x] Popover/modal with 4 stock level options
  - [x] Liquid fill animation using Framer Motion
  - [x] Color-coded options (Safe Zone palette)
  - [x] 300ms spring transition (UX spec)
  - [x] Reduced motion support

- [x] **Task 3: Add Haptic Feedback Utility** (AC: #5)
  - [x] Create `src/lib/utils/haptics.ts`
  - [x] Use Vibration API for haptic feedback
  - [x] Check for browser support
  - [x] Different patterns for selection vs confirmation

- [x] **Task 4: Update PantryItem Component** (AC: #1)
  - [x] Add long-press handler using useLongPress
  - [x] Visual feedback during long-press (scale animation)
  - [x] Trigger onLongPress callback

- [x] **Task 5: Update Pantry Page** (AC: #6, #7)
  - [x] Add state for selected item
  - [x] Show StockLevelPicker when item long-pressed
  - [x] Handle stock level change
  - [x] Optimistic update with updatePantryItem

- [x] **Task 6: Add Tests** (AC: all)
  - [x] Unit tests for useLongPress hook (17 tests)
  - [x] Unit tests for StockLevelPicker (27 tests)
  - [x] Unit tests for haptics utility (12 tests)

- [x] **Task 7: Run build and verify** - All 629 tests passing, build successful

## Dev Notes

### Architecture Compliance

**From Architecture Document:**
- Hooks in `src/lib/hooks/`
- Components in `src/components/stock/`
- Utilities in `src/lib/utils/`
- Framer Motion for animations
- Optimistic updates pattern

### useLongPress Hook Pattern

```typescript
interface UseLongPressOptions {
  threshold?: number; // Default 500ms
  onStart?: () => void;
  onFinish?: () => void;
  onCancel?: () => void;
}

function useLongPress(
  callback: () => void,
  options?: UseLongPressOptions
): {
  onMouseDown: () => void;
  onMouseUp: () => void;
  onMouseLeave: () => void;
  onTouchStart: () => void;
  onTouchEnd: () => void;
}
```

### StockLevelPicker Pattern

```typescript
interface StockLevelPickerProps {
  isOpen: boolean;
  currentLevel: StockLevel;
  onSelect: (level: StockLevel) => void;
  onClose: () => void;
  anchorPosition?: { x: number; y: number };
}
```

### Liquid Animation Concept

The liquid animation shows fill level changing:
- Animate height of colored fill
- Spring physics for natural feel
- Color transitions between levels

### Haptic Patterns

```typescript
// Selection feedback - short pulse
navigator.vibrate?.(10);

// Confirmation feedback - double pulse
navigator.vibrate?.([10, 50, 10]);
```

### File Structure

```
src/
├── lib/
│   ├── hooks/
│   │   ├── useLongPress.ts          # NEW
│   │   └── __tests__/
│   │       └── useLongPress.test.ts # NEW
│   └── utils/
│       ├── haptics.ts               # NEW
│       └── __tests__/
│           └── haptics.test.ts      # NEW
├── components/
│   └── stock/
│       ├── StockLevelPicker.tsx     # NEW
│       ├── __tests__/
│       │   └── StockLevelPicker.test.tsx # NEW
│       ├── PantryItem.tsx           # UPDATE
│       └── index.ts                 # UPDATE
├── app/
│   └── (app)/
│       └── pantry/
│           └── page.tsx             # UPDATE
```

### References

- [Source: epics.md#Story-3.4] - Acceptance criteria
- [Source: ux-design-specification.md] - StockLevelPicker design
- [Source: ux-design-specification.md] - Long-press interaction

## Dev Agent Record

### Agent Model Used

Claude Opus 4.5

### Debug Log References

### Completion Notes List

- Created useLongPress hook with 500ms threshold, touch and mouse support
- Hook cancels on move beyond 10px threshold
- Created haptics utility with Vibration API support
- Multiple haptic patterns: light, medium, strong, success, error, selection
- Created StockLevelPicker with liquid fill animation using Framer Motion
- Picker shows 4 levels with color-coded fills matching Safe Zone palette
- Spring physics animation (300ms) with reduced motion support
- PantryItem updated with long-press gesture and visual feedback (scale animation)
- PantryGrid updated to pass onItemLongPress callback
- Pantry page integrates picker with optimistic updates
- 52 new tests (17 useLongPress + 27 StockLevelPicker + 12 haptics)
- All 629 tests passing, production build successful

### File List

- `src/lib/hooks/useLongPress.ts` (NEW)
- `src/lib/hooks/__tests__/useLongPress.test.ts` (NEW)
- `src/lib/utils/haptics.ts` (NEW)
- `src/lib/utils/__tests__/haptics.test.ts` (NEW)
- `src/components/stock/StockLevelPicker.tsx` (NEW)
- `src/components/stock/__tests__/StockLevelPicker.test.tsx` (NEW)
- `src/components/stock/PantryItem.tsx` (UPDATED - added long-press support)
- `src/components/stock/PantryGrid.tsx` (UPDATED - added onItemLongPress prop)
- `src/components/stock/index.ts` (UPDATED - added StockLevelPicker export)
- `src/app/(app)/pantry/page.tsx` (UPDATED - integrated StockLevelPicker)
