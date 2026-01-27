### Story 4.3: Bidirectional Approval Workflow

As a **user with an approver partner**,
I want **items added by either party to require approval from the other**,
So that **we both have oversight on what's being purchased**.

**Acceptance Criteria:**

**Given** I have a partner with "Approver" role
**When** I add an item to the list
**Then** the item shows with ⏳ hourglass indicator and status: "Pending Approval"
**And** The item appears dimmed/grayed out
**And** My partner receives a push notification: "[Your name] added [item] - approval needed"

**Given** my partner views the list
**When** they see pending items
**Then** each item has two buttons: ✅ "Approve" and 🔴 "Contest"

**Given** my partner approves an item
**When** they tap ✅ "Approve"
**Then** the item status changes to "Approved"
**And** The ⏳ hourglass is replaced with ✅ green checkmark
**And** The item is no longer dimmed
**And** I receive a notification: "[Partner] approved [item]"
**And** Both of us feel a success haptic

**Given** my partner contests an item
**When** they tap 🔴 "Contest"
**Then** they are prompted to enter a reason
**And** The item flows to Story 4.4 (Contest Workflow)

**Given** I have multiple pending items
**When** my partner views the list
**Then** pending items are grouped at the top with a badge: "3 items need your approval"

**Given** my partner (approver) adds an item to the list
**When** they add it
**Then** the item shows with ⏳ hourglass indicator for me (owner)
**And** I receive a push notification: "[Partner] added [item] - approval needed"
**And** I can approve or contest their addition

**Given** my partner and I want to discuss an item before approving
**When** either of us taps 💬 on a pending item
**Then** we can add comments to discuss it
**And** Both receive notifications for new comments
**And** After discussion, either party can approve or contest

**Technical Requirements:**
- Add `approvalStatus` field to `listItems`: "pending" | "approved" | "contested"
- Convex mutation: `approveItem(listItemId, approverId)`
- Push notification service integration
- Haptic feedback for approval actions
- FR194, FR196, FR197

---

