# Story 2.4: User Sign Out

Status: review

## Story

As a **signed-in user**,
I want **to sign out from my current device**,
So that **I can secure my account on shared devices**.

## Acceptance Criteria

1. **Sign Out button** visible in settings
2. **Session invalidated** when sign out tapped
3. **Redirect to login page** after sign out
4. **Local cached data preserved** for offline access if user signs back in

## Tasks / Subtasks

- [x] **Task 1: Create SignOutButton Component** (AC: #1, #2, #3)
  - [x] Create `src/components/auth/SignOutButton.tsx`
  - [x] Handle loading state during sign out
  - [x] Redirect to login after sign out
  - [x] Handle sign out errors gracefully

- [x] **Task 2: Create Settings Page** (AC: #1)
  - [x] Create `src/app/(app)/settings/page.tsx`
  - [x] Settings is protected route (middleware already configured)
  - [x] Add SignOutButton to settings page

- [x] **Task 3: Add Tests** (AC: all)
  - [x] Unit tests for SignOutButton (10 tests)

- [x] **Task 4: Run build and tests to verify** - All 154 tests passing

## Dev Notes

### References

- Existing `signOut` function in `src/lib/supabase/auth.ts`
- Local data (IndexedDB via Dexie) should NOT be cleared on sign out

## Dev Agent Record

### Agent Model Used

Claude Opus 4.5

### Completion Notes List

- Created SignOutButton component with loading state and error handling
- Uses existing signOut function from auth.ts
- Redirects to /login and calls router.refresh() after sign out
- Local IndexedDB data preserved (not cleared on sign out)
- Created settings page at /settings (protected route via middleware)
- Added 10 tests for SignOutButton
- All 154 tests passing, build successful

### File List

- `src/components/auth/SignOutButton.tsx`
- `src/components/auth/__tests__/SignOutButton.test.tsx`
- `src/components/auth/index.ts`
- `src/app/(app)/settings/page.tsx`

