# Story 3.5: Quick-Decrease Stock via Swipe

Status: review

## Story

As a **user**,
I want **to quickly decrease stock level with a swipe**,
So that **I can rapidly update multiple items**.

## Acceptance Criteria

1. **Swipe left** on a pantry item decreases stock level by one step
2. Stock levels decrease: **Stocked → Good → Low → Out**
3. **Visual feedback** shows the change (color transition, icon)
4. **Undo** available via toast notification with undo button
5. Items at "Out" level cannot be swiped further

## Tasks / Subtasks

- [x] **Task 1: Create useSwipe Hook**
  - [x] Create `src/lib/hooks/useSwipe.ts`
  - [x] Detect horizontal swipe gesture (50px threshold from UX spec)
  - [x] Handle touch events
  - [x] Return swipe direction, offset, and handlers
  - [x] Disabled option for items at "Out" level

- [x] **Task 2: Create Toast Component** (AC: #4)
  - [x] Create `src/components/ui/Toast.tsx`
  - [x] Success/info/warning/error variants with icons
  - [x] Undo button support
  - [x] Auto-dismiss after 3 seconds (UX spec)
  - [x] Swipe to dismiss
  - [x] Framer Motion animations
  - [x] useToast hook for state management

- [x] **Task 3: Update PantryItem with Swipe** (AC: #1, #2, #3)
  - [x] Add swipe gesture using useSwipe
  - [x] Visual feedback during swipe (translate, background color)
  - [x] Haptic feedback on successful swipe
  - [x] Prevent swipe on "Out" items (disabled prop)
  - [x] Show next level indicator during swipe

- [x] **Task 4: Update Pantry Page** (AC: #4)
  - [x] Handle onSwipeLeft callback from PantryItem
  - [x] Decrease stock level by one step
  - [x] Show undo toast on successful decrease
  - [x] Implement undo functionality with ref storage

- [x] **Task 5: Add Tests** (AC: all)
  - [x] Unit tests for useSwipe hook (23 tests)
  - [x] Unit tests for Toast component (28 tests)
  - [x] Unit tests for stockLevel helpers (12 new tests)

- [x] **Task 6: Run build and verify** - All 692 tests passing, build successful

## Dev Notes

### Architecture Compliance

**From Architecture Document:**
- Hooks in `src/lib/hooks/`
- UI components in `src/components/ui/`
- Framer Motion for animations
- 50px swipe threshold (UX spec)

### useSwipe Hook Pattern

```typescript
interface UseSwipeOptions {
  threshold?: number; // Default 50px
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  disabled?: boolean;
}

interface UseSwipeResult {
  onTouchStart: (e: React.TouchEvent) => void;
  onTouchMove: (e: React.TouchEvent) => void;
  onTouchEnd: () => void;
  swipeOffset: number;
  isSwiping: boolean;
  swipeDirection: 'left' | 'right' | null;
}
```

### Stock Level Decrease Logic

```typescript
function decreaseStockLevel(current: StockLevel): StockLevel | null {
  const order: StockLevel[] = ['stocked', 'good', 'low', 'out'];
  const currentIndex = order.indexOf(current);
  if (currentIndex === order.length - 1) return null; // Already at "out"
  return order[currentIndex + 1];
}
```

### Toast Component Pattern

```typescript
interface ToastProps {
  message: string;
  type?: 'success' | 'info' | 'warning' | 'error';
  onUndo?: () => void;
  duration?: number; // Default 3000ms
  onDismiss: () => void;
  isVisible: boolean;
}
```

### Visual Feedback

- Swipe reveals colored background indicating next level
- Item translates with finger movement
- CSS transition snaps back on release
- Haptic feedback on successful swipe

### File Structure

```
src/
├── lib/
│   ├── hooks/
│   │   ├── useSwipe.ts              # NEW
│   │   └── __tests__/
│   │       └── useSwipe.test.ts     # NEW
│   └── utils/
│       └── stockLevel.ts            # UPDATE (added decrease/increase helpers)
├── components/
│   ├── ui/
│   │   ├── Toast.tsx                # NEW
│   │   └── __tests__/
│   │       └── Toast.test.tsx       # NEW
│   └── stock/
│       ├── PantryItem.tsx           # UPDATE
│       ├── PantryGrid.tsx           # UPDATE
│       └── index.ts                 # UPDATE
├── app/
│   └── (app)/
│       └── pantry/
│           └── page.tsx             # UPDATE
```

### References

- [Source: epics.md#Story-3.5] - Acceptance criteria
- [Source: ux-design-specification.md] - Swipe gesture specs
- [Source: ux-design-specification.md] - Toast patterns

## Dev Agent Record

### Agent Model Used

Claude Opus 4.5

### Debug Log References

### Completion Notes List

- Created useSwipe hook with 50px threshold, touch events, direction tracking
- Hook detects horizontal vs vertical swipe and cancels for scrolling
- Hook supports disabled state for "Out" items
- Created Toast component with Framer Motion animations
- Toast has 4 variants: success, info, warning, error with Phosphor icons
- Toast auto-dismisses after 3 seconds, pauses on hover/touch
- Toast supports swipe-to-dismiss via useSwipe integration
- Created useToast hook for state management
- Updated PantryItem with swipe gesture and visual feedback
- Swipe shows colored background indicating next stock level
- Haptic feedback (medium) on successful swipe
- Updated PantryGrid to pass onItemSwipeLeft callback
- Updated Pantry page with undo functionality using ref storage
- Added stockLevel helpers: decreaseStockLevel, increaseStockLevel, canDecreaseStock
- 63 new tests (23 useSwipe + 28 Toast + 12 stockLevel helpers)
- All 692 tests passing, production build successful

### File List

- `src/lib/hooks/useSwipe.ts` (NEW)
- `src/lib/hooks/__tests__/useSwipe.test.ts` (NEW)
- `src/components/ui/Toast.tsx` (NEW)
- `src/components/ui/__tests__/Toast.test.tsx` (NEW)
- `src/lib/utils/stockLevel.ts` (UPDATED - added helpers)
- `src/lib/utils/__tests__/stockLevel.test.ts` (UPDATED - added tests)
- `src/components/stock/PantryItem.tsx` (UPDATED - added swipe support)
- `src/components/stock/PantryGrid.tsx` (UPDATED - added onItemSwipeLeft prop)
- `src/components/stock/__tests__/PantryGrid.test.tsx` (UPDATED - fixed test selector)
- `src/app/(app)/pantry/page.tsx` (UPDATED - integrated swipe and toast)
