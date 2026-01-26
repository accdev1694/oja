# Story 2.3: Password Reset Flow

Status: review

## Story

As a **user who forgot my password**,
I want **to reset it via email**,
So that **I can regain access to my account**.

## Acceptance Criteria

1. **Forgot password page** with email input
2. **Reset email sent** when valid email entered
3. **Confirmation shown** even if email doesn't exist (security)
4. **Reset password page** accessible from email link
5. **Password validation** with same requirements as registration
6. **Success redirect** to login after password updated

## Tasks / Subtasks

- [x] **Task 1: Create Forgot Password Page** (AC: #1, #2, #3)
  - [x] Create `src/app/(auth)/forgot-password/page.tsx`
  - [x] Create ForgotPasswordForm component
  - [x] Show confirmation regardless of email existence (security)

- [x] **Task 2: Create Reset Password Page** (AC: #4, #5, #6)
  - [x] Create `src/app/(auth)/reset-password/page.tsx`
  - [x] Create ResetPasswordForm component
  - [x] Reuse password validation schema
  - [x] Reuse PasswordStrength component

- [x] **Task 3: Implement Password Reset Flow** (AC: #2, #6)
  - [x] Use existing `resetPassword` from auth.ts
  - [x] Handle Supabase password update via updateUser
  - [x] Redirect to login with success message

- [x] **Task 4: Add Tests** (AC: all)
  - [x] Unit tests for ForgotPasswordForm (9 tests)
  - [x] Unit tests for ResetPasswordForm (11 tests)

- [x] **Task 5: Run build and tests to verify** - All 144 tests passing

## Dev Notes

### References

- [Supabase Password Recovery] https://supabase.com/docs/guides/auth/passwords#resetting-a-users-password-forgot-password

## Dev Agent Record

### Agent Model Used

Claude Opus 4.5

### Completion Notes List

- Created forgot password page with ForgotPasswordForm component
- Always shows success message for security (prevents email enumeration)
- Created reset password page with ResetPasswordForm component
- Reused passwordSchema and PasswordStrength component from registration
- Handles session expiry with clear error message
- Redirects to login with success message query param
- Added 9 tests for ForgotPasswordForm, 11 tests for ResetPasswordForm
- All 144 tests passing, build successful

### File List

- `src/app/(auth)/forgot-password/page.tsx`
- `src/app/(auth)/reset-password/page.tsx`
- `src/components/auth/ForgotPasswordForm.tsx`
- `src/components/auth/ResetPasswordForm.tsx`
- `src/components/auth/__tests__/ForgotPasswordForm.test.tsx`
- `src/components/auth/__tests__/ResetPasswordForm.test.tsx`
- `src/components/auth/index.ts`
