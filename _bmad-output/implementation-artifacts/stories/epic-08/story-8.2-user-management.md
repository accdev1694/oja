### Story 8.2: User Management

As an **admin**,
I want **to search and manage user accounts**,
So that **I can provide support and handle edge cases**.

**Acceptance Criteria:**

**Given** I'm on the admin dashboard
**When** I use the user search
**Then** I can search by email, name, or user ID
**And** Results show: name, email, subscription status, join date

**Given** I select a user
**When** I view their profile
**Then** I see:
  - Account details (email, name, join date)
  - Subscription status and history
  - Loyalty points balance
  - Recent shopping lists
  - Receipt scan history

**Given** a user needs trial extension
**When** I tap "Extend Trial"
**Then** I can add days to their trial period
**And** The user receives a notification

**Given** a user requests account deletion (GDPR)
**When** I tap "Delete User Data"
**Then** I see a confirmation warning
**And** After confirming, all user data is permanently deleted
**And** The action is logged in audit trail

**Technical Requirements:**
- User search with fuzzy matching
- Read-only user impersonation for support
- Trial extension mutation
- GDPR deletion function (cascades all user data)
- FR127-FR138, FR171-FR173

---

