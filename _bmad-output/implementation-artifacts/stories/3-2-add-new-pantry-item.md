# Story 3.2: Add New Pantry Item

Status: review

## Story

As a **user**,
I want **to add new items to my pantry**,
So that **I can track more of my household inventory**.

## Acceptance Criteria

1. **"+" FAB button** visible on Pantry screen
2. **"Add Item" sheet/modal** opens when FAB is tapped
3. **Item name input** is required
4. **Category selection** is optional (defaults to "pantry")
5. **Initial stock level** is optional (defaults to "stocked")
6. **Item added** with optimistic update (appears immediately)
7. **localStorage updated** with new item

## Tasks / Subtasks

- [x] **Task 1: Create AddItemSheet Component** (AC: #2)
  - [x] Create `src/components/stock/AddItemSheet.tsx`
  - [x] Bottom sheet modal with slide-up animation
  - [x] Close button and backdrop click to dismiss
  - [x] Framer Motion animations with reduced motion support

- [x] **Task 2: Create AddItemForm Component** (AC: #3, #4, #5)
  - [x] Create `src/components/stock/AddItemForm.tsx`
  - [x] Item name input (required)
  - [x] Category grid selector (9 categories with emojis)
  - [x] Stock level picker (4 levels with colors)
  - [x] Submit button with validation

- [x] **Task 3: Add FAB Button to Pantry Page** (AC: #1)
  - [x] Add floating action button (orange, 56x56px)
  - [x] Position fixed bottom-right above nav
  - [x] Open AddItemSheet on click

- [x] **Task 4: Add Pantry Item Storage Functions** (AC: #6, #7)
  - [x] Update `src/lib/utils/onboardingStorage.ts`
  - [x] Add `addPantryItem`, `updatePantryItem`, `removePantryItem` functions
  - [x] Add `generatePantryItemId` for unique IDs
  - [x] Add `pantryItemExists` for duplicate check
  - [x] Optimistic update pattern in pantry page

- [x] **Task 5: Add Tests** (AC: all)
  - [x] Unit tests for AddItemSheet component (17 tests)
  - [x] Unit tests for AddItemForm component (25 tests)
  - [x] Unit tests for storage functions (28 tests)
  - [x] All tests passing

- [x] **Task 6: Run build and verify** - All 553 tests passing, build successful

## Dev Notes

### Architecture Compliance

**From Architecture Document:**
- Components in `src/components/stock/`
- Use existing UI components (Button, Input)
- Framer Motion for animations
- localStorage for persistence (Supabase later)

### AddItemSheet Pattern

```typescript
interface AddItemSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (item: Omit<StockItem, 'id' | 'createdAt'>) => void;
}
```

### AddItemForm Pattern

```typescript
interface AddItemFormProps {
  onSubmit: (data: { name: string; category: string; level: StockLevel }) => void;
  onCancel: () => void;
  isLoading?: boolean;
}
```

### Category Options

From seeded-products.ts:
- dairy, bakery, eggs, pantry, tinned, beverages, produce, meat, frozen

### Stock Level Options

- stocked (default)
- good
- low
- out

### FAB Button Design

- Orange background (#FF6B35)
- White "+" icon
- 56x56px size (accessibility)
- Bottom-right position with padding
- Above bottom navigation

### File Structure

```
src/
├── components/
│   └── stock/
│       ├── AddItemSheet.tsx      # NEW
│       ├── AddItemForm.tsx       # NEW
│       ├── __tests__/
│       │   ├── AddItemSheet.test.tsx # NEW
│       │   └── AddItemForm.test.tsx  # NEW
│       └── index.ts              # UPDATE
├── lib/
│   └── utils/
│       └── onboardingStorage.ts  # UPDATE (add addPantryItem)
├── app/
│   └── (app)/
│       └── pantry/
│           └── page.tsx          # UPDATE (add FAB)
```

### References

- [Source: epics.md#Story-3.2] - Acceptance criteria
- [Source: ux-design-specification.md] - FAB design
- [Source: seeded-products.ts] - Category definitions

## Dev Agent Record

### Agent Model Used

Claude Opus 4.5

### Debug Log References

### Completion Notes List

- Created AddItemSheet bottom sheet modal with Framer Motion slide-up animation
- Sheet prevents body scroll when open, closes on Escape/backdrop click
- AddItemForm with item name input, 9-category grid selector, and 4-level stock picker
- Category selection shows emojis with highlighted selected state
- Stock level buttons color-coded with Safe Zone colors
- FAB button (orange, 56x56px) positioned bottom-right above navigation
- Duplicate item detection shows error message
- Optimistic update - item appears immediately in grid
- Storage functions: addPantryItem, updatePantryItem, removePantryItem, pantryItemExists
- Unique ID generation with timestamp and random suffix
- 70 new tests (17 AddItemSheet + 25 AddItemForm + 28 storage)
- All 553 tests passing, production build successful

### File List

- `src/components/stock/AddItemSheet.tsx` (NEW)
- `src/components/stock/AddItemForm.tsx` (NEW)
- `src/components/stock/__tests__/AddItemSheet.test.tsx` (NEW)
- `src/components/stock/__tests__/AddItemForm.test.tsx` (NEW)
- `src/components/stock/index.ts` (UPDATED - added exports)
- `src/lib/utils/onboardingStorage.ts` (UPDATED - added CRUD functions)
- `src/lib/utils/__tests__/onboardingStorage.test.ts` (UPDATED - added tests)
- `src/app/(app)/pantry/page.tsx` (UPDATED - added FAB and AddItemSheet)
