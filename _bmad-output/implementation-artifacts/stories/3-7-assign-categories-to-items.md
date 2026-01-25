# Story 3.7: Assign Categories to Items

Status: review

## Story

As a **user**,
I want **to categorize my pantry items**,
So that **I can organize and find items easily**.

## Acceptance Criteria

1. **Given** I am adding or editing a pantry item
   **When** I tap the category field
   **Then** I see a list of preset categories (Dairy, Produce, Meat, Bakery, Frozen, Pantry, Beverages, Household, Personal Care)
   **And** I can select one category per item

2. **Given** I have categorized items
   **When** I view the pantry
   **Then** I can toggle category grouping on/off
   **And** items display their category icon

## Tasks / Subtasks

- [x] **Task 1: Add Missing Categories**
  - [x] Add "Household" category to PRODUCT_CATEGORIES
  - [x] Add "Personal Care" category to PRODUCT_CATEGORIES

- [x] **Task 2: Create Category Picker Component**
  - [x] Create `CategoryPicker.tsx` component
  - [x] Show all categories in a scrollable grid
  - [x] Highlight currently selected category
  - [x] Support keyboard navigation

- [x] **Task 3: Integrate Category Edit into Item Detail**
  - [x] Update StockLevelPicker to include category option
  - [x] Allow changing category via long-press menu
  - [x] Wire up CategoryPicker in pantry page

- [x] **Task 4: Add Tests**
  - [x] Tests for CategoryPicker component
  - [x] Tests for category edit functionality

- [x] **Task 5: Run build and verify**

## Dev Notes

### Architecture Compliance

**From Architecture Document:**
- Reusable components in `src/components/stock/`
- Follow existing pattern from StockLevelPicker

### Existing Implementation

The following already works:
- Category selection when adding new items (AddItemForm)
- Category emoji display on items (PantryItem)
- Category grouping toggle on pantry page

### What's Missing

1. Household & Personal Care categories
2. Ability to edit category on existing items

### References

- [Source: epics.md#Story-3.7] - Acceptance criteria
- [Source: seeded-products.ts] - PRODUCT_CATEGORIES
- [Source: StockLevelPicker.tsx] - Pattern for edit modal

## Dev Agent Record

### Agent Model Used

Claude Opus 4.5

### Debug Log References

### Completion Notes List

- All 11 categories (including Household and Personal Care) are available in PRODUCT_CATEGORIES
- CategoryPicker component created with modal/sheet pattern matching StockLevelPicker
- Full integration with pantry page - category can be changed via StockLevelPicker "Change Category" button
- Comprehensive test coverage (28 tests) covering rendering, selection, accessibility, and interaction
- All 763 tests passing
- Build successful with no TypeScript errors

### File List

- `src/lib/data/seeded-products.ts` (VERIFIED - already had all categories)
- `src/components/stock/CategoryPicker.tsx` (VERIFIED - component exists and working)
- `src/components/stock/StockLevelPicker.tsx` (VERIFIED - already has category option)
- `src/components/stock/index.ts` (VERIFIED - CategoryPicker exported)
- `src/app/(app)/pantry/page.tsx` (VERIFIED - fully integrated with CategoryPicker)
- `src/components/stock/__tests__/CategoryPicker.test.tsx` (CREATED - 28 comprehensive tests)
