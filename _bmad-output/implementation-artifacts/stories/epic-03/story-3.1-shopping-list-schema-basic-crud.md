### Story 3.1: Shopping List Schema & Basic CRUD

As a **user**,
I want **to create, view, edit, and delete shopping lists**,
So that **I can organize my shopping trips**.

**Acceptance Criteria:**

**Given** I am logged in
**When** I tap the "Lists" tab
**Then** I see all my shopping lists ordered by creation date (newest first)

**Given** I want to create a new list
**When** I tap the "+" button
**Then** I see a form with fields: name, budget (optional)
**And** After submitting, the list is created in Convex with: userId, name, budget, createdAt, status: "planning"

**Given** I want to edit a list
**When** I tap on a list and then tap "Edit"
**Then** I can modify the name and budget
**And** Changes save in real-time to Convex

**Given** I want to delete a list
**When** I swipe left on a list and tap "Delete"
**Then** I see a confirmation dialog
**And** After confirming, the list and all its items are removed from Convex

**Given** I tap on a list
**When** I select it
**Then** I navigate to the list detail screen showing all items on that list

**Technical Requirements:**
- `convex/schema.ts`: `shoppingLists` table with userId, name, budget, totalCost, status, createdAt
- `convex/schema.ts`: `listItems` table with listId, pantryItemId, name, price, quantity, priority, isChecked, addedAt
- `convex/shoppingLists.ts`: queries (`getByUser`, `getById`) and mutations (`create`, `update`, `delete`)
- `app/(app)/(tabs)/lists.tsx`: Lists screen
- `app/(app)/list/[id].tsx`: List detail screen
- FR17, FR18, FR19, FR20

---

