### Story 4.1: Partner Invite System (Email & Share Code)

As a **list owner**,
I want **to invite partners to my shopping list**,
So that **we can collaborate on our grocery shopping**.

**Acceptance Criteria:**

**Given** I'm viewing a shopping list I own
**When** I tap the "Share" button
**Then** I see two invite options: "Invite by Email" and "Share Code"

**Given** I choose "Invite by Email"
**When** I enter a partner's email address
**Then** an invite is sent via email with a link to accept
**And** The invite includes: list name, my name, and an "Accept Invite" button
**And** I see a toast: "Invite sent to [email]"

**Given** I choose "Share Code"
**When** I tap it
**Then** I see a 6-character code (e.g., "A3B9K7")
**And** I can copy the code or share it via any app
**And** The code is valid for 24 hours

**Given** a partner receives my invite
**When** they click "Accept Invite" or enter the share code
**Then** they are added to the list with "viewer" role (default)
**And** I receive a notification: "[Partner] joined your list"

**Given** I want to revoke access
**When** I tap "Manage Partners"
**Then** I see all partners on the list
**And** I can tap "Remove" to revoke their access
**And** They receive a notification: "You've been removed from [List Name]"

**Technical Requirements:**
- `convex/schema.ts`: `listPartners` table with listId, userId, role, invitedBy, invitedAt
- `convex/schema.ts`: `inviteCodes` table with code, listId, expiresAt
- Convex mutation: `invitePartner(listId, email)` and `generateShareCode(listId)`
- Email service integration (or use Clerk's email API)
- 6-character code generator (alphanumeric, case-insensitive)
- FR191, FR203, FR204

---

