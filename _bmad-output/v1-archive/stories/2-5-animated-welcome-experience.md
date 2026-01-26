# Story 2.5: Animated Welcome Experience

Status: review

## Story

As a **new user**,
I want **an engaging welcome experience**,
So that **I feel excited to use Oja and understand its value**.

## Acceptance Criteria

1. **Animated welcome screen** shown after registration
2. **Oja branding** prominently displayed
3. **Framer Motion animations** running at 60fps
4. **prefers-reduced-motion** respected (NFR-A6)
5. **Single tap** to proceed to next step

## Tasks / Subtasks

- [x] **Task 1: Create Welcome Screen Component** (AC: #1, #2, #3, #4)
  - [x] Create `src/components/onboarding/WelcomeScreen.tsx`
  - [x] Add Oja logo and branding elements
  - [x] Implement Framer Motion animations
  - [x] Respect prefers-reduced-motion via `useReducedMotion()` hook

- [x] **Task 2: Create Onboarding Layout** (AC: #5)
  - [x] Create `src/app/(onboarding)/layout.tsx`
  - [x] Create `src/app/(onboarding)/welcome/page.tsx`
  - [x] Add "Get Started" button to proceed

- [x] **Task 3: Connect Registration to Onboarding** (AC: #1)
  - [x] Update RegisterForm to redirect to /welcome on success

- [x] **Task 4: Add Tests** (AC: all)
  - [x] Unit tests for WelcomeScreen (8 tests)

- [x] **Task 5: Run build and tests to verify** - All 162 tests passing

## Dev Notes

### References

- Framer Motion docs: https://www.framer.com/motion/
- prefers-reduced-motion: Use `useReducedMotion()` hook from Framer Motion
- Oja branding colors: orange (#FF6B35), charcoal (#2D3436)

## Dev Agent Record

### Agent Model Used

Claude Opus 4.5

### Completion Notes List

- Created WelcomeScreen component with Framer Motion animations
- Staggered entrance animations for logo, heading, text, and button
- Decorative floating elements (only when motion allowed)
- Uses `useReducedMotion()` hook to respect accessibility preference
- Animations simplified or disabled when user prefers reduced motion
- Created onboarding layout at (onboarding) route group
- Welcome page at /welcome redirects to /pantry after "Get Started"
- Updated RegisterForm to redirect to /welcome after successful registration
- Added 8 tests for WelcomeScreen
- All 162 tests passing, build successful

### File List

- `src/components/onboarding/WelcomeScreen.tsx`
- `src/components/onboarding/index.ts`
- `src/components/onboarding/__tests__/WelcomeScreen.test.tsx`
- `src/app/(onboarding)/layout.tsx`
- `src/app/(onboarding)/welcome/page.tsx`
- `src/components/auth/RegisterForm.tsx` (updated redirect)

