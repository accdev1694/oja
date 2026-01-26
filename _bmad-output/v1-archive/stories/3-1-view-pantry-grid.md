# Story 3.1: View Pantry Grid

Status: review

## Story

As a **user**,
I want **to view all my tracked stock items in a grid**,
So that **I can see what I have at home at a glance**.

## Acceptance Criteria

1. **Responsive grid** displays all stock items
2. **Each item shows** name, category icon, and stock level indicator
3. **Items grouped by category** (toggleable)
4. **Grid loads** in under 2 seconds (NFR-P1)
5. **Empty state** shows helpful message with "Add Item" CTA

## Tasks / Subtasks

- [x] **Task 1: Create PantryGrid Component** (AC: #1, #3)
  - [x] Create `src/components/stock/PantryGrid.tsx`
  - [x] Responsive 2-column grid (3 on tablet)
  - [x] Optional category grouping view
  - [x] Category headers with icons

- [x] **Task 2: Create PantryItem Component** (AC: #2)
  - [x] Create `src/components/stock/PantryItem.tsx`
  - [x] Display item name
  - [x] Show category icon from seeded-products
  - [x] Stock level indicator with color coding
  - [x] Progress bar for visual stock level representation

- [x] **Task 3: Create Stock Level Utilities** (AC: #2)
  - [x] Create `src/lib/utils/stockLevel.ts`
  - [x] Color mapping for each level (Safe Zone colors)
  - [x] Fill percentage for each level
  - [x] Helper functions for stock level display
  - [x] Sort and count utility functions

- [x] **Task 4: Update Pantry Page** (AC: #4, #5)
  - [x] Replace placeholder with PantryGrid component
  - [x] Implement empty state with "Add Item" CTA
  - [x] Remove "Coming Soon" banner
  - [x] Add grouping toggle button
  - [x] Show attention counts in header

- [x] **Task 5: Add Tests** (AC: all)
  - [x] Unit tests for PantryGrid component (21 tests)
  - [x] Unit tests for PantryItem component (20 tests)
  - [x] Unit tests for stock level utilities (23 tests)
  - [x] Test grouping toggle functionality
  - [x] Test empty state rendering

- [x] **Task 6: Run build and verify** - All 483 tests passing, build successful

## Dev Notes

### Architecture Compliance

**From Architecture Document:**
- Components organized by feature in `src/components/`
- Stock-related components in `src/components/stock/`
- Utilities in `src/lib/utils/`
- Use Phosphor Icons for visual consistency

### Stock Level States

```typescript
type StockLevel = 'stocked' | 'good' | 'low' | 'out';

// Visual mapping
const STOCK_LEVEL_CONFIG = {
  stocked: { color: '#10B981', label: 'Stocked', icon: 'fill' },
  good: { color: '#3B82F6', label: 'Good', icon: 'duotone' },
  low: { color: '#F59E0B', label: 'Low', icon: 'light' },
  out: { color: '#EF4444', label: 'Out', icon: 'thin' },
};
```

### Category Icons

Using emojis from seeded-products.ts:
- dairy: 🥛
- bakery: 🍞
- eggs: 🥚
- pantry: 🥫
- tinned: 🥫
- beverages: ☕
- produce: 🥬
- meat: 🥩
- frozen: ❄️

### Component Structure

```typescript
// PantryGrid props
interface PantryGridProps {
  items: StockItem[];
  groupByCategory?: boolean;
  onItemClick?: (item: StockItem) => void;
}

// PantryItem props
interface PantryItemProps {
  item: StockItem;
  onClick?: () => void;
}
```

### Empty State Design

- Shopping cart emoji (🛒)
- Friendly message: "Your pantry is empty"
- Sub-text with guidance
- Primary "Add Item" button (disabled for now - Epic 3 Story 2)

### File Structure

```
src/
├── components/
│   └── stock/
│       ├── PantryGrid.tsx         # NEW
│       ├── PantryItem.tsx         # NEW
│       ├── __tests__/
│       │   ├── PantryGrid.test.tsx # NEW
│       │   └── PantryItem.test.tsx # NEW
│       └── index.ts               # NEW
├── lib/
│   └── utils/
│       ├── stockLevel.ts          # NEW
│       └── __tests__/
│           └── stockLevel.test.ts # NEW
├── app/
│   └── (app)/
│       └── pantry/
│           └── page.tsx           # UPDATE
```

### Performance Requirements

- Grid must load within 2 seconds
- Use CSS grid for layout performance
- Minimize re-renders with proper memoization
- Consider virtualization for large lists (future)

### References

- [Source: epics.md#Story-3.1] - Acceptance criteria
- [Source: ux-design-specification.md] - Safe Zone colors
- [Source: seeded-products.ts] - Category definitions

## Dev Agent Record

### Agent Model Used

Claude Opus 4.5

### Debug Log References

### Completion Notes List

- Created PantryGrid component with responsive 2-column grid (3 on tablet/desktop)
- PantryItem displays item name, category emoji, stock level badge, and progress bar indicator
- Stock level utilities provide color mapping, fill percentages, sorting, and counting functions
- Items sorted by urgency: out > low > good > stocked (most urgent first)
- Category grouping toggle button in header
- Empty state with shopping cart emoji and "Add Item" CTA (disabled until Story 3-2)
- Header shows total item count and attention count (low + out items)
- All components memoized for performance optimization
- Full accessibility support: ARIA labels, roles, progress bars
- 64 new tests (21 PantryGrid + 20 PantryItem + 23 stockLevel utilities)
- All 483 tests passing, production build successful

### File List

- `src/components/stock/PantryGrid.tsx` (NEW)
- `src/components/stock/PantryItem.tsx` (NEW)
- `src/components/stock/index.ts` (NEW)
- `src/components/stock/__tests__/PantryGrid.test.tsx` (NEW)
- `src/components/stock/__tests__/PantryItem.test.tsx` (NEW)
- `src/lib/utils/stockLevel.ts` (NEW)
- `src/lib/utils/__tests__/stockLevel.test.ts` (NEW)
- `src/app/(app)/pantry/page.tsx` (UPDATED - replaced placeholder with full implementation)
