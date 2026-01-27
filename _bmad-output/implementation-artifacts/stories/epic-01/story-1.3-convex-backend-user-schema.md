### Story 1.3: Convex Backend & User Schema

As a **developer**,
I want **a Convex backend with user schema and authentication**,
So that **user data is stored securely and synced in real-time**.

**Acceptance Criteria:**

**Given** Clerk authentication is configured
**When** a user signs up or signs in
**Then** their user record is automatically created in Convex
**And** The user's Clerk ID is stored in the database
**And** The user's email and profile data are synced

**Given** a user exists in Convex
**When** I query the `users` table
**Then** I can retrieve the user by their ID
**And** The user record includes: clerkId, email, name, profilePicture, country, currency, cuisinePreferences, createdAt

**Given** a user updates their profile in Clerk
**When** the webhook fires
**Then** the Convex user record is automatically updated

**Technical Requirements:**
- `convex/schema.ts` with `users` table
- User fields: clerkId, email, name, profilePicture, country, currency, cuisinePreferences (array), createdAt
- `convex/users.ts` with queries: `getCurrent`, `getByClerkId`
- `convex/users.ts` with mutations: `getOrCreate`, `update`, `setOnboardingData`
- Clerk JWT issuer configured in Convex
- `convex/auth.config.ts` with Clerk domain
- FR1, FR2, FR3

---

