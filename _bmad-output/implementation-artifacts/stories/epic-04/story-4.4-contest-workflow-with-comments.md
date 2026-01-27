### Story 4.4: Contest Workflow with Comments

As an **approver partner**,
I want **to contest items and explain why**,
So that **the list owner understands my concern**.

**Acceptance Criteria:**

**Given** I see an item I don't agree with
**When** I tap 🔴 "Contest"
**Then** I see a modal: "Why are you contesting this item?"
**And** I can enter a reason (e.g., "Too expensive", "Already have this", "Healthier alternative available")
**And** I can select from quick reasons or write custom text

**Given** I submit a contest
**When** I confirm
**Then** the item shows a 🔴 red badge with "Contested"
**And** The item displays my reason below it
**And** The list owner receives a notification: "[Partner] contested [item]: [reason]"
**And** Both of us feel a warning haptic

**Given** the list owner views a contested item
**When** they see it
**Then** they have two options: "Keep Item" or "Remove Item"
**And** They can also add a comment to discuss

**Given** the list owner keeps a contested item
**When** they tap "Keep Item"
**Then** the item status changes to "Approved (Overridden)"
**And** The 🔴 badge changes to ⚠️ yellow warning badge
**And** My reason is still visible

**Given** anyone wants to comment on an item
**When** they tap 💬 speech bubble icon
**Then** they see a comment thread with all previous comments
**And** They can add a new comment
**And** All partners receive notifications for new comments

**Given** I view an item with comments
**When** comments exist
**Then** I see a 💬 badge with comment count (e.g., "💬 3")
**And** Tapping it opens the full comment thread

**Technical Requirements:**
- `convex/schema.ts`: `itemComments` table with listItemId, userId, text, createdAt
- Convex mutation: `contestItem(listItemId, reason)` and `resolveContest(listItemId, decision)`
- Comment thread component
- Contest reason templates + custom text input
- FR198, FR199, FR200, FR201, FR202, FR205

---

