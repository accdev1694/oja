# Story 2.6: Seeded Products Selection

Status: review

## Story

As a **new UK user**,
I want **to start with pre-populated pantry items**,
So that **I don't have to manually add common staples**.

## Acceptance Criteria

1. **UK staple items list** shown pre-selected (milk, bread, eggs, etc.)
2. **Tap to deselect** items user doesn't buy
3. **Search/filter** capability
4. **Selected items added to pantry** after onboarding completion
5. **stock_items table populated** with selected items at "Stocked" level

## Tasks / Subtasks

- [x] **Task 1: Create Seeded Products Data** (AC: #1)
  - [x] Create `src/lib/data/seeded-products.ts` with UK staples
  - [x] Include categories (Dairy, Bakery, Eggs, Pantry, etc.)
  - [x] 31 UK staple items across 9 categories

- [x] **Task 2: Create Product Selection Component** (AC: #1, #2, #3)
  - [x] Create `src/components/onboarding/ProductSelection.tsx`
  - [x] Show items grouped by category with emoji icons
  - [x] Checkboxes for selection (pre-selected by default)
  - [x] Search input to filter items
  - [x] Framer Motion animations (respects reduced motion)

- [x] **Task 3: Create Product Selection Page** (AC: #1)
  - [x] Create `src/app/(onboarding)/products/page.tsx`
  - [x] Update welcome page to navigate to products

- [x] **Task 4: Connect to Database** (AC: #4, #5)
  - [x] Store selected products in localStorage (placeholder until database is set up)
  - [x] Ready for Supabase integration when stock_items table is created

- [x] **Task 5: Add Tests** (AC: all)
  - [x] Unit tests for ProductSelection (13 tests)

- [x] **Task 6: Run build and tests to verify** - All 175 tests passing

## Dev Notes

### UK Staple Items

Categories and items:
- **Dairy:** Milk, Butter, Cheese, Yogurt
- **Bakery:** Bread, Rolls
- **Eggs:** Eggs
- **Pantry:** Rice, Pasta, Flour, Sugar, Salt, Cooking Oil, Olive Oil
- **Tinned:** Baked Beans, Chopped Tomatoes, Tuna, Sweetcorn
- **Beverages:** Tea, Coffee, Orange Juice
- **Produce:** Potatoes, Onions, Bananas, Apples, Carrots, Tomatoes
- **Meat:** Chicken, Mince
- **Frozen:** Frozen Peas, Fish Fingers

### Stock States

Per architecture, stock states are: STOCKED | GOOD | LOW | OUT

## Dev Agent Record

### Agent Model Used

Claude Opus 4.5

### Completion Notes List

- Created seeded products data with 31 UK staple items
- Items organized into 9 categories with emoji icons
- ProductSelection component with grouped items and search/filter
- Framer Motion animations respect prefers-reduced-motion
- Toggle selection with visual checkbox feedback
- Selection count shown in header
- Updated welcome page to navigate to products
- Products stored in localStorage (ready for Supabase)
- Added 13 tests for ProductSelection
- All 175 tests passing, build successful

### File List

- `src/lib/data/seeded-products.ts`
- `src/components/onboarding/ProductSelection.tsx`
- `src/components/onboarding/index.ts`
- `src/components/onboarding/__tests__/ProductSelection.test.tsx`
- `src/app/(onboarding)/products/page.tsx`
- `src/app/(onboarding)/welcome/page.tsx` (updated)

