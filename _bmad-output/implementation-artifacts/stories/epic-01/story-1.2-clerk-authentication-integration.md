### Story 1.2: Clerk Authentication Integration

As a **new user**,
I want **to sign up with email or social providers**,
So that **I can securely access my account across devices**.

**Acceptance Criteria:**

**Given** I open the app for the first time
**When** I am not authenticated
**Then** I see the sign-in screen
**And** I can choose between email/password, Google, or Apple sign-in

**Given** I choose email/password sign-up
**When** I enter valid email and password
**Then** I receive a verification email
**And** After clicking the verification link, my account is activated
**And** I am redirected to the onboarding flow

**Given** I choose Google OAuth
**When** I complete Google authentication
**Then** my account is automatically created and verified
**And** I am redirected to the onboarding flow

**Given** I already have an account
**When** I sign in with correct credentials
**Then** I am redirected to the main app (Pantry screen)

**Technical Requirements:**
- Clerk SDK integrated with ClerkProvider
- Sign-in screen with email/password form
- Sign-up screen with email verification flow
- OAuth buttons for Google and Apple
- JWT token management with Convex
- FR1, FR2, FR3, FR85 (animated welcome)

---

