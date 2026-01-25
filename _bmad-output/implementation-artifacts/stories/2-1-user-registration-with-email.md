# Story 2.1: User Registration with Email

Status: review

## Story

As a **new user**,
I want **to create an account with my email and password**,
So that **I can start using Oja to manage my shopping**.

## Acceptance Criteria

1. **Registration form** displays email and password fields with validation
2. **Password requirements**: minimum 8 characters with complexity check
3. **Account creation** in Supabase Auth on valid submission
4. **Profile record** created in profiles table with default settings
5. **7-day free trial** activated with full feature access (FR5)
6. **Redirect to onboarding** flow after successful registration
7. **Inline validation errors** for invalid inputs (NFR-A8)
8. **Duplicate email handling** with helpful error suggesting sign in

## Tasks / Subtasks

- [x] **Task 1: Create Registration Page Route** (AC: #1)
  - [x] Create `src/app/(auth)/register/page.tsx`
  - [x] Create `src/app/(auth)/layout.tsx` for auth pages
  - [x] Add responsive mobile-first layout
  - [x] Add Oja branding/logo

- [x] **Task 2: Build Registration Form Component** (AC: #1, #7)
  - [x] Create `src/components/auth/RegisterForm.tsx`
  - [x] Add email input with validation
  - [x] Add password input with show/hide toggle
  - [x] Add confirm password field
  - [x] Implement inline error display
  - [x] Add loading state during submission
  - [x] Create form using manual validation + Zod (React Hook Form not used to keep it simple)

- [x] **Task 3: Implement Password Validation** (AC: #2)
  - [x] Create password validation schema with Zod
  - [x] Minimum 8 characters
  - [x] At least one uppercase letter
  - [x] At least one lowercase letter
  - [x] At least one number
  - [x] Display password strength indicator
  - [x] Show requirements checklist as user types

- [x] **Task 4: Create Supabase Auth Integration** (AC: #3)
  - [x] Create `src/lib/supabase/auth.ts` with auth functions
  - [x] Implement `signUpWithEmail(email, password)` function
  - [x] Handle Supabase auth errors appropriately
  - [x] Return user session on success

- [x] **Task 5: Create User Profile on Registration** (AC: #4, #5)
  - [x] Create database trigger to create profile on signup
  - [x] Add `profiles` table migration (002_profiles.sql)
  - [x] Set `trial_ends_at` to 7 days from registration
  - [x] Set `subscription_status` to 'trial'
  - [x] Initialize default user settings (currency, onboarding_completed)

- [x] **Task 6: Handle Registration Server Action** (AC: #3, #4, #5, #6)
  - [x] Auth callback route handles session exchange
  - [x] Profile creation handled by database trigger
  - [x] Fallback profile creation in auth callback if trigger didn't fire
  - [x] Handle errors and return appropriate messages
  - [x] Redirect to `/onboarding` on success

- [x] **Task 7: Handle Duplicate Email Error** (AC: #8)
  - [x] Detect "User already registered" error from Supabase
  - [x] Display friendly message with link to sign in
  - [x] Generic error message to avoid email enumeration

- [x] **Task 8: Add Tests** (AC: all)
  - [x] Unit tests for password validation schema (40 tests)
  - [x] Unit tests for PasswordInput component (16 tests)
  - [x] Unit tests for PasswordStrength component (10 tests)
  - [x] All 111 tests passing

## Dev Notes

### Architecture Requirements

**From Architecture Document:**

1. **Auth Flow**: Supabase Auth with email/password
2. **Session Storage**: httpOnly cookies via @supabase/ssr
3. **Profile Creation**: Trigger or server action after auth
4. **Trial Period**: 7 days from registration date

### Database Schema (profiles table)

```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  display_name TEXT,
  subscription_status TEXT DEFAULT 'trial' CHECK (subscription_status IN ('trial', 'free', 'pro', 'cancelled')),
  trial_ends_at TIMESTAMPTZ,
  subscription_ends_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS policies
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);
```

### Supabase Auth Setup

```typescript
// src/lib/supabase/auth.ts
import { createClient } from '@/lib/supabase/client';

export async function signUpWithEmail(email: string, password: string) {
  const supabase = createClient();

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${window.location.origin}/auth/callback`,
    },
  });

  return { data, error };
}
```

### Password Validation Schema

```typescript
// src/lib/validations/auth.ts
import { z } from 'zod';

export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number');

export const registerSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: passwordSchema,
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});
```

### UX Design Requirements

**From UX Design Specification:**

1. **Mobile-first**: 375px minimum viewport
2. **Touch targets**: 44x44px minimum
3. **Colors**: Use design system colors (orange primary, charcoal text)
4. **Typography**: Inter font, proper hierarchy
5. **Feedback**: Loading states, success/error messages
6. **Accessibility**: ARIA labels, focus management

### File Structure

```
src/
├── app/
│   └── (auth)/
│       ├── layout.tsx           # Auth pages layout
│       ├── register/
│       │   ├── page.tsx         # Registration page
│       │   └── actions.ts       # Server actions
│       └── login/
│           └── page.tsx         # Login page (future)
├── components/
│   └── auth/
│       ├── RegisterForm.tsx     # Registration form
│       ├── PasswordInput.tsx    # Password input with toggle
│       └── PasswordStrength.tsx # Password strength indicator
├── lib/
│   ├── supabase/
│   │   └── auth.ts              # Auth helper functions
│   └── validations/
│       └── auth.ts              # Zod schemas
└── supabase/
    └── migrations/
        └── 002_profiles.sql     # Profiles table migration
```

### References

- [Architecture: Authentication] `_bmad-output/planning-artifacts/architecture.md#Authentication`
- [UX Design: Auth Screens] `_bmad-output/planning-artifacts/ux-design-specification.md#Auth`
- [PRD: FR1-7] `_bmad-output/planning-artifacts/prd.md#FR1-7`
- [Supabase Auth Docs] https://supabase.com/docs/guides/auth

## Dev Agent Record

### Agent Model Used

claude-opus-4-5-20251101 (Claude Opus 4.5)

### Debug Log References

N/A

### Completion Notes List

1. Implemented registration page with mobile-first design at `/register`
2. Created auth layout with Oja branding for auth pages
3. Built PasswordInput component with show/hide toggle (uses React useId for accessible IDs)
4. Built PasswordStrength indicator showing real-time password requirements
5. Implemented Zod validation schemas for registration with password complexity checks
6. Created profiles table migration (002_profiles.sql) with RLS policies
7. Added database trigger `handle_new_user()` to auto-create profile on signup
8. Auth callback route `/auth/callback` exchanges code for session and creates profile fallback
9. Verify email page at `/verify-email` shown after registration
10. All acceptance criteria met - 111 tests passing

### Implementation Decisions

- Used manual form state instead of React Hook Form to keep dependencies minimal
- Database trigger handles profile creation for most cases; auth callback has fallback
- Generic error messages used to prevent email enumeration attacks
- useId() hook used instead of Math.random() for deterministic ID generation

### File List

**New Files Created:**
- `src/app/(auth)/layout.tsx` - Auth pages layout with branding
- `src/app/(auth)/register/page.tsx` - Registration page
- `src/app/(auth)/verify-email/page.tsx` - Email verification confirmation
- `src/app/auth/callback/route.ts` - Auth callback handler
- `src/components/auth/index.ts` - Auth components barrel export
- `src/components/auth/PasswordInput.tsx` - Password input with toggle
- `src/components/auth/PasswordStrength.tsx` - Password strength indicator
- `src/components/auth/RegisterForm.tsx` - Registration form component
- `src/components/auth/__tests__/PasswordInput.test.tsx` - PasswordInput tests
- `src/components/auth/__tests__/PasswordStrength.test.tsx` - PasswordStrength tests
- `src/lib/validations/auth.ts` - Zod validation schemas
- `src/lib/validations/__tests__/auth.test.ts` - Validation schema tests
- `src/lib/supabase/auth.ts` - Auth helper functions
- `supabase/migrations/002_profiles.sql` - Profiles table migration

**Modified Files:**
- `src/types/supabase.ts` - Added subscription fields to profile types
