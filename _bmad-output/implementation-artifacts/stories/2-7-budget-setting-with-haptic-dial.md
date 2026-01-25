# Story 2.7: Budget Setting with Haptic Dial

Status: review

## Story

As a **new user**,
I want **to set my default weekly budget using a dial interface**,
So that **Oja can help me stay within my spending limits**.

## Acceptance Criteria

1. **Dial/slider displayed** for setting weekly budget (range: £30-£300)
2. **Haptic feedback** triggers on round numbers (£10, £20, £30, etc.) via Vibration API
3. **Safe Zone preview** shows green glow at 15% opacity as user adjusts budget
4. **Skip option available** - user can bypass this step (FR89)
5. **Budget saved to profile** when user continues (localStorage placeholder until Supabase)
6. **Animations respect** prefers-reduced-motion (NFR-A6)
7. **Touch target compliance** - all interactive elements 44x44px minimum (NFR-A4)

## Tasks / Subtasks

- [x] **Task 1: Create BudgetDial Component** (AC: #1, #2, #3, #6, #7)
  - [x] Create `src/components/onboarding/BudgetDial.tsx`
  - [x] Implement circular dial with range £30-£300 (step £5)
  - [x] Display current value prominently in center (JetBrains Mono font)
  - [x] Animate dial movement with Framer Motion
  - [x] Respect prefers-reduced-motion via `useReducedMotion` hook

- [x] **Task 2: Implement Haptic Feedback** (AC: #2)
  - [x] Use `navigator.vibrate()` API for haptic feedback
  - [x] Trigger short vibration (10ms) on round numbers (£10, £20, etc.)
  - [x] Check for Vibration API support before calling
  - [x] Only vibrate when value actually changes to a round number

- [x] **Task 3: Add Safe Zone Preview** (AC: #3)
  - [x] Create ambient green glow effect behind dial
  - [x] Use `--safe-zone-green` (#10B981) at 15% opacity
  - [x] Subtle pulse animation when dial is being adjusted
  - [x] Include accessibility icon (checkmark) with color

- [x] **Task 4: Create Budget Page** (AC: #1, #4, #5)
  - [x] Create `src/app/(onboarding)/budget/page.tsx`
  - [x] Display BudgetDial component
  - [x] "Continue" button saves budget and navigates to next step
  - [x] "Skip for now" link allows bypassing (stores null/default)
  - [x] Update products page to navigate here after confirmation

- [x] **Task 5: Save Budget State** (AC: #5)
  - [x] Save budget to localStorage key `oja_default_budget`
  - [x] Store as integer (pence) per architecture patterns
  - [x] Ready for Supabase `profiles.default_budget` integration

- [x] **Task 6: Update Navigation Flow** (AC: #4)
  - [x] Update products page to navigate to `/budget` on confirm
  - [x] Budget page navigates to next onboarding step (placeholder `/pantry`)

- [x] **Task 7: Add Tests** (AC: all)
  - [x] Unit tests for BudgetDial component (28 tests)
  - [x] Test haptic feedback trigger logic
  - [x] Test skip functionality
  - [x] Test keyboard navigation (Arrow keys, Home/End, PageUp/Down)

- [x] **Task 8: Run build and verify** - All 203 tests passing, build successful

## Dev Notes

### Architecture Compliance

**From Architecture Document:**
- Money stored as integers (pence): £50 = 5000
- Use Framer Motion for animations
- Respect `prefers-reduced-motion` media query
- Touch targets 44x44px minimum
- ActionResult<T> pattern not needed here (client-only)

### UX Design Requirements

**From UX Specification:**
- BudgetDial is P1 component (supporting features)
- Key feature: Haptic on round numbers
- Dial should preview Safe Zone (green glow)
- Safe Zone colors: Green (#10B981), Amber (#F59E0B), Red (#EF4444)
- Background opacity: 15% for ambient glow

### Component Props Interface

```typescript
interface BudgetDialProps {
  /** Initial budget value in pence */
  initialValue?: number;
  /** Minimum budget in pence (default: 3000 = £30) */
  min?: number;
  /** Maximum budget in pence (default: 30000 = £300) */
  max?: number;
  /** Step increment in pence (default: 500 = £5) */
  step?: number;
  /** Callback when budget changes */
  onChange?: (valueInPence: number) => void;
  /** Callback when user confirms budget */
  onConfirm?: (valueInPence: number) => void;
  /** Whether haptic feedback is enabled */
  hapticEnabled?: boolean;
}
```

### Vibration API Pattern

```typescript
const triggerHaptic = (durationMs: number = 10) => {
  if ('vibrate' in navigator) {
    navigator.vibrate(durationMs);
  }
};

// Trigger on round numbers (£10 increments = 1000 pence)
const isRoundNumber = (pence: number) => pence % 1000 === 0;
```

### Safe Zone Glow CSS

```css
.safe-zone-glow {
  background: radial-gradient(
    circle at center,
    rgba(16, 185, 129, 0.15) 0%,
    transparent 70%
  );
}
```

### Previous Story Learnings (2-6)

- Use `useReducedMotion` from framer-motion for accessibility
- localStorage works as placeholder for Supabase integration
- Onboarding pages are under `(onboarding)` route group
- Export components from `src/components/onboarding/index.ts`
- Test files go in `__tests__` folder adjacent to component

### File Structure

```
src/
├── components/
│   └── onboarding/
│       ├── BudgetDial.tsx          # NEW
│       ├── __tests__/
│       │   └── BudgetDial.test.tsx # NEW
│       └── index.ts                # UPDATE (add export)
├── app/
│   └── (onboarding)/
│       ├── budget/
│       │   └── page.tsx            # NEW
│       └── products/
│           └── page.tsx            # UPDATE (navigation)
```

### Design Tokens Reference

```typescript
const SAFE_ZONE_GREEN = '#10B981';
const BUDGET_MIN_PENCE = 3000;   // £30
const BUDGET_MAX_PENCE = 30000;  // £300
const BUDGET_STEP_PENCE = 500;   // £5
const HAPTIC_ROUND_NUMBER = 1000; // £10
```

### Accessibility Requirements

- `aria-label` on dial for screen readers
- `aria-valuenow`, `aria-valuemin`, `aria-valuemax` attributes
- Keyboard support: Arrow keys to adjust value
- Focus visible indicator (2px orange ring)
- Icon paired with Safe Zone color (not color alone)

### References

- [Source: architecture.md#Format-Patterns] - Money as integers (pence)
- [Source: ux-design-specification.md#BudgetDial] - Haptic on round numbers
- [Source: ux-design-specification.md#Safe-Zone-System] - Green/Amber/Red colors
- [Source: epics.md#Story-2.7] - Acceptance criteria
- [Source: stories/2-6-seeded-products-selection.md] - Previous story patterns

## Dev Agent Record

### Agent Model Used

Claude Opus 4.5

### Debug Log References

### Completion Notes List

- Created BudgetDial component with circular SVG dial interface
- Dial range £30-£300, step £5, default £100
- Haptic feedback via navigator.vibrate() on round numbers (£10 increments)
- Safe Zone green glow with radial gradient at 15% opacity
- Pulse animation on glow when dragging (respects reduced motion)
- Full keyboard support: Arrow keys (±£5), PageUp/Down (±£10), Home/End (min/max)
- Complete ARIA accessibility: slider role, valuenow/min/max, valuetext
- Skip option navigates without saving budget
- Budget saved to localStorage as integer (pence)
- Products page now navigates to /budget on confirm
- 28 new tests covering all functionality
- All 203 tests passing, production build successful

### File List

- `src/components/onboarding/BudgetDial.tsx` (NEW)
- `src/components/onboarding/__tests__/BudgetDial.test.tsx` (NEW)
- `src/components/onboarding/index.ts` (UPDATED - added BudgetDial export)
- `src/app/(onboarding)/budget/page.tsx` (NEW)
- `src/app/(onboarding)/products/page.tsx` (UPDATED - navigation to /budget)

