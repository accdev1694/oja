# Story 3.6: Auto-Add Out Items to Shopping List

Status: review

## Story

As a **user**,
I want **"Out" items to automatically appear on my next shopping list**,
So that **I never forget to buy essentials**.

## Acceptance Criteria

1. **Given** I have items marked as "Out" in my pantry
   **When** I create a new shopping list
   **Then** all "Out" items are automatically added to the list
   **And** these items are marked as "auto-added" visually

2. **Given** an item changes to "Out" status
   **When** I have an active (non-completed) shopping list
   **Then** the item is added to that list automatically
   **And** I receive subtle notification of the addition

3. **I can remove** auto-added items if I don't want them

## Tasks / Subtasks

- [x] **Task 1: Create Shopping List Storage**
  - [x] Create `src/lib/utils/shoppingListStorage.ts`
  - [x] Define ShoppingList and ShoppingListItem types
  - [x] Add CRUD operations for shopping lists
  - [x] Add function to get/set active shopping list

- [x] **Task 2: Create Auto-Add Utility Functions**
  - [x] Add function to get all "Out" pantry items
  - [x] Add function to auto-add item to active list
  - [x] Track "auto-added" status on list items
  - [x] Prevent duplicate auto-adds (check by pantryItemId)
  - [x] Auto-add all "Out" items when creating new list

- [x] **Task 3: Integrate with Pantry Page** (AC: #2)
  - [x] When item changes to "Out" via picker, check for active list
  - [x] When item changes to "Out" via swipe, check for active list
  - [x] If active list exists, add item automatically
  - [x] Show toast notification for auto-add
  - [x] Toast shows item name with "(added to list)" message

- [x] **Task 4: Add Tests**
  - [x] Unit tests for shoppingListStorage (43 tests)
  - [x] Tests for CRUD operations
  - [x] Tests for auto-add functionality

- [x] **Task 5: Run build and verify** - All 735 tests passing, build successful

## Dev Notes

### Architecture Compliance

**From Architecture Document:**
- Storage utilities in `src/lib/utils/`
- Follow localStorage pattern from onboardingStorage
- Toast component reused from Story 3-5

### Type Definitions

```typescript
export interface ShoppingList {
  id: string;
  name: string;
  status: 'active' | 'shopping' | 'completed' | 'archived';
  budget: number | null; // in pence
  createdAt: string;
  completedAt: string | null;
}

export interface ShoppingListItem {
  id: string;
  listId: string;
  name: string;
  quantity: number;
  unit: string | null;
  estimatedPrice: number | null;
  actualPrice: number | null;
  isChecked: boolean;
  priority: 'need' | 'want' | 'impulse';
  isAutoAdded: boolean;
  pantryItemId: string | null;
  category: string | null;
  addedAt: string;
}
```

### Storage Keys

```typescript
export const SHOPPING_STORAGE_KEYS = {
  SHOPPING_LISTS: 'oja_shopping_lists',
  SHOPPING_LIST_ITEMS: 'oja_shopping_list_items',
} as const;
```

### Auto-Add Flow

1. User swipes/taps item to "Out" status
2. Check if there's an active shopping list
3. If yes:
   - Check if item already in list (by pantryItemId)
   - If not, add with `isAutoAdded: true`
   - Show toast: "{item name} → Out (added to list)"
4. If no active list:
   - Item will be auto-added when user creates next list

### File Structure

```
src/
├── lib/
│   └── utils/
│       ├── shoppingListStorage.ts           # NEW
│       └── __tests__/
│           └── shoppingListStorage.test.ts  # NEW
├── app/
│   └── (app)/
│       └── pantry/
│           └── page.tsx                     # UPDATE
```

### References

- [Source: epics.md#Story-3.6] - Acceptance criteria
- [Source: db/schema.ts] - Type reference for shopping list schema
- [Source: Story-3.5] - Toast component for notifications

## Dev Agent Record

### Agent Model Used

Claude Opus 4.5

### Debug Log References

### Completion Notes List

- Created comprehensive shoppingListStorage.ts with full CRUD operations
- ShoppingList and ShoppingListItem types match db/schema.ts patterns
- createShoppingList automatically calls autoAddOutItemsToList
- autoAddItemToActiveList checks for duplicates using pantryItemId
- Updated Pantry page handleStockLevelChange to auto-add on "out"
- Updated Pantry page handleItemSwipeLeft to auto-add on "out"
- Toast shows different message when item is auto-added to list
- 43 new tests for shoppingListStorage covering all functions
- All 735 tests passing, production build successful

### File List

- `src/lib/utils/shoppingListStorage.ts` (NEW)
- `src/lib/utils/__tests__/shoppingListStorage.test.ts` (NEW)
- `src/app/(app)/pantry/page.tsx` (UPDATED - auto-add integration)
