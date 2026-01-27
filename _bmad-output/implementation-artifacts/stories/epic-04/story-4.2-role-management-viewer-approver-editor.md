### Story 4.2: Role Management (Viewer, Approver, Editor)

As a **list owner**,
I want **to assign different roles to partners**,
So that **I can control what they can do with the list**.

**Acceptance Criteria:**

**Given** I have partners on my list
**When** I tap "Manage Partners"
**Then** I see each partner with their current role

**Given** I want to change a partner's role
**When** I tap on a partner
**Then** I see 3 role options: Viewer, Approver, Editor
**And** Each role has a description:
  - **Viewer**: "Can see the list in real-time but cannot edit"
  - **Approver**: "Can add items (you must approve) and must approve your items (bidirectional approval)"
  - **Editor**: "Can add, edit, and remove items freely (no approval needed)"

**Given** I select "Viewer" role
**When** I confirm
**Then** the partner can see the list but all edit buttons are disabled for them
**And** They see a message: "You have view-only access to this list"

**Given** I select "Approver" role
**When** I confirm
**Then** items I add show as "Pending Approval" to them with ⏳ hourglass
**And** Items they add show as "Pending Approval" to me with ⏳ hourglass
**And** Both parties must approve each other's additions (bidirectional)

**Given** I select "Editor" role
**When** I confirm
**Then** the partner can add, edit, and remove items freely
**And** No approval workflow is required

**Given** a partner has "Viewer" role and tries to edit
**When** they tap an edit button
**Then** they see a toast: "You don't have permission to edit this list"
**And** No changes are made

**Technical Requirements:**
- Role field in `listPartners` table: "viewer" | "approver" | "editor"
- Role-based permissions enforcement in Convex mutations
- UI disables edit buttons for viewers
- Role change notification sent to partner
- FR192, FR193, FR194, FR195

---

